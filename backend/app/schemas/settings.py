from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ProviderType = Literal["openai_compatible", "gemini"]


class TranslationConfigBase(BaseModel):
    provider_type: ProviderType
    api_base_url: str = Field(min_length=1, max_length=500)
    model_name: str = Field(min_length=1, max_length=255)
    api_key: str = Field(default="")
    prompt_template: str = Field(min_length=1)
    chunk_size: int = Field(ge=1, le=10000)
    translation_mode: str = Field(min_length=1, max_length=50)


class TranslationConfigUpdate(TranslationConfigBase):
    pass


class TranslationPresetBase(TranslationConfigBase):
    name: str = Field(min_length=1, max_length=255)


class TranslationPresetCreate(TranslationPresetBase):
    pass


class TranslationPresetUpdate(TranslationPresetBase):
    pass


class TranslationConfigRead(TranslationConfigBase):
    id: int
    name: str
    is_active: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
