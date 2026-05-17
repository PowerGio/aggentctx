import path from 'node:path';
import fs from 'node:fs/promises';
import type { OutputFile, AgentctxConfig } from '../../types/index.js';

export interface WriteResult {
  readonly written: readonly string[];
  readonly skipped: readonly string[];
  readonly backed_up: readonly string[];
}

// Marker that delimits agentctx-managed content inside CLAUDE.md.
// Using a comment marker makes it robust even if section headings are renamed.
const AGENTCTX_START = '\n## agentctx';

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

      // CLAUDE.md always uses section-aware merge to protect existing project config,
      // regardless of the chosen strategy (including --force / 'overwrite').
      if (file.filename === 'CLAUDE.md' && exists) {
        if (!dryRun) {
          const merged = await this.mergeClaude(file.outputPath, file.content);
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

  private exists(filePath: string): Promise<boolean> {
    return fs.access(filePath).then(() => true).catch(() => false);
  }

  /**
   * Section-aware merge for CLAUDE.md.
   * Preserves all user content above the first `## agentctx` block and
   * replaces/appends the agentctx-managed sections (bootstrap + commit validation).
   * Returns null when the file is already identical to what would be written.
   */
  private async mergeClaude(filePath: string, newContent: string): Promise<string | null> {
    const existing = await fs.readFile(filePath, 'utf-8');

    const newSectionsIdx = newContent.indexOf(AGENTCTX_START);
    if (newSectionsIdx === -1) return null;

    const newSections = newContent.substring(newSectionsIdx + 1).trimEnd(); // skip leading \n

    const existingSectionsIdx = existing.indexOf(AGENTCTX_START);

    if (existingSectionsIdx !== -1) {
      // Replace existing agentctx sections so updates (e.g. new bootstrap steps) propagate.
      const preserved = existing.substring(0, existingSectionsIdx).trimEnd();
      const merged = preserved + '\n\n' + newSections + '\n';
      if (merged === existing) return null; // already identical
      return merged;
    }

    // No agentctx sections yet — append them while keeping all existing content.
    return existing.trimEnd() + '\n\n' + newSections + '\n';
  }

  private async mergeFile(filePath: string, newContent: string): Promise<string | null> {
    const existing = await fs.readFile(filePath, 'utf-8');

    if (existing.includes('agentctx — Commit Validation') || existing.includes('agentctx — First-Run Bootstrap')) {
      return null;
    }

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
