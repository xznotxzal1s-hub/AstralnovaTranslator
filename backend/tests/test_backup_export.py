import io
import json
import os
import shutil
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

_TEST_ROOT = Path(tempfile.gettempdir()) / "astralnova_backup_export_r1"
if _TEST_ROOT.exists():
    shutil.rmtree(_TEST_ROOT, ignore_errors=True)
(_TEST_ROOT / "data").mkdir(parents=True, exist_ok=True)
(_TEST_ROOT / "uploads").mkdir(parents=True, exist_ok=True)
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.main import create_application  # noqa: E402
from app.services.backup_service import create_backup_archive


class BackupExportTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.gettempdir()) / f"astralnova_backup_export_case_{uuid4().hex}"
        self.root.mkdir(parents=True, exist_ok=False)
        self.data_dir = self.root / "data"
        self.uploads_dir = self.root / "uploads"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        (self.uploads_dir / "imports").mkdir(parents=True, exist_ok=True)
        self._create_sqlite_database(self.data_dir / "app.db")
        (self.uploads_dir / "imports" / "sample.txt").write_text("sample upload", encoding="utf-8")

    def tearDown(self) -> None:
        if self.root.exists():
            shutil.rmtree(self.root, ignore_errors=True)

    def _create_sqlite_database(self, database_path: Path) -> None:
        connection = sqlite3.connect(database_path)
        try:
            connection.execute("CREATE TABLE IF NOT EXISTS backup_probe (value TEXT)")
            connection.execute("INSERT INTO backup_probe (value) VALUES ('saved')")
            connection.commit()
        finally:
            connection.close()

    def test_backup_archive_includes_database_uploads_and_metadata(self) -> None:
        archive = create_backup_archive(
            data_dir=self.data_dir,
            uploads_dir=self.uploads_dir,
            database_file="app.db",
        )

        with zipfile.ZipFile(archive.path) as backup_zip:
            names = set(backup_zip.namelist())
            metadata = json.loads(backup_zip.read("metadata.json").decode("utf-8"))

        self.assertIn("data/app.db", names)
        self.assertIn("uploads/imports/sample.txt", names)
        self.assertIn("metadata.json", names)
        self.assertEqual(metadata["database_file"], "app.db")
        self.assertTrue(metadata["includes_uploads"])
        self.assertIn("API keys", metadata["security_note"])

    def test_backup_archive_uses_consistent_sqlite_snapshot(self) -> None:
        database_path = self.data_dir / "app.db"
        connection = sqlite3.connect(database_path)
        try:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute("CREATE TABLE IF NOT EXISTS wal_probe (value TEXT)")
            connection.commit()
            connection.execute("INSERT INTO wal_probe (value) VALUES ('committed in wal')")
            connection.commit()

            archive = create_backup_archive(
                data_dir=self.data_dir,
                uploads_dir=self.uploads_dir,
                database_file="app.db",
            )
        finally:
            connection.close()

        snapshot_path = self.root / "snapshot-check.db"
        with zipfile.ZipFile(archive.path) as backup_zip:
            snapshot_path.write_bytes(backup_zip.read("data/app.db"))

        snapshot = sqlite3.connect(snapshot_path)
        try:
            value = snapshot.execute("SELECT value FROM wal_probe LIMIT 1").fetchone()[0]
        finally:
            snapshot.close()

        self.assertEqual(value, "committed in wal")

    def test_backup_export_endpoint_returns_zip_with_database_and_metadata(self) -> None:
        settings_data_dir = _TEST_ROOT / "data"
        settings_data_dir.mkdir(parents=True, exist_ok=True)
        self._create_sqlite_database(settings_data_dir / "app.db")

        client = TestClient(create_application())
        response = client.get("/backup/export")

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/zip", response.headers["content-type"])
        with zipfile.ZipFile(io.BytesIO(response.content)) as backup_zip:
            names = set(backup_zip.namelist())

        self.assertIn("metadata.json", names)
        self.assertIn("data/app.db", names)


if __name__ == "__main__":
    unittest.main()
