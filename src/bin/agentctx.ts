import { Command } from 'commander';
import { ConsoleReporter } from '../ui/reporter.js';
import { InitCommand } from '../commands/init.js';
import { ValidateCommand } from '../commands/validate.js';
import { FeatureCommand } from '../commands/feature.js';
import { DeployCommand } from '../commands/deploy.js';
import { HookCommand } from '../commands/hook.js';

const program = new Command();

program
  .name('agentctx')
  .description('Generate and maintain AI agent context files for your codebase')
  .version('0.1.0');

// ─── init ────────────────────────────────────────────────────────────────────

program
  .command('init [dir]')
  .description('Analyze your project and generate AGENTS.md, CLAUDE.md, DESIGN.md')
  .option('--dry-run', 'Preview without writing files', false)
  .option('-f, --force', 'Overwrite existing context files', false)
  .option('--no-agents', 'Skip AGENTS.md')
  .option('--no-claude', 'Skip CLAUDE.md')
  .option('--no-design', 'Skip DESIGN.md')
  .action(async (dir: string | undefined, opts: Record<string, unknown>) => {
    const targetDir = dir ?? process.cwd();
    const reporter = new ConsoleReporter();
    try {
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
        },
      });
    } catch (e) {
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
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
      reporter.error(e instanceof Error ? e.message : 'Unexpected error');
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

// ─── process ─────────────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  process.stdout.write('\n');
  process.exit(130);
});

program.parseAsync(process.argv).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : 'Fatal error');
  process.exit(1);
});
