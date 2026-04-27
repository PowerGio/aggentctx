import path from 'node:path';
import fs from 'node:fs/promises';
import type { OutputFile, AgentctxConfig } from '../../types/index.js';

export interface WriteResult {
  readonly written: readonly string[];
  readonly skipped: readonly string[];
  readonly backed_up: readonly string[];
}

export class FileWriter {
  async write(
    files: readonly OutputFile[],
    config: AgentctxConfig,
    dryRun = false,
  ): Promise<WriteResult> {
    const written: string[] = [];
    const skipped: string[] = [];
    const backed_up: string[] = [];

    for (const file of files) {
      const exists = await this.exists(file.outputPath);

      if (exists && config.update.strategy === 'overwrite' && config.update.backup) {
        const backupPath = await this.backup(file.outputPath);
        backed_up.push(backupPath);
      }

      if (exists && config.update.strategy === 'merge') {
        if (!dryRun) {
          const merged = await this.mergeFile(file.outputPath, file.content);
          if (merged !== null) {
            await fs.writeFile(file.outputPath, merged, 'utf-8');
            written.push(file.filename);
          } else {
            skipped.push(file.filename);
          }
        } else {
          written.push(file.filename);
        }
        continue;
      }

      if (exists && config.update.strategy !== 'overwrite') {
        skipped.push(file.filename);
        continue;
      }

      if (!dryRun) {
        await fs.mkdir(path.dirname(file.outputPath), { recursive: true });
        await fs.writeFile(file.outputPath, file.content, 'utf-8');
        written.push(file.filename);
      } else {
        written.push(file.filename);
      }
    }

    return { written, skipped, backed_up };
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async mergeFile(filePath: string, newContent: string): Promise<string | null> {
    const existing = await fs.readFile(filePath, 'utf-8');

    // Already has agentctx sections — nothing to add
    if (existing.includes('agentctx — Commit Validation') || existing.includes('agentctx — First-Run Bootstrap')) {
      return null;
    }

    // Extract only the agentctx sections from the new content
    const agentctxMatch = newContent.match(/(## agentctx[\s\S]+)$/);
    if (!agentctxMatch) return null;

    const sections = agentctxMatch[1]!.trimEnd();
    return existing.trimEnd() + '\n\n' + sections + '\n';
  }

  private async backup(filePath: string): Promise<string> {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const backupDir = path.join(dir, '.agentctx-backup');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${base}.${timestamp}.bak`);

    await fs.mkdir(backupDir, { recursive: true });
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  }
}
