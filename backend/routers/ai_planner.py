"""
AI module API.

Роутер максимально тонкий: вся логика провайдеров/парсинга вынесена в `backend/ai/`.
Это снижает риск поломок и упрощает масштабирование.
"""

from fastapi import APIRouter, Depends

from auth import get_current_user
from config import settings
from database.connection import get_db

from ai.providers import ProviderConfig
from ai.schemas import GeneratePlanRequest, GenerateTestRequest
from ai.service import AIService

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _ai_service() -> AIService:
    cfg = ProviderConfig(
        gemini_api_key=settings.GEMINI_API_KEY,
        openai_api_key=settings.OPENAI_API_KEY,
        prefer="openai",
    )
    return AIService(cfg)


@router.post("/generate-plan")
async def generate_plan(req: GeneratePlanRequest, current_user: dict = Depends(get_current_user)):
    """
    📊 Планнер обучения (AI Planner)

    Генерирует персональный план обучения на основе:
    - предметов пользователя
    - средней длительности завершённых сессий
    - уровня продуктивности (activity_zones)

    Возвращает:
    {
      "bestTime": "14:00-16:00",
      "bestDay": "Четверг",
      "avgSessionLength": 45,
      "focusScore": 82,
      "recommendations": ["...", "..."]
    }
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM subjects WHERE user_id = %s", (current_user["id"],))
        subjects = [r["name"] for r in cursor.fetchall()]

        cursor.execute(
            "SELECT AVG(duration_minutes) as avg_dur FROM study_sessions WHERE user_id = %s AND status = 'completed'",
            (current_user["id"],),
        )
        avg_dur = int(cursor.fetchone()["avg_dur"] or 35)

        cursor.execute(
            "SELECT AVG(score) as avg_score FROM activity_zones WHERE user_id = %s AND date = CURDATE()",
            (current_user["id"],),
        )
        avg_score = int(cursor.fetchone()["avg_score"] or 70)

    svc = _ai_service()
    plan = svc.generate_plan(
        user_name=current_user.get("name") or "Ученик",
        subjects=subjects,
        avg_session_minutes=avg_dur,
        avg_focus_score=avg_score,
    )
    return plan.model_dump()


@router.post("/generate-test")
async def generate_test(req: GenerateTestRequest, current_user: dict = Depends(get_current_user)):
    """
    🧠 Карточки и тесты (AI Test Generator)

    Новый вход (пример):
    { "subject": "Математика", "topic": "Интегралы" }

    Совместимость со старым фронтом:
    { "goal": "...", "subject_name": "..." }

    Выход:
    {
      "questions": ["...","..."],
      "questionsText": "1. ...\\n2. ...",
      "provider": "gemini|openai|mock"
    }
    """
    subject = req.subject or req.subject_name
    topic = req.topic or req.goal

    # Auto-fill from session if requested/available.
    # This makes the API usable even if frontend sends only session_id.
    if req.session_id and (not subject or not topic):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT ss.goal, s.name as subject_name
                FROM study_sessions ss
                LEFT JOIN subjects s ON s.id = ss.subject_id
                WHERE ss.id = %s AND ss.user_id = %s
                """,
                (req.session_id, current_user["id"]),
            )
            row = cursor.fetchone()
            if row:
                topic = topic or row.get("goal")
                subject = subject or row.get("subject_name")

    topic = topic or "изученный материал"

    svc = _ai_service()
    res = svc.generate_test(subject=subject, topic=topic)
    return res.model_dump()

