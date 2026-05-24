from __future__ import annotations

import re


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


def build_provider_error_message(provider_name: str, error: Exception, api_key: str) -> str:
    details = [redact_sensitive_text(str(error), api_key).strip()]
    request = getattr(error, "request", None)
    request_url = getattr(request, "url", None)
    if request_url is not None:
        details.append(redact_sensitive_text(str(request_url), api_key))

    safe_details = " ".join(detail for detail in details if detail) or "The provider request failed."
    return f"{provider_name} provider request failed: {safe_details}"
