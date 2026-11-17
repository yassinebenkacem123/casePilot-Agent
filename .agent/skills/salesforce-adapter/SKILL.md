---
name: salesforce-adapter
description: Salesforce Case adapter for CasePilot AI. Load only when working in this domain.
---
# Salesforce Case adapter

## Entry conditions
Read root `AGENTS.md`, `.agent/context/STATE.md`, `.agent/ARCHITECTURE.md`, then inspect relevant implementation and tests. Follow `.agent/workflows/ENGINEERING_LOOP.md`.

## Instructions
Implement behind port with mock and live backends. Map org-configured Case picklist/OwnerId, backend-only OAuth, outbox/idempotency, deduplicated create/update, retry status. Require approved state; test errors and clearly label mock mode.

## Definition of done
Relevant acceptance tests pass, failure modes checked, audit/security invariants preserved, documentation and `STATE.md` updated with commands and actual results. If blocked, report exact failing evidence rather than claiming completion.
