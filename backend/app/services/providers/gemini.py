import httpx

from app.services.providers.errors import ProviderRequestError, build_provider_error_message


class GeminiProvider:
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
        endpoint = f"{api_base_url.rstrip('/')}/models/{model_name}:generateContent"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt,
                        }
                    ]
                }
            ]
        }
        generation_config: dict[str, float | int] = {}
        if temperature is not None:
            generation_config["temperature"] = temperature
        if max_output_tokens is not None:
            generation_config["maxOutputTokens"] = max_output_tokens
        if generation_config:
            payload["generationConfig"] = generation_config

        params = {"key": api_key}

        try:
            with httpx.Client(timeout=float(request_timeout_seconds)) as client:
                response = client.post(endpoint, json=payload, params=params)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ProviderRequestError(build_provider_error_message("Gemini", exc, api_key)) from exc

        try:
            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("Provider returned no candidates.")

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
            if text:
                return text

            raise ValueError("Provider returned an empty response.")
        except (ValueError, TypeError) as exc:
            raise ProviderRequestError(build_provider_error_message("Gemini", exc, api_key)) from exc
