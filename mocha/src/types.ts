export interface Turno {
  id: string
  fecha: string   // formato 'YYYY-MM-DD'
  hora: string    // formato 'HH:mm'
  paciente: string
}

export type NuevoTurno = Omit<Turno, 'id'>
