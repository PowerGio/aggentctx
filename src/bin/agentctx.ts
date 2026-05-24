import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Command } from 'commander';
import { ConsoleReporter } from '../ui/reporter.js';
import { InitCommand } from '../commands/init.js';
import { ValidateCommand } from '../commands/validate.js';
import { FeatureCommand } from '../commands/feature.js';
import { DeployCommand } from '../commands/deploy.js';
import { HookCommand } from '../commands/hook.js';
import { UpdateCommand } from '../commands/update.js';
import { StatusCommand } from '../commands/status.js';
import { ReviewCommand } from '../commands/review.js';
import { ContextCommand } from '../commands/context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8')) as { version: string };

const program = new Command();

program
  .name('agentctx')
  .description('Generate and maintain AI agent context files for your codebase')
  .version(pkg.version ?? '0.0.0');

// ─── init ────────────────────────────────────────────────────────────────────

const VALID_STACKS = [
  'nextjs', 'react', 'astro', 'remix', 'nuxt', 'svelte', 'vite',
  'express', 'fastify', 'nestjs', 'hono',
  'django', 'fastapi', 'flask',
  'laravel', 'symfony',
  'rails',
  'go-fiber', 'go-gin', 'go-echo',
  'expo', 'react-native',
  'design-system',
  'monorepo',
  'unknown',
];

program
  .command('init [dir]')
  .description('Analyze your project and generate AGENTS.md, CLAUDE.md, DESIGN.md')
  .option('--dry-run', 'Preview without writing files', false)
  .option('-f, --force', 'Update agentctx sections and append missing content (never blindly overwrites)', false)
  .option('--no-agents', 'Skip AGENTS.md')
  .option('--no-claude', 'Skip CLAUDE.md')
  .option('--no-design', 'Skip DESIGN.md')
  .option('--stack <stack>', 'Force a specific stack (e.g. nextjs, fastapi, monorepo, django)')
  .action(async (dir: string | undefined, opts: Record<string, unknown>) => {
    const targetDir = dir ?? process.cwd();
    const reporter = new ConsoleReporter();
    try {
      const stackArg = opts['stack'] as string | undefined;
      if (stackArg && !VALID_STACKS.includes(stackArg)) {
        reporter.error(`Unknown stack: "${stackArg}". Valid options: ${VALID_STACKS.join(', ')}`);
        process.exit(1);
      }
      await new InitCommand(reporter).execute({
        targetDir,
        dryRun: opts['dryRun'] === true,
        force: opts['force'] === true,
        config: {
          output: {
            agents: opts['agents'] !== false,
            claude: opts['claude'] !== false,
            design: opts['design'] !== false,
            directory: targetDir,
          },
          detection: {
            ...(stackArg ? { forceStack: stackArg as import('../types/index.js').StackId } : {}),
            excludeDirs: [],
          },
        },
      });
    } catch (e) {
      if (e instanceof Error) {
        reporter.error(e.message);
        if (e.cause instanceof Error) {
          reporter.info(`Caused by: ${e.cause.message}`);
        }
      } else {
        reporter.error('Unexpected error');
      }
      process.exit(1);
    }
  });

// ─── validate ────────────────────────────────────────────────────────────────

program
  .command('validate [dir]')
  .description('Validate context files for structure and completeness')
  .action(async (dir: string | undefined) => {
    const targetDir = dir ?? process.cwd();
    const reporter = new ConsoleReporter();
    try {
      await new ValidateCommand(reporter).execute({ targetDir });
    } catch (e) {
      if (e instanceof Error) {
        reporter.error(e.message);
        if (e.cause instanceof Error) {
          reporter.info(`Caused by: ${e.cause.message}`);
        }
      } else {
        reporter.error('Unexpected error');
      }
      process.exit(1);
    }
  });

// ─── feature ─────────────────────────────────────────────────────────────────

const feature = program
  .command('feature')
  .description('Document and track feature behaviors so agents never break existing flows');

