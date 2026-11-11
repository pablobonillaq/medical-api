import { defineConfig } from 'vitest/config'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Integration tests use their own database, never the development one.
// In CI it can be changed with the TEST_DATABASE_URL environment variable.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://medical:medical@localhost:5433/medical_api_test?schema=public'
process.env.TEST_DATABASE_URL = testDatabaseUrl

export default defineConfig({
  test: {
    environment: 'node',
    // Fixed values so the tests never depend on your local .env
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'test-secret-that-is-long-enough-for-the-validation',
      CLINIC_TIMEZONE: 'America/Mexico_City',
      UPLOADS_DIR: path.join(tmpdir(), 'medical-api-test-uploads'),
      // Tests send many requests from the same IP; security.int.test.ts turns them on
      RATE_LIMIT_ENABLED: 'false',
    },
    // Undo every vi.spyOn() after each test, so tests do not affect each other
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.int.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.int.test.ts'],
          // Creates the test database and applies the migrations once, before all files
          globalSetup: ['./src/test/global-setup.ts'],
          // All files share one database: run them one after another
          fileParallelism: false,
          testTimeout: 15_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/**/*.test.ts',
        'src/test/**',
        'src/types/**',
        'src/index.ts',
        'src/db/seed.ts',
        'src/scripts/**',
      ],
      reporter: ['text', 'html', 'lcov'],
      // The run fails if any line, branch, function or statement is left untested
      thresholds: { 100: true },
    },
  },
})
