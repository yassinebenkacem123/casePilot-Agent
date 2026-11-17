# Working state (agent-maintained)

## Current milestone — 2026-11-17
Intake/persistence/Kanban implemented. CasePilot AI dark-first brand identity, design skill (`casepilot-design-system`), typography (`Sora` + `Inter`), official logo assets, and UI/UX refinement implemented across intake, login, dashboard, Kanban board, and ticket review drawer.

## Completed
- `backend/`: FastAPI/SQLAlchemy entities, Alembic schema, protected tickets/details/edits/moves/metrics; idempotent intake and durable analysis jobs.
- `frontend/`: Next.js intake, signed HttpOnly operator sessions/server proxy, TanStack Query board, current `@dnd-kit/react`, review drawer and explicit Salesforce demo banner.
- `frontend/` Brand Identity & UI/UX:
  - Sampled exact logo accent (`#FF3419`) and centralized dark-first tokens (`#000000`, `#0D0D0F`, `#151518`, `#1F1F23`, `#F5F5F7`, `#A1A1AA`, `#2A2A2E`) in `frontend/app/globals.css`.
  - Integrated `Sora` + `Inter` via `next/font/google` in `frontend/app/layout.tsx`.
  - Copied original logo PNGs to `frontend/public/assets/casepilot-logo-dark.png` and `casepilot-logo-light.png`; added reusable `<BrandLogo />` in `frontend/components/brand-logo.tsx`.
  - Added `<AnalysisBadge />`, `<ApprovalBadge />`, `<PriorityBadge />`, and `<AgentStepList />` in `frontend/components/ui/ai-status.tsx`.
  - Redesigned intake (`app/page.tsx`, `features/tickets/intake.tsx`), login (`app/login/page.tsx`), command-center dashboard & Kanban (`features/board/workspace.tsx`), and ticket review drawer (`features/review/drawer.tsx`).
- `.agents/skills/casepilot-design-system/SKILL.md` created and referenced in `AGENTS.md`.
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
- Frontend `npm run typecheck`: **exit 0** (0 errors).
- Frontend `npm run lint`: **exit 0** (0 errors, 0 warnings).
- Frontend `npm test` (`vitest run`): **1 passed** (`tests/intake.test.tsx`), exit 0.
- Frontend `npm run build` (`next build`): **exit 0** (compiled `/` , `/board`, `/login`, `/api/*`).
- Note: Playwright E2E (`playwright.config.ts`) targets Windows `.venv\Scripts\python.exe` and was not executed on macOS.
- Backend `.venv/Scripts/python -m pytest -q`: **22 passed** (prior milestone; backend untouched in this UI/brand pass).

## Blockers / uncertainties
- Salesforce sandbox credentials/entitlements and actual picklist mappings unknown.
- LLM provider choice unknown; keep adapter configurable.
- Single organization/configured operator token is a demo auth assumption, not production identity management.
- No outbound customer transport. Draft approval is an internal review record only.
- RAG uses an isolated deterministic hash-vector adapter, not production semantic embeddings.
- Graph checkpointer is per-run in-memory; durable job leases and transactional audit/proposal state recover full runs after crashes.

## Update protocol
After each work loop, record date, implemented features, changed paths, commands/results, blockers, and immediate next check. Never mark untested functionality as verified.
