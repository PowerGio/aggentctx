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

    it('overwrites an existing AGENTS.md (non-claude file)', async () => {
      await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Old', 'utf-8');
      await writer.write([makeFile('AGENTS.md', '# New', tmpDir)], makeConfig('overwrite'));
      const content = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
      expect(content).toBe('# New');
    });

    it('CLAUDE.md is always section-merged even with overwrite strategy — preserves existing content', async () => {
      // CLAUDE.md must never be fully overwritten to protect existing project configuration.
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Old config with no agentctx sections', 'utf-8');
      const newContent = '# New\n\n## agentctx — First-Run Bootstrap\n\nNew bootstrap.\n';
      await writer.write([makeFile('CLAUDE.md', newContent, tmpDir)], makeConfig('overwrite'));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      // Old content preserved, agentctx sections appended
      expect(content).toContain('Old config with no agentctx sections');
      expect(content).toContain('agentctx — First-Run Bootstrap');
    });

    it('creates a backup for AGENTS.md when backup=true and strategy=overwrite', async () => {
      await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Old', 'utf-8');
      const result = await writer.write([makeFile('AGENTS.md', '# New', tmpDir)], makeConfig('overwrite', true));
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

    it('skips write when new content has no agentctx sections (nothing to add)', async () => {
      const existing = '# CLAUDE.md\n\n## agentctx — Commit Validation (automatic)\n\nAlready here.\n';
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), existing, 'utf-8');

      // New content has no agentctx sections — nothing to merge → skipped
      const result = await writer.write([makeFile('CLAUDE.md', '# New without agentctx', tmpDir)], makeConfig('merge'));
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

  describe('CLAUDE.md protection (always-merge regardless of strategy)', () => {
    const nxtConfig = `# CLAUDE.md — Atlas\n\n## NXT AI Development Framework\n\nSlash commands: /nxt/dev, /nxt/qa\nAgents: 47 specialized agents\n\n## Rules\n\n- Always use NXT agents\n- Never hardcode secrets\n`;
    const agentctxSections = `## agentctx — First-Run Bootstrap\n\nBootstrap instructions.\n\n## agentctx — Commit Validation (automatic)\n\nValidation instructions.\n\n> This file is managed by agentctx. Do not remove this section.\n`;
    const generatedClaude = `# CLAUDE.md — Atlas\n\n## Project\n\nGenerated content.\n\n${agentctxSections}`;

    it('preserves existing user content when strategy is overwrite', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), nxtConfig, 'utf-8');

      const result = await writer.write([makeFile('CLAUDE.md', generatedClaude, tmpDir)], makeConfig('overwrite'));
      expect(result.written).toContain('CLAUDE.md');

      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      // Must preserve existing user content (NXT framework config)
      expect(content).toContain('NXT AI Development Framework');
      expect(content).toContain('Slash commands: /nxt/dev');
      // Must append agentctx sections
      expect(content).toContain('agentctx — First-Run Bootstrap');
      expect(content).toContain('agentctx — Commit Validation');
    });

    it('does NOT fully overwrite CLAUDE.md even with overwrite strategy + backup=true', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), nxtConfig, 'utf-8');

      await writer.write([makeFile('CLAUDE.md', generatedClaude, tmpDir)], makeConfig('overwrite', true));

      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      // The 200-line NXT config must survive
      expect(content).toContain('NXT AI Development Framework');
    });

    it('updates existing agentctx sections instead of skipping', async () => {
      const oldSections = `## agentctx — First-Run Bootstrap\n\nOLD instructions.\n`;
      const existingWithOldSections = nxtConfig.trimEnd() + '\n\n' + oldSections;
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), existingWithOldSections, 'utf-8');

      const newSections = `## agentctx — First-Run Bootstrap\n\nNEW instructions.\n\n## agentctx — Commit Validation (automatic)\n\nNew validation.\n`;
      const newGenerated = `# CLAUDE.md\n\n## Project\n\nNew.\n\n${newSections}`;

      const result = await writer.write([makeFile('CLAUDE.md', newGenerated, tmpDir)], makeConfig('merge'));
      expect(result.written).toContain('CLAUDE.md');

      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      // Old agentctx content replaced by new
      expect(content).not.toContain('OLD instructions');
      expect(content).toContain('NEW instructions');
      expect(content).toContain('New validation');
      // User content preserved
      expect(content).toContain('NXT AI Development Framework');
    });

    it('skips write when agentctx sections are identical', async () => {
      const existing = nxtConfig.trimEnd() + '\n\n' + agentctxSections;
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), existing, 'utf-8');

      // Same agentctx sections → no change needed
      const result = await writer.write([makeFile('CLAUDE.md', generatedClaude, tmpDir)], makeConfig('merge'));
      expect(result.skipped).toContain('CLAUDE.md');
    });
  });
});
