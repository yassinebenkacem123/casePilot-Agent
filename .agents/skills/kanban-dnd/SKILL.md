---
name: kanban-dnd
description: Kanban drag-and-drop for CasePilot AI. Load only when working in this domain.
---
# Kanban drag-and-drop

## Entry conditions
Read root `AGENTS.md`, `.agent/context/STATE.md`, `.agent/ARCHITECTURE.md`, then inspect relevant implementation and tests. Follow `.agent/workflows/ENGINEERING_LOOP.md`.

## Instructions
Implement accessible dnd-kit board with sortable within/across columns; separate status/position from priority. Use stable IDs, keyboard support, optimistic rollback on 409, refetch on conflicts, manual priority lock and audit history. Verify reload persistence and keyboard/touch behaviors.

## Definition of done
Relevant acceptance tests pass, failure modes checked, audit/security invariants preserved, documentation and `STATE.md` updated with commands and actual results. If blocked, report exact failing evidence rather than claiming completion.
