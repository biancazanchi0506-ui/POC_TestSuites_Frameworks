# Caso de prueba común de la PoC — Sistema de reservas de turnos

Este documento define el dominio que TODOS los integrantes del grupo deben implementar,
cada uno con su tecnología de testing asignada (Jest, Vitest, Mocha, Testing Library, MSW).
La lógica y los casos de test tienen que ser los mismos para que la comparación en el
informe (punto 5) sea válida. Cada uno programa esto en su propio mini-proyecto, en el
lenguaje/framework que prefiera (se recomienda TypeScript + Node), pero respetando
exactamente estos nombres, comportamientos y casos.

## 1. Estructura de datos

Un Turno tiene:
- `id`: identificador único (string)
- `fecha`: formato `YYYY-MM-DD`
- `hora`: formato `HH:mm`
- `paciente`: nombre del paciente (string no vacío)

## 2. Funciones a implementar (lógica pura, sin efectos secundarios)

### `hayDisponibilidad(turnos, fecha, hora)`
Devuelve `true`/`false` según si ese horario está libre en esa fecha.

### `reservarTurno(turnos, nuevoTurno)`
Agrega un turno nuevo SI el horario está libre y los datos son válidos.
- Si el horario está ocupado → error de tipo "turno ocupado"
- Si los datos son inválidos (fecha/hora con formato incorrecto, paciente vacío) → error de tipo "datos inválidos"
- No debe modificar la lista original (debe devolver una nueva lista)
- El turno creado debe tener un `id` generado automáticamente

### `cancelarTurno(turnos, id)`
Elimina el turno con ese `id`. Si el `id` no existe, devuelve la lista sin cambios (no lanza error).

### `listarTurnosPorFecha(turnos, fecha)`
Devuelve solo los turnos de una fecha específica. Si no hay ninguno, devuelve lista vacía.

## 3. Endpoints a implementar (API HTTP)

### `POST /turnos`
Crea un turno nuevo.
- Éxito → código 201, devuelve el turno creado
- Horario ocupado → código 409 (o 400)
- Datos inválidos / campos faltantes → código 400

### `GET /turnos?fecha=YYYY-MM-DD`
Lista los turnos de una fecha.
- Éxito → código 200, array de turnos (puede estar vacío)
- Formato de fecha inválido → código 400

### `DELETE /turnos/:id`
Cancela un turno.
- Éxito → código 200 o 204
- `id` no encontrado → código 404

## 4. Casos de test obligatorios (mínimo, cada uno con su herramienta)

**hayDisponibilidad**
1. Sin turnos cargados → disponible
2. Turno ya existe en esa fecha/hora exacta → no disponible
3. Hay turnos ese día pero en otro horario → disponible

**reservarTurno**
1. Se agrega correctamente cuando el horario está libre
2. El turno creado tiene un id
3. Falla si el horario ya está ocupado
4. No modifica la lista original (inmutabilidad)
5. Falla con fecha con formato inválido
6. Falla con hora con formato inválido
7. Falla con paciente vacío

**cancelarTurno**
1. Elimina el turno si el id existe
2. No cambia nada si el id no existe
3. No afecta a otros turnos al cancelar uno

**listarTurnosPorFecha**
1. Devuelve solo los turnos de esa fecha
2. Devuelve vacío si no hay turnos ese día

**Endpoints**
1. POST válido → 201 y turno creado
2. POST con horario ocupado → 409/400
3. POST con datos faltantes → 400
4. GET con turnos existentes → 200 y array correcto
5. GET sin turnos ese día → 200 y array vacío
6. DELETE de turno existente → 200/204
7. DELETE de turno inexistente → 404

## 5. Qué debe reportar cada uno (para la sección 4.3 y la tabla comparativa)

- Tiempo de configuración inicial (aprox., en minutos)
- Tiempo de ejecución de la suite completa (correr 2-3 veces y promediar)
- % de cobertura de código alcanzado
- Facilidad/dificultad percibida para mockear datos o dependencias
- Cualquier fricción o ventaja notable con la herramienta asignada

## 6. Acuerdos pendientes a confirmar en el grupo

- [ ] Formato exacto de manejo de errores (excepción vs objeto `{error}`) — confirmado arriba: excepciones tipadas
- [ ] Si se persiste en memoria (array) o con alguna base simulada — recomendado: en memoria
- [ ] Fecha límite para que cada uno tenga su parte lista
