from fastapi import HTTPException
from sqlalchemy import select

from app.db.repository import TicketRepository
from app.models.entities import ReplyDraft, TicketProposal, now
from app.schemas.tickets import PRIORITY_RANK, Review
from app.services.tickets import audit, bump, check_version


class ReviewService:
    def __init__(self, db):
        self.db = db
        self.repo = TicketRepository(db)

    def decide(self, proposal_id: str, data: Review, approve: bool):
        self.repo.lock_board()
        proposal = self.db.get(TicketProposal, proposal_id)
        if not proposal:
            raise HTTPException(404, "Proposal not found")
        ticket = self.repo.get(proposal.ticket_id)
        check_version(ticket, data.expected_version)
        if proposal.state != "PENDING" or (approve and proposal.base_version != ticket.version):
            raise HTTPException(409, "Proposal is no longer current; analyze and review again")
        before = {
            "priority": ticket.priority,
            "team_id": ticket.team_id,
            "status": ticket.status,
            "intent": ticket.intent,
            "approval_state": ticket.approval_state,
        }
        if approve:
            fields = {
                "priority": proposal.proposed_priority,
                "team_id": proposal.proposed_team_id,
                "status": proposal.proposed_status,
                "intent": proposal.intent,
            }
            for field, value in fields.items():
                if value is not None and field not in ticket.human_locked_fields:
                    # Graph may only propose the review stage; never relocate manually ordered cards.
                    if field == "status":
                        continue
                    setattr(ticket, field, value)
            ticket.priority_rank = PRIORITY_RANK[ticket.priority]
            ticket.ai_confidence = proposal.confidence
            ticket.approval_state = "APPROVED"
            proposal.state = "APPROVED"
        else:
            ticket.approval_state = "REJECTED"
            proposal.state = "REJECTED"
        proposal.reviewed_by = "operator"
        proposal.reviewed_at = now()
        bump(ticket)
        audit(
            self.db,
            ticket.id,
            f"proposal.{proposal.state.lower()}",
            before,
            {
                "priority": ticket.priority,
                "team_id": ticket.team_id,
                "intent": ticket.intent,
                "approval_state": ticket.approval_state,
            },
            data.reason,
        )
        self.db.flush()
        return ticket

    def approve_draft(self, draft_id, data: Review):
        self.repo.lock_board()
        draft = self.db.get(ReplyDraft, draft_id)
        if not draft:
            raise HTTPException(404, "Draft not found")
        ticket = self.repo.get(draft.ticket_id)
        check_version(ticket, data.expected_version)
        if draft.state != "DRAFT":
            raise HTTPException(409, "Draft already reviewed")
        draft.state = "APPROVED_INTERNAL"
        bump(ticket)
        audit(
            self.db,
            ticket.id,
            "draft.approved_internal",
            {"state": "DRAFT"},
            {"state": draft.state},
            data.reason,
        )
        self.db.flush()
        return ticket


def supersede_proposals(db, ticket_id, state="OVERRIDDEN"):
    for proposal in db.scalars(
        select(TicketProposal).where(
            TicketProposal.ticket_id == ticket_id, TicketProposal.state == "PENDING"
        )
    ):
        proposal.state = state
