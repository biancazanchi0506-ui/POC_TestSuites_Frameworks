import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/apiTurnos.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
})
