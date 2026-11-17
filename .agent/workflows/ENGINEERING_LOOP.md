# Closed-loop agent development workflow

Repeat **Inspect -> Plan -> Implement -> Verify -> Critique -> Record -> Next** for each small vertical slice. Do not claim success solely on generated code.

1. **Inspect**: read root `AGENTS.md`, current context files, changed files, tests, relevant skill(s). Establish git status, baseline and constraints.
2. **Plan**: write a 3-8 item task checklist, acceptance checks, risk, and which files to change. Choose the smallest end-to-end change.
3. **Implement**: make scoped edits. Keep external side effects behind tools/adapters; write tests alongside functionality.
4. **Verify**: run relevant commands actually available: backend pytest/ruff/mypy (if configured), frontend lint/tsc/unit, Playwright E2E, DB migrations, integration-contract tests; record exact command and exit code. Missing dependencies are **not** passing checks.
5. **Critique**: try to falsify success: duplicate submission, concurrent drag, lock conflict, bogus AI priority, missing citation, failed Salesforce, auth bypass, PII leakage. Fix or document precise blocker.
6. **Record**: update `.agent/context/STATE.md`, decision log, relevant docs. Keep summary terse, factual, reproducible.
7. **Next**: re-read updated state, select next unblocked acceptance criterion. Stop if done, unsafe, or repeatedly blocked.

## Loop limits
- Max 2 autonomous attempts to repair the same failure before reporting diagnostics and changing plan.
- No infinite self-correction and no repeated install/retry without new evidence.
- Always record real test outputs; never fabricate passing tests or mock cloud integration as real.
- At each milestone report: changed files, behavior, tests with pass/fail/skipped, outstanding risks, next slice.

## Work queue order
Intake persistence -> Kanban CRUD/movement -> policy+review -> LangGraph classification -> RAG -> Salesforce adapter -> analytics -> polish.
