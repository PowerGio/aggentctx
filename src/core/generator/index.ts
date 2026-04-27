import path from 'node:path';
import type {
  ProjectAnalysis,
  TemplateVars,
  OutputFile,
  GenerationResult,
  ContextFile,
  AgentctxConfig,
} from '../../types/index.js';
import { TemplateRenderer } from './renderer.js';
import { loadTemplates } from '../../templates/registry.js';

const AGENTCTX_VERSION = '0.1.0';

export class ContextGenerator {
  private readonly renderer = new TemplateRenderer();

  generate(
    analysis: ProjectAnalysis,
    config: AgentctxConfig,
  ): GenerationResult {
    if (analysis.detection.isMonorepo && analysis.detection.workspaces.length > 0) {
      return this.generateMonorepo(analysis, config);
    }
    return this.generateSingle(analysis, config);
  }

  private generateSingle(analysis: ProjectAnalysis, config: AgentctxConfig): GenerationResult {
    const vars = this.buildVars(analysis);
    const templates = loadTemplates(analysis.detection.primaryStack.id);

    const filesToGenerate: ContextFile[] = [];
    if (config.output.agents) filesToGenerate.push('AGENTS.md');
    if (config.output.claude) filesToGenerate.push('CLAUDE.md');
    if (config.output.design) filesToGenerate.push('DESIGN.md');

    const files: OutputFile[] = [];
    const warnings: string[] = [];

    for (const filename of filesToGenerate) {
      const templateContent = templates[filename];
      const content = this.renderer.render(templateContent, vars);
      const outputPath = path.join(config.output.directory, filename);

      files.push({ filename, outputPath, content, templateUsed: analysis.detection.primaryStack.id });
    }

    return { files, skipped: [], warnings };
  }

  private generateMonorepo(analysis: ProjectAnalysis, config: AgentctxConfig): GenerationResult {
    const vars = this.buildVars(analysis);
    const rootTemplates = loadTemplates('monorepo');
    const files: OutputFile[] = [];
    const warnings: string[] = [];

    // Root context files using monorepo templates
    const filesToGenerate: ContextFile[] = [];
    if (config.output.agents) filesToGenerate.push('AGENTS.md');
    if (config.output.claude) filesToGenerate.push('CLAUDE.md');
    if (config.output.design) filesToGenerate.push('DESIGN.md');

    for (const filename of filesToGenerate) {
      files.push({
        filename,
        outputPath: path.join(config.output.directory, filename),
        content: this.renderer.render(rootTemplates[filename], vars),
        templateUsed: 'monorepo',
      });
    }

    // Per-workspace AGENTS.md — only if agents output is enabled
    if (config.output.agents) {
      for (const workspace of analysis.detection.workspaces) {
        const wsTemplates = loadTemplates(workspace.stackId);
        const wsVars = this.buildWorkspaceVars(analysis, workspace);
        const wsOutputPath = path.join(config.output.directory, workspace.path, 'AGENTS.md');
        files.push({
          filename: 'AGENTS.md',
          outputPath: wsOutputPath,
          content: this.renderer.render(wsTemplates['AGENTS.md'], wsVars),
          templateUsed: workspace.stackId,
        });
      }
    }

    return { files, skipped: [], warnings };
  }

  private buildWorkspaceVars(analysis: ProjectAnalysis, workspace: import('../../types/index.js').WorkspaceInfo): TemplateVars {
    return {
      ...this.buildVars(analysis),
      project: {
        name: workspace.name,
        description: '',
      },
      stack: {
        primary: {
          id: workspace.stackId,
          name: workspace.stackName,
          ecosystem: 'node',
          role: 'fullstack',
          confidence: 'medium',
          indicators: [],
        },
        all: [],
        isMonorepo: false,
        packageManager: workspace.packageManager,
        language: workspace.language,
        workspaces: [],
      },
    };
  }

  private buildVars(analysis: ProjectAnalysis): TemplateVars {
    const linter = analysis.conventions.find((c) => c.type === 'linter')?.tool;
    const formatter = analysis.conventions.find((c) => c.type === 'formatter')?.tool;
    const testRunner = analysis.conventions.find((c) => c.type === 'testing')?.tool;

    return {
      project: {
        name: analysis.projectName,
        description: analysis.description ?? '',
      },
      stack: {
        primary: analysis.detection.primaryStack,
        all: analysis.detection.additionalStacks,
        isMonorepo: analysis.detection.isMonorepo,
        packageManager: analysis.detection.packageManager,
        language: analysis.detection.language,
        workspaces: analysis.detection.workspaces,
      },
      conventions: {
        ...(linter !== undefined ? { linter } : {}),
        ...(formatter !== undefined ? { formatter } : {}),
        ...(testRunner !== undefined ? { testRunner } : {}),
      },
      structure: analysis.structure,
      git: analysis.git,
      meta: {
        generatedAt: analysis.analyzedAt.toISOString().split('T')[0] ?? analysis.analyzedAt.toISOString(),
        agentctxVersion: AGENTCTX_VERSION,
      },
    };
  }
}
