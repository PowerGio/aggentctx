import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FileWriter } from '../../../src/core/writer/index.js';
import type { OutputFile, AgentctxConfig } from '../../../src/types/index.js';
import { DEFAULT_CONFIG } from '../../../src/config/defaults.js';

const makeFile = (filename: 'CLAUDE.md' | 'AGENTS.md' | 'DESIGN.md', content: string, dir: string): OutputFile => ({
  filename,
  outputPath: path.join(dir, filename),
  content,
  templateUsed: 'test',
});

const makeConfig = (strategy: 'overwrite' | 'merge' | 'prompt', backup = false): AgentctxConfig => ({
  ...DEFAULT_CONFIG,
  output: { ...DEFAULT_CONFIG.output, agents: true, claude: true, design: true, directory: '' },
  update: { strategy, backup },
});

let tmpDir: string;
let writer: FileWriter;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentctx-writer-'));
  writer = new FileWriter();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('FileWriter', () => {
  describe('overwrite strategy', () => {
    it('writes a new file', async () => {
      const result = await writer.write([makeFile('CLAUDE.md', '# Hello', tmpDir)], makeConfig('overwrite'));
      expect(result.written).toContain('CLAUDE.md');
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toBe('# Hello');
    });

    it('overwrites an existing file', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Old', 'utf-8');
      await writer.write([makeFile('CLAUDE.md', '# New', tmpDir)], makeConfig('overwrite'));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toBe('# New');
    });

    it('creates a backup when backup=true', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Old', 'utf-8');
      const result = await writer.write([makeFile('CLAUDE.md', '# New', tmpDir)], makeConfig('overwrite', true));
      expect(result.backed_up).toHaveLength(1);
      expect(result.backed_up[0]).toContain('.agentctx-backup');
    });

    it('writes multiple files', async () => {
      const files = [
        makeFile('CLAUDE.md', '# Claude', tmpDir),
        makeFile('AGENTS.md', '# Agents', tmpDir),
        makeFile('DESIGN.md', '# Design', tmpDir),
      ];
      const result = await writer.write(files, makeConfig('overwrite'));
      expect(result.written).toHaveLength(3);
    });
  });

  describe('skip strategy (non-overwrite, non-merge)', () => {
    it('skips existing files', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Existing', 'utf-8');
      const result = await writer.write([makeFile('CLAUDE.md', '# New', tmpDir)], makeConfig('prompt'));
      expect(result.skipped).toContain('CLAUDE.md');
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toBe('# Existing');
    });

    it('writes new files even in skip mode', async () => {
      const result = await writer.write([makeFile('CLAUDE.md', '# New', tmpDir)], makeConfig('prompt'));
      expect(result.written).toContain('CLAUDE.md');
    });
  });

  describe('merge strategy', () => {
    it('appends agentctx sections to an existing CLAUDE.md that has no agentctx content', async () => {
      const existing = '# CLAUDE.md — my-project\n\n## Project\n\nSome existing content.\n';
      const newContent = '# CLAUDE.md\n\n## Project\n\nGenerated.\n\n## agentctx — First-Run Bootstrap\n\nBootstrap instructions.\n\n## agentctx — Commit Validation (automatic)\n\nValidation instructions.\n';
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), existing, 'utf-8');

      const result = await writer.write([makeFile('CLAUDE.md', newContent, tmpDir)], makeConfig('merge'));
      expect(result.written).toContain('CLAUDE.md');

      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('Some existing content.');
      expect(content).toContain('agentctx — Commit Validation');
      expect(content).toContain('agentctx — First-Run Bootstrap');
    });

    it('skips merge if agentctx sections already present', async () => {
      const existing = '# CLAUDE.md\n\n## agentctx — Commit Validation (automatic)\n\nAlready here.\n';
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), existing, 'utf-8');

      const result = await writer.write([makeFile('CLAUDE.md', '# New', tmpDir)], makeConfig('merge'));
      expect(result.skipped).toContain('CLAUDE.md');
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('Already here.');
    });

    it('skips merge if new content has no agentctx sections', async () => {
      const existing = '# Existing\n';
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), existing, 'utf-8');

      const result = await writer.write([makeFile('CLAUDE.md', '# New without agentctx', tmpDir)], makeConfig('merge'));
      expect(result.skipped).toContain('CLAUDE.md');
    });

    it('writes new file normally in merge mode (no existing file)', async () => {
      const result = await writer.write([makeFile('CLAUDE.md', '# Brand new', tmpDir)], makeConfig('merge'));
      expect(result.written).toContain('CLAUDE.md');
    });
  });
});
