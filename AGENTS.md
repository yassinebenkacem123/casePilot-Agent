# CasePilot AI — Agent Development Instructions

## Mission
Build a hackathon-ready, production-minded AI customer support triage application called CasePilot AI. A customer submits a support request; a LangGraph agent uses narrowly scoped tools to classify intent, propose priority and team, create/update the internal ticket and Kanban position, and generate a grounded response draft. A support operator reviews and can approve, reject, or override AI recommendations. Synchronize approved data with Salesforce Service Cloud where configured.

## Non-negotiable behavior
- Customer submissions persist as `PENDING_ANALYSIS` before AI execution; no lost tickets if AI fails.
- Keep independent fields `status`, `priority`, `priority_rank`, and `position`. Status is workflow stage; priority is severity, never a Kanban column.
- Agent actions use validated typed tools exposed by backend, not arbitrary database access.
- All agent-created classification changes are proposals unless permitted by a defined policy; human override always wins.
- Require human approval before outbound customer communication, destructive actions, irreversible escalations, or Salesforce writes affecting routing/priority/ownership. Auto-created drafts/internal triage are allowed.
- Prevent AI reprocessing from overwriting `human_locked_fields`; use optimistic concurrency/version checks.
- Log actor (human or agent), action, before/after, reason, timestamps, and approval outcome in audit events.
- RAG uses knowledge sources with provenance. No fabricated policies or unsupported promises; say when evidence is missing.
- Never put Salesforce credentials or LLM keys in browser code, logs, or git.
- Support demo mode with mock Salesforce and seed data when Salesforce credentials/Agentforce entitlements are unavailable. Never imply mock synchronization is live.

## Stack
- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, dnd-kit (`@dnd-kit/react` current API), accessible keyboard/pointer drag/drop.
- Backend: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, PostgreSQL.
- AI: LangGraph + LangChain, configurable model via environment, RAG using pgvector if available or an isolated local vector-store adapter.
- Integration: Salesforce REST API adapter for `Case`; later optional Flow/Agentforce custom action integration. Backend owns authentication/refresh and field mapping.
- Local environment: docker compose for Postgres; .env.example with placeholder secrets; no secrets committed.

## Architecture
Use modular, testable boundaries: `frontend/`, `backend/app/{api,models,schemas,services,agents,tools,rag,integrations,db,core}/`, `backend/tests/`, `docs/`.
- API routes handle authentication/authorization and request/response validation.
- Services enforce business rules; tools call services. Agent nodes do not bypass services.
- Repository layer owns persistence; integration adapters handle external APIs.
- Durable ticket and audit state is authoritative locally; Salesforce sync uses an outbox/retry strategy and external reference ID to avoid duplicates.
- For hackathon, use one organization/team and seeded operator accounts; document authentication assumptions. Never expose customer ticket lists publicly.

## Workflow
1. Customer POSTs `{name,email,subject,description}` to public submission endpoint, with spam/rate limit controls.
2. Backend validates, saves `Ticket` as pending, returns tracking ID, and schedules AI analysis through a reliable job runner (synchronous fallback in demo mode with timeout).
3. Agent classifies intent, urgency, and routing from the content and validated business rules.
4. Agent invokes tools to store `TicketAnalysis`, propose priority/team, create a suggested response with RAG citations, and place ticket in the review queue.
5. Dashboard shows proposed priority and human review state; operator may approve or edit before publishing/assigning.
6. Once approved, sync Case to Salesforce and track `salesforce_case_id`, `sync_status`, and errors.
7. Operator can move tickets via Kanban DnD; moves are persisted with transaction-safe ordering; closed/reopened transitions require explicit confirmation where appropriate.

## Kanban requirements
- Default columns: `À valider`, `À traiter`, `En cours`, `Résolu`; mapping to Salesforce Case statuses is configurable.
- Support drag across columns and sort within a column. Persist `status` and `position`, not just UI state.
- Card includes ticket number, title, customer, intent, priority badge, suggested team, AI confidence, approval state, last update.
- Card detail drawer: original request, AI rationale, retrieved knowledge snippets/citations, draft reply, audit timeline, action buttons.
- Provide manual priority selector (Critical/High/Medium/Low), team reassignment, approve/reject recommendation, and optional lock against AI overwrites.
- Highlight SLA targets and overdue cards only if SLA policy is configured; don't invent commitments.
- Accessible keyboard operations, loading/errors, optimistic UI rollback, empty states, filtering/search, responsive layout.

## Tool contracts (validate inputs and permissions)
- `get_ticket(ticket_id)` read scoped ticket.
- `classify_request(ticket_id)` structured output: intent, rationale, confidence.
- `suggest_priority(ticket_id)` structured severity based on policy and evidence.
- `suggest_team(ticket_id)` returns team ID and explanation from allowlisted teams.
- `create_ticket_draft(source_request_id, fields)` idempotent internal creation; never duplicate an existing request.
- `propose_ticket_update(ticket_id, priority?, team_id?, status?, rationale?)` persists a pending proposal, not a direct privileged modification.
- `search_knowledge(query, filters?)` returns document IDs, snippets and provenance.
- `draft_response(ticket_id, evidence)` generates internal suggestion only.
- `request_human_approval(proposal_id)` routes proposal to review queue.
- `sync_salesforce_case(ticket_id)` privileged service action requiring explicit approved state and configured credentials, never unrestricted LLM invocation.
- Each tool returns structured success/error and writes an audit event; handle retries, timeouts, and idempotency.

