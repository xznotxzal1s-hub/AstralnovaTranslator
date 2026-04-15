import httpx


class OpenAICompatibleProvider:
    def translate_text(
        self,
        prompt: str,
        api_base_url: str,
        api_key: str,
        model_name: str,
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
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        with httpx.Client(timeout=120.0) as client:
            response = client.post(endpoint, json=payload, headers=headers)
            response.raise_for_status()

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise ValueError("Provider returned no choices.")

        message = choices[0].get("message", {})
        content = message.get("content")

        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            text_parts = [part.get("text", "") for part in content if isinstance(part, dict)]
            combined_text = "".join(text_parts).strip()
            if combined_text:
                return combined_text

        raise ValueError("Provider returned an unexpected response format.")
