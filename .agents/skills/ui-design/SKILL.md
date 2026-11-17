---
name: ui-design
description: Support dashboard UI for CasePilot AI. Load only when working in this domain.
---
# Support dashboard UI

## Entry conditions
Read root `AGENTS.md`, `.agent/context/STATE.md`, `.agent/ARCHITECTURE.md`, then inspect relevant implementation and tests. Follow `.agent/workflows/ENGINEERING_LOOP.md`.

## Instructions
Build responsive Next.js/shadcn UI: intake, board, detail drawer, priority badge, proposed vs approved state, confidence context, citation links, sync status and KPI cards. Meet loading/error/empty/accessibility requirements; use visual clarity over decorative effects.

## Definition of done
Relevant acceptance tests pass, failure modes checked, audit/security invariants preserved, documentation and `STATE.md` updated with commands and actual results. If blocked, report exact failing evidence rather than claiming completion.
