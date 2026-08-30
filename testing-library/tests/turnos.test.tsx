import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cancelarTurno, listarTurnosPorFecha } from '../src/turnos'
import { FormularioTurno } from '../src/turnos.tsx'
import type { Turno } from '../src/types'

describe('FormularioTurno', () => {
  afterEach(() => {
    cleanup()
  })

  it('reserva un turno correctamente', async () => {
    const user = userEvent.setup()

    render(<FormularioTurno />)

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:30' } })
    await user.type(screen.getByLabelText('Paciente'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    expect(screen.getByText('Turno reservado correctamente')).toBeInTheDocument()
  })

  it('muestra un error si el paciente está vacío', async () => {
    const user = userEvent.setup()

    render(<FormularioTurno />)

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:30' } })
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    expect(screen.getByText('El paciente es obligatorio')).toBeInTheDocument()
  })

  it('rechaza reservar dos veces el mismo horario', async () => {
    const user = userEvent.setup()

    render(<FormularioTurno />)

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:30' } })
    await user.type(screen.getByLabelText('Paciente'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:30' } })
    await user.type(screen.getByLabelText('Paciente'), 'Luis')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    expect(screen.getByText('Ya existe un turno reservado para 2026-09-01 10:30')).toBeInTheDocument()
  })

  it('lista y cancela un turno desde la interfaz', async () => {
    const user = userEvent.setup()

    render(<FormularioTurno />)

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:30' } })
    await user.type(screen.getByLabelText('Paciente'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Reservar turno' }))

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('2026-09-01 a las 10:30')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    expect(screen.getByText('No hay turnos para mostrar.')).toBeInTheDocument()
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
})