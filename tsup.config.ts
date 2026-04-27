import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'bin/agentctx': 'src/bin/agentctx.ts',
    'index': 'src/index.ts',
  },
  format: ['esm'],
  target: 'node20',
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: ['fsevents'],
});
