from __future__ import annotations

from typing import List, Optional, Tuple

from .providers import ProviderConfig, pick_provider
from .schemas import (
    StudyPlanResponse,
    TestQuestionsResponse,
    PlanSuggestion,
    PlanScheduleItem,
    PlanGoalStep,
    PlanSessionAction,
)
from .utils import normalize_questions, questions_to_text, safe_json_loads
from .gemini_client import GeminiClient
from .openai_client import OpenAIClient


def _mock_plan(avg_score: int, avg_dur: int) -> StudyPlanResponse:
    return StudyPlanResponse(
        bestTime="14:00-16:00",
        bestDay="Четверг",
        avgSessionLength=int(avg_dur) if avg_dur else 35,
        focusScore=min(95, int(avg_score) + 10),
        recommendations=[
            "Ты наиболее продуктивен днём. Планируй сложные задачи на 14:00-16:00",
            "Средняя сессия ~35 минут — подходит для Pomodoro",
            "Четверг — твой лучший день. Используй его для важных тем",
        ],
        suggestions=[
            PlanSuggestion(
                id="schedule-1",
                type="schedule",
                title="Оптимальное расписание на завтра",
                description="Сессии подобраны по твоему профилю концентрации.",
                confidence=90,
                schedule=[
                    PlanScheduleItem(time="09:00", subject="Математика", duration=25, priority="high"),
                    PlanScheduleItem(time="14:00", subject="Физика", duration=50, priority="high"),
                    PlanScheduleItem(time="17:00", subject="История", duration=25, priority="medium"),
                ],
            ),
            PlanSuggestion(
                id="reminder-1",
                type="reminder",
                title="Умное напоминание",
                description="Добавить одну поддерживающую сессию в слабую зону.",
                confidence=84,
                session=PlanSessionAction(subject="Общее", time="14:00", duration=25, goal="Повтор ключевых тем"),
            ),
            PlanSuggestion(
                id="goal-1",
                type="goal",
                title="Разбивка большой цели",
                description="Раздели подготовку на 3 коротких шага и начни с первого.",
                confidence=86,
                steps=[
                    PlanGoalStep(step="Повторить теорию (40 мин)"),
                    PlanGoalStep(step="Решить практику (40 мин)"),
                    PlanGoalStep(step="Мини-тест (20 мин)"),
                ],
                session=PlanSessionAction(subject="Общее", time="16:00", duration=40, goal="Шаг 1: повтор теории"),
            ),
        ],
        provider="mock",
    )


def _plan_prompt(user_name: str, subjects: List[str], avg_dur: int, avg_score: int) -> str:
    subjects_str = ", ".join(subjects) if subjects else "пока нет предметов"
    return f"""Ты – персональный ИИ-коуч по обучению.
Пользователь: {user_name}
Предметы: {subjects_str}
Средняя сессия: {avg_dur} минут
Продуктивность: {avg_score}/100

Ответь строго JSON (без markdown):
{{
  "bestTime": "ЧЧ:ММ-ЧЧ:ММ",
  "bestDay": "День недели",
  "avgSessionLength": число,
  "focusScore": 0-100,
  "recommendations": ["рек1", "рек2", "рек3"],
  "suggestions": [
    {{
      "id": "schedule-1",
      "type": "schedule",
      "title": "Название",
      "description": "Описание",
      "confidence": 0-100,
      "schedule": [{{"time":"14:00","subject":"Математика","duration":25,"priority":"high"}}]
    }},
    {{
      "id": "goal-1",
      "type": "goal",
      "title": "Название",
      "description": "Описание",
      "confidence": 0-100,
      "steps": [{{"step":"Шаг 1","completed": false}}],
      "session": {{"subject":"История","time":"16:00","duration":30,"goal":"Первый шаг"}}
    }},
    {{
      "id": "reminder-1",
      "type": "reminder",
      "title": "Название",
      "description": "Описание",
      "confidence": 0-100,
      "session": {{"subject":"Физика","time":"14:00","duration":25,"goal":"Повтор"}}
    }}
  ]
}}"""


def _normalize_suggestions(raw_suggestions) -> List[PlanSuggestion]:
    if not isinstance(raw_suggestions, list):
        return []
    normalized: List[PlanSuggestion] = []
    for idx, s in enumerate(raw_suggestions):
        if not isinstance(s, dict):
            continue
        s_type = str(s.get("type") or "").lower()
        if s_type not in {"schedule", "goal", "reminder"}:
            continue
        schedule = []
        for item in (s.get("schedule") or []):
            if not isinstance(item, dict):
                continue
            schedule.append(
                PlanScheduleItem(
                    time=str(item.get("time") or "14:00"),
                    subject=str(item.get("subject") or "Общее"),
                    duration=int(item.get("duration") or 25),
                    priority=str(item.get("priority") or "medium"),
                )
            )
        steps = []
        for step in (s.get("steps") or []):
            if isinstance(step, dict) and step.get("step"):
                steps.append(PlanGoalStep(step=str(step["step"]), completed=bool(step.get("completed", False))))
            elif isinstance(step, str):
                steps.append(PlanGoalStep(step=step, completed=False))
        session = None
        sess_raw = s.get("session")
        if isinstance(sess_raw, dict):
            session = PlanSessionAction(
                subject=str(sess_raw.get("subject") or "Общее"),
                time=str(sess_raw.get("time") or "14:00"),
                duration=int(sess_raw.get("duration") or 25),
                goal=(str(sess_raw["goal"]) if sess_raw.get("goal") else None),
            )
        normalized.append(
            PlanSuggestion(
                id=str(s.get("id") or f"{s_type}-{idx+1}"),
                type=s_type,
                title=str(s.get("title") or "Предложение"),
                description=str(s.get("description") or ""),
                confidence=int(s.get("confidence") or 80),
                schedule=schedule,
                steps=steps,
                session=session,
            )
        )
    return normalized[:6]


