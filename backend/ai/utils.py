from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional


def strip_code_fences(text: str) -> str:
    t = (text or "").strip()
    if t.startswith("```"):
        t = re.sub(r"^```\w*\n?", "", t)
        t = re.sub(r"\n?```$", "", t)
    return t.strip()


def safe_json_loads(text: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(strip_code_fences(text))
    except Exception:
        return None


def normalize_questions(text_or_list: Any) -> List[str]:
    """Accepts either list[str] or numbered text; returns clean list[str]."""
    if isinstance(text_or_list, list):
        out: List[str] = []
        for x in text_or_list:
            if isinstance(x, str) and x.strip():
                out.append(x.strip())
        return out

    if not isinstance(text_or_list, str):
        return []

    text = text_or_list.strip()
    if not text:
        return []

    # Split by lines, remove numbering like "1.", "1)", "-" etc.
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    cleaned: List[str] = []
    for ln in lines:
        ln = re.sub(r"^(\d+[\.\)]\s*|-+\s*)", "", ln).strip()
        if ln:
            cleaned.append(ln)
    return cleaned


def questions_to_text(questions: List[str]) -> str:
    if not questions:
        return ""
    return "\n".join([f"{i+1}. {q}" for i, q in enumerate(questions)])

