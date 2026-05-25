import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


_TEST_ROOT = Path(tempfile.gettempdir()) / "astralnova_translation_jobs_r1"
if _TEST_ROOT.exists():
    shutil.rmtree(_TEST_ROOT, ignore_errors=True)
(_TEST_ROOT / "data").mkdir(parents=True, exist_ok=True)
(_TEST_ROOT / "uploads").mkdir(parents=True, exist_ok=True)
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.core.database import Base  # noqa: E402
from app.models.book import Book  # noqa: E402
from app.models.chapter import Chapter  # noqa: E402
from app.models.translation_config import TranslationConfig  # noqa: E402
from app.models.translation_job import TranslationJob  # noqa: E402
from app.api.translation_jobs import create_book_translation_job_endpoint  # noqa: E402
from app.services.translation_job_service import (  # noqa: E402
    ActiveTranslationJobError,
    cancel_translation_job,
    create_book_translation_job,
    mark_interrupted_translation_jobs,
    run_translation_job,
)
from app.services.translation_service import TranslationServiceError  # noqa: E402


class FakeProvider:
    def translate_text(self, **kwargs: object) -> str:
        prompt = str(kwargs["prompt"])
        return f"translated: {prompt[:12]}"


class TranslationJobTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db: Session = self.SessionLocal()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _create_book_with_chapters(self) -> Book:
        book = Book(title="Job Book")
        chapters = [
            Chapter(book=book, index_in_book=1, title="Pending", source_text="第一章です。"),
            Chapter(
                book=book,
                index_in_book=2,
                title="Already Translated",
                source_text="第二章です。",
                translated_text="done",
                translation_status="translated",
            ),
            Chapter(book=book, index_in_book=3, title="Failed", source_text="第三章です。", translation_status="failed"),
        ]
        config = TranslationConfig(
            name="Job Preset",
            is_active=True,
            provider_type="openai_compatible",
            api_base_url="https://example.com/v1",
            model_name="test-model",
            api_key="test-key",
            prompt_template="Translate {source_text}",
            chunk_size=1500,
            translation_mode="natural",
        )
        self.db.add_all([book, *chapters, config])
        self.db.commit()
        self.db.refresh(book)
        return book

    def test_create_book_translation_job_counts_untranslated_chapters(self) -> None:
        book = self._create_book_with_chapters()

        job = create_book_translation_job(self.db, book.id)

        self.assertIsNotNone(job)
        self.assertEqual(job.status, "pending")
        self.assertEqual(job.total_items, 2)
        self.assertEqual(job.completed_items, 0)

    def test_create_book_translation_job_rejects_duplicate_active_job(self) -> None:
        book = self._create_book_with_chapters()

        first_job = create_book_translation_job(self.db, book.id)
        assert first_job is not None

        with self.assertRaises(ActiveTranslationJobError):
            create_book_translation_job(self.db, book.id)

        with self.assertRaises(HTTPException) as raised:
            create_book_translation_job_endpoint(book.id, BackgroundTasks(), self.db)

        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(raised.exception.detail, "A translation job is already active for this book.")

    def test_run_translation_job_updates_progress_and_marks_success(self) -> None:
        book = self._create_book_with_chapters()
        job = create_book_translation_job(self.db, book.id)
        assert job is not None

        with (
            patch("app.services.translation_job_service.SessionLocal", self.SessionLocal),
            patch("app.services.translation_service.get_translation_provider", return_value=FakeProvider()),
        ):
            run_translation_job(job.id)

        self.db.refresh(job)
        translated_count = (
            self.db.query(Chapter)
            .filter(Chapter.book_id == book.id, Chapter.translation_status == "translated")
            .count()
        )
        self.assertEqual(job.status, "succeeded")
        self.assertEqual(job.completed_items, 2)
        self.assertEqual(job.current_item_label, None)
        self.assertEqual(translated_count, 3)

    def test_run_translation_job_stops_and_records_failure_reason(self) -> None:
        book = self._create_book_with_chapters()
        job = create_book_translation_job(self.db, book.id)
        assert job is not None

        def fail_translation(db: Session, chapter: Chapter, force: bool) -> Chapter:
            raise TranslationServiceError("Provider unavailable.", status_code=502)

        with (
            patch("app.services.translation_job_service.SessionLocal", self.SessionLocal),
            patch("app.services.translation_job_service.translate_chapter", side_effect=fail_translation),
        ):
            run_translation_job(job.id)

        self.db.refresh(job)
        self.assertEqual(job.status, "failed")
        self.assertEqual(job.completed_items, 0)
        self.assertEqual(job.current_item_label, "Pending")
        self.assertEqual(job.error_message, "Provider unavailable.")

    def test_cancel_translation_job_marks_pending_job_cancelled(self) -> None:
        book = self._create_book_with_chapters()
        job = create_book_translation_job(self.db, book.id)
        assert job is not None

        cancelled_job = cancel_translation_job(self.db, job.id)

        self.assertIsNotNone(cancelled_job)
        self.assertEqual(cancelled_job.status, "cancelled")

    def test_mark_interrupted_translation_jobs_marks_pending_and_running_jobs_failed(self) -> None:
        pending_book = self._create_book_with_chapters()
        pending_job = create_book_translation_job(self.db, pending_book.id)
        assert pending_job is not None

        running_book = Book(title="Running Book")
        running_chapter = Chapter(book=running_book, index_in_book=1, title="Running Chapter", source_text="本文です。")
        self.db.add_all([running_book, running_chapter])
        self.db.commit()
        self.db.refresh(running_chapter)

        running_job = TranslationJob(
            book_id=running_book.id,
            chapter_id=running_chapter.id,
            status="running",
            total_items=1,
            completed_items=0,
            current_item_label=running_chapter.title,
            error_message=None,
        )
        succeeded_job = TranslationJob(
            book_id=running_book.id,
            chapter_id=None,
            status="succeeded",
            total_items=0,
            completed_items=0,
        )
        self.db.add_all([running_job, succeeded_job])
        self.db.commit()

        interrupted_count = mark_interrupted_translation_jobs(self.db)

        self.assertEqual(interrupted_count, 2)
        self.db.refresh(pending_job)
        self.db.refresh(running_job)
        self.db.refresh(succeeded_job)
        self.assertEqual(pending_job.status, "failed")
        self.assertEqual(running_job.status, "failed")
        self.assertEqual(succeeded_job.status, "succeeded")
        self.assertEqual(
            pending_job.error_message,
            "Job was interrupted by application restart. Please start a new batch translation job.",
        )
        self.assertEqual(
            running_job.error_message,
            "Job was interrupted by application restart. Please start a new batch translation job.",
        )


if __name__ == "__main__":
    unittest.main()
