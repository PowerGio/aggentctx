# aggentctx

> Keep your AI agent in the loop — automatically.

You know that feeling when you open a new Claude Code session and have to re-explain your entire project from scratch? That's the problem aggentctx solves.

One command generates context files (`AGENTS.md`, `CLAUDE.md`, `DESIGN.md`) tailored to your stack. A git hook keeps them up to date after every commit — no manual work, no forgotten changes.

## Get started in 10 seconds

```bash
npx aggentctx init
```

That's it. aggentctx scans your project, detects your stack, and writes the context files. The next time you open Claude Code, it already knows how your project works.

## Installation

```bash
# Global — use it anywhere
npm install -g aggentctx

# Or just run it directly
npx aggentctx init
```

## What you get

Running `aggentctx init` generates three files:

- **`AGENTS.md`** — stack, architecture, directory structure, and workflow instructions for any AI agent
- **`CLAUDE.md`** — Claude Code-specific rules, commands, and the automatic review instructions
- **`DESIGN.md`** — API conventions and design patterns for your stack

Plus a bootstrap signal (`.agentctx/pending-bootstrap.md`) that tells Claude Code to scan your existing features and document them on the next prompt — so even old projects start with full context.

## Commands

### `aggentctx init [dir]`

Detects your stack and writes the context files. Safe to run on existing projects — it merges into your current `CLAUDE.md` without overwriting your content.

```bash
aggentctx init                  # current directory
aggentctx init ./my-project     # specific directory
aggentctx init --dry-run        # preview what would be written
aggentctx init --force          # overwrite everything
aggentctx init --no-claude      # skip CLAUDE.md
```

---

### `aggentctx feature`

Document how your features actually work — so agents don't accidentally break them.

```bash
aggentctx feature add           # document a new feature (interactive)
aggentctx feature update [id]   # update a feature, old behavior moves to history
aggentctx feature list          # see everything documented so far
aggentctx feature check <files> # check if changed files touch any documented feature
```

Example entry in `FEATURES.md`:

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

---

### `aggentctx deploy`

Store your deploy commands with `$ENV_VAR` placeholders — no more digging through Slack to find that staging command with the credentials.

```bash
aggentctx deploy add            # add a deploy environment (interactive)
aggentctx deploy show           # show current DEPLOY.md
aggentctx deploy scan           # auto-detect deploy commands from your project files
                                # (requires ANTHROPIC_API_KEY)
```

---

### `aggentctx hook`

Install a git hook that writes a pending review file after every commit. Claude Code picks it up automatically on your next prompt and updates `FEATURES.md` if anything changed.

```bash
aggentctx hook install          # set it up
aggentctx hook uninstall        # remove it
```

No API keys needed — Claude Code is the AI doing the review.

---

### `aggentctx validate [dir]`

Check that your context files are complete and well-structured.

```bash
aggentctx validate
aggentctx validate ./my-project
```

## How the automatic loop works

Once the hook is installed, everything happens on its own:

```
you run: git commit
              ↓
    hook writes .agentctx/pending-review.md
    (commit message + changed files + diff)
              ↓
    you open Claude Code and type anything
              ↓
    Claude reads CLAUDE.md → sees the review instructions
              ↓
    analyzes the diff → did any feature behavior change?
              ↓
    updates FEATURES.md if needed (old behavior goes to history)
              ↓
    deletes pending-review.md → done
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

Also detects: Astro, Remix, Nuxt, Svelte, React, Vite, Fastify, Hono, Flask, Symfony, Rails, Go (Fiber/Gin/Echo), Expo, React Native.

## Programmatic API

```typescript
import { StackDetector, ContextGenerator, registerStack } from 'aggentctx';

// detect the stack
const detector = new StackDetector('./my-project');
const detection = await detector.detect();
console.log(detection.primaryStack.name); // "Next.js"

// register a custom stack with your own templates
registerStack('my-stack', {
  'AGENTS.md': '# Custom AGENTS.md template',
  'CLAUDE.md': '# Custom CLAUDE.md template',
});
```

## Security

aggentctx never reads or writes credentials. Before writing any file it runs three checks:

- **Path traversal protection** — stays inside the project root, always
- **Secret detection** — scans for 15+ patterns (AWS keys, OpenAI, Anthropic, JWTs, etc.) and blocks the file if found
- **Sensitive file filtering** — ignores `.env`, private keys, and credentials files entirely

## Requirements

- Node.js >= 20
- Git (for hook features)

## License

MIT
