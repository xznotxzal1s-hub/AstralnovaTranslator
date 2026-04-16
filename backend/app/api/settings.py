from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.settings import (
    TranslationConfigRead,
    TranslationConfigUpdate,
    TranslationPresetCreate,
    TranslationPresetUpdate,
)
from app.services.settings_service import (
    activate_translation_preset,
    create_translation_preset,
    delete_translation_preset,
    get_active_translation_config,
    get_translation_presets,
    save_translation_config,
    update_translation_preset,
)

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=TranslationConfigRead)
def get_settings(db: Session = Depends(get_db)) -> TranslationConfigRead:
    config = get_active_translation_config(db)
    return config


@router.put("", response_model=TranslationConfigRead)
def update_settings(
    payload: TranslationConfigUpdate,
    db: Session = Depends(get_db),
) -> TranslationConfigRead:
    config = save_translation_config(db, payload)
    return config


@router.get("/presets", response_model=list[TranslationConfigRead])
def list_settings_presets(db: Session = Depends(get_db)) -> list[TranslationConfigRead]:
    return get_translation_presets(db)


@router.post("/presets", response_model=TranslationConfigRead, status_code=status.HTTP_201_CREATED)
def create_settings_preset(
    payload: TranslationPresetCreate,
    db: Session = Depends(get_db),
) -> TranslationConfigRead:
    return create_translation_preset(db, payload)


@router.put("/presets/{preset_id}", response_model=TranslationConfigRead)
def update_settings_preset(
    preset_id: int,
    payload: TranslationPresetUpdate,
    db: Session = Depends(get_db),
) -> TranslationConfigRead:
    preset = update_translation_preset(db, preset_id, payload)
    if preset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Translation preset not found.")
    return preset


@router.post("/presets/{preset_id}/activate", response_model=TranslationConfigRead)
def activate_settings_preset(
    preset_id: int,
    db: Session = Depends(get_db),
) -> TranslationConfigRead:
    preset = activate_translation_preset(db, preset_id)
    if preset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Translation preset not found.")
    return preset


@router.delete("/presets/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_settings_preset(
    preset_id: int,
    db: Session = Depends(get_db),
) -> Response:
    if len(get_translation_presets(db)) <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one preset must remain.")

    preset = delete_translation_preset(db, preset_id)
    if preset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Translation preset not found.")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
