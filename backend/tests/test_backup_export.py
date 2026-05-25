import json
import os
import shutil
import unittest
import zipfile
from pathlib import Path

_TEST_ROOT = Path(__file__).resolve().parent / ".tmp"
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.services.backup_service import create_backup_archive


class BackupExportTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(__file__).resolve().parent / ".tmp" / "backup_export"
        if self.root.exists():
            shutil.rmtree(self.root, ignore_errors=True)
        self.data_dir = self.root / "data"
        self.uploads_dir = self.root / "uploads"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        (self.uploads_dir / "imports").mkdir(parents=True, exist_ok=True)
        (self.data_dir / "app.db").write_bytes(b"sqlite bytes")
        (self.uploads_dir / "imports" / "sample.txt").write_text("sample upload", encoding="utf-8")

    def tearDown(self) -> None:
        if self.root.exists():
            shutil.rmtree(self.root, ignore_errors=True)

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


if __name__ == "__main__":
    unittest.main()