## Minimal domain model
- Ticket: id, public_ref, requester_name, requester_email, subject, description, status, priority, position, intent, team_id, analysis_state, ai_confidence, approval_state, human_locked_fields, version, salesforce_case_id, sync_status, created_at, updated_at.
- TicketProposal: id, ticket_id, proposed_priority, proposed_team_id, proposed_status, rationale, confidence, state, agent_run_id, reviewed_by, reviewed_at.
- ReplyDraft: id, ticket_id, body, sources, state, created_at.
- Team: id, name, categories.
- KnowledgeDocument/KnowledgeChunk: id, title, source, content, embedding, version.
- AuditEvent: id, ticket_id, actor_type, actor_id, action, before, after, occurred_at.
- SyncOutbox: id, ticket_id, event_type, status, attempts, last_error.

## API minimum
- `POST /api/v1/requests` public submit request.
- `GET /api/v1/tickets` protected board/filter/pagination.
- `GET /api/v1/tickets/{id}` protected details.
- `PATCH /api/v1/tickets/{id}/position` protected status/order move, version-aware.
- `PATCH /api/v1/tickets/{id}` protected manual edits, field lock.
- `POST /api/v1/tickets/{id}/analyze` protected retrigger (respect locked fields).
- `POST /api/v1/proposals/{id}/approve` protected approve atomically.
- `POST /api/v1/proposals/{id}/reject` protected reject.
- `POST /api/v1/tickets/{id}/reply-drafts` protected generate.
- `POST /api/v1/tickets/{id}/salesforce-sync` protected approved sync.
- `GET /api/v1/dashboard/metrics` protected summary.

## Salesforce implementation
- Map local Ticket to standard Salesforce `Case`: Subject, Description, Origin, Status, Priority and configured OwnerId/queue where valid.
- Salesforce picklist and queue IDs must be discovered/configured for the org; never assume values match internal enums.
- Use secure server-side OAuth with least privileges. Do not expose tokens to frontend.
- On approved sync, POST new Case or PATCH existing Case; save ID and sync errors. Avoid duplicate creation across retries.
- If unavailable, show an explicit `Demo mode: not synced to Salesforce` banner, while all other features work.
- Agentforce, if enabled, is an optional integration path; do not claim LangGraph and Agentforce are the same agent runtime.

## Delivery phases and acceptance criteria
1. Bootstrap: Next + FastAPI + Postgres start locally; health endpoint, env example, migration, README.
2. Customer intake: submit valid request, receive ID, persist; test bad inputs and duplicates.
3. Kanban: list tickets, move between columns, reorder, reload retains order; manual priority/team change works.
4. AI orchestration: traceable LangGraph execution calls typed tools; produces structured analysis and proposal; missing model falls back to seeded deterministic demo.
5. Human review: approve/reject/override; locks resist agent retries; audit events visible.
6. RAG: ingest sample FAQ; return sourced suggestion; avoid hallucinated refund/SLA policy.
7. Salesforce: real adapter if enabled, otherwise mock mode; sync status and retry behavior shown.
8. Demo: 3 seeded scenarios (urgent outage, billing issue, general info), metric cards, smoke/e2e tests, README with exact commands.

## Coding discipline
- First inspect existing files, README, tests, configs, and current implementation before editing. Never overwrite user work blindly.
- Implement one vertical slice at a time; avoid decorative features until the end-to-end workflow works.
- Use clear type-safe contracts, migrations, bounded retries, structured logs, and explicit failure states.
- No hardcoded secrets, fake integrations portrayed as real, or unnecessary packages.
- Add focused backend unit/API tests and frontend interaction tests for each meaningful feature; run lint/typecheck/tests before declaring done.
- For each implementation milestone, report: files changed, endpoints/UI built, commands executed, test results, blockers, and next steps.
- Keep README actionable with install/run commands, architecture, demo script, known limitations, and required environment variables.

## Hackathon success demonstration
Submit a customer issue -> show persistent ticket -> run agent -> show priority/team explanation and draft with citations -> human approves or edits -> drag card to In Progress -> reload board -> demonstrate Salesforce Case sync (or visibly labeled mock) -> show audit timeline and KPIs.

## Agent harness and skill-driven execution (mandatory)
- Read `.agent/README.md`, `.agent/ARCHITECTURE.md`, `.agent/context/CONTEXT_POLICY.md`, and `.agent/context/STATE.md` at project start. Read `.agent/workflows/ENGINEERING_LOOP.md` before implementation.
- Load **only relevant** `.agent/skills/<skill>/SKILL.md` for each slice; do not dump all skill documents into context. Use progressive disclosure and verify actual code over stale summaries.
- Execute the closed loop **Inspect → Plan → Implement → Verify → Critique → Record → Next**. Write tests and report precise commands/outcomes; retry a repeated failure at most twice without changing diagnosis.
- Treat `.agent/harness/HARNESS.md` as the executable-quality contract: fixtures, validation, idempotency, adversarial inputs, traces, least-privilege tools and explicit gates.
- On each milestone, refresh `.agent/context/STATE.md` with true implementation state, changed paths, tests run/results, blockers and next action. No fabricated test or integration successes.
- Prioritize a working vertical slice over autonomous complexity. The **LLM proposes**; backend **policy authorizes**; humans **approve**; audit **records**. No uncontrolled autonomous business actions.
