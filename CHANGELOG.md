# Historial

## 0.1.0-alpha.1 · 2026-09-29

Primer subconjunto formal, parser, SQLite local, protocolo entre peers en proceso, CLI, Studio, benchmark sintético y hook OpenCode V1 Observe aislado. Se corrigió una doble negación semántica antes de entregar el prototipo. No hay evidencia de ahorro neto de tokens comerciales.

## 0.1.0-alpha.2 · 2026-09-29

TUI local, contrato de benchmarks externos, SDK de envío opt-in, ingesta HTTP autenticada, registros inmutables y visualización en Studio. Las corridas externas se etiquetan como autodeclaradas; no existe todavía un runner OpenCode completo.

## 0.1.0-alpha.3 · 2026-09-29

Servidor MCP stdio con SDK oficial y ocho herramientas reales; cliente MCP y OpenCode 1.18.33 verificaron conexión. Instalador OpenCode reversible, documentación de Codex y Claude Code, typecheck estricto.

## 0.1.0-alpha.4 · 2026-09-29

Se incorporó el perfil C1 con parser, alcance explícito y round-trip; diez variantes controladas de una instrucción natural; benchmark offline reproducible de 1.000 casos con `tiktoken` (`cl100k_base` y `o200k_base`), invocable desde CLI o MCP. Studio presenta el reporte medido y acepta las plantillas por idioma. CI compara la regeneración con el JSON versionado. C1 tiene regresiones observadas en inglés y chino; su selección operativa permanece cerrada salvo negociación explícita. No se ejecutaron tareas con modelos externos.

## 0.1.0-alpha.5 · 2026-09-29

Recuperación exacta de registros con ámbito, restricciones globales, versiones y hash; herramienta MCP `veliq.pick` que sólo muestra al modelo lo necesario. Benchmark en diez idiomas con carga inicial y llamadas contabilizadas, comparado con recuperación convencional. El ahorro supera 95 % frente a reenviar documentos completos en el escenario sintético, pero la alternativa convencional resulta ligeramente más barata. Contador `tiktoken` opcional en `veliq.optimize`. Se corrigió el fallback que cobraba glosarios descartados: el benchmark de bytes ahora registra 0 % neto, no −30,35 %. No hay prueba de costo ni calidad de LLM.
