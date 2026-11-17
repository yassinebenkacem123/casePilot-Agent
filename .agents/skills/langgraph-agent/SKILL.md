---
name: langgraph-agent
description: Bounded LangGraph workflow for CasePilot AI. Load only when working in this domain.
---
# Bounded LangGraph workflow

## Entry conditions
Read root `AGENTS.md`, `.agent/context/STATE.md`, `.agent/ARCHITECTURE.md`, then inspect relevant implementation and tests. Follow `.agent/workflows/ENGINEERING_LOOP.md`.

## Instructions
Build typed state with ticket_id, run_id, classification, proposed priority/team, evidence, draft, errors. Nodes classify -> verify policy -> retrieve -> draft -> propose -> review. Checkpoint, timeout, bounded retry, observe tools, no direct Salesforce or outbound messages.

## Definition of done
Relevant acceptance tests pass, failure modes checked, audit/security invariants preserved, documentation and `STATE.md` updated with commands and actual results. If blocked, report exact failing evidence rather than claiming completion.
