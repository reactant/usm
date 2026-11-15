import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production') },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'scripts/test/**/*.test.mjs'],
    environment: 'node',
    restoreMocks: true,
  },
});
