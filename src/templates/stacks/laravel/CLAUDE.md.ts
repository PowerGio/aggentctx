export const template = `# CLAUDE.md — {{project.name}}

## Project

**{{project.name}}** — Laravel / PHP / Composer

## Commands

\`\`\`bash
composer install                          # Install dependencies
php artisan serve                         # Dev server (http://localhost:8000)
php artisan migrate                       # Apply migrations
php artisan migrate:rollback              # Rollback last migration batch
php artisan make:model <Name> -m         # Create model + migration
php artisan make:controller <Name> --resource  # Resource controller
php artisan make:request <Name>          # Form request (validation)
php artisan test                          # Run tests (Pest/PHPUnit)
php artisan tinker                        # REPL with full Eloquent access
\`\`\`

## Rules

- Models: define \`$fillable\` or \`$guarded\` — never leave both empty
- Controllers: thin controllers, fat services — business logic goes in \`app/Services/\`
- Routes: use named routes (\`->name()\`), group by middleware and prefix
- Validation: use Form Request classes for any non-trivial input
- Environment: access config via \`config()\` helper, not \`env()\` directly in code
- Migrations: always review SQL before committing — use \`php artisan migrate:status\`
- Run \`php artisan test\` before marking a task complete
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
2. Scan \`routes/web.php\` and \`routes/api.php\` for route definitions.
   For each non-trivial route group, document the user-facing flow in \`FEATURES.md\`.
3. Scan \`Makefile\`, \`composer.json\` scripts, and CI files for deploy commands.
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
