# VELIQ

**Español** · [English](#english)

VELIQ investiga un idioma artificial composicional y un protocolo opcional para intercambiar significado entre agentes de IA. La versión actual es un **prototipo 0.1 alpha**, ejecutable sin cuentas ni claves. La interfaz del usuario sigue en lenguaje natural; VELIQ se usa sólo en los caminos internos que se habiliten explícitamente.

> **Resultado actual:** el benchmark sintético de 1.000 casos selecciona 0 alternativas VELIQ bajo un contador de bytes UTF-8 con overhead. No existe aún evidencia de ahorro de tokens o costos de modelos comerciales. Las corridas externas importadas son autodeclaradas.

## Estado de implementación

| Componente | Disponible hoy | Límite |
|---|---|---|
| Idioma | Diccionario 0.1 con IDs estables, parser ASCII, gramática EBNF, literales escapados, negación y prohibición con alcance explícito | La traducción desde español acepta sólo una plantilla; no entiende lenguaje libre |
| VSR y codec | AST versionado, validación, round-trip formal, fallback, contador exacto de bytes y estimador separado | No hay tokenizador oficial de LLM ni garantías para traducción natural arbitraria |
| Memoria | SQLite local, ámbitos aislados, referencias por SHA-256, versiones y detección de conflictos | Datos locales en texto plano; sin embeddings |
| Protocolo | Negociación y recuperación de referencias entre dos peers en proceso | Sin transporte remoto autenticado ni MCP operativo |
| Runtime | Observe sin cambios de mensajes; Hybrid acotado con controles | No intercepta solicitudes de modelo automáticamente |
| Interfaces | CLI, TUI y Studio local con datos persistidos | Studio es HTML ligero; configuración avanzada pendiente |
| Harnesses | Hook aislado OpenCode V1 Observe y SDK/endpoint para reportes de cualquier harness | Falta prueba de carga en OpenCode instalado y adaptadores automáticos específicos |
| Investigación | Suite automática, 1.000 casos sintéticos, agregación externa por caso, CI | Falta corpus diverso y evaluación funcional con modelos reales |

[Estado detallado](PROGRESS.md) · [Arquitectura](ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md)

## Requisitos e instalación

- Node.js **24 o superior**. Se usan `node:sqlite` y soporte nativo de TypeScript; no se descargan paquetes para ejecutar el núcleo.
- Clonar este repositorio y trabajar desde la raíz. Las configuraciones y bases se crean en `.veliq/`, ignorada por Git.

```bash
git clone https://github.com/ValentinCabral/veliq.git
cd veliq
npm test
node --experimental-strip-types apps/cli/main.ts init
```

Para usar el comando corto `veliq` se puede instalar el enlace local con `npm link` de forma voluntaria. Todos los ejemplos funcionan sin instalación global usando `node --experimental-strip-types apps/cli/main.ts`.

## Uso cotidiano

```bash
node --experimental-strip-types apps/cli/main.ts doctor
node --experimental-strip-types apps/cli/main.ts status
node --experimental-strip-types apps/cli/main.ts encode 'Analiza el error "1" y no elimines los archivos originales.'
node --experimental-strip-types apps/cli/main.ts decode 'pro(del(ri("archivos:originales")))'
npm run tui
npm run dashboard
```

Abrí `http://127.0.0.1:4173` para Studio. `VELIQ_PORT` cambia el puerto y `VELIQ_HOME` la ruta de datos. La TUI necesita una terminal interactiva y muestra mediciones, memoria, idioma y corridas externas. `encode` con frases fuera de la plantilla conocida falla explícitamente; `decode` fuera de la traducción conocida muestra un diagnóstico formal, sin inventar español.

## Demostración de dos agentes

```bash
npm run demo
```

La demo toma una instrucción en español, construye VSR y VELIQ, mide bytes, negocia capacidades de dos peers locales, recupera una referencia SHA-256, preserva `pro(del(...))`, devuelve el texto español original y registra datos que aparecen en Studio. Es una prueba determinista del protocolo local; **no involucra un LLM ni demuestra interoperabilidad remota**.

## Probar y comparar

```bash
npm test
npm run benchmark
```

El benchmark incorporado es sintético y usa una sola plantilla. Para resultados externos, ejecutá el **mismo corpus** con baseline y candidata, modelo/configuración comparables y parámetros controlados. Registrá por cada caso tokens de entrada, salida, overhead (incluidas traducciones/instrucciones auxiliares), reintentos, veredicto funcional y violaciones críticas. Conservá el conteo como `provider-reported`, `exact-text`, `estimated` o `local-bytes` según su origen; no mezcles unidades.

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
- `veliq install opencode` informa la falta de verificación de versión, sin modificar configuraciones. Codex, Claude Code, MCP y A2A todavía no tienen adaptadores operativos.

[Seguridad](docs/SECURITY.md) · [Especificación del idioma](docs/language/LANGUAGE_SPEC.md) · [Protocolo](docs/PROTOCOL_SPEC.md) · [Medición](docs/TOKEN_OPTIMIZATION.md)

## Contribuir

Ejecutá `npm test`, describí procedencia y límites de cualquier benchmark, y evitá afirmar mejoras basadas sólo en caracteres o bytes. El CI ejecuta pruebas y guarda el benchmark sintético como artefacto en cada push/PR. Las propuestas de raíces necesitan definición semántica, evaluación de tokens y versión; un ID publicado no cambia de significado. Licencia MIT.

---

# English

VELIQ researches a compositional artificial language and an optional protocol for exchanging meaning between AI agents. The current **0.1 alpha** is a runnable, local prototype. Users continue to interact in natural language; internal VELIQ representations are used only where explicitly enabled.

> **Measured so far:** the 1,000-case synthetic benchmark selects 0 VELIQ alternatives when UTF-8 byte overhead is included. This is **not** evidence about commercial LLM tokens, quality, or cost. Imported external runs are labeled self-reported.

## What works

- Versioned ASCII dictionary and parser, formal grammar, typed VSR subset, explicit prohibition scope, round-trip validation, and fail-closed Spanish template.
- Local SQLite memory, content hashes, version conflicts, and two in-process peers with reference recovery.
- Observe runtime, guarded Hybrid proposal, CLI, interactive TUI, and local Studio backed by SQLite.
- External benchmark schema, per-case aggregator, authenticated opt-in HTTP ingestion, SDK client, and automated tests.

**Not implemented:** free-form natural-language translation, provider-specific tokenizers, actual model cost measurement, remote authenticated agent transport, an operational MCP server, and verified deep OpenCode/Codex/Claude Code adapters. See [progress](PROGRESS.md) and [roadmap](docs/ROADMAP.md).

## Install and run

Node.js **24+** is required. No npm dependencies or API keys are needed for the local core.

```bash
git clone https://github.com/ValentinCabral/veliq.git
cd veliq
npm test
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
node --experimental-strip-types apps/cli/main.ts decode 'pro(del(ri("archivos:originales")))'
node --experimental-strip-types apps/cli/main.ts bench list
```

The demo creates VSR from a supported Spanish template, produces VELIQ, counts local bytes, exchanges a reference between two in-process peers, recovers it, preserves the no-delete prohibition, and records data displayed in Studio. It does **not** call an LLM or prove remote interoperability.

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
