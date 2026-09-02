import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cancelarTurno, listarTurnosPorFecha, reservarTurno, TurnoInvalidoError } from '../src/turnos'
import { FormularioTurno } from '../src/turnos.tsx'
import type { Turno } from '../src/types'

describe('FormularioTurno', () => {
  afterEach(() => {
    cleanup()
  })

  it('reserva un turno correctamente', async () => {
    const user = userEvent.setup()

    render(<FormularioTurno />)

    const inputFecha = screen.getByLabelText('Fecha')
    const inputHora = screen.getByLabelText('Hora')
    await user.clear(inputFecha)
    await user.type(inputFecha, '2026-09-01')
    await user.clear(inputHora)
    await user.type(inputHora, '10:30')
    await user.type(screen.getByLabelText('Paciente'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    expect(screen.getByText('Turno reservado correctamente')).toBeInTheDocument()
  })

  it('muestra un error si el paciente está vacío', async () => {
    const user = userEvent.setup()

    render(<FormularioTurno />)

    const inputFecha = screen.getByLabelText('Fecha')
    const inputHora = screen.getByLabelText('Hora')
    await user.clear(inputFecha)
    await user.type(inputFecha, '2026-09-01')
    await user.clear(inputHora)
    await user.type(inputHora, '10:30')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    expect(screen.getByText('El paciente es obligatorio')).toBeInTheDocument()
  })

  it('rechaza reservar dos veces el mismo horario', async () => {
    const user = userEvent.setup()

    render(<FormularioTurno />)

    const inputFecha = screen.getByLabelText('Fecha')
    const inputHora = screen.getByLabelText('Hora')
    await user.clear(inputFecha)
    await user.type(inputFecha, '2026-09-01')
    await user.clear(inputHora)
    await user.type(inputHora, '10:30')
    await user.type(screen.getByLabelText('Paciente'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    await user.clear(inputFecha)
    await user.type(inputFecha, '2026-09-01')
    await user.clear(inputHora)
    await user.type(inputHora, '10:30')
    await user.type(screen.getByLabelText('Paciente'), 'Luis')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    expect(screen.getByText('Ya existe un turno reservado para 2026-09-01 10:30')).toBeInTheDocument()
  })

  it('lista y cancela un turno desde la interfaz', async () => {
    const user = userEvent.setup()

    render(<FormularioTurno />)

    const inputFecha = screen.getByLabelText('Fecha')
    const inputHora = screen.getByLabelText('Hora')
    await user.clear(inputFecha)
    await user.type(inputFecha, '2026-09-01')
    await user.clear(inputHora)
    await user.type(inputHora, '10:30')
    await user.type(screen.getByLabelText('Paciente'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('2026-09-01 a las 10:30')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    expect(screen.getByText('No hay turnos para mostrar.')).toBeInTheDocument()
  })

  it('permite reservar en la misma fecha si el horario es distinto', async () => {
    const user = userEvent.setup()
    render(<FormularioTurno />)

    const inputFecha = screen.getByLabelText('Fecha')
    const inputHora = screen.getByLabelText('Hora')
    const inputPaciente = screen.getByLabelText('Paciente')

    await user.clear(inputFecha)
    await user.type(inputFecha, '2026-10-15')
    await user.clear(inputHora)
    await user.type(inputHora, '09:15')
    await user.type(inputPaciente, 'Martín')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    await user.clear(inputFecha)
    await user.type(inputFecha, '2026-10-15')
    await user.clear(inputHora)
    await user.type(inputHora, '14:45')
    await user.clear(inputPaciente)
    await user.type(inputPaciente, 'Lucía')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    expect(screen.getByText('Martín')).toBeInTheDocument()
    expect(screen.getByText('Lucía')).toBeInTheDocument()
  })

  it('filtra los turnos visualmente por fecha', async () => {
    const user = userEvent.setup()
    render(<FormularioTurno />)

    await user.clear(screen.getByLabelText('Fecha'))
    await user.type(screen.getByLabelText('Fecha'), '2026-10-15')
    await user.clear(screen.getByLabelText('Hora'))
    await user.type(screen.getByLabelText('Hora'), '09:15')
    await user.type(screen.getByLabelText('Paciente'), 'Martín')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    await user.clear(screen.getByLabelText('Fecha'))
    await user.type(screen.getByLabelText('Fecha'), '2026-10-16')
    await user.clear(screen.getByLabelText('Hora'))
    await user.type(screen.getByLabelText('Hora'), '11:00')
    await user.clear(screen.getByLabelText('Paciente'))
    await user.type(screen.getByLabelText('Paciente'), 'Lucía')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    const inputFiltro = screen.getByLabelText('Filtrar turnos por fecha')
    await user.type(inputFiltro, '2026-10-16')

    expect(screen.getByText('Lucía')).toBeInTheDocument()
    expect(screen.queryByText('Martín')).not.toBeInTheDocument()
  })

  it('muestra un error si el formato del turno es inválido', async () => {
    const user = userEvent.setup()
    render(<FormularioTurno />)

    const inputPaciente = screen.getByLabelText('Paciente')
    await user.type(inputPaciente, 'Carlos')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    expect(screen.getByText(/formato|DD-MM-AAAA/i)).toBeInTheDocument()
  })
})

describe('gestión de turnos', () => {
  const turnos: Turno[] = [
    { id: '1', fecha: '2026-09-01', hora: '10:30', paciente: 'Ana' },
    { id: '2', fecha: '2026-09-02', hora: '11:00', paciente: 'Luis' },
    { id: '3', fecha: '2026-09-01', hora: '12:00', paciente: 'Sofia' },
  ]

  it('cancela un turno por su id', () => {
    const resultado = cancelarTurno(turnos, '2')

    expect(resultado).toEqual([
      { id: '1', fecha: '2026-09-01', hora: '10:30', paciente: 'Ana' },
      { id: '3', fecha: '2026-09-01', hora: '12:00', paciente: 'Sofia' },
    ])
    expect(turnos).toHaveLength(3)
  })

  it('lista los turnos de una fecha específica', () => {
    const resultado = listarTurnosPorFecha(turnos, '2026-09-01')

    expect(resultado).toEqual([
      { id: '1', fecha: '2026-09-01', hora: '10:30', paciente: 'Ana' },
      { id: '3', fecha: '2026-09-01', hora: '12:00', paciente: 'Sofia' },
    ])
  })
  it('falla si la fecha tiene un formato inválido', () => {
    expect(() => 
      reservarTurno([], { fecha: '01-09-2026', hora: '10:30', paciente: 'Ana' })
    ).toThrow(TurnoInvalidoError)
  })

  it('falla si la hora tiene un formato inválido', () => {
    expect(() => 
      reservarTurno([], { fecha: '2026-09-01', hora: '10-30', paciente: 'Ana' })
    ).toThrow(TurnoInvalidoError)
  })
})