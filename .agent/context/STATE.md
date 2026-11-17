# Working state (agent-maintained)

## Current milestone
Planning / documentation only. Source code, integrations, tests and runtime verification **not yet implemented** in this instruction package.

## Completed
- Agent instruction contract and architecture specifications.
- Skills, context policy, harness design and closed-loop workflow.

## Next thin slice
1. Initialize Next.js/FastAPI/Postgres workspace.
2. Implement POST `/api/v1/requests` with persistence and tests.
3. Build public intake form and verify end-to-end.

## Decisions
- Local ticket is authoritative; Salesforce is external projection.
- AI proposes, human approves; manual override locks field.
- Priority and Kanban status/order are separate fields.

## Last verification
Documentation package only; no application tests executed.

## Blockers / uncertainties
- Salesforce sandbox credentials/entitlements and actual picklist mappings unknown.
- LLM provider choice unknown; keep adapter configurable.

## Update protocol
After each work loop, record date, implemented features, changed paths, commands/results, blockers, and immediate next check. Never mark untested functionality as verified.
