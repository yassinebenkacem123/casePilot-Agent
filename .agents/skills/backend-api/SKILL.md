---
name: backend-api
description: Build API and persistence for CasePilot AI. Load only when working in this domain.
---
# Build API and persistence

## Entry conditions
Read root `AGENTS.md`, `.agent/context/STATE.md`, `.agent/ARCHITECTURE.md`, then inspect relevant implementation and tests. Follow `.agent/workflows/ENGINEERING_LOOP.md`.

## Instructions
Read backend routes/services/models, current migrations and tests; implement typed Pydantic schemas, auth boundaries, idempotent intake, optimistic versions, audit events and transaction-safe board ordering. Run API tests and migrations. Do not let tools bypass service policies.

## Definition of done
Relevant acceptance tests pass, failure modes checked, audit/security invariants preserved, documentation and `STATE.md` updated with commands and actual results. If blocked, report exact failing evidence rather than claiming completion.
