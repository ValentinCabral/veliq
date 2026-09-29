# Benchmark inicial

`npm run benchmark` genera determinísticamente 1.000 ejemplos sintéticos de **una sola plantilla**, con identificadores distintos. No es corpus diverso. Métricas: conteo UTF-8, overhead declarado, selección y porcentaje neto. Resultado: 0/1.000 alternativas aceptadas; ahorro neto 0 %, porque el fallback conserva el original y **no cobra un glosario que no se envía**. El resultado anterior de −30,35 % era un error de contabilidad y se corrigió. El porcentaje mide bytes, no tokens de LLM ni dinero. No se ha medido fidelidad en modelos ni validez de respuestas.

La workflow `.github/workflows/verify.yml` ejecuta pruebas y adjunta `benchmark-synthetic.json` en cada push/PR. Este artefacto es reproducible y no se importa como una corrida externa verificada.

## Comparación multilingüe de tokens de texto

El script `research/benchmarks/multilingual.py` genera 1.000 casos (100 IDs × 10 traducciones controladas de **la misma instrucción**), verifica el round-trip VSR/C1 y cuenta texto con `tiktoken 0.12.0` y `cl100k_base`/`o200k_base`. La salida fija se conserva en `research/benchmarks/results-2026-09-29.json`, con SHA-256 del corpus, conteos por idioma y costos de glosario. CI regenera y compara byte a byte el reporte.

```bash
python3 -m venv .venv-research
.venv-research/bin/pip install -r research/benchmarks/requirements.txt
.venv-research/bin/python research/benchmarks/multilingual.py > resultado.json
cmp resultado.json research/benchmarks/results-2026-09-29.json
```

El conteo exacto es **sólo de cadenas de texto** según esas dos tokenizaciones; no mide llamadas, tokens de salida, razonamiento, precio, latencia ni si algún modelo comprende VELIQ. El glosario C1 se cuenta por separado: una vez por grupo de 100 mensajes es un escenario hipotético de sesión compartida; cada solicitud independiente debe pagarlo nuevamente. Una ruta de producción necesitaría comprobar negociación, fidelidad de tarea y costo real antes de seleccionar C1. Los 1.000 casos comparten la misma plantilla y no prueban generalización.

| Tokenización | Inglés C1 bruto / 1 glosario | Español C1 bruto / 1 glosario | Japonés C1 bruto / 1 glosario | Chino C1 bruto / 1 glosario |
|---|---:|---:|---:|---:|
| cl100k_base | −18,75 % / −22,88 % | 0 % / −3,47 % | +34,48 % / +32,21 % | −26,67 % / −31,07 % |
| o200k_base | −20 % / −24,33 % | −5,88 % / −9,71 % | +18,18 % / +15,23 % | −38,46 % / −43,46 % |

Signo positivo indica **menos tokens de entrada**; negativo indica regresión. Para la tabla completa de 10 idiomas, consultar el JSON versionado. Es imposible demostrar una ventaja sobre *todos* los idiomas conocidos con este corpus; los contraejemplos observados ya descartan esa afirmación para esta versión. La mejora de C1 sobre el perfil formal no demuestra beneficio frente a una alternativa convencional ni mejora de precisión del modelo.

El campo `sessionHybridStrategy` elige la menor cuenta de texto para **una sesión hipotética de 100 instrucciones controladas**, pagando una vez el glosario si elige VELIQ y conservando el original en caso contrario. Por ejemplo, bajo `cl100k_base`, japonés elige C1 y reduce 32,21 % del texto de entrada; inglés y chino eligen original y ahorran 0 %. Sigue pendiente comprobar que un modelo comprenda C1 y mantenga la precisión.

## Recuperación selectiva: ahorro medido en una tarea exacta

`research/benchmarks/selective.py` genera diez documentos sintéticos, uno por idioma, con 100 registros y dos restricciones globales cada uno. Ejecuta 100 consultas exactas por documento mediante el almacén SQLite en memoria, comprueba que el cuerpo, ID, restricciones y SHA-256 se conservaron, y compara los tokens de texto que recibiría un modelo al reenviar el documento completo frente a `veliq.pick`. **Incluye en la candidata una carga inicial del documento y la representación textual de cada llamada a herramienta.** No incluye otros campos del protocolo del proveedor, sus respuestas, razonamiento ni la ejecución de un LLM.

```bash
.venv-research/bin/python research/benchmarks/selective.py > seleccion.json
cmp seleccion.json research/benchmarks/selective-results-2026-09-29.json
```

| Encoding | Español, documento completo | VELIQ selectivo, carga y llamadas incluidas | Reducción de tokens de texto | Diferencia frente a búsqueda convencional |
|---|---:|---:|---:|---:|
| cl100k_base | 618.300 | 24.575 | 96,03 % | −0,42 % |
| o200k_base | 607.300 | 23.375 | 96,15 % | −0,45 % |

