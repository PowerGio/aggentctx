export const template = `# CLAUDE.md — {{project.name}}

## Project

**{{project.name}}** — Monorepo / {{stack.packageManager}}

## Workspaces

{{#each stack.workspaces}}- \`{{this.path}}/\` — {{this.stackName}} ({{this.language}})
{{/each}}
## Commands

\`\`\`bash
{{stack.packageManager}} install    # install all workspaces
{{stack.packageManager}} run dev    # dev server (check workspace scripts)
{{stack.packageManager}} run build  # build all
{{stack.packageManager}} run test   # test all
\`\`\`

## Rules

- Always check which workspace a file belongs to before applying conventions
- Shared dependencies live at the root — workspace deps live in the workspace
- Never commit \`.env\` files — use \`.env.example\` as reference

## agentctx — First-Run Bootstrap

If \`.agentctx/pending-bootstrap.md\` exists, this is the **first time aggentctx runs on this project**.
Do the following **before any other task**:

1. Read \`.agentctx/pending-bootstrap.md\` for the project summary.
2. For each workspace listed, scan its source files to identify user-facing features.
3. Append feature entries to \`FEATURES.md\`.
4. Scan root and workspace scripts for deploy commands. Append to \`DEPLOY.md\`.
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

> This file is managed by aggentctx. Do not remove this section.
`;
