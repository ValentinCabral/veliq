# Integración automática y evaluación pareada / Native daily use

Alpha.7 implementa plugins sobre interfaces expuestas, contexto incremental y un runner de sesiones reales pareadas. El idioma C3 conserva su módulo independiente: se compila sólo desde VSR que corresponde al cuerpo exacto y retiene origen/restricciones. No se envía automáticamente a un modelo sin comprensión comprobada. Las mejoras de recuperación no se presentan como pruebas de superioridad lingüística universal.

## Instalar y configurar

Requiere Node 24, `npm ci` en el clone y Python con `tiktoken==0.12.0` para conteos locales. Activá el venv al iniciar el harness. Prepará la caché de encodings antes de operar sin red: su primera carga puede descargar el archivo oficial. Desde el proyecto donde trabajás:

```bash
node /RUTA/veliq/apps/cli/main.ts install opencode
node /RUTA/veliq/apps/cli/main.ts native configure /RUTA/veliq/examples/native-config.json
opencode
node /RUTA/veliq/apps/cli/main.ts status
node /RUTA/veliq/apps/cli/main.ts dashboard
```

`install opencode` ahora instala MCP y `.opencode/plugins/veliq-native.js`. No requiere recordatorios al modelo. El ejemplo comienza en Observe: no altera mensajes. Copialo y elegí tu ID real `provider/model`, encoding, herramientas permitidas y estrategia. No identificar un encoding proxy como tokenizador exacto de un proveedor. El clone debe permanecer en su ruta, porque los imports son absolutos. No se instala un daemon ni paquetes globales.

- OpenCode V1 **1.18.33**: `experimental.chat.messages.transform` transforma únicamente resultados completados de herramientas de lectura admitidas. Usuario, sistema, inputs, permisos y herramientas con attachments/contexto compactado quedan intactos. V2 necesita otro plugin y permanece pendiente.
- `context-reference`: conserva el primer resultado exacto y sustituye duplicados por una referencia al call ID anterior dentro de la misma solicitud. Herramienta, input y salida deben ser idénticos. Si desaparece el ancla, se conserva la salida completa. No evita ejecuciones ni deduplica instrucciones.
- `json-whitespace`: sólo espacios JSON fuera de strings. Conserva claves duplicadas, escapes, lexemas numéricos, orden y literales exactos. No resume código/prosa. Aplicación únicamente en herramientas declaradas; menor longitud no basta: se cuentan ambas alternativas.
- Claude: `install claude` configura SessionStart, PostModelSwitch y PostToolUse. Revisar `/hooks` y confianza. El modelo se toma de eventos reales de inicio/cambio, no de un campo inexistente en PostToolUse. Si no está disponible, fallback. Sólo sustituye `Bash.stdout` JSON con stderr vacío, sin interrupción ni imagen, manteniendo los demás campos. No transforma subagentes de modelo desconocido. Fallbacks transitorios pueden no exponerse: no extrapolar evidencia a esos recorridos. Encodings OpenAI no cuentan exactamente tokens Anthropic. Contrato probado con stdin sintético; sesión Claude autenticada pendiente.
- Codex: `install codex` configura Observe; registrar MCP con [HARNESSES.md](HARNESSES.md). Requiere confianza en `/hooks`. Su hook actual no soporta sustitución normal `updatedMCPToolOutput`: no se usa bloqueo como compresión ni se amplían permisos. **No hay optimizador automático de sus herramientas internas**; memoria/idioma se ofrecen mediante MCP/SDK.

`uninstall opencode`, `uninstall opencode-native`, `uninstall opencode-mcp`, `uninstall claude` eliminan sólo entradas propias intactas; respaldos privados en `.veliq/backups/`. No sobrescribir configuraciones JSONC ni entradas ajenas. Un error de conteo/auditoría, modelo desconocido o gate faltante vuelve al original.

## Ejecutar sesiones reales y activar Hybrid

Necesitás el harness instalado y un proveedor previamente configurado por vos. VELIQ no busca credenciales ni configura pagos. `--allow-external` es obligatorio: la acción puede enviar las fixtures al proveedor y consumir cuota. El corpus generado es público y sintético; reemplazar por tareas representativas autorizadas para evaluar utilidad diaria.

