# Guías por harness / Harness recipes

## Regla común / Common rule

VELIQ no intercepta razonamiento privado ni asume que cualquier harness comparta una memoria. Para medir ahorro real, ejecutá el mismo corpus en dos brazos: **baseline original** y **candidata VELIQ**, con modelo/versión/parámetros/herramientas comparables. Guardá un resultado por caso, incluyendo llamadas auxiliares, reintentos, salida, corrección y violaciones críticas. El archivo `examples/case-results.jsonl` ilustra el esquema; sus cifras son ficticias. Usá el agregador y el cliente de envío descritos en el [README](../README.md#probar-y-comparar).

VELIQ does not intercept private reasoning or assume shared memory across harnesses. Run the same dataset in baseline and candidate arms under comparable settings. Include auxiliary calls, retries, output, task correctness, and critical violations. See the [English README](../README.md#run-a-comparable-external-evaluation).

## OpenCode

**Hoy / Today:** el adaptador `adapters/opencode/observe.mjs` implementa el hook V1 `tool.execute.after` y guarda solamente tamaños en bytes de resultados de herramientas en `.veliq/opencode-observe.sqlite`. Fue probado con eventos equivalentes, **no con un binario OpenCode instalado**. No informa tokens del proveedor ni cambia mensajes. OpenCode V2 usa otra API; no instalar este archivo en V2.

1. Verificá `opencode --version` y la [documentación oficial de plugins V1](https://opencode.ai/docs/plugins/) o [V2](https://opencode.ai/v2/docs/build/plugins/migrate-v1). La prueba de carga del adaptador en la versión instalada sigue pendiente.
2. Para un ensayo funcional, usá un runner propio sobre el [SDK oficial](https://opencode.ai/docs/sdk/) o la [CLI](https://opencode.ai/docs/cli/) y ejecutá cada caso en ambos brazos. Capturá uso reportado por el proveedor si la versión realmente lo expone; si no, etiquetá el conteo como estimado.
3. Emití `resultados.jsonl` con un registro por caso. Ejecutá `aggregate-benchmark.mjs` con `VELIQ_HARNESS=opencode`, importá el resultado o enviá con `upload-benchmark.mjs`.
4. No inferir ahorro a partir de la base `tool_observations`: almacena bytes de herramientas, no costo total.

**English:** use OpenCode's official SDK or CLI to execute paired cases and produce per-case JSONL; aggregate and submit using the commands in README. The included V1 hook is an isolated Observe experiment, not a verified current-version integration or a token counter.

## Codex

**Hoy / Today:** no hay hook verificado que intercepte todas las solicitudes a modelos Codex; tampoco hay servidor MCP VELIQ operativo en esta alpha. La [documentación oficial de Codex MCP](https://developers.openai.com/codex/mcp) describe cómo conectar herramientas, pero configurar MCP no equivale a interceptar mensajes ocultos.

1. Construí un runner autorizado con la interfaz pública que realmente exponga la versión de Codex instalada. Registrá sólo métricas que esa interfaz entregue.
2. Corré baseline/candidata sobre el mismo corpus. Incluí los reintentos y la preparación de contexto dentro de cada total.
3. Emití JSONL por caso, agregá con `VELIQ_HARNESS=codex` y usá importación local o el endpoint opt-in.

**English:** use a documented public Codex interface for paired trials. Do not claim access to hidden prompts or reasoning. Aggregate per-case results with `VELIQ_HARNESS=codex`; imported results remain self-reported.

## Claude Code

**Hoy / Today:** los [hooks oficiales](https://code.claude.com/docs/en/hooks) exponen eventos como `PostToolUse` y `SessionEnd`, pero VELIQ todavía no instala uno ni extrae automáticamente consumo completo del proveedor. Un hook de herramienta no mide por sí mismo el costo de la sesión.

1. Ejecutá casos baseline/candidata con las herramientas públicas de Claude Code que tengas disponibles y medí consumo reportado si está expuesto.
2. Escribí el JSONL por caso; agregá con `VELIQ_HARNESS=claude-code`.
3. Importá o enviá la corrida únicamente después de revisar los resultados y habilitar explícitamente el destino.

**English:** Claude Code hooks expose selected lifecycle/tool events, not a universal verified VELIQ interception layer. Use a controlled external runner, create case JSONL, aggregate, and explicitly submit.

## LangGraph u otro harness / Custom harness

Integrá `packages/adapter-sdk/benchmark-client.ts` y su función `submitBenchmark(run, endpoint, token)` en el cierre de tu suite. El cliente valida el esquema, exige HTTPS o loopback y rechaza redirecciones. No accede a prompts. Alternativamente, generá `corrida.json` y ejecutá `scripts/upload-benchmark.mjs` al terminar el job. Para un CI sin acceso a tu Studio local, adjuntá el JSON como artefacto y luego importalo manualmente; VELIQ no crea un servidor público por defecto.

Integrate `submitBenchmark` after your controlled test suite finishes. If CI cannot reach your local Studio, store the run JSON as a build artifact and import it locally later. Do not expose the local gateway publicly without a secured HTTPS deployment.

## Interpretación / Interpretation

Un porcentaje negativo o una violación crítica es un resultado válido. `provider-reported` es distinto de `exact-text`, `estimated` y `local-bytes`. La importación valida forma e integridad local del registro, **no certifica** que el experimento se haya realizado. Conservá corpus, versiones y criterios de corrección para reproducirlo.

A negative result or critical violation is useful evidence. Keep counts separated by measurement class and preserve the dataset, versions, and correctness criteria for reproducibility.
