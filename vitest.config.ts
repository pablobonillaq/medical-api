import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Fixed values so the tests never depend on your local .env
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://medical:medical@localhost:5433/medical_api_test?schema=public',
      JWT_SECRET: 'test-secret-that-is-long-enough-for-the-validation',
      CLINIC_TIMEZONE: 'America/Mexico_City',
    },
    // Undo every vi.spyOn() after each test, so tests do not affect each other
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/**/*.test.ts',
        'src/types/**',
        'src/index.ts',
        'src/db/seed.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
    },
  },
})
