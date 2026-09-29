# Integraciones

OpenCode V1 publica plugins `.opencode/plugins` y `tool.execute.after`; V2 usa `ctx.tool.hook("execute.after")`, con migración específica. `adapters/opencode/observe.mjs` implementa el hook V1 y sólo cuenta bytes del resultado, sin modificar `output`; prueba aislada con evento equivalente. No se dispone de OpenCode instalado para verificar carga y ciclo de vida real, por lo que no se instala ni anuncia soporte V2. Copia/instalación automáticas quedan deshabilitadas hasta verificar versión y permisos. Referencias oficiales: https://opencode.ai/docs/plugins/ y https://opencode.ai/v2/docs/build/plugins/migrate-v1 .

Codex, Claude Code, MCP y A2A: únicamente directorios de extensión e interfaz SDK, sin adaptadores operativos. MCP oficial permite herramientas stdio, pero no se añadió una implementación sin el SDK verificable. Ninguna integración intercepta razonamiento privado.

La ingesta de benchmarks para cualquier harness se realiza mediante un SDK HTTP opt-in y un formato versionado; ver `docs/EXTERNAL_BENCHMARKS.md`. No confundir una corrida importada con una medición verificada. La TUI se implementa sobre Node readline, sin framework de terceros.
