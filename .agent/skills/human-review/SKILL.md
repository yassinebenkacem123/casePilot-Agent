---
name: human-review
description: Human-in-the-loop approval for CasePilot AI. Load only when working in this domain.
---
# Human-in-the-loop approval

## Entry conditions
Read root `AGENTS.md`, `.agent/context/STATE.md`, `.agent/ARCHITECTURE.md`, then inspect relevant implementation and tests. Follow `.agent/workflows/ENGINEERING_LOOP.md`.

## Instructions
Ensure proposal state machine pending/approved/rejected/overridden; approve atomically with expected_version; manual edits create locks; all decisions audit actor/reason/before-after. No customer communication without separate explicit approval.

## Definition of done
Relevant acceptance tests pass, failure modes checked, audit/security invariants preserved, documentation and `STATE.md` updated with commands and actual results. If blocked, report exact failing evidence rather than claiming completion.