```bash
# Desde el clone: crea cinco casos públicos, sin llamar modelos.
node scripts/create-paired-fixtures.mjs /tmp/veliq-paired.json TU_PROVEEDOR/TU_MODELO
node apps/cli/main.ts bench paired /tmp/veliq-paired.json \
  --allow-external --output /tmp/veliq-paired-report.json

# Desde el proyecto diario, sólo si el resultado es habilitable:
node /RUTA/veliq/apps/cli/main.ts native approve /tmp/veliq-paired-report.json
node /RUTA/veliq/apps/cli/main.ts native configure /RUTA/config-hybrid.json
```

El último JSON conserva modelo/encoding/estrategia y cambia `mode` a `hybrid`. Aprobar evidencia no cambia el modo. Volver a `observe` con `native configure` desactiva transformaciones. Los gates son archivos explícitamente aprobados por el usuario local, no certificados de evaluación independiente.

Manifest: `version`, `dataset`, `harness`, `executable`, `model`, `encoding`, una `strategy`, `repetitions`, `timeoutMs`, `cases`. Cada caso exige `id`, `prompt`, `files` (rutas relativas sin escapes), `expectedJson` exacto y `protectedFiles` cuyo contenido debe permanecer idéntico. `providerConfig` opcional configura OpenCode en un workspace temporal; no incluir claves en archivos versionados. Para Claude cambiar harness a `claude-code`, executable a `claude`, ID canónico del modelo, estrategia `json-whitespace` y tareas que soliciten JSON por Bash. No se fuerza una herramienta: si el modelo no la utiliza, queda `hook-not-applied`. Codex rechaza este experimento nativo por falta de candidato de reemplazo compatible.

Se ejecutan baseline Observe y candidato Research en workspaces/sesiones nuevos, con archivos idénticos y orden alternado. No se alteran sandboxes ni aprobaciones. OpenCode usa `run --format json --title` para evitar generación auxiliar del título. Claude usa `-p --output-format json`. Configuración del proveedor ya autorizada es gestionada por el harness; el runner no lee archivos de credenciales. Research sólo actúa en el workspace temporal marcado por el runner.

