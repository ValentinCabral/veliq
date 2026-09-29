# PROGRESS · 2026-09-29

| Componente | Estado verificable | Pendiente |
|---|---|---|
| Lenguaje/gramática | Parser y diccionario versionado, round-trip formal | Cobertura general, propuesta experimental de raíces |
| VSR | AST, aridad, IDs, procedencia, hash semántico | Tipos profundos, temporalidad y epistemología completas |
| Codec | Contador byte exacto de perfil artificial, estimador separado, fallback | Tokenizadores comerciales y costos completos |
| Protocolo | 2 peers en proceso, negociación y recuperación hash | Transporte externo, auth, ACK durables |
| Memoria | SQLite, aislamiento exacto, versiones y conflicto | Cifrado, expiración, búsqueda semántica |
| Runtime/CLI | Observe, Hybrid acotado, comandos básicos | Native seguro entre modelos, instalación de harness |
| Studio | HTML local con endpoints y métricas persistidas | React, configuración completa, gráficos e integraciones |
| OpenCode | MCP instalado en proyecto y conexión 1.18.33 verificada; hook V1 aislado | Intercepción profunda y V2 |
| MCP/Codex/Claude/A2A | MCP stdio con ocho herramientas y prueba de cliente real; Claude registra pendiente de aprobación | Sesiones de modelo Codex/Claude, A2A |
| Benchmark | 1000 casos sintéticos, resultado negativo | Corpus diverso y métricas LLM |

Problema detectado: `pro(nu(dar(...)))` invertía la prohibición. Corregido a `pro(del(ri(...)))` con prueba específica. Las dependencias externas no estaban disponibles y no se utilizó un SDK no verificable. El sistema no llama servicios externos.

## Avance alpha.2

- TUI `veliq tui` implementada con datos SQLite reales.
- `bench import/list`, esquema de corrida y endpoint HTTP con token opt-in implementados y probados.
- SDK `submitBenchmark` permite que un runner OpenCode u otro harness suba resultados automáticamente después de evaluarlos. El runner específico de OpenCode y la validación externa siguen pendientes.
- 15 pruebas automatizadas pasan. Benchmark interno: 0/1.000 candidatas aceptadas bajo contador de bytes, sin extrapolar a LLMs.
- CI GitHub Actions: pruebas en Node 24 y benchmark sintético adjunto como artefacto por push/PR; estado remoto se verifica tras publicar. No constituye evaluación de un modelo externo.
- README reescrito en español e inglés; `docs/HARNESSES.md` diferencia capacidades verificadas y pendientes de OpenCode, Codex, Claude Code y otros harnesses.
- Agregador JSONL por caso con hash real de corpus, veredictos obligatorios y 17 pruebas locales.

## Avance alpha.3

- MCP oficial 1.31.0 con validación Zod, ocho herramientas, prueba in-process y stdio real.
- OpenCode 1.18.33 confirma conexión desde configuración instalada por VELIQ; instalador reversible con respaldo privado.
- Claude Code 2.1.284 registra el servidor, pendiente de aprobación en ese harness. Codex 0.159.0 localizado, sin modificar configuración local.
- `npm ci` ahora requerido; `npm run typecheck` usa TypeScript estricto. 21 pruebas locales.
