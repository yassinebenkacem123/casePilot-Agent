# Architecture — CasePilot AI

## Vertical slice and boundaries

```text
Customer form (Next.js) -> POST /requests -> FastAPI intake service -> PostgreSQL Ticket (PENDING_ANALYSIS)
                                                 | transactional event / outbox
                                                 v
                                            AI job worker
                                                 |
                                      LangGraph orchestrator
                                                 |
                 +-------------------------------+--------------------------------+
                 |                               |                                |
          typed tool registry              Knowledge retrieval               Policy engine
                 |                               |                                |
          ticket services                   RAG references                 priority/team
                 +-------------------------------+--------------------------------+
                                                 |
                                      persisted AI proposal
                                                 |
                     Operator Kanban -> approve / reject / override / lock
                                                 |
                               approved outbox -> Salesforce Case adapter
```

**Invariants**: submissions never wait on LLM success; agent cannot directly write Salesforce or human-locked fields; only backend policy services authorize side effects; priority != workflow status != card position.

## Modules
- `frontend/app`: public intake, protected board, ticket drawer; `frontend/features/{tickets,board,review}`; `frontend/lib/api` typed client.
- `backend/app/api`: auth/authorization, validation, version preconditions.
- `backend/app/services`: domain policies, ticket moves, approvals; single writer for business state.
- `backend/app/agents`: deterministic LangGraph state graph, checkpoints, bounded execution.
- `backend/app/tools`: narrow Pydantic tools delegating to services (never direct SQL/HTTP from LLM).
- `backend/app/rag`: ingestion, retrieval, citation validation, abstention.
- `backend/app/integrations`: Salesforce port and demo adapter, retries and mapping.
- `backend/app/db`: SQLAlchemy entities, migrations, unit of work and outbox.
- `backend/tests`, `frontend/tests`, `docs/adr`.

## Agent graph
`load_ticket -> rule_guard -> classify -> propose_priority_and_team -> retrieve_context -> draft_reply -> validate_output -> persist_proposal -> queue_review -> END`.
On invalid input/model failure use `record_failure -> manual_review -> END`. No unbounded retry or autonomous loop. Use `thread_id=ticket_id:run_id` for checkpointer as configured; require schema validation at each node. Policy finalizes permission independent of model output.

## Priority and card ordering
`priority` = severity enum; `status` = workflow enum; `position` = sortable rank **within** status. Initial order: descending priority, then created_at, with stable rank allocation. Subsequent manual drag establishes explicit position and is never silently reset by new agent runs. New ticket insertion respects priority among unpinned tickets. A transaction must lock affected rows and assign collision-free ranks; API accepts `expected_version`. Never equate priority edit with status transition.

## Human authority
Agent persists proposals and response drafts only. Approve applies proposal fields if version valid and not locked; override writes lock/decision audit; reject leaves ticket unchanged. Manual changes win. If conflicts occur, return 409 with current version and require refreshed review. High-risk actions require specific operator approval. Customer response never auto-sent.

## Salesforce boundary
Map approved internal state to standard Case with org-configured picklist values and queue IDs; service credentials stay backend-only. Outbox idempotency keyed by ticket ID and action version. Store external Case ID and sync status. Demo adapter labels all mocked actions. No Agentforce assumption.

## Failure design
Persist-before-analyze; bounded retries with jitter for transient Salesforce/LLM failure; dead-letter/manual review for exhausted attempts; track `run_id`, `correlation_id`, error code; audit critical transitions; protect PII in logs. No silently swallowed errors.
