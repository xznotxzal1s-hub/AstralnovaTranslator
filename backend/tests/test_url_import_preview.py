import asyncio
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


_TEST_ROOT = Path(__file__).resolve().parent / ".tmp"
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.core.database import Base  # noqa: E402
from app.models.book import Book  # noqa: E402
from app.models.chapter import Chapter  # noqa: E402
from app.services.import_service import import_webpage_url, preview_webpage_url  # noqa: E402


SAMPLE_HTML = """
<html>
  <head><title>Fallback Title</title><meta property="og:title" content="Preview Novel"></head>
  <body>
    <nav>ignore me</nav>
    <article>
      <h1>Preview Novel</h1>
      <p>第一章です。これは本文です。</p>
      <p>第二段落です。さらに続きます。</p>
    </article>
  </body>
</html>
"""


async def fake_fetch_webpage_html(url: str) -> str:
    return SAMPLE_HTML


class UrlImportPreviewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db: Session = self.SessionLocal()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def test_webpage_import_preview_extracts_title_count_and_preview_text(self) -> None:
        with patch("app.services.import_service.fetch_webpage_html", fake_fetch_webpage_html):
            preview = asyncio.run(preview_webpage_url("https://example.com/story", None))

        self.assertEqual(preview.title, "Preview Novel")
        self.assertEqual(preview.chapter_count, 1)
        self.assertIn("第一章です。これは本文です。", preview.preview_text)
        self.assertLessEqual(len(preview.preview_text), 1000)

    def test_confirm_save_path_creates_book_and_chapters_after_preview(self) -> None:
        with patch("app.services.import_service.fetch_webpage_html", fake_fetch_webpage_html):
            preview = asyncio.run(preview_webpage_url("https://example.com/story", None))
            result = asyncio.run(import_webpage_url(self.db, "https://example.com/story", None))

        self.assertEqual(preview.title, result.book_title)
        self.assertEqual(result.chapter_count, 1)
        self.assertEqual(self.db.query(Book).count(), 1)
        self.assertEqual(self.db.query(Chapter).count(), 1)
        self.assertIn("第二段落です。", result.chapters[0].source_text)


if __name__ == "__main__":
    unittest.main()
