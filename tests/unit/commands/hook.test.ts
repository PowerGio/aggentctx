import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { HookCommand } from '../../../src/commands/hook.js';

const makeReporter = () => {
  const logs: string[] = [];
  return {
    reporter: {
      info: (m: string) => logs.push(`info:${m}`),
      success: (m: string) => logs.push(`success:${m}`),
      warn: (m: string) => logs.push(`warn:${m}`),
      error: (m: string) => logs.push(`error:${m}`),
      section: (m: string) => logs.push(`section:${m}`),
      blank: () => {},
      dryRun: (m: string) => logs.push(`dryRun:${m}`),
    },
    logs,
  };
};

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentctx-hook-test-'));
  await fs.mkdir(path.join(tmpDir, '.git', 'hooks'), { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('HookCommand', () => {
  describe('install', () => {
    it('creates post-commit hook file', async () => {
      const { reporter } = makeReporter();
      await new HookCommand(reporter).install(tmpDir);

      const hookPath = path.join(tmpDir, '.git', 'hooks', 'post-commit');
      const content = await fs.readFile(hookPath, 'utf-8');
      expect(content).toContain('agentctx');
      expect(content).toContain('pending-review.md');
    });

    it('makes the hook file executable', async () => {
      const { reporter } = makeReporter();
      await new HookCommand(reporter).install(tmpDir);

      const hookPath = path.join(tmpDir, '.git', 'hooks', 'post-commit');
      const stat = await fs.stat(hookPath);
      expect(stat.mode & 0o111).toBeTruthy();
    });

    it('appends to existing hook that does not contain agentctx', async () => {
      const hookPath = path.join(tmpDir, '.git', 'hooks', 'post-commit');
      await fs.writeFile(hookPath, '#!/bin/sh\necho "existing hook"\n');

      const { reporter } = makeReporter();
      await new HookCommand(reporter).install(tmpDir);

      const content = await fs.readFile(hookPath, 'utf-8');
      expect(content).toContain('existing hook');
      expect(content).toContain('agentctx');
    });

    it('skips install if agentctx hook already present', async () => {
      const { reporter, logs } = makeReporter();
      await new HookCommand(reporter).install(tmpDir);
      await new HookCommand(reporter).install(tmpDir);

      expect(logs.some((l) => l.includes('already installed'))).toBe(true);
    });

    it('errors when not a git repository', async () => {
      const notGit = await fs.mkdtemp(path.join(os.tmpdir(), 'no-git-'));
      const { reporter, logs } = makeReporter();
      await new HookCommand(reporter).install(notGit);

      expect(logs.some((l) => l.includes('error'))).toBe(true);
      await fs.rm(notGit, { recursive: true, force: true });
    });

    it('updates .gitignore with agentctx entries', async () => {
      const { reporter } = makeReporter();
      await new HookCommand(reporter).install(tmpDir);

      const gitignore = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.agentctx/');
    });

    it('does not duplicate .gitignore entries on reinstall', async () => {
      const { reporter } = makeReporter();
      await new HookCommand(reporter).install(tmpDir);

      // Reinstall after removing hook manually to force re-run
      await fs.unlink(path.join(tmpDir, '.git', 'hooks', 'post-commit'));
      await new HookCommand(reporter).install(tmpDir);

      const gitignore = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf-8');
      const count = (gitignore.match(/\.agentctx\//g) ?? []).length;
      expect(count).toBe(1);
    });
  });

  describe('uninstall', () => {
    it('removes the post-commit hook file when only agentctx content', async () => {
      const { reporter } = makeReporter();
      await new HookCommand(reporter).install(tmpDir);
      await new HookCommand(reporter).uninstall(tmpDir);

      const hookPath = path.join(tmpDir, '.git', 'hooks', 'post-commit');
      const exists = await fs.access(hookPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('keeps the hook file when other content exists', async () => {
      const hookPath = path.join(tmpDir, '.git', 'hooks', 'post-commit');
      await fs.writeFile(hookPath, '#!/bin/sh\necho "other hook"\n');

      const { reporter } = makeReporter();
      await new HookCommand(reporter).install(tmpDir);
      await new HookCommand(reporter).uninstall(tmpDir);

      const content = await fs.readFile(hookPath, 'utf-8');
      expect(content).toContain('other hook');
      expect(content).not.toContain('agentctx');
    });

    it('warns when hook is not found', async () => {
      const { reporter, logs } = makeReporter();
      await new HookCommand(reporter).uninstall(tmpDir);
      expect(logs.some((l) => l.includes('warn'))).toBe(true);
    });
  });
});
