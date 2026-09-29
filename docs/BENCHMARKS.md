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
