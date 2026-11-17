# Working state (agent-maintained)

## Current milestone — 2026-11-17
Intake/persistence/Kanban implemented. Review, LangGraph, RAG, Salesforce and worker slice under verification.

## Completed
- `backend/`: FastAPI/SQLAlchemy entities, Alembic schema, protected tickets/details/edits/moves/metrics; idempotent intake and durable analysis jobs.
- `frontend/`: Next.js intake, signed HttpOnly operator sessions/server proxy, TanStack Query board, current `@dnd-kit/react`, review drawer and explicit Salesforce demo banner.
- Root `.gitignore`, `.env.example`, `compose.yaml`; preserved the user's `.agent/` -> `.agents/` move.
- Python 3.12.13 and dependencies installed in ignored project environments. Lockfiles generated.

## Next thin slice
1. Verify human review, bounded LangGraph typed tools, provenance/abstention, Salesforce outbox/retries and failure cases.
2. Freeze explicit migration operations; run SQLite migration smoke and PostgreSQL concurrency if Docker starts.
3. Browser E2E/visual inspection; final lint/type/build and actionable README.

## Decisions
- Local ticket is authoritative; Salesforce is external projection.
- AI proposes, human approves; manual override locks field.
- Priority and Kanban status/order are separate fields.

## Last verification
- Backend `.venv/Scripts/python -m pytest tests/test_intake_board.py -q`: **4 passed**, exit 0.
- Frontend `npm run typecheck`, `npm test` (**1 passed**), `npm run build`: exit 0.
- Frontend `npm run lint`: exit 0, four warnings queued for cleanup.
- Backend ruff initially reported 3 import issues; `ruff check --fix` corrected all; `ruff format` executed. Clean rerun pending.
- Docker engine unavailable (named pipe missing). PostgreSQL not yet runtime verified; API tests currently SQLite.
- `.venv/Scripts/python -m pytest tests/test_agent_review_rag.py -q`: **9 passed**, exit 0.
- `.venv/Scripts/python -m pytest -q`: **22 passed** (intake/board, proposal approvals/locks/rejection, three golden scenarios, RAG citation forgery/abstention, malicious request scope, retries/recovery, Salesforce mock HTTP/OAuth/upsert/outbox). Full command completion recorded by terminal output; final clean rerun pending additional tests.
- No live LLM or Salesforce request performed. Demo adapter produces `DEMO_NOT_SYNCED` with no fabricated Case ID.

## Blockers / uncertainties
- Salesforce sandbox credentials/entitlements and actual picklist mappings unknown.
- LLM provider choice unknown; keep adapter configurable.
- Single organization/configured operator token is a demo auth assumption, not production identity management.
- No outbound customer transport. Draft approval is an internal review record only.
- RAG uses an isolated deterministic hash-vector adapter, not production semantic embeddings.
- Graph checkpointer is per-run in-memory; durable job leases and transactional audit/proposal state recover full runs after crashes.

## Update protocol
After each work loop, record date, implemented features, changed paths, commands/results, blockers, and immediate next check. Never mark untested functionality as verified.
