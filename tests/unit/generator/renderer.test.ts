import { describe, it, expect } from 'vitest';
import { TemplateRenderer } from '../../../src/core/generator/renderer.js';
import type { TemplateVars } from '../../../src/types/index.js';

const baseVars: TemplateVars = {
  project: { name: 'my-app', description: 'A test app' },
  stack: {
    primary: {
      id: 'nextjs',
      name: 'Next.js',
      version: '15.0.0',
      confidence: 'definitive',
      indicators: ['next.config.ts'],
      ecosystem: 'node',
      role: 'fullstack',
    },
    all: [],
    isMonorepo: false,
    packageManager: 'pnpm',
    language: 'typescript',
  },
  conventions: {
    linter: 'eslint',
    formatter: 'prettier',
    testRunner: 'vitest',
  },
  structure: {
    rootFiles: ['package.json', 'tsconfig.json'],
    sourceDir: 'src',
    hasCi: false,
    hasDocker: false,
  },
  git: { hasGit: false, recentAuthors: [], totalCommits: 0 },
  meta: { generatedAt: '2026-04-19', agentctxVersion: '0.1.0' },
};

describe('TemplateRenderer', () => {
  const renderer = new TemplateRenderer();

  it('interpolates simple variables', () => {
    const result = renderer.render('Project: {{project.name}}', baseVars);
    expect(result).toContain('Project: my-app');
  });

  it('interpolates nested variables', () => {
    const result = renderer.render('Stack: {{stack.primary.name}}', baseVars);
    expect(result).toContain('Stack: Next.js');
  });

  it('renders {{#if}} blocks when truthy', () => {
    const result = renderer.render('{{#if conventions.linter}}Linter: {{conventions.linter}}{{/if}}', baseVars);
    expect(result).toContain('Linter: eslint');
  });

  it('hides {{#if}} blocks when falsy', () => {
    const vars = { ...baseVars, conventions: {} };
    const result = renderer.render('{{#if conventions.linter}}LINTER{{/if}}', vars);
    expect(result).not.toContain('LINTER');
  });

  it('renders {{#stack}} block when stack matches', () => {
    const result = renderer.render('{{#stack "nextjs"}}IS_NEXTJS{{/stack}}', baseVars);
    expect(result).toContain('IS_NEXTJS');
  });

  it('hides {{#stack}} block when stack does not match', () => {
    const result = renderer.render('{{#stack "django"}}IS_DJANGO{{/stack}}', baseVars);
    expect(result).not.toContain('IS_DJANGO');
  });

  it('renders {{#each}} blocks for arrays', () => {
    const vars: TemplateVars = {
      ...baseVars,
      stack: {
        ...baseVars.stack,
        all: [
          { id: 'react', name: 'React', confidence: 'high', indicators: [], ecosystem: 'node', role: 'frontend' },
        ],
      },
    };
    const result = renderer.render('{{#each stack.all}}{{this.name}}{{/each}}', vars);
    expect(result).toContain('React');
  });

  it('leaves unknown variables as-is', () => {
    const result = renderer.render('{{unknown.var}}', baseVars);
    expect(result).toContain('{{unknown.var}}');
  });

  it('cleans up excessive blank lines', () => {
    const result = renderer.render('line1\n\n\n\n\nline2', baseVars);
    expect(result).not.toMatch(/\n{3,}/);
  });
});
