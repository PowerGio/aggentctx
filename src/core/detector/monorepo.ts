import path from 'node:path';
import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import fg from 'fast-glob';
import type { WorkspaceInfo } from '../../types/index.js';

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', '.next', 'vendor',
  '__pycache__', '.venv', 'coverage', 'build', '.turbo',
]);

const MANIFEST_FILES = [
  'package.json', 'requirements.txt', 'pyproject.toml',
  'go.mod', 'composer.json', 'Gemfile',
];

const KNOWN_WORKSPACE_DIRS = ['apps', 'packages', 'services', 'backend', 'frontend', 'api', 'web', 'server', 'client'];

export class MonorepoDetector {
  constructor(private readonly projectRoot: string) {}

  async detectWorkspaces(): Promise<WorkspaceInfo[]> {
    const absPaths = await this.resolveWorkspacePaths();
    const workspaces: WorkspaceInfo[] = [];

    for (const wsAbsPath of absPaths) {
      const relPath = path.relative(this.projectRoot, wsAbsPath).replace(/\\/g, '/');
      const name = path.basename(wsAbsPath);

      // Lazy import to avoid circular dep at module load time
      const { StackDetector } = await import('./index.js');
      const detector = new StackDetector(wsAbsPath);
      const detection = await detector.detect();

      workspaces.push({
        path: relPath,
        name,
        stackName: detection.primaryStack.name,
        stackId: detection.primaryStack.id,
        language: detection.language,
        packageManager: detection.packageManager,
      });
    }

    return workspaces;
  }

  private async resolveWorkspacePaths(): Promise<string[]> {
    const pkgPaths = await this.readPackageJsonWorkspaces();
    if (pkgPaths.length > 0) return pkgPaths;

    const pnpmPaths = await this.readPnpmWorkspaces();
    if (pnpmPaths.length > 0) return pnpmPaths;

    return this.scanSubdirsForManifests();
  }

  private async readPackageJsonWorkspaces(): Promise<string[]> {
    try {
      const raw = await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf-8');
      const pkg = JSON.parse(raw) as { workspaces?: string[] | { packages?: string[] } };
      const patterns = Array.isArray(pkg.workspaces)
        ? pkg.workspaces
        : (pkg.workspaces?.packages ?? []);
      if (patterns.length === 0) return [];
      return this.globPaths(patterns);
    } catch {
      return [];
    }
  }

  private async readPnpmWorkspaces(): Promise<string[]> {
    try {
      const raw = await fs.readFile(path.join(this.projectRoot, 'pnpm-workspace.yaml'), 'utf-8');
      const patterns: string[] = [];
      let inPackages = false;
      for (const line of raw.split('\n')) {
        if (line.trimStart().startsWith('packages:')) { inPackages = true; continue; }
        if (inPackages && /^\s+-\s+/.test(line)) {
          patterns.push(line.replace(/^\s+-\s+'?/, '').replace(/'?\s*$/, '').trim());
        } else if (inPackages && line.trim() && !/^\s/.test(line)) {
          break;
        }
      }
      if (patterns.length === 0) return [];
      return this.globPaths(patterns);
    } catch {
      return [];
    }
  }

  private async globPaths(patterns: string[]): Promise<string[]> {
    const dirs = await fg(patterns, {
      cwd: this.projectRoot,
      onlyDirectories: true,
      ignore: [...EXCLUDED_DIRS],
      absolute: true,
    });
    const result: string[] = [];
    for (const dir of dirs) {
      if (await this.hasManifest(dir)) result.push(dir);
    }
    return result;
  }

  private async scanSubdirsForManifests(): Promise<string[]> {
    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(this.projectRoot, { withFileTypes: true });
    } catch {
      return [];
    }

    const result: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name)) continue;
      const absPath = path.join(this.projectRoot, entry.name);

      if (await this.hasManifest(absPath)) {
        result.push(absPath);
        continue;
      }

      if (KNOWN_WORKSPACE_DIRS.includes(entry.name)) {
        const children = await fs.readdir(absPath, { withFileTypes: true }).catch(() => [] as Dirent[]);
        for (const child of children) {
          if (!child.isDirectory() || EXCLUDED_DIRS.has(child.name)) continue;
          const childAbs = path.join(absPath, child.name);
          if (await this.hasManifest(childAbs)) result.push(childAbs);
        }
      }
    }

    return result;
  }

  private async hasManifest(dirPath: string): Promise<boolean> {
    for (const manifest of MANIFEST_FILES) {
      try {
        await fs.access(path.join(dirPath, manifest));
        return true;
      } catch { /* try next */ }
    }
    return false;
  }
}
