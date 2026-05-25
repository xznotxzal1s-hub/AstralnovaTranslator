import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
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
from app.core.database import get_db  # noqa: E402
from app.main import create_application  # noqa: E402
from app.models.book import Book  # noqa: E402
from app.models.chapter import Chapter  # noqa: E402
from app.models.translation_config import TranslationConfig  # noqa: E402
from app.schemas.settings import ModelListRequest, ProviderConnectionTestRequest, TranslationPresetUpdate  # noqa: E402
from app.services.provider_settings_service import list_provider_models, test_provider_connection  # noqa: E402
from app.services.providers.errors import build_provider_error_message  # noqa: E402
from app.services.settings_service import build_translation_config_read, update_translation_preset  # noqa: E402
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
    def __init__(self, payload: dict[str, object] | None = None, status_code: int = 200, text: str = "") -> None:
        self._payload = payload or {"data": [{"id": "model-a"}, {"id": "model-b"}]}
        self.status_code = status_code
        self.text = text or str(self._payload)

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("GET", "https://api.example.com/v1/models?key=sk-model-secret")
            raise httpx.HTTPStatusError("Provider rejected request", request=request, response=httpx.Response(self.status_code, request=request, text=self.text))
        return None

    def json(self) -> dict[str, object]:
        return self._payload


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


class FakeGeminiModelClient(FakeModelClient):
    def get(self, endpoint: str, params: dict[str, str]) -> FakeModelResponse:  # type: ignore[override]
        self.endpoint = endpoint
        self.params = params
        return FakeModelResponse({"models": [{"name": "models/gemini-1.5-flash"}, {"name": "models/gemini-1.5-pro"}]})


class FakeFailingModelClient(FakeModelClient):
    def get(self, endpoint: str, headers: dict[str, str]) -> FakeModelResponse:
        self.endpoint = endpoint
        self.headers = headers
        return FakeModelResponse(status_code=401, text="invalid key sk-model-secret")


class ProviderSettingsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db: Session = self.SessionLocal()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _client(self) -> TestClient:
        app = create_application()

        def override_get_db() -> object:
            yield self.db

        app.dependency_overrides[get_db] = override_get_db
        return TestClient(app)

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

    def test_test_provider_endpoint_returns_success_response(self) -> None:
        provider = SuccessfulProvider()
        client = self._client()

        with patch("app.services.provider_settings_service.get_translation_provider", return_value=provider):
            response = client.post(
                "/settings/test-provider",
                json={
                    "provider_type": "openai_compatible",
                    "api_base_url": "https://api.example.com/v1",
                    "api_key": "sk-endpoint-secret",
                    "model_name": "demo-model",
                    "request_timeout_seconds": 11,
                    "temperature": 0.5,
                    "max_output_tokens": 99,
                },
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["provider_type"], "openai_compatible")
        self.assertEqual(data["model_name"], "demo-model")
        self.assertEqual(provider.calls[0]["request_timeout_seconds"], 11)
        self.assertEqual(provider.calls[0]["temperature"], 0.5)
        self.assertEqual(provider.calls[0]["max_output_tokens"], 99)

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

    def test_gemini_model_list_returns_model_names_without_prefix(self) -> None:
        payload = ModelListRequest(
            provider_type="gemini",
            api_base_url="https://generativelanguage.googleapis.com/v1beta",
            api_key="gemini-secret",
        )

        with patch("app.services.provider_settings_service.httpx.Client", FakeGeminiModelClient):
            result = list_provider_models(self.db, payload)

        self.assertTrue(result.success)
        self.assertEqual(result.models, ["gemini-1.5-flash", "gemini-1.5-pro"])

    def test_model_list_failure_redacts_api_keys(self) -> None:
        payload = ModelListRequest(
            provider_type="openai_compatible",
            api_base_url="https://api.example.com/v1",
            api_key="sk-model-secret",
        )

        with patch("app.services.provider_settings_service.httpx.Client", FakeFailingModelClient):
            result = list_provider_models(self.db, payload)

        self.assertFalse(result.success)
        self.assertTrue(result.manual_model_input_required)
        self.assertNotIn("sk-model-secret", result.detail or "")
        self.assertIn("[redacted]", result.detail or "")

    def test_list_models_endpoint_returns_models(self) -> None:
        client = self._client()

        with patch("app.services.provider_settings_service.httpx.Client", FakeModelClient):
            response = client.post(
                "/settings/list-models",
                json={
                    "provider_type": "openai_compatible",
                    "api_base_url": "https://api.example.com/v1",
                    "api_key": "sk-endpoint-secret",
                    "request_timeout_seconds": 12,
                },
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["models"], ["model-a", "model-b"])

    def test_advanced_provider_options_round_trip_through_settings_service(self) -> None:
        config = self._create_active_config()
        payload = TranslationPresetUpdate(
            name="Updated Provider",
            provider_type="openai_compatible",
            api_base_url="https://api.example.com/v1",
            model_name="updated-model",
            api_key="",
            prompt_template="Translate {source_text}",
            chunk_size=1200,
            translation_mode="natural",
            request_timeout_seconds=45,
            retry_count=3,
            retry_backoff_seconds=4,
            rate_limit_delay_ms=800,
            temperature=0.7,
            max_output_tokens=4096,
        )

        updated = update_translation_preset(self.db, config.id, payload)
        assert updated is not None
        read_model = build_translation_config_read(updated)

        self.assertEqual(updated.request_timeout_seconds, 45)
        self.assertEqual(updated.retry_count, 3)
        self.assertEqual(updated.retry_backoff_seconds, 4)
        self.assertEqual(updated.rate_limit_delay_ms, 800)
        self.assertEqual(updated.temperature, 0.7)
        self.assertEqual(updated.max_output_tokens, 4096)
        self.assertEqual(read_model.request_timeout_seconds, 45)
        self.assertEqual(read_model.max_output_tokens, 4096)

    def test_provider_error_message_normalizes_common_http_failures(self) -> None:
        cases = [
            (401, "rejected the API key"),
            (404, "model was not found"),
            (429, "rate limit"),
            (500, "server error"),
        ]

        for status_code, expected_message in cases:
            with self.subTest(status_code=status_code):
                request = httpx.Request("POST", f"https://api.example.com/chat?key=sk-http-secret")
                response = httpx.Response(status_code, request=request, text="secret sk-http-secret")
                error = httpx.HTTPStatusError("provider failed", request=request, response=response)

                message = build_provider_error_message("Provider", error, "sk-http-secret")

                self.assertIn(expected_message, message)
                self.assertNotIn("sk-http-secret", message)
                self.assertIn("[redacted]", message)

    def test_provider_error_message_normalizes_timeout_and_bad_base_url(self) -> None:
        timeout_message = build_provider_error_message(
            "Provider",
            httpx.TimeoutException("timed out"),
            "sk-timeout-secret",
        )
        bad_url_message = build_provider_error_message(
            "Provider",
            httpx.ConnectError("Name or service not known"),
            "sk-connect-secret",
        )

        self.assertIn("timed out", timeout_message)
        self.assertIn("could not be reached", bad_url_message)

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
