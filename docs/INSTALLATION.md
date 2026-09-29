# Instalación

Requiere Node 24+. `git clone`, `npm ci`, `npm run check`. `npm run mcp` inicia servidor stdio; no usar su stdout para logs. `npm run tui`, `npm run dashboard` y `npm run demo` cubren las interfaces locales. CLI directo: `node --experimental-strip-types apps/cli/main.ts COMANDO`. `init`, `doctor`, `status`, `encode`, `decode`, `benchmark`, `bench import/list`, `mcp`, `tui`, `dashboard`, `install/uninstall opencode` están disponibles. No se instalan paquetes globalmente.

Para OpenCode, desde el proyecto destino: `node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts install opencode`, después `opencode mcp list`. Se crea respaldo en `.veliq/backups/`; `uninstall opencode` revierte sólo su entrada. No modifica `opencode.jsonc`. Codex y Claude Code usan el mismo servidor MCP stdio mediante sus comandos oficiales, detallados en `docs/HARNESSES.md`.
