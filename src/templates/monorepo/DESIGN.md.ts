export const template = `# DESIGN.md — {{project.name}}

> Architecture reference for this monorepo.

## Architecture

**Type:** Monorepo
**Package manager:** {{stack.packageManager}}

## Workspaces

{{#each stack.workspaces}}#### \`{{this.path}}\` — {{this.stackName}}

- Language: {{this.language}}
- See \`{{this.path}}/AGENTS.md\` for stack-specific patterns

{{/each}}
## Shared Conventions

- Shared types and utilities live at the root or in a dedicated \`packages/shared\` workspace
- Each workspace is independently deployable
- Cross-workspace imports go through the package registry, not relative \`../\` paths

## Directory Structure

{{#if structure.sourceDir}}- \`{{structure.sourceDir}}/\` — source code{{/if}}
{{#if structure.testDir}}- \`{{structure.testDir}}/\` — tests{{/if}}

<!-- Add project-specific architecture notes here -->
`;
