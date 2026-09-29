# Instalación

Requiere Node 24+. `git clone`, `npm ci`, `npm run check`. `npm run mcp` inicia servidor stdio; no usar su stdout para logs. `npm run tui`, `npm run dashboard` y `npm run demo` cubren las interfaces locales. CLI directo: `node --experimental-strip-types apps/cli/main.ts COMANDO`. `init`, `doctor`, `status`, `encode`, `decode`, `benchmark`, `bench import/list`, `mcp`, `tui`, `dashboard`, `install/uninstall opencode` están disponibles. No se instalan paquetes globalmente.

Para OpenCode, desde el proyecto destino: `node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts install opencode`, después `opencode mcp list`. Se crea respaldo en `.veliq/backups/`; `uninstall opencode` revierte sólo su entrada. No modifica `opencode.jsonc`. Codex y Claude Code usan el mismo servidor MCP stdio mediante sus comandos oficiales, detallados en `docs/HARNESSES.md`.

## Alpha.7: instalación nativa

`install opencode` ahora incluye MCP y plugin de contexto; `install opencode-mcp` conserva sólo MCP; `install opencode-native` instala sólo plugin. `install claude` configura hooks nativos; `install codex` instala Observe. Default Observe. Python/tiktoken opcional se exige para propuestas nativas. CLI `context put/select/sync/apply`, `native configure/approve/status`, `bench paired MANIFEST --allow-external --output REPORT` están implementados. [Guía detallada español/inglés](NATIVE.md). No se ejecuta proveedor externo al instalar; no habilitar Hybrid sin evaluación.
