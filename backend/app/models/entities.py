from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def uid():
    return str(uuid4())


def now():
    return datetime.now(UTC)


class Team(Base):
    __tablename__ = "teams"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    categories: Mapped[list] = mapped_column(JSON, default=list)


class Board(Base):
    """Single organization lock, serializes mutations of card ordering."""

    __tablename__ = "boards"
    id: Mapped[int] = mapped_column(primary_key=True)
    revision: Mapped[int] = mapped_column(default=0)


class Ticket(Base):
    __tablename__ = "tickets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    public_ref: Mapped[str] = mapped_column(String(30), unique=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    requester_name: Mapped[str] = mapped_column(String(100))
    requester_email: Mapped[str] = mapped_column(String(254))
    subject: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="REVIEW", index=True)
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    priority_rank: Mapped[int] = mapped_column(Integer, default=2)
    position: Mapped[int] = mapped_column(Integer, default=0)
    intent: Mapped[str | None] = mapped_column(String(40))
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"))
    analysis_state: Mapped[str] = mapped_column(String(30), default="PENDING_ANALYSIS")
    ai_confidence: Mapped[float | None] = mapped_column(Float)
    approval_state: Mapped[str] = mapped_column(String(30), default="PENDING")
    human_locked_fields: Mapped[list] = mapped_column(JSON, default=list)
    version: Mapped[int] = mapped_column(Integer, default=1)
    salesforce_case_id: Mapped[str | None] = mapped_column(String(40))
    sync_status: Mapped[str] = mapped_column(String(30), default="NOT_SYNCED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.id"), index=True)
    actor_type: Mapped[str] = mapped_column(String(20))
    actor_id: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(100))
    before: Mapped[dict] = mapped_column(JSON, default=dict)
    after: Mapped[dict] = mapped_column(JSON, default=dict)
    reason: Mapped[str] = mapped_column(Text, default="")
    run_id: Mapped[str | None] = mapped_column(String(36))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class TicketProposal(Base):
    __tablename__ = "ticket_proposals"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.id"), index=True)
    proposed_priority: Mapped[str | None] = mapped_column(String(20))
    proposed_team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"))
    proposed_status: Mapped[str | None] = mapped_column(String(30))
    rationale: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float)
    intent: Mapped[str] = mapped_column(String(40))
    state: Mapped[str] = mapped_column(String(30), default="PENDING")
    agent_run_id: Mapped[str] = mapped_column(String(36), unique=True)
    base_version: Mapped[int] = mapped_column(Integer)
    reviewed_by: Mapped[str | None] = mapped_column(String(100))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ReplyDraft(Base):
    __tablename__ = "reply_drafts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    sources: Mapped[list] = mapped_column(JSON, default=list)
    state: Mapped[str] = mapped_column(String(30), default="DRAFT")
    agent_run_id: Mapped[str] = mapped_column(String(36), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    source: Mapped[str] = mapped_column(String(300))
    content: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(default=1)


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("knowledge_documents.id"))
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list] = mapped_column(JSON)
    version: Mapped[int] = mapped_column(default=1)


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.id"), index=True)
    state: Mapped[str] = mapped_column(String(30), default="PENDING")
    attempts: Mapped[int] = mapped_column(default=0)
    last_error: Mapped[str | None] = mapped_column(String(100))
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SyncOutbox(Base):
    __tablename__ = "sync_outbox"
    __table_args__ = (UniqueConstraint("ticket_id", "approved_version"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.id"))
    event_type: Mapped[str] = mapped_column(String(40), default="UPSERT_CASE")
    approved_version: Mapped[int] = mapped_column(Integer)
    payload: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    attempts: Mapped[int] = mapped_column(default=0)
    last_error: Mapped[str | None] = mapped_column(String(100))
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RateBucket(Base):
    __tablename__ = "rate_buckets"
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    count: Mapped[int] = mapped_column(default=0)
