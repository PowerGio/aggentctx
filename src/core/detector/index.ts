import path from 'node:path';
import fs from 'node:fs/promises';
import { FINGERPRINTS } from './fingerprints.js';
import { MonorepoDetector } from './monorepo.js';
import type {
  DetectionResult,
  StackId,
  StackInfo,
  ConfidenceLevel,
  PackageManager,
  Language,
  Ecosystem,
} from '../../types/index.js';

const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'vendor', '__pycache__', '.venv']);

interface StackScore {
  stackId: StackId;
  score: number;
  indicators: string[];
}

export class StackDetector {
  constructor(private readonly projectRoot: string) {}

  async detect(): Promise<DetectionResult> {
    const rootFiles = await this.listRootFiles();

    // Detect monorepo first — before scoring — so primaryStack can fall back to 'monorepo'
    // when there are no root manifests but workspaces exist (e.g. atlas-style repos)
    const isMonorepo = await this.detectMonorepo(rootFiles);
    const workspaces = isMonorepo
      ? await new MonorepoDetector(this.projectRoot).detectWorkspaces()
      : [];

    const pkgJson = await this.readPackageJson();
    const requirementsTxt = await this.readRequirementsTxt();
    const composerJson = await this.readComposerJson();
    const goMod = await this.readGoMod();

    const scores = await this.scoreAll(rootFiles, pkgJson, requirementsTxt, composerJson, goMod);
    const sorted = scores.sort((a, b) => b.score - a.score);

    const primary = sorted[0];
    const primaryStack = primary
      ? this.buildStackInfo(primary, pkgJson, goMod)
      : isMonorepo && workspaces.length > 0
        ? this.monorepoStack(workspaces.length)
        : this.unknownStack();

    const additionalStacks = sorted
      .slice(1)
      .filter((s) => s.score >= 5)
      .map((s) => this.buildStackInfo(s, pkgJson, goMod));

    const packageManager = this.detectPackageManager(rootFiles, pkgJson);
    const language = this.detectLanguage(rootFiles, pkgJson, requirementsTxt, goMod);

    return {
      primaryStack,
      additionalStacks,
      isMonorepo,
      packageManager,
      language,
      workspaces,
    };
  }

