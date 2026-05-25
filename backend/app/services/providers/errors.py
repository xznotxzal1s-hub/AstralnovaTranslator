from __future__ import annotations

import re

import httpx


class ProviderRequestError(RuntimeError):
    """User-safe provider error that should not contain API secrets."""


def redact_sensitive_text(text: str, *secrets: str) -> str:
    sanitized_text = text
    for secret in secrets:
        normalized_secret = secret.strip()
        if normalized_secret:
            sanitized_text = sanitized_text.replace(normalized_secret, "[redacted]")

    sanitized_text = re.sub(
        r"([?&](?:key|api_key|api-key|access_token|token)=)[^&\s]+",
        r"\1[redacted]",
        sanitized_text,
        flags=re.IGNORECASE,
    )
    sanitized_text = re.sub(
        r"(Bearer\s+)[A-Za-z0-9._~+/=-]+",
        r"\1[redacted]",
        sanitized_text,
        flags=re.IGNORECASE,
    )
    return sanitized_text


def _safe_getattr(value: object, attribute_name: str) -> object | None:
    try:
        return getattr(value, attribute_name, None)
    except RuntimeError:
        return None


def build_provider_error_message(provider_name: str, error: Exception, api_key: str) -> str:
    summary = "The provider request failed."
    if isinstance(error, httpx.TimeoutException):
        summary = "The provider request timed out."
    elif isinstance(error, httpx.ConnectError | httpx.InvalidURL):
        summary = "The API base URL could not be reached. Check the provider URL."
    elif isinstance(error, httpx.HTTPStatusError):
        status_code = error.response.status_code
        if status_code in {401, 403}:
            summary = "The provider rejected the API key or credentials."
        elif status_code == 404:
            summary = "The provider endpoint or model was not found."
        elif status_code == 429:
            summary = "The provider rate limit was reached."
        elif 500 <= status_code < 600:
            summary = "The provider service returned a server error."
        else:
            summary = f"The provider returned HTTP {status_code}."

    details = [redact_sensitive_text(str(error), api_key).strip()]
    request = _safe_getattr(error, "request")
    request_url = _safe_getattr(request, "url")
    if request_url is not None:
        details.append(redact_sensitive_text(str(request_url), api_key))
    response = _safe_getattr(error, "response")
    response_text = _safe_getattr(response, "text")
    if response_text:
        details.append(redact_sensitive_text(str(response_text)[:500], api_key))

    safe_details = " ".join(detail for detail in details if detail) or "The provider request failed."
    return f"{provider_name} provider request failed: {summary} Details: {safe_details}"
