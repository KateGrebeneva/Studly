from __future__ import annotations

from typing import Optional

from .utils import strip_code_fences


class OpenAIClient:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    def generate_text(self, prompt: str) -> Optional[str]:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.api_key)
            resp = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=800,
            )
            return strip_code_fences((resp.choices[0].message.content or "").strip())
        except Exception:
            return None

