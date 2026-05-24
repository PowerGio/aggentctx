# agentctx

> Generate and maintain AI agent context files for your codebase — so agents never start from zero.

AI coding agents lose context between sessions. They don't know how your features work, where credentials go, or what changed last week. `agentctx` fixes that by generating structured context files and keeping them up to date automatically.

## What it does

- **`agentctx init`** — detects your stack and generates `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`
- **`agentctx update`** — re-analyzes your project and appends any sections missing from existing context files
- **`agentctx feature add/update`** — documents feature behaviors with history, so agents know what each feature does and how it evolved
- **`agentctx deploy add/scan`** — stores deploy commands with `$ENV_VAR` placeholders — no more forgotten credentials
- **`agentctx hook install`** — installs a git post-commit hook that writes `.agentctx/pending-review.md` after every commit, so Claude Code automatically validates behavioral changes

## Quick start

```bash
npx aggentctx init
```

That's it. Run it in any project directory. agentctx detects your stack, generates the context files, and writes a bootstrap signal so Claude Code documents your existing features on the next prompt.

## Installation

```bash
# Global
npm install -g aggentctx   # npm package name
agentctx init              # CLI command

# Without installing
npx aggentctx init
```

## Commands

### `agentctx init [dir]`

Analyzes your project and generates context files.

```bash
agentctx init                  # Current directory
agentctx init ./my-project     # Specific directory
agentctx init --dry-run        # Preview without writing
agentctx init --force          # Update agentctx sections, append missing content
agentctx init --no-agents      # Skip AGENTS.md
agentctx init --no-claude      # Skip CLAUDE.md
agentctx init --no-design      # Skip DESIGN.md
agentctx init --stack nextjs   # Force stack detection (nextjs, fastapi, monorepo, etc.)
```

On the first run, it also writes `.agentctx/pending-bootstrap.md` — a signal that tells Claude Code to scan the codebase and auto-document existing features and deploy commands.

### `agentctx update [dir]`

Re-analyzes your project and appends any sections missing from existing context files.
Never overwrites content you've already customized — safe to run at any time.

```bash
agentctx update            # Update current directory
agentctx update --dry-run  # Preview what would change
```

Use this after adding new workspaces, switching stacks, or when the tool detects new conventions (shadcn/ui, Tailwind, etc.).

### `agentctx status [dir]`

Shows the current state of context files and the detected stack.

```bash
agentctx status
```

Example output:
```
Context files in /my-project:
✓ CLAUDE.md   281 lines · agentctx sections ✓
✓ AGENTS.md    58 lines
✓ DESIGN.md    45 lines
  — FEATURES.md  not found
  — DEPLOY.md    not found

Stack: Monorepo — 5 workspaces · npm · typescript
  frontend       Next.js (typescript, npm)
  python-api     FastAPI (python, pip)
```

### `agentctx feature`

Document and track feature behaviors so agents never break existing flows.

```bash
agentctx feature add           # Document a new feature (interactive)
agentctx feature update [id]   # Update a feature — preserves previous behavior in history
agentctx feature list          # List all documented features
agentctx feature check <files> # Check if changed files affect documented features
agentctx feature scan          # Static-scan source code and auto-generate stubs (no API key)
```

**Example FEATURES.md entry:**
```markdown
## upload-button

**Files:** `src/components/UploadButton.tsx`, `src/api/upload.ts`
**Updated:** 2026-04-22

### Current behavior

**Flow:**
1. User clicks Upload
2. Modal opens
3. User selects file and submits
4. Returns upload confirmation

**Returns:** `{ id: string, url: string }`
```

### `agentctx deploy`

Store deployment commands with environment variable references.

```bash
agentctx deploy add            # Add a deploy environment (interactive)
agentctx deploy show           # Show current DEPLOY.md
agentctx deploy scan           # AI-scan project files to auto-detect deploy commands
                               # (requires ANTHROPIC_API_KEY)
```

### `agentctx validate [dir]`

Validate context files for structure and completeness.

```bash
agentctx validate
agentctx validate ./my-project
```

### `agentctx hook`

Manage git hooks for automatic context updates.

```bash
agentctx hook install          # Install post-commit hook
agentctx hook uninstall        # Remove the hook
```

After every `git commit`, the hook writes `.agentctx/pending-review.md` with the diff. Claude Code reads `CLAUDE.md`, finds the review instructions, and automatically updates `FEATURES.md` if behavior changed.

