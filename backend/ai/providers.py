from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ProviderConfig:
    gemini_api_key: Optional[str]
    openai_api_key: Optional[str]
    prefer: str = "openai"  # "gemini" | "openai"


def pick_provider(cfg: ProviderConfig) -> str:
    """Choose provider deterministically for stability."""
    prefer = (cfg.prefer or "gemini").lower()
    if prefer == "openai" and cfg.openai_api_key:
        return "openai"
    if cfg.gemini_api_key:
        return "gemini"
    if cfg.openai_api_key:
        return "openai"
    return "mock"

