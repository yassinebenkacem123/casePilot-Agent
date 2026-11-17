import re
from typing import Literal

from pydantic import Field

from app.schemas.tickets import Priority, StrictModel


class Classification(StrictModel):
    intent: Literal["outage", "billing", "account", "general"]
    rationale: str = Field(min_length=3, max_length=1000)
    confidence: float = Field(ge=0, le=1)


def tokens(text):
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def classify(text: str) -> Classification:
    words = tokens(text)
    if words & {"outage", "unavailable", "down", "panne"}:
        return Classification(
            intent="outage",
            rationale="Availability incident terms found in the request; impact needs operator validation.",
            confidence=0.9,
        )
    if words & {"billing", "invoice", "payment", "refund", "charged", "facture"}:
        return Classification(
            intent="billing",
            rationale="Billing or payment terms found in the request.",
            confidence=0.86,
        )
    if words & {"account", "password", "login", "access"}:
        return Classification(
            intent="account", rationale="Account access terms found in the request.", confidence=0.8
        )
    return Classification(
        intent="general",
        rationale="No incident or billing indicator; route to customer care for review.",
        confidence=0.65,
    )


def severity(text: str) -> Priority:
    """Demo policy, not an SLA. Model severity is never authoritative."""
    words = tokens(text)
    incident = bool(words & {"outage", "unavailable", "down", "panne"})
    broad = bool(words & {"all", "everyone", "production", "company"})
    if incident and broad:
        return Priority.CRITICAL
    if incident:
        return Priority.HIGH
    if words & {"billing", "invoice", "payment", "charged", "facture"}:
        return Priority.MEDIUM
    return Priority.LOW


def routing(intent: str):
    return {
        "outage": "technical",
        "account": "technical",
        "billing": "billing",
        "general": "general",
    }[intent]
