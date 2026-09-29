# Benchmarks de harnesses externos · contrato 0.1

VELIQ recibe resultados agregados de OpenCode, Claude Code, Codex u otro harness mediante un contrato independiente del proveedor. El harness **debe ejecutar sus propias pruebas comparables**, capturar métricas y entregar una corrida. La ingesta no ejecuta modelos ni verifica la fidelidad del reporte. Cada fila se marca `self-reported` y es inmutable por `run_id`.

## Formato

Ver `examples/external-benchmark.json`. `dataset_digest` es `sha256:<64 hex>` del corpus empleado. `count_kind`: `provider-reported` cuando el proveedor informó consumo; `exact-text` para un tokenizador exacto de texto; `estimated` para una estimación; `local-bytes` para el perfil de prueba VELIQ. Baseline y candidata declaran `input`, `output`, `overhead`, `retries` con enteros no negativos. Los conteos deben **incluir todos los reintentos y llamadas auxiliares**, mientras `retries` documenta su número. No se suman categorías de conteo diferentes.

La precisión de tarea es opcional (`correct_baseline`, `correct_candidate`), y `critical_violations` hace visible cualquier regresión. Si faltan mediciones de corrección, la corrida no se considera comparable aunque exista una diferencia de conteos. El endpoint valida forma y límites, no certifica los resultados. No incluir prompts, rutas privadas ni secretos en `notes`.

## Importación local

```bash
node --experimental-strip-types apps/cli/main.ts bench import corrida.json
node --experimental-strip-types apps/cli/main.ts bench list
npm run tui
```

## Carga automática opt-in

En el equipo que aloja VELIQ:

```bash
VELIQ_INGEST_TOKEN='una-clave-aleatoria-de-32-caracteres' npm run dashboard
```

En el harness, tras completar sus pruebas y crear `corrida.json`:

```bash
VELIQ_BENCHMARK_URL='http://127.0.0.1:4173/api/benchmarks' \
VELIQ_INGEST_TOKEN='una-clave-aleatoria-de-32-caracteres' \
node scripts/upload-benchmark.mjs corrida.json
```

Para otra máquina, usar HTTPS detrás de un proxy autenticado; el gateway de VELIQ sólo escucha en loopback. El script rechaza HTTP externo y redirecciones. El token no se guarda en el repositorio y el endpoint está desactivado si la variable no se configura. Un cliente propio puede usar `packages/adapter-sdk/benchmark-client.ts` y `submitBenchmark(run, endpoint, token)` después de cada corrida; recibe rechazo explícito si falla. El ejemplo JSON es **ficticio**, sólo ilustra el esquema.

## OpenCode

Un runner de evaluación sobre OpenCode puede usar su SDK o CLI oficial para producir dos recorridos controlados y llamar al cliente de VELIQ al terminarlos. El hook V1 actual sólo observa bytes de resultados de herramientas; **no genera benchmarks de comparación ni mide tokens del proveedor**. Hace falta verificar en una instalación concreta qué campos de uso expone cada versión de OpenCode antes de construir un runner automático específico. Referencia: https://opencode.ai/docs/sdk/ y https://opencode.ai/docs/cli/ .

## Agregación reproducible por caso

`scripts/aggregate-benchmark.mjs` recibe `resultados.jsonl`, el archivo real del corpus y un nombre nuevo de salida. Cada registro tiene `case_id`, `baseline` y `candidate`, con `input`, `output`, `overhead`, `retries`, `correct` y `critical_violation`. No acepta IDs duplicados ni veredictos ausentes. Calcula `dataset_digest` desde los bytes del corpus; nunca lo toma de un texto escrito a mano. El archivo de salida no sobrescribe uno existente. Las variables `VELIQ_RUN_ID`, `VELIQ_HARNESS`, `VELIQ_HARNESS_VERSION`, `VELIQ_MODEL`, `VELIQ_MODEL_VERSION`, `VELIQ_DATASET` y `VELIQ_COUNT_KIND` son obligatorias. Ver comandos completos en el README y guías en `docs/HARNESSES.md`.
