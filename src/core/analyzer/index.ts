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

export class ProjectAnalyzer {
  constructor(private readonly projectRoot: string) {}

  async analyze(detection: DetectionResult, projectName: string): Promise<ProjectAnalysis> {
    const [rootFiles, conventions, git] = await Promise.all([
      this.listRootFiles(),
      this.detectConventions(),
      this.getGitInfo(),
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

    return conventions;
  }

  private async analyzeStructure(rootFiles: string[]): Promise<ProjectStructure> {
    const hasCi = await this.detectCi();
    const hasDocker = rootFiles.includes('Dockerfile') || rootFiles.includes('docker-compose.yml');

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

    return {
      rootFiles,
      hasCi,
      hasDocker,
      ...(sourceDir !== undefined ? { sourceDir } : {}),
      ...(testDir !== undefined ? { testDir } : {}),
    };
  }

  private async detectCi(): Promise<boolean> {
    for (const [file] of CI_FILES) {
      if (await this.exists(file)) return true;
    }
    return false;
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
