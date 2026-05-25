from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.book import Book
from app.models.chapter import Chapter
from app.models.translation_job import TranslationJob
from app.services.translation_service import TranslationServiceError, translate_chapter


TERMINAL_JOB_STATUSES = {"succeeded", "failed", "cancelled"}
ACTIVE_JOB_STATUSES = {"pending", "running"}
INTERRUPTED_JOB_MESSAGE = "Job was interrupted by application restart. Please start a new batch translation job."


class ActiveTranslationJobError(Exception):
    """Raised when a book already has an active batch translation job."""


def get_translation_job(db: Session, job_id: int) -> TranslationJob | None:
    return db.query(TranslationJob).filter(TranslationJob.id == job_id).first()


def get_active_book_translation_job(db: Session, book_id: int) -> TranslationJob | None:
    return (
        db.query(TranslationJob)
        .filter(TranslationJob.book_id == book_id, TranslationJob.status.in_(ACTIVE_JOB_STATUSES))
        .order_by(TranslationJob.created_at.desc(), TranslationJob.id.desc())
        .first()
    )


def create_book_translation_job(db: Session, book_id: int) -> TranslationJob | None:
    book = db.query(Book).filter(Book.id == book_id).first()
    if book is None:
        return None

    if get_active_book_translation_job(db, book_id) is not None:
        raise ActiveTranslationJobError("A translation job is already active for this book.")

    chapters_to_translate = _get_untranslated_chapters(db, book_id)
    job = TranslationJob(
        book_id=book_id,
        chapter_id=None,
        status="pending" if chapters_to_translate else "succeeded",
        total_items=len(chapters_to_translate),
        completed_items=0,
        current_item_label=None,
        error_message=None,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def mark_interrupted_translation_jobs(db: Session | None = None) -> int:
    owns_session = db is None
    session = db or SessionLocal()
    try:
        jobs = session.query(TranslationJob).filter(TranslationJob.status.in_(ACTIVE_JOB_STATUSES)).all()
        for job in jobs:
            job.status = "failed"
            job.error_message = INTERRUPTED_JOB_MESSAGE
            session.add(job)
        session.commit()
        return len(jobs)
    finally:
        if owns_session:
            session.close()


def cancel_translation_job(db: Session, job_id: int) -> TranslationJob | None:
    job = get_translation_job(db, job_id)
    if job is None:
        return None

    if job.status not in TERMINAL_JOB_STATUSES:
        job.status = "cancelled"
        job.current_item_label = None
        db.add(job)
        db.commit()
        db.refresh(job)
    return job


def run_translation_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = get_translation_job(db, job_id)
        if job is None or job.status in TERMINAL_JOB_STATUSES:
            return

        if job.book_id is None:
            _mark_job_failed(db, job, "Translation job has no book.")
            return

        chapters = _get_untranslated_chapters(db, job.book_id)
        job.status = "running"
        job.total_items = len(chapters)
        job.completed_items = 0
        job.current_item_label = None
        job.error_message = None
        db.add(job)
        db.commit()

        if not chapters:
            _mark_job_succeeded(db, job)
            return

        for chapter in chapters:
            db.refresh(job)
            if job.status == "cancelled":
                return

            job.chapter_id = chapter.id
            job.current_item_label = chapter.title
            db.add(job)
            db.commit()

            try:
                translate_chapter(db, chapter, force=False)
            except TranslationServiceError as exc:
                _mark_job_failed(db, job, exc.message)
                return
            except Exception as exc:
                _mark_job_failed(db, job, str(exc) or "Unexpected translation job failure.")
                return

            db.refresh(job)
            if job.status == "cancelled":
                return

            job.completed_items += 1
            db.add(job)
            db.commit()

        _mark_job_succeeded(db, job)
    finally:
        db.close()


def _get_untranslated_chapters(db: Session, book_id: int) -> list[Chapter]:
    return (
        db.query(Chapter)
        .filter(Chapter.book_id == book_id, Chapter.translation_status != "translated")
        .order_by(Chapter.index_in_book.asc(), Chapter.created_at.asc(), Chapter.id.asc())
        .all()
    )


def _mark_job_succeeded(db: Session, job: TranslationJob) -> None:
    job.status = "succeeded"
    job.current_item_label = None
    job.error_message = None
    db.add(job)
    db.commit()


def _mark_job_failed(db: Session, job: TranslationJob, error_message: str) -> None:
    job.status = "failed"
    job.error_message = error_message
    db.add(job)
    db.commit()
