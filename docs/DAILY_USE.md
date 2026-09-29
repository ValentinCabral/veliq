# VELIQ en el trabajo diario / Daily use

## Lo disponible y lo que todavía no ocurre

Instalar un servidor MCP sólo ofrece herramientas: el modelo puede no invocarlas y sus esquemas también ocupan contexto. **No activa ahorro automático.** Los nuevos observadores se ejecutan automáticamente después de herramientas accesibles, tras instalación, reinicio y confianza del harness. No hacen llamadas LLM, no agregan contexto ni cambian permisos/resultados. Su ahorro es honestamente **cero**; permiten verificar actividad sin capturar conversaciones o secretos.

| Harness | Instalador actual | Activación diaria | Optimización transparente |
|---|---|---|---|
| OpenCode V1 | `install opencode` MCP + `install opencode-observe` plugin | Plugin local en una sesión nueva; verificación opcional con smoke test | No habilitada; requiere comprobar hooks/contexto, modelo y costo |
| Codex local | Registro MCP oficial + `install codex-observe` | Revisar `/hooks`, confiar en definición y proyecto; políticas pueden desactivarlo | No habilitada; `updatedMCPToolOutput` no está soportado en la documentación consultada |
| Claude Code | Registro MCP oficial + `install claude-observe` | Revisar `/hooks`, configuración local y aprobación MCP | No habilitada; `updatedToolOutput` existe en versiones actuales, falta verificación empírica |
| OpenCode V2 | MCP según versión; adaptador nativo pendiente | V1 y V2 no comparten el mismo contrato de hooks | No implementada |
| Otros | MCP stdio y SDK de benchmarks | Depende de extensibilidad real del harness | No existe compatibilidad universal afirmada |

No se instala nada global, no se alteran las aprobaciones y no se inicia un daemon obligatorio. El clone de VELIQ debe permanecer en la ruta original porque los comandos e imports instalados la referencian. Los instaladores conservan ajustes ajenos, respaldan y rechazan desinstalar una entrada modificada. Ver comandos exactos en [HARNESSES.md](HARNESSES.md).

`status`, TUI y Studio muestran observaciones desde `.veliq/observations.jsonl` en **el proyecto actual**. Por defecto sólo se registra fecha, harness, herramienta y bytes (máximo 10 MB por archivo). No se guardan cuerpos, argumentos, rutas ni IDs de sesión. No son tokens del proveedor. Alcanzado el límite se dejan de registrar eventos; un fallo de logging no altera el resultado de una herramienta. La captura opcional de OpenCode es otra función sensible, desactivada por defecto.

## Objetivo de producto: una instalación, sin recordatorios manuales

El objetivo sigue siendo una capa local por harness con una experiencia única: instalar, revisar la autorización necesaria y trabajar normalmente. Las optimizaciones deben operar sobre mensajes expuestos, preservar idioma natural del usuario y mostrar **consumo neto real**, no sólo longitud del texto.

Prioridades siguientes (planificadas, no implementadas):

1. **Runner de sesiones reales pareadas.** Mismas tareas/repositorios y condiciones con/sin VELIQ; contar solicitud completa, esquemas MCP, glosarios, salida, traducciones, reintentos y cache. Comparar con la compacción/recuperación nativa del harness, no con una baseline artificialmente costosa. Cada tarea necesita tests/veredicto externo, no autoevaluación del mismo modelo.
2. **Compilación lingüística donde hay significado verificable.** Usar C3 para instrucciones estructuradas y comunicación entre agentes compatibles. Extender VSR con propiedades, cantidades, temporalidad/evidencia y opacos, sólo cuando se puedan probar. No traducir prosa arbitraria por regex ni suponer comprensión universal. Evaluar por familia/tokenizador; desactivar perfiles que pierdan frente al natural fuerte.
3. **Contexto incremental y deduplicación tipada.** Recuperar artefactos relevantes y referenciar resultados repetidos sólo cuando la fuente sea resoluble y el receptor la conozca. Nunca deduplicar instrucciones cuya repetición denote otra ejecución, ni eliminar restricciones. El costo de llamadas adicionales puede anular el ahorro.
4. **Política Hybrid automática verificada.** Activar únicamente estrategias con round-trip, restricciones duras, evidencia de fidelidad de tarea, soporte del hook concreto y beneficio neto. Modelo/versión desconocidos vuelven al original. Circuit breaker, auditoría y un comando de desactivación deben acompañar cada estrategia.

La meta del 30–40 % es para ese sistema completo en categorías representativas, **no una promesa de que toda frase o sesión pueda reducirse así**. Ninguna representación finita puede hacer más cortas todas las entradas posibles preservando información exacta. Los resultados C3 actuales constituyen evidencia acotada del idioma; no habilitan la política de producción.

## Fuentes verificadas el 2026-09-29

- OpenCode V1: https://opencode.ai/docs/plugins/ y https://opencode.ai/docs/sdk/
- OpenCode V2: https://opencode.ai/v2/docs/build/plugins/migrate-v1
- Codex hooks/trust: https://learn.chatgpt.com/docs/hooks
- Claude Code hooks/reemplazo de salida: https://code.claude.com/docs/en/hooks

## English

MCP installation does not automatically reduce token use. Project-local Observe hooks run after exposed tools once the harness loads/trusts them. They produce no model-visible context, never rewrite outputs, record only private local metadata, and claim **zero savings**. Live model sessions and provider usage are still required to validate production optimization. Codex hook trust and Claude approvals are not bypassed; V1/V2 OpenCode need separate adapters.

The target is install-once daily use with paired-session evaluation, C3 compilation only for verified semantics, typed incremental context/reference recovery, and automatic Hybrid policies proven safe and cheaper under full accounting. These next steps are planned, not implemented. Do not extrapolate the controlled text-token benchmark to normal harness workloads or every human language.
