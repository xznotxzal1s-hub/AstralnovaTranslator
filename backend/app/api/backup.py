import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.services.backup_service import create_backup_archive

router = APIRouter(prefix="/backup", tags=["backup"])


def _cleanup_backup(path: Path) -> None:
    shutil.rmtree(path.parent, ignore_errors=True)


@router.get("/export")
def export_backup() -> FileResponse:
    try:
        archive = create_backup_archive()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FileResponse(
        path=archive.path,
        media_type="application/zip",
        filename=archive.filename,
        background=BackgroundTask(_cleanup_backup, archive.path),
    )
