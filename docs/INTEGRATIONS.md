# Integraciones 0.1 alpha.3

El servidor MCP stdio (`adapters/mcp/server.ts`) utiliza el SDK oficial `@modelcontextprotocol/sdk` 1.31.0 y Zod para validar ocho herramientas: `veliq.capabilities`, `veliq.encode`, `veliq.decode`, `veliq.validate`, `veliq.optimize`, `veliq.memory.store`, `veliq.memory.retrieve`, `veliq.benchmark`. `npm run mcp` lo ejecuta localmente. Se probó con un cliente MCP en memoria y un subproceso stdio real, incluyendo memoria aislada.

OpenCode 1.18.33: `install opencode` agrega el servidor al `opencode.json` del proyecto, crea respaldo privado, conserva otras entradas y `uninstall opencode` elimina sólo VELIQ. Se verificó `opencode mcp list` con estado conectado. El hook V1 `observe.mjs` sigue siendo experimental y no se instala con MCP; no hay interceptación profunda automática.

Claude Code 2.1.284: registro MCP de proyecto probado; salud quedó `Pending approval` y no se verificó una sesión de modelo. Codex 0.159.0: entrada VELIQ reconocida como `enabled` mediante overrides temporales, sin modificar configuración global; la interoperabilidad del servidor se probó con el cliente oficial MCP. No se ejecutó una sesión de modelo Codex. Las recetas se encuentran en `docs/HARNESSES.md`. A2A no implementado. Ninguna integración accede a razonamiento privado.

Documentación consultada: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports , https://opencode.ai/docs/mcp-servers/ , https://developers.openai.com/codex/mcp , https://code.claude.com/docs/en/mcp .
