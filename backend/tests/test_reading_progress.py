import os
import shutil
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


_TEST_ROOT = Path(tempfile.gettempdir()) / "astralnova_reading_progress_r2a"
if _TEST_ROOT.exists():
    shutil.rmtree(_TEST_ROOT, ignore_errors=True)
(_TEST_ROOT / "data").mkdir(parents=True, exist_ok=True)
(_TEST_ROOT / "uploads").mkdir(parents=True, exist_ok=True)
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.core.database import Base, get_db  # noqa: E402
from app.main import create_application  # noqa: E402
from app.models.book import Book  # noqa: E402
from app.models.chapter import Chapter  # noqa: E402
from app.models.reading_progress import ReadingProgress  # noqa: E402
from app.schemas.reading_progress import ReadingProgressUpdate  # noqa: E402
from app.services.reading_progress_service import get_reading_progress, update_reading_progress  # noqa: E402


class ReadingProgressTests(unittest.TestCase):
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

    def _create_book_with_chapters(self) -> tuple[Book, Chapter, Chapter]:
        book = Book(title="Progress Book")
        first = Chapter(book=book, index_in_book=1, title="First", source_text="第一章です。")
        second = Chapter(book=book, index_in_book=2, title="Second", source_text="第二章です。")
        self.db.add_all([book, first, second])
        self.db.commit()
        self.db.refresh(book)
        self.db.refresh(first)
        self.db.refresh(second)
        return book, first, second

    def test_missing_progress_returns_empty_response(self) -> None:
        book, _, _ = self._create_book_with_chapters()

        progress = get_reading_progress(self.db, book.id)

        self.assertIsNotNone(progress)
        assert progress is not None
        self.assertEqual(progress.book_id, book.id)
        self.assertEqual(progress.chapter_id, None)
        self.assertEqual(progress.progress_percent, 0)
        self.assertEqual(progress.updated_at, None)
        self.assertFalse(progress.fallback_used)

    def test_create_reading_progress(self) -> None:
        book, _, second = self._create_book_with_chapters()

        progress = update_reading_progress(
            self.db,
            book.id,
            ReadingProgressUpdate(chapter_id=second.id, progress_percent=42),
        )

        self.assertIsNotNone(progress)
        assert progress is not None
        self.assertEqual(progress.book_id, book.id)
        self.assertEqual(progress.chapter_id, second.id)
        self.assertEqual(progress.progress_percent, 42)
        self.assertIsNotNone(progress.updated_at)
        self.assertFalse(progress.fallback_used)

    def test_update_reading_progress_reuses_single_book_row(self) -> None:
        book, first, second = self._create_book_with_chapters()

        update_reading_progress(self.db, book.id, ReadingProgressUpdate(chapter_id=first.id, progress_percent=12))
        progress = update_reading_progress(
            self.db,
            book.id,
            ReadingProgressUpdate(chapter_id=second.id, progress_percent=88),
        )

        row_count = self.db.query(ReadingProgress).filter(ReadingProgress.book_id == book.id).count()
        self.assertEqual(row_count, 1)
        self.assertIsNotNone(progress)
        assert progress is not None
        self.assertEqual(progress.chapter_id, second.id)
        self.assertEqual(progress.progress_percent, 88)

    def test_rejects_chapter_from_another_book(self) -> None:
        book, _, _ = self._create_book_with_chapters()
        other_book = Book(title="Other Book")
        other_chapter = Chapter(book=other_book, index_in_book=1, title="Other", source_text="別の本文です。")
        self.db.add_all([other_book, other_chapter])
        self.db.commit()
        self.db.refresh(other_chapter)

        with self.assertRaises(ValueError):
            update_reading_progress(
                self.db,
                book.id,
                ReadingProgressUpdate(chapter_id=other_chapter.id, progress_percent=50),
            )

    def test_deleted_chapter_fallback_returns_first_available_chapter(self) -> None:
        book, first, second = self._create_book_with_chapters()
        update_reading_progress(self.db, book.id, ReadingProgressUpdate(chapter_id=second.id, progress_percent=75))
        self.db.delete(second)
        self.db.commit()

        progress = get_reading_progress(self.db, book.id)

        self.assertIsNotNone(progress)
        assert progress is not None
        self.assertEqual(progress.chapter_id, first.id)
        self.assertEqual(progress.progress_percent, 0)
        self.assertTrue(progress.fallback_used)

    def test_no_chapters_returns_null_chapter_id(self) -> None:
        book = Book(title="Empty Book")
        self.db.add(book)
        self.db.commit()
        self.db.refresh(book)
        stale_progress = ReadingProgress(book_id=book.id, chapter_id=None, progress_percent=60)
        self.db.add(stale_progress)
        self.db.commit()

        progress = get_reading_progress(self.db, book.id)

        self.assertIsNotNone(progress)
        assert progress is not None
        self.assertEqual(progress.chapter_id, None)
        self.assertEqual(progress.progress_percent, 0)
        self.assertTrue(progress.fallback_used)

    def test_delete_book_removes_reading_progress(self) -> None:
        book, _, second = self._create_book_with_chapters()
        update_reading_progress(self.db, book.id, ReadingProgressUpdate(chapter_id=second.id, progress_percent=55))

        self.db.delete(book)
        self.db.commit()

        row_count = self.db.query(ReadingProgress).filter(ReadingProgress.book_id == book.id).count()
        self.assertEqual(row_count, 0)

    def test_api_returns_404_for_missing_book(self) -> None:
        app = create_application()

        def override_db():
            try:
                yield self.db
            finally:
                pass

        app.dependency_overrides[get_db] = override_db
        client = TestClient(app)

        response = client.get("/books/999/reading-progress")

        self.assertEqual(response.status_code, 404)

    def test_api_saves_and_returns_progress(self) -> None:
        book, _, second = self._create_book_with_chapters()
        app = create_application()

        def override_db():
            try:
                yield self.db
            finally:
                pass

        app.dependency_overrides[get_db] = override_db
        client = TestClient(app)

        response = client.put(
            f"/books/{book.id}/reading-progress",
            json={"chapter_id": second.id, "progress_percent": 33},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["chapter_id"], second.id)
        self.assertEqual(response.json()["progress_percent"], 33)


if __name__ == "__main__":
    unittest.main()
