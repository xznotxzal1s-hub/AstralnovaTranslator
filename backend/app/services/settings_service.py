from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.translation_config import TranslationConfig
from app.schemas.settings import TranslationConfigUpdate


def get_or_create_translation_config(db: Session) -> TranslationConfig:
    config = db.query(TranslationConfig).order_by(TranslationConfig.id.asc()).first()
    if config is not None:
        return config

    config = TranslationConfig(
        provider_type=settings.initial_provider_type,
        api_base_url=settings.initial_api_base_url,
        model_name=settings.initial_model_name,
        api_key=settings.initial_api_key,
        prompt_template=settings.initial_prompt_template,
        chunk_size=settings.initial_chunk_size,
        translation_mode=settings.initial_translation_mode,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def save_translation_config(db: Session, payload: TranslationConfigUpdate) -> TranslationConfig:
    config = get_or_create_translation_config(db)
    config.provider_type = payload.provider_type
    config.api_base_url = payload.api_base_url
    config.model_name = payload.model_name
    config.api_key = payload.api_key
    config.prompt_template = payload.prompt_template
    config.chunk_size = payload.chunk_size
    config.translation_mode = payload.translation_mode
    db.add(config)
    db.commit()
    db.refresh(config)
    return config
