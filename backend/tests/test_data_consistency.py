import os
import unittest
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker


_TEST_ROOT = Path(__file__).resolve().parent / ".tmp"
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.api.chapters import create_chapter, delete_chapter, update_chapter  # noqa: E402
from app.core.database import Base  # noqa: E402
from app.models.book import Book  # noqa: E402
from app.models.chapter import Chapter  # noqa: E402
from app.models.translation_record import TranslationRecord  # noqa: E402
from app.schemas.chapter import ChapterCreate, ChapterUpdate  # noqa: E402
from app.services.translation_record_service import save_translation_record  # noqa: E402


class DataConsistencyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db: Session = self.SessionLocal()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _create_book(self, title: str = "Book") -> Book:
        book = Book(title=title)
        self.db.add(book)
        self.db.commit()
        self.db.refresh(book)
        return book

    def _create_chapter(self, book: Book, index: int = 1) -> Chapter:
        chapter = Chapter(book_id=book.id, index_in_book=index, title=f"Chapter {index}", source_text="source")
        self.db.add(chapter)
        self.db.commit()
        self.db.refresh(chapter)
        return chapter

    def _set_old_book_timestamp(self, book: Book) -> datetime:
        old_timestamp = datetime(2000, 1, 1, tzinfo=timezone.utc)
        book.updated_at = old_timestamp
        self.db.add(book)
        self.db.commit()
        self.db.refresh(book)
        return book.updated_at

    def test_save_translation_record_updates_existing_cache_key_instead_of_duplicating(self) -> None:
        book = self._create_book()
        chapter = self._create_chapter(book)

        first_record = save_translation_record(
            self.db,
            chapter=chapter,
            provider_type="openai_compatible",
            model_name="test-model",
            prompt_hash="prompt-hash",
            source_hash="source-hash",
            translated_text="first translation",
        )
        second_record = save_translation_record(
            self.db,
            chapter=chapter,
            provider_type="openai_compatible",
            model_name="test-model",
            prompt_hash="prompt-hash",
            source_hash="source-hash",
            translated_text="second translation",
        )

        records = self.db.query(TranslationRecord).all()
        self.assertEqual(first_record.id, second_record.id)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].translated_text, "second translation")

    def test_chapter_index_is_unique_within_a_book(self) -> None:
        book = self._create_book()
        self._create_chapter(book, index=1)
        duplicate_chapter = Chapter(book_id=book.id, index_in_book=1, title="Duplicate", source_text="source")
        self.db.add(duplicate_chapter)

        with self.assertRaises(IntegrityError):
            self.db.commit()

    def test_same_chapter_index_can_exist_in_different_books(self) -> None:
        first_book = self._create_book("First")
        second_book = self._create_book("Second")
        self._create_chapter(first_book, index=1)
        self._create_chapter(second_book, index=1)

        self.assertEqual(self.db.query(Chapter).count(), 2)

    def test_creating_chapter_touches_parent_book_updated_at(self) -> None:
        book = self._create_book()
        old_timestamp = self._set_old_book_timestamp(book)

        create_chapter(
            book_id=book.id,
            payload=ChapterCreate(title="New chapter", source_text="source"),
            db=self.db,
        )

        self.db.refresh(book)
        self.assertNotEqual(book.updated_at, old_timestamp)

    def test_updating_chapter_touches_parent_book_updated_at(self) -> None:
        book = self._create_book()
        chapter = self._create_chapter(book)
        old_timestamp = self._set_old_book_timestamp(book)

        update_chapter(
            chapter_id=chapter.id,
            payload=ChapterUpdate(title="Updated chapter", source_text="updated source"),
            db=self.db,
        )

        self.db.refresh(book)
        self.assertNotEqual(book.updated_at, old_timestamp)

    def test_deleting_chapter_touches_parent_book_updated_at(self) -> None:
        book = self._create_book()
        chapter = self._create_chapter(book)
        old_timestamp = self._set_old_book_timestamp(book)

        delete_chapter(chapter_id=chapter.id, db=self.db)

        self.db.refresh(book)
        self.assertNotEqual(book.updated_at, old_timestamp)


if __name__ == "__main__":
    unittest.main()
