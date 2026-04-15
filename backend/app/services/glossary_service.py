from sqlalchemy.orm import Session

from app.models.glossary_entry import GlossaryEntry


def get_merged_glossary_entries(db: Session, book_id: int) -> list[GlossaryEntry]:
    global_entries = (
        db.query(GlossaryEntry)
        .filter(GlossaryEntry.book_id.is_(None))
        .order_by(GlossaryEntry.updated_at.desc())
        .all()
    )
    book_entries = (
        db.query(GlossaryEntry)
        .filter(GlossaryEntry.book_id == book_id)
        .order_by(GlossaryEntry.updated_at.desc())
        .all()
    )

    merged: dict[str, GlossaryEntry] = {}

    for entry in reversed(global_entries):
        merged[entry.source_term.strip()] = entry

    for entry in reversed(book_entries):
        merged[entry.source_term.strip()] = entry

    return list(merged.values())
