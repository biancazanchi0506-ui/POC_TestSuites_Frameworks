import { useState, type FormEvent } from 'react'
import {
  cancelarTurno,
  listarTurnosPorFecha,
  reservarTurno,
  TurnoInvalidoError,
  TurnoOcupadoError,
} from './turnos'
import type { Turno } from './types'

export function FormularioTurno() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [mensaje, setMensaje] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)

    try {
      const resultado = reservarTurno(turnos, {
        fecha: String(form.get('fecha')),
        hora: String(form.get('hora')),
        paciente: String(form.get('paciente')),
      })

      setTurnos(resultado.turnos)
      setMensaje('Turno reservado correctamente')
      event.currentTarget.reset()
    } catch (error) {
      if (error instanceof TurnoInvalidoError || error instanceof TurnoOcupadoError) {
        setMensaje(error.message)
      }
    }
  }

  function handleCancel(id: string) {
    setTurnos((turnosActuales) => cancelarTurno(turnosActuales, id))
    setMensaje('Turno cancelado correctamente')
  }

  const turnosVisibles = fechaFiltro ? listarTurnosPorFecha(turnos, fechaFiltro) : turnos

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label>
          Fecha
          <input name="fecha" type="date" />
        </label>

        <label>
          Hora
          <input name="hora" type="time" />
        </label>

        <label>
          Paciente
          <input name="paciente" />
        </label>

        <button type="submit">Reservar turno</button>
      </form>

      <output>{mensaje}</output>

      <section className="turnos-section" aria-labelledby="turnos-titulo">
        <div className="section-heading">
          <h2 id="turnos-titulo">Turnos reservados</h2>
          <label>
            Listar por fecha
            <input
              aria-label="Filtrar turnos por fecha"
              type="date"
              value={fechaFiltro}
              onChange={(event) => setFechaFiltro(event.target.value)}
            />
          </label>
        </div>

        {turnosVisibles.length === 0 ? (
          <p className="empty-state">No hay turnos para mostrar.</p>
        ) : (
          <ul className="turnos-lista">
            {turnosVisibles.map((turno) => (
              <li key={turno.id}>
                <span>
                  <strong>{turno.paciente}</strong>
                  <small>{turno.fecha} a las {turno.hora}</small>
                </span>
                <button type="button" onClick={() => handleCancel(turno.id)}>
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}