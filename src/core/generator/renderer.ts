import type { TemplateVars } from '../../types/index.js';

type Resolver = (vars: TemplateVars) => string;

export class TemplateRenderer {
  render(template: string, vars: TemplateVars): string {
    let result = template;

    result = this.processConditionalStackBlocks(result, vars);
    result = this.processIfBlocks(result, vars);
    result = this.processEachBlocks(result, vars);
    result = this.interpolate(result, vars);
    result = this.cleanupEmptyLines(result);

    return result;
  }

  private interpolate(template: string, vars: TemplateVars): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, expr: string) => {
      const trimmed = expr.trim();
      const value = this.resolvePath(trimmed, vars);
      return value !== undefined ? String(value) : `{{${trimmed}}}`;
    });
  }

  private resolvePath(path: string, obj: unknown): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private processConditionalStackBlocks(template: string, vars: TemplateVars): string {
    return template.replace(
      /\{\{#stack "([^"]+)"\}\}([\s\S]*?)\{\{\/stack\}\}/g,
      (_, stackId: string, content: string) => {
        const allStacks = [vars.stack.primary, ...vars.stack.all];
        const matches = allStacks.some((s) => s.id === stackId);
        return matches ? content : '';
      },
    );
  }

  private processIfBlocks(template: string, vars: TemplateVars): string {
    return template.replace(
      /\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, expr: string, content: string) => {
        const value = this.resolvePath(expr.trim(), vars);
        return this.isTruthy(value) ? content : '';
      },
    );
  }

  private processEachBlocks(template: string, vars: TemplateVars): string {
    return template.replace(
      /\{\{#each ([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (_, expr: string, content: string) => {
        const items = this.resolvePath(expr.trim(), vars);
        if (!Array.isArray(items)) return '';
        return items
          .map((item: unknown) =>
            content.replace(/\{\{this\.([^}]+)\}\}/g, (__, prop: string) => {
              const val =
                typeof item === 'object' && item !== null
                  ? (item as Record<string, unknown>)[prop]
                  : undefined;
              return val !== undefined ? String(val) : '';
            }),
          )
          .join('');
      },
    );
  }

  private isTruthy(value: unknown): boolean {
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  }

  private cleanupEmptyLines(content: string): string {
    return content.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }
}
