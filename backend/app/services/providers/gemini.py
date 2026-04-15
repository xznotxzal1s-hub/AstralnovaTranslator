import httpx


class GeminiProvider:
    def translate_text(
        self,
        prompt: str,
        api_base_url: str,
        api_key: str,
        model_name: str,
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
        params = {"key": api_key}

        with httpx.Client(timeout=120.0) as client:
            response = client.post(endpoint, json=payload, params=params)
            response.raise_for_status()

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError("Provider returned no candidates.")

        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
        if text:
            return text

        raise ValueError("Provider returned an unexpected response format.")
