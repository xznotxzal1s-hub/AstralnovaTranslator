from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.book import Book
from app.models.glossary_entry import GlossaryEntry
from app.schemas.glossary import GlossaryEntryCreate, GlossaryEntryRead, GlossaryEntryUpdate

router = APIRouter(tags=["glossary"])


def get_book_or_404(book_id: int, db: Session) -> Book:
    book = db.query(Book).filter(Book.id == book_id).first()
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")
    return book


@router.get("/glossary", response_model=list[GlossaryEntryRead])
def list_glossary_entries(db: Session = Depends(get_db)) -> list[GlossaryEntryRead]:
    return (
        db.query(GlossaryEntry)
        .filter(GlossaryEntry.book_id.is_(None))
        .order_by(GlossaryEntry.updated_at.desc())
        .all()
    )


@router.get("/books/{book_id}/glossary", response_model=list[GlossaryEntryRead])
def list_book_glossary_entries(book_id: int, db: Session = Depends(get_db)) -> list[GlossaryEntryRead]:
    get_book_or_404(book_id, db)
    return (
        db.query(GlossaryEntry)
        .filter(GlossaryEntry.book_id == book_id)
        .order_by(GlossaryEntry.updated_at.desc())
        .all()
    )


@router.post("/glossary", response_model=GlossaryEntryRead, status_code=status.HTTP_201_CREATED)
def create_glossary_entry(
    payload: GlossaryEntryCreate,
    db: Session = Depends(get_db),
) -> GlossaryEntryRead:
    entry = GlossaryEntry(
        book_id=None,
        source_term=payload.source_term,
        target_term=payload.target_term,
        note=payload.note,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/books/{book_id}/glossary", response_model=GlossaryEntryRead, status_code=status.HTTP_201_CREATED)
def create_book_glossary_entry(
    book_id: int,
    payload: GlossaryEntryCreate,
    db: Session = Depends(get_db),
) -> GlossaryEntryRead:
    get_book_or_404(book_id, db)
    entry = GlossaryEntry(
        book_id=book_id,
        source_term=payload.source_term,
        target_term=payload.target_term,
        note=payload.note,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/glossary/{entry_id}", response_model=GlossaryEntryRead)
def update_glossary_entry(
    entry_id: int,
    payload: GlossaryEntryUpdate,
    db: Session = Depends(get_db),
) -> GlossaryEntryRead:
    entry = db.query(GlossaryEntry).filter(GlossaryEntry.id == entry_id).first()
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Glossary entry not found.")

    entry.source_term = payload.source_term
    entry.target_term = payload.target_term
    entry.note = payload.note
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/glossary/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_glossary_entry(entry_id: int, db: Session = Depends(get_db)) -> Response:
    entry = db.query(GlossaryEntry).filter(GlossaryEntry.id == entry_id).first()
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Glossary entry not found.")

    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