Contabilidad: todos los eventos expuestos se suman. Codex cached input es subconjunto del input; reasoning no informado permanece desconocido. Claude suma input sin cache + cache read + cache creation + output. OpenCode V1 suma input, output, reasoning y cache read/write disjuntos ([fuente fijada](https://github.com/anomalyco/opencode/blob/v1.18.33/packages/opencode/src/session/session.ts)). Instrucciones/esquemas/glosarios ya enviados están dentro del input y no se suman otra vez. No hay traducciones LLM ni reintentos VELIQ; reintentos internos no expuestos quedan desconocidos. Latencia mide el proceso completo. `total_cost_usd` y costos OpenCode son estimaciones del cliente, no facturas.

Para aprobar: cinco pares como mínimo, todas las respuestas correctas, archivos protegidos intactos, estrategia/hook aplicado en cada candidata, consumo expuesto completo, ninguna regresión de tokens por caso y reducción agregada. Error, timeout, rechazo de permiso, falta de uso en un step o regresión bloquean el gate. Cinco pares son un control de humo, no significancia estadística ni garantía diaria del 30–40 %. Revalidar versiones/modelos; precios distintos de cache y consumo interno desconocido pueden cambiar el ahorro monetario.

## Enviar benchmarks desde CI

Tras terminar la corrida, este comando transmite sólo agregados, sin prompts, respuestas, eventos brutos ni credenciales:

```bash
VELIQ_BENCHMARK_URL=https://TU_ENDPOINT/api/benchmarks \
VELIQ_INGEST_TOKEN=TOKEN_EN_VARIABLE_DE_ENTORNO \
node --experimental-strip-types /RUTA/veliq/scripts/submit-paired.ts /tmp/veliq-paired-report.json
```

Encadenarlo después de `bench paired` en tu runner/CI activa el envío automático explícito. Sin URL/token/acción no hay envío. Studio escucha únicamente en loopback; un colector remoto requiere HTTPS e infraestructura propia configurada. No se publicó un servidor público. El cliente rechaza redirecciones/HTTP remoto. La ingesta etiqueta los informes como autodeclarados. [Contrato](EXTERNAL_BENCHMARKS.md).

## Memoria y contexto incremental

`packages/memory/context.ts` implementa snapshots con ámbito exacto, revisión, hash, procedencia, autoridad, tags, restricciones y VSR opcional correspondiente al cuerpo. Cambiar autoridad requiere nuevo ID; no se eleva mediante compresión. `selectContext` conserva todas las instrucciones/constraints, marca las vencidas y elige otros registros por búsqueda textual determinista. Si las restricciones no caben, falla sin omitirlas. No resume ni exige embeddings.

`prepareContext` envía FULL hasta conocer un digest histórico compatible; después usa DELTA con upserts/eliminaciones si ocupa menos bytes. `applyContext` valida ámbito autorizado, orden, base e integridad final, detecta duplicados y devuelve ACK. Base faltante requiere FULL. Versiones wire y locales son separadas. Hashes no autentican al emisor: API local confiable, transporte remoto autenticado pendiente. Un ACK de proceso no implica que el LLM recuerde datos: materializar la selección en cada solicitud.

```bash
node examples/context-demo.ts
node apps/cli/main.ts context put entrada.json
node apps/cli/main.ts context select consulta.json
node apps/cli/main.ts context sync sync.json
node apps/cli/main.ts context apply paquete.json
```

`put`: `{input:{id,scope,records},expectedVersion}`. `select`: `{id,scope,query,maxBytes?}`. `sync`: `{id,scope,receiverDigest?}`. `apply`: `{packet,authorizedScope}`. MCP expone `veliq.context.store/select/sync/apply` con esquemas por `tools/list`. La demo verificó FULL de 7.512 bytes → DELTA de 569 bytes e igualdad de snapshots, preservando la prohibición. Son bytes de transporte, no tokens de un LLM.

## Verificación disponible

- TypeScript estricto y 52 pruebas, incluyendo 1.000 expresiones C3 y 1.000 variantes JSON.
- OpenCode **1.18.33**, binario real, plugin nativo y endpoint **local determinista**: dos lecturas, un ancla exacta y una referencia recibidas en la solicitud. Archivo intacto, salida española. `o200k_base`: 6.812 → 3.471 tokens del contexto de herramientas, referencia incluida, 3.341 evitados. No son tokens de una solicitud completa ni prueba de comprensión LLM.
- Reproducir: `node scripts/check-opencode-native.mjs /ruta/opencode-1.18.33`; el harness puede resolver su SDK oficial al inicializar. [Resultado versionado](../research/experiments/opencode-native-smoke-2026-09-29.json). Se conserva el smoke negativo previo de `session.shell`: la nueva prueba recorre llamadas de herramientas reales.
- No se ejecutaron sesiones con proveedor autenticado en este entorno. Ahorro monetario desconocido = `null`. La meta de uso diario y la ventaja sobre todos los idiomas no están demostradas.

## English

Alpha.7 adds an automatic OpenCode V1 context plugin, a Claude schema-preserving PostToolUse adapter, typed FULL/DELTA/ACK context and a paired harness runner. Install from your daily project; Observe is default. Configure your model/encoding/tools, execute `bench paired MANIFEST --allow-external --output REPORT` with your configured provider, explicitly approve passing evidence and switch to Hybrid. Codex remains Observe/MCP because normal output replacement is unsupported; OpenCode V2 is pending.

Generate five public tasks with `scripts/create-paired-fixtures.mjs`. Run paired sessions with fresh workspaces, alternating order, exact JSON verdicts and protected-file checks. The runner sums exposed input/output/cache/reasoning without double counting and blocks activation on incomplete usage, task regressions, missing hooks or increased tokens. Five pairs are a smoke gate, not statistical evidence. Revalidate versions. `scripts/submit-paired.ts` sends aggregates from CI only with explicitly configured URL/token; reports are self-reported.

The real OpenCode binary delivered an exact anchor and duplicate reference to a deterministic loopback endpoint, avoiding 3,341 encoded tool-context text tokens. It verifies hook plumbing, not LLM understanding, full-session savings or provider cost. Claude authenticated sessions and representative daily evaluations remain necessary. C3 stays separate and is compiled only from matching verified semantics.
