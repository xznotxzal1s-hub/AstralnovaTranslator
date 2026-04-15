from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.chapter import Chapter
from app.services.providers.factory import get_translation_provider
from app.services.settings_service import get_or_create_translation_config
from app.utils.translation import build_prompt, calculate_source_hash, split_text_into_chunks


@dataclass
class TranslationServiceError(Exception):
    message: str
    status_code: int = 400


def translate_chapter(db: Session, chapter: Chapter, force: bool) -> Chapter:
    config = get_or_create_translation_config(db)

    if not chapter.source_text.strip():
        raise TranslationServiceError("Chapter source text is empty.", status_code=400)

    if not config.api_key.strip():
        raise TranslationServiceError("API key is not configured in settings.", status_code=400)

    current_source_hash = calculate_source_hash(chapter.source_text)

    if not force and chapter.translated_text and chapter.source_hash == current_source_hash:
        return chapter

    prompt_chunks = [
        build_prompt(
            prompt_template=config.prompt_template,
            source_text=chunk,
            translation_mode=config.translation_mode,
        )
        for chunk in split_text_into_chunks(chapter.source_text, config.chunk_size)
    ]

    try:
        provider = get_translation_provider(config.provider_type)
    except ValueError as exc:
        raise TranslationServiceError(str(exc), status_code=400) from exc

    try:
        translated_chunks = [
            provider.translate_text(
                prompt=prompt,
                api_base_url=config.api_base_url,
                api_key=config.api_key,
                model_name=config.model_name,
            )
            for prompt in prompt_chunks
        ]
    except Exception as exc:
        chapter.translation_status = "failed"
        db.add(chapter)
        db.commit()
        raise TranslationServiceError(f"Translation request failed: {exc}", status_code=502) from exc

    chapter.translated_text = "\n\n".join(translated_chunks).strip()
    chapter.source_hash = current_source_hash
    chapter.translation_status = "translated"
    chapter.last_translated_at = datetime.now(timezone.utc)
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter
