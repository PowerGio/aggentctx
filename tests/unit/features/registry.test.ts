import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FeatureRegistryManager } from '../../../src/core/features/registry.js';
import type { Feature } from '../../../src/core/features/types.js';

const makeFeature = (id: string, file = `src/${id}.ts`): Feature => ({
  id,
  files: [file],
  status: 'active',
  current: { flow: [`1. Step for ${id}`], date: '2026-04-22' },
  history: [],
});

let tmpDir: string;
let manager: FeatureRegistryManager;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentctx-test-'));
  manager = new FeatureRegistryManager(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('FeatureRegistryManager', () => {
  describe('load', () => {
    it('returns empty registry when FEATURES.md does not exist', async () => {
      const registry = await manager.load();
      expect(registry.features).toHaveLength(0);
    });
  });

  describe('addFeature', () => {
    it('adds a feature to an empty registry', async () => {
      await manager.addFeature(makeFeature('login-form'));
      const registry = await manager.load();
      expect(registry.features).toHaveLength(1);
      expect(registry.features[0]!.id).toBe('login-form');
    });

    it('adds multiple features', async () => {
      await manager.addFeature(makeFeature('login-form'));
      await manager.addFeature(makeFeature('upload-button'));
      const registry = await manager.load();
      expect(registry.features).toHaveLength(2);
    });

    it('throws when adding duplicate feature id', async () => {
      await manager.addFeature(makeFeature('login-form'));
      await expect(manager.addFeature(makeFeature('login-form'))).rejects.toThrow(
        'already exists',
      );
    });

    it('persists data to FEATURES.md file', async () => {
      await manager.addFeature(makeFeature('login-form'));
      const exists = await fs.access(path.join(tmpDir, 'FEATURES.md')).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('updateFeature', () => {
    it('moves current behavior to history on update', async () => {
      await manager.addFeature(makeFeature('upload-button'));
      await manager.updateFeature('upload-button', {
        flow: ['1. New step A', '2. New step B'],
        date: '2026-04-23',
        reason: 'Redesigned flow',
      });

      const registry = await manager.load();
      const feature = registry.features.find((f) => f.id === 'upload-button')!;

      expect(feature.current.flow).toContain('1. New step A');
      expect(feature.history).toHaveLength(1);
      expect(feature.history[0]!.flow).toContain(`1. Step for upload-button`);
    });

    it('updates files list when provided', async () => {
      await manager.addFeature(makeFeature('upload-button', 'src/old.ts'));
      await manager.updateFeature(
        'upload-button',
        { flow: ['New step'], date: '2026-04-23' },
        ['src/new.ts'],
      );

      const registry = await manager.load();
      const feature = registry.features.find((f) => f.id === 'upload-button')!;
      expect(feature.files).toContain('src/new.ts');
      expect(feature.files).not.toContain('src/old.ts');
    });

    it('throws when updating non-existent feature', async () => {
      await expect(
        manager.updateFeature('nonexistent', { flow: ['step'], date: '2026-04-22' }),
      ).rejects.toThrow('not found');
    });

    it('accumulates history across multiple updates', async () => {
      await manager.addFeature(makeFeature('checkout'));
      await manager.updateFeature('checkout', { flow: ['v2 step'], date: '2026-04-23' });
      await manager.updateFeature('checkout', { flow: ['v3 step'], date: '2026-04-24' });

      const registry = await manager.load();
      const feature = registry.features.find((f) => f.id === 'checkout')!;
      expect(feature.history).toHaveLength(2);
      expect(feature.current.flow).toContain('v3 step');
    });
  });

  describe('getFeature', () => {
    it('returns the feature by id', async () => {
      await manager.addFeature(makeFeature('login-form'));
      const feature = await manager.getFeature('login-form');
      expect(feature).toBeDefined();
      expect(feature!.id).toBe('login-form');
    });

    it('returns undefined for unknown id', async () => {
      const feature = await manager.getFeature('does-not-exist');
      expect(feature).toBeUndefined();
    });
  });

  describe('findByFile', () => {
    it('returns features that reference the given file', async () => {
      await manager.addFeature(makeFeature('upload-button', 'src/Upload.tsx'));
      await manager.addFeature(makeFeature('login-form', 'src/Login.tsx'));

      const results = await manager.findByFile('src/Upload.tsx');
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('upload-button');
    });

    it('returns empty array when no feature references the file', async () => {
      await manager.addFeature(makeFeature('login-form', 'src/Login.tsx'));
      const results = await manager.findByFile('src/Other.tsx');
      expect(results).toHaveLength(0);
    });

    it('matches when file path ends with the tracked path', async () => {
      await manager.addFeature(makeFeature('upload-button', 'src/Upload.tsx'));
      const results = await manager.findByFile('packages/web/src/Upload.tsx');
      expect(results).toHaveLength(1);
    });
  });
});
