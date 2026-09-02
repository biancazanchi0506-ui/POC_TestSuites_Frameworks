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

export function hayDisponibilidad(turnos: Turno[], fecha: string, hora: string): boolean {
  return !turnos.some((t) => t.fecha === fecha && t.hora === hora)
}

function validarNuevoTurno(nuevoTurno: NuevoTurno): void {
  if (!nuevoTurno.fecha || !FECHA_REGEX.test(nuevoTurno.fecha)) {
    throw new TurnoInvalidoError('La fecha debe tener el formato DD-MM-AAAA')
  }
  if (!nuevoTurno.hora || !HORA_REGEX.test(nuevoTurno.hora)) {
    throw new TurnoInvalidoError('La hora debe tener el formato HH:mm')
  }
  if (!nuevoTurno.paciente || !nuevoTurno.paciente.trim()) {
    throw new TurnoInvalidoError('El paciente es obligatorio')
  }
}

export function reservarTurno(
  turnos: Turno[],
  nuevoTurno: NuevoTurno
): { turnos: Turno[]; turno: Turno } {
  validarNuevoTurno(nuevoTurno)

  if (!hayDisponibilidad(turnos, nuevoTurno.fecha, nuevoTurno.hora)) {
    throw new TurnoOcupadoError(nuevoTurno.fecha, nuevoTurno.hora)
  }

  const turno: Turno = { id: globalThis.crypto.randomUUID(), ...nuevoTurno }
  return { turnos: [...turnos, turno], turno }
}

export function cancelarTurno(turnos: Turno[], id: string): Turno[] {
  return turnos.filter((t) => t.id !== id)
}

export function listarTurnosPorFecha(turnos: Turno[], fecha: string): Turno[] {
  return turnos.filter((t) => t.fecha === fecha)
}
