import request from 'supertest';
import { crearApp } from '../src/api';
import type { Turno } from '../src/types';

const turnoExistente: Turno = {
  id: '2026-08-15-10:00',
  fecha: '2026-08-15',
  hora: '10:00',
  paciente: 'Juan Pérez',
};

describe('POST /turnos', () => {
  it('con datos válidos devuelve 201 y el turno creado', async () => {
    const app = crearApp();
    const respuesta = await request(app)
      .post('/turnos')
      .send({ fecha: '2026-08-15', hora: '10:00', paciente: 'Ana' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.paciente).toBe('Ana');
    expect(respuesta.body.id).toBeDefined();
  });

  it('con el horario ya ocupado devuelve 409', async () => {
    const app = crearApp([turnoExistente]);
    const respuesta = await request(app)
      .post('/turnos')
      .send({ fecha: '2026-08-15', hora: '10:00', paciente: 'Otro' });

    expect(respuesta.status).toBe(409);
  });

  it('con datos faltantes devuelve 400', async () => {
    const app = crearApp();
    const respuesta = await request(app)
      .post('/turnos')
      .send({ fecha: '2026-08-15' });

    expect(respuesta.status).toBe(400);
  });
});

describe('GET /turnos', () => {
  it('con turnos existentes devuelve 200 y el array correcto', async () => {
    const app = crearApp([turnoExistente]);
    const respuesta = await request(app).get('/turnos?fecha=2026-08-15');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toHaveLength(1);
    expect(respuesta.body[0].paciente).toBe('Juan Pérez');
  });

  it('sin turnos ese día devuelve 200 y un array vacío', async () => {
    const app = crearApp([turnoExistente]);
    const respuesta = await request(app).get('/turnos?fecha=2026-12-25');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([]);
  });

  it('con formato de fecha inválido devuelve 400', async () => {
    const app = crearApp();
    const respuesta = await request(app).get('/turnos?fecha=15-08-2026');

    expect(respuesta.status).toBe(400);
  });
});

describe('DELETE /turnos/:id', () => {
  it('con un turno existente devuelve 204', async () => {
    const app = crearApp([turnoExistente]);
    const respuesta = await request(app).delete(`/turnos/${turnoExistente.id}`);

    expect(respuesta.status).toBe(204);
  });

  it('con un turno inexistente devuelve 404', async () => {
    const app = crearApp([turnoExistente]);
    const respuesta = await request(app).delete('/turnos/no-existe');

    expect(respuesta.status).toBe(404);
  });
});

describe('POST /turnos — validación de formato', () => {
  it('con fecha en formato inválido devuelve 400', async () => {
    const app = crearApp();
    const respuesta = await request(app)
      .post('/turnos')
      .send({ fecha: '15/08/2026', hora: '10:00', paciente: 'Ana' });

    expect(respuesta.status).toBe(400);
  });
});
