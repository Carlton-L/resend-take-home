import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig's paths are invisible to Vitest, so the alias is declared again here. Without it a
  // test importing through '@/' resolves as a bare package name and fails at import time.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws unless it is resolved under the react-server condition, which only
      // Next applies. Tests import server modules directly, so they get the package's empty entry.
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
