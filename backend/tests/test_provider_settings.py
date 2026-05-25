import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


_TEST_ROOT = Path(tempfile.gettempdir()) / "astralnova_provider_settings_r4a"
if _TEST_ROOT.exists():
    shutil.rmtree(_TEST_ROOT, ignore_errors=True)
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")
(_TEST_ROOT / "data").mkdir(parents=True, exist_ok=True)
(_TEST_ROOT / "uploads").mkdir(parents=True, exist_ok=True)

from app.core.database import Base  # noqa: E402
from app.models.book import Book  # noqa: E402
from app.models.chapter import Chapter  # noqa: E402
from app.models.translation_config import TranslationConfig  # noqa: E402
from app.schemas.settings import ModelListRequest, ProviderConnectionTestRequest  # noqa: E402
from app.services.provider_settings_service import list_provider_models, test_provider_connection  # noqa: E402
from app.services.translation_service import translate_chapter  # noqa: E402


class SuccessfulProvider:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def translate_text(
        self,
        *,
        prompt: str,
        api_base_url: str,
        api_key: str,
        model_name: str,
        request_timeout_seconds: int,
        temperature: float | None,
        max_output_tokens: int | None,
    ) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "api_base_url": api_base_url,
                "api_key": api_key,
                "model_name": model_name,
                "request_timeout_seconds": request_timeout_seconds,
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
            },
        )
        return "OK"


class LeakyFailingProvider:
    def translate_text(self, **kwargs: object) -> str:
        api_key = str(kwargs["api_key"])
        raise RuntimeError(f"401 Unauthorized Bearer {api_key} at https://example.com/models?key={api_key}")


class FailsOnceProvider:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def translate_text(self, **kwargs: object) -> str:
        self.calls.append(kwargs)
        if len(self.calls) == 1:
            raise RuntimeError("temporary provider failure")
        return f"translated-{len(self.calls)}"


class FakeModelResponse:
    status_code = 200
    text = '{"data":[{"id":"model-a"},{"id":"model-b"}]}'

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return {"data": [{"id": "model-a"}, {"id": "model-b"}]}


class FakeModelClient:
    def __init__(self, *args: object, **kwargs: object) -> None:
        self.timeout = kwargs.get("timeout")

    def __enter__(self) -> "FakeModelClient":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def get(self, endpoint: str, headers: dict[str, str]) -> FakeModelResponse:
        self.endpoint = endpoint
        self.headers = headers
        return FakeModelResponse()


class ProviderSettingsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db: Session = self.SessionLocal()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _create_active_config(self, **overrides: object) -> TranslationConfig:
        values = {
            "name": "Provider Test",
            "is_active": True,
            "provider_type": "openai_compatible",
            "api_base_url": "https://example.com/v1",
            "model_name": "test-model",
            "api_key": "sk-saved-secret",
            "prompt_template": "Translate {source_text}",
            "chunk_size": 8,
            "translation_mode": "natural",
            "request_timeout_seconds": 17,
            "retry_count": 1,
            "retry_backoff_seconds": 3,
            "rate_limit_delay_ms": 250,
            "temperature": 0.2,
            "max_output_tokens": 512,
        }
        values.update(overrides)
        config = TranslationConfig(**values)
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    def test_provider_connection_uses_payload_and_does_not_save_settings(self) -> None:
        provider = SuccessfulProvider()
        payload = ProviderConnectionTestRequest(
            provider_type="openai_compatible",
            api_base_url="https://api.example.com/v1",
            api_key="sk-test-secret",
            model_name="demo-model",
            request_timeout_seconds=9,
            temperature=0.4,
            max_output_tokens=123,
        )

        with patch("app.services.provider_settings_service.get_translation_provider", return_value=provider):
            result = test_provider_connection(self.db, payload)

        self.assertTrue(result.success)
        self.assertEqual(result.provider_type, "openai_compatible")
        self.assertEqual(result.model_name, "demo-model")
        self.assertEqual(provider.calls[0]["request_timeout_seconds"], 9)
        self.assertEqual(provider.calls[0]["temperature"], 0.4)
        self.assertEqual(provider.calls[0]["max_output_tokens"], 123)
        self.assertEqual(self.db.query(TranslationConfig).count(), 0)

    def test_provider_connection_reuses_saved_key_for_masked_preset_key(self) -> None:
        config = self._create_active_config(api_key="sk-saved-secret")
        provider = SuccessfulProvider()
        payload = ProviderConnectionTestRequest(
            preset_id=config.id,
            provider_type="openai_compatible",
            api_base_url="https://api.example.com/v1",
            api_key="sk-****cret",
            model_name="demo-model",
        )

        with patch("app.services.provider_settings_service.get_translation_provider", return_value=provider):
            result = test_provider_connection(self.db, payload)

        self.assertTrue(result.success)
        self.assertEqual(provider.calls[0]["api_key"], "sk-saved-secret")

    def test_provider_connection_failure_redacts_api_keys(self) -> None:
        payload = ProviderConnectionTestRequest(
            provider_type="openai_compatible",
            api_base_url="https://api.example.com/v1",
            api_key="sk-leaky-secret",
            model_name="demo-model",
        )

        with patch("app.services.provider_settings_service.get_translation_provider", return_value=LeakyFailingProvider()):
            result = test_provider_connection(self.db, payload)

        self.assertFalse(result.success)
        self.assertNotIn("sk-leaky-secret", result.message)
        self.assertNotIn("sk-leaky-secret", result.detail or "")
        self.assertIn("[redacted]", result.detail or result.message)

    def test_openai_compatible_model_list_returns_model_ids(self) -> None:
        payload = ModelListRequest(
            provider_type="openai_compatible",
            api_base_url="https://api.example.com/v1",
            api_key="sk-test-secret",
        )

        with patch("app.services.provider_settings_service.httpx.Client", FakeModelClient):
            result = list_provider_models(self.db, payload)

        self.assertTrue(result.success)
        self.assertFalse(result.manual_model_input_required)
        self.assertEqual(result.models, ["model-a", "model-b"])

    def test_translation_service_uses_retry_timeout_temperature_and_rate_limit_options(self) -> None:
        book = Book(title="Provider Options")
        chapter = Chapter(book=book, index_in_book=1, title="Chapter", source_text="一二三四五六七八九十")
        self.db.add_all([book, chapter])
        self._create_active_config(chunk_size=5)
        self.db.commit()
        self.db.refresh(chapter)
        provider = FailsOnceProvider()

        with (
            patch("app.services.translation_service.get_translation_provider", return_value=provider),
            patch("app.services.translation_service.time.sleep") as sleep,
        ):
            translated = translate_chapter(self.db, chapter, force=True)

        self.assertEqual(translated.translation_status, "translated")
        self.assertGreaterEqual(len(provider.calls), 3)
        self.assertEqual(provider.calls[0]["request_timeout_seconds"], 17)
        self.assertEqual(provider.calls[0]["temperature"], 0.2)
        self.assertEqual(provider.calls[0]["max_output_tokens"], 512)
        sleep.assert_any_call(3)
        sleep.assert_any_call(0.25)


if __name__ == "__main__":
    unittest.main()
