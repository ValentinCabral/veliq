# Benchmark inicial

`npm run benchmark` genera determinísticamente 1.000 ejemplos sintéticos de **una sola plantilla**, con identificadores distintos. No es corpus diverso. Métricas: conteo UTF-8, overhead declarado, selección y porcentaje neto. Resultado observado en este entorno: 0/1.000 alternativas aceptadas, promedio -30,35% contra texto original al cargar overhead, 1.000 casos negativos. El porcentaje mide bytes, no tokens de LLM ni dinero. No se ha medido fidelidad en modelos ni validez de respuestas; el resultado negativo desactiva la optimización automática de esta categoría.
