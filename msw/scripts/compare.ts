// Script reproducible: corre ambas suites 3 veces, mide tiempos,
// cuenta líneas de setup, mide cobertura y genera RESULTADOS.md.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = process.cwd()
const TMP_DIR = join(RAIZ, '.tmp-compare')
// Se invoca el binario de vitest directo con node (sin pasar por una shell)
// para no depender de npx ni de cómo cada SO resuelve comandos.
const VITEST_BIN = join(RAIZ, 'node_modules', 'vitest', 'vitest.mjs')

interface ReporteJson {
  numTotalTests: number
  numPassedTests: number
  testResults: { startTime: number; endTime: number }[]
}

function correrSuite(archivo: string, corrida: number): ReporteJson {
  const salida = join(TMP_DIR, `${archivo.replace(/[\\/]/g, '_')}-${corrida}.json`)
  execFileSync(
    process.execPath,
    [VITEST_BIN, 'run', archivo, '--reporter=json', `--outputFile=${salida}`],
    { stdio: 'ignore' },
  )
  return JSON.parse(readFileSync(salida, 'utf-8')) as ReporteJson
}

function medirSuite(archivo: string, corridas = 3) {
  const duraciones: number[] = []
  let ultimoReporte: ReporteJson | undefined

  for (let i = 1; i <= corridas; i++) {
    const reporte = correrSuite(archivo, i)
    const { startTime, endTime } = reporte.testResults[0]
    duraciones.push(endTime - startTime)
    ultimoReporte = reporte
  }

  const promedio = duraciones.reduce((a, b) => a + b, 0) / duraciones.length

  return {
    testsTotal: ultimoReporte!.numTotalTests,
    testsPasados: ultimoReporte!.numPassedTests,
    duracionPromedioMs: Math.round(promedio),
    duracionesMs: duraciones,
  }
}

function medirCobertura(): number {
  execFileSync(
    process.execPath,
    [
      VITEST_BIN,
      'run',
      'tests/msw/apiTurnos.test.ts',
      '--coverage',
      '--coverage.include=src/apiTurnos.ts',
      '--coverage.reporter=json-summary',
    ],
    { stdio: 'ignore' },
  )
  const resumen = JSON.parse(readFileSync(join(RAIZ, 'coverage', 'coverage-summary.json'), 'utf-8'))
  return resumen.total.lines.pct as number
}

// Cuenta líneas de archivo tal cual (incluye comentarios y líneas en blanco),
// sin contar la línea vacía extra que deja un salto de línea final.
function contarLineas(archivoRelativo: string): number {
  const contenido = readFileSync(join(RAIZ, archivoRelativo), 'utf-8')
  return contenido.replace(/\n$/, '').split('\n').length
}

function leerVersionPaquete(paquete: string): string {
  const pkg = JSON.parse(readFileSync(join(RAIZ, 'node_modules', paquete, 'package.json'), 'utf-8'))
  return pkg.version as string
}

