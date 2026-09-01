import { expect } from 'chai';
import sinon from 'sinon';
import { 
  hayDisponibilidad, 
  reservarTurno, 
  cancelarTurno, 
  listarTurnosPorFecha,
  TurnoOcupadoError,
  TurnoInvalidoError
} from '../src/turnos.js';
import type { Turno } from '../src/types.js';
describe('Suite de Pruebas Unitarias - Mocha + Chai + Sinon', () => {
  let turnosMock: Turno[];
  beforeEach(() => {
    turnosMock = [
      { id: '1', fecha: '2026-09-01', hora: '09:00', paciente: 'Juan Pérez' },
      { id: '2', fecha: '2026-09-01', hora: '10:00', paciente: 'María López' },
      { id: '3', fecha: '2026-09-02', hora: '11:00', paciente: 'Carlos Gómez' }
    ];
  });
  describe('hayDisponibilidad', () => {
    it('retorna true si el horario y fecha están libres', () => {
      const res = hayDisponibilidad(turnosMock, '2026-09-01', '11:00');
      expect(res).to.be.true;
    });
    it('retorna false si el horario ya está ocupado en la misma fecha', () => {
      const res = hayDisponibilidad(turnosMock, '2026-09-01', '10:00');
      expect(res).to.be.false;
    });
    it('retorna true si el horario coincide pero en fecha diferente', () => {
      const res = hayDisponibilidad(turnosMock, '2026-09-03', '10:00');
      expect(res).to.be.true;
    });

    it('retorna true cuando la lista de turnos actuales está vacía', () => {
      const res = hayDisponibilidad([], '2026-09-01', '10:00');
      expect(res).to.be.true;
    });
  });
  describe('reservarTurno', () => {
    it('agrega exitosamente un turno si la ranura está disponible', () => {
      const nuevoTurno = { fecha: '2026-09-01', hora: '11:00', paciente: 'Ana Díaz' };
      const resultado = reservarTurno(turnosMock, nuevoTurno); 
      expect(resultado.turnos).to.have.lengthOf(4);
      expect(resultado.turno).to.include({ fecha: '2026-09-01', hora: '11:00', paciente: 'Ana Díaz' });
      expect(resultado.turno.id).to.not.be.undefined;
    });
    it('lanza un TurnoOcupadoError si la ranura ya está reservada', () => {
      const nuevoTurno = { fecha: '2026-09-01', hora: '10:00', paciente: 'Ana Díaz' };
      expect(() => reservarTurno(turnosMock, nuevoTurno))
        .to.throw(TurnoOcupadoError);
    });
    it('lanza un TurnoInvalidoError si el formato de la fecha es incorrecto', () => {
      const turnoIncompleto = { fecha: '01/09/2026', hora: '10:00', paciente: 'Ana Díaz' };
      expect(() => reservarTurno(turnosMock, turnoIncompleto))
        .to.throw(TurnoInvalidoError, 'La fecha debe tener el formato YYYY-MM-DD');
    });
    it('lanza un TurnoInvalidoError si el formato de la hora es incorrecto', () => {
      const turnoIncompleto = { fecha: '2026-09-01', hora: '10 AM', paciente: 'Ana Díaz' };
      expect(() => reservarTurno(turnosMock, turnoIncompleto))
        .to.throw(TurnoInvalidoError, 'La hora debe tener el formato HH:mm');
    });
    it('lanza un TurnoInvalidoError si falta el paciente', () => {
      const turnoIncompleto = { fecha: '2026-09-01', hora: '10:00', paciente: '   ' };
      expect(() => reservarTurno(turnosMock, turnoIncompleto))
        .to.throw(TurnoInvalidoError, 'El paciente es obligatorio');
    });

    it('genera un ID único auto-calculado para cada reserva exitosa', () => {
      const nuevo1 = { fecha: '2026-09-05', hora: '08:00', paciente: 'Paciente A' };
      const nuevo2 = { fecha: '2026-09-05', hora: '09:00', paciente: 'Paciente B' };
      
      const res1 = reservarTurno(turnosMock, nuevo1);
      const res2 = reservarTurno(res1.turnos, nuevo2);

      expect(res1.turno.id).to.not.equal(res2.turno.id);
    });

    it('no muta la lista original al reservar un turno', () => {
      const nuevoTurno = { fecha: '2026-09-05', hora: '15:00', paciente: 'Paciente Test' };
      const longitudOriginal = turnosMock.length;
      
      reservarTurno(turnosMock, nuevoTurno);
      
      expect(turnosMock).to.have.lengthOf(longitudOriginal);
    });
  });
  describe('cancelarTurno', () => {
    it('elimina correctamente el turno que coincida con el ID', () => {
      const resultado = cancelarTurno(turnosMock, '2');
      
      expect(resultado).to.have.lengthOf(2);
      expect(resultado.some(t => t.id === '2')).to.be.false;
    });

    it('devuelve la lista original sin cambios si el ID a cancelar no existe', () => {
      const resultado = cancelarTurno(turnosMock, '999');
      expect(resultado).to.have.lengthOf(3);
    });

    it('debería alterar la reserva de los demás IDs activos al cancelar', () => {
      const resultado = cancelarTurno(turnosMock, '2');
      
      expect(resultado[0].id).to.equal('1');
      expect(resultado[1].id).to.equal('3');
    });
  });
  describe('listarTurnosPorFecha', () => {
    it('retorna un arreglo filtrado únicamente con los turnos de la fecha indicada', () => {
      const resultado = listarTurnosPorFecha(turnosMock, '2026-09-01');
      
      expect(resultado).to.have.lengthOf(2);
      expect(resultado[0].fecha).to.equal('2026-09-01');
      expect(resultado[1].fecha).to.equal('2026-09-01');
    });

    it('retorna un arreglo vacío si no hay reservas registradas para esa fecha', () => {
      const resultado = listarTurnosPorFecha(turnosMock, '2026-12-25');
      
      expect(resultado).to.be.an('array').that.is.empty;
    });

    it('mantiene todos los datos del paciente intactos al listar', () => {
      const resultado = listarTurnosPorFecha(turnosMock, '2026-09-02');
      
      expect(resultado[0]).to.deep.equal({
        id: '3',
        fecha: '2026-09-02',
        hora: '11:00',
        paciente: 'Carlos Gómez'
      });
    });
  });
  describe('Integración con Sinon.JS (Mocks/Spies)', () => {
    it('llama a una función espía de auditoría con Sinon Spy', () => {
      const loggerAuditoria = {
        registrar: (msg: string) => console.log(msg)
      };

      const spy = sinon.spy(loggerAuditoria, 'registrar');

      // Acción de ejemplo
      loggerAuditoria.registrar('Auditoría de pruebas');

      expect(spy.calledOnce).to.be.true;
      expect(spy.firstCall.args[0]).to.equal('Auditoría de pruebas');

      spy.restore();
    });
  });
});
