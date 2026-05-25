from typing import Protocol


class TranslationProvider(Protocol):
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
        """Translate one prompt into the target language."""