Los 20 resultados de diez idiomas están en `research/benchmarks/selective-results-2026-09-29.json`; todos superan 95 % en **este escenario repetitivo concreto**, con punto de equilibrio tras dos consultas. Una búsqueda convencional por ID consigue prácticamente el mismo ahorro y es ligeramente más barata: **la ventaja es de la recuperación selectiva, no del idioma VELIQ**. La comparación con el documento completo representa sistemas que reenvían todo el contexto por consulta; no se extrapola a sistemas que ya recuperan fragmentos. VELIQ aporta aquí validación de esquema, aislamiento por ámbito, versiones, hashes y preservación de restricciones, con un pequeño costo textual adicional.

## Aproximación de carga de un harness: C2 y C3

`research/benchmarks/harness.py` construye un corpus mixto de **800 instrucciones sintéticas controladas** (ocho familias × 50 IDs × español/inglés) y **200 fragmentos exactos** de código/documentación de este repositorio público. Los fragmentos etiquetados `tool-result` son un proxy de documentos leídos por herramientas, no resultados observados en un harness. No son trazas de OpenCode ni una distribución representativa de producción. Las siete familias nuevas cubren corrección/verificación, transferencia con destino, orden temporal, condición, prohibición, secuencia y persistencia. C2/C3 tienen parsers propios y cada caso admitido se compara por ID semántico con VSR. Código y fragmentos exactos se conservan sin transformación.

La línea de base convencional elige por caso el menor conteo de: texto original, redacción natural concisa y redacción natural con un encabezado que comparte el ID (`ID "case-001": analyze and fix error; verify tests.`). Las tres variantes soportadas tienen VSR idéntico. Esto evita atribuir toda la mejora a no repetir un ID, algo que también permite el lenguaje natural. Los 50 IDs por familia **no equivalen a 50 tareas independientes**; no se declara significancia estadística ni cobertura general.

```bash
.venv-research/bin/python research/benchmarks/harness.py > harness.json
cmp harness.json research/benchmarks/harness-results-2026-09-29.json
# Opt-in: JSONL propio con text, category y language; no se guarda su contenido en el reporte.
.venv-research/bin/python research/benchmarks/harness.py mis-trazas.jsonl > mi-reporte.json
```

Resultados estables del subconjunto de **800 instrucciones**:

| Conteo de texto | Original | Mejor natural probado | C2 + un glosario | C3 + un glosario | C3 vs original | C3 vs mejor natural |
|---|---:|---:|---:|---:|---:|---:|
| cl100k_base | 13.450 | 11.150 | 10.994 | 6.974 | 48,15 % | 37,45 % |
| o200k_base | 12.900 | 10.600 | 10.494 | 6.875 | 46,71 % | 35,14 % |

C3 introduce ligaduras locales de referentes y gramática por aridad sin cambiar IDs o significado. El resultado agregado de los 1.000 casos se publica en `research/benchmarks/harness-results-2026-09-29.json`: es menor porque los fragmentos exactos permanecen intactos. **Ese agregado cambia cuando cambian los archivos de este repositorio usados como corpus**, por lo que siempre se compara con el SHA-256 versionado y CI regenera el mismo estado. Los campos `byCategory`, `byLanguage` y `previousConciseTextTokens` permiten auditar cada comparación y distinguir el baseline anterior del fortalecido.

Estos números son **sólo tokens de cadenas**, con selección retrospectiva de la opción más corta (cota optimista), no costos totales de un modelo. C3 paga 174/175 tokens de glosario una vez en el escenario compartido. Con glosario por llamada, **C2 y C3 obtienen 0 % incremental** porque se preserva el baseline mediante fallback. Una API de chat puede cobrar el glosario conservado en historial en todas las solicitudes: retener contexto no equivale a facturarlo una sola vez. No se midieron comprensión, precisión de tarea, tokens de salida ni consumo reportado por proveedores. La meta de 30–40 % en uso normal **no está lograda**. Un corpus propio puede incluir `agent-instruction`, `code`, `tool-result` y `document`; las frases no reconocidas quedan intactas, sin inferir equivalencia. Ningún dato se envía fuera del proceso local. La captura de resultados de herramientas de OpenCode es opcional y potencialmente sensible: revisar/redactar antes de analizar o compartir.

## Sesiones pareadas alpha.7

`packages/metrics/paired.ts` y `bench paired` ejecutan OpenCode/Claude reales cuando el usuario configura proveedor y habilita `--allow-external`. Candidato Research aislado, baseline Observe; archivos y prompt idénticos, sesiones nuevas, orden alternado, JSON oracle y archivos protegidos. Uso de todos los eventos expuestos, cache/reasoning sin doble conteo; overhead enviado ya incluido en input/output; latencia completa. Reintentos internos no expuestos desconocidos. Falta un proveedor autenticado en este entorno: no se presentan datos sintéticos como resultados LLM. [Manifest, criterios de gate y envío](NATIVE.md).

El nuevo [smoke OpenCode nativo](../research/experiments/opencode-native-smoke-2026-09-29.json) usa el binario real 1.18.33 y un endpoint loopback determinista. Verifica ancla/referencia en la solicitud y archivo intacto; 6.812 → 3.471 tokens o200k de resultados de herramientas, 3.341 evitados. No cuenta solicitud completa ni evalúa comprensión/modelo. Este resultado de integración está separado de benchmarks lingüísticos y de sesiones con proveedor.
