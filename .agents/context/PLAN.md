# Implementation checklist — 2026-11-17

- [ ] Bootstrap Python 3.12/FastAPI/SQLAlchemy/Alembic and Next.js workspace; health and documented local environment.
- [ ] Persist idempotent, validated customer intake and durable analysis jobs before AI execution; API tests.
- [ ] Protected Kanban list/details, versioned moves/reordering, manual edits/locks, intake UI; interaction tests.
- [ ] Atomic human review and audit, typed bounded LangGraph proposal workflow; failure/adversarial tests.
- [ ] Local knowledge retrieval with provenance, grounded drafts and abstention; fixture tests.
- [ ] Approval-gated Salesforce port, explicit demo adapter, durable idempotent retries; contract tests.
- [ ] Seed three scenarios; metrics, drawer, demo smoke/E2E, lint/type checks and build; record limits honestly.

Use `.agents/` (the user's existing move from `.agent/`), preserve unrelated work.
Primary risk: Python 3.12, dependency/network access and a running Docker engine are not yet verified.
No outbound reply sender will be exposed; drafts require operator review and remain internal.
