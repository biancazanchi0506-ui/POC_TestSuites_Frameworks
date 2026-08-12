import { randomUUID } from 'node:crypto'
import type { Turno, NuevoTurno } from './types'

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export class TurnoOcupadoError extends Error {
  constructor(fecha: string, hora: string) {
    super(`Ya existe un turno reservado para ${fecha} ${hora}`)
    this.name = 'TurnoOcupadoError'
  }
}

export class TurnoInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'TurnoInvalidoError'
  }
}

/**
 * Chequea si un horario específico está libre en una fecha dada.
 */
export function hayDisponibilidad(turnos: Turno[], fecha: string, hora: string): boolean {
  return !turnos.some((t) => t.fecha === fecha && t.hora === hora)
}

/**
 * Valida los datos de un nuevo turno antes de reservarlo.
 */
function validarNuevoTurno(nuevoTurno: NuevoTurno): void {
  if (!nuevoTurno.fecha || !FECHA_REGEX.test(nuevoTurno.fecha)) {
    throw new TurnoInvalidoError('La fecha debe tener el formato YYYY-MM-DD')
  }
  if (!nuevoTurno.hora || !HORA_REGEX.test(nuevoTurno.hora)) {
    throw new TurnoInvalidoError('La hora debe tener el formato HH:mm')
  }
  if (!nuevoTurno.paciente || !nuevoTurno.paciente.trim()) {
    throw new TurnoInvalidoError('El paciente es obligatorio')
  }
}

/**
 * Agrega un nuevo turno a la lista si el horario está libre.
 * Devuelve una NUEVA lista (no muta la original) junto con el turno creado.
 */
export function reservarTurno(
  turnos: Turno[],
  nuevoTurno: NuevoTurno
): { turnos: Turno[]; turno: Turno } {
  validarNuevoTurno(nuevoTurno)

  if (!hayDisponibilidad(turnos, nuevoTurno.fecha, nuevoTurno.hora)) {
    throw new TurnoOcupadoError(nuevoTurno.fecha, nuevoTurno.hora)
  }

  const turno: Turno = { id: randomUUID(), ...nuevoTurno }
  return { turnos: [...turnos, turno], turno }
}

/**
 * Elimina un turno por id. Devuelve una NUEVA lista.
 * Si el id no existe, devuelve la lista sin cambios.
 */
export function cancelarTurno(turnos: Turno[], id: string): Turno[] {
  return turnos.filter((t) => t.id !== id)
}

/**
 * Lista todos los turnos de una fecha específica.
 */
export function listarTurnosPorFecha(turnos: Turno[], fecha: string): Turno[] {
  return turnos.filter((t) => t.fecha === fecha)
}
