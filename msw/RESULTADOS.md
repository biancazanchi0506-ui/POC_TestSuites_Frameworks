# Resultados — MSW vs mock manual de fetch

Generado automáticamente por `npm run compare`. No editar a mano: si algo
cambia en el código, correr el script de nuevo. **Excepción: la sección 7**
está escrita a mano y el script la preserva tal cual en cada corrida.

## 1. Tabla para el informe (tecnología: MSW — Versión B)

| Métrica | Valor |
| --- | --- |
| Tests totales | 13/13 |
| Cobertura de código | 100% |
| Configuración inicial | [SIN MEDIR] |
| Tiempo de ejecución de la suite | 42 ms (promedio de 3 corridas) |

> **Cobertura de código**: mide `src/apiTurnos.ts` únicamente (el cliente HTTP
> bajo prueba) — es un módulo distinto al que midieron las otras tecnologías
> del grupo. Da el mismo valor en la Versión A y en la Versión B, porque ambas
> suites ejercitan exactamente los mismos caminos del código.
>
> **Configuración inicial**: mide el tiempo desde cero hasta el primer test de
> MSW en verde, incluyendo instalación, configuración y escritura de ese test.
> Medido con reloj por una persona, una sola vez y sin conocimiento previo de
> la librería; no es reproducible por el script. **Pendiente de completar a
> mano** — mientras nadie cargue el valor real en `CONFIGURACION_INICIAL_MIN`
> (en `scripts/compare.ts`), esta fila queda en `[SIN MEDIR]`.

## 2. Costo de mockeo: setup fijo vs costo marginal por test (Versión A vs Versión B)

El costo de mockear no es solo el setup fijo. La Versión A necesita, dentro de
cada `it()`, líneas para armar la respuesta falsa y (en 2 de los 13 casos)
para inspeccionar cómo fue llamado el mock. La Versión B casi no necesita
nada de eso dentro de los tests, porque el comportamiento vive en los
handlers. Esta sección separa ambos costos: el fijo (setup, se paga una sola
vez) y el marginal (mockeo dentro de los tests, se repite por cada caso).

| | Versión A (mock manual) | Versión B (MSW) |
| --- | --- | --- |
| Setup (costo fijo) | 20 | 91 |
| Mockeo dentro de los tests (costo marginal) | 18 — 1.38 por test | 3 — 0.23 por test |
| **Total** | **38** | **94** |

> **Setup (costo fijo)**: toda línea (incluye comentarios y líneas en blanco)
> de los archivos que **no** son `*.test.ts`: `tests/manual/mockFetch.ts` para
> la Versión A; `tests/msw/handlers.ts` + `tests/msw/setup.ts` para la Versión B.
>
> **Mockeo dentro de los tests (costo marginal)**: de las líneas que viven
> dentro de cada `it()`, cuentan solo las que existen para *armar* la
> respuesta falsa o *inspeccionar* cómo fue llamado el mock. En la Versión A
> son las llamadas a `mockFetchOnce(...)` y, en los 2 casos que lo requieren
> (query string y body+header), la lectura de `vi.mocked(fetch).mock.calls`
> junto con los `expect()` que comparan contra esos argumentos. En la Versión
> B es únicamente el override puntual con `server.use(...)` del caso 500 (el
> único de los 13 que no sale del comportamiento real de los handlers). No
> cuentan: los comentarios; el armado de datos de dominio (fixtures como
> `nuevo`/`turnos`, y las llamadas a `seedTurnos()` en B — llenar el store
> con turnos es dato de dominio, no mecanismo de mockeo); la línea que invoca
> la función bajo prueba; ni el `expect()` final que verifica el resultado o
> error real que esa función devolvió — esa aserción de dominio la necesitan
> ambas versiones por igual, y por eso no distingue nada entre ellas.
>
> **Total**: setup + mockeo dentro de los tests.

**Conclusión:** el costo fijo de B es más alto (más setup para tener handlers
reales y con estado), pero su costo marginal por test es más bajo (casi no
necesita plumbing de mockeo dentro de cada `it()`). Extrapolando esos dos
costos de forma lineal, a partir de **62 tests** el total de
líneas de la Versión B queda por debajo del de la Versión A — con 13 casos,
como en esta demo, A todavía tiene menos líneas en total; el cruce llega
recién con una suite bastante más grande.