feature
  .command('add')
  .description('Document a new feature (interactive)')
  .option('-d, --dir <dir>', 'Project directory', process.cwd())
  .action(async (opts: { dir: string }) => {
    const reporter = new ConsoleReporter();
    try {
      await new FeatureCommand(reporter).add(opts.dir);
    } catch (e) {
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
      process.exit(1);
    }
  });

feature
  .command('update [id]')
  .description('Update a feature behavior and preserve the history')
  .option('-d, --dir <dir>', 'Project directory', process.cwd())
  .action(async (id: string | undefined, opts: { dir: string }) => {
    const reporter = new ConsoleReporter();
    try {
      await new FeatureCommand(reporter).update(opts.dir, id);
    } catch (e) {
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
      process.exit(1);
    }
  });

feature
  .command('list')
  .description('List all documented features')
  .option('-d, --dir <dir>', 'Project directory', process.cwd())
  .action(async (opts: { dir: string }) => {
    const reporter = new ConsoleReporter();
    try {
      await new FeatureCommand(reporter).list(opts.dir);
    } catch (e) {
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
      process.exit(1);
    }
  });

feature
  .command('check [files...]')
  .description('Check if changed files affect documented features (used by git hook)')
  .option('-d, --dir <dir>', 'Project directory', process.cwd())
  .action(async (files: string[], opts: { dir: string }) => {
    const reporter = new ConsoleReporter();
    try {
      await new FeatureCommand(reporter).check(opts.dir, files);
    } catch {
      // silent in hook context
    }
  });

feature
  .command('scan')
  .description('Static-scan source code and auto-generate feature stubs (no API key needed)')
  .option('-d, --dir <dir>', 'Project directory', process.cwd())
  .action(async (opts: { dir: string }) => {
    const reporter = new ConsoleReporter();
    try {
      await new FeatureCommand(reporter).scan(opts.dir);
    } catch (e) {
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
      process.exit(1);
    }
  });

// ─── deploy ──────────────────────────────────────────────────────────────────

const deploy = program
  .command('deploy')
  .description('Document deployment commands with environment variable references');

deploy
  .command('add')
  .description('Add a deployment environment (interactive)')
  .option('-d, --dir <dir>', 'Project directory', process.cwd())
  .action(async (opts: { dir: string }) => {
    const reporter = new ConsoleReporter();
    try {
      await new DeployCommand(reporter).add(opts.dir);
    } catch (e) {
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
      process.exit(1);
    }
  });

deploy
  .command('show')
  .description('Show the current DEPLOY.md')
  .option('-d, --dir <dir>', 'Project directory', process.cwd())
  .action(async (opts: { dir: string }) => {
    const reporter = new ConsoleReporter();
    try {
      await new DeployCommand(reporter).show(opts.dir);
    } catch (e) {
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
      process.exit(1);
    }
  });

deploy
  .command('scan')
  .description('AI-scan project files to auto-detect deploy commands (requires ANTHROPIC_API_KEY)')
  .option('-d, --dir <dir>', 'Project directory', process.cwd())
  .action(async (opts: { dir: string }) => {
    const reporter = new ConsoleReporter();
    try {
      await new DeployCommand(reporter).scan(opts.dir);
    } catch (e) {
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
      process.exit(1);
    }
  });

// ─── hook ────────────────────────────────────────────────────────────────────

const hook = program
  .command('hook')
  .description('Manage git hooks for automatic context updates');

hook
  .command('install')
  .description('Install post-commit hook — context updates automatically after each commit')
  .option('-d, --dir <dir>', 'Project directory', process.cwd())
  .action(async (opts: { dir: string }) => {
    const reporter = new ConsoleReporter();
    try {
      await new HookCommand(reporter).install(opts.dir);
    } catch (e) {
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
      process.exit(1);
    }
  });

