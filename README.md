
# PoC — Tecnologías de Testing (DSW)

Repositorio del trabajo práctico de Proof of Concept comparando tecnologías de
testing en JS/TS: **Jest, Vitest, Mocha, Testing Library y MSW**.

## Cómo está organizado

Cada tecnología tiene su propia carpeta, con el mismo dominio de negocio
(sistema de reservas de turnos), implementado y testeado con esa herramienta
en particular. Esto permite comparar resultados de forma justa en el informe.

```
poc-testing-repo/
├── CASO-DE-PRUEBA.md      ← leer primero: qué hay que implementar y testear
├── jest/
├── vitest/                ← ya implementado, sirve de referencia
├── mocha/
├── testing-library/
└── msw/
```

## Antes de empezar

1. Leé **`CASO-DE-PRUEBA.md`** — ahí está la especificación completa: qué
   funciones y endpoints hay que implementar, y qué casos de test son
   obligatorios. Es la misma para todos, sin importar la herramienta.
2. Mirá la carpeta `vitest/` como referencia de cómo se estructura un mini-proyecto
   (`src/` con la lógica, `tests/` con los tests, config y `package.json`).
3. Trabajá **únicamente dentro de tu carpeta** (la de tu tecnología asignada).
   No hace falta compartir `node_modules` ni configuración entre carpetas.

## Cómo agregar tu parte

1. Cloná el repo y ubicate en la carpeta de tu tecnología, por ejemplo:
   ```bash
   cd jest
   ```
2. Instalá las dependencias necesarias de tu herramienta (`jest`, `mocha` +
   `chai`, `@testing-library/react`, `msw`, etc.).
3. `src/types.ts` y `src/turnos.ts` **ya vienen incluidos e idénticos en todas
   las carpetas** — es la lógica de negocio compartida, no hace falta
   reescribirla. No la modifiques, así la comparación entre tecnologías es válida.
4. Escribí tus tests en `tests/` cubriendo los casos listados en
   `CASO-DE-PRUEBA.md`, usando la sintaxis de tu herramienta.
5. Agregá tu `package.json` con los scripts de test (`test`, `test:coverage`, etc.).
6. Anotá en un `RESULTADOS.md` dentro de tu carpeta: tiempo de setup, tiempo
   de ejecución, % de coverage y cualquier ventaja/dificultad que notaste —
   esto se usa después en el informe (secciones 4.3 y 5).

## Cómo subir tus cambios

```bash
git checkout -b <tu-nombre>-<tecnologia>   # ej: bian-vitest
git add <carpeta-de-tu-tecnologia>
git commit -m "Agrega implementación y tests con <tecnologia>"
git push origin <tu-nombre>-<tecnologia>
```

Después se hace un Pull Request para revisar entre todos antes de mergear a `main`.

## Informe

El informe final se arma por separado (Word/Google Docs compartido), tomando
como base el código y resultados de cada carpeta de este repo.

# POC_TestSuites_Frameworks

