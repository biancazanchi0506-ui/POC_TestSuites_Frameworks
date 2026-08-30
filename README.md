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
