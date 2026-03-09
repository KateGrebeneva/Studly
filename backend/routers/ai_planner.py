"""
AI Планировщик - поддерживает OpenAI и Google Gemini.
Приоритет: OPENAI_API_KEY > GEMINI_API_KEY. Без ключей — моковые данные.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database.connection import get_db
from auth import get_current_user
import os
import json
import re

router = APIRouter(prefix="/api/ai", tags=["ai"])

class GeneratePlanRequest(BaseModel):
    pass

class GenerateTestRequest(BaseModel):
    goal: str
    subject_name: str | None = None

def _get_mock_plan(avg_score: int, subj_count: int, sessions_count: int):
    return {
        "bestTime": "14:00-16:00",
        "bestDay": "Четверг",
        "avgSessionLength": 35,
        "focusScore": min(95, avg_score + 10),
        "recommendations": [
            "Ты наиболее продуктивен днём. Планируй сложные задачи на 14:00-16:00",
            "Средняя сессия ~35 минут — подходит для Pomodoro",
            "Четверг — твой лучший день. Используй его для важных тем"
        ]
    }

def _call_openai(prompt: str) -> dict | None:
    """Вызов OpenAI API. Ключ берётся из OPENAI_API_KEY в .env."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        text = response.choices[0].message.content or ""
        if text.startswith("```"):
            text = re.sub(r"^```\w*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        return json.loads(text)
    except Exception:
        return None

def _call_gemini(prompt: str) -> dict | None:
    """Вызов Gemini API."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = (response.text or "").strip()
        if text.startswith("```"):
            text = re.sub(r"^```\w*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        return json.loads(text)
    except Exception:
        return None

@router.post("/generate-plan")
async def generate_plan(req: GeneratePlanRequest, current_user: dict = Depends(get_current_user)):
    """Генерирует AI-план. Использует OpenAI или Gemini, если заданы ключи в .env."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM subjects WHERE user_id = %s", (current_user["id"],))
        subjects = [r["name"] for r in cursor.fetchall()]
        cursor.execute("SELECT AVG(duration_minutes) as avg_dur FROM study_sessions WHERE user_id = %s AND status = 'completed'", (current_user["id"],))
        avg_dur = cursor.fetchone()["avg_dur"] or 35
        cursor.execute("SELECT AVG(score) as avg_score FROM activity_zones WHERE user_id = %s AND date = CURDATE()", (current_user["id"],))
        avg_score = int(cursor.fetchone()["avg_score"] or 70)
        cursor.execute("SELECT COUNT(*) as cnt FROM subjects WHERE user_id = %s", (current_user["id"],))
        subj_count = cursor.fetchone()["cnt"]
        cursor.execute("SELECT COUNT(*) as cnt FROM study_sessions WHERE user_id = %s AND status = 'completed'", (current_user["id"],))
        sessions_count = cursor.fetchone()["cnt"]

    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    # Пробуем OpenAI
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            subjects_str = ", ".join(subjects) if subjects else "пока нет"
            prompt = f"""Пользователь {current_user.get('name', 'Ученик')} изучает предметы: {subjects_str}.
Средняя длительность сессии: {int(avg_dur)} минут. Оценка продуктивности: {avg_score}/100.
Дай персональные рекомендации по планированию учёбы. Ответь СТРОГО в JSON:
{{"bestTime": "ЧЧ:ММ-ЧЧ:ММ", "bestDay": "День недели", "avgSessionLength": число, "focusScore": 0-100, "recommendations": ["рекомендация1", "рекомендация2", "рекомендация3"]}}
Только JSON, без markdown."""
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
            )
            text = (response.choices[0].message.content or "").strip()
            if text.startswith("```"):
                text = re.sub(r"^```\w*\n?", "", text)
                text = re.sub(r"\n?```$", "", text)
            data = json.loads(text)
            return {
                "bestTime": data.get("bestTime", "14:00-16:00"),
                "bestDay": data.get("bestDay", "Четверг"),
                "avgSessionLength": data.get("avgSessionLength", int(avg_dur)),
                "focusScore": data.get("focusScore", min(95, avg_score + 10)),
                "recommendations": data.get("recommendations", [])[:5],
            }
        except Exception:
            pass

    if not gemini_key:
        return _get_mock_plan(avg_score, subj_count, sessions_count)

    api_key = gemini_key
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        subjects_str = ", ".join(subjects) if subjects else "пока нет"
        prompt = f"""Пользователь {current_user.get('name', 'Ученик')} изучает предметы: {subjects_str}.
Средняя длительность сессии: {int(avg_dur)} минут. Оценка продуктивности: {avg_score}/100.
Дай персональные рекомендации по планированию учёбы. Ответь СТРОГО в JSON:
{{"bestTime": "ЧЧ:ММ-ЧЧ:ММ", "bestDay": "День недели", "avgSessionLength": число, "focusScore": 0-100, "recommendations": ["рекомендация1", "рекомендация2", "рекомендация3"]}}
Только JSON, без markdown."""
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```\w*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        data = json.loads(text)
        return {
            "bestTime": data.get("bestTime", "14:00-16:00"),
            "bestDay": data.get("bestDay", "Четверг"),
            "avgSessionLength": data.get("avgSessionLength", int(avg_dur)),
            "focusScore": data.get("focusScore", min(95, avg_score + 10)),
            "recommendations": data.get("recommendations", [])[:5]
        }
    except Exception as e:
        return _get_mock_plan(avg_score, subj_count, sessions_count)

def _generate_test_openai(goal: str, subject_name: str | None) -> str | None:
    """Генерация теста через OpenAI. Без ключа — None."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        subj = f" по предмету {subject_name}" if subject_name else ""
        prompt = f"""Сгенерируй 3-5 коротких вопросов или заданий для закрепления материала{subj}. Тема: {goal}.
Формат: нумерованный список. Каждый вопрос — одна строка. Без лишних слов, только вопросы."""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
        )
        return (response.choices[0].message.content or "").strip()
    except Exception:
        return None

def _generate_test_gemini(goal: str, subject_name: str | None) -> str | None:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        subj = f" по предмету {subject_name}" if subject_name else ""
        prompt = f"""Сгенерируй 3-5 коротких вопросов для закрепления материала{subj}. Тема: {goal}.
Формат: нумерованный список. Каждый вопрос — одна строка."""
        response = model.generate_content(prompt)
        return (response.text or "").strip()
    except Exception:
        return None

def _mock_test(goal: str) -> str:
    return f"""Вот вопросы для закрепления по теме "{goal}":

1. Что является основным понятием в этой теме?
2. Какие основные принципы ты запомнил?
3. Приведи пример применения материала на практике.
4. В чём главная идея изученного?
5. Как бы ты объяснил это другому ученику?"""

@router.post("/generate-test")
async def generate_test(req: GenerateTestRequest, current_user: dict = Depends(get_current_user)):
    """Генерирует тестовые вопросы для закрепления. Использует OpenAI или Gemini."""
    text = _generate_test_openai(req.goal, req.subject_name)
    if not text:
        text = _generate_test_gemini(req.goal, req.subject_name)
    if not text:
        text = _mock_test(req.goal)
    return {"questions": text}
