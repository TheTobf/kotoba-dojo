import { defineConfig } from 'vitest/config'

// Tests laufen in Node. Die Datenbank ist dabei ein echtes D1 (SQLite) aus Miniflare – siehe tests/helpers.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
