---
name: qa-evaluation
description: Harness tests and adversarial evaluation for CasePilot AI. Load only when working in this domain.
---
# Harness tests and adversarial evaluation

## Entry conditions
Read root `AGENTS.md`, `.agent/context/STATE.md`, `.agent/ARCHITECTURE.md`, then inspect relevant implementation and tests. Follow `.agent/workflows/ENGINEERING_LOOP.md`.

## Instructions
Use fixture-driven golden tests, auth checks, stale version checks, injection tests, retry/no-duplicate Case cases, RAG abstention, and Playwright board E2E. Report actual results, skipped checks and residual risks. Never declare mocked results live.

## Definition of done
Relevant acceptance tests pass, failure modes checked, audit/security invariants preserved, documentation and `STATE.md` updated with commands and actual results. If blocked, report exact failing evidence rather than claiming completion.
