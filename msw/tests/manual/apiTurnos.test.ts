// Versión A — mock manual de fetch con vi.stubGlobal.
import { describe, expect, it, vi } from 'vitest'
import { mockFetchOnce } from './mockFetch'
import {
  cancelarTurno,
  listarTurnos,
  reservarTurno,
  ServidorNoDisponibleError,
  TurnoInvalidoError,
  TurnoOcupadoError,
  type Turno,
} from '../../src/apiTurnos'

describe('apiTurnos — Versión A (mock manual de fetch)', () => {
  it('listar devuelve la lista de turnos', async () => {
    const turnos: Turno[] = [{ id: '1', fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }]
    mockFetchOnce(200, turnos)

    await expect(listarTurnos()).resolves.toEqual(turnos)
  })

  it('listar con fecha arma bien la query string', async () => {
    mockFetchOnce(200, [])

    await listarTurnos('2026-09-01')

    // Inspección indirecta: se verifica el argumento que recibió el mock, no un comportamiento real.
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://localhost:3000/turnos?fecha=2026-09-01')
  })

  it('listar lanza ServidorNoDisponibleError con un 500', async () => {
    mockFetchOnce(500, { error: 'error interno' })

    await expect(listarTurnos()).rejects.toThrow(ServidorNoDisponibleError)
  })

  it('reservar devuelve el turno creado con su id', async () => {
    const creado: Turno = { id: '5', fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }
    mockFetchOnce(201, creado)

    await expect(
      reservarTurno({ fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }),
    ).resolves.toEqual(creado)
  })

  it('reservar envía el body serializado y el header correctos', async () => {
    const nuevo = { fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }
    mockFetchOnce(201, { id: '5', ...nuevo })

    await reservarTurno(nuevo)

    // Inspección indirecta: se lee el segundo argumento que recibió el mock.
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.body).toBe(JSON.stringify(nuevo))
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('reservar lanza TurnoOcupadoError con un 409', async () => {
    mockFetchOnce(409, { error: 'turno ocupado' })

    await expect(
      reservarTurno({ fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }),
    ).rejects.toThrow(TurnoOcupadoError)
  })

  it('reservar propaga el motivo del servidor con un 400', async () => {
    mockFetchOnce(400, { error: 'fecha inválida' })

    await expect(
      reservarTurno({ fecha: 'fecha-mal-formada', hora: '10:00', paciente: 'Ana' }),
    ).rejects.toThrow('fecha inválida')
  })

  it('cancelar resuelve sin error con un 204', async () => {
    mockFetchOnce(204)

    await expect(cancelarTurno('1')).resolves.toBeUndefined()
  })

  it('cancelar lanza TurnoInvalidoError con un 404', async () => {
    mockFetchOnce(404, { error: 'turno inexistente' })

    await expect(cancelarTurno('no-existe')).rejects.toThrow(TurnoInvalidoError)
  })

  it('reservar rechaza hora con formato inválido', async () => {
    mockFetchOnce(400, { error: 'hora inválida' })

    await expect(
      reservarTurno({ fecha: '2026-09-01', hora: '25:99', paciente: 'Ana' }),
    ).rejects.toThrow('hora inválida')
  })

  it('reservar rechaza paciente vacío', async () => {
    mockFetchOnce(400, { error: 'paciente requerido' })

    await expect(
      reservarTurno({ fecha: '2026-09-01', hora: '10:00', paciente: '   ' }),
    ).rejects.toThrow('paciente requerido')
  })

  it('listar rechaza fecha con formato inválido', async () => {
    mockFetchOnce(400, { error: 'fecha inválida' })

    await expect(listarTurnos('fecha-mal-formada')).rejects.toThrow('fecha inválida')
  })

  it('listar con fecha sin turnos devuelve un array vacío', async () => {
    mockFetchOnce(200, [])

    await expect(listarTurnos('2026-09-03')).resolves.toEqual([])
  })
})
