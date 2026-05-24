export const template = `# CLAUDE.md — {{project.name}}

## Project

**{{project.name}}** — Django / Python / {{stack.packageManager}}

## Commands

\`\`\`bash
python manage.py runserver        # Dev server (http://localhost:8000)
python manage.py migrate          # Apply migrations
python manage.py makemigrations   # Create migrations from model changes
python manage.py test             # Run tests
python manage.py shell            # Django REPL with full ORM access
python manage.py createsuperuser  # Admin user
\`\`\`

## Rules

- Models: use class-based models, define \`Meta\` with \`ordering\` and \`verbose_name\`
- Views: prefer class-based views (CBVs) — use \`APIView\` / \`ViewSet\` if DRF is present
- URLs: \`path()\` over \`url()\`, always use named patterns (\`name=\`)
- Migrations: always run \`makemigrations\` after model changes — review SQL before committing
- Settings: use environment variables via \`os.environ\` or \`django-environ\` — never hardcode secrets
- ORM: avoid raw SQL unless \`EXPLAIN ANALYZE\` proves it necessary; use \`select_related\` / \`prefetch_related\` to prevent N+1
- Run \`python manage.py test\` before marking a task complete
{{#if env.hasEnvExample}}

## Required Environment Variables

| Variable | Description |
|----------|-------------|
{{#each env.vars}}| \`{{this.}}\` | — |
{{/each}}
{{/if}}

## agentctx — First-Run Bootstrap

If \`.agentctx/pending-bootstrap.md\` exists, this is the **first time agentctx runs on this project**.
Do the following **before any other task**:

1. Read \`.agentctx/pending-bootstrap.md\` for the project summary.
2. Scan each Django app's \`urls.py\` and \`views.py\` for user-facing endpoints and actions.
   Document each flow in \`FEATURES.md\`.
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

## agentctx — Context Bundle

If \`context-bundle.md\` exists in the project root, **read it at session start** instead of exploring individual files.
It contains commands, rules, architecture, features, and deploy environments in ~600 tokens.

Regenerate it after major changes:

\`\`\`bash
agentctx context           # Regenerate context-bundle.md
agentctx context --compact # Minimal version (~300 tokens)
\`\`\`

> This file is managed by agentctx. Do not remove this section.
`;
