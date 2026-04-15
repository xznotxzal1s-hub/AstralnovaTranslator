from sqlalchemy.orm import Session

from app.models.chapter import Chapter
from app.models.translation_record import TranslationRecord


def find_translation_record(
    db: Session,
    *,
    chapter_id: int,
    provider_type: str,
    model_name: str,
    prompt_hash: str,
    source_hash: str,
) -> TranslationRecord | None:
    return (
        db.query(TranslationRecord)
        .filter(TranslationRecord.chapter_id == chapter_id)
        .filter(TranslationRecord.provider_type == provider_type)
        .filter(TranslationRecord.model_name == model_name)
        .filter(TranslationRecord.prompt_hash == prompt_hash)
        .filter(TranslationRecord.source_hash == source_hash)
        .order_by(TranslationRecord.created_at.desc())
        .first()
    )


def save_translation_record(
    db: Session,
    *,
    chapter: Chapter,
    provider_type: str,
    model_name: str,
    prompt_hash: str,
    source_hash: str,
    translated_text: str,
) -> TranslationRecord:
    record = TranslationRecord(
        chapter_id=chapter.id,
        provider_type=provider_type,
        model_name=model_name,
        prompt_hash=prompt_hash,
        source_hash=source_hash,
        translated_text=translated_text,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
