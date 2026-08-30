import { describe, it, expect } from 'vitest'
import {
  hayDisponibilidad,
  reservarTurno,
  cancelarTurno,
  listarTurnosPorFecha,
  TurnoOcupadoError,
  TurnoInvalidoError,
} from '../src/turnos'
import type { Turno } from '../src/types'

const turnoBase: Turno = {
  id: '1',
  fecha: '2026-08-15',
  hora: '10:00',
  paciente: 'Juan Perez',
}

describe('hayDisponibilidad', () => {
  it('devuelve true si no hay ningún turno en esa fecha/hora', () => {
    expect(hayDisponibilidad([], '2026-08-15', '10:00')).toBe(true)
  })

  it('devuelve false si ya existe un turno en esa fecha/hora', () => {
    expect(hayDisponibilidad([turnoBase], '2026-08-15', '10:00')).toBe(false)
  })

  it('devuelve true si hay turnos ese día pero en otro horario', () => {
    expect(hayDisponibilidad([turnoBase], '2026-08-15', '11:00')).toBe(true)
  })

  it('devuelve true si la lista de turnos está vacía', () => {
    expect(hayDisponibilidad([], '2026-08-15', '10:00')).toBe(true)
  })
})

describe('reservarTurno', () => {
  it('agrega el turno correctamente cuando el horario está libre', () => {
    const { turnos, turno } = reservarTurno([], {
      fecha: '2026-08-15',
      hora: '10:00',
      paciente: 'Ana Gomez',
    })
    expect(turnos).toHaveLength(1)
    expect(turno.paciente).toBe('Ana Gomez')
  })

  it('genera un id para el turno agregado', () => {
    const { turno } = reservarTurno([], {
      fecha: '2026-08-15',
      hora: '10:00',
      paciente: 'Ana Gomez',
    })
    expect(turno.id).toBeTruthy()
  })

  it('lanza TurnoOcupadoError si el horario ya está ocupado', () => {
    expect(() =>
      reservarTurno([turnoBase], {
        fecha: '2026-08-15',
        hora: '10:00',
        paciente: 'Otro Paciente',
      })
    ).toThrow(TurnoOcupadoError)
  })

  it('no modifica el array original (inmutabilidad)', () => {
    const original: Turno[] = []
    reservarTurno(original, { fecha: '2026-08-15', hora: '10:00', paciente: 'Ana' })
    expect(original).toHaveLength(0)
  })

  it('rechaza fecha con formato inválido', () => {
    expect(() =>
      reservarTurno([], { fecha: '15-08-2026', hora: '10:00', paciente: 'Ana' })
    ).toThrow(TurnoInvalidoError)
  })

  it('rechaza hora con formato inválido', () => {
    expect(() =>
      reservarTurno([], { fecha: '2026-08-15', hora: '25:00', paciente: 'Ana' })
    ).toThrow(TurnoInvalidoError)
  })

  it('rechaza paciente vacío', () => {
    expect(() =>
      reservarTurno([], { fecha: '2026-08-15', hora: '10:00', paciente: '  ' })
    ).toThrow(TurnoInvalidoError)
  })
})

describe('cancelarTurno', () => {
  it('elimina el turno si el id existe', () => {
    const resultado = cancelarTurno([turnoBase], '1')
    expect(resultado).toHaveLength(0)
  })

  it('devuelve la lista sin cambios si el id no existe', () => {
    const resultado = cancelarTurno([turnoBase], 'no-existe')
    expect(resultado).toHaveLength(1)
  })

  it('no afecta a otros turnos al cancelar uno', () => {
    const otro: Turno = { ...turnoBase, id: '2', hora: '11:00' }
    const resultado = cancelarTurno([turnoBase, otro], '1')
    expect(resultado).toEqual([otro])
  })
})

describe('listarTurnosPorFecha', () => {
  it('devuelve solo los turnos de esa fecha', () => {
    const otraFecha: Turno = { ...turnoBase, id: '2', fecha: '2026-08-16' }
    const resultado = listarTurnosPorFecha([turnoBase, otraFecha], '2026-08-15')
    expect(resultado).toEqual([turnoBase])
  })

  it('devuelve array vacío si no hay turnos ese día', () => {
    expect(listarTurnosPorFecha([turnoBase], '2026-01-01')).toEqual([])
  })

  it('no incluye turnos de otras fechas con la misma hora', () => {
    const otraFecha: Turno = { ...turnoBase, id: '2', fecha: '2026-08-16' }
    const resultado = listarTurnosPorFecha([turnoBase, otraFecha], '2026-08-15')
    expect(resultado.every((t) => t.fecha === '2026-08-15')).toBe(true)
  })
})