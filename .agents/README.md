# CasePilot AI agent operating system

Entry point: root `AGENTS.md`. Supporting references:
- `ARCHITECTURE.md` — component boundaries, sequence, graph, authority.
- `workflows/ENGINEERING_LOOP.md` — inspect/plan/implement/verify/critique/record iteration.
- `context/CONTEXT_POLICY.md` — selective loading, checkpoints and prompt-injection defense.
- `context/STATE.md` — current checkpoint (update after every iteration).
- `harness/HARNESS.md` — sandbox, fixtures, tracing and evaluation gates.
- `skills/*/SKILL.md` — task-scoped implementation skills.

**Skill routing**: load `backend-api` for persistence/API; `kanban-dnd` for board; `langgraph-agent` for orchestration; `rag-grounding` for knowledge; `salesforce-adapter` for CRM; `human-review` for decisions; `qa-evaluation` for tests; `ui-design` for frontend look and feel.

Never load all skills by default. Read only active skill(s) and references. Do not confuse this instruction scaffold with a working application.
