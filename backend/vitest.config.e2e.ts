import { defineConfig } from 'vitest/config';

/**
 * API tests: boot the real Nest application against the TEST_DATABASE_URL database
 * (migrated and wiped automatically) and exercise it over HTTP with supertest.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // Test files share one database, so run them one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
