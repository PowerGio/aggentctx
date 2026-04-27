export const template = `# DESIGN.md — {{project.name}}

> Architecture and API design reference for this FastAPI project.

## Architecture

**Stack:** FastAPI / Python
**Pattern:** Router -> Service -> Repository -> Database

\`\`\`
app/
+-- main.py          # App factory — creates FastAPI instance, registers routers
+-- routers/         # Route definitions grouped by resource
+-- services/        # Business logic — no HTTP concerns
+-- models/          # SQLAlchemy / ORM models
+-- schemas/         # Pydantic models for request/response validation
+-- dependencies/    # Reusable Depends() — auth, DB session, pagination
+-- core/            # Config, security, settings
+-- db/              # Database session, migrations (Alembic)
\`\`\`

## API Conventions

- All routes prefixed: \`/api/v1/\`
- Response models: always declare \`response_model=\` on endpoints
- Errors: raise \`HTTPException(status_code=X, detail="message")\`
- Pagination: \`{ items: [], total: int, page: int, size: int }\`

## Pydantic Schema Patterns

\`\`\`python
# Request schema — validates incoming data
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

# Response schema — controls what gets returned
class UserResponse(BaseModel):
    id: int
    email: str
    model_config = ConfigDict(from_attributes=True)
\`\`\`

## Dependency Injection Patterns

- \`Depends(get_db)\` — database session per request, auto-closed
- \`Depends(get_current_user)\` — auth guard
- \`Depends(pagination_params)\` — shared pagination query params

## Patterns

- **Async:** use \`async def\` for I/O-bound endpoints, \`def\` for CPU-bound
- **Settings:** use \`pydantic-settings\` — fails fast if required env vars missing
- **Auto docs:** available at \`/docs\` (Swagger) and \`/redoc\` — verify new endpoints appear

## Directory Structure

{{#if structure.sourceDir}}- \`{{structure.sourceDir}}/\` — source code{{/if}}
{{#if structure.testDir}}- \`{{structure.testDir}}/\` — tests{{/if}}
`;
