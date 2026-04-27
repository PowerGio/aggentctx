export const template = `# DESIGN.md — {{project.name}}

> Architecture and module design reference for this NestJS project.

## Architecture

**Stack:** NestJS / {{stack.language}}
**Pattern:** Module -> Controller -> Service -> Repository

\`\`\`
src/
+-- app.module.ts       # Root module — imports all feature modules
+-- main.ts             # Bootstrap — app factory, global pipes/filters
+-- common/             # Shared: guards, interceptors, pipes, decorators
+-- config/             # ConfigModule setup, env validation
+-- [feature]/          # One folder per domain feature
    +-- [feature].module.ts
    +-- [feature].controller.ts
    +-- [feature].service.ts
    +-- [feature].entity.ts      # TypeORM entity (if using ORM)
    +-- dto/
        +-- create-[feature].dto.ts
        +-- update-[feature].dto.ts
\`\`\`

## Module Design Rules

- One module per domain feature — never mix concerns
- Modules export only what other modules need — keep internals private
- Feature modules should be self-contained: controller + service + entity + DTOs

## Request Pipeline (execution order)

\`\`\`
Request
  -> Middleware (global)
  -> Guards (@UseGuards)
  -> Interceptors (before handler)
  -> Pipes (@UsePipes — validation/transform)
  -> Handler (controller method)
  -> Interceptors (after handler)
  -> Exception Filters (@UseFilters)
-> Response
\`\`\`

## DTO Patterns

\`\`\`typescript
// Always use class-validator decorators
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
\`\`\`

## Patterns

- **Global validation pipe:** register in \`main.ts\` with \`whitelist: true, forbidNonWhitelisted: true\`
- **Config:** use \`ConfigModule.forRoot({ isGlobal: true, validate })\` — validates env at startup
- **Auth:** JWT guard as global guard with \`@Public()\` decorator for open routes

## Directory Structure

{{#if structure.sourceDir}}- \`{{structure.sourceDir}}/\` — source code{{/if}}
{{#if structure.testDir}}- \`{{structure.testDir}}/\` — e2e tests{{/if}}
- \`src/**/*.spec.ts\` — unit tests (colocated)
`;
