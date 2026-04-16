from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.book import Book
from app.models.chapter import Chapter
from app.schemas.chapter import ChapterCreate, ChapterRead, ChapterUpdate

router = APIRouter(tags=["chapters"])


@router.post("/books/{book_id}/chapters", response_model=ChapterRead, status_code=status.HTTP_201_CREATED)
def create_chapter(
    book_id: int,
    payload: ChapterCreate,
    db: Session = Depends(get_db),
) -> ChapterRead:
    book = db.query(Book).filter(Book.id == book_id).first()
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")

    max_index = db.query(func.max(Chapter.index_in_book)).filter(Chapter.book_id == book_id).scalar()
    next_index = 1 if max_index is None else max_index + 1

    chapter = Chapter(
        book_id=book_id,
        index_in_book=next_index,
        title=payload.title,
        source_text=payload.source_text,
    )
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.get("/chapters/{chapter_id}", response_model=ChapterRead)
def get_chapter(chapter_id: int, db: Session = Depends(get_db)) -> ChapterRead:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if chapter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")
    return chapter


@router.put("/chapters/{chapter_id}", response_model=ChapterRead)
def update_chapter(
    chapter_id: int,
    payload: ChapterUpdate,
    db: Session = Depends(get_db),
) -> ChapterRead:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if chapter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")

    chapter.title = payload.title
    chapter.source_text = payload.source_text
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chapter(chapter_id: int, db: Session = Depends(get_db)) -> Response:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if chapter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")

    book_id = chapter.book_id
    removed_index = chapter.index_in_book
    db.delete(chapter)
    remaining_chapters = (
        db.query(Chapter)
        .filter(Chapter.book_id == book_id, Chapter.index_in_book > removed_index)
        .order_by(Chapter.index_in_book.asc())
        .all()
    )
    for item in remaining_chapters:
        item.index_in_book -= 1
        db.add(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
