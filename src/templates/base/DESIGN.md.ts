export const template = `# DESIGN.md — {{project.name}}

> Design system and architecture reference.

## Architecture

**Stack:** {{stack.primary.name}} / {{stack.language}}

<!-- Document key architectural decisions here -->

## Patterns

<!-- Document coding patterns and conventions here -->

## Directory Structure

{{#if structure.sourceDir}}- \`{{structure.sourceDir}}/\` — source code{{/if}}
{{#if structure.testDir}}- \`{{structure.testDir}}/\` — tests{{/if}}

<!-- Add more directory documentation here -->
`;
