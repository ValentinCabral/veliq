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
| OpenCode | Hook V1 Observe probado de forma aislada | Prueba de carga real y V2 |
| MCP/A2A/Codex/Claude | Interfaz SDK o documentación | Implementación y verificación |
| Benchmark | 1000 casos sintéticos, resultado negativo | Corpus diverso y métricas LLM |

Problema detectado: `pro(nu(dar(...)))` invertía la prohibición. Corregido a `pro(del(ri(...)))` con prueba específica. Las dependencias externas no estaban disponibles y no se utilizó un SDK no verificable. El sistema no llama servicios externos.

## Avance alpha.2

- TUI `veliq tui` implementada con datos SQLite reales.
- `bench import/list`, esquema de corrida y endpoint HTTP con token opt-in implementados y probados.
- SDK `submitBenchmark` permite que un runner OpenCode u otro harness suba resultados automáticamente después de evaluarlos. El runner específico de OpenCode y la validación externa siguen pendientes.
- 15 pruebas automatizadas pasan. Benchmark interno: 0/1.000 candidatas aceptadas bajo contador de bytes, sin extrapolar a LLMs.