def _test_prompt(subject: Optional[str], topic: str) -> str:
    subj = f" по предмету {subject}" if subject else ""
    return f"""Сгенерируй 4–6 коротких вопросов или заданий для закрепления материала{subj}.
Тема: {topic}

Ответь строго JSON (без markdown):
{{
  "questions": [
    "вопрос 1",
    "вопрос 2"
  ]
}}"""


class AIService:
    def __init__(self, cfg: ProviderConfig):
        self.cfg = cfg
        self.provider = pick_provider(cfg)

        self._gemini = GeminiClient(cfg.gemini_api_key) if cfg.gemini_api_key else None
        self._openai = OpenAIClient(cfg.openai_api_key) if cfg.openai_api_key else None

    def generate_plan(
        self,
        user_name: str,
        subjects: List[str],
        avg_session_minutes: int,
        avg_focus_score: int,
    ) -> StudyPlanResponse:
        prompt = _plan_prompt(user_name, subjects, avg_session_minutes, avg_focus_score)

        if self.provider == "gemini" and self._gemini:
            text = self._gemini.generate_text(prompt)
            data = safe_json_loads(text or "")
            if isinstance(data, dict):
                return StudyPlanResponse(
                    bestTime=str(data.get("bestTime", "14:00-16:00")),
                    bestDay=str(data.get("bestDay", "Четверг")),
                    avgSessionLength=int(data.get("avgSessionLength", avg_session_minutes or 35)),
                    focusScore=int(data.get("focusScore", min(95, avg_focus_score + 10))),
                    recommendations=list(data.get("recommendations", []))[:5],
                    suggestions=_normalize_suggestions(data.get("suggestions")),
                    provider="gemini",
                )

        if self.provider == "openai" and self._openai:
            text = self._openai.generate_text(prompt)
            data = safe_json_loads(text or "")
            if isinstance(data, dict):
                return StudyPlanResponse(
                    bestTime=str(data.get("bestTime", "14:00-16:00")),
                    bestDay=str(data.get("bestDay", "Четверг")),
                    avgSessionLength=int(data.get("avgSessionLength", avg_session_minutes or 35)),
                    focusScore=int(data.get("focusScore", min(95, avg_focus_score + 10))),
                    recommendations=list(data.get("recommendations", []))[:5],
                    suggestions=_normalize_suggestions(data.get("suggestions")),
                    provider="openai",
                )

        # Fallback: if preferred provider failed, try the other one if available
        if self.provider != "gemini" and self._gemini:
            text = self._gemini.generate_text(prompt)
            data = safe_json_loads(text or "")
            if isinstance(data, dict):
                return StudyPlanResponse(
                    bestTime=str(data.get("bestTime", "14:00-16:00")),
                    bestDay=str(data.get("bestDay", "Четверг")),
                    avgSessionLength=int(data.get("avgSessionLength", avg_session_minutes or 35)),
                    focusScore=int(data.get("focusScore", min(95, avg_focus_score + 10))),
                    recommendations=list(data.get("recommendations", []))[:5],
                    suggestions=_normalize_suggestions(data.get("suggestions")),
                    provider="gemini",
                )

        if self.provider != "openai" and self._openai:
            text = self._openai.generate_text(prompt)
            data = safe_json_loads(text or "")
            if isinstance(data, dict):
                return StudyPlanResponse(
                    bestTime=str(data.get("bestTime", "14:00-16:00")),
                    bestDay=str(data.get("bestDay", "Четверг")),
                    avgSessionLength=int(data.get("avgSessionLength", avg_session_minutes or 35)),
                    focusScore=int(data.get("focusScore", min(95, avg_focus_score + 10))),
                    recommendations=list(data.get("recommendations", []))[:5],
                    suggestions=_normalize_suggestions(data.get("suggestions")),
                    provider="openai",
                )

        return _mock_plan(avg_focus_score, avg_session_minutes)

    def generate_test(self, subject: Optional[str], topic: str) -> TestQuestionsResponse:
        prompt = _test_prompt(subject, topic)

        text = None
        provider = "mock"

        if self.provider == "gemini" and self._gemini:
            text = self._gemini.generate_text(prompt)
            provider = "gemini"
        elif self.provider == "openai" and self._openai:
            text = self._openai.generate_text(prompt)
            provider = "openai"

        data = safe_json_loads(text or "")
        questions = normalize_questions((data or {}).get("questions") if isinstance(data, dict) else None)

        # Fallback: allow non-JSON answers too
        if not questions and text:
            questions = normalize_questions(text)

        if not questions:
            questions = [
                "Что является основным понятием в этой теме?",
                "Какие основные принципы ты запомнил?",
                "Приведи пример применения материала на практике.",
                "В чём главная идея изученного?",
                "Как бы ты объяснил это другому ученику?",
            ]
            provider = "mock"

        return TestQuestionsResponse(
            questions=questions[:6],
            questionsText=questions_to_text(questions[:6]),
            provider=provider,
        )

