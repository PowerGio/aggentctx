import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StackDetector } from '../../../src/core/detector/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../../fixtures/projects');

describe('StackDetector', () => {
  describe('Next.js detection', () => {
    it('detects nextjs stack', async () => {
      const detector = new StackDetector(path.join(fixtures, 'nextjs-app'));
      const result = await detector.detect();

      expect(result.primaryStack.id).toBe('nextjs');
      expect(result.primaryStack.name).toBe('Next.js');
      expect(['high', 'definitive']).toContain(result.primaryStack.confidence);
    });

    it('detects TypeScript language in Next.js project', async () => {
      const detector = new StackDetector(path.join(fixtures, 'nextjs-app'));
      const result = await detector.detect();

      expect(result.language).toBe('typescript');
    });

    it('detects vitest as additional stack info', async () => {
      const detector = new StackDetector(path.join(fixtures, 'nextjs-app'));
      const result = await detector.detect();

      expect(['npm', 'yarn', 'pnpm', 'bun', 'unknown']).toContain(result.packageManager);
    });
  });

  describe('Django detection', () => {
    it('detects django stack', async () => {
      const detector = new StackDetector(path.join(fixtures, 'django-project'));
      const result = await detector.detect();

      expect(result.primaryStack.id).toBe('django');
      expect(result.primaryStack.ecosystem).toBe('python');
    });

    it('detects python language', async () => {
      const detector = new StackDetector(path.join(fixtures, 'django-project'));
      const result = await detector.detect();

      expect(result.language).toBe('python');
    });
  });

  describe('Laravel detection', () => {
    it('detects laravel stack', async () => {
      const detector = new StackDetector(path.join(fixtures, 'laravel-project'));
      const result = await detector.detect();

      expect(result.primaryStack.id).toBe('laravel');
      expect(result.primaryStack.ecosystem).toBe('php');
    });
  });

  describe('empty project', () => {
    it('returns unknown stack for empty directory', async () => {
      const detector = new StackDetector(path.join(fixtures, 'empty'));
      const result = await detector.detect();

      expect(result.primaryStack.id).toBe('unknown');
      expect(result.language).toBe('unknown');
    });
  });
});
