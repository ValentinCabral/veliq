# VELIQ MCP 0.1 · contrato implementado

Servidor local stdio basado en `@modelcontextprotocol/sdk` 1.31.0, Zod y Node 24. Arranque: `npm run mcp` o `node --experimental-strip-types apps/cli/main.ts mcp`. Sólo usa stdout para mensajes MCP; datos en `.veliq/veliq.sqlite` (o `VELIQ_HOME`). No envía datos a servicios externos.

| Herramienta | Entrada | Resultado |
|---|---|---|
| `veliq.capabilities` | sin argumentos | capacidades y límites reales |
| `veliq.encode` | `text`, `format=spanish|veliq` | texto VELIQ, VSR y diagnóstico |
| `veliq.decode` | `text`, `format=veliq|vsr` | español sólo si existe plantilla original verificable; diagnóstico formal |
| `veliq.validate` | `text`, `knownReferences?` | sintaxis, tipos y referencias explícitas |
| `veliq.optimize` | `text`, `mode=observe|hybrid` | estrategia, salida, bytes y fallback; no modifica automáticamente el prompt de un harness |
| `veliq.memory.store` | `id`, `scope`, `kind`, `body`, `provenance`, `expectedVersion?` | ID, versión y hash |
| `veliq.memory.retrieve` | `scope`, `query?`, `limit?` | recuerdos del ámbito exacto y contenido original verificado por hash |
| `veliq.benchmark` | `action=synthetic|list|ingest`, `run?` | benchmark sintético o corridas externas autodeclaradas |

`scope` exige las cinco claves `user`, `workspace`, `project`, `session` y `agent`. Los esquemas de entrada se validan mediante Zod. Los errores de ejecución se devuelven con `isError: true`; no se ejecutan comandos enviados por el modelo. La memoria queda en texto plano local: no guardar secretos. `benchmark.ingest` requiere una corrida explícita y la etiqueta como autodeclarada. Los contadores son bytes UTF-8 locales, no tokens de un proveedor.

Se probó con cliente SDK dentro del proceso y con cliente oficial arrancando un subproceso stdio, incluyendo `initialize`, `tools/list`, `tools/call`, aislamiento de memoria y Observe. OpenCode 1.18.33 cargó el servidor desde `opencode.json` y reportó `connected`. Claude Code 2.1.284 registró el servidor pero quedó pendiente aprobación interactiva. Codex 0.159.0 fue detectado, sin modificar su configuración. Estas pruebas no demuestran reducción de tokens ni acceso a mensajes ocultos.

Especificación de transporte: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports . Guías: `docs/HARNESSES.md`.