// Clasificación manual de líneas de "mockeo" dentro de cada it(), leyendo
// tests/manual/apiTurnos.test.ts y tests/msw/apiTurnos.test.ts test por test.
//
// Cuenta como mockeo una línea que existe para ARMAR la respuesta falsa
// (mockFetchOnce en A) o para CONFIGURAR/INSPECCIONAR el mock (la lectura de
// vi.mocked(fetch).mock.calls y los expect() que comparan contra esos
// argumentos, en A; el override puntual con server.use(...), en B).
//
// No cuenta: comentarios (documentan, no arman ni inspeccionan nada); el
// armado de datos de dominio — fixtures como `nuevo`/`turnos`, y las llamadas
// a seedTurnos() en B (llenan el store con turnos, que es dato de dominio,
// no el mecanismo de mockeo); la línea que invoca la función bajo prueba
// (el "act"); ni el expect() final que verifica el resultado o error real
// devuelto por esa función — eso es la aserción de dominio que ambas
// versiones necesitan por igual.
//
// Es una clasificación hecha a mano, no un regex: si los tests cambian, hay
// que releerlos y actualizar esta tabla. El orden de cada arreglo sigue el
// orden de los it() en el archivo correspondiente.
const LINEAS_MOCKEO_POR_TEST_A = [
  1, // listar devuelve la lista de turnos              — mockFetchOnce
  3, // listar con fecha arma bien la query string       — mockFetchOnce + inspección del mock (2 líneas)
  1, // listar lanza ServidorNoDisponibleError con 500    — mockFetchOnce
  1, // reservar devuelve el turno creado con su id        — mockFetchOnce
  4, // reservar envía el body serializado y el header      — mockFetchOnce + inspección del mock (3 líneas)
  1, // reservar lanza TurnoOcupadoError con 409              — mockFetchOnce
  1, // reservar propaga el motivo del servidor con 400       — mockFetchOnce
  1, // cancelar resuelve sin error con 204                     — mockFetchOnce
  1, // cancelar lanza TurnoInvalidoError con 404                — mockFetchOnce
  1, // reservar rechaza hora con formato inválido                — mockFetchOnce
  1, // reservar rechaza paciente vacío                             — mockFetchOnce
  1, // listar rechaza fecha con formato inválido                    — mockFetchOnce
  1, // listar con fecha sin turnos devuelve un array vacío            — mockFetchOnce
]

const LINEAS_MOCKEO_POR_TEST_B = [
  0, // listar devuelve la lista de turnos              — seedTurnos es dato de dominio, no mockeo
  0, // listar con fecha arma bien la query string
  3, // listar lanza ServidorNoDisponibleError con 500    — server.use(...), único override puntual de los casos
  0, // reservar devuelve el turno creado con su id
  0, // reservar envía el body serializado y el header
  0, // reservar lanza TurnoOcupadoError con 409
  0, // reservar propaga el motivo del servidor con 400
  0, // cancelar resuelve sin error con 204
  0, // cancelar lanza TurnoInvalidoError con 404
  0, // reservar rechaza hora con formato inválido                — valida el handler real, sin override
  0, // reservar rechaza paciente vacío                             — valida el handler real, sin override
  0, // listar rechaza fecha con formato inválido                    — valida el handler real, sin override
  0, // listar con fecha sin turnos devuelve un array vacío            — seedTurnos es dato de dominio, no mockeo
]

function resumenMockeo(lineasPorTest: number[]) {
  const total = lineasPorTest.reduce((a, b) => a + b, 0)
  return { total, promedioPorTest: total / lineasPorTest.length }
}

// Punto de cruce: si el costo total de cada versión fuera
// setup (fijo) + costoMarginalPorTest * cantidadDeTests,
// ¿a partir de qué cantidad de tests el total de B queda por debajo del de A?
// B arranca con más setup que A. Si su costo marginal por test es menor al
// de A, ese setup se termina amortizando y hay un punto de cruce. Si su
// costo marginal es igual o mayor al de A, la diferencia nunca se cierra:
// no hay punto de cruce, y se devuelve null en vez de un número.
function calcularPuntoDeCruce(
  setupA: number,
  marginalA: number,
  setupB: number,
  marginalB: number,
): number | null {
  if (marginalB >= marginalA) return null
  const n = (setupB - setupA) / (marginalA - marginalB)
  return Math.ceil(n)
}

// --- Análisis de sensibilidad del punto de cruce ---
//
// El marginal de la Versión B (calculado arriba, con los casos actuales)
// supone que los tests nuevos siguen reusando los tres handlers
// que ya existen (GET/POST/DELETE /turnos). Eso vale mientras el nuevo test
// ejercite una combinación distinta de datos sobre el MISMO endpoint. En
// cuanto un test necesita un endpoint que los handlers todavía no cubren, o
// un escenario de error que el handler existente no contempla, hay que
// escribir un handler nuevo — y eso no cuesta 0.33 líneas, cuesta lo que
// cueste ese handler (8 a 10 líneas típicamente; se usa 9 como estimación).
//
// El marginal de la Versión A, en cambio, se asume constante: el helper
// (mockFetchOnce) ya existe y cada test nuevo paga el mismo costo de
// armar + inspeccionar el mock, sin importar qué endpoint ejercite.
const HANDLER_NUEVO_LINEAS = 9

