// Cliente HTTP del sistema de turnos médicos.
// Sin lógica de dominio: solo arma requests y traduce respuestas a errores tipados.

const BASE_URL = 'http://localhost:3000'

export interface Turno {
  id: string
  fecha: string
  hora: string
  paciente: string
}

export interface NuevoTurno {
  fecha: string
  hora: string
  paciente: string
}

export class TurnoOcupadoError extends Error {
  constructor() {
    super('el turno ya está ocupado')
    this.name = 'TurnoOcupadoError'
  }
}

export class TurnoInvalidoError extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'TurnoInvalidoError'
  }
}

export class ServidorNoDisponibleError extends Error {
  constructor(status: number) {
    super(`el servidor no está disponible (status ${status})`)
    this.name = 'ServidorNoDisponibleError'
  }
}

// Traduce un status HTTP de error al error tipado correspondiente.
// 409: turno ocupado. 400 o 404: dato o referencia inválida (propaga el motivo).
// Cualquier otro código: servidor no disponible.
async function throwApiError(response: Response): Promise<never> {
  const { error } = (await response.json()) as { error: string }

  if (response.status === 409) {
    throw new TurnoOcupadoError()
  }
  if (response.status === 400 || response.status === 404) {
    throw new TurnoInvalidoError(error)
  }
  throw new ServidorNoDisponibleError(response.status)
}

export async function listarTurnos(fecha?: string): Promise<Turno[]> {
  const query = fecha ? `?${new URLSearchParams({ fecha })}` : ''
  const response = await fetch(`${BASE_URL}/turnos${query}`)

  if (!response.ok) {
    return throwApiError(response)
  }

  return response.json() as Promise<Turno[]>
}

export async function reservarTurno(nuevo: NuevoTurno): Promise<Turno> {
  const response = await fetch(`${BASE_URL}/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nuevo),
  })

  if (!response.ok) {
    return throwApiError(response)
  }

  return response.json() as Promise<Turno>
}

export async function cancelarTurno(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/turnos/${id}`, { method: 'DELETE' })

  if (!response.ok) {
    return throwApiError(response)
  }
  // Un 204 no trae body: no hay nada que parsear.
}
