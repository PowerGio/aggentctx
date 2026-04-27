export type StackId =
  | 'nextjs' | 'react' | 'astro' | 'remix' | 'nuxt' | 'svelte' | 'vite'
  | 'express' | 'fastify' | 'nestjs' | 'hono'
  | 'django' | 'fastapi' | 'flask'
  | 'laravel' | 'symfony'
  | 'rails'
  | 'go-fiber' | 'go-gin' | 'go-echo'
  | 'expo' | 'react-native'
  | 'unknown';

export type ConfidenceLevel = 'definitive' | 'high' | 'medium' | 'low';
export type Language = 'typescript' | 'javascript' | 'python' | 'php' | 'ruby' | 'go' | 'rust' | 'unknown';
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'poetry' | 'composer' | 'bundler' | 'go' | 'unknown';
export type Ecosystem = 'node' | 'python' | 'php' | 'ruby' | 'go' | 'rust';

export interface StackInfo {
  readonly id: StackId;
  readonly name: string;
  readonly version?: string;
  readonly confidence: ConfidenceLevel;
  readonly indicators: readonly string[];
  readonly ecosystem: Ecosystem;
  readonly role: 'frontend' | 'backend' | 'fullstack' | 'mobile';
}

export interface DetectionResult {
  readonly primaryStack: StackInfo;
  readonly additionalStacks: readonly StackInfo[];
  readonly isMonorepo: boolean;
  readonly packageManager: PackageManager;
  readonly language: Language;
}

export interface Convention {
  readonly type: 'linter' | 'formatter' | 'testing' | 'bundler' | 'typechecker';
  readonly tool: string;
  readonly configFile?: string;
}

export interface ProjectStructure {
  readonly rootFiles: readonly string[];
  readonly sourceDir?: string;
  readonly testDir?: string;
  readonly hasCi: boolean;
  readonly hasDocker: boolean;
}

export interface GitInfo {
  readonly hasGit: boolean;
  readonly defaultBranch?: string;
  readonly recentAuthors: readonly string[];
  readonly totalCommits: number;
  readonly lastCommitDate?: Date;
}

export interface ProjectAnalysis {
  readonly projectRoot: string;
  readonly projectName: string;
  readonly description?: string;
  readonly detection: DetectionResult;
  readonly conventions: readonly Convention[];
  readonly structure: ProjectStructure;
  readonly git: GitInfo;
  readonly analyzedAt: Date;
}

export interface TemplateVars {
  readonly project: {
    readonly name: string;
    readonly description: string;
  };
  readonly stack: {
    readonly primary: StackInfo;
    readonly all: readonly StackInfo[];
    readonly isMonorepo: boolean;
    readonly packageManager: PackageManager;
    readonly language: Language;
  };
  readonly conventions: {
    readonly linter?: string;
    readonly formatter?: string;
    readonly testRunner?: string;
  };
  readonly structure: ProjectStructure;
  readonly git: GitInfo;
  readonly meta: {
    readonly generatedAt: string;
    readonly agentctxVersion: string;
  };
}

export type ContextFile = 'AGENTS.md' | 'CLAUDE.md' | 'DESIGN.md';

export interface OutputFile {
  readonly filename: ContextFile;
  readonly outputPath: string;
  readonly content: string;
  readonly templateUsed: string;
}

export interface GenerationResult {
  readonly files: readonly OutputFile[];
  readonly skipped: readonly string[];
  readonly warnings: readonly string[];
}

export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly file: string;
  readonly line?: number;
  readonly severity: 'error' | 'warning';
  readonly suggestion?: string;
}

export interface ValidationResult {
  readonly file: string;
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationError[];
  readonly score: number;
}

export interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  readDir(path: string): Promise<string[]>;
  mkdir(path: string): Promise<void>;
}

export interface AgentctxConfig {
  readonly output: {
    readonly agents: boolean;
    readonly claude: boolean;
    readonly design: boolean;
    readonly directory: string;
  };
  readonly update: {
    readonly strategy: 'overwrite' | 'merge' | 'prompt';
    readonly backup: boolean;
  };
  readonly detection: {
    readonly forceStack?: StackId;
    readonly excludeDirs: readonly string[];
  };
  readonly vars?: Record<string, unknown>;
}
