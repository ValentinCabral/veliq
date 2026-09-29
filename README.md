# VELIQ · prototipo de investigación 0.1 alpha

Idioma composicional ASCII, AST semántico versionado, protocolo de referencia y herramientas locales para investigar comunicación entre agentes. **El experimento actual no demuestra ahorro de tokens de LLM ni comprensión por modelos externos.**

## Ejecutar

Requiere Node.js 24 o posterior, con `node:sqlite` y strip de TypeScript. No requiere instalar dependencias, claves ni acceso a red.

```bash
npm test
npm run benchmark
npm run demo
node --experimental-strip-types apps/cli/main.ts init
node --experimental-strip-types apps/cli/main.ts encode 'Analiza el error "1" y no elimines los archivos originales.'
node --experimental-strip-types apps/cli/main.ts dashboard
```

Abrir `http://127.0.0.1:4173`. Cambiar puerto con `VELIQ_PORT`. Datos persistidos en `.veliq/`; cambiar con `VELIQ_HOME`. El servidor escucha sólo en loopback y nunca solicita claves.

## Estado

Parser, AST, subconjunto de traducción, memoria SQLite, protocolo local con hash y recuperación, CLI, Studio local y prueba sintética funcionan. La integración OpenCode V1 Observe tiene prueba del hook aislada; **falta la prueba con OpenCode instalado** y no se activa automáticamente. No hay servidor MCP, A2A operativo, tokenizador oficial de modelo comercial, traducción libre, React ni medición de costo real. Ver [PROGRESS.md](PROGRESS.md) y [ROADMAP.md](docs/ROADMAP.md).

## Demostración

`npm run demo` construye VSR desde una plantilla en español, produce VELIQ, registra el conteo de bytes, negocia capacidades de dos agentes locales, recupera una referencia SHA-256 faltante, conserva la restricción `pro(del(...))`, devuelve el texto original en español y registra la operación en SQLite. `npm run dashboard` muestra los registros. El receptor recupera contenido local verificable; no es una respuesta generada por un LLM.

Licencia MIT. Las variantes de raíces requieren evaluación experimental antes de modificarse.

## Terminal y evaluaciones externas

`npm run tui` abre un menú interactivo local para explorar VELIQ, métricas, recuerdos y corridas recibidas. Requiere una terminal real. Los harnesses externos pueden importar corridas con `veliq bench import` o subirlas a un endpoint local con token configurado; ver [contrato de benchmarks](docs/EXTERNAL_BENCHMARKS.md). Los registros externos son autodeclarados, no resultados certificados por VELIQ.
