import asyncio
import os
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


_TEST_ROOT = Path(__file__).resolve().parent / ".tmp"
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.core.config import Settings  # noqa: E402
from app.core.database import Base  # noqa: E402
from app.models.translation_config import TranslationConfig  # noqa: E402
from app.schemas.settings import TranslationConfigUpdate  # noqa: E402
from app.services import import_service  # noqa: E402
from app.services.import_service import ImportServiceError  # noqa: E402
from app.services.settings_service import build_translation_config_read, save_translation_config  # noqa: E402
from app.utils.webpage_import import validate_webpage_url  # noqa: E402


class FakeUpload:
    def __init__(self, filename: str, content: bytes) -> None:
        self.filename = filename
        self._stream = BytesIO(content)

    async def read(self, size: int = -1) -> bytes:
        return self._stream.read(size)


class SecurityHardeningTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db: Session = self.SessionLocal()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _create_active_config(self, api_key: str = "sk-test1234abcd") -> TranslationConfig:
        config = TranslationConfig(
            name="Secure Preset",
            is_active=True,
            provider_type="openai_compatible",
            api_base_url="https://example.com/v1",
            model_name="test-model",
            api_key=api_key,
            prompt_template="Translate {source_text}",
            chunk_size=1500,
            translation_mode="natural",
        )
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    def test_settings_parse_allowed_origins_from_comma_separated_env_value(self) -> None:
        settings = Settings(allowed_origins="http://localhost:3000, https://reader.example")

        self.assertEqual(settings.allowed_origin_list, ["http://localhost:3000", "https://reader.example"])

    def test_settings_exposes_upload_size_limit_in_bytes(self) -> None:
        settings = Settings(max_upload_mb=2)

        self.assertEqual(settings.max_upload_bytes, 2 * 1024 * 1024)

    def test_url_import_rejects_localhost_and_private_network_targets(self) -> None:
        blocked_urls = [
            "http://localhost/story",
            "http://127.0.0.1/story",
            "http://[::1]/story",
            "http://10.0.0.2/story",
            "http://172.16.0.2/story",
            "http://192.168.1.10/story",
            "http://169.254.169.254/latest/meta-data/",
        ]

        for url in blocked_urls:
            with self.subTest(url=url):
                with self.assertRaises(ValueError):
                    validate_webpage_url(url)

    def test_url_import_rejects_non_http_schemes(self) -> None:
        with self.assertRaises(ValueError):
            validate_webpage_url("file:///etc/passwd")

    def test_upload_rejects_files_larger_than_configured_limit(self) -> None:
        upload = FakeUpload("large.txt", b"abcdef")

        with patch.object(import_service.settings, "max_upload_mb", 0):
            with self.assertRaises(ImportServiceError):
                asyncio.run(import_service._save_upload(upload))

    def test_settings_read_masks_api_key_and_reports_presence(self) -> None:
        config = self._create_active_config(api_key="sk-test1234abcd")

        read_model = build_translation_config_read(config)

        self.assertEqual(read_model.api_key, "sk-****abcd")
        self.assertTrue(read_model.has_api_key)

    def test_settings_update_preserves_existing_api_key_when_payload_key_is_empty(self) -> None:
        config = self._create_active_config(api_key="sk-test1234abcd")
        payload = TranslationConfigUpdate(
            provider_type="gemini",
            api_base_url="https://generativelanguage.googleapis.com",
            model_name="gemini-test",
            api_key="",
            prompt_template="Translate {source_text}",
            chunk_size=1200,
            translation_mode="natural",
        )

        updated_config = save_translation_config(self.db, payload)

        self.assertEqual(updated_config.id, config.id)
        self.assertEqual(updated_config.api_key, "sk-test1234abcd")
        self.assertEqual(updated_config.provider_type, "gemini")


if __name__ == "__main__":
    unittest.main()
