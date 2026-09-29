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
| MCP/Codex/Claude/A2A | MCP stdio con once herramientas y prueba de cliente real; Claude registra pendiente de aprobación | Sesiones de modelo Codex/Claude, A2A |
| Benchmark | 1000 casos sintéticos, resultado negativo | Corpus diverso y métricas LLM |

## Avance alpha.4 · medición multilingüe

- Traductor determinista de una instrucción controlada en diez idiomas, con idioma fuente explícito y original conservado; las frases libres siguen rechazadas.
- Perfil superficial C1 con parser/serializador estrictos, alcance explícito `pro{...}` y round-trip VSR probado. No se activa en Hybrid sin `compactNegotiated`; MCP permite probarlo explícitamente.
- Benchmark reproducible con `tiktoken 0.12.0`, dos encodings y 100 identificadores × 10 idiomas. El archivo `research/benchmarks/results-2026-09-29.json` contiene los resultados y el hash del corpus; CI los compara. **Son conteos exactos de texto, no uso reportado por un modelo.**
- Contraejemplos: C1 empeora inglés y chino en ambos encodings, incluso antes de contabilizar glosario. No existe evidencia de ahorro universal, comprensión por modelos ni reducción monetaria.
- `veliq.benchmark` por MCP ejecutó la acción `multilingual` mediante cliente oficial en proceso: 1.000 casos, 20 filas y hash de corpus coincidente. Studio sirve el JSON versionado y muestra las 20 filas; pruebas de API incluyen el caso inglés. OpenCode no está instalado en el entorno de esta sesión para repetir la comprobación previa de conexión 1.18.33.
- Pendiente: corpus realmente diverso, modelos de familias distintas, evaluación de comprensión/precisión, comparación con resúmenes convencionales, integración automática de uso reportado desde harnesses. Sin esos datos, la optimización no se activa operativamente.

## Avance alpha.5 · recuperación selectiva y corrección de contabilidad

- `veliq.memory.exact.store/select` y `veliq.pick` operan con SQLite local, ámbito exacto, registros únicos, versiones, hashes y restricciones completas. La vista enviada al modelo omite metadatos de auditoría innecesarios.
- Benchmark reproducible con 10 documentos sintéticos de 100 registros y 100 consultas por idioma. Carga inicial y llamadas se cuentan como texto: reducción 95,89–96,15 % contra reenviar el documento entero. Frente a una búsqueda convencional equivalente VELIQ pierde ~0,4–0,5 %: el ahorro proviene de recuperación selectiva.
- `veliq.optimize` permite tokenización local exacta de texto con `tiktoken`, etiquetada separadamente de bytes y consumo del proveedor. Prueba MCP manual bajo `o200k_base` en inglés: fallback al original, 13 tokens, glosario descartado 0.
- Corregido el error de fallback que contabilizaba overhead nunca enviado. `npm run benchmark` ahora devuelve 0/1.000 candidatos y ahorro neto 0 %, en vez del resultado erróneo −30,35 %. Las pruebas cubren la corrección.
- Studio sirve los dos reportes versionados; CI los regenera y compara. Pendiente: costos completos y veredictos funcionales de modelos, corpus diverso y casos no estructurados. No declarar ahorro general del idioma.

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
- Claude Code 2.1.284 registra el servidor, pendiente de aprobación en ese harness. Codex 0.159.0 reconoce la entrada MCP como enabled mediante overrides temporales, sin sesión de modelo ni modificación global.
- `npm ci` ahora requerido; `npm run typecheck` usa TypeScript estricto. 21 pruebas locales.
