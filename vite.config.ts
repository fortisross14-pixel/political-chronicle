import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

/** Fills public/sw.js (copied to dist) with the list of files to precache for offline play. */
function serviceWorkerPrecache(): Plugin {
  return {
    name: 'sw-precache',
    apply: 'build',
    closeBundle() {
      const out = 'dist';
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of readdirSync(dir)) {
          const full = join(dir, f);
          if (statSync(full).isDirectory()) walk(full);
          else if (f !== 'sw.js' && !f.endsWith('.woff')) files.push(relative(out, full).split('\\').join('/'));
        }
      };
      walk(out);
      const list = ['./', ...files.sort().map((f) => `./${f}`)];
      const version = createHash('sha256').update(list.join('|')).digest('hex').slice(0, 12);
      const sw = join(out, 'sw.js');
      writeFileSync(sw, readFileSync(sw, 'utf8').replace('__PRECACHE__', JSON.stringify(list)).replace('__VERSION__', version));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), serviceWorkerPrecache()],
  build: { outDir: 'dist', sourcemap: false },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/data/**', 'src/storage/**'],
      exclude: ['**/*.test.*', 'src/engine/testUtils.ts'],
      reporter: ['text-summary', 'html'],
      // Floors just under today's numbers: coverage may grow, not quietly shrink.
      thresholds: { statements: 90, branches: 84, functions: 90, lines: 93 },
    },
  },
});
