# aggentctx

> Generate and maintain AI agent context files for your codebase — so agents never start from zero.

AI coding agents lose context between sessions. They don't know how your features work, where credentials go, or what changed last week. `aggentctx` fixes that by generating structured context files and keeping them up to date automatically.

## What it does

- **`aggentctx init`** — detects your stack and generates `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`
- **`aggentctx feature add/update`** — documents feature behaviors with history, so agents know what each feature does and how it evolved
- **`aggentctx deploy add/scan`** — stores deploy commands with `$ENV_VAR` placeholders — no more forgotten credentials
- **`aggentctx hook install`** — installs a git post-commit hook that writes `.agentctx/pending-review.md` after every commit, so Claude Code automatically validates behavioral changes

## Quick start

```bash
npx aggentctx init
```

That's it. Run it in any project directory. aggentctx detects your stack, generates the context files, and writes a bootstrap signal so Claude Code documents your existing features on the next prompt.

## Installation

```bash
# Global
npm install -g aggentctx

# Or use directly with npx
npx aggentctx init
```

## Commands

### `aggentctx init [dir]`

Analyzes your project and generates context files.

```bash
aggentctx init                  # Current directory
aggentctx init ./my-project     # Specific directory
aggentctx init --dry-run        # Preview without writing
aggentctx init --force          # Overwrite existing files
aggentctx init --no-claude      # Skip CLAUDE.md
```

On the first run, it also writes `.agentctx/pending-bootstrap.md` — a signal that tells Claude Code to scan the codebase and auto-document existing features and deploy commands.

### `aggentctx feature`

Document and track feature behaviors so agents never break existing flows.

```bash
aggentctx feature add           # Document a new feature (interactive)
aggentctx feature update [id]   # Update a feature — preserves previous behavior in history
aggentctx feature list          # List all documented features
aggentctx feature check <files> # Check if changed files affect documented features
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

### `aggentctx deploy`

Store deployment commands with environment variable references.

```bash
aggentctx deploy add            # Add a deploy environment (interactive)
aggentctx deploy show           # Show current DEPLOY.md
aggentctx deploy scan           # AI-scan project files to auto-detect deploy commands
                                # (requires ANTHROPIC_API_KEY)
```

### `aggentctx hook`

Manage git hooks for automatic context updates.

```bash
aggentctx hook install          # Install post-commit hook
aggentctx hook uninstall        # Remove the hook
```

After every `git commit`, the hook writes `.agentctx/pending-review.md` with the diff. Claude Code reads `CLAUDE.md`, finds the review instructions, and automatically updates `FEATURES.md` if behavior changed.

### `aggentctx validate [dir]`

Validate context files for structure and completeness.

```bash
aggentctx validate
aggentctx validate ./my-project
```

## Supported stacks

| Stack | AGENTS.md | CLAUDE.md | DESIGN.md |
|-------|-----------|-----------|-----------|
| Next.js | ✅ | ✅ | ✅ |
| Express | ✅ | ✅ | ✅ |
| NestJS | ✅ | ✅ | ✅ |
| FastAPI | ✅ | ✅ | ✅ |
| Django | ✅ | ✅ | base |
| Laravel | ✅ | ✅ | base |
| + 14 detected | base | base | base |

Detection covers: Astro, Remix, Nuxt, Svelte, React, Vite, Fastify, Hono, Flask, Symfony, Rails, Go (Fiber/Gin/Echo), Expo, React Native.

## How the automatic loop works

```
git commit
    ↓
post-commit hook runs
    ↓
.agentctx/pending-review.md written (commit message + changed files + diff)
    ↓
Next prompt in Claude Code
    ↓
Claude reads CLAUDE.md → sees review instructions
    ↓
Analyzes diff → detects if feature behavior changed
    ↓
Updates FEATURES.md (with history) + DEPLOY.md if needed
    ↓
Deletes pending-review.md
```

No API keys required for the automatic loop — Claude Code is the AI.

## Programmatic API

```typescript
import { StackDetector, ContextGenerator, registerStack } from 'aggentctx';

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
