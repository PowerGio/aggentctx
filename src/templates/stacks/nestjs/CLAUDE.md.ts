export const template = `# CLAUDE.md — {{project.name}}

## Project

**{{project.name}}** — NestJS{{#if stack.primary.version}} {{stack.primary.version}}{{/if}} / {{stack.language}} / {{stack.packageManager}}

## Commands

\`\`\`bash
{{stack.packageManager}} run start:dev    # dev server
{{stack.packageManager}} run build        # compile
{{stack.packageManager}} run test         # unit tests
{{stack.packageManager}} run test:e2e     # e2e tests
{{stack.packageManager}} run lint         # ESLint
\`\`\`

## Rules

- Every feature must be its own module — register in \`AppModule\`
- Use DTOs + \`class-validator\` for all input validation — never raw \`req.body\`
- Services injected via constructor — no \`new MyService()\` anywhere
- Guards for auth enforcement, not middleware
- All environment variables via \`ConfigModule\` — never hardcode
- Run lint + tests before marking a task complete
{{#if conventions.testRunner}}- Tests: {{conventions.testRunner}} (colocated \`.spec.ts\`){{/if}}

## agentctx — First-Run Bootstrap

If \`.agentctx/pending-bootstrap.md\` exists, this is the **first time agentctx runs on this project**.
Do the following **before any other task**:

1. Read \`.agentctx/pending-bootstrap.md\` for the project summary.
2. Scan \`src/\` for modules (*.module.ts) and their controllers. For each controller,
   document the user-facing endpoints as features in \`FEATURES.md\`.
3. Scan \`package.json\` scripts, Dockerfile, and CI files for deploy commands.
   Append each to \`DEPLOY.md\`, replacing credentials with \`\$ENV_VAR\` placeholders.
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
