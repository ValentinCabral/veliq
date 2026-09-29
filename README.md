# VELIQ

**Español** · [English](#english)

VELIQ investiga un idioma artificial composicional y un protocolo opcional para intercambiar significado entre agentes de IA. La versión actual es un **prototipo 0.1 alpha**, ejecutable sin cuentas ni claves. La interfaz del usuario sigue en lenguaje natural; VELIQ se usa sólo en los caminos internos que se habiliten explícitamente.

> **Mejora del idioma C3:** en 800 instrucciones sintéticas soportadas, C3 reduce **37,45 %** (`cl100k_base`) y **35,14 %** (`o200k_base`) de los tokens de texto frente al mejor baseline natural probado, incluyendo redacción concisa y encabezados que comparten el ID. Se incluye un glosario compartido. Parser, CLI y MCP funcionan y preservan VSR; no se comprobó comprensión ni costo de un modelo.

**Meta pendiente:** esa ventaja acotada no demuestra 30–40 % en el uso normal de harnesses. El [corpus mixto](research/benchmarks/harness-results-2026-09-29.json) incluye además 200 fragmentos exactos de código/documentación que no se modifican, y su mejora agregada es menor. Si el glosario se paga por llamada, la estrategia usa fallback y no mejora el baseline. Un historial compartido tampoco implica que el proveedor facture el glosario sólo una vez. No existe ahorro automático demostrado sólo por instalar MCP. [Metodología](docs/BENCHMARKS.md).

**Ahorro comprobado en una tarea acotada:** recuperación exacta por ID sobre documentos compartidos. En 100 consultas a un documento de 100 registros, `veliq.pick` reduce **96,03 %** de los tokens de texto de entrada bajo `cl100k_base` en el caso español, incluyendo carga inicial y llamadas representadas como texto. Una búsqueda convencional equivalente es **0,42 % más barata**. El beneficio proviene de no reenviar el documento completo; no prueba que el idioma VELIQ reduzca el costo de un LLM. [Método y límites](docs/BENCHMARKS.md).

## Estado de implementación

| Componente | Disponible hoy | Límite |
|---|---|---|
| Idioma | Diccionario 0.1 con IDs estables, parser formal y C1/C2/C3; ligaduras locales, alcance y aridad | Ocho familias controladas en español/inglés y una en otros ocho idiomas; no entiende lenguaje libre |
| VSR y codec | AST versionado, round-trip formal/C1/C2/C3, fallback, contador de bytes y `tiktoken` opcional | Cuenta texto, no solicitudes completas ni consumo del proveedor |
| Memoria | SQLite local, ámbitos aislados, referencias por SHA-256, versiones y detección de conflictos | Datos locales en texto plano; sin embeddings |
| Protocolo | Negociación y recuperación de referencias entre dos peers en proceso | MCP stdio local operativo; sin transporte remoto autenticado |
| Runtime | Observe sin cambios de mensajes; Hybrid acotado con controles | No intercepta solicitudes de modelo automáticamente |
| Interfaces | CLI, TUI y Studio local con datos persistidos | Studio es HTML ligero; configuración avanzada pendiente |
| Harnesses | MCP con once herramientas; OpenCode 1.18.33 conectado; instaladores de hooks Observe por proyecto | Hooks probados localmente; Codex/Claude requieren confianza/aprobación y prueba de sesión; no ahorro automático |
| Investigación | Conteos `tiktoken` multilingües, mixtos y de recuperación selectiva, baseline natural conciso, agregación externa y CI | Falta corpus representativo y evaluación funcional con modelos reales |

[Estado detallado](PROGRESS.md) · [Arquitectura](ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md)

## Requisitos e instalación

- Node.js **24 o superior**. Se usan `node:sqlite` y soporte nativo de TypeScript; instalá dependencias del SDK MCP con `npm ci`.
- Clonar este repositorio y trabajar desde la raíz. Las configuraciones y bases se crean en `.veliq/`, ignorada por Git.

```bash
git clone https://github.com/ValentinCabral/veliq.git
cd veliq
npm ci
npm run check
node --experimental-strip-types apps/cli/main.ts init
```

Para usar el comando corto `veliq` se puede instalar el enlace local con `npm link` de forma voluntaria. Todos los ejemplos funcionan sin instalación global usando `node --experimental-strip-types apps/cli/main.ts`.

## Conectar a OpenCode, Codex o Claude Code

VELIQ ya expone once herramientas MCP reales por stdio (`encode`, `decode`, `validate`, `optimize`, memoria, benchmark y capacidades). Verifiqué la conexión con OpenCode 1.18.33 y el cliente oficial MCP. Desde tu proyecto OpenCode:

```bash
node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts install opencode
opencode mcp list
```

Para deshacer la configuración, `node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts uninstall opencode`. La instalación conserva las demás entradas y crea respaldo en `.veliq/backups/`. Para Codex y Claude Code, seguí los comandos específicos en [guías por harness](docs/HARNESSES.md); Claude puede exigir aprobación interactiva. También podés iniciar el servidor con `npm run mcp` para un cliente MCP propio. Son herramientas que el agente debe invocar; no interceptan por sí solas todos sus mensajes.

## Uso cotidiano

```bash
node --experimental-strip-types apps/cli/main.ts doctor
node --experimental-strip-types apps/cli/main.ts status
node --experimental-strip-types apps/cli/main.ts encode 'Analiza el error "1" y no elimines los archivos originales.'
node --experimental-strip-types apps/cli/main.ts encode --lang en --compact 'Analyze error "1" and do not delete the original files.'
node --experimental-strip-types apps/cli/main.ts encode --lang en --c2 'Transfer result "1" to agent "agent-2".'
node --experimental-strip-types apps/cli/main.ts encode --lang en --c3 'Analyze error "case-001", fix it, and verify tests "case-001".'
node --experimental-strip-types apps/cli/main.ts decode --c3 'case-001 sen error nar error sel tests'
node --experimental-strip-types apps/cli/main.ts decode --compact 'sen@error:1;pro{del@archivos:originales}'
node --experimental-strip-types apps/cli/main.ts decode 'pro(del(ri("archivos:originales")))'
npm run tui
npm run dashboard
```

Abrí `http://127.0.0.1:4173` para Studio. `VELIQ_PORT` cambia el puerto y `VELIQ_HOME` la ruta de datos. La TUI necesita una terminal interactiva y muestra mediciones, memoria, idioma y corridas externas. `encode` con frases fuera de la plantilla conocida falla explícitamente; `decode` fuera de la traducción conocida muestra un diagnóstico formal, sin inventar español. `--lang` admite `es`, `en`, `pt`, `fr`, `de`, `it`, `nl`, `zh`, `ja` y `ko`. El perfil C1 es experimental y requiere compatibilidad negociada con el receptor.

## Demostración de dos agentes

```bash
npm run demo
```

La demo toma una instrucción en español, construye VSR y VELIQ, mide bytes, negocia capacidades de dos peers locales, recupera una referencia SHA-256, preserva `pro(del(...))`, devuelve el texto español original y registra datos que aparecen en Studio. Es una prueba determinista del protocolo local; **no involucra un LLM ni demuestra interoperabilidad remota**.

## Probar y comparar

```bash
npm test
npm run benchmark
python3 -m venv .venv-research
.venv-research/bin/pip install -r research/benchmarks/requirements.txt
.venv-research/bin/python research/benchmarks/multilingual.py > resultado-multilingue.json
.venv-research/bin/python research/benchmarks/selective.py > resultado-selectivo.json
.venv-research/bin/python research/benchmarks/harness.py > resultado-mixto.json
```

Los benchmarks son sintéticos; el lingüístico repite una plantilla y el selectivo repite consultas a un documento estructurado. Los resultados cuentan texto exactamente con dos tokenizaciones pero **no** solicitudes completas ni precisión de tarea. [Resultados y metodología](docs/BENCHMARKS.md) · [JSON reproducible](research/benchmarks/results-2026-09-29.json). Para resultados externos, ejecutá el **mismo corpus** con baseline y candidata, modelo/configuración comparables y parámetros controlados. Registrá por cada caso tokens de entrada, salida, overhead (incluidas traducciones/instrucciones auxiliares), reintentos, veredicto funcional y violaciones críticas. Conservá el conteo como `provider-reported`, `exact-text`, `estimated` o `local-bytes` según su origen; no mezcles unidades.

La [medición selectiva](research/benchmarks/selective-results-2026-09-29.json) usa diez documentos sintéticos, 100 registros y 100 consultas exactas por idioma; valida IDs, cuerpo, restricciones y hash. Conectá un harness MCP a `veliq.memory.exact.store` para guardar el documento con ámbito y a `veliq.pick` para recuperar sólo el registro. Si el receptor necesita todo el documento o no existe el ID, recuperá la fuente completa o dejá fallar la consulta; no inventes contenido. La memoria local sigue sin cifrado, por lo que no debe guardar secretos.

El [benchmark mixto C2/C3](research/benchmarks/harness-results-2026-09-29.json) distingue instrucciones del agente de código, documentación y resultados exactos. `benchmark --harness archivo.jsonl` analiza un corpus propio **sólo por acción explícita**, sin subir contenido. `install opencode-observe`, `install codex-observe` o `install claude-observe` configuran observación automática por proyecto tras reiniciar y aprobar los hooks del harness. No añaden contexto ni cambian resultados; registran bytes/metadatos privados, no tokens del proveedor. `status`, TUI y Studio muestran esos registros. La captura de texto OpenCode requiere `VELIQ_CAPTURE_CONTENT=1` y revisión por posibles secretos. [Guía y límites](docs/HARNESSES.md) · [Objetivo de uso diario](docs/DAILY_USE.md).

El archivo [de ejemplo por caso](examples/case-results.jsonl) muestra el formato; sus números son ficticios. Después de crear `resultados.jsonl` y `corpus.jsonl`:

```bash
VELIQ_RUN_ID='ensayo-001' VELIQ_HARNESS='opencode' VELIQ_HARNESS_VERSION='1' \
VELIQ_MODEL='modelo-id' VELIQ_MODEL_VERSION='version-id' VELIQ_DATASET='corpus-001' \
VELIQ_COUNT_KIND='provider-reported' \
node --experimental-strip-types scripts/aggregate-benchmark.mjs resultados.jsonl corpus.jsonl corrida.json
node --experimental-strip-types apps/cli/main.ts bench import corrida.json
node --experimental-strip-types apps/cli/main.ts bench list
```

`aggregate-benchmark` calcula el hash real del corpus, agrega conteos y corrección, detecta IDs duplicados y crea la salida sin sobrescribir archivos. `bench import` valida el esquema y conserva cada `run_id` una sola vez. La importación no certifica la honestidad ni el diseño experimental de un ensayo externo.

### Envío automático desde otro harness

El receptor HTTP está **desactivado** sin token y escucha únicamente en loopback. Configurá un token aleatorio local de 16 caracteres como mínimo (32 o más recomendado):

```bash
VELIQ_INGEST_TOKEN='reemplazar-por-token-aleatorio-largo' npm run dashboard
```

Luego, en el mismo equipo, después de que el runner genere `corrida.json`:

```bash
VELIQ_BENCHMARK_URL='http://127.0.0.1:4173/api/benchmarks' \
VELIQ_INGEST_TOKEN='reemplazar-por-token-aleatorio-largo' \
node scripts/upload-benchmark.mjs corrida.json
```

Para otro equipo se necesita un endpoint HTTPS expuesto de forma deliberada mediante infraestructura propia; VELIQ no lo publica. El cliente rechaza HTTP remoto y redirecciones. El SDK [`submitBenchmark`](packages/adapter-sdk/benchmark-client.ts) permite integrar el envío en un runner OpenCode, Claude Code, Codex u otro, **después** de ejecutar baseline y candidata. No manda prompts ni secretos por defecto.

[Contrato y metodología](docs/EXTERNAL_BENCHMARKS.md) · [Guías por harness](docs/HARNESSES.md)

## Seguridad y límites

- No introducir secretos en la memoria local: SQLite no está cifrada.
- Studio y el endpoint sólo deben usarse en una máquina confiable; no tienen autenticación de lectura multiusuario.
- Los hashes de protocolo verifican integridad, no identidad del emisor.
- Las optimizaciones operativas permanecen apagadas salvo activación explícita y verificación del subconjunto.
- `veliq install opencode` configura MCP en el proyecto con respaldo privado y `uninstall opencode` lo revierte. Codex y Claude Code usan el mismo servidor MCP stdio; no hay interceptor profundo ni adaptador A2A operativo.

[Seguridad](docs/SECURITY.md) · [Especificación del idioma](docs/language/LANGUAGE_SPEC.md) · [Protocolo](docs/PROTOCOL_SPEC.md) · [Herramientas MCP](docs/MCP_SPEC.md) · [Medición](docs/TOKEN_OPTIMIZATION.md)

## Contribuir

Ejecutá `npm test`, describí procedencia y límites de cualquier benchmark, y evitá afirmar mejoras basadas sólo en caracteres o bytes. El CI ejecuta pruebas y guarda el benchmark sintético como artefacto en cada push/PR. Las propuestas de raíces necesitan definición semántica, evaluación de tokens y versión; un ID publicado no cambia de significado. Licencia MIT.

---

# English

VELIQ researches a compositional artificial language and an optional protocol for exchanging meaning between AI agents. The current **0.1 alpha** is a runnable, local prototype. Users continue to interact in natural language; internal VELIQ representations are used only where explicitly enabled.

> **C3 language improvement:** 800 supported synthetic instructions use **37.45%** (`cl100k_base`) and **35.14%** (`o200k_base`) fewer plain-text tokens than the best tested natural baseline, including concise wording and shared-ID headings, with one shared glossary. C3 has real CLI/MCP parsers and VSR round-trip checks. Model comprehension and cost are not measured.

**The 30–40% normal-harness target remains unproven.** The mixed proxy adds 200 exact code/tool/document excerpts and shows a smaller aggregate gain. A glossary per independent call eliminates the measured advantage; shared context does not mean the provider bills it once. Installing MCP does not automatically optimize every model request. See the committed mixed report and [daily-use plan](docs/DAILY_USE.md).

**Measured savings for a bounded task:** exact-ID retrieval from a shared 100-record document over 100 queries uses **96.03% fewer plain-text input tokens** under `cl100k_base` for Spanish, including a one-time storage call and each textual tool call. Equivalent conventional retrieval is **0.42% cheaper**. The benefit comes from selecting relevant context, not from proving that the VELIQ language itself saves model tokens. [Method and limitations](docs/BENCHMARKS.md).

## What works

- Versioned ASCII dictionary and formal/C1/C2/C3 parsers, typed VSR subset, explicit prohibition scope and local referent binding; eight controlled instruction families in English/Spanish and one in eight additional languages.
- Local SQLite memory, content hashes, version conflicts, and two in-process peers with reference recovery.
- Observe runtime, guarded Hybrid proposal, CLI, interactive TUI, and local Studio backed by SQLite.
- External benchmark schema, per-case aggregator, authenticated opt-in HTTP ingestion, SDK client, and automated tests.
- Project-local automatic Observe hook installers for OpenCode/Codex/Claude Code. They preserve operational outputs, add no model context, record private metadata only, and report zero savings. Codex hooks require review and trust.

**Not implemented:** free-form natural-language translation, runtime provider token usage, actual model cost measurement, remote authenticated agent transport, transparent deep interception, or A2A. Offline research uses official `tiktoken` Python encodings for exact *text* counts. Local MCP tools work and OpenCode connectivity was verified. See [progress](PROGRESS.md) and [roadmap](docs/ROADMAP.md).

## Install and run

Node.js **24+** is required. Run `npm ci` to install the official MCP SDK and its locked dependencies; no model API keys are needed.

```bash
git clone https://github.com/ValentinCabral/veliq.git
cd veliq
npm ci
npm run check
node --experimental-strip-types apps/cli/main.ts init
npm run demo
npm run tui
npm run dashboard
```

Open `http://127.0.0.1:4173` for Studio. Set `VELIQ_PORT` or `VELIQ_HOME` to change the port or local data location. The TUI needs an interactive terminal. You may run `npm link` if you want a global `veliq` executable; this is optional and never done automatically.

### CLI examples

```bash
node --experimental-strip-types apps/cli/main.ts doctor
node --experimental-strip-types apps/cli/main.ts encode 'Analiza el error "1" y no elimines los archivos originales.'
node --experimental-strip-types apps/cli/main.ts encode --lang en --compact 'Analyze error "1" and do not delete the original files.'
node --experimental-strip-types apps/cli/main.ts encode --lang en --c3 'Analyze error "case-001", fix it, and verify tests "case-001".'
node --experimental-strip-types apps/cli/main.ts decode --c3 'case-001 sen error nar error sel tests'
node --experimental-strip-types apps/cli/main.ts decode --compact 'sen@error:1;pro{del@archivos:originales}'
node --experimental-strip-types apps/cli/main.ts decode 'pro(del(ri("archivos:originales")))'
node --experimental-strip-types apps/cli/main.ts bench list
```

The demo creates VSR from a supported Spanish template, produces VELIQ, counts local bytes, exchanges a reference between two in-process peers, recovers it, preserves the no-delete prohibition, and records data displayed in Studio. It does **not** call an LLM or prove remote interoperability.

`--lang` supports `es`, `en`, `pt`, `fr`, `de`, `it`, `nl`, `zh`, `ja`, and `ko` for this one controlled instruction. C1 is experimental; `pro{...}` explicitly scopes the prohibition. Its support must be negotiated before use between agents.

### Multilingual token benchmark

```bash
python3 -m venv .venv-research
.venv-research/bin/pip install -r research/benchmarks/requirements.txt
.venv-research/bin/python research/benchmarks/multilingual.py > multilingual-result.json
cmp multilingual-result.json research/benchmarks/results-2026-09-29.json
.venv-research/bin/python research/benchmarks/selective.py > selective-result.json
cmp selective-result.json research/benchmarks/selective-results-2026-09-29.json
.venv-research/bin/python research/benchmarks/harness.py > harness-result.json
cmp harness-result.json research/benchmarks/harness-results-2026-09-29.json
```

The committed [measurement and full methodology](docs/BENCHMARKS.md) compare original, formal VELIQ, C1, and VSR with `cl100k_base` and `o200k_base`, including glossary amortization scenarios. These are exact plain-text encoding counts only. Results contradict any claim of universal savings over all languages; English and Chinese are observed regressions. Model understanding, full request overhead, accuracy, cost, and different model families remain unmeasured.

## Connect to AI harnesses

VELIQ now serves eleven real tools through the official MCP SDK over stdio. OpenCode 1.18.33 reported the project installation as connected. From your OpenCode project:

```bash
node /ABSOLUTE/PATH/veliq/apps/cli/main.ts install opencode
opencode mcp list
```

Run `uninstall opencode` to remove the VELIQ entry while preserving the rest of the configuration and a private backup. See [harness recipes](docs/HARNESSES.md) for Codex and Claude Code commands, approval and verification steps. `npm run mcp` starts the server for other MCP clients. These are callable tools, not an automatic interceptor of every model request.

## Run a comparable external evaluation

1. Use one fixed dataset for the original/baseline and candidate paths.
2. Fix model, version, settings, tools, and evaluation criteria. Capture input, output, translation/instruction overhead, retries, correctness, and critical violations for each case.
3. Write one JSON object per case following [`case-results.jsonl`](examples/case-results.jsonl). The provided numbers are illustrative, not measurements.
4. Aggregate the results and hash the dataset with `scripts/aggregate-benchmark.mjs` as shown below. Label the count type accurately: `provider-reported`, `exact-text`, `estimated`, or `local-bytes`.
5. Import locally or opt in to authenticated upload. Review the result in `bench list`, the TUI, or Studio. An imported run is self-reported and not independently verified.

```bash
VELIQ_RUN_ID='trial-001' VELIQ_HARNESS='opencode' VELIQ_HARNESS_VERSION='1' \
VELIQ_MODEL='model-id' VELIQ_MODEL_VERSION='version-id' VELIQ_DATASET='dataset-001' \
VELIQ_COUNT_KIND='provider-reported' \
node --experimental-strip-types scripts/aggregate-benchmark.mjs results.jsonl dataset.jsonl run.json
node --experimental-strip-types apps/cli/main.ts bench import run.json
```

To allow a harness to upload automatically, launch Studio with `VELIQ_INGEST_TOKEN` (at least 16 characters; use a random 32-character token), then set `VELIQ_BENCHMARK_URL=http://127.0.0.1:4173/api/benchmarks` and the same token before running `node scripts/upload-benchmark.mjs run.json`. The gateway binds to loopback; remote use requires an explicitly deployed HTTPS reverse proxy. The SDK's `submitBenchmark` supports programmatic integration. No credentials should be committed.

[Full evaluation contract](docs/EXTERNAL_BENCHMARKS.md) · [Harness recipes](docs/HARNESSES.md) · [Architecture](ARCHITECTURE.md) · [Security](docs/SECURITY.md)

## Contributions and license

Run `npm test`, identify the provenance and measurement class of any result, and preserve negative findings. CI runs tests and uploads a **synthetic byte benchmark** artifact on each push/PR. MIT license.
