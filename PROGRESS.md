# PROGRESS · 2026-09-29

## Avance alpha.7 · las tres mejoras

- Plugin OpenCode V1 automático sobre contexto expuesto: referencia sólo a resultados idénticos con ancla exacta en la misma solicitud; JSON lexical con allowlist. Observe inicial, Hybrid con evidencia y conteo favorable, fallback/auditoría privada. Inputs/prompts/permisos intactos.
- `install opencode` = MCP + plugin; `opencode-mcp/native` separados; hooks Claude SessionStart/PostModelSwitch/PostToolUse con seguimiento real del modelo y esquema conservado. Codex conserva Observe por bloqueo de su API. V2 pendiente; Claude autenticado no probado.
- Contexto tipado persistente, selección con instrucciones/restricciones obligatorias, vigencia anotada, FULL/DELTA/ACK con ámbito/base/orden/digest verificados. C3 sólo desde VSR correspondiente al cuerpo y autoridad. CLI/SDK y cuatro herramientas MCP nuevas (quince total).
- `bench paired` ejecuta sesiones nuevas idénticas, orden alternado, oracle JSON, archivos protegidos, uso expuesto cache/reasoning sin duplicar y latencia completa. Gate explícito bloquea errores, uso ausente, regresiones y hook no aplicado. Envío de agregados desde CI opt-in; sin cuerpos/credenciales en reportes. Consumo interno no expuesto desconocido.
- Smoke **positivo**: OpenCode 1.18.33 real + endpoint local determinista; dos lecturas, un ancla y una referencia recibidas, archivo intacto, respuesta española. `o200k_base`: 6.812 → 3.471 tokens del contexto de herramientas; 3.341 evitados. No es sesión LLM ni ahorro de solicitud completa. Smoke `session.shell` negativo anterior conservado.
- Demo incremental: FULL 7.512 bytes → DELTA 569; snapshots idénticos y prohibición conservada. Bytes entre procesos, no tokens de LLM.
- TypeScript estricto y **52 pruebas pasan**; 1.000 AST C3 y 1.000 JSON dentro de la suite. Reportes offline se regeneran al final y CI los compara.
- **Pendiente real:** proveedor autenticado no configurado aquí; falta evaluación LLM, comprensión C3, corpus representativo, estadísticas y precios/cache. Ahorro cotidiano 30–40 % no demostrado. No se habilitó Hybrid en el equipo del usuario ni se publicaron servicios/paquetes.
- Guía español/inglés `docs/NATIVE.md`: instalación diaria, pruebas, activación, envío y límites. El cuadro siguiente es histórico alpha.6; este avance lo actualiza.


| Componente | Estado verificable | Pendiente |
|---|---|---|
| Lenguaje/gramática | Parser formal/C1/C2/C3, ligaduras locales, aridad y round-trip; ocho familias es/en, una en otros ocho idiomas | Cobertura general, comprensión por modelos, propuestas de raíces |
| VSR | AST, aridad, IDs, procedencia, hash semántico | Tipos profundos, temporalidad y epistemología completas |
| Codec | Bytes exactos, estimador separado, `tiktoken` opcional, selección experimental con glosarios y fallback | Solicitudes completas y costos reportados por proveedor |
| Protocolo | 2 peers en proceso, negociación y recuperación hash | Transporte externo, auth, ACK durables |
| Memoria | SQLite, aislamiento exacto, versiones y conflicto | Cifrado, expiración, búsqueda semántica |
| Runtime/CLI | Observe, Hybrid propuesto, CLI/TUI, instalación reversible de MCP y hooks por proyecto | Native seguro entre modelos y reducción automática verificada |
| Studio | HTML local con endpoints y métricas persistidas | React, configuración completa, gráficos e integraciones |
| OpenCode | MCP 1.18.33 conectado previamente; instalación V1 local y shell smoke con salida preservada, sin evento de hook | Verificar hook en sesión con modelo; V2 |
| MCP/Codex/Claude/A2A | MCP stdio con once herramientas y prueba de cliente real; Claude registra pendiente de aprobación | Sesiones de modelo Codex/Claude, A2A |
| Benchmark | Texto multilingüe, selección exacta, proxy mixto C2/C3 y baseline natural fuerte; resultados positivos acotados y negativos conservados | Corpus representativo, veredictos funcionales y métricas LLM |

## Avance alpha.6 · mejora lingüística C3 y uso diario

- C2 amplía composición con transferencia y relaciones binarias. C3 agrega ligaduras locales y aridad prefija; reduce referentes repetidos sin omitir el orden, alcance, destinos o IDs. VSR sigue siendo canónico; ningún ID conceptual cambia de significado.
- Parsers/serializadores, CLI `--c2/--c3`, MCP `surface/format=c3`, Studio, negociación declarativa del optimizador y fallback implementados. Fuera del subconjunto se conserva el original/formal. `setupPaid` es declaración del llamador, no pago probado ni comprensión negociada.
- Benchmark mixto con 800 instrucciones es/en y 200 fragmentos públicos exactos. El baseline natural se fortaleció con encabezados de ID: C3 usa 6.974/6.875 tokens frente a 11.150/10.600, **37,45 % / 35,14 %** menos con un glosario compartido (`cl100k_base` / `o200k_base`). C2 apenas mejora frente a ese baseline. Agregado mixto menor, versionado por SHA del corpus. Con glosario por llamada, ventaja incremental **0 %** por fallback. No son sesiones reales ni costo de modelos.
- 1.000 expresiones estructurales generadas con semilla fija preservan hash semántico y forma canónica. Pruebas específicas cubren prohibiciones anidadas, referentes absolutos, destinos, selección, glosario y CLI/MCP. No prueban comprensión LLM.
- Instaladores de hooks Observe para Codex/Claude por proyecto, con respaldo, recibos y eliminación sólo de entradas propias sin modificar. Receptor stdin real con stdout vacío, metadatos privados, aislamiento y fallos no bloqueantes. Codex requiere revisión/confianza; no se eluden aprobaciones. Sesiones reales de esos harnesses pendientes.
- OpenCode observer elimina dependencia de `node:sqlite` en Bun. Captura de cuerpos local sólo opt-in, acotada y privada. `status`, TUI y Studio leen observaciones del proyecto actual sin inventar ahorro. Observe siempre reporta 0.
- Smoke externo sobre OpenCode **1.18.33**, instalado temporalmente: servidor local y `session.shell` ejecutan un comando sintético conservando la salida; **no se recibió un evento del hook**. Registrado como verificación fallida de entrega, no como integración completa. `scripts/check-opencode.mjs` reproduce el chequeo sin LLM/credenciales.
- Documentación oficial consultada: hooks actuales Codex, Claude y OpenCode V1/V2. MCP no es un interceptor. Plan de producto diario en `docs/DAILY_USE.md`: runner pareado, compilación donde hay significado probado, contexto incremental tipado y política Hybrid con evidencia de beneficio completo.
- Pendiente crítico: ejecutar sesiones pareadas autenticadas sobre repositorios/tareas representativos, comprobar comprensión C3 y restricciones, incluir esquemas/glosarios repetidos, salidas/reintentos/cache y comparar con optimización nativa. **No afirmar “instalar = ahorrar 30–40 %” ni ventaja sobre todos los idiomas.**
- Validación local alpha.6: TypeScript estricto y **41 pruebas pasan**; benchmark de bytes conserva 0/1.000 selecciones y 0 % neto en Observe/fallback. Los tres reportes de texto se regeneran y comparan con sus archivos versionados antes de publicar; el smoke OpenCode negativo se conserva aparte, no se mezcla con un benchmark de modelo.

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
