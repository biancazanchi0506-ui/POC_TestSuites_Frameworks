// SETUP — Versión A.
// Único lugar donde vive el plumbing de "mockear fetch a mano":
// reemplazar el fetch global por un mock y armar respuestas falsas.
import { afterEach, beforeEach, vi } from 'vitest'

// Hace que la próxima llamada a fetch() devuelva esta respuesta, una sola vez.
export function mockFetchOnce(status: number, body?: unknown, headers?: Record<string, string>): void {
  const init: ResponseInit = { status, headers: { 'Content-Type': 'application/json', ...headers } }
  const responseBody = body === undefined ? null : JSON.stringify(body)

  vi.mocked(fetch).mockResolvedValueOnce(new Response(responseBody, init))
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})