hook
  .command('uninstall')
  .description('Remove the agentctx post-commit hook')
  .option('-d, --dir <dir>', 'Project directory', process.cwd())
  .action(async (opts: { dir: string }) => {
    const reporter = new ConsoleReporter();
    try {
      await new HookCommand(reporter).uninstall(opts.dir);
    } catch (e) {
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
      process.exit(1);
    }
  });

// ─── update ──────────────────────────────────────────────────────────────────

program
  .command('update [dir]')
  .description('Add missing context sections to existing files (merge-only, never overwrites)')
  .option('--dry-run', 'Preview without writing files', false)
  .action(async (dir: string | undefined, opts: Record<string, unknown>) => {
    const targetDir = dir ?? process.cwd();
    const reporter = new ConsoleReporter();
    try {
      await new UpdateCommand(reporter).execute({
        targetDir,
        dryRun: opts['dryRun'] === true,
      });
    } catch (e) {
      if (e instanceof Error) {
        reporter.error(e.message);
        if (e.cause instanceof Error) {
          reporter.info(`Caused by: ${e.cause.message}`);
        }
      } else {
        reporter.error('Unexpected error');
      }
      process.exit(1);
    }
  });

// ─── status ──────────────────────────────────────────────────────────────────

program
  .command('status [dir]')
  .description('Show the state of context files and detected stack')
  .action(async (dir: string | undefined) => {
    const targetDir = dir ?? process.cwd();
    const reporter = new ConsoleReporter();
    try {
      await new StatusCommand(reporter).execute({ targetDir });
    } catch (e) {
      if (e instanceof Error) {
        reporter.error(e.message);
        if (e.cause instanceof Error) {
          reporter.info(`Caused by: ${e.cause.message}`);
        }
      } else {
        reporter.error('Unexpected error');
      }
      process.exit(1);
    }
  });

// ─── review ──────────────────────────────────────────────────────────────────

program
  .command('review [dir]')
  .description('Process pending-review.md — analyze diff and update FEATURES.md automatically (requires ANTHROPIC_API_KEY)')
  .action(async (dir: string | undefined) => {
    const targetDir = dir ?? process.cwd();
    const reporter = new ConsoleReporter();
    try {
      await new ReviewCommand(reporter).execute(targetDir);
    } catch (e) {
      if (e instanceof Error) {
        reporter.error(e.message);
        if (e.cause instanceof Error) {
          reporter.info(`Caused by: ${e.cause.message}`);
        }
      } else {
        reporter.error('Unexpected error');
      }
      process.exit(1);
    }
  });

// ─── context ─────────────────────────────────────────────────────────────────

program
  .command('context [dir]')
  .description('Generate context-bundle.md — compact context snapshot for AI agents (no API key needed)')
  .option('--dry-run',          'Preview to stdout without writing',      false)
  .option('--compact',          'Minimal output — commands + rules only', false)
  .option('--no-features',      'Exclude feature registry section')
  .option('--no-deploy',        'Exclude deploy environments section')
  .option('--no-architecture',  'Exclude architecture section')
  .option('--no-rules',         'Exclude rules section')
  .action(async (dir: string | undefined, opts: Record<string, unknown>) => {
    const targetDir = dir ?? process.cwd();
    const reporter = new ConsoleReporter();
    try {
      await new ContextCommand(reporter).execute({
        targetDir,
        dryRun:          opts['dryRun']          === true,
        compact:         opts['compact']         === true,
        noFeatures:      opts['features']        === false,
        noDeploy:        opts['deploy']          === false,
        noArchitecture:  opts['architecture']    === false,
        noRules:         opts['rules']           === false,
      });
    } catch (e) {
      if (e instanceof Error) {
        reporter.error(e.message);
        if (e.cause instanceof Error) reporter.info(`Caused by: ${e.cause.message}`);
      } else {
        reporter.error('Unexpected error');
      }
      process.exit(1);
    }
  });

// ─── process ─────────────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  process.stdout.write('\n');
  process.exit(130);
});

program.parseAsync(process.argv).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : 'Fatal error');
  process.exit(1);
});
