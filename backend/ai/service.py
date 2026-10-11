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


DEFAULT_SLOT_HOUR = 16


def _fmt_minutes(m: int) -> str:
    h, r = divmod(int(m), 60)
    return f"{h} ч {r} мин" if h and r else (f"{h} ч" if h else f"{r} мин")


def _ordered_subjects(profile: dict) -> List[dict]:
    """Сначала предметы со срочными задачами, потом те, что давно не открывали."""
    open_tasks = profile.get("open_tasks") or {}
    subjects = list(profile.get("subjects") or [])

    def key(s):
        t = open_tasks.get(s["name"], {})
        return (-t.get("high", 0), s.get("last_studied_at") or "", s.get("total_minutes", 0))

    return sorted(subjects, key=key)


def _data_plan(profile: dict) -> StudyPlanResponse:
    """Запасной план без нейросети, только по данным пользователя."""
    subjects = _ordered_subjects(profile)
    open_tasks = profile.get("open_tasks") or {}
    start_hour = profile.get("best_start_hour") or DEFAULT_SLOT_HOUR
    work = 25
    avg = profile.get("avg_session")
    if avg and avg >= 45:
        work = 50

    recs: List[str] = []
    if profile.get("best_time"):
        recs.append(f"Лучше всего ты занимаешься в {profile['best_time']} — ставь на это время самые сложные темы.")
    if profile.get("best_day"):
        recs.append(f"{profile['best_day']} — твой самый продуктивный день недели.")
    if profile.get("focus_score") is not None and profile["focus_score"] < 70:
        recs.append("Часть запланированных сессий не состоялась — попробуй планировать меньше, но регулярнее.")
    if profile.get("week_minutes", 0) == 0:
        recs.append("За последнюю неделю не было занятий. Начни с одной сессии на 25 минут.")
    elif profile.get("streak", 0) >= 3:
        recs.append(f"Серия {profile['streak']} дн. подряд — отличный ритм, не прерывай его.")
    stale = [s for s in subjects if not s.get("last_studied_at")]
    if stale:
        recs.append(f"«{stale[0]['name']}» ещё ни разу не был в завершённой сессии — самое время начать.")
    if not subjects:
        recs.append("Добавь предметы — тогда план будет учитывать, что именно ты изучаешь.")

    suggestions: List[PlanSuggestion] = []
    if subjects:
        schedule = []
        hour, minute = start_hour, 0
        for idx, subj in enumerate(subjects[:3]):
            high = open_tasks.get(subj["name"], {}).get("high", 0)
            dur = work * (2 if idx == 0 and high else 1)
            schedule.append(PlanScheduleItem(time=f"{hour:02d}:{minute:02d}", subject=subj["name"],
                                             duration=dur, priority="high" if high else "medium"))
            total = hour * 60 + minute + dur + 10
            hour, minute = divmod(total, 60)
            if hour >= 23:
                break
        suggestions.append(PlanSuggestion(
            id="schedule-1", type="schedule", title="План на завтра",
            description="Сессии в твоё продуктивное время; сначала — предметы с важными задачами.",
            confidence=85 if profile.get("completed_sessions", 0) >= 5 else 65,
            schedule=schedule,
        ))
        target = subjects[0]
        t = open_tasks.get(target["name"], {})
        if t.get("open"):
            suggestions.append(PlanSuggestion(
                id="goal-1", type="goal", title=f"Закрыть задачи по предмету «{target['name']}»",
                description=f"Открытых задач: {t['open']}, из них важных: {t.get('high', 0)}.",
                confidence=78,
                steps=[PlanGoalStep(step="Выбрать самую важную задачу"),
                       PlanGoalStep(step=f"Одна сессия {work} мин без отвлечений"),
                       PlanGoalStep(step="Отметить задачу выполненной")],
                session=PlanSessionAction(subject=target["name"], time=f"{start_hour:02d}:00", duration=work,
                                          goal=f"Задачи по предмету {target['name']}"),
            ))
        least = min(subjects, key=lambda s: s.get("total_minutes", 0))
        suggestions.append(PlanSuggestion(
            id="reminder-1", type="reminder", title=f"Вернуться к предмету «{least['name']}»",
            description=f"По нему меньше всего времени: {_fmt_minutes(least.get('total_minutes', 0))}.",
            confidence=70,
            session=PlanSessionAction(subject=least["name"], time=f"{min(start_hour + 2, 21):02d}:00",
                                      duration=25, goal=f"Повторение: {least['name']}"),
        ))

    return StudyPlanResponse(
        bestTime=profile.get("best_time"),
        bestDay=profile.get("best_day"),
        avgSessionLength=profile.get("avg_session"),
        focusScore=profile.get("focus_score"),
        recommendations=recs[:5],
        suggestions=suggestions,
        provider="data",
    )


