# VELIQ en el trabajo diario / Daily use

Alpha.7 implementa plugins nativos automáticos, contexto incremental recuperable y un runner pareado. La [guía completa](NATIVE.md) explica instalación, activación, pruebas y envío de benchmarks en español/inglés.

| Harness | Instalación | Optimización y alcance |
|---|---|---|
| OpenCode V1 | `install opencode` MCP + plugin nativo | Referencias a lecturas repetidas dentro del mismo contexto; JSON con allowlist. Hook comprobado en 1.18.33 con endpoint local determinista. |
| Claude Code | `install claude` | JSON de Bash y seguimiento del modelo; contrato probado con eventos stdin. Falta sesión autenticada. |
| Codex | `install codex` Observe + MCP oficial | Memoria/idioma por herramientas; no permite reemplazo automático normal de resultados internos. Requiere confianza. |
| OpenCode V2 | MCP según versión | Plugin nativo pendiente; API distinta. |
| Otros | MCP/SDK | Compatibilidad según interfaces realmente expuestas. |

Instalar comienza en Observe. Para transformar: configurar modelo/encoding, evaluar sesiones con proveedor configurado, aprobar evidencia habilitable y elegir Hybrid. Modelo desconocido, gate ausente, falta de ancla, conteo no favorable o auditoría fallida conservan el original. No se envían datos externos por instalar.

`status`, TUI y Studio leen métricas del proyecto actual. Tokens locales de texto y consumo del harness son categorías distintas. Auditoría privada sin cuerpos/argumentos por defecto. No se alteran permisos, prompts ni inputs; contenido externo conserva autoridad de datos.

La meta 30–40 % cotidiano permanece sin demostrar. El nuevo smoke OpenCode evitó 3.341 tokens de texto al referenciar una lectura idéntica, conservando el ancla y el archivo; usó un endpoint determinista, no un LLM. Los resultados C3 siguen separados de recuperación/deduplicación. [Evidencia y límites](NATIVE.md).

**English:** native installation, incremental context and paired evaluation are implemented. Start in Observe, evaluate with an explicitly configured provider, approve passing evidence and switch to Hybrid. OpenCode V1 hook plumbing is verified; Claude live sessions and Codex native replacement remain limitations. The daily 30–40% target is unproven.
