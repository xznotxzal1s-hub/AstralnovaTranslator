import os
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


_TEST_ROOT = Path(__file__).resolve().parent / ".tmp"
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.api.settings import validate_settings_prompt  # noqa: E402
from app.core.database import Base  # noqa: E402
from app.models.translation_config import TranslationConfig  # noqa: E402
from app.schemas.settings import PromptTemplateValidationRequest, TranslationConfigUpdate  # noqa: E402
from app.services.settings_service import save_translation_config  # noqa: E402
from app.utils.prompt_validation import PromptTemplateValidationError, validate_prompt_template  # noqa: E402


class PromptValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db: Session = self.SessionLocal()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _create_active_config(self) -> TranslationConfig:
        config = TranslationConfig(
            name="Prompt Test",
            is_active=True,
            provider_type="openai_compatible",
            api_base_url="https://example.com/v1",
            model_name="test-model",
            api_key="test-key",
            prompt_template="Mode: {translation_mode}\n{glossary_guidance}\n{source_text}",
            chunk_size=1500,
            translation_mode="natural",
        )
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    def test_valid_prompt_template_passes_validation(self) -> None:
        result = validate_prompt_template("Mode: {translation_mode}\n{glossary_guidance}\nText: {source_text}")

        self.assertTrue(result.is_valid)
        self.assertEqual(result.errors, [])

    def test_prompt_template_missing_glossary_placeholder_is_valid_with_warning(self) -> None:
        result = validate_prompt_template("Mode: {translation_mode}\nText: {source_text}")

        self.assertTrue(result.is_valid)
        self.assertEqual(result.errors, [])
        self.assertIn("{glossary_guidance}", result.warnings[0])

    def test_prompt_template_with_unknown_placeholder_fails_validation(self) -> None:
        result = validate_prompt_template("Text: {source_text}\nTone: {tone}")

        self.assertFalse(result.is_valid)
        self.assertIn("Unknown prompt placeholder: {tone}.", result.errors)

    def test_prompt_template_with_malformed_braces_fails_validation(self) -> None:
        result = validate_prompt_template("Text: {source_text")

        self.assertFalse(result.is_valid)
        self.assertIn("malformed braces", result.errors[0])

    def test_validate_prompt_endpoint_returns_validation_result(self) -> None:
        response = validate_settings_prompt(PromptTemplateValidationRequest(prompt_template="Text: {source_text}"))

        self.assertTrue(response.is_valid)
        self.assertEqual(response.errors, [])
        self.assertTrue(response.warnings)

    def test_saving_invalid_prompt_template_is_rejected(self) -> None:
        self._create_active_config()
        payload = TranslationConfigUpdate(
            provider_type="openai_compatible",
            api_base_url="https://example.com/v1",
            model_name="test-model",
            api_key="",
            prompt_template="Text: {source_text}\nTone: {tone}",
            chunk_size=1500,
            translation_mode="natural",
        )

        with self.assertRaises(PromptTemplateValidationError):
            save_translation_config(self.db, payload)


if __name__ == "__main__":
    unittest.main()
