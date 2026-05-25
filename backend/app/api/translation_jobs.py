from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.translation_job import TranslationJobRead
from app.services.translation_job_service import (
    cancel_translation_job,
    create_book_translation_job,
    get_translation_job,
    run_translation_job,
)

router = APIRouter(tags=["translation-jobs"])


@router.post("/books/{book_id}/translation-jobs", response_model=TranslationJobRead, status_code=status.HTTP_201_CREATED)
def create_book_translation_job_endpoint(
    book_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> TranslationJobRead:
    job = create_book_translation_job(db, book_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")

    if job.status == "pending":
        background_tasks.add_task(run_translation_job, job.id)
    return job


@router.get("/translation-jobs/{job_id}", response_model=TranslationJobRead)
def get_translation_job_endpoint(job_id: int, db: Session = Depends(get_db)) -> TranslationJobRead:
    job = get_translation_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Translation job not found.")
    return job


@router.post("/translation-jobs/{job_id}/cancel", response_model=TranslationJobRead)
def cancel_translation_job_endpoint(job_id: int, db: Session = Depends(get_db)) -> TranslationJobRead:
    job = cancel_translation_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Translation job not found.")
    return job
