export const template = `# CLAUDE.md — {{project.name}}

## Project

**{{project.name}}** — {{stack.primary.name}} / {{stack.language}} / {{stack.packageManager}}

## Conventions

{{#if conventions.linter}}- Linter: {{conventions.linter}}{{/if}}
{{#if conventions.formatter}}- Formatter: {{conventions.formatter}}{{/if}}
{{#if conventions.testRunner}}- Tests: {{conventions.testRunner}}{{/if}}

## Rules

- Run lint and tests before marking a task complete
- Never hardcode secrets — use environment variables
- Follow existing code patterns in the codebase

## agentctx — First-Run Bootstrap

If \`.agentctx/pending-bootstrap.md\` exists, this is the **first time agentctx runs on this project**.
Do the following **before any other task**:

1. Read \`.agentctx/pending-bootstrap.md\` for the project summary.
2. Scan the codebase to identify the main user-facing features (focus on routes, components,
   API endpoints, CLI commands, or any entry points visible to the end user).
3. For each feature found, append an entry to \`FEATURES.md\` using \`agentctx feature add\`
   or by writing the file directly in the documented format.
   Document at least the flow (steps the user follows) and what it returns/shows.
4. Scan \`Makefile\`, \`package.json\` scripts, CI files, and shell scripts for deploy commands.
   For each one found, append it to \`DEPLOY.md\` using \`agentctx deploy add\` or directly.
   Replace any hardcoded credentials with \`$ENV_VAR_NAME\` placeholders.
5. Delete \`.agentctx/pending-bootstrap.md\` once bootstrap is complete.

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
