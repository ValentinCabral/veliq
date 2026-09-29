# Instalación local

Node 24+, clonar, `npm test`, `npm run demo`, `npm run dashboard`. No hay `npm install` requerido ni paquetes globales. CLI directo: `node --experimental-strip-types apps/cli/main.ts ...`; `npm link` es opcional y no se realiza automáticamente. `veliq init` crea `.veliq/config.json` y SQLite. `doctor`, `status`, `encode`, `decode`, `benchmark`, `dashboard` disponibles. `install/uninstall opencode` informa el bloqueo en lugar de modificar configuraciones del usuario. Para detener el dashboard: Ctrl+C. Para borrar la base local, eliminar `.veliq` manualmente tras respaldo.

`npm run tui` abre la interfaz interactiva. `node --experimental-strip-types apps/cli/main.ts bench import archivo.json` ingresa una corrida, y `bench list` la consulta. La recepción HTTP exige `VELIQ_INGEST_TOKEN`; no se inicia ningún proceso residente salvo al ejecutar `dashboard`.
