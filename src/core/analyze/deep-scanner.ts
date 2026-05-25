import fs from 'node:fs/promises';
import path from 'node:path';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'coverage',
  '__pycache__', '.venv', 'venv', '.pytest_cache', 'vendor', '.gradle',
  'target', 'out', '.turbo', '.cache', 'tmp', '.tmp', '.claude',
]);

const SOURCE_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.php', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.vue', '.svelte', '.astro',
]);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DirStats {
  path: string;           // relative path
  fileCount: number;
  sourceCount: number;
  lineCount: number;
  description?: string;  // inferred role
}

export interface KeyFile {
  path: string;
  role: string;
}

export interface DetectedIntegration {
  name: string;
  files: string[];
}

export interface DeepScanResult {
  dirStats: DirStats[];
  keyFiles: KeyFile[];
  integrations: DetectedIntegration[];
  totalSourceFiles: number;
  totalLines: number;
  packageScripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  schemaFiles: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function countLinesInFile(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

async function walkDirStats(dir: string, root: string, depth = 0): Promise<{ files: string[]; lines: number }> {
  if (depth > 4) return { files: [], lines: 0 };
  const files: string[] = [];
  let lines = 0;

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { files: [], lines: 0 };
  }

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await walkDirStats(full, root, depth + 1);
      files.push(...sub.files);
      lines += sub.lines;
    } else if (entry.isFile() && SOURCE_EXTS.has(path.extname(entry.name))) {
      files.push(full);
      lines += await countLinesInFile(full);
    }
  }
  return { files, lines };
}

function inferDirRole(name: string): string | undefined {
  const roles: Record<string, string> = {
    'app': 'App Router pages + API routes',
    'pages': 'Next.js pages (Pages Router)',
    'components': 'React/UI components',
    'src': 'Source code root',
    'api': 'API endpoints / route handlers',
    'lib': 'Shared utilities and helpers',
    'hooks': 'Custom React hooks',
    'store': 'State management',
    'services': 'Business logic / service layer',
    'models': 'Data models / ORM definitions',
    'controllers': 'MVC controllers',
    'routes': 'Route definitions',
    'middleware': 'HTTP middleware',
    'utils': 'Utility functions',
    'helpers': 'Helper functions',
    'types': 'TypeScript type definitions',
    'styles': 'CSS / styling',
    'public': 'Static assets',
    'tests': 'Test files',
    '__tests__': 'Test files',
    'test': 'Test files',
    'spec': 'Test specifications',
    'prisma': 'Prisma ORM schema + migrations',
    'migrations': 'Database migrations',
    'schemas': 'Data schemas (Zod, Yup, etc.)',
    'config': 'Configuration files',
    'scripts': 'Build / utility scripts',
    'providers': 'React context providers / IoC',
    'layouts': 'Page layout components',
    'views': 'View templates',
    'templates': 'Template files',
  };
  return roles[name.toLowerCase()];
}

// ─── Integration detection ────────────────────────────────────────────────────

