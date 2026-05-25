from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.chapter import Chapter
from app.models.reading_progress import ReadingProgress
from app.schemas.reading_progress import ReadingProgressResponse, ReadingProgressUpdate


def get_reading_progress(db: Session, book_id: int) -> ReadingProgressResponse | None:
    book = db.query(Book).filter(Book.id == book_id).first()
    if book is None:
        return None

    progress = db.query(ReadingProgress).filter(ReadingProgress.book_id == book_id).first()
    if progress is None:
        return ReadingProgressResponse(
            book_id=book_id,
            chapter_id=None,
            progress_percent=0,
            updated_at=None,
            fallback_used=False,
        )

    if progress.chapter_id is not None and _chapter_belongs_to_book(db, progress.chapter_id, book_id):
        return ReadingProgressResponse(
            book_id=book_id,
            chapter_id=progress.chapter_id,
            progress_percent=progress.progress_percent,
            updated_at=progress.updated_at,
            fallback_used=False,
        )

    fallback_chapter = _get_first_chapter(db, book_id)
    return ReadingProgressResponse(
        book_id=book_id,
        chapter_id=fallback_chapter.id if fallback_chapter else None,
        progress_percent=0,
        updated_at=progress.updated_at,
        fallback_used=True,
    )


def update_reading_progress(
    db: Session,
    book_id: int,
    payload: ReadingProgressUpdate,
) -> ReadingProgressResponse | None:
    book = db.query(Book).filter(Book.id == book_id).first()
    if book is None:
        return None

    chapter = db.query(Chapter).filter(Chapter.id == payload.chapter_id).first()
    if chapter is None or chapter.book_id != book_id:
        raise ValueError("Chapter does not belong to this book.")

    progress = db.query(ReadingProgress).filter(ReadingProgress.book_id == book_id).first()
    if progress is None:
        progress = ReadingProgress(book_id=book_id)

    progress.chapter_id = payload.chapter_id
    progress.progress_percent = payload.progress_percent
    db.add(progress)
    db.commit()
    db.refresh(progress)

    return ReadingProgressResponse(
        book_id=book_id,
        chapter_id=progress.chapter_id,
        progress_percent=progress.progress_percent,
        updated_at=progress.updated_at,
        fallback_used=False,
    )


def _chapter_belongs_to_book(db: Session, chapter_id: int, book_id: int) -> bool:
    return db.query(Chapter.id).filter(Chapter.id == chapter_id, Chapter.book_id == book_id).first() is not None


def _get_first_chapter(db: Session, book_id: int) -> Chapter | None:
    return (
        db.query(Chapter)
        .filter(Chapter.book_id == book_id)
        .order_by(Chapter.index_in_book.asc(), Chapter.created_at.asc(), Chapter.id.asc())
        .first()
    )
