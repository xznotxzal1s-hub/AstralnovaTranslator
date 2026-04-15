from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Private Light Novel AI Translator Reader"
    api_v1_prefix: str = ""
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    data_dir: Path = Path("/app/data")
    uploads_dir: Path = Path("/app/uploads")
    database_file: str = "app.db"
    initial_provider_type: str = "openai_compatible"
    initial_api_base_url: str = "https://api.openai.com/v1"
    initial_model_name: str = "gpt-4o-mini"
    initial_api_key: str = ""
    initial_prompt_template: str = (
        "You are a Japanese light novel translator. Translate the Japanese text into fluent Simplified Chinese. "
        "Preserve tone, honorifics, narrative structure, and paragraph breaks. "
        "Translation mode: {translation_mode}.\n\nJapanese text:\n{source_text}"
    )
    initial_chunk_size: int = 1500
    initial_translation_mode: str = "natural"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def database_url(self) -> str:
        database_path = self.data_dir / self.database_file
        return f"sqlite:///{database_path.as_posix()}"


settings = Settings()
