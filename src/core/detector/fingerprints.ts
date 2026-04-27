import type { StackId } from '../../types/index.js';

export interface Fingerprint {
  readonly stackId: StackId;
  readonly files?: readonly string[];
  readonly packageJsonDeps?: readonly string[];
  readonly requirementsTxt?: readonly string[];
  readonly composerJsonRequire?: readonly string[];
  readonly goModImports?: readonly string[];
  readonly fileContains?: readonly { readonly file: string; readonly pattern: string }[];
  readonly weight: number;
}

export const FINGERPRINTS: readonly Fingerprint[] = [
  // ---- Next.js ----
  { stackId: 'nextjs', files: ['next.config.js', 'next.config.mjs', 'next.config.ts'], weight: 10 },
  { stackId: 'nextjs', packageJsonDeps: ['next'], weight: 9 },
  { stackId: 'nextjs', files: ['app/layout.tsx', 'app/layout.jsx'], weight: 8 },
  { stackId: 'nextjs', files: ['pages/_app.tsx', 'pages/_app.jsx'], weight: 7 },

  // ---- Astro ----
  { stackId: 'astro', files: ['astro.config.mjs', 'astro.config.ts', 'astro.config.js'], weight: 10 },
  { stackId: 'astro', packageJsonDeps: ['astro'], weight: 9 },

  // ---- Remix ----
  { stackId: 'remix', files: ['remix.config.js', 'remix.config.ts'], weight: 10 },
  { stackId: 'remix', packageJsonDeps: ['@remix-run/react', '@remix-run/node'], weight: 9 },

  // ---- Nuxt ----
  { stackId: 'nuxt', files: ['nuxt.config.ts', 'nuxt.config.js'], weight: 10 },
  { stackId: 'nuxt', packageJsonDeps: ['nuxt'], weight: 9 },

  // ---- Svelte/SvelteKit ----
  { stackId: 'svelte', files: ['svelte.config.js', 'svelte.config.ts'], weight: 10 },
  { stackId: 'svelte', packageJsonDeps: ['svelte', '@sveltejs/kit'], weight: 9 },

  // ---- Vite + React (generic) ----
  { stackId: 'vite', files: ['vite.config.ts', 'vite.config.js'], weight: 6 },
  { stackId: 'react', packageJsonDeps: ['react', 'react-dom'], weight: 7 },

  // ---- Express ----
  { stackId: 'express', packageJsonDeps: ['express'], weight: 8 },
  { stackId: 'express', fileContains: [{ file: 'index.ts', pattern: "from 'express'" }, { file: 'app.ts', pattern: "from 'express'" }], weight: 6 },

  // ---- Fastify ----
  { stackId: 'fastify', packageJsonDeps: ['fastify'], weight: 9 },

  // ---- NestJS ----
  { stackId: 'nestjs', packageJsonDeps: ['@nestjs/core', '@nestjs/common'], weight: 10 },
  { stackId: 'nestjs', files: ['nest-cli.json'], weight: 9 },

  // ---- Hono ----
  { stackId: 'hono', packageJsonDeps: ['hono'], weight: 9 },

  // ---- Django ----
  { stackId: 'django', requirementsTxt: ['django', 'Django'], weight: 9 },
  { stackId: 'django', fileContains: [{ file: 'manage.py', pattern: 'django' }], weight: 10 },
  { stackId: 'django', files: ['django.py'], weight: 5 },

  // ---- FastAPI ----
  { stackId: 'fastapi', requirementsTxt: ['fastapi', 'FastAPI'], weight: 10 },
  { stackId: 'fastapi', fileContains: [{ file: 'main.py', pattern: 'from fastapi' }], weight: 9 },

  // ---- Flask ----
  { stackId: 'flask', requirementsTxt: ['flask', 'Flask'], weight: 9 },
  { stackId: 'flask', fileContains: [{ file: 'app.py', pattern: 'from flask' }], weight: 8 },

  // ---- Laravel ----
  { stackId: 'laravel', composerJsonRequire: ['laravel/framework'], weight: 10 },
  { stackId: 'laravel', files: ['artisan'], weight: 9 },
  { stackId: 'laravel', files: ['app/Http/Kernel.php'], weight: 8 },

  // ---- Symfony ----
  { stackId: 'symfony', composerJsonRequire: ['symfony/framework-bundle'], weight: 10 },
  { stackId: 'symfony', files: ['bin/console', 'config/bundles.php'], weight: 8 },

  // ---- Rails ----
  { stackId: 'rails', files: ['config/routes.rb', 'app/controllers/application_controller.rb'], weight: 10 },
  { stackId: 'rails', fileContains: [{ file: 'Gemfile', pattern: "gem 'rails'" }], weight: 10 },

  // ---- Go Fiber ----
  { stackId: 'go-fiber', goModImports: ['github.com/gofiber/fiber'], weight: 10 },

  // ---- Go Gin ----
  { stackId: 'go-gin', goModImports: ['github.com/gin-gonic/gin'], weight: 10 },

  // ---- Go Echo ----
  { stackId: 'go-echo', goModImports: ['github.com/labstack/echo'], weight: 10 },

  // ---- Expo ----
  { stackId: 'expo', packageJsonDeps: ['expo'], weight: 10 },
  { stackId: 'expo', files: ['app.json', 'app.config.ts'], weight: 6 },

  // ---- React Native ----
  { stackId: 'react-native', packageJsonDeps: ['react-native'], weight: 9 },
];