interface EscenarioSensibilidad {
  etiqueta: string
  fraccionConHandlerNuevo: number
}

const ESCENARIOS_SENSIBILIDAD: EscenarioSensibilidad[] = [
  { etiqueta: 'Ningún test nuevo requiere handler nuevo (caso actual)', fraccionConHandlerNuevo: 0 },
  { etiqueta: '1 de cada 4 tests nuevos requiere un handler nuevo', fraccionConHandlerNuevo: 0.25 },
  { etiqueta: '1 de cada 2 tests nuevos requiere un handler nuevo', fraccionConHandlerNuevo: 0.5 },
]

function calcularEscenarioSensibilidad(
  escenario: EscenarioSensibilidad,
  setupA: number,
  marginalA: number,
  setupB: number,
  marginalBBase: number,
) {
  const marginalB = marginalBBase + HANDLER_NUEVO_LINEAS * escenario.fraccionConHandlerNuevo
  const puntoDeCruce = calcularPuntoDeCruce(setupA, marginalA, setupB, marginalB)
  return { ...escenario, marginalB, puntoDeCruce }
}

// Se mide a mano, una sola vez, por una persona sin conocimiento previo de
// MSW, desde cero hasta el primer test de MSW en verde (instalación +
// configuración + escritura de ese test). El script no puede medir esto.
// Mientras sea `null`, el reporte escribe [SIN MEDIR] en vez de inventar un
// número — cargar acá el valor real en minutos cuando se cronometre.
const CONFIGURACION_INICIAL_MIN: number | null = null

interface DatosReporte {
  versionA: ReturnType<typeof medirSuite>
  versionB: ReturnType<typeof medirSuite>
  coberturaPct: number
  setupLineasA: number
  setupLineasB: number
  mockeoA: ReturnType<typeof resumenMockeo>
  mockeoB: ReturnType<typeof resumenMockeo>
  cantidadCasos: number
  casosConInspeccionA: number
  casosSinMockeoB: number
  puntoDeCruce: number
  escenarios: ReturnType<typeof calcularEscenarioSensibilidad>[]
  versiones: { node: string; typescript: string; vitest: string; msw: string }
}