def _plan_prompt(user_name: str, profile: dict) -> str:
    subjects = profile.get("subjects") or []
    open_tasks = profile.get("open_tasks") or {}
    subj_lines = "\n".join(
        f"- {s['name']}: {_fmt_minutes(s.get('total_minutes', 0))} всего, "
        f"последняя сессия: {(s.get('last_studied_at') or 'не было')[:10]}, "
        f"открытых задач: {open_tasks.get(s['name'], {}).get('open', 0)} "
        f"(важных {open_tasks.get(s['name'], {}).get('high', 0)})"
        for s in subjects
    ) or "- предметов пока нет"
    return f"""Ты – персональный ИИ-коуч по обучению. Отвечай по-русски, коротко и конкретно.
Пользователь: {user_name}
Реальные данные за последние 60 дней:
- лучшее время: {profile.get('best_time') or 'нет данных'}
- лучший день: {profile.get('best_day') or 'нет данных'}
- средняя длина сессии: {profile.get('avg_session') or 'нет данных'} мин
- доля доведённых до конца сессий: {profile.get('focus_score') if profile.get('focus_score') is not None else 'нет данных'}%
- минут за последние 7 дней: {profile.get('week_minutes', 0)}
- серия дней подряд: {profile.get('streak', 0)}
Предметы:
{subj_lines}

Используй ТОЛЬКО предметы из списка выше. Время в расписании ставь в лучшее время пользователя.
Ответь строго JSON (без markdown):
{{
  "recommendations": ["рек1", "рек2", "рек3"],
  "suggestions": [
    {{"id": "schedule-1", "type": "schedule", "title": "Название", "description": "Описание", "confidence": 0-100,
      "schedule": [{{"time":"16:00","subject":"<предмет>","duration":25,"priority":"high"}}]}},
    {{"id": "goal-1", "type": "goal", "title": "Название", "description": "Описание", "confidence": 0-100,
      "steps": [{{"step":"Шаг 1","completed": false}}],
      "session": {{"subject":"<предмет>","time":"16:00","duration":25,"goal":"Первый шаг"}}}},
    {{"id": "reminder-1", "type": "reminder", "title": "Название", "description": "Описание", "confidence": 0-100,
      "session": {{"subject":"<предмет>","time":"18:00","duration":25,"goal":"Повтор"}}}}
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

    def _ask(self, prompt: str):
        """Пробуем основного провайдера, если не вышло — второго."""
        order = [self.provider] + [p for p in ("openai", "gemini") if p != self.provider]
        for name in order:
            client = self._openai if name == "openai" else self._gemini if name == "gemini" else None
            if client is None:
                continue
            text = client.generate_text(prompt)
            if text:
                return text, name
        return None, "data"

    def generate_plan(self, user_name: str, profile: dict) -> StudyPlanResponse:
        # цифры считаем сами, от нейросети нужны только советы
        base = _data_plan(profile)
        if self.provider == "mock":
            return base
        text, provider = self._ask(_plan_prompt(user_name, profile))
        data = safe_json_loads(text or "")
        if not isinstance(data, dict):
            return base
        recs = [str(r) for r in (data.get("recommendations") or []) if str(r).strip()][:5]
        suggestions = _normalize_suggestions(data.get("suggestions"))
        return base.model_copy(update={
            "recommendations": recs or base.recommendations,
            "suggestions": suggestions or base.suggestions,
            "provider": provider,
        })

    def generate_test(self, subject: Optional[str], topic: str) -> TestQuestionsResponse:
        prompt = _test_prompt(subject, topic)

        text, provider = self._ask(prompt)
        if provider == "data":
            provider = "mock"

        data = safe_json_loads(text or "")
        questions = normalize_questions((data or {}).get("questions") if isinstance(data, dict) else None)

        # бывает, что ответ пришёл не в json
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

