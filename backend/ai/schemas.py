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
    bestTime: str = Field(default="14:00-16:00")
    bestDay: str = Field(default="Четверг")
    avgSessionLength: int = Field(default=35, ge=1, le=360)
    focusScore: int = Field(default=70, ge=0, le=100)
    recommendations: List[str] = Field(default_factory=list)
    suggestions: List[PlanSuggestion] = Field(default_factory=list)
    provider: str = Field(default="mock")


class GeneratePlanRequest(BaseModel):
    """Reserved for future inputs (goal, constraints, etc.)."""
    pass


class TestQuestionsResponse(BaseModel):
    # Canonical structured output:
    questions: List[str] = Field(default_factory=list)
    provider: str = Field(default="mock")

    # Backward-compat for existing frontend that renders a single text blob:
    questionsText: Optional[str] = None


class GenerateTestRequest(BaseModel):
    # New API shape (as requested):
    subject: Optional[str] = None
    topic: Optional[str] = None

    # Backward-compat with earlier frontend payloads:
    goal: Optional[str] = None
    subject_name: Optional[str] = None

    # Optional: fully automatic resolution from DB
    session_id: Optional[int] = None