function generarMarkdown(d: DatosReporte): string {
  return `# Resultados — MSW vs mock manual de fetch

Generado automáticamente por \`npm run compare\`. No editar a mano: si algo
cambia en el código, correr el script de nuevo. **Excepción: la sección 7**
está escrita a mano y el script la preserva tal cual en cada corrida.

## 1. Tabla para el informe (tecnología: MSW — Versión B)

| Métrica | Valor |
| --- | --- |
| Tests totales | ${d.versionB.testsPasados}/${d.versionB.testsTotal} |
| Cobertura de código | ${d.coberturaPct}% |
| Configuración inicial | ${CONFIGURACION_INICIAL_MIN === null ? '[SIN MEDIR]' : `${CONFIGURACION_INICIAL_MIN} min`} |
| Tiempo de ejecución de la suite | ${d.versionB.duracionPromedioMs} ms (promedio de 3 corridas) |

> **Cobertura de código**: mide \`src/apiTurnos.ts\` únicamente (el cliente HTTP
> bajo prueba) — es un módulo distinto al que midieron las otras tecnologías
> del grupo. Da el mismo valor en la Versión A y en la Versión B, porque ambas
> suites ejercitan exactamente los mismos caminos del código.
>
> **Configuración inicial**: mide el tiempo desde cero hasta el primer test de
> MSW en verde, incluyendo instalación, configuración y escritura de ese test.
> Medido con reloj por una persona, una sola vez y sin conocimiento previo de
> la librería; no es reproducible por el script. **Pendiente de completar a
> mano** — mientras nadie cargue el valor real en \`CONFIGURACION_INICIAL_MIN\`
> (en \`scripts/compare.ts\`), esta fila queda en \`[SIN MEDIR]\`.

## 2. Costo de mockeo: setup fijo vs costo marginal por test (Versión A vs Versión B)

El costo de mockear no es solo el setup fijo. La Versión A necesita, dentro de
cada \`it()\`, líneas para armar la respuesta falsa y (en ${d.casosConInspeccionA} de los ${d.cantidadCasos} casos)
para inspeccionar cómo fue llamado el mock. La Versión B casi no necesita
nada de eso dentro de los tests, porque el comportamiento vive en los
handlers. Esta sección separa ambos costos: el fijo (setup, se paga una sola
vez) y el marginal (mockeo dentro de los tests, se repite por cada caso).

| | Versión A (mock manual) | Versión B (MSW) |
| --- | --- | --- |
| Setup (costo fijo) | ${d.setupLineasA} | ${d.setupLineasB} |
| Mockeo dentro de los tests (costo marginal) | ${d.mockeoA.total} — ${d.mockeoA.promedioPorTest.toFixed(2)} por test | ${d.mockeoB.total} — ${d.mockeoB.promedioPorTest.toFixed(2)} por test |
| **Total** | **${d.setupLineasA + d.mockeoA.total}** | **${d.setupLineasB + d.mockeoB.total}** |

> **Setup (costo fijo)**: toda línea (incluye comentarios y líneas en blanco)
> de los archivos que **no** son \`*.test.ts\`: \`tests/manual/mockFetch.ts\` para
> la Versión A; \`tests/msw/handlers.ts\` + \`tests/msw/setup.ts\` para la Versión B.
>
> **Mockeo dentro de los tests (costo marginal)**: de las líneas que viven
> dentro de cada \`it()\`, cuentan solo las que existen para *armar* la
> respuesta falsa o *inspeccionar* cómo fue llamado el mock. En la Versión A
> son las llamadas a \`mockFetchOnce(...)\` y, en los ${d.casosConInspeccionA} casos que lo requieren
> (query string y body+header), la lectura de \`vi.mocked(fetch).mock.calls\`
> junto con los \`expect()\` que comparan contra esos argumentos. En la Versión
> B es únicamente el override puntual con \`server.use(...)\` del caso 500 (el
> único de los ${d.cantidadCasos} que no sale del comportamiento real de los handlers). No
> cuentan: los comentarios; el armado de datos de dominio (fixtures como
> \`nuevo\`/\`turnos\`, y las llamadas a \`seedTurnos()\` en B — llenar el store
> con turnos es dato de dominio, no mecanismo de mockeo); la línea que invoca
> la función bajo prueba; ni el \`expect()\` final que verifica el resultado o
> error real que esa función devolvió — esa aserción de dominio la necesitan
> ambas versiones por igual, y por eso no distingue nada entre ellas.
>
> **Total**: setup + mockeo dentro de los tests.

**Conclusión:** el costo fijo de B es más alto (más setup para tener handlers
reales y con estado), pero su costo marginal por test es más bajo (casi no
necesita plumbing de mockeo dentro de cada \`it()\`). Extrapolando esos dos
costos de forma lineal, a partir de **${d.puntoDeCruce} tests** el total de
líneas de la Versión B queda por debajo del de la Versión A — con ${d.cantidadCasos} casos,
como en esta demo, A todavía tiene menos líneas en total; el cruce llega
recién con una suite bastante más grande.

**El supuesto detrás del ${d.mockeoB.promedioPorTest.toFixed(2)}:** ese número sale de los ${d.cantidadCasos} casos actuales, que
solo ejercitan los tres handlers que ya existen (\`GET\`/\`POST\`/\`DELETE /turnos\`)
con datos distintos. Un test nuevo que reutiliza uno de esos
handlers agrega ~0 líneas dentro del \`it()\`, igual que ${d.casosSinMockeoB} de los ${d.cantidadCasos} casos de
hoy. Pero un test que necesita un endpoint nuevo, o un escenario de error que
el handler existente no contempla, obliga a escribir un handler nuevo —
${HANDLER_NUEVO_LINEAS} líneas típicas, no ${d.mockeoB.promedioPorTest.toFixed(2)}. Ese número solo se sostiene
mientras los tests que se vayan agregando sigan reusando handlers
existentes. El marginal de la Versión A, en cambio, sí es constante: el
helper (\`mockFetchOnce\`) ya existe y cada test nuevo paga lo mismo, sin
importar qué endpoint ejercite.

**Análisis de sensibilidad** — cómo cambia el marginal de B (y el punto de
cruce) según qué fracción de los tests *nuevos* obliga a escribir un handler
nuevo de ${HANDLER_NUEVO_LINEAS} líneas:

| Escenario | Marginal de B resultante | Punto de cruce |
| --- | --- | --- |
${d.escenarios
  .map(
    (e) =>
      `| ${e.etiqueta} | ${e.marginalB.toFixed(2)} líneas/test | ${
        e.puntoDeCruce === null
          ? `No hay — el marginal de B (${e.marginalB.toFixed(2)}) ya iguala o supera al de A (${d.mockeoA.promedioPorTest.toFixed(2)}); el setup más alto de B nunca se amortiza`
          : `${e.puntoDeCruce} tests`
      } |`,
  )
  .join('\n')}

Los **${d.puntoDeCruce} tests** de la conclusión de arriba son entonces el **mejor caso
posible** para la Versión B — el que vale solo si absolutamente ningún test
futuro necesita un handler nuevo. No es la estimación esperada: apenas 1 de
cada 4 tests nuevos requiera un handler nuevo, el punto de cruce desaparece y
la Versión B queda con más líneas totales que la Versión A, sin importar
cuánto crezca la suite.

**Lo que este conteo no mide:** líneas de código es una métrica de costo, no
de beneficio. No captura las dos ventajas que se le atribuyen a MSW en este
informe — que el cliente HTTP queda desacoplado del mecanismo de mockeo (los
handlers no saben ni les importa que \`apiTurnos.ts\` use \`fetch\`), y que esos
mismos handlers se pueden reutilizar fuera de los tests (por ejemplo, para
levantar un entorno de desarrollo o Storybook sin backend real). Un conteo de
líneas más bajo en la Versión A no significa que la Versión A sea mejor en
esos ejes — solo que este conteo no los mide.

## 3. Bloque para la diapositiva de código

Caso más representativo: **"reservar envía el body serializado y el header
correctos"**. Es donde mejor se ve la diferencia entre inspeccionar un mock e
inspeccionar un comportamiento real.

**Versión A — inspecciona los argumentos del mock:**

\`\`\`ts
it('reservar envía el body serializado y el header correctos', async () => {
  const nuevo = { fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }
  mockFetchOnce(201, { id: '5', ...nuevo })

  await reservarTurno(nuevo)

  const [, init] = vi.mocked(fetch).mock.calls[0]
  expect(init?.body).toBe(JSON.stringify(nuevo))
  expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
})
\`\`\`

*Verifica cómo se llamó a la función \`fetch\` — un detalle de implementación, no una respuesta real.*

**Versión B — verifica el request real, a través de la respuesta:**

\`\`\`ts
http.post(\`\${BASE_URL}/turnos\`, async ({ request }) => {
  const nuevo = await request.json()
  // valida y crea el turno...
  return HttpResponse.json(turno, { status: 201 })
})

it('reservar envía el body serializado y el header correctos', async () => {
  const nuevo = { fecha: '2026-09-01', hora: '10:00', paciente: 'Ana' }
  const turno = await reservarTurno(nuevo)
  expect(turno).toMatchObject(nuevo)
})
\`\`\`

*El handler solo puede devolver el turno completo si el body y el header le llegaron bien — se verifica el comportamiento, no el mock.*

## 4. Versiones usadas

| Herramienta | Versión |
| --- | --- |
| Node | ${d.versiones.node} |
| TypeScript | ${d.versiones.typescript} |
| Vitest | ${d.versiones.vitest} |
| MSW | ${d.versiones.msw} |

## 5. Cómo reproducirlo

\`\`\`
npm run compare
\`\`\`

## 6. Experimento: ¿MSW desacopla los tests del cliente HTTP?

Registro de un experimento manual, hecho una sola vez y revertido. No lo
recalcula \`npm run compare\` — el código del repo volvió a \`fetch\` apenas
terminó, porque el resto de este informe se apoya en mediciones hechas con
\`fetch\`. Los números de esta sección son un resultado histórico, no una
medición reproducible por el script.

**Hipótesis:** si se cambia \`src/apiTurnos.ts\` de \`fetch\` a axios sin tocar
ni una línea de los tests, la Versión A (mock manual con \`vi.stubGlobal\`)
falla, porque parchea \`fetch\` y axios no pasa por ahí. La Versión B (MSW)
sigue pasando sin cambios, porque intercepta por debajo de ambos.

**Procedimiento:**
1. Línea base con \`fetch\`: Versión A 13/13, Versión B 13/13.
2. \`npm install axios\` y se reescribió \`src/apiTurnos.ts\` para usar axios,
   con la misma firma pública en las 3 funciones y el mismo mapeo de errores
   (409 → \`TurnoOcupadoError\`, 400/404 → \`TurnoInvalidoError\`, otros →
   \`ServidorNoDisponibleError\`) — adaptado a que axios lanza excepción en
   códigos de error en vez de devolver una respuesta.
3. Ningún archivo de test, handler o setup se tocó.
4. Se corrieron las dos suites tal cual.
5. Se restauró \`src/apiTurnos.ts\` a la versión con \`fetch\` (y se desinstaló
   axios) antes de seguir con cualquier otra cosa.

Repetido cada vez que cambió la cantidad de casos o el contrato de \`id\`,
para no dejar esta sección con números de una versión anterior del proyecto.

**Resultado — Versión A (mock manual):** 0/13 pasan (13 fallan). Los tests
fallan porque \`vi.stubGlobal('fetch', ...)\` reemplaza el \`fetch\` global, pero
axios en Node no pasa por ahí — usa \`http\`/\`https\` directamente. La llamada
intenta salir a la red de verdad, contra un puerto donde no hay nada
escuchando. Mensaje real de uno de los tests:

\`\`\`
AssertionError: promise rejected "AggregateError: connect ECONNREFUSED ::1:3000; connect ECONNREFUSED 127.0.0.1:3000" instead of resolving
 ❯ tests/manual/apiTurnos.test.ts:19:32
    17|     mockFetchOnce(200, turnos)
    18|
    19|     await expect(listarTurnos()).resolves.toEqual(turnos)
      |                                ^
\`\`\`

**Resultado — Versión B (MSW):** 13/13 pasan, sin ningún cambio en
\`tests/msw/\`. El interceptor de MSW en Node parchea \`http\`/\`https\`
directamente, así que agarra las requests de axios igual que agarraba las de
\`fetch\`.

**Conclusión:** el resultado confirma la hipótesis sin ninguna sorpresa —
cambiar el cliente HTTP rompe por completo la Versión A (0/13) y no afecta en
nada a la Versión B (13/13). Esto es evidencia directa a favor de la ventaja de
desacople que la sección 2 menciona pero que el conteo de líneas no podía
medir por sí solo.
`
}

