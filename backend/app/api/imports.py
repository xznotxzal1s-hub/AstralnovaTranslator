from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.imports import ImportResponse
from app.services.import_service import ImportServiceError, import_epub_file, import_txt_file

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/txt", response_model=ImportResponse, status_code=status.HTTP_201_CREATED)
async def import_txt(
    file: UploadFile = File(...),
    book_title: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> ImportResponse:
    try:
        return await import_txt_file(db=db, upload=file, provided_book_title=book_title)
    except ImportServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/epub", response_model=ImportResponse, status_code=status.HTTP_201_CREATED)
async def import_epub(
    file: UploadFile = File(...),
    book_title: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> ImportResponse:
    try:
        return await import_epub_file(db=db, upload=file, provided_book_title=book_title)
    except ImportServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
