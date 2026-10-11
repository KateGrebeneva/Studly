
from fastapi import APIRouter, Depends

from auth import get_current_user
from config import settings
from database.connection import get_db
from services import stats_service

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
    with get_db() as conn:
        profile = stats_service.productivity_profile(conn.cursor(), current_user["id"])

    svc = _ai_service()
    plan = svc.generate_plan(user_name=current_user.get("name") or "Ученик", profile=profile)
    return plan.model_dump()


@router.post("/generate-test")
async def generate_test(req: GenerateTestRequest, current_user: dict = Depends(get_current_user)):
    subject = req.subject or req.subject_name
    topic = req.topic or req.goal

    # если пришёл только session_id — достаём тему из сессии
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

