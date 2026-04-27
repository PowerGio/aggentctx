import path from 'node:path';
import fs from 'node:fs';

export class PathTraversalError extends Error {
  constructor(original: string, resolved: string, root: string) {
    super(
      `Path traversal detected: "${original}" resolves to "${resolved}", ` +
      `which is outside project root "${root}"`
    );
    this.name = 'PathTraversalError';
  }
}

export class PathGuard {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = fs.realpathSync(path.resolve(projectRoot));
  }

  assertSafe(filePath: string): string {
    const resolved = path.resolve(this.projectRoot, filePath);
    const rootWithSep = this.projectRoot + path.sep;

    if (!resolved.startsWith(rootWithSep) && resolved !== this.projectRoot) {
      throw new PathTraversalError(filePath, resolved, this.projectRoot);
    }

    try {
      const real = fs.realpathSync(resolved);
      if (!real.startsWith(rootWithSep) && real !== this.projectRoot) {
        throw new PathTraversalError(filePath, real, this.projectRoot);
      }
      return real;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        return resolved;
      }
      throw e;
    }
  }

  isSafe(filePath: string): boolean {
    try {
      this.assertSafe(filePath);
      return true;
    } catch {
      return false;
    }
  }

  filterSafe(paths: string[]): string[] {
    return paths.filter((p) => {
      if (this.isSafe(p)) return true;
      console.warn(`[agentctx] SECURITY: Skipping path outside project root: ${p}`);
      return false;
    });
  }
}
