"""AI module (LLM integrations) for Studly backend.

Kept isolated from routers to simplify future scaling:
- swap providers (Gemini/OpenAI/others)
- add caching/rate-limit/observability
- keep request/response schemas stable for API clients
"""

