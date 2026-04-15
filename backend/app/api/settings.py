from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.settings import TranslationConfigRead, TranslationConfigUpdate
from app.services.settings_service import get_or_create_translation_config, save_translation_config

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=TranslationConfigRead)
def get_settings(db: Session = Depends(get_db)) -> TranslationConfigRead:
    config = get_or_create_translation_config(db)
    return config


@router.put("", response_model=TranslationConfigRead)
def update_settings(
    payload: TranslationConfigUpdate,
    db: Session = Depends(get_db),
) -> TranslationConfigRead:
    config = save_translation_config(db, payload)
    return config
