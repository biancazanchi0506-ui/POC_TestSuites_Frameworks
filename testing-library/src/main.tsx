import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FormularioTurno } from './turnos.tsx'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="app">
      <section className="panel">
        <p className="eyebrow">Agenda medica</p>
        <h1>Reservar turno</h1>
        <p className="intro">Completa los datos para reservar una cita.</p>
        <FormularioTurno />
      </section>
    </main>
  </StrictMode>,
   )