**El supuesto detrás del 0.23:** ese número sale de los 13 casos actuales, que
solo ejercitan los tres handlers que ya existen (`GET`/`POST`/`DELETE /turnos`)
con datos distintos. Un test nuevo que reutiliza uno de esos
handlers agrega ~0 líneas dentro del `it()`, igual que 12 de los 13 casos de
hoy. Pero un test que necesita un endpoint nuevo, o un escenario de error que
el handler existente no contempla, obliga a escribir un handler nuevo —
9 líneas típicas, no 0.23. Ese número solo se sostiene
mientras los tests que se vayan agregando sigan reusando handlers
existentes. El marginal de la Versión A, en cambio, sí es constante: el
helper (`mockFetchOnce`) ya existe y cada test nuevo paga lo mismo, sin
importar qué endpoint ejercite.

**Análisis de sensibilidad** — cómo cambia el marginal de B (y el punto de
cruce) según qué fracción de los tests *nuevos* obliga a escribir un handler
nuevo de 9 líneas:

| Escenario | Marginal de B resultante | Punto de cruce |
| --- | --- | --- |
| Ningún test nuevo requiere handler nuevo (caso actual) | 0.23 líneas/test | 62 tests |
| 1 de cada 4 tests nuevos requiere un handler nuevo | 2.48 líneas/test | No hay — el marginal de B (2.48) ya iguala o supera al de A (1.38); el setup más alto de B nunca se amortiza |
| 1 de cada 2 tests nuevos requiere un handler nuevo | 4.73 líneas/test | No hay — el marginal de B (4.73) ya iguala o supera al de A (1.38); el setup más alto de B nunca se amortiza |

Los **62 tests** de la conclusión de arriba son entonces el **mejor caso
posible** para la Versión B — el que vale solo si absolutamente ningún test
futuro necesita un handler nuevo. No es la estimación esperada: apenas 1 de
cada 4 tests nuevos requiera un handler nuevo, el punto de cruce desaparece y
la Versión B queda con más líneas totales que la Versión A, sin importar
cuánto crezca la suite.

**Lo que este conteo no mide:** líneas de código es una métrica de costo, no
de beneficio. No captura las dos ventajas que se le atribuyen a MSW en este
informe — que el cliente HTTP queda desacoplado del mecanismo de mockeo (los
handlers no saben ni les importa que `apiTurnos.ts` use `fetch`), y que esos
mismos handlers se pueden reutilizar fuera de los tests (por ejemplo, para
levantar un entorno de desarrollo o Storybook sin backend real). Un conteo de
líneas más bajo en la Versión A no significa que la Versión A sea mejor en
esos ejes — solo que este conteo no los mide.

## 3. Bloque para la diapositiva de código

Caso más representativo: **"reservar envía el body serializado y el header
correctos"**. Es donde mejor se ve la diferencia entre inspeccionar un mock e
inspeccionar un comportamiento real.

**Versión A — inspecciona los argumentos del mock:**

```ts
it('reservar envía el body serializado y el header correctos', async () => {
  const nuevo = { fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }
  mockFetchOnce(201, { id: '5', ...nuevo })

  await reservarTurno(nuevo)

  const [, init] = vi.mocked(fetch).mock.calls[0]
  expect(init?.body).toBe(JSON.stringify(nuevo))
  expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
})
```

*Verifica cómo se llamó a la función `fetch` — un detalle de implementación, no una respuesta real.*

**Versión B — verifica el request real, a través de la respuesta:**

```ts
http.post(`${BASE_URL}/turnos`, async ({ request }) => {
  const nuevo = await request.json()
  // valida y crea el turno...
  return HttpResponse.json(turno, { status: 201 })
})

it('reservar envía el body serializado y el header correctos', async () => {
  const nuevo = { fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }
  const turno = await reservarTurno(nuevo)
  expect(turno).toMatchObject(nuevo)
})
```

*El handler solo puede devolver el turno completo si el body y el header le llegaron bien — se verifica el comportamiento, no el mock.*

## 4. Versiones usadas

| Herramienta | Versión |
| --- | --- |
| Node | v24.12.0 |
| TypeScript | 5.9.3 |
| Vitest | 3.2.7 |
| MSW | 2.15.0 |

## 5. Cómo reproducirlo

```
npm run compare
```

## 6. Experimento: ¿MSW desacopla los tests del cliente HTTP?

Registro de un experimento manual, hecho una sola vez y revertido. No lo
recalcula `npm run compare` — el código del repo volvió a `fetch` apenas
terminó, porque el resto de este informe se apoya en mediciones hechas con
`fetch`. Los números de esta sección son un resultado histórico, no una
medición reproducible por el script.

**Hipótesis:** si se cambia `src/apiTurnos.ts` de `fetch` a axios sin tocar
ni una línea de los tests, la Versión A (mock manual con `vi.stubGlobal`)
falla, porque parchea `fetch` y axios no pasa por ahí. La Versión B (MSW)
sigue pasando sin cambios, porque intercepta por debajo de ambos.

