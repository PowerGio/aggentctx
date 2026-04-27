import path from 'node:path';
import fs from 'node:fs/promises';
import type { Reporter } from '../ui/reporter.js';
import type { AgentctxConfig } from '../types/index.js';
import { StackDetector } from '../core/detector/index.js';
import { ProjectAnalyzer } from '../core/analyzer/index.js';
import { ContextGenerator } from '../core/generator/index.js';
import { FileWriter } from '../core/writer/index.js';
import { SensitiveFileFilter } from '../security/sensitive-files.js';
import { DEFAULT_CONFIG } from '../config/defaults.js';

export interface InitOptions {
  readonly targetDir: string;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly config?: Partial<AgentctxConfig>;
}

export class InitCommand {
  constructor(private readonly reporter: Reporter) {}

  async execute(options: InitOptions): Promise<void> {
    const { targetDir, dryRun, force } = options;
    const config: AgentctxConfig = {
      ...DEFAULT_CONFIG,
      ...options.config,
      output: {
        ...DEFAULT_CONFIG.output,
        ...options.config?.output,
        directory: targetDir,
      },
      update: {
        ...DEFAULT_CONFIG.update,
        ...options.config?.update,
        strategy: force ? 'overwrite' : (options.config?.update?.strategy ?? 'merge'),
      },
    };

    this.reporter.section('Detecting project stack...');

    const detector = new StackDetector(targetDir);
    const detection = await detector.detect();

    this.reporter.info(`Stack: ${detection.primaryStack.name} (${detection.primaryStack.confidence})`);
    this.reporter.info(`Language: ${detection.language}`);
    this.reporter.info(`Package manager: ${detection.packageManager}`);
    if (detection.additionalStacks.length > 0) {
      this.reporter.info(`Also detected: ${detection.additionalStacks.map((s) => s.name).join(', ')}`);
    }

    this.reporter.section('Analyzing project...');

    const projectName = await this.resolveProjectName(targetDir);
    const analyzer = new ProjectAnalyzer(targetDir);
    const analysis = await analyzer.analyze(detection, projectName);

    this.reporter.section('Generating context files...');

    const generator = new ContextGenerator();
    const result = generator.generate(analysis, config);

    const writer = new FileWriter();

    if (dryRun) {
      this.reporter.blank();
      for (const file of result.files) {
        this.reporter.dryRun(`Would write: ${file.outputPath}`);
      }
      this.reporter.blank();
      this.reporter.info('Run without --dry-run to write files.');
      return;
    }

    const writeResult = await writer.write(result.files, config);

    this.reporter.blank();
    for (const f of writeResult.written) {
      this.reporter.success(`${f}`);
    }
    for (const f of writeResult.skipped) {
      this.reporter.warn(`${f} already exists — use --force to overwrite`);
    }
    for (const b of writeResult.backed_up) {
      this.reporter.info(`Backed up to ${b}`);
    }

    if (writeResult.written.length > 0) {
      this.reporter.blank();
      this.reporter.success(`Done! Context files written to ${targetDir}`);
      await this.writeBootstrapSignal(targetDir, detection, projectName);
    }
  }

  private async writeBootstrapSignal(
    targetDir: string,
    detection: Awaited<ReturnType<StackDetector['detect']>>,
    projectName: string,
  ): Promise<void> {
    const agentctxDir = path.join(targetDir, '.agentctx');
    await fs.mkdir(agentctxDir, { recursive: true });

    const additionalStacks = detection.additionalStacks.length > 0
      ? `\n- Additional: ${detection.additionalStacks.map((s) => s.name).join(', ')}`
      : '';

    const content = `# agentctx — First-Run Bootstrap Signal

> This file was created by \`agentctx init\` on ${new Date().toISOString().split('T')[0]}.
> Claude Code: read the bootstrap instructions in CLAUDE.md and act on them now.

## Project

- **Name:** ${projectName}
- **Stack:** ${detection.primaryStack.name}${additionalStacks}
- **Language:** ${detection.language}
- **Package manager:** ${detection.packageManager}

## What to do

1. FEATURES.md is empty — scan this codebase and document all user-facing features.
2. DEPLOY.md is empty — scan for deploy commands in Makefile, package.json scripts, CI files.
3. Delete this file when done.
`;

    await fs.writeFile(path.join(agentctxDir, 'pending-bootstrap.md'), content, 'utf-8');
    this.reporter.info('Bootstrap signal written — Claude Code will auto-document features on your next prompt.');
  }

  private async resolveProjectName(targetDir: string): Promise<string> {
    const tries = [
      async () => {
        const raw = await fs.readFile(path.join(targetDir, 'package.json'), 'utf-8');
        const pkg = JSON.parse(raw) as { name?: string };
        return pkg.name ?? null;
      },
      async () => {
        const raw = await fs.readFile(path.join(targetDir, 'composer.json'), 'utf-8');
        const composer = JSON.parse(raw) as { name?: string };
        return composer.name?.split('/')[1] ?? null;
      },
      async () => {
        const raw = await fs.readFile(path.join(targetDir, 'pyproject.toml'), 'utf-8');
        const match = /name\s*=\s*"([^"]+)"/.exec(raw);
        return match?.[1] ?? null;
      },
    ];

    for (const fn of tries) {
      try {
        const name = await fn();
        if (name) return name;
      } catch {
        // try next
      }
    }

    return path.basename(path.resolve(targetDir));
  }
}
