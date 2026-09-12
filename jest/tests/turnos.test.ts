import {
  hayDisponibilidad,
  reservarTurno,
  cancelarTurno,
  listarTurnosPorFecha,
  TurnoOcupadoError,
  TurnoInvalidoError,
} from '../src/turnos';
import type { Turno } from '../src/types';

const turnoBase: Turno = {
  id: 'turno-1',
  fecha: '2026-08-15',
  hora: '10:00',
  paciente: 'Juan Pérez',
};

describe('hayDisponibilidad', () => {
  it('sin turnos cargados, el horario está disponible', () => {
    expect(hayDisponibilidad([], '2026-08-15', '10:00')).toBe(true);
  });

  it('si ya existe un turno en esa fecha y hora exacta, no está disponible', () => {
    expect(hayDisponibilidad([turnoBase], '2026-08-15', '10:00')).toBe(false);
  });

  it('si hay turnos ese día pero en otro horario, está disponible', () => {
    expect(hayDisponibilidad([turnoBase], '2026-08-15', '11:00')).toBe(true);
  });
});

describe('reservarTurno', () => {
  it('agrega el turno cuando el horario está libre', () => {
    const { turnos } = reservarTurno([], {
      fecha: '2026-08-15',
      hora: '10:00',
      paciente: 'Ana',
    });
    expect(turnos).toHaveLength(1);
    expect(turnos[0].paciente).toBe('Ana');
  });

  it('el turno creado tiene un id generado automáticamente', () => {
    const { turno } = reservarTurno([], {
      fecha: '2026-08-15',
      hora: '10:00',
      paciente: 'Ana',
    });
    expect(turno.id).toBeDefined();
    expect(typeof turno.id).toBe('string');
  });

  it('falla si el horario ya está ocupado', () => {
    expect(() =>
      reservarTurno([turnoBase], {
        fecha: '2026-08-15',
        hora: '10:00',
        paciente: 'Otro',
      })
    ).toThrow(TurnoOcupadoError);
  });

  it('no modifica la lista original', () => {
    const original: Turno[] = [turnoBase];
    reservarTurno(original, {
      fecha: '2026-08-15',
      hora: '11:00',
      paciente: 'Ana',
    });
    expect(original).toHaveLength(1);
  });

  it('falla si la fecha tiene formato inválido', () => {
    expect(() =>
      reservarTurno([], { fecha: '15/08/2026', hora: '10:00', paciente: 'Ana' })
    ).toThrow(TurnoInvalidoError);
  });

  it('falla si la hora tiene formato inválido', () => {
    expect(() =>
      reservarTurno([], { fecha: '2026-08-15', hora: '25:00', paciente: 'Ana' })
    ).toThrow(TurnoInvalidoError);
  });

  it('falla si el paciente está vacío', () => {
    expect(() =>
      reservarTurno([], { fecha: '2026-08-15', hora: '10:00', paciente: '   ' })
    ).toThrow(TurnoInvalidoError);
  });
});

describe('cancelarTurno', () => {
  it('elimina el turno si el id existe', () => {
    expect(cancelarTurno([turnoBase], turnoBase.id)).toHaveLength(0);
  });

  it('no cambia nada si el id no existe', () => {
    const resultado = cancelarTurno([turnoBase], 'inexistente');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe(turnoBase.id);
  });

  it('no afecta a los demás turnos al cancelar uno', () => {
    const otro: Turno = {
      id: 'turno-2',
      fecha: '2026-08-15',
      hora: '12:00',
      paciente: 'Luis',
    };
    const resultado = cancelarTurno([turnoBase, otro], turnoBase.id);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe(otro.id);
  });
});

describe('listarTurnosPorFecha', () => {
  const turnos: Turno[] = [
    { id: '1', fecha: '2026-08-15', hora: '11:00', paciente: 'Ana' },
    { id: '2', fecha: '2026-08-16', hora: '09:00', paciente: 'Luis' },
    { id: '3', fecha: '2026-08-15', hora: '09:00', paciente: 'Sofía' },
  ];

  it('devuelve solo los turnos de esa fecha', () => {
    const resultado = listarTurnosPorFecha(turnos, '2026-08-15');
    expect(resultado).toHaveLength(2);
    expect(resultado.every((t) => t.fecha === '2026-08-15')).toBe(true);
  });

  it('devuelve una lista vacía si no hay turnos ese día', () => {
    expect(listarTurnosPorFecha(turnos, '2026-12-25')).toEqual([]);
  });
});
