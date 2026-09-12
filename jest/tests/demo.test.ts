import { reservarTurno, listarTurnosPorFecha } from '../src/turnos'
import type { Turno } from '../src/types'

describe('Snapshot testing', () => {
  it('la agenda del día mantiene su forma esperada', () => {
    let turnos: Turno[] = []
    turnos = reservarTurno(turnos, {
      fecha: '2026-09-08',
      hora: '09:00',
      paciente: 'Ana',
    }).turnos
    turnos = reservarTurno(turnos, {
      fecha: '2026-09-08',
      hora: '10:30',
      paciente: 'Luis',
    }).turnos

    // El id se genera con randomUUID(), así que cambia en cada corrida.
    // Se compara la agenda sin el id: lo que se verifica es la forma.
    const agenda = listarTurnosPorFecha(turnos, '2026-09-08').map(
      ({ id, ...resto }) => resto
    )

    expect(agenda).toMatchSnapshot()
  })
})

describe('Mocking integrado', () => {
  it('jest.fn() registra cómo fue llamada una función', () => {
    const notificarPaciente = jest.fn()

    const { turno } = reservarTurno([], {
      fecha: '2026-09-08',
      hora: '09:00',
      paciente: 'Ana',
    })
    notificarPaciente(turno.paciente, turno.hora)

    expect(notificarPaciente).toHaveBeenCalledTimes(1)
    expect(notificarPaciente).toHaveBeenCalledWith('Ana', '09:00')
  })

  it('jest.spyOn() permite espiar una función real sin reemplazarla', () => {
    const agenda = { registrar: (t: Turno) => `Registrado: ${t.paciente}` }
    const spy = jest.spyOn(agenda, 'registrar')

    const { turno } = reservarTurno([], {
      fecha: '2026-09-08',
      hora: '11:00',
      paciente: 'Sofía',
    })
    const resultado = agenda.registrar(turno)

    expect(spy).toHaveBeenCalled()
    expect(resultado).toBe('Registrado: Sofía')
    spy.mockRestore()
  })
})
