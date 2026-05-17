import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  ProjectAnalysis,
  DetectionResult,
  Convention,
  ProjectStructure,
  GitInfo,
} from '../../types/index.js';

const execFileAsync = promisify(execFile);

const LINTER_FILES: Array<[string, string]> = [
  ['.eslintrc', 'eslint'], ['.eslintrc.js', 'eslint'], ['.eslintrc.ts', 'eslint'],
  ['.eslintrc.json', 'eslint'], ['eslint.config.js', 'eslint'], ['eslint.config.ts', 'eslint'],
  ['.pylintrc', 'pylint'], ['pyproject.toml', 'ruff'],
  ['.rubocop.yml', 'rubocop'],
];

const FORMATTER_FILES: Array<[string, string]> = [
  ['.prettierrc', 'prettier'], ['.prettierrc.js', 'prettier'], ['prettier.config.js', 'prettier'],
  ['.editorconfig', 'editorconfig'],
];

const TEST_FILES: Array<[string, string]> = [
  ['vitest.config.ts', 'vitest'], ['vitest.config.js', 'vitest'],
  ['jest.config.ts', 'jest'], ['jest.config.js', 'jest'],
  ['pytest.ini', 'pytest'], ['pyproject.toml', 'pytest'],
];

const CI_FILES: Array<[string, string]> = [
  ['.github/workflows', 'github-actions'],
  ['.gitlab-ci.yml', 'gitlab-ci'],
  ['.circleci/config.yml', 'circleci'],
];

