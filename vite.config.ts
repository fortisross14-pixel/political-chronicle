import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
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
