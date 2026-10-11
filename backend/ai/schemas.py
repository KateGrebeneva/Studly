from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional


class PlanScheduleItem(BaseModel):
    time: str = Field(default="14:00")
    subject: str = Field(default="Общее")
    duration: int = Field(default=25, ge=10, le=240)
    priority: str = Field(default="medium")


class PlanGoalStep(BaseModel):
    step: str
    completed: bool = False


class PlanSessionAction(BaseModel):
    subject: str = Field(default="Общее")
    time: str = Field(default="14:00")
    duration: int = Field(default=25, ge=10, le=240)
    goal: Optional[str] = None


class PlanSuggestion(BaseModel):
    id: str
    type: str = Field(description="schedule | goal | reminder")
    title: str
    description: str
    confidence: int = Field(default=80, ge=0, le=100)
    schedule: List[PlanScheduleItem] = Field(default_factory=list)
    steps: List[PlanGoalStep] = Field(default_factory=list)
    session: Optional[PlanSessionAction] = None


class StudyPlanResponse(BaseModel):
    # None, если данных пока мало — на фронте будет «—»
    bestTime: Optional[str] = None
    bestDay: Optional[str] = None
    avgSessionLength: Optional[int] = Field(default=None, ge=1, le=360)
    focusScore: Optional[int] = Field(default=None, ge=0, le=100)
    recommendations: List[str] = Field(default_factory=list)
    suggestions: List[PlanSuggestion] = Field(default_factory=list)
    provider: str = Field(default="mock")


class GeneratePlanRequest(BaseModel):
    pass


class TestQuestionsResponse(BaseModel):
    questions: List[str] = Field(default_factory=list)
    provider: str = Field(default="mock")

    # то же одним текстом, для старого фронта
    questionsText: Optional[str] = None


class GenerateTestRequest(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None

    # старый формат запроса
    goal: Optional[str] = None
    subject_name: Optional[str] = None

    # можно передать только id сессии
    session_id: Optional[int] = None

