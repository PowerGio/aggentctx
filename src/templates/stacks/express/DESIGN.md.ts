export const template = `# DESIGN.md — {{project.name}}

> Architecture and API design reference for this Express.js project.

## Architecture

**Stack:** Express.js / {{stack.language}}
**Pattern:** Layered architecture — Routes -> Controllers -> Services -> Data

\`\`\`
src/
+-- routes/        # HTTP routing — thin, delegates to controllers
+-- controllers/   # Request/response handling
+-- services/      # Business logic — framework-agnostic
+-- middleware/    # Auth, validation, logging, error handling
+-- models/        # Data models / ORM entities
+-- utils/         # Shared utilities
\`\`\`

## API Conventions

- Base path: \`/api/v1/\`
- Response shape: \`{ data, error, meta }\` — consistent across all endpoints
- Errors: always return \`{ error: { code, message } }\` — never raw strings
- Pagination: \`{ data: [], meta: { total, page, limit } }\`

## Middleware Stack (order matters)

1. \`helmet\` — security headers
2. \`cors\` — CORS policy
3. \`express.json()\` — body parsing
4. \`morgan\` / custom logger — request logging
5. Auth middleware — JWT validation
6. Route handlers
7. Error handler — must be last, catches everything above

## Patterns

- **Async errors:** wrap async handlers or use \`express-async-errors\` — unhandled promise rejections crash the server
- **Validation:** validate at the route level before hitting the controller
- **Environment variables:** only via \`process.env\` — use \`dotenv\` + a config module that fails fast if required vars are missing

## Directory Structure

{{#if structure.sourceDir}}- \`{{structure.sourceDir}}/\` — source code{{/if}}
{{#if structure.testDir}}- \`{{structure.testDir}}/\` — tests{{/if}}

<!-- Add project-specific directories here -->
`;
