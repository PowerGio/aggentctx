# DESIGN.md — monorepo-project

> Architecture reference for this monorepo.

## Architecture

**Type:** Monorepo
**Package manager:** unknown

## Workspaces

#### `backend` — FastAPI

- Language: python
- See `backend/AGENTS.md` for stack-specific patterns

#### `frontend` — Next.js

- Language: typescript
- See `frontend/AGENTS.md` for stack-specific patterns

## Shared Conventions

- Shared types and utilities live at the root or in a dedicated `packages/shared` workspace
- Each workspace is independently deployable
- Cross-workspace imports go through the package registry, not relative `../` paths

## Directory Structure

<!-- Add project-specific architecture notes here -->
