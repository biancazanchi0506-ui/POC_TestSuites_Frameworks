// Versión B — handlers de MSW con estado en memoria.
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from './setup'
import { seedTurnos } from './handlers'
import {
  cancelarTurno,
  listarTurnos,
  reservarTurno,
  ServidorNoDisponibleError,
  TurnoInvalidoError,
  TurnoOcupadoError,
  type Turno,
} from '../../src/apiTurnos'

const BASE_URL = 'http://localhost:3000'

describe('apiTurnos — Versión B (handlers de MSW)', () => {
  it('listar devuelve la lista de turnos', async () => {
    const turnos: Turno[] = [{ id: '1', fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }]
    seedTurnos(turnos)

    await expect(listarTurnos()).resolves.toEqual(turnos)
  })

  it('listar con fecha arma bien la query string', async () => {
    seedTurnos([
      { id: '1', fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' },
      { id: '2', fecha: '2026-09-02', hora: '11:00', paciente: 'Beto' },
    ])

    // Verificación sobre el request real: el handler filtró de verdad
    // por la fecha que llegó en la query string.
    const resultado = await listarTurnos('2026-09-01')

    expect(resultado).toEqual([{ id: '1', fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }])
  })

  it('listar lanza ServidorNoDisponibleError con un 500', async () => {
    // Único caso que necesita un override puntual: un 500 no es algo
    // que un handler "real" decida a partir del input.
    server.use(
      http.get(`${BASE_URL}/turnos`, () => HttpResponse.json({ error: 'error interno' }, { status: 500 })),
    )

    await expect(listarTurnos()).rejects.toThrow(ServidorNoDisponibleError)
  })

  it('reservar devuelve el turno creado con su id', async () => {
    const turno = await reservarTurno({ fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' })

    expect(typeof turno.id).toBe('string')
  })

  it('reservar envía el body serializado y el header correctos', async () => {
    const nuevo = { fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }

    // El handler solo puede devolver el turno completo si pudo parsear
    // el body y el Content-Type que mandó el cliente: se verifica el
    // comportamiento real, a través de la respuesta.
    const turno = await reservarTurno(nuevo)

    expect(turno).toMatchObject(nuevo)
  })

  it('reservar lanza TurnoOcupadoError con un 409', async () => {
    seedTurnos([{ id: '1', fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }])

    await expect(
      reservarTurno({ fecha: '2026-09-01', hora: '10:00', paciente: 'Beto' }),
    ).rejects.toThrow(TurnoOcupadoError)
  })

  it('reservar propaga el motivo del servidor con un 400', async () => {
    await expect(
      reservarTurno({ fecha: 'fecha-mal-formada', hora: '10:00', paciente: 'Ana' }),
    ).rejects.toThrow('fecha inválida')
  })

  it('cancelar resuelve sin error con un 204', async () => {
    seedTurnos([{ id: '1', fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }])

    await expect(cancelarTurno('1')).resolves.toBeUndefined()
  })

  it('cancelar lanza TurnoInvalidoError con un 404', async () => {
    await expect(cancelarTurno('no-existe')).rejects.toThrow(TurnoInvalidoError)
  })

  it('reservar rechaza hora con formato inválido', async () => {
    await expect(
      reservarTurno({ fecha: '2026-09-01', hora: '25:99', paciente: 'Ana' }),
    ).rejects.toThrow('hora inválida')
  })

  it('reservar rechaza paciente vacío', async () => {
    await expect(
      reservarTurno({ fecha: '2026-09-01', hora: '10:00', paciente: '   ' }),
    ).rejects.toThrow('paciente requerido')
  })

  it('listar rechaza fecha con formato inválido', async () => {
    await expect(listarTurnos('fecha-mal-formada')).rejects.toThrow('fecha inválida')
  })

  it('listar con fecha sin turnos devuelve un array vacío', async () => {
    // Se siembra un turno en otra fecha para probar que el handler filtra
    // de verdad, no que devuelve vacío porque el store está vacío.
    seedTurnos([{ id: '1', fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }])

    await expect(listarTurnos('2026-09-03')).resolves.toEqual([])
  })
})
