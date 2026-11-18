from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.auth import operator
from app.core.config import get_settings
from app.db.repository import TicketRepository
from app.db.session import get_db
from app.models.entities import AuditEvent, ReplyDraft, Team, Ticket, TicketProposal
from app.schemas.tickets import (
    ManualEdit,
    Move,
    Review,
    Status,
    Submission,
    TicketSummary,
    Versioned,
)
from app.services.analysis import AnalysisService
from app.services.review import ReviewService
from app.services.sync import SyncService
from app.services.tickets import TicketService

router = APIRouter(prefix="/api/v1")
DB = Annotated[Session, Depends(get_db, scope="function")]
protected = APIRouter(dependencies=[Depends(operator)])


@router.post("/requests", status_code=201)
def submit(
    data: Submission,
    request: Request,
    db: DB,
    idempotency_key: Annotated[str, Header(min_length=8, max_length=100)],
):
    ticket = TicketService(db).submit(
        data, idempotency_key, request.client.host if request.client else "unknown"
    )
    return {"tracking_id": ticket.public_ref, "analysis_state": ticket.analysis_state}


@protected.get("/config")
def config():
    settings = get_settings()
    return {
        "salesforce_mode": settings.salesforce_mode,
        "analysis_mode": "model" if settings.llm_model else "deterministic_demo",
    }


@protected.get("/teams")
def teams(db: DB):
    return [{"id": t.id, "name": t.name} for t in db.scalars(select(Team).order_by(Team.name))]


@protected.get("/tickets")
def tickets(
    db: DB,
    q: str = Query(default="", max_length=180),
    status: Status | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    query = select(Ticket)
    if q:
        escaped = q.replace("%", "\\%").replace("_", "\\_")
        query = query.where(
            or_(
                Ticket.subject.ilike(f"%{escaped}%", escape="\\"),
                Ticket.public_ref.ilike(f"%{escaped}%", escape="\\"),
            )
        )
    if status:
        query = query.where(Ticket.status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = list(
        db.scalars(
            query.order_by(Ticket.status, Ticket.position, Ticket.id).offset(offset).limit(limit)
        )
    )
    pending_proposals = {
        p.ticket_id: p.proposed_priority
        for p in db.scalars(
            select(TicketProposal).where(
                TicketProposal.ticket_id.in_([t.id for t in rows]),
                TicketProposal.state == "PENDING",
            )
        )
    } if rows else {}
    return {
        "items": [
            TicketSummary.model_validate(t).model_dump()
            | {"proposed_priority": pending_proposals.get(t.id)}
            for t in rows
        ],
        "total": total,
    }


def detail(db, ticket):
    result = TicketSummary.model_validate(ticket).model_dump()
    result.update(description=ticket.description, requester_email=ticket.requester_email)
    result["proposals"] = [
        {
            "id": p.id,
            "proposed_priority": p.proposed_priority,
            "proposed_team_id": p.proposed_team_id,
            "proposed_status": p.proposed_status,
            "intent": p.intent,
            "rationale": p.rationale,
            "confidence": p.confidence,
            "state": p.state,
            "base_version": p.base_version,
            "agent_run_id": p.agent_run_id,
        }
        for p in db.scalars(select(TicketProposal).where(TicketProposal.ticket_id == ticket.id))
    ]
    result["drafts"] = [
        {"id": d.id, "body": d.body, "sources": d.sources, "state": d.state}
        for d in db.scalars(
            select(ReplyDraft)
            .where(ReplyDraft.ticket_id == ticket.id)
            .order_by(ReplyDraft.created_at.desc())
        )
    ]
    result["audit"] = [
        {
            "id": a.id,
            "actor_type": a.actor_type,
            "action": a.action,
            "before": a.before,
            "after": a.after,
            "reason": a.reason,
            "run_id": a.run_id,
            "occurred_at": a.occurred_at,
        }
        for a in db.scalars(
            select(AuditEvent)
            .where(AuditEvent.ticket_id == ticket.id)
            .order_by(AuditEvent.occurred_at)
        )
    ]
    return result


@protected.get("/tickets/{ticket_id}")
def ticket_detail(ticket_id: str, db: DB):
    return detail(db, TicketRepository(db).get(ticket_id))


@protected.patch("/tickets/{ticket_id}/position")
def move(ticket_id: str, data: Move, db: DB):
    return detail(db, TicketService(db).move(ticket_id, data))


@protected.patch("/tickets/{ticket_id}")
def edit(ticket_id: str, data: ManualEdit, db: DB):
    return detail(db, TicketService(db).edit(ticket_id, data))


@protected.get("/dashboard/metrics")
def metrics(db: DB):
    counts = dict(db.execute(select(Ticket.status, func.count()).group_by(Ticket.status)).all())
    return {
        "total": sum(counts.values()),
        "review": counts.get("REVIEW", 0),
        "in_progress": counts.get("IN_PROGRESS", 0),
        "resolved": counts.get("RESOLVED", 0),
    }


@protected.post("/tickets/{ticket_id}/analyze", status_code=202)
def analyze(ticket_id: str, data: Versioned, db: DB):
    return detail(db, AnalysisService(db).schedule(ticket_id, data))


@protected.post("/proposals/{proposal_id}/approve")
def approve(proposal_id: str, data: Review, db: DB):
    return detail(db, ReviewService(db).decide(proposal_id, data, True))


@protected.post("/proposals/{proposal_id}/reject")
def reject(proposal_id: str, data: Review, db: DB):
    return detail(db, ReviewService(db).decide(proposal_id, data, False))


@protected.post("/tickets/{ticket_id}/reply-drafts")
def generate_draft(ticket_id: str, data: Versioned, db: DB):
    return detail(db, AnalysisService(db).manual_draft(ticket_id, data))


@protected.post("/reply-drafts/{draft_id}/approve")
def approve_draft(draft_id: str, data: Review, db: DB):
    return detail(db, ReviewService(db).approve_draft(draft_id, data))


class SyncApproval(Versioned):
    approved: bool


@protected.post("/tickets/{ticket_id}/salesforce-sync", status_code=202)
def sync(ticket_id: str, data: SyncApproval, db: DB):
    return detail(
        db, SyncService(db).approve_snapshot(ticket_id, data.expected_version, data.approved)
    )