**Procedimiento:**
1. Línea base con `fetch`: Versión A 13/13, Versión B 13/13.
2. `npm install axios` y se reescribió `src/apiTurnos.ts` para usar axios,
   con la misma firma pública en las 3 funciones y el mismo mapeo de errores
   (409 → `TurnoOcupadoError`, 400/404 → `TurnoInvalidoError`, otros →
   `ServidorNoDisponibleError`) — adaptado a que axios lanza excepción en
   códigos de error en vez de devolver una respuesta.
3. Ningún archivo de test, handler o setup se tocó.
4. Se corrieron las dos suites tal cual.
5. Se restauró `src/apiTurnos.ts` a la versión con `fetch` (y se desinstaló
   axios) antes de seguir con cualquier otra cosa.

Repetido cada vez que cambió la cantidad de casos o el contrato de `id`,
para no dejar esta sección con números de una versión anterior del proyecto.

**Resultado — Versión A (mock manual):** 0/13 pasan (13 fallan). Los tests
fallan porque `vi.stubGlobal('fetch', ...)` reemplaza el `fetch` global, pero
axios en Node no pasa por ahí — usa `http`/`https` directamente. La llamada
intenta salir a la red de verdad, contra un puerto donde no hay nada
escuchando. Mensaje real de uno de los tests:

```
AssertionError: promise rejected "AggregateError: connect ECONNREFUSED ::1:3000; connect ECONNREFUSED 127.0.0.1:3000" instead of resolving
 ❯ tests/manual/apiTurnos.test.ts:19:32
    17|     mockFetchOnce(200, turnos)
    18|
    19|     await expect(listarTurnos()).resolves.toEqual(turnos)
      |                                ^
```

**Resultado — Versión B (MSW):** 13/13 pasan, sin ningún cambio en
`tests/msw/`. El interceptor de MSW en Node parchea `http`/`https`
directamente, así que agarra las requests de axios igual que agarraba las de
`fetch`.

**Conclusión:** el resultado confirma la hipótesis sin ninguna sorpresa —
cambiar el cliente HTTP rompe por completo la Versión A (0/13) y no afecta en
nada a la Versión B (13/13). Esto es evidencia directa a favor de la ventaja de
desacople que la sección 2 menciona pero que el conteo de líneas no podía
medir por sí solo.

## 7. Facilidad de mockeo y fricción/ventaja notable

> **Escrita a mano — `npm run compare` no genera ni pisa esta sección.**
> Cubre los dos ítems de la sección 5 de `CASO-DE-PRUEBA.md` que las
> secciones anteriores no cubrían. Es prosa cualitativa apoyada en lo ya
> medido arriba, no una medición nueva.

**Facilidad o dificultad percibida para mockear datos o dependencias.**
Las dos versiones se sienten fáciles al principio, pero por razones
opuestas y con un costo que aparece en momentos distintos. La Versión A
es fácil de *arrancar* — `mockFetchOnce` no pide casi nada de setup (20
líneas) — pero esa facilidad no escala: cada uno de los 13 tests necesita
su propia línea (o más) de mockeo, y dos de ellos además tienen que abrir
el mock para inspeccionar cómo fue llamado (sección 2). La Versión B es lo
opuesto: arrancarla pide bastante más trabajo (91 líneas — handlers,
estado en memoria, validaciones), pero una vez armada, escribir un test
nuevo se parece más a escribir un test de integración contra una API real
que a mockear algo — 3 líneas de mockeo en total, contra 18 de la Versión
A. La dificultad de MSW está toda al principio; la de mockear a mano está
repartida en cada test.

**Fricción o ventaja notable con MSW.** La fricción más concreta es el
costo de entrada: 91 líneas de setup contra 20, y una suite que corre
notoriamente más lenta (Versión B ronda los 38-43 ms contra 12-16 ms de la
Versión A — el interceptor de red de MSW agrega un costo real por request
que un mock en memoria no tiene). La ventaja notable, en cambio, no se ve
en ningún número de líneas ni de tiempo: es el experimento de la sección
6. Cuando el cliente HTTP cambió de `fetch` a axios sin tocar un solo
archivo de test, la Versión B siguió pasando entera (13/13) mientras la
Versión A se rompió por completo (0/13). Esa resiliencia a un cambio de
implementación es la ventaja real de MSW en esta comparación, y solo se
pudo ver corriendo el experimento — no se hubiera notado mirando
únicamente las métricas de las secciones 1 y 2.
