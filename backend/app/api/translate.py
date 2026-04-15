from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.chapter import Chapter
from app.schemas.chapter import ChapterRead
from app.services.translation_service import TranslationServiceError, translate_chapter

router = APIRouter(tags=["translate"])


def _get_chapter_or_404(chapter_id: int, db: Session) -> Chapter:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if chapter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found.")
    return chapter


@router.post("/chapters/{chapter_id}/translate", response_model=ChapterRead)
def translate_chapter_endpoint(chapter_id: int, db: Session = Depends(get_db)) -> ChapterRead:
    chapter = _get_chapter_or_404(chapter_id, db)
    try:
        return translate_chapter(db, chapter, force=False)
    except TranslationServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/chapters/{chapter_id}/retranslate", response_model=ChapterRead)
def retranslate_chapter_endpoint(chapter_id: int, db: Session = Depends(get_db)) -> ChapterRead:
    chapter = _get_chapter_or_404(chapter_id, db)
    try:
        return translate_chapter(db, chapter, force=True)
    except TranslationServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
