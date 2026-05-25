import httpx

from app.services.providers.errors import ProviderRequestError, build_provider_error_message


class OpenAICompatibleProvider:
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
        endpoint = f"{api_base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        }
        if temperature is not None:
            payload["temperature"] = temperature
        if max_output_tokens is not None:
            payload["max_tokens"] = max_output_tokens

        headers = {
            "Content-Type": "application/json",
        }
        if api_key.strip():
            headers["Authorization"] = f"Bearer {api_key}"

        try:
            with httpx.Client(timeout=float(request_timeout_seconds)) as client:
                response = client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ProviderRequestError(build_provider_error_message("OpenAI-compatible", exc, api_key)) from exc

        try:
            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                raise ValueError("Provider returned no choices.")

            message = choices[0].get("message", {})
            content = message.get("content")

            if isinstance(content, str):
                translated_text = content.strip()
                if translated_text:
                    return translated_text

            if isinstance(content, list):
                text_parts = [part.get("text", "") for part in content if isinstance(part, dict)]
                combined_text = "".join(text_parts).strip()
                if combined_text:
                    return combined_text

            raise ValueError("Provider returned an empty response.")
        except (ValueError, TypeError) as exc:
            raise ProviderRequestError(build_provider_error_message("OpenAI-compatible", exc, api_key)) from exc
