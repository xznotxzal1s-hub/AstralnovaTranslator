from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.book import Book


def touch_book(db: Session, book_id: int) -> None:
    book = db.query(Book).filter(Book.id == book_id).first()
    if book is None:
        return

    book.updated_at = datetime.now(timezone.utc)
    db.add(book)
