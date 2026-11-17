from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.entities import Board, Ticket


class TicketRepository:
    def __init__(self, db: Session):
        self.db = db

    def lock_board(self):
        # An UPDATE acquires a transaction lock in PostgreSQL and SQLite.
        self.db.execute(update(Board).where(Board.id == 1).values(revision=Board.revision + 1))

    def get(self, ticket_id: str) -> Ticket:
        ticket = self.db.get(Ticket, ticket_id, populate_existing=True)
        if not ticket:
            raise HTTPException(404, "Ticket not found")
        return ticket

    def column(self, status: str) -> list[Ticket]:
        return list(
            self.db.scalars(
                select(Ticket).where(Ticket.status == status).order_by(Ticket.position, Ticket.id)
            )
        )