  private async listRootFiles(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.projectRoot);
      return entries.filter((e) => !EXCLUDED_DIRS.has(e));
    } catch {
      return [];
    }
  }

  private async readPackageJson(): Promise<Record<string, unknown> | null> {
    try {
      const content = await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf-8');
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private async readRequirementsTxt(): Promise<string[]> {
    try {
      const content = await fs.readFile(path.join(this.projectRoot, 'requirements.txt'), 'utf-8');
      return content.split('\n').map((l) => l.trim().split(/[>=<![\]]/)[0]?.trim() ?? '').filter(Boolean);
    } catch {
      return [];
    }
  }

  private async readComposerJson(): Promise<Record<string, unknown> | null> {
    try {
      const content = await fs.readFile(path.join(this.projectRoot, 'composer.json'), 'utf-8');
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private async readGoMod(): Promise<string | null> {
    try {
      return await fs.readFile(path.join(this.projectRoot, 'go.mod'), 'utf-8');
    } catch {
      return null;
    }
  }

  private async scoreAll(
    rootFiles: string[],
    pkgJson: Record<string, unknown> | null,
    requirementsTxt: string[],
    composerJson: Record<string, unknown> | null,
    goMod: string | null,
  ): Promise<StackScore[]> {
    const scoreMap = new Map<StackId, StackScore>();

    const deps = pkgJson
      ? {
          ...((pkgJson['dependencies'] as Record<string, string> | undefined) ?? {}),
          ...((pkgJson['devDependencies'] as Record<string, string> | undefined) ?? {}),
        }
      : {};

    const composerRequire = composerJson
      ? Object.keys((composerJson['require'] as Record<string, string> | undefined) ?? {})
      : [];

    for (const fp of FINGERPRINTS) {
      let matched = false;
      const indicator: string[] = [];

      if (fp.files) {
        for (const file of fp.files) {
          if (rootFiles.includes(file) || await this.fileExists(file)) {
            matched = true;
            indicator.push(file);
            break;
          }
        }
      }

      if (!matched && fp.packageJsonDeps && pkgJson) {
        for (const dep of fp.packageJsonDeps) {
          if (dep in deps) {
            matched = true;
            indicator.push(`dep:${dep}`);
            break;
          }
        }
      }

      if (!matched && fp.requirementsTxt && requirementsTxt.length > 0) {
        for (const pkg of fp.requirementsTxt) {
          if (requirementsTxt.some((r) => r.toLowerCase() === pkg.toLowerCase())) {
            matched = true;
            indicator.push(`requirements:${pkg}`);
            break;
          }
        }
      }

      if (!matched && fp.composerJsonRequire && composerRequire.length > 0) {
        for (const pkg of fp.composerJsonRequire) {
          if (composerRequire.includes(pkg)) {
            matched = true;
            indicator.push(`composer:${pkg}`);
            break;
          }
        }
      }

      if (!matched && fp.goModImports && goMod) {
        for (const mod of fp.goModImports) {
          if (goMod.includes(mod)) {
            matched = true;
            indicator.push(`go.mod:${mod}`);
            break;
          }
        }
      }

      if (!matched && fp.fileContains) {
        for (const { file, pattern } of fp.fileContains) {
          try {
            const content = await fs.readFile(path.join(this.projectRoot, file), 'utf-8');
            if (content.includes(pattern)) {
              matched = true;
              indicator.push(`${file}:${pattern}`);
              break;
            }
          } catch {
            // file doesn't exist
          }
        }
      }

      if (matched) {
        const existing = scoreMap.get(fp.stackId);
        if (existing) {
          existing.score += fp.weight;
          existing.indicators.push(...indicator);
        } else {
          scoreMap.set(fp.stackId, {
            stackId: fp.stackId,
            score: fp.weight,
            indicators: [...indicator],
          });
        }
      }
    }

    return Array.from(scoreMap.values());
  }

  private async fileExists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.projectRoot, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  private buildStackInfo(
    score: StackScore,
    pkgJson: Record<string, unknown> | null,
    goMod: string | null,
  ): StackInfo {
    const confidence = this.scoreToConfidence(score.score);
    const meta = STACK_META[score.stackId] ?? STACK_META['unknown']!;

    const version = this.detectVersion(score.stackId, pkgJson, goMod);

    return {
      id: score.stackId,
      name: meta.name,
      ecosystem: meta.ecosystem,
      role: meta.role,
      confidence,
      indicators: score.indicators,
      ...(version !== undefined ? { version } : {}),
    };
  }

  private detectVersion(
    stackId: StackId,
    pkgJson: Record<string, unknown> | null,
    _goMod: string | null,
  ): string | undefined {
    if (!pkgJson) return undefined;
    const allDeps = {
      ...((pkgJson['dependencies'] as Record<string, string> | undefined) ?? {}),
      ...((pkgJson['devDependencies'] as Record<string, string> | undefined) ?? {}),
    };
    const PKG_NAME: Partial<Record<StackId, string>> = {
      nextjs: 'next',
      astro: 'astro',
      express: 'express',
      fastify: 'fastify',
      hono: 'hono',
      svelte: 'svelte',
      nuxt: 'nuxt',
      expo: 'expo',
    };
    const pkgName = PKG_NAME[stackId];
    return pkgName ? (allDeps[pkgName] ?? undefined) : undefined;
  }

  private monorepoStack(workspaceCount: number): StackInfo {
    return {
      id: 'monorepo',
      name: `Monorepo — ${workspaceCount} workspace${workspaceCount !== 1 ? 's' : ''}`,
      ecosystem: 'node',
      role: 'fullstack',
      confidence: 'high',
      indicators: ['multiple-manifest-dirs'],
    };
  }

  private unknownStack(): StackInfo {
    return {
      id: 'unknown',
      name: 'Unknown',
      ecosystem: 'node',
      role: 'fullstack',
      confidence: 'low',
      indicators: [],
    };
  }

  private scoreToConfidence(score: number): ConfidenceLevel {
    if (score >= 18) return 'definitive';
    if (score >= 10) return 'high';
    if (score >= 5)  return 'medium';
    return 'low';
  }

  private async detectMonorepo(rootFiles: string[]): Promise<boolean> {
    const monoRepoIndicators = ['turbo.json', 'nx.json', 'pnpm-workspace.yaml', 'lerna.json'];
    if (monoRepoIndicators.some((f) => rootFiles.includes(f))) return true;

    // Check package.json workspaces field
    try {
      const raw = await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf-8');
      const pkg = JSON.parse(raw) as { workspaces?: unknown };
      if (pkg.workspaces) return true;
    } catch { /* no package.json */ }

    // Check if multiple subdirectories have their own manifests (manual monorepo)
    const manifestFiles = ['package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'composer.json'];
    let manifestDirCount = 0;
    for (const entry of rootFiles) {
      try {
        const stat = await fs.stat(path.join(this.projectRoot, entry));
        if (!stat.isDirectory()) continue;
        for (const manifest of manifestFiles) {
          try {
            await fs.access(path.join(this.projectRoot, entry, manifest));
            manifestDirCount++;
            break;
          } catch { /* continue */ }
        }
        if (manifestDirCount >= 2) return true;
      } catch { /* continue */ }
    }

    return false;
  }

  private detectPackageManager(
    rootFiles: string[],
    pkgJson: Record<string, unknown> | null,
  ): PackageManager {
    const pmField = pkgJson?.['packageManager'] as string | undefined;
    if (pmField) {
      if (pmField.startsWith('pnpm')) return 'pnpm';
      if (pmField.startsWith('yarn')) return 'yarn';
      if (pmField.startsWith('bun'))  return 'bun';
      if (pmField.startsWith('npm'))  return 'npm';
    }
    if (rootFiles.includes('pnpm-lock.yaml'))  return 'pnpm';
    if (rootFiles.includes('yarn.lock'))        return 'yarn';
    if (rootFiles.includes('bun.lockb') || rootFiles.includes('bun.lock')) return 'bun';
    if (rootFiles.includes('package-lock.json')) return 'npm';
    if (rootFiles.includes('requirements.txt') || rootFiles.includes('pyproject.toml')) return 'pip';
    if (rootFiles.includes('composer.json'))    return 'composer';
    if (rootFiles.includes('Gemfile'))          return 'bundler';
    if (rootFiles.includes('go.mod'))           return 'go';
    return 'unknown';
  }

  private detectLanguage(
    rootFiles: string[],
    pkgJson: Record<string, unknown> | null,
    requirementsTxt: string[],
    goMod: string | null,
  ): Language {
    if (pkgJson) {
      const allDeps = {
        ...((pkgJson['dependencies'] as Record<string, string> | undefined) ?? {}),
        ...((pkgJson['devDependencies'] as Record<string, string> | undefined) ?? {}),
      };
      if ('typescript' in allDeps || rootFiles.includes('tsconfig.json')) return 'typescript';
      return 'javascript';
    }
    if (requirementsTxt.length > 0 || rootFiles.includes('pyproject.toml')) return 'python';
    if (goMod)                         return 'go';
    if (rootFiles.includes('Cargo.toml')) return 'rust';
    if (rootFiles.includes('composer.json')) return 'php';
    if (rootFiles.includes('Gemfile')) return 'ruby';
    return 'unknown';
  }
}

interface StackMeta {
  readonly name: string;
  readonly ecosystem: Ecosystem;
  readonly role: StackInfo['role'];
}

const STACK_META: Partial<Record<StackId, StackMeta>> & { unknown: StackMeta } = {
  nextjs:       { name: 'Next.js',       ecosystem: 'node',   role: 'fullstack' },
  astro:        { name: 'Astro',         ecosystem: 'node',   role: 'frontend' },
  remix:        { name: 'Remix',         ecosystem: 'node',   role: 'fullstack' },
  nuxt:         { name: 'Nuxt',          ecosystem: 'node',   role: 'fullstack' },
  svelte:       { name: 'SvelteKit',     ecosystem: 'node',   role: 'fullstack' },
  vite:         { name: 'Vite',          ecosystem: 'node',   role: 'frontend' },
  react:        { name: 'React',         ecosystem: 'node',   role: 'frontend' },
  express:      { name: 'Express',       ecosystem: 'node',   role: 'backend' },
  fastify:      { name: 'Fastify',       ecosystem: 'node',   role: 'backend' },
  nestjs:       { name: 'NestJS',        ecosystem: 'node',   role: 'backend' },
  hono:         { name: 'Hono',          ecosystem: 'node',   role: 'backend' },
  django:       { name: 'Django',        ecosystem: 'python', role: 'fullstack' },
  fastapi:      { name: 'FastAPI',       ecosystem: 'python', role: 'backend' },
  flask:        { name: 'Flask',         ecosystem: 'python', role: 'backend' },
  laravel:      { name: 'Laravel',       ecosystem: 'php',    role: 'fullstack' },
  symfony:      { name: 'Symfony',       ecosystem: 'php',    role: 'backend' },
  rails:        { name: 'Ruby on Rails', ecosystem: 'ruby',   role: 'fullstack' },
  'go-fiber':   { name: 'Go Fiber',      ecosystem: 'go',     role: 'backend' },
  'go-gin':     { name: 'Go Gin',        ecosystem: 'go',     role: 'backend' },
  'go-echo':    { name: 'Go Echo',       ecosystem: 'go',     role: 'backend' },
  expo:         { name: 'Expo',          ecosystem: 'node',   role: 'mobile' },
  'react-native': { name: 'React Native', ecosystem: 'node', role: 'mobile' },
  unknown:      { name: 'Unknown',       ecosystem: 'node',   role: 'fullstack' },
};
