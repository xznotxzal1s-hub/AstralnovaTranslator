import os
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


_TEST_ROOT = Path(__file__).resolve().parent / ".tmp"
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.core.config import settings  # noqa: E402
from app.core.database import Base  # noqa: E402
from app.models.book import Book  # noqa: E402
from app.models.chapter import Chapter  # noqa: E402
from app.models.glossary_entry import GlossaryEntry  # noqa: E402
from app.models.translation_config import TranslationConfig  # noqa: E402
from app.models.translation_record import TranslationRecord  # noqa: E402
from app.services.translation_service import translate_chapter  # noqa: E402
from app.utils.translation import build_glossary_guidance, build_prompt, calculate_source_hash, calculate_text_hash  # noqa: E402


class FakeProvider:
    def __init__(self, translated_text: str) -> None:
        self.translated_text = translated_text
        self.prompts: list[str] = []

    def translate_text(
        self,
        *,
        prompt: str,
        api_base_url: str,
        api_key: str,
        model_name: str,
        request_timeout_seconds: int = 60,
        temperature: float | None = 0.3,
        max_output_tokens: int | None = None,
    ) -> str:
        self.prompts.append(prompt)
        return self.translated_text


class TranslationBehaviourTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db: Session = self.SessionLocal()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _create_book_chapter_and_config(self, prompt_template: str = "Mode: {translation_mode}\n\nText:\n{source_text}") -> Chapter:
        book = Book(title="Test Book")
        chapter = Chapter(book=book, index_in_book=1, title="Chapter 1", source_text="勇者は魔王を見た。")
        config = TranslationConfig(
            name="Test Preset",
            is_active=True,
            provider_type="openai_compatible",
            api_base_url="https://example.com/v1",
            model_name="test-model",
            api_key="test-key",
            prompt_template=prompt_template,
            chunk_size=1500,
            translation_mode="natural",
        )
        self.db.add_all([book, chapter, config])
        self.db.commit()
        self.db.refresh(chapter)
        return chapter

    def _save_matching_translation_record(self, chapter: Chapter, translated_text: str) -> TranslationRecord:
        source_hash = calculate_source_hash(chapter.source_text)
        prompt_context = "\n".join(
            [
                "Mode: {translation_mode}\n\nText:\n{source_text}",
                "translation_mode=natural",
                "chunk_size=1500",
                "request_timeout_seconds=60",
                "retry_count=1",
                "retry_backoff_seconds=2",
                "rate_limit_delay_ms=0",
                "temperature=0.3",
                "max_output_tokens=None",
                "",
            ],
        ).strip()
        record = TranslationRecord(
            chapter_id=chapter.id,
            provider_type="openai_compatible",
            model_name="test-model",
            prompt_hash=calculate_text_hash(prompt_context),
            source_hash=source_hash,
            translated_text=translated_text,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def test_translate_reuses_matching_translation_record_without_calling_provider(self) -> None:
        chapter = self._create_book_chapter_and_config()
        self._save_matching_translation_record(chapter, translated_text="cached translation")
        provider = FakeProvider(translated_text="fresh translation")

        with patch("app.services.translation_service.get_translation_provider", return_value=provider):
            translated_chapter = translate_chapter(self.db, chapter, force=False)

        self.assertEqual(translated_chapter.translated_text, "cached translation")
        self.assertEqual(provider.prompts, [])

    def test_retranslate_bypasses_matching_translation_record_and_calls_provider(self) -> None:
        chapter = self._create_book_chapter_and_config()
        self._save_matching_translation_record(chapter, translated_text="cached translation")
        provider = FakeProvider(translated_text="fresh translation")

        with patch("app.services.translation_service.get_translation_provider", return_value=provider):
            translated_chapter = translate_chapter(self.db, chapter, force=True)

        self.assertEqual(translated_chapter.translated_text, "fresh translation")
        self.assertEqual(len(provider.prompts), 1)
        fresh_record = (
            self.db.query(TranslationRecord)
            .filter(TranslationRecord.translated_text == "fresh translation")
            .one()
        )
        expected_prompt_context = "\n".join(
            [
                "Mode: {translation_mode}\n\nText:\n{source_text}",
                "translation_mode=natural",
                "chunk_size=1500",
                "request_timeout_seconds=60",
                "retry_count=1",
                "retry_backoff_seconds=2",
                "rate_limit_delay_ms=0",
                "temperature=0.3",
                "max_output_tokens=None",
                "",
            ],
        ).strip()
        self.assertEqual(fresh_record.provider_type, "openai_compatible")
        self.assertEqual(fresh_record.model_name, "test-model")
        self.assertEqual(fresh_record.prompt_hash, calculate_text_hash(expected_prompt_context))
        self.assertEqual(fresh_record.source_hash, calculate_source_hash(chapter.source_text))

    def test_build_prompt_appends_glossary_when_template_has_no_glossary_placeholder(self) -> None:
        glossary_guidance = build_glossary_guidance(
            [{"source_term": "魔王", "target_term": "魔王", "note": "Keep as title"}],
        )

        prompt = build_prompt(
            prompt_template="Mode: {translation_mode}\n\nText:\n{source_text}",
            source_text="魔王が笑った。",
            translation_mode="natural",
            glossary_guidance=glossary_guidance,
        )

        self.assertIn("Glossary guidance:", prompt)
        self.assertIn("魔王 => 魔王", prompt)

    def test_default_prompt_template_includes_glossary_guidance_placeholder(self) -> None:
        self.assertIn("{glossary_guidance}", settings.initial_prompt_template)

    def test_book_glossary_overrides_global_glossary_in_provider_prompt(self) -> None:
        chapter = self._create_book_chapter_and_config()
        global_entry = GlossaryEntry(source_term="魔王", target_term="Demon King", note=None)
        book_entry = GlossaryEntry(book_id=chapter.book_id, source_term="魔王", target_term="魔王", note="book scope")
        self.db.add_all([global_entry, book_entry])
        self.db.commit()
        provider = FakeProvider(translated_text="fresh translation")

        with patch("app.services.translation_service.get_translation_provider", return_value=provider):
            translate_chapter(self.db, chapter, force=True)

        self.assertEqual(len(provider.prompts), 1)
        self.assertIn("魔王 => 魔王", provider.prompts[0])
        self.assertNotIn("魔王 => Demon King", provider.prompts[0])


if __name__ == "__main__":
    unittest.main()
