from app.services.providers.base import TranslationProvider
from app.services.providers.gemini import GeminiProvider
from app.services.providers.openai_compatible import OpenAICompatibleProvider


def get_translation_provider(provider_type: str) -> TranslationProvider:
    if provider_type == "openai_compatible":
        return OpenAICompatibleProvider()
    if provider_type == "gemini":
        return GeminiProvider()
    raise ValueError(f"Unsupported provider type: {provider_type}")