const INTEGRATION_PATTERNS: Array<{ name: string; deps?: string[]; files?: string[] }> = [
  { name: 'Prisma ORM',        deps: ['@prisma/client', 'prisma'],          files: ['prisma/schema.prisma'] },
  { name: 'Drizzle ORM',       deps: ['drizzle-orm'] },
  { name: 'TypeORM',           deps: ['typeorm'] },
  { name: 'Mongoose',          deps: ['mongoose'] },
  { name: 'NextAuth',          deps: ['next-auth', '@auth/nextjs', '@auth/core'] },
  { name: 'Clerk Auth',        deps: ['@clerk/nextjs', '@clerk/clerk-sdk-node'] },
  { name: 'Lucia Auth',        deps: ['lucia'] },
  { name: 'Auth0',             deps: ['@auth0/nextjs-auth0', 'auth0'] },
  { name: 'Stripe',            deps: ['stripe', '@stripe/stripe-js'] },
  { name: 'Resend',            deps: ['resend'] },
  { name: 'Nodemailer',        deps: ['nodemailer'] },
  { name: 'SendGrid',          deps: ['@sendgrid/mail'] },
  { name: 'Redis',             deps: ['ioredis', 'redis', '@upstash/redis'] },
  { name: 'BullMQ',            deps: ['bullmq'] },
  { name: 'Supabase',          deps: ['@supabase/supabase-js', '@supabase/ssr'] },
  { name: 'Firebase',          deps: ['firebase', 'firebase-admin'] },
  { name: 'AWS SDK',           deps: ['@aws-sdk/client-s3', 'aws-sdk'] },
  { name: 'Cloudinary',        deps: ['cloudinary', 'next-cloudinary'] },
  { name: 'OpenAI',            deps: ['openai', '@ai-sdk/openai'] },
  { name: 'Anthropic',         deps: ['@anthropic-ai/sdk'] },
  { name: 'Vercel AI SDK',     deps: ['ai'] },
  { name: 'tRPC',              deps: ['@trpc/server', '@trpc/client'] },
  { name: 'GraphQL',           deps: ['graphql', 'apollo-server', '@apollo/server'] },
  { name: 'Zustand',           deps: ['zustand'] },
  { name: 'Jotai',             deps: ['jotai'] },
  { name: 'Redux Toolkit',     deps: ['@reduxjs/toolkit'] },
  { name: 'Zod',               deps: ['zod'] },
  { name: 'React Query',       deps: ['@tanstack/react-query'] },
  { name: 'Tailwind CSS',      deps: ['tailwindcss'],                       files: ['tailwind.config.ts', 'tailwind.config.js'] },
  { name: 'shadcn/ui',         files: ['components.json'] },
  { name: 'Radix UI',          deps: ['@radix-ui/react-dialog'] },
  { name: 'Docker',            files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'] },
  { name: 'GitHub Actions CI', files: ['.github/workflows'] },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export async function deepScan(projectRoot: string): Promise<DeepScanResult> {
  // 1. Package.json
  let packageScripts: Record<string, string> = {};
  let dependencies: string[] = [];
  let devDependencies: string[] = [];
  const allDeps: string[] = [];

  try {
    const pkg = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    packageScripts = pkg.scripts ?? {};
    dependencies = Object.keys(pkg.dependencies ?? {});
    devDependencies = Object.keys(pkg.devDependencies ?? {});
    allDeps.push(...dependencies, ...devDependencies);
  } catch {
    // no package.json — Python/Go/PHP project
  }

  // 2. Directory stats (top-level dirs only)
  const rootEntries = await fs.readdir(projectRoot, { withFileTypes: true }).catch(() => []);
  const dirStats: DirStats[] = [];
  let totalSourceFiles = 0;
  let totalLines = 0;

  for (const entry of rootEntries) {
    if (!entry.isDirectory() || IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = path.join(projectRoot, entry.name);
    const { files, lines } = await walkDirStats(full, projectRoot);
    const sourceCount = files.length;
    if (sourceCount === 0) continue;

    totalSourceFiles += sourceCount;
    totalLines += lines;

    const role = inferDirRole(entry.name);
    dirStats.push({
      path: entry.name,
      fileCount: sourceCount,
      sourceCount,
      lineCount: lines,
      ...(role !== undefined ? { description: role } : {}),
    });
  }

  // Sort by source file count
  dirStats.sort((a, b) => b.sourceCount - a.sourceCount);

  // 3. Key files
  const keyFiles: KeyFile[] = [];
  const KEY_FILE_ROLES: Array<[string, string]> = [
    ['src/main.ts',           'App entry point'],
    ['src/index.ts',          'App entry point'],
    ['src/app.ts',            'Express/Fastify app setup'],
    ['src/server.ts',         'HTTP server setup'],
    ['app/layout.tsx',        'Root layout (Next.js App Router)'],
    ['pages/_app.tsx',        'App wrapper (Next.js Pages Router)'],
    ['main.py',               'App entry point'],
    ['app.py',                'Flask/FastAPI app'],
    ['manage.py',             'Django management'],
    ['main.go',               'Go app entry point'],
    ['prisma/schema.prisma',  'Database schema (Prisma)'],
    ['drizzle.config.ts',     'Drizzle ORM config'],
    ['next.config.ts',        'Next.js config'],
    ['next.config.js',        'Next.js config'],
    ['vite.config.ts',        'Vite bundler config'],
    ['tailwind.config.ts',    'Tailwind CSS config'],
    ['tsconfig.json',         'TypeScript config'],
    ['docker-compose.yml',    'Docker services'],
    ['Dockerfile',            'Docker image'],
    ['.env.example',          'Required environment variables'],
    ['.env.local.example',    'Required environment variables (local)'],
  ];

  for (const [file, role] of KEY_FILE_ROLES) {
    try {
      await fs.access(path.join(projectRoot, file));
      keyFiles.push({ path: file, role });
    } catch {
      // doesn't exist
    }
  }

  // 4. Schema files
  const schemaFiles: string[] = [];
  const SCHEMA_PATTERNS = ['prisma/schema.prisma', 'schema.graphql', 'api/schema.graphql'];
  for (const f of SCHEMA_PATTERNS) {
    try {
      await fs.access(path.join(projectRoot, f));
      schemaFiles.push(f);
    } catch {
      // not found
    }
  }

  // 5. Integrations
  const integrations: DetectedIntegration[] = [];
  for (const pattern of INTEGRATION_PATTERNS) {
    const matchedByDep = pattern.deps?.some((d) => allDeps.includes(d)) ?? false;
    const matchedFiles: string[] = [];

    if (pattern.files) {
      for (const f of pattern.files) {
        try {
          await fs.access(path.join(projectRoot, f));
          matchedFiles.push(f);
        } catch {
          // not found
        }
      }
    }

    if (matchedByDep || matchedFiles.length > 0) {
      integrations.push({
        name: pattern.name,
        files: matchedFiles,
      });
    }
  }

  return {
    dirStats,
    keyFiles,
    integrations,
    totalSourceFiles,
    totalLines,
    packageScripts,
    dependencies,
    devDependencies,
    schemaFiles,
  };
}
