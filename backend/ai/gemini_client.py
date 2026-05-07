from __future__ import annotations

from typing import Optional

from .utils import strip_code_fences


class GeminiClient:
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model_name = model

    def generate_text(self, prompt: str) -> Optional[str]:
        try:
            import google.generativeai as genai

            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel(self.model_name)
            resp = model.generate_content(prompt)
            return strip_code_fences((resp.text or "").strip())
        except Exception:
            return None

