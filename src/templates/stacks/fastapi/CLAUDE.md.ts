export const template = `# CLAUDE.md — {{project.name}}

## Project

**{{project.name}}** — FastAPI / Python / {{stack.packageManager}}

## Commands

\`\`\`bash
uvicorn app.main:app --reload   # dev server (hot reload)
pytest                          # tests
ruff check .                    # lint
ruff format .                   # format
\`\`\`

## Rules

- All request/response shapes must use Pydantic models — no raw dicts
- Use \`async def\` for any I/O-bound endpoint; \`def\` only for CPU-bound
- Use \`Depends()\` for auth guards, DB sessions, and shared config — never global state
- Environment variables: via \`pydantic-settings\` or \`os.environ\` — never hardcode
- Type hints everywhere — they drive FastAPI's validation and docs generation
- Run \`pytest\` and \`ruff\` before marking a task complete

## agentctx — First-Run Bootstrap

If \`.agentctx/pending-bootstrap.md\` exists, this is the **first time agentctx runs on this project**.
Do the following **before any other task**:

1. Read \`.agentctx/pending-bootstrap.md\` for the project summary.
2. Scan \`app/routers/\` and \`app/api/\` for route definitions. For each router,
   document the user-facing flow and response shape in \`FEATURES.md\`.
3. Scan \`Makefile\`, \`pyproject.toml\` scripts, and CI files for deploy commands.
   Append each to \`DEPLOY.md\`, replacing credentials with \`$ENV_VAR\` placeholders.
4. Delete \`.agentctx/pending-bootstrap.md\` once bootstrap is complete.

## agentctx — Commit Validation (automatic)

After every \`git commit\`, check if \`.agentctx/pending-review.md\` exists.
If it does, read it and do the following **before any other task**:

1. Read \`FEATURES.md\` to understand the currently documented behaviors.
2. Analyze the diff in \`.agentctx/pending-review.md\` and determine if any feature's
   user-facing behavior changed (flow, return value, visible side-effects).
3. For each affected feature:
   - If behavior changed: edit \`FEATURES.md\` directly to reflect the new flow,
     moving the previous behavior to the history section.
   - If no behavioral change: do nothing for that feature.
4. If \`DEPLOY.md\` exists, check whether any new deploy command or required env variable
   appeared in the diff. If so, update \`DEPLOY.md\` accordingly.
5. Delete \`.agentctx/pending-review.md\` once the review is complete.

> This file is managed by agentctx. Do not remove this section.
`;
