import argparse

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.entities import Ticket
from app.rag.store import LocalVectorStore
from app.schemas.tickets import Submission
from app.services.tickets import TicketService

FAQ = [
    (
        "availability",
        "Availability troubleshooting",
        "docs/knowledge/support-faq.md#availability",
        "For an outage or unavailable service, collect the affected product, error message, and approximate start time. Check the product status page if your organization has configured one. Do not share passwords or access tokens.",
    ),
    (
        "billing",
        "Invoice questions",
        "docs/knowledge/support-faq.md#billing",
        "For a billing or invoice question, provide the invoice reference and describe the unexpected charge. Do not include a full card number or bank details. The billing team must verify account records before making a decision.",
    ),
    (
        "account",
        "Account access",
        "docs/knowledge/support-faq.md#account",
        "For account access or password reset, use the official sign-in page and select the password reset option. Never send your password or a reset token to support.",
    ),
    (
        "general",
        "Contacting support",
        "docs/knowledge/support-faq.md#general",
        "For a general product question, include the product name and describe what you are trying to do. A support operator reviews requests and confirms the appropriate next steps.",
    ),
]
SCENARIOS = [
    (
        "outage",
        "Production outage for all users",
        "Our production service is down and unavailable for everyone. Errors started this morning.",
    ),
    (
        "billing",
        "Unexpected invoice charge",
        "Our billing invoice appears to include a duplicate charge. Can you help us check the payment?",
    ),
    (
        "general",
        "General product information",
        "Where can I find more information about the product? I would like help getting started.",
    ),
]


def seed(factory=SessionLocal, tickets=True):
    with factory.begin() as db:
        store = LocalVectorStore(db)
        for args in FAQ:
            store.ingest(*args)
        if tickets:
            for key, subject, description in SCENARIOS:
                if not db.scalar(
                    select(Ticket).where(Ticket.idempotency_key == f"seed-demo-{key}")
                ):
                    TicketService(db).submit(
                        Submission(
                            name="Demo Customer",
                            email="demo@example.com",
                            subject=subject,
                            description=description,
                        ),
                        f"seed-demo-{key}",
                        "seed",
                    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--knowledge-only", action="store_true")
    seed(tickets=not parser.parse_args().knowledge_only)
    print("Seeded local demo knowledge and scenarios; Salesforce has not been contacted.")
