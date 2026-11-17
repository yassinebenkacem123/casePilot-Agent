from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Status(StrEnum):
    REVIEW = "REVIEW"
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class Priority(StrEnum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


PRIORITY_RANK = {p.value: i for i, p in enumerate(Priority)}
LockField = Literal["priority", "team_id", "status", "intent"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Submission(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr = Field(max_length=254)
    subject: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=10, max_length=10000)
    website: str = Field(default="", max_length=200)  # honeypot


class Versioned(StrictModel):
    expected_version: int = Field(ge=1)


class Move(Versioned):
    status: Status
    position: int = Field(ge=0, le=100000)
    confirmed: bool = False


class ManualEdit(Versioned):
    priority: Priority | None = None
    team_id: str | None = Field(default=None, max_length=40)
    human_locked_fields: list[LockField] | None = None
    reason: str = Field(default="Operator override", min_length=3, max_length=1000)


class Review(Versioned):
    reason: str = Field(default="Operator review", min_length=3, max_length=1000)


class TicketSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    public_ref: str
    requester_name: str
    subject: str
    status: Status
    priority: Priority
    priority_rank: int
    position: int
    intent: str | None
    team_id: str | None
    analysis_state: str
    ai_confidence: float | None
    approval_state: str
    human_locked_fields: list[str]
    version: int
    salesforce_case_id: str | None
    sync_status: str
    created_at: object
    updated_at: object
