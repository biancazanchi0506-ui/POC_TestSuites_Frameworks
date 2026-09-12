import express from 'express'
import type { Express, Request, Response } from 'express'
import {
  reservarTurno,
  cancelarTurno,
  listarTurnosPorFecha,
  TurnoOcupadoError,
} from './turnos'
import type { Turno } from './types'

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function crearApp(turnosIniciales: Turno[] = []): Express {
  let turnos: Turno[] = [...turnosIniciales]

  const app = express()
  app.use(express.json())

  // POST /turnos → crea un turno nuevo
  app.post('/turnos', (req: Request, res: Response) => {
    const { fecha, hora, paciente } = req.body

    if (
      typeof fecha !== 'string' ||
      typeof hora !== 'string' ||
      typeof paciente !== 'string'
    ) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }

    try {
      const resultado = reservarTurno(turnos, { fecha, hora, paciente })
      turnos = resultado.turnos
      return res.status(201).json(resultado.turno)
    } catch (error) {
      if (error instanceof TurnoOcupadoError) {
        return res.status(409).json({ error: error.message })
      }
      return res.status(400).json({ error: (error as Error).message })
    }
  })

  // GET /turnos?fecha=YYYY-MM-DD → lista los turnos de una fecha
  app.get('/turnos', (req: Request, res: Response) => {
    const fecha = req.query.fecha

    if (typeof fecha !== 'string' || !FECHA_REGEX.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido' })
    }

    return res.status(200).json(listarTurnosPorFecha(turnos, fecha))
  })

  // DELETE /turnos/:id → cancela un turno
  app.delete('/turnos/:id', (req: Request, res: Response) => {
    const id = String(req.params.id)

    if (!turnos.some((t) => t.id === id)) {
      return res.status(404).json({ error: 'Turno no encontrado' })
    }

    turnos = cancelarTurno(turnos, id)
    return res.status(204).send()
  })

  return app
}