// La sección 7 se escribe a mano (cualitativa, no derivada de una medición)
// y este script nunca la genera. Si el RESULTADOS.md actual ya tiene una
// sección 7, se preserva tal cual al regenerar el resto del archivo — así
// una corrida de `npm run compare` no la pisa.
function leerSeccion7Existente(): string {
  const ruta = join(RAIZ, 'RESULTADOS.md')
  if (!existsSync(ruta)) return ''

  const actual = readFileSync(ruta, 'utf-8')
  const inicio = actual.indexOf('\n## 7.')
  if (inicio === -1) return ''

  return actual.slice(inicio + 1).replace(/\n+$/, '') + '\n'
}

function main() {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true })

  console.log('Corriendo Versión A (mock manual) x3...')
  const versionA = medirSuite('tests/manual/apiTurnos.test.ts')

  console.log('Corriendo Versión B (MSW) x3...')
  const versionB = medirSuite('tests/msw/apiTurnos.test.ts')

  console.log('Midiendo cobertura de src/apiTurnos.ts (con la suite de MSW)...')
  const coberturaPct = medirCobertura()

  const setupLineasA = contarLineas('tests/manual/mockFetch.ts')
  const setupLineasB = contarLineas('tests/msw/handlers.ts') + contarLineas('tests/msw/setup.ts')

  const mockeoA = resumenMockeo(LINEAS_MOCKEO_POR_TEST_A)
  const mockeoB = resumenMockeo(LINEAS_MOCKEO_POR_TEST_B)

  const cantidadCasos = LINEAS_MOCKEO_POR_TEST_A.length
  const casosConInspeccionA = LINEAS_MOCKEO_POR_TEST_A.filter((n) => n > 1).length
  const casosSinMockeoB = LINEAS_MOCKEO_POR_TEST_B.filter((n) => n === 0).length

  // Este llamado usa el marginal medido sobre los casos actuales, así que
  // nunca da null (el marginal de B, hoy, es menor al de A) — el "!" refleja
  // esa garantía, no una suposición nueva.
  const puntoDeCruce = calcularPuntoDeCruce(
    setupLineasA,
    mockeoA.promedioPorTest,
    setupLineasB,
    mockeoB.promedioPorTest,
  )!

  const escenarios = ESCENARIOS_SENSIBILIDAD.map((escenario) =>
    calcularEscenarioSensibilidad(
      escenario,
      setupLineasA,
      mockeoA.promedioPorTest,
      setupLineasB,
      mockeoB.promedioPorTest,
    ),
  )

  const versiones = {
    node: process.version,
    typescript: leerVersionPaquete('typescript'),
    vitest: leerVersionPaquete('vitest'),
    msw: leerVersionPaquete('msw'),
  }

  const md = generarMarkdown({
    versionA,
    versionB,
    coberturaPct,
    setupLineasA,
    setupLineasB,
    mockeoA,
    mockeoB,
    cantidadCasos,
    casosConInspeccionA,
    casosSinMockeoB,
    puntoDeCruce,
    escenarios,
    versiones,
  })

  const seccion7 = leerSeccion7Existente()
  writeFileSync(join(RAIZ, 'RESULTADOS.md'), md + (seccion7 ? `\n${seccion7}` : ''), 'utf-8')

  console.log('\nRESULTADOS.md generado. Resumen:')
  console.log(`  Tests totales (Versión A): ${versionA.testsPasados}/${versionA.testsTotal}`)
  console.log(`  Tests totales (Versión B): ${versionB.testsPasados}/${versionB.testsTotal}`)
  console.log(`  Tiempo Versión A (promedio 3 corridas): ${versionA.duracionPromedioMs} ms`)
  console.log(`  Tiempo Versión B (promedio 3 corridas): ${versionB.duracionPromedioMs} ms`)
  console.log(`  Cobertura src/apiTurnos.ts: ${coberturaPct}%`)
  console.log(`  Líneas de setup — Versión A: ${setupLineasA} / Versión B: ${setupLineasB}`)
  console.log(`  Líneas de mockeo en tests — Versión A: ${mockeoA.total} / Versión B: ${mockeoB.total}`)
  console.log(`  Punto de cruce (extrapolado): ${puntoDeCruce} tests`)
}

main()
