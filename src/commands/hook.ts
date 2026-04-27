import fs from 'node:fs/promises';
import path from 'node:path';
import type { Reporter } from '../ui/reporter.js';

const HOOK_SCRIPT = `#!/bin/sh
# BEGIN agentctx
# agentctx post-commit hook — do not edit between BEGIN/END markers
# Writes a pending-review file so Claude Code can validate behavioral changes automatically

CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only HEAD 2>/dev/null)

if [ -z "$CHANGED" ]; then
  exit 0
fi

DIFF=$(git diff HEAD~1 HEAD 2>/dev/null || git diff HEAD 2>/dev/null)
COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Write pending-review.md for Claude Code to pick up
mkdir -p .agentctx
cat > .agentctx/pending-review.md << AGENTCTX_EOF
# agentctx — Pending Review

> Generated automatically by the agentctx post-commit hook.
> Claude Code: read CLAUDE.md for instructions on how to process this file.

## Commit

- **Time:** $TIMESTAMP
- **Message:** $COMMIT_MSG

## Changed files

$(echo "$CHANGED" | sed 's/^/- /')

## Diff

\`\`\`diff
$DIFF
\`\`\`
AGENTCTX_EOF

echo ""
echo "[agentctx] Pending review written to .agentctx/pending-review.md"
echo "[agentctx] Claude Code will validate behavioral changes on your next prompt."
# END agentctx
`;

const GITIGNORE_ENTRIES = [
  '.agentctx-backup/',
  '.agentctx/',
];

export class HookCommand {
  constructor(private readonly reporter: Reporter) {}

  async install(projectRoot: string): Promise<void> {
    const gitDir = path.join(projectRoot, '.git');
    const hooksDir = path.join(gitDir, 'hooks');
    const hookPath = path.join(hooksDir, 'post-commit');

    try {
      await fs.access(gitDir);
    } catch {
      this.reporter.error('Not a git repository. Run `git init` first.');
      return;
    }

    await fs.mkdir(hooksDir, { recursive: true });

    try {
      const existing = await fs.readFile(hookPath, 'utf-8');
      if (existing.includes('agentctx')) {
        this.reporter.warn('agentctx hook already installed.');
        return;
      }
      await fs.writeFile(hookPath, existing.trimEnd() + '\n\n' + HOOK_SCRIPT);
    } catch {
      await fs.writeFile(hookPath, HOOK_SCRIPT);
    }

    await fs.chmod(hookPath, 0o755);

    await this.updateGitignore(projectRoot);

    this.reporter.success('Git hook installed at .git/hooks/post-commit');
    this.reporter.info('From now on, agentctx runs automatically after each commit.');
  }

  async uninstall(projectRoot: string): Promise<void> {
    const hookPath = path.join(projectRoot, '.git', 'hooks', 'post-commit');

    try {
      const content = await fs.readFile(hookPath, 'utf-8');
      if (!content.includes('BEGIN agentctx')) {
        this.reporter.warn('agentctx hook not found in post-commit.');
        return;
      }

      // Remove the entire block between BEGIN agentctx and END agentctx (inclusive)
      const cleaned = content
        .replace(/\n?# BEGIN agentctx[\s\S]*?# END agentctx\n?/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (cleaned === '#!/bin/sh' || cleaned === '') {
        await fs.unlink(hookPath);
      } else {
        await fs.writeFile(hookPath, cleaned + '\n');
      }

      this.reporter.success('agentctx hook removed from .git/hooks/post-commit');
    } catch {
      this.reporter.warn('No post-commit hook found.');
    }
  }

  private async updateGitignore(projectRoot: string): Promise<void> {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    let content = '';

    try {
      content = await fs.readFile(gitignorePath, 'utf-8');
    } catch {
      // no .gitignore yet
    }

    const missing = GITIGNORE_ENTRIES.filter((entry) => !content.includes(entry));
    if (missing.length === 0) return;

    const addition = '\n# agentctx\n' + missing.join('\n') + '\n';
    await fs.writeFile(gitignorePath, content + addition, 'utf-8');
    this.reporter.info('Updated .gitignore with agentctx entries.');
  }
}
