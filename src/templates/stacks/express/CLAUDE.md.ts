export const template = `# CLAUDE.md — {{project.name}}

## Project

**{{project.name}}** — Express.js{{#if stack.primary.version}} {{stack.primary.version}}{{/if}} / {{stack.language}} / {{stack.packageManager}}

## Commands

\`\`\`bash
{{stack.packageManager}} run dev     # dev server
{{stack.packageManager}} run build   # compile TypeScript
{{stack.packageManager}} run start   # production
{{stack.packageManager}} run test    # tests
{{stack.packageManager}} run lint    # lint
\`\`\`

## Rules

- Validate all inputs — never trust request body without schema validation
- Centralize error handling in a single middleware — no scattered try/catch returning 500s
- All environment variables via \`process.env\` — never hardcode credentials
- Keep route handlers thin: extract logic into services
- Run lint and tests before marking a task complete
{{#if conventions.linter}}- Linter: {{conventions.linter}}{{/if}}
{{#if conventions.testRunner}}- Tests: {{conventions.testRunner}}{{/if}}

## agentctx — First-Run Bootstrap

If \`.agentctx/pending-bootstrap.md\` exists, this is the **first time agentctx runs on this project**.
Do the following **before any other task**:

1. Read \`.agentctx/pending-bootstrap.md\` for the project summary.
2. Scan \`src/routes/\`, \`src/api/\`, and route files to identify user-facing endpoints.
3. For each endpoint group, append an entry to \`FEATURES.md\` documenting the flow and response shape.
4. Scan \`package.json\` scripts and any CI files for deploy commands. Append to \`DEPLOY.md\`.
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