### `agentctx context [dir]`

Generate `context-bundle.md` — a compact snapshot of your project context for AI agents.

```bash
agentctx context                    # Generate context-bundle.md (~600 tokens)
agentctx context --dry-run          # Preview without writing
agentctx context --compact          # Minimal version — commands + rules only
agentctx context --no-features      # Skip feature registry
agentctx context --no-deploy        # Skip deploy environments
agentctx context --no-architecture  # Skip architecture section
```

The bundle extracts the essential sections from your existing context files (CLAUDE.md, DESIGN.md, FEATURES.md, DEPLOY.md) into a single ~600-token file. Agents read it at session start instead of exploring 5+ files.

- No API key required — fully static generation
- Runs SecretScanner before writing — deploy commands are never included, only env var names
- Add `context-bundle.md` to `.gitignore` (it is generated and disposable)

Every `agentctx init` template now includes a `## agentctx — Context Bundle` section in `CLAUDE.md` that instructs agents to read `context-bundle.md` first.

### `agentctx review [dir]`

Manually close the hook loop — useful when running outside Claude Code or to replay a pending review.

```bash
agentctx review                # Process .agentctx/pending-review.md and update FEATURES.md
agentctx review ./my-project   # Target a specific directory
```

Reads `.agentctx/pending-review.md`, finds every documented feature whose files changed, asks the AI whether the user-facing behavior changed, and updates `FEATURES.md` automatically.
Deletes `pending-review.md` when done. Requires `ANTHROPIC_API_KEY`.


## Supported stacks

| Stack | AGENTS.md | CLAUDE.md | DESIGN.md |
|-------|-----------|-----------|-----------|
| Next.js | ✅ | ✅ | ✅ |
| Express | ✅ | ✅ | ✅ |
| NestJS | ✅ | ✅ | ✅ |
| FastAPI | ✅ | ✅ | ✅ |
| Django | ✅ | ✅ | ✅ |
| Laravel | ✅ | ✅ | ✅ |
| + 14 detected | base | base | base |

Detection covers: Astro, Remix, Nuxt, Svelte, React, Vite, Fastify, Hono, Flask, Symfony, Rails, Go (Fiber/Gin/Echo), Expo, React Native.

## Adaptive merge — your content is always safe

agentctx never blindly overwrites your files. When a file already exists:

- **CLAUDE.md** — only updates the `## agentctx` sections at the end; everything above (your project rules, commands, conventions) is preserved untouched
- **AGENTS.md** — compares H2 section headings; only appends sections your file doesn't already have
- **DESIGN.md** — same H2-aware merge as AGENTS.md

Running `agentctx init --force` on a project that already has custom context files is safe.

## How the automatic loop works

```
git commit
    ↓
post-commit hook runs
    ↓
.agentctx/pending-review.md written (commit message + changed files + diff)
    ↓
    ├── (Claude Code) Next prompt → reads CLAUDE.md → sees review instructions
    │       ↓
    │   Analyzes diff → detects if feature behavior changed
    │       ↓
    │   Updates FEATURES.md (with history) + DEPLOY.md if needed
    │       ↓
    │   Deletes pending-review.md
    │
    └── (any agent / CI) agentctx review
            ↓
        Finds affected features → calls AI per feature
            ↓
        Updates FEATURES.md + deletes pending-review.md
```

The Claude Code path requires no API key — Claude Code is the AI.
The `agentctx review` path requires `ANTHROPIC_API_KEY`.

## Programmatic API

```typescript
import { StackDetector, ContextGenerator, registerStack } from 'agentctx';

// Detect stack
const detector = new StackDetector('./my-project');
const detection = await detector.detect();
console.log(detection.primaryStack.name); // "Next.js"

// Register a custom stack
registerStack('my-stack', {
  'AGENTS.md': '# Custom AGENTS.md template',
  'CLAUDE.md': '# Custom CLAUDE.md template',
});
```

## Security

- **Path traversal protection** — `PathGuard` prevents reading outside the project root
- **Secret detection** — `SecretScanner` detects 15+ patterns (AWS keys, OpenAI, Anthropic, JWTs, etc.) and blocks them before writing
- **Sensitive file filtering** — `SensitiveFileFilter` prevents accidental inclusion of `.env`, private keys, credentials files

## Requirements

- Node.js >= 20
- Git (for hook features)

## License

MIT
