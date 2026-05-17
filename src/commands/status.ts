import path from 'node:path';
import fs from 'node:fs/promises';
import type { Reporter } from '../ui/reporter.js';
import { StackDetector } from '../core/detector/index.js';

export interface StatusOptions {
  readonly targetDir: string;
}

// Archivos de contexto que agentctx gestiona
const CONTEXT_FILES = ['CLAUDE.md', 'AGENTS.md', 'DESIGN.md', 'FEATURES.md', 'DEPLOY.md'] as const;

interface FileStatus {
  readonly name: string;
  readonly exists: boolean;
  readonly lines: number;
  readonly hasAgentctxSections: boolean;
}

export class StatusCommand {
  constructor(private readonly reporter: Reporter) {}

  async execute(options: StatusOptions): Promise<void> {
    const { targetDir } = options;

    this.reporter.section(`Context files in ${targetDir}:`);

    const fileStatuses = await this.inspectContextFiles(targetDir);
    this.printFileStatuses(fileStatuses);

    this.reporter.blank();
    this.reporter.section('Detecting stack...');

    const detector = new StackDetector(targetDir);
    const detection = await detector.detect();

    const stackLabel = detection.isMonorepo
      ? `${detection.primaryStack.name} · ${detection.packageManager} · ${detection.language}`
      : `${detection.primaryStack.name} · ${detection.packageManager} · ${detection.language}`;

    this.reporter.info(`Stack: ${stackLabel}`);

    if (detection.isMonorepo && detection.workspaces.length > 0) {
      for (const ws of detection.workspaces) {
        this.reporter.info(`  ${ws.path.padEnd(14)} ${ws.stackName} (${ws.language}, ${ws.packageManager})`);
      }
    }
  }

  private async inspectContextFiles(targetDir: string): Promise<FileStatus[]> {
    const statuses: FileStatus[] = [];

    for (const name of CONTEXT_FILES) {
      const filePath = path.join(targetDir, name);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').length;
        const hasAgentctxSections = content.includes('## agentctx') || content.includes('agentctx —');
        statuses.push({ name, exists: true, lines, hasAgentctxSections });
      } catch {
        statuses.push({ name, exists: false, lines: 0, hasAgentctxSections: false });
      }
    }

    return statuses;
  }

  private printFileStatuses(statuses: FileStatus[]): void {
    // Calcular ancho máximo del nombre para alinear columnas
    const maxNameLen = Math.max(...statuses.map((s) => s.name.length));

    for (const status of statuses) {
      if (status.exists) {
        const paddedName = status.name.padEnd(maxNameLen);
        const lineInfo = `${status.lines} lines`.padStart(8);
        const sectionTag = status.hasAgentctxSections ? ' · agentctx sections ✓' : '';
        this.reporter.success(`${paddedName} ${lineInfo}${sectionTag}`);
      } else {
        const paddedName = status.name.padEnd(maxNameLen);
        this.reporter.info(`— ${paddedName}  not found`);
      }
    }
  }
}
