# Arquitectura

`packages/language` contiene diccionario/parser; `semantic` valida VSR; `codec` contabiliza y elige con fallback; `protocol` negocia y transporta envelopes en memoria; `memory` persiste hashes y recuerdos SQLite; `runtime` registra observaciones; `apps/cli`, `gateway`, `studio` exponen funciones locales; `adapters` separa integraciones. El demo implementa dos peers en proceso, sin red. El hash del envelope detecta corrupción accidental, no autentica al emisor.

`original` conserva la frase de entrada para auditar la transformación. `observe` nunca sustituye el texto operativo. `hybrid` requiere VSR, coincidencia exacta de fuente, round-trip y menor conteo más overhead; aun así no se conecta automáticamente a solicitudes de modelos. No hay comprensión general de español.

El adaptador MCP está basado en el SDK oficial y expone herramientas sobre stdio. OpenCode/Codex/Claude Code pueden invocar el mismo servidor; ello no intercepta automáticamente sus contextos privados. La base SQLite se selecciona con `VELIQ_HOME` y las operaciones de memoria exigen ámbito explícito.
