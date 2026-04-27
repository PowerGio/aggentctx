import type { StackId, ContextFile } from '../types/index.js';

import { template as nextjsAgents }  from './stacks/nextjs/AGENTS.md.js';
import { template as nextjsClaude }  from './stacks/nextjs/CLAUDE.md.js';
import { template as nextjsDesign }  from './stacks/nextjs/DESIGN.md.js';
import { template as djangoAgents }  from './stacks/django/AGENTS.md.js';
import { template as laravelAgents } from './stacks/laravel/AGENTS.md.js';
import { template as expressAgents }  from './stacks/express/AGENTS.md.js';
import { template as expressClaude }  from './stacks/express/CLAUDE.md.js';
import { template as expressDesign }  from './stacks/express/DESIGN.md.js';
import { template as fastapiAgents }  from './stacks/fastapi/AGENTS.md.js';
import { template as fastapiClaude }  from './stacks/fastapi/CLAUDE.md.js';
import { template as fastapiDesign }  from './stacks/fastapi/DESIGN.md.js';
import { template as nestjsAgents }   from './stacks/nestjs/AGENTS.md.js';
import { template as nestjsClaude }   from './stacks/nestjs/CLAUDE.md.js';
import { template as nestjsDesign }   from './stacks/nestjs/DESIGN.md.js';
import { template as baseAgents }     from './base/AGENTS.md.js';
import { template as baseClaude }     from './base/CLAUDE.md.js';
import { template as baseDesign }     from './base/DESIGN.md.js';
import { template as monorepoAgents } from './monorepo/AGENTS.md.js';
import { template as monorepoClaude } from './monorepo/CLAUDE.md.js';
import { template as monorepoDesign } from './monorepo/DESIGN.md.js';

export interface TemplateSet {
  readonly 'AGENTS.md': string;
  readonly 'CLAUDE.md': string;
  readonly 'DESIGN.md': string;
}

const STACK_TEMPLATES: Partial<Record<StackId, TemplateSet>> = {
  nextjs: {
    'AGENTS.md': nextjsAgents,
    'CLAUDE.md': nextjsClaude,
    'DESIGN.md': nextjsDesign,
  },
  django: {
    'AGENTS.md': djangoAgents,
    'CLAUDE.md': baseClaude,
    'DESIGN.md': baseDesign,
  },
  laravel: {
    'AGENTS.md': laravelAgents,
    'CLAUDE.md': baseClaude,
    'DESIGN.md': baseDesign,
  },
  express: {
    'AGENTS.md': expressAgents,
    'CLAUDE.md': expressClaude,
    'DESIGN.md': expressDesign,
  },
  fastapi: {
    'AGENTS.md': fastapiAgents,
    'CLAUDE.md': fastapiClaude,
    'DESIGN.md': fastapiDesign,
  },
  nestjs: {
    'AGENTS.md': nestjsAgents,
    'CLAUDE.md': nestjsClaude,
    'DESIGN.md': nestjsDesign,
  },
  monorepo: {
    'AGENTS.md': monorepoAgents,
    'CLAUDE.md': monorepoClaude,
    'DESIGN.md': monorepoDesign,
  },
};

// Extension point — call this to register custom stacks at runtime
export function registerStack(stackId: StackId, templates: Partial<TemplateSet>): void {
  (STACK_TEMPLATES as Record<string, TemplateSet>)[stackId] = {
    ...BASE_TEMPLATES,
    ...templates,
  };
}

const BASE_TEMPLATES: TemplateSet = {
  'AGENTS.md': baseAgents,
  'CLAUDE.md': baseClaude,
  'DESIGN.md': baseDesign,
};

export function loadTemplates(stackId: StackId): TemplateSet {
  return STACK_TEMPLATES[stackId] ?? BASE_TEMPLATES;
}

export function getTemplate(set: TemplateSet, file: ContextFile): string {
  return set[file];
}
