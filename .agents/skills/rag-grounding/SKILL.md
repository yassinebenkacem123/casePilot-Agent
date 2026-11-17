---
name: rag-grounding
description: Knowledge-grounded response drafts for CasePilot AI. Load only when working in this domain.
---
# Knowledge-grounded response drafts

## Entry conditions
Read root `AGENTS.md`, `.agent/context/STATE.md`, `.agent/ARCHITECTURE.md`, then inspect relevant implementation and tests. Follow `.agent/workflows/ENGINEERING_LOOP.md`.

## Instructions
Ingest sample FAQ with document IDs/version/source; chunk/embed/retrieve via adapter; verify retrieved evidence and carry citations into draft. Empty or contradictory evidence produces abstention, never invented policy. Defend against prompt injection in retrieved content.

## Definition of done
Relevant acceptance tests pass, failure modes checked, audit/security invariants preserved, documentation and `STATE.md` updated with commands and actual results. If blocked, report exact failing evidence rather than claiming completion.
