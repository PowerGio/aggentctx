import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ContextValidator } from '../../../src/core/validator/index.js';

let tmpDir: string;
let validator: ContextValidator;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentctx-validator-'));
  validator = new ContextValidator();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const write = (name: string, content: string, dir: string) =>
  fs.writeFile(path.join(dir, name), content, 'utf-8');

describe('ContextValidator', () => {
  describe('validateFile — AGENTS.md', () => {
    it('passes a valid AGENTS.md', async () => {
      await write('AGENTS.md', '## Project Overview\n\nDetails here.\n\n## Agent Workflow\n\n1. Read code.\n', tmpDir);
      const result = await validator.validateFile(path.join(tmpDir, 'AGENTS.md'));
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when missing required sections', async () => {
      await write('AGENTS.md', '# Just a title\n\nSome content.\n', tmpDir);
      const result = await validator.validateFile(path.join(tmpDir, 'AGENTS.md'));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_SECTION')).toBe(true);
    });

    it('reports file not found error', async () => {
      const result = await validator.validateFile(path.join(tmpDir, 'AGENTS.md'));
      expect(result.isValid).toBe(false);
      expect(result.errors[0]!.code).toBe('FILE_NOT_FOUND');
      expect(result.score).toBe(0);
    });
  });

  describe('validateFile — CLAUDE.md', () => {
    it('passes a valid CLAUDE.md', async () => {
      await write('CLAUDE.md', '# CLAUDE.md\n\n## Project\n\nmy-app — Next.js\n', tmpDir);
      const result = await validator.validateFile(path.join(tmpDir, 'CLAUDE.md'));
      expect(result.isValid).toBe(true);
    });

    it('fails when missing ## Project section', async () => {
      await write('CLAUDE.md', '# CLAUDE.md\n\nNo project section here.\n', tmpDir);
      const result = await validator.validateFile(path.join(tmpDir, 'CLAUDE.md'));
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateFile — DESIGN.md', () => {
    it('passes a valid DESIGN.md', async () => {
      await write('DESIGN.md', '# DESIGN.md — my-app\n\nSome architecture notes.\n', tmpDir);
      const result = await validator.validateFile(path.join(tmpDir, 'DESIGN.md'));
      expect(result.isValid).toBe(true);
    });

    it('fails when missing # DESIGN.md header', async () => {
      await write('DESIGN.md', '## Just a section\n\nContent.\n', tmpDir);
      const result = await validator.validateFile(path.join(tmpDir, 'DESIGN.md'));
      expect(result.isValid).toBe(false);
    });
  });

  describe('warnings', () => {
    it('warns about unfilled placeholders', async () => {
      await write('AGENTS.md', '## Project Overview\n\n<!-- Add details here -->\n\n## Agent Workflow\n\nSteps.\n', tmpDir);
      const result = await validator.validateFile(path.join(tmpDir, 'AGENTS.md'));
      expect(result.warnings.some((w) => w.code === 'EMPTY_PLACEHOLDER')).toBe(true);
    });

    it('warns when content is very short', async () => {
      await write('CLAUDE.md', '## Project\n\nShort.\n', tmpDir);
      const result = await validator.validateFile(path.join(tmpDir, 'CLAUDE.md'));
      expect(result.warnings.some((w) => w.code === 'SPARSE_CONTENT')).toBe(true);
    });
  });

  describe('score', () => {
    it('returns score 100 for a clean valid file', async () => {
      const content = '## Project Overview\n\nA very detailed and complete overview of the project with enough content.\n\n## Agent Workflow\n\n1. Read the code carefully.\n2. Follow existing patterns.\n3. Test before submitting.\n';
      await write('AGENTS.md', content, tmpDir);
      const result = await validator.validateFile(path.join(tmpDir, 'AGENTS.md'));
      expect(result.score).toBe(100);
    });

    it('reduces score for errors', async () => {
      await write('AGENTS.md', '# Incomplete file\n', tmpDir);
      const result = await validator.validateFile(path.join(tmpDir, 'AGENTS.md'));
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('validateDirectory', () => {
    it('validates all three context files', async () => {
      await write('AGENTS.md', '## Project Overview\n\nDetails.\n\n## Agent Workflow\n\nSteps.\n', tmpDir);
      await write('CLAUDE.md', '## Project\n\nmy-app.\n', tmpDir);
      await write('DESIGN.md', '# DESIGN.md\n\nContent.\n', tmpDir);
      const results = await validator.validateDirectory(tmpDir);
      expect(results).toHaveLength(3);
    });

    it('reports not found for missing files', async () => {
      const results = await validator.validateDirectory(tmpDir);
      expect(results.every((r) => !r.isValid)).toBe(true);
      expect(results.every((r) => r.errors[0]?.code === 'FILE_NOT_FOUND')).toBe(true);
    });
  });
});
