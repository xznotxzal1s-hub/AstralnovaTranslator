from __future__ import annotations

import time

import httpx
from sqlalchemy.orm import Session

from app.models.translation_config import TranslationConfig
from app.schemas.settings import (
    ModelListRequest,
    ModelListResponse,
    ProviderConnectionTestRequest,
    ProviderConnectionTestResponse,
)
from app.services.providers.errors import build_provider_error_message, redact_sensitive_text
from app.services.providers.factory import get_translation_provider


TEST_PROMPT = "Reply with OK only."


def _clamped_probe_timeout(timeout_seconds: int) -> int:
    return max(1, min(timeout_seconds, 30))


def _resolve_api_key(db: Session, preset_id: int | None, api_key: str) -> str:
    normalized_api_key = api_key.strip()
    if normalized_api_key and "****" not in normalized_api_key:
        return api_key

    if preset_id is None:
        return "" if "****" in normalized_api_key else api_key

    preset = db.query(TranslationConfig).filter(TranslationConfig.id == preset_id).first()
    if preset is None:
        return "" if "****" in normalized_api_key else api_key
    return preset.api_key


def test_provider_connection(
    db: Session,
    payload: ProviderConnectionTestRequest,
) -> ProviderConnectionTestResponse:
    api_key = _resolve_api_key(db, payload.preset_id, payload.api_key)
    started_at = time.perf_counter()

    try:
        provider = get_translation_provider(payload.provider_type)
        translated_text = provider.translate_text(
            prompt=TEST_PROMPT,
            api_base_url=payload.api_base_url,
            api_key=api_key,
            model_name=payload.model_name,
            request_timeout_seconds=_clamped_probe_timeout(payload.request_timeout_seconds),
            temperature=payload.temperature,
            max_output_tokens=payload.max_output_tokens,
        )
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        if not translated_text.strip():
            raise ValueError("Provider returned an empty response.")
        return ProviderConnectionTestResponse(
            success=True,
            provider_type=payload.provider_type,
            model_name=payload.model_name,
            latency_ms=latency_ms,
            message="Provider connection succeeded.",
        )
    except Exception as exc:
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        safe_detail = redact_sensitive_text(str(exc), api_key, payload.api_key).strip()
        if not safe_detail:
            safe_detail = build_provider_error_message("Provider", exc, api_key)
        return ProviderConnectionTestResponse(
            success=False,
            provider_type=payload.provider_type,
            model_name=payload.model_name,
            latency_ms=latency_ms,
            message="Provider connection test failed.",
            detail=safe_detail,
        )


def _authorization_headers(api_key: str) -> dict[str, str]:
    if not api_key.strip():
        return {}
    return {"Authorization": f"Bearer {api_key}"}


def _openai_compatible_models(payload: ModelListRequest, api_key: str) -> list[str]:
    endpoint = f"{payload.api_base_url.rstrip('/')}/models"
    with httpx.Client(timeout=float(_clamped_probe_timeout(payload.request_timeout_seconds))) as client:
        response = client.get(endpoint, headers=_authorization_headers(api_key))
        response.raise_for_status()
    data = response.json()
    model_rows = data.get("data", [])
    models = [row.get("id", "") for row in model_rows if isinstance(row, dict)]
    return sorted(model for model in models if model)


def _gemini_models(payload: ModelListRequest, api_key: str) -> list[str]:
    endpoint = f"{payload.api_base_url.rstrip('/')}/models"
    with httpx.Client(timeout=float(_clamped_probe_timeout(payload.request_timeout_seconds))) as client:
        response = client.get(endpoint, params={"key": api_key})
        response.raise_for_status()
    data = response.json()
    model_rows = data.get("models", [])
    models: list[str] = []
    for row in model_rows:
        if not isinstance(row, dict):
            continue
        raw_name = str(row.get("name", "")).strip()
        if raw_name.startswith("models/"):
            raw_name = raw_name.removeprefix("models/")
        if raw_name:
            models.append(raw_name)
    return sorted(models)


def list_provider_models(db: Session, payload: ModelListRequest) -> ModelListResponse:
    api_key = _resolve_api_key(db, payload.preset_id, payload.api_key)

    try:
        if payload.provider_type == "openai_compatible":
            models = _openai_compatible_models(payload, api_key)
        elif payload.provider_type == "gemini":
            models = _gemini_models(payload, api_key)
        else:
            models = []

        if not models:
            return ModelListResponse(
                success=False,
                provider_type=payload.provider_type,
                models=[],
                manual_model_input_required=True,
                message="No models were returned. Please enter the model name manually.",
            )

        return ModelListResponse(
            success=True,
            provider_type=payload.provider_type,
            models=models,
            manual_model_input_required=False,
            message="Models fetched successfully.",
        )
    except Exception as exc:
        safe_detail = (
            build_provider_error_message("Provider", exc, api_key)
            if isinstance(exc, httpx.HTTPError)
            else redact_sensitive_text(str(exc), api_key, payload.api_key).strip()
        )
        return ModelListResponse(
            success=False,
            provider_type=payload.provider_type,
            models=[],
            manual_model_input_required=True,
            message="Could not fetch models. Please enter the model name manually.",
            detail=safe_detail or None,
        )
