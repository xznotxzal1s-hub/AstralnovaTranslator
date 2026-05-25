import json
import sqlite3
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.core.config import settings


@dataclass(frozen=True)
class BackupArchive:
    path: Path
    filename: str


def _create_sqlite_snapshot(source_path: Path, destination_path: Path) -> None:
    source = sqlite3.connect(source_path)
    destination = sqlite3.connect(destination_path)
    try:
        source.backup(destination)
    finally:
        destination.close()
        source.close()


def create_backup_archive(
    data_dir: Path | None = None,
    uploads_dir: Path | None = None,
    database_file: str | None = None,
) -> BackupArchive:
    resolved_data_dir = Path(data_dir or settings.data_dir)
    resolved_uploads_dir = Path(uploads_dir or settings.uploads_dir)
    resolved_database_file = database_file or settings.database_file
    database_path = resolved_data_dir / resolved_database_file

    if not database_path.exists():
        raise FileNotFoundError(f"Database file not found: {database_path}")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"astralnova-backup-{timestamp}.zip"
    backups_root = resolved_data_dir / ".backups"
    backups_root.mkdir(parents=True, exist_ok=True)
    temp_dir = backups_root / f"astralnova-backup-{uuid4().hex}"
    temp_dir.mkdir(parents=True, exist_ok=False)
    archive_path = temp_dir / filename

    metadata = {
        "app_name": settings.app_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "database_file": resolved_database_file,
        "includes_uploads": resolved_uploads_dir.exists(),
        "security_note": "This backup includes the SQLite database and may contain API keys stored by V1 settings.",
    }

    snapshot_path = temp_dir / resolved_database_file
    _create_sqlite_snapshot(database_path, snapshot_path)

    try:
        with zipfile.ZipFile(archive_path, mode="w", compression=zipfile.ZIP_DEFLATED) as backup_zip:
            backup_zip.write(snapshot_path, "data/app.db")
            if resolved_uploads_dir.exists():
                for file_path in sorted(path for path in resolved_uploads_dir.rglob("*") if path.is_file()):
                    archive_name = Path("uploads") / file_path.relative_to(resolved_uploads_dir)
                    backup_zip.write(file_path, archive_name.as_posix())
            backup_zip.writestr("metadata.json", json.dumps(metadata, ensure_ascii=False, indent=2))
    finally:
        snapshot_path.unlink(missing_ok=True)

    return BackupArchive(path=archive_path, filename=filename)
