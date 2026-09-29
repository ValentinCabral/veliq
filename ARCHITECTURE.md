# Arquitectura

`packages/language` contiene diccionario/parser; `semantic` valida VSR; `codec` contabiliza y elige con fallback; `protocol` negocia y transporta envelopes en memoria; `memory` persiste hashes y recuerdos SQLite; `runtime` registra observaciones; `apps/cli`, `gateway`, `studio` exponen funciones locales; `adapters` separa integraciones. El demo implementa dos peers en proceso, sin red. El hash del envelope detecta corrupción accidental, no autentica al emisor.

`original` conserva la frase de entrada para auditar la transformación. `observe` nunca sustituye el texto operativo. `hybrid` requiere VSR, coincidencia exacta de fuente, round-trip y menor conteo más overhead; aun así no se conecta automáticamente a solicitudes de modelos. No hay comprensión general de español.

El adaptador MCP está basado en el SDK oficial y expone herramientas sobre stdio. OpenCode/Codex/Claude Code pueden invocar el mismo servidor; ello no intercepta automáticamente sus contextos privados. La base SQLite se selecciona con `VELIQ_HOME` y las operaciones de memoria exigen ámbito explícito.

C3 es una representación superficial nueva sobre el mismo VSR, no un cambio de IDs: liga sufijos dentro de una oración y utiliza composición prefija por aridad. Los parsers C1/C2/C3 y el formal permanecen independientes del proveedor. La optimización incluye costo de glosario, coincidencia del original y round-trip; el MCP devuelve una propuesta, no la envía a ningún modelo.

Los hooks diarios se separan del motor: un receptor stdin Codex/Claude y un plugin OpenCode registran sólo metadatos privados mediante `packages/metrics/observations.mjs`. No dependen de SQLite en el runtime Bun del plugin, no agregan instrucciones ni transforman resultados; errores de logging son no bloqueantes. CLI/TUI/Studio leen el resumen del proyecto actual. Reemplazo automático, procesamiento de uso del proveedor y prueba de comprensión siguen pendientes; ver `docs/DAILY_USE.md`.
