export const template = `# DESIGN.md — {{project.name}}

> Design system reference for {{stack.primary.name}} project.

## Component Patterns

- Use Server Components as the default
- Extract client interactivity into leaf components with \`'use client'\`
- Co-locate styles with components when using CSS Modules

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Page | \`page.tsx\` | \`app/dashboard/page.tsx\` |
| Layout | \`layout.tsx\` | \`app/layout.tsx\` |
| Component | PascalCase | \`components/UserCard.tsx\` |
| Hook | camelCase + \`use\` prefix | \`hooks/useAuth.ts\` |
| Utility | camelCase | \`lib/formatDate.ts\` |

## State Management

<!-- Document your state management approach here -->

## API Conventions

<!-- Document your API route patterns here -->
`;
