import random
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import select

from app.core.config import get_settings
from app.db.repository import TicketRepository
from app.integrations.salesforce import SalesforceError, adapter
from app.models.entities import SyncOutbox, now
from app.services.review import supersede_proposals
from app.services.tickets import audit, check_version


class SyncService:
    def __init__(self, db):
        self.db = db
        self.repo = TicketRepository(db)

    def approve_snapshot(self, ticket_id, expected_version, approved):
        self.repo.lock_board()
        ticket = self.repo.get(ticket_id)
        check_version(ticket, expected_version)
        if approved is not True:
            raise HTTPException(422, "Explicit approval of this exact snapshot is required")
        existing = self.db.scalar(
            select(SyncOutbox).where(
                SyncOutbox.ticket_id == ticket_id, SyncOutbox.approved_version == ticket.version
            )
        )
        if existing:
            return ticket
        ticket.approval_state = "APPROVED"
        supersede_proposals(self.db, ticket_id)
        snapshot = {
            "public_ref": ticket.public_ref,
            "subject": ticket.subject,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
            "team_id": ticket.team_id,
        }
        self.db.add(
            SyncOutbox(ticket_id=ticket_id, approved_version=ticket.version, payload=snapshot)
        )
        ticket.sync_status = "QUEUED"
        audit(
            self.db,
            ticket_id,
            "salesforce.snapshot_approved",
            after={"version": ticket.version, "mode": get_settings().salesforce_mode},
            reason="Operator explicitly approved this exact version for external synchronization",
        )
        self.db.flush()
        return ticket

    def process(self, outbox_id, port=None):
        # Keep state lock across external write so no human edit can race an approved payload.
        self.repo.lock_board()
        row = self.db.get(SyncOutbox, outbox_id, populate_existing=True)
        if not row or row.status not in ("PENDING", "RETRY", "RUNNING"):
            return
        ticket = self.repo.get(row.ticket_id)
        if ticket.version != row.approved_version or ticket.approval_state != "APPROVED":
            row.status = "CANCELLED"
            audit(
                self.db,
                ticket.id,
                "salesforce.cancelled",
                reason="Approved snapshot superseded by a newer ticket version",
                actor="system",
            )
            return
        row.attempts += 1
        owned = port is None
        try:
            port = port or adapter(get_settings())
            result = port.upsert(ticket.public_ref, row.payload)
            row.status = "SYNCED" if result.live else "DEMO_NOT_SYNCED"
            ticket.sync_status = row.status
            if result.live:
                ticket.salesforce_case_id = result.case_id
            row.last_error = None
        except SalesforceError as error:
            row.last_error = error.code
            row.status = "RETRY" if error.retryable and row.attempts < 3 else "FAILED"
            row.available_at = now() + timedelta(seconds=2**row.attempts + random.uniform(0, 1))
            ticket.sync_status = row.status
        finally:
            if owned and hasattr(port, "close"):
                port.close()
        row.lease_until = None
        audit(
            self.db,
            ticket.id,
            "salesforce." + row.status.lower(),
            after={
                "attempts": row.attempts,
                "error": row.last_error,
                "mode": get_settings().salesforce_mode,
            },
            actor="system",
        )
