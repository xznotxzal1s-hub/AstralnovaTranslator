from typing import Protocol


class TranslationProvider(Protocol):
    def translate_text(
        self,
        prompt: str,
        api_base_url: str,
        api_key: str,
        model_name: str,
    ) -> str:
        """Translate one prompt into the target language."""
