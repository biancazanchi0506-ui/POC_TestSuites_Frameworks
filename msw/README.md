# msw/ — PoC de MSW

## Por qué esta carpeta no prueba lo mismo que las otras

`vitest/src/turnos.ts` — la implementación de referencia que señala el
README del grupo — define lógica de dominio pura (`hayDisponibilidad`,
`reservarTurno`, `cancelarTurno`, `listarTurnosPorFecha`) operando sobre un
array en memoria, sin I/O. MSW no tiene nada que hacer ahí: es una librería
que intercepta requests HTTP y devuelve respuestas falsas — si no hay red,
no hay nada que interceptar.

Por eso esta carpeta prueba otra cosa: un **cliente HTTP** (`src/apiTurnos.ts`)
que sí hace requests reales, con el mismo dominio de turnos y las mismas
rutas y códigos de estado que define la sección 3 de `CASO-DE-PRUEBA.md`
(`POST/GET/DELETE /turnos`). Es la pieza donde MSW tiene sentido, y es la
única carpeta del repo que ejercita esa sección — ninguna otra tecnología
llega a hacer requests HTTP reales.

## Por qué hay dos suites en vez de una

El trabajo de esta carpeta no es solo "usar MSW", es **comparar** MSW contra
la alternativa más obvia: mockear `fetch` a mano. Para que esa comparación
signifique algo, las dos formas tienen que probar exactamente los mismos 13
casos sobre el mismo cliente HTTP — por eso hay Versión A (mock manual) y
Versión B (MSW), no una.

## Qué hay adentro

```
src/
  apiTurnos.ts            # El cliente HTTP bajo prueba (listar, reservar,
                           # cancelar). No sabe que existe ningún mock.

tests/
  manual/                  # VERSIÓN A — mock manual, sin MSW.
    mockFetch.ts              # Reemplaza el fetch global (vi.stubGlobal) y
                               # arma respuestas falsas a pedido de cada test.
    apiTurnos.test.ts           # Los 13 casos, Versión A.

  msw/                      # VERSIÓN B — con MSW.
    handlers.ts                 # Los "endpoints falsos" (GET/POST/DELETE
                                 # /turnos), con un array en memoria haciendo
                                 # de base de datos, validando como una API real.
    setup.ts                      # Prende y apaga el servidor falso de MSW,
                                   # y resetea el estado entre tests.
    apiTurnos.test.ts               # Los mismos 13 casos, Versión B.

scripts/
  compare.ts               # Corre las dos suites, mide tiempos/cobertura/
                            # líneas de código, y regenera RESULTADOS.md.

RESULTADOS.md               # El resultado de la comparación. Lo genera
                             # compare.ts — no se edita a mano.
```

## Cómo correrlo

```
npm install
```
Instala las dependencias de esta carpeta únicamente.

```
npm test
```
Corre las dos suites una vez. Esperado: `26 passed` (13 de cada versión).

```
npm run compare
```
Corre cada suite 3 veces, mide cobertura y líneas de código, y regenera
`RESULTADOS.md` de cero. Tarda más que `npm test` — varios segundos.

## Qué mirar en RESULTADOS.md

- **Sección 1:** los 4 números de esta tecnología (Versión B/MSW) para la
  tabla comparativa del informe del grupo.
- **Sección 2 — primer hallazgo:** contando líneas, MSW no es automáticamente
  "más corto" — recién le gana a la Versión A a partir de una suite bastante
  más grande que esta, y solo en el mejor caso. Incluye un análisis de
  sensibilidad, léela entera antes de citar un número suelto en una slide.
- **Sección 3:** los dos fragmentos de código recortados y listos para pegar
  lado a lado.
- **Sección 6 — segundo hallazgo:** ver más abajo.
- **Sección 7:** los dos ítems cualitativos que pide la sección 5 de
  `CASO-DE-PRUEBA.md` (facilidad de mockeo, fricción/ventaja notable).
  Escrita a mano — `npm run compare` no la toca.

## El experimento de axios (sección 6) ya está revertido

El código de esta carpeta usa `fetch`. Si buscás axios en `src/apiTurnos.ts`
o en `package.json`, no vas a encontrar nada — se instaló, se usó para un
experimento puntual, y se revirtió a propósito antes de dejar esto acá.

Para reproducirlo:

1. `npm install axios`
2. Reescribí `src/apiTurnos.ts` para usar axios en vez de `fetch`, misma
   firma pública y mismo mapeo de errores (409 → `TurnoOcupadoError`,
   400/404 → `TurnoInvalidoError` propagando el motivo, otros →
   `ServidorNoDisponibleError`). Axios lanza excepción en los códigos de
   error en vez de devolver una respuesta — hay que adaptar eso sin cambiar
   el comportamiento observable.
3. **No toques ningún archivo de `tests/`.** Ese es el punto: ver qué
   versión sobrevive sin que nadie le cambie una línea.
4. `npm test` — una de las dos versiones se rompe entera, la otra no cambia.
5. Para dejarlo como estaba: restaurá `src/apiTurnos.ts` a la versión con
   `fetch` y corré `npm uninstall axios`.

La hipótesis, el resultado real de cada versión y el mensaje de error
textual están en la sección 6 de `RESULTADOS.md`.
