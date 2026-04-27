import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { StackDetector } from '../../../src/core/detector/index.js';
import { MonorepoDetector } from '../../../src/core/detector/monorepo.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentctx-monorepo-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const mkdir = (p: string) => fs.mkdir(path.join(tmpDir, p), { recursive: true });
const write = (p: string, content: string) => fs.writeFile(path.join(tmpDir, p), content, 'utf-8');

describe('MonorepoDetector', () => {
  describe('detectWorkspaces — manual monorepo (no turbo/nx)', () => {
    it('detects frontend/ and backend/ as workspaces', async () => {
      await mkdir('frontend');
      await mkdir('backend');
      await write('frontend/package.json', JSON.stringify({ name: 'web', dependencies: { next: '^14.0.0' } }));
      await write('backend/requirements.txt', 'fastapi\nuvicorn\n');

      const detector = new MonorepoDetector(tmpDir);
      const workspaces = await detector.detectWorkspaces();

      expect(workspaces).toHaveLength(2);
      const names = workspaces.map((w) => w.name).sort();
      expect(names).toEqual(['backend', 'frontend']);
    });

    it('sets correct stackId per workspace', async () => {
      await mkdir('frontend');
      await mkdir('backend');
      await write('frontend/package.json', JSON.stringify({ name: 'web', dependencies: { next: '^14.0.0' } }));
      await write('backend/requirements.txt', 'fastapi\nuvicorn\n');

      const detector = new MonorepoDetector(tmpDir);
      const workspaces = await detector.detectWorkspaces();

      const frontend = workspaces.find((w) => w.name === 'frontend');
      const backend = workspaces.find((w) => w.name === 'backend');

      expect(frontend?.stackId).toBe('nextjs');
      expect(backend?.stackId).toBe('fastapi');
    });

    it('sets relative path correctly', async () => {
      await mkdir('apps/web');
      await write('apps/web/package.json', JSON.stringify({ name: 'web', dependencies: { next: '^14.0.0' } }));

      const detector = new MonorepoDetector(tmpDir);
      const workspaces = await detector.detectWorkspaces();

      expect(workspaces[0]?.path).toBe('apps/web');
    });
  });

  describe('detectWorkspaces — package.json workspaces field', () => {
    it('reads workspaces from package.json', async () => {
      await mkdir('apps/web');
      await mkdir('apps/api');
      await write('package.json', JSON.stringify({
        name: 'my-monorepo',
        workspaces: ['apps/*'],
      }));
      await write('apps/web/package.json', JSON.stringify({ name: 'web', dependencies: { next: '^14.0.0' } }));
      await write('apps/api/package.json', JSON.stringify({ name: 'api', dependencies: { express: '^4.18.0' } }));

      const detector = new MonorepoDetector(tmpDir);
      const workspaces = await detector.detectWorkspaces();

      expect(workspaces).toHaveLength(2);
    });
  });

  describe('detectWorkspaces — empty dir', () => {
    it('returns empty array when no workspaces found', async () => {
      const detector = new MonorepoDetector(tmpDir);
      const workspaces = await detector.detectWorkspaces();
      expect(workspaces).toHaveLength(0);
    });
  });
});

describe('StackDetector — monorepo detection', () => {
  it('detects isMonorepo=true for manual monorepo with 2+ manifest subdirs', async () => {
    await mkdir('frontend');
    await mkdir('backend');
    await write('frontend/package.json', JSON.stringify({ name: 'web' }));
    await write('backend/requirements.txt', 'fastapi\n');

    const detector = new StackDetector(tmpDir);
    const result = await detector.detect();

    expect(result.isMonorepo).toBe(true);
    expect(result.workspaces.length).toBeGreaterThanOrEqual(2);
  });

  it('detects isMonorepo=true for turbo.json', async () => {
    await write('turbo.json', '{}');
    await write('package.json', JSON.stringify({ name: 'my-repo' }));

    const detector = new StackDetector(tmpDir);
    const result = await detector.detect();

    expect(result.isMonorepo).toBe(true);
  });

  it('detects isMonorepo=false for single-stack project', async () => {
    await write('package.json', JSON.stringify({ name: 'my-app', dependencies: { next: '^14.0.0' } }));

    const detector = new StackDetector(tmpDir);
    const result = await detector.detect();

    expect(result.isMonorepo).toBe(false);
    expect(result.workspaces).toHaveLength(0);
  });
});