// Patterns to detect env variable names in example files.
// Matches: KEY=value, KEY= (empty), # KEY=value (commented)
const ENV_KEY_PATTERN = /^(?:#\s*)?([A-Z][A-Z0-9_]{1,})\s*=/gm;

export class ProjectAnalyzer {
  constructor(private readonly projectRoot: string) {}

  async analyze(detection: DetectionResult, projectName: string): Promise<ProjectAnalysis> {
    const [rootFiles, conventions, git, envVars] = await Promise.all([
      this.listRootFiles(),
      this.detectConventions(),
      this.getGitInfo(),
      this.scanEnvVars(),
    ]);

    const structure = await this.analyzeStructure(rootFiles);

    return {
      projectRoot: this.projectRoot,
      projectName,
      detection,
      conventions,
      structure,
      git,
      analyzedAt: new Date(),
      envVars,
    };
  }

  private async listRootFiles(): Promise<string[]> {
    try {
      return await fs.readdir(this.projectRoot);
    } catch {
      return [];
    }
  }

  private async detectConventions(): Promise<Convention[]> {
    const conventions: Convention[] = [];

    for (const [file, tool] of LINTER_FILES) {
      if (await this.exists(file)) {
        conventions.push({ type: 'linter', tool, configFile: file });
        break;
      }
    }

    for (const [file, tool] of FORMATTER_FILES) {
      if (await this.exists(file)) {
        conventions.push({ type: 'formatter', tool, configFile: file });
        break;
      }
    }

    for (const [file, tool] of TEST_FILES) {
      if (await this.exists(file)) {
        conventions.push({ type: 'testing', tool, configFile: file });
        break;
      }
    }

    if (await this.exists('tsconfig.json')) {
      conventions.push({ type: 'typechecker', tool: 'tsc', configFile: 'tsconfig.json' });
    }

    // UI library — shadcn/ui
    if (await this.exists('components.json')) {
      const raw = await fs.readFile(path.join(this.projectRoot, 'components.json'), 'utf-8').catch(() => '');
      const isShadcn = raw.includes('"style"') || raw.includes('"tailwind"') || raw.includes('"aliases"');
      if (isShadcn) {
        conventions.push({ type: 'ui-library', tool: 'shadcn/ui', configFile: 'components.json' });
      }
    }

    // CSS framework — Tailwind
    const tailwindConfig = ['tailwind.config.ts', 'tailwind.config.js', 'tailwind.config.mjs'];
    for (const cfg of tailwindConfig) {
      if (await this.exists(cfg)) {
        conventions.push({ type: 'css-framework', tool: 'tailwind', configFile: cfg });
        break;
      }
    }

    return conventions;
  }

  private async analyzeStructure(rootFiles: string[]): Promise<ProjectStructure> {
    const hasCi = await this.detectCi();
    const hasDocker = rootFiles.some((f) =>
      f === 'Dockerfile' || f.startsWith('docker-compose') || f === '.dockerignore',
    );

    const sourceDirs = ['src', 'app', 'lib', 'source'];
    let sourceDir: string | undefined;
    for (const dir of sourceDirs) {
      if (await this.exists(dir)) {
        sourceDir = dir;
        break;
      }
    }

    const testDirs = ['tests', 'test', '__tests__', 'spec'];
    let testDir: string | undefined;
    for (const dir of testDirs) {
      if (await this.exists(dir)) {
        testDir = dir;
        break;
      }
    }

    const appDirs = await this.scanAppDirs();

    return {
      rootFiles,
      hasCi,
      hasDocker,
      ...(sourceDir !== undefined ? { sourceDir } : {}),
      ...(testDir !== undefined ? { testDir } : {}),
      ...(appDirs.length > 0 ? { appDirs } : {}),
    };
  }

  private async scanAppDirs(): Promise<string[]> {
    try {
      const entries = await fs.readdir(path.join(this.projectRoot, 'app'), { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
    } catch {
      return [];
    }
  }

  private async detectCi(): Promise<boolean> {
    for (const [file] of CI_FILES) {
      if (await this.exists(file)) return true;
    }
    return false;
  }

  /**
   * Scans .env.example and .env.sample for required variable names.
   * Only variable names (not values) are collected, making this safe to
   * include in generated context files without leaking secrets.
   */
  private async scanEnvVars(): Promise<string[]> {
    const candidates = ['.env.example', '.env.sample', '.env.template'];
    const vars = new Set<string>();

    for (const candidate of candidates) {
      try {
        const content = await fs.readFile(path.join(this.projectRoot, candidate), 'utf-8');
        let match: RegExpExecArray | null;
        ENV_KEY_PATTERN.lastIndex = 0;
        while ((match = ENV_KEY_PATTERN.exec(content)) !== null) {
          const key = match[1];
          if (key !== undefined) vars.add(key);
        }
      } catch {
        // file doesn't exist — continue
      }
    }

    return [...vars].sort();
  }

  private async getGitInfo(): Promise<GitInfo> {
    if (!(await this.exists('.git'))) {
      return { hasGit: false, recentAuthors: [], totalCommits: 0 };
    }

    try {
      const [branchResult, authorsResult, countResult] = await Promise.allSettled([
        execFileAsync('git', ['-C', this.projectRoot, 'symbolic-ref', '--short', 'HEAD']),
        execFileAsync('git', ['-C', this.projectRoot, 'log', '--format=%an', '-n', '20']),
        execFileAsync('git', ['-C', this.projectRoot, 'rev-list', '--count', 'HEAD']),
      ]);

      const defaultBranch =
        branchResult.status === 'fulfilled'
          ? branchResult.value.stdout.trim()
          : undefined;

      const recentAuthors =
        authorsResult.status === 'fulfilled'
          ? [...new Set(authorsResult.value.stdout.split('\n').filter(Boolean))].slice(0, 5)
          : [];

      const totalCommits =
        countResult.status === 'fulfilled'
          ? parseInt(countResult.value.stdout.trim(), 10) || 0
          : 0;

      return {
        hasGit: true,
        recentAuthors,
        totalCommits,
        ...(defaultBranch !== undefined ? { defaultBranch } : {}),
      };
    } catch {
      return { hasGit: true, recentAuthors: [], totalCommits: 0 };
    }
  }

  private async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.projectRoot, relativePath));
      return true;
    } catch {
      return false;
    }
  }
}
