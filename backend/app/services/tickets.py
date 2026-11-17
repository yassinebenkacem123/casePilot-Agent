import hashlib
import json
import time
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.repository import TicketRepository
from app.models.entities import AnalysisJob, AuditEvent, RateBucket, Team, Ticket, now
from app.schemas.tickets import PRIORITY_RANK, ManualEdit, Move, Submission


def audit(db, ticket_id, action, before=None, after=None, reason="", actor="human", run_id=None):
    db.add(
        AuditEvent(
            ticket_id=ticket_id,
            actor_type=actor,
            actor_id="operator" if actor == "human" else actor,
            action=action,
            before=before or {},
            after=after or {},
            reason=reason,
            run_id=run_id,
        )
    )


def check_version(ticket, expected):
    if ticket.version != expected:
        raise HTTPException(409, {"code": "CONFLICT", "current_version": ticket.version})


def bump(ticket):
    ticket.version += 1
    ticket.updated_at = now()


class TicketService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TicketRepository(db)

    def submit(self, data: Submission, key: str, client: str):
        if data.website:
            raise HTTPException(422, "Submission rejected")
        digest = hashlib.sha256(
            json.dumps(data.model_dump(mode="json"), sort_keys=True).encode()
        ).hexdigest()
        self.repo.lock_board()
        existing = self.db.scalar(select(Ticket).where(Ticket.idempotency_key == key))
        if existing:
            if existing.request_hash != digest:
                raise HTTPException(409, "Idempotency key reused with different content")
            return existing
        bucket_key = hashlib.sha256(client.encode()).hexdigest() + f":{int(time.time()) // 60}"
        bucket = self.db.get(RateBucket, bucket_key)
        if bucket and bucket.count >= 10:
            raise HTTPException(429, "Too many requests; retry after one minute")
        if bucket:
            bucket.count += 1
        else:
            self.db.add(RateBucket(key=bucket_key, count=1))
        ticket = Ticket(
            id=str(uuid4()),
            public_ref=f"CP-{uuid4().hex[:12].upper()}",
            idempotency_key=key,
            request_hash=digest,
            requester_name=data.name,
            requester_email=str(data.email),
            subject=data.subject,
            description=data.description,
            position=len(self.repo.column("REVIEW")),
        )
        self.db.add(ticket)
        self.db.flush()
        self.db.add(AnalysisJob(ticket_id=ticket.id))
        audit(
            self.db,
            ticket.id,
            "request.submitted",
            after={"analysis_state": "PENDING_ANALYSIS"},
            actor="customer",
        )
        self.db.flush()
        return ticket

    def move(self, ticket_id: str, data: Move):
        from app.services.review import supersede_proposals

        self.repo.lock_board()
        ticket = self.repo.get(ticket_id)
        check_version(ticket, data.expected_version)
        if (
            ticket.status != data.status
            and "RESOLVED" in (ticket.status, data.status)
            and not data.confirmed
        ):
            raise HTTPException(422, "Explicit confirmation required to resolve or reopen")
        before = {"status": ticket.status, "position": ticket.position}
        old_status = ticket.status
        source = [t for t in self.repo.column(old_status) if t.id != ticket.id]
        target = source if old_status == data.status else self.repo.column(data.status)
        target.insert(min(data.position, len(target)), ticket)
        ticket.status = data.status.value
        ticket.human_locked_fields = sorted(set(ticket.human_locked_fields + ["status"]))
        for group in [source, target] if old_status != data.status else [target]:
            for index, row in enumerate(group):
                if row.position != index and row.id != ticket.id:
                    row.position = index
                    bump(row)
                row.position = index
        bump(ticket)
        # Routing/status edits invalidate previously approved Salesforce snapshots.
        ticket.approval_state = "PENDING"
        ticket.sync_status = "NOT_SYNCED"
        supersede_proposals(self.db, ticket_id)
        audit(
            self.db,
            ticket.id,
            "ticket.moved",
            before,
            {"status": ticket.status, "position": ticket.position},
            "Operator moved card",
        )
        self.db.flush()
        return ticket

    def edit(self, ticket_id: str, data: ManualEdit):
        from app.services.review import supersede_proposals

        self.repo.lock_board()
        ticket = self.repo.get(ticket_id)
        check_version(ticket, data.expected_version)
        before = {
            "priority": ticket.priority,
            "team_id": ticket.team_id,
            "human_locked_fields": ticket.human_locked_fields,
        }
        locks = set(
            data.human_locked_fields
            if data.human_locked_fields is not None
            else ticket.human_locked_fields
        )
        if data.priority:
            ticket.priority = data.priority.value
            ticket.priority_rank = PRIORITY_RANK[ticket.priority]
            locks.add("priority")
        if "team_id" in data.model_fields_set:
            if data.team_id and not self.db.get(Team, data.team_id):
                raise HTTPException(422, "Unknown team")
            ticket.team_id = data.team_id
            locks.add("team_id")
        ticket.human_locked_fields = sorted(locks)
        ticket.approval_state = "PENDING"
        ticket.sync_status = "NOT_SYNCED"
        supersede_proposals(self.db, ticket_id)
        bump(ticket)
        audit(
            self.db,
            ticket.id,
            "ticket.overridden",
            before,
            {
                "priority": ticket.priority,
                "team_id": ticket.team_id,
                "human_locked_fields": ticket.human_locked_fields,
            },
            data.reason,
        )
        self.db.flush()
        return ticket
