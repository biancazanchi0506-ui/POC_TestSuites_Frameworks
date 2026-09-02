// SETUP — Versión B.
// Handlers de MSW: se comportan como una API real (validan, guardan estado,
// devuelven distintos códigos según el request real), no como respuestas
// sueltas atadas a cada test.
import { randomUUID } from 'node:crypto'
import { http, HttpResponse } from 'msw'
import type { Turno } from '../../src/apiTurnos'

const BASE_URL = 'http://localhost:3000'

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/

let store: Turno[] = []

// Precarga turnos en el store, para el arrange de los tests que los necesitan.
export function seedTurnos(turnos: Turno[]): void {
  store.push(...turnos)
}

// Vuelve el store al estado inicial. Se llama entre tests.
export function resetStore(): void {
  store = []
}

export const handlers = [
  http.get(`${BASE_URL}/turnos`, ({ request }) => {
    const url = new URL(request.url)
    const fecha = url.searchParams.get('fecha')

    if (fecha && !FECHA_VALIDA.test(fecha)) {
      return HttpResponse.json({ error: 'fecha inválida' }, { status: 400 })
    }

    const resultado = fecha ? store.filter((t) => t.fecha === fecha) : store

    return HttpResponse.json(resultado)
  }),

  http.post(`${BASE_URL}/turnos`, async ({ request }) => {
    const nuevo = (await request.json()) as { fecha: string; hora: string; paciente: string }

    if (!FECHA_VALIDA.test(nuevo.fecha)) {
      return HttpResponse.json({ error: 'fecha inválida' }, { status: 400 })
    }
    if (!HORA_VALIDA.test(nuevo.hora)) {
      return HttpResponse.json({ error: 'hora inválida' }, { status: 400 })
    }
    if (!nuevo.paciente || !nuevo.paciente.trim()) {
      return HttpResponse.json({ error: 'paciente requerido' }, { status: 400 })
    }
    if (store.some((t) => t.fecha === nuevo.fecha && t.hora === nuevo.hora)) {
      return HttpResponse.json({ error: 'turno ocupado' }, { status: 409 })
    }

    const turno: Turno = { id: randomUUID(), ...nuevo }
    store.push(turno)

    return HttpResponse.json(turno, { status: 201 })
  }),

  http.delete(`${BASE_URL}/turnos/:id`, ({ params }) => {
    const id = params.id as string
    const indice = store.findIndex((t) => t.id === id)

    if (indice === -1) {
      return HttpResponse.json({ error: 'turno inexistente' }, { status: 404 })
    }

    store.splice(indice, 1)

    return new HttpResponse(null, { status: 204 })
  }),
]
