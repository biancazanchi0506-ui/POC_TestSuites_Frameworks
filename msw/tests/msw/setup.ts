// SETUP — Versión B.
// Archivo de setup compartido: arranca el servidor MSW y resetea
// estado y handlers entre tests.
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers, resetStore } from './handlers'

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  resetStore()
})

afterAll(() => server.close())
