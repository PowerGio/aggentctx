import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProjectAnalyzer } from '../../../src/core/analyzer/index.js';
import type { DetectionResult } from '../../../src/types/index.js';

const MOCK_DETECTION: DetectionResult = {
  primaryStack: {
    id: 'nextjs',
    name: 'Next.js',
    confidence: 'high',
    indicators: [],
    ecosystem: 'node',
    role: 'fullstack',
  },
  additionalStacks: [],
  isMonorepo: false,
  packageManager: 'npm',
  language: 'typescript',
};

let tmpDir: string;
let analyzer: ProjectAnalyzer;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentctx-env-'));
  analyzer = new ProjectAnalyzer(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('ProjectAnalyzer — env var scanning', () => {
  it('extracts variable names from .env.example', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.env.example'),
      'DATABASE_URL=postgres://localhost/mydb\nSECRET_KEY=changeme\nPORT=3000\n',
      'utf-8',
    );

    const result = await analyzer.analyze(MOCK_DETECTION, 'test');
    expect(result.envVars).toContain('DATABASE_URL');
    expect(result.envVars).toContain('SECRET_KEY');
    expect(result.envVars).toContain('PORT');
  });

  it('extracts variable names from .env.sample as fallback', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.env.sample'),
      'API_KEY=your-key-here\nREDIS_URL=redis://localhost:6379\n',
      'utf-8',
    );

    const result = await analyzer.analyze(MOCK_DETECTION, 'test');
    expect(result.envVars).toContain('API_KEY');
    expect(result.envVars).toContain('REDIS_URL');
  });

  it('extracts commented variables (optional env vars)', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.env.example'),
      'REQUIRED_KEY=value\n# OPTIONAL_KEY=optional-value\n',
      'utf-8',
    );

    const result = await analyzer.analyze(MOCK_DETECTION, 'test');
    expect(result.envVars).toContain('REQUIRED_KEY');
    expect(result.envVars).toContain('OPTIONAL_KEY');
  });

  it('returns empty array when no env example file exists', async () => {
    const result = await analyzer.analyze(MOCK_DETECTION, 'test');
    expect(result.envVars).toEqual([]);
  });

  it('returns sorted, deduplicated variable names', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.env.example'),
      'ZEBRA_VAR=1\nAPPLE_VAR=2\nZEBRA_VAR=3\n',
      'utf-8',
    );

    const result = await analyzer.analyze(MOCK_DETECTION, 'test');
    expect(result.envVars).toEqual(['APPLE_VAR', 'ZEBRA_VAR']);
  });

  it('does not include values — only names (security)', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.env.example'),
      'SECRET_KEY=sk-ant-abc123verysecretvalue\n',
      'utf-8',
    );

    const result = await analyzer.analyze(MOCK_DETECTION, 'test');
    expect(result.envVars).toContain('SECRET_KEY');
    // The actual secret value must never appear
    expect(result.envVars.join('')).not.toContain('sk-ant-abc123verysecretvalue');
  });
});
