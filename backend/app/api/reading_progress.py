from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.reading_progress import ReadingProgressResponse, ReadingProgressUpdate
from app.services.reading_progress_service import get_reading_progress, update_reading_progress

router = APIRouter(tags=["reading-progress"])


@router.get("/books/{book_id}/reading-progress", response_model=ReadingProgressResponse)
def get_book_reading_progress(book_id: int, db: Session = Depends(get_db)) -> ReadingProgressResponse:
    progress = get_reading_progress(db, book_id)
    if progress is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")
    return progress


@router.put("/books/{book_id}/reading-progress", response_model=ReadingProgressResponse)
def update_book_reading_progress(
    book_id: int,
    payload: ReadingProgressUpdate,
    db: Session = Depends(get_db),
) -> ReadingProgressResponse:
    try:
        progress = update_reading_progress(db, book_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if progress is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")
    return progress
