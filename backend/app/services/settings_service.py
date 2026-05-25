from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.translation_config import TranslationConfig
from app.schemas.settings import (
    TranslationConfigRead,
    TranslationConfigUpdate,
    TranslationPresetCreate,
    TranslationPresetUpdate,
)
from app.utils.prompt_validation import ensure_prompt_template_is_valid


DEFAULT_PRESET_NAME = "默认预设"


def mask_api_key(api_key: str) -> str:
    normalized_api_key = api_key.strip()
    if not normalized_api_key:
        return ""

    suffix = normalized_api_key[-4:]
    if normalized_api_key.startswith("sk-"):
        return f"sk-****{suffix}"
    return f"****{suffix}"


def build_translation_config_read(config: TranslationConfig) -> TranslationConfigRead:
    return TranslationConfigRead(
        id=config.id,
        name=config.name,
        is_active=config.is_active,
        provider_type=config.provider_type,  # type: ignore[arg-type]
        api_base_url=config.api_base_url,
        model_name=config.model_name,
        api_key=mask_api_key(config.api_key),
        has_api_key=bool(config.api_key.strip()),
        prompt_template=config.prompt_template,
        chunk_size=config.chunk_size,
        translation_mode=config.translation_mode,
        updated_at=config.updated_at,
    )


def _build_default_config() -> TranslationConfig:
    return TranslationConfig(
        name=DEFAULT_PRESET_NAME,
        is_active=True,
        provider_type=settings.initial_provider_type,
        api_base_url=settings.initial_api_base_url,
        model_name=settings.initial_model_name,
        api_key=settings.initial_api_key,
        prompt_template=settings.initial_prompt_template,
        chunk_size=settings.initial_chunk_size,
        translation_mode=settings.initial_translation_mode,
    )


def get_translation_presets(db: Session) -> list[TranslationConfig]:
    presets = db.query(TranslationConfig).order_by(TranslationConfig.updated_at.desc(), TranslationConfig.id.desc()).all()
    if presets:
        return presets

    preset = _build_default_config()
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return [preset]


def get_active_translation_config(db: Session) -> TranslationConfig:
    active_config = (
        db.query(TranslationConfig)
        .filter(TranslationConfig.is_active.is_(True))
        .order_by(TranslationConfig.updated_at.desc(), TranslationConfig.id.desc())
        .first()
    )
    if active_config is not None:
        return active_config

    presets = get_translation_presets(db)
    preset = presets[0]
    preset.is_active = True
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


def get_or_create_translation_config(db: Session) -> TranslationConfig:
    return get_active_translation_config(db)


def _apply_config_fields(
    config: TranslationConfig,
    payload: TranslationConfigUpdate | TranslationPresetCreate | TranslationPresetUpdate,
    *,
    preserve_existing_api_key: bool = True,
) -> TranslationConfig:
    ensure_prompt_template_is_valid(payload.prompt_template)

    if hasattr(payload, "name"):
        config.name = payload.name  # type: ignore[attr-defined]

    config.provider_type = payload.provider_type
    config.api_base_url = payload.api_base_url
    config.model_name = payload.model_name
    payload_api_key = payload.api_key.strip()
    if payload_api_key and payload_api_key != mask_api_key(config.api_key):
        config.api_key = payload.api_key
    elif not preserve_existing_api_key:
        config.api_key = ""
    config.prompt_template = payload.prompt_template
    config.chunk_size = payload.chunk_size
    config.translation_mode = payload.translation_mode
    return config


def save_translation_config(db: Session, payload: TranslationConfigUpdate) -> TranslationConfig:
    config = get_active_translation_config(db)
    _apply_config_fields(config, payload)
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def create_translation_preset(db: Session, payload: TranslationPresetCreate) -> TranslationConfig:
    preset = _build_default_config()
    preset.is_active = False
    _apply_config_fields(preset, payload, preserve_existing_api_key=False)
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


def update_translation_preset(db: Session, preset_id: int, payload: TranslationPresetUpdate) -> TranslationConfig | None:
    preset = db.query(TranslationConfig).filter(TranslationConfig.id == preset_id).first()
    if preset is None:
        return None

    _apply_config_fields(preset, payload)
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


def activate_translation_preset(db: Session, preset_id: int) -> TranslationConfig | None:
    preset = db.query(TranslationConfig).filter(TranslationConfig.id == preset_id).first()
    if preset is None:
        return None

    db.query(TranslationConfig).update({TranslationConfig.is_active: False})
    preset.is_active = True
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


def delete_translation_preset(db: Session, preset_id: int) -> TranslationConfig | None:
    preset = db.query(TranslationConfig).filter(TranslationConfig.id == preset_id).first()
    if preset is None:
        return None

    presets = get_translation_presets(db)
    if len(presets) <= 1:
        return preset

    was_active = preset.is_active
    db.delete(preset)
    db.commit()

    if was_active:
        replacement = (
            db.query(TranslationConfig)
            .order_by(TranslationConfig.updated_at.desc(), TranslationConfig.id.desc())
            .first()
        )
        if replacement is not None:
            replacement.is_active = True
            db.add(replacement)
            db.commit()

    return preset
