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
    request_timeout_seconds: int = Field(default=60, ge=1, le=300)
    retry_count: int = Field(default=1, ge=0, le=5)
    retry_backoff_seconds: int = Field(default=2, ge=0, le=60)
    rate_limit_delay_ms: int = Field(default=0, ge=0, le=60000)
    temperature: float | None = Field(default=0.3, ge=0, le=2)
    max_output_tokens: int | None = Field(default=None, ge=1, le=200000)


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
    has_api_key: bool = False
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PromptTemplateValidationRequest(BaseModel):
    prompt_template: str = Field(min_length=1)


class PromptTemplateValidationResponse(BaseModel):
    is_valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ProviderConnectionTestRequest(BaseModel):
    preset_id: int | None = None
    provider_type: ProviderType
    api_base_url: str = Field(min_length=1, max_length=500)
    api_key: str = Field(default="")
    model_name: str = Field(min_length=1, max_length=255)
    request_timeout_seconds: int = Field(default=60, ge=1, le=300)
    temperature: float | None = Field(default=0.3, ge=0, le=2)
    max_output_tokens: int | None = Field(default=None, ge=1, le=200000)


class ProviderConnectionTestResponse(BaseModel):
    success: bool
    provider_type: ProviderType
    model_name: str
    latency_ms: int | None = None
    message: str
    detail: str | None = None


class ModelListRequest(BaseModel):
    preset_id: int | None = None
    provider_type: ProviderType
    api_base_url: str = Field(min_length=1, max_length=500)
    api_key: str = Field(default="")
    request_timeout_seconds: int = Field(default=60, ge=1, le=300)


class ModelListResponse(BaseModel):
    success: bool
    provider_type: ProviderType
    models: list[str] = Field(default_factory=list)
    manual_model_input_required: bool = True
    message: str
    detail: str | None = None
