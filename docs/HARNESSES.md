# Conectar VELIQ a un harness / Connect VELIQ to a harness

## Preparación / Setup

Cloná el repositorio, instalá dependencias y comprobá el servidor:

```bash
git clone https://github.com/ValentinCabral/veliq.git
cd veliq
npm ci
npm run check
npm run mcp
```

`npm run mcp` queda esperando mensajes MCP por stdio; Ctrl+C lo detiene. No imprime logs en stdout. Definí la ruta absoluta del archivo `apps/cli/main.ts` (por ejemplo, `VELIQ_MAIN="$(pwd)/apps/cli/main.ts"` en Bash). Las recetas siguientes usan `/RUTA/ABSOLUTA/veliq/apps/cli/main.ts` como marcador: reemplazalo por la ruta real. Node.js 24+ debe estar en PATH del harness.

Clone, run `npm ci` and `npm run check`. The MCP server uses stdio and has no model API credentials. Replace `/ABSOLUTE/PATH/veliq/apps/cli/main.ts` with your actual path in the recipes below.

## OpenCode: instalado y verificado / installed and verified

Desde el **proyecto donde usás OpenCode**, ejecutá:

```bash
node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts install opencode
opencode mcp list
```

El comando agrega `mcp.veliq` a `opencode.json`, conserva las demás entradas y guarda una copia privada en `.veliq/backups/`. Si hay `opencode.jsonc`, falla sin alterar comentarios: añadí el bloque manualmente. Para revertir:

```bash
node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts uninstall opencode
```

El instalador y `opencode mcp list` se probaron con OpenCode **1.18.33**: mostró `veliq connected`. Una configuración manual equivalente es:

```json
{
  "mcp": {
    "veliq": {
      "type": "local",
      "command": ["node", "--experimental-strip-types", "/RUTA/ABSOLUTA/veliq/apps/cli/main.ts", "mcp"],
      "enabled": true
    }
  }
}
```

En OpenCode pedí: **«Usá la herramienta `veliq.capabilities` y luego `veliq.encode` con `Analiza el error \"1\" y no elimines los archivos originales.`»**. La conexión expone ocho herramientas: `veliq.capabilities`, `veliq.encode`, `veliq.decode`, `veliq.validate`, `veliq.optimize`, `veliq.memory.store`, `veliq.memory.retrieve` y `veliq.benchmark`. El modelo decide cuándo llamarlas; VELIQ **no intercepta ni reescribe automáticamente** todas las solicitudes. La observación V1 de `adapters/opencode/observe.mjs` sigue separada y no se instala mediante este comando. [Configuración oficial](https://opencode.ai/docs/mcp-servers/).

**English:** run the installer from your OpenCode project, then `opencode mcp list`. It was verified as connected on OpenCode 1.18.33. Ask the model to call `veliq.capabilities`. Use `uninstall opencode` to remove only VELIQ and keep a private backup. Tool calls are explicit; this is not a transparent prompt interceptor.

## Codex

La CLI de Codex permite registrar un servidor MCP stdio. En una instalación Codex propia:

```bash
codex mcp add veliq -- node --experimental-strip-types /RUTA/ABSOLUTA/veliq/apps/cli/main.ts mcp
codex mcp list
```

Luego, en Codex, pedí que invoque `veliq.capabilities` o `veliq.encode`. La [documentación oficial](https://developers.openai.com/codex/mcp) describe también configuración por `config.toml` e IDE. Este comando **no se ejecutó contra una instalación Codex configurada** en este entorno; el servidor sí pasó un handshake y llamadas de herramientas por stdio con el cliente oficial MCP. No concede acceso a razonamiento privado ni intercepta prompts ocultos. Para borrar la conexión: `codex mcp remove veliq` según la ayuda de tu versión (`codex mcp --help`).

**English:** register the stdio server with `codex mcp add` and check `codex mcp list`. Tool interoperability was tested with the official MCP client, while Codex's own configured session was not tested here.

## Claude Code

En el proyecto donde trabajás:

```bash
claude mcp add --scope project --transport stdio veliq -- node --experimental-strip-types /RUTA/ABSOLUTA/veliq/apps/cli/main.ts mcp
claude mcp list
```

Claude Code puede pedir aprobación de un servidor en `.mcp.json`; aceptala sólo tras revisar el comando. En Claude Code, `/mcp` muestra el estado; después pedí una llamada a `veliq.capabilities`. Probé el registro en **Claude Code 2.1.284**: la lista mostró `Pending approval`; no se completó una conversación autenticada en Claude. Remové con `claude mcp remove veliq`. [Documentación oficial](https://code.claude.com/docs/en/mcp).

**English:** add the project-scoped stdio server, review the approval prompt, check `/mcp`, then call a VELIQ tool. Registration was tested on Claude Code 2.1.284; interactive approval/model invocation was not completed in this environment.

## Otro cliente MCP / Another MCP client

Usá el transporte **stdio** con el comando `node --experimental-strip-types /RUTA/ABSOLUTA/veliq/apps/cli/main.ts mcp`. El SDK oficial de MCP probó `initialize`, `tools/list`, `tools/call`, la persistencia con ámbito explícito y un proceso hijo real. Herramientas de memoria requieren `{user,workspace,project,session,agent}`; no mezcles ámbitos. `veliq.optimize` en Observe devuelve el texto original y cuenta bytes UTF-8; no afirma ahorro de tokens del proveedor.

Use stdio and the same launch command. The official MCP SDK client tests initialization, tool listing/calls, a real child process, and exact-scope memory isolation.

## Benchmarks entre harnesses / Harness benchmarks

Que una herramienta VELIQ funcione en un harness **no prueba ahorro**. Para comparar, corré baseline y candidata con el mismo corpus, modelo/versión/parámetros y veredicto por caso. Generá JSONL como `examples/case-results.jsonl`, ejecutá `scripts/aggregate-benchmark.mjs`, luego `bench import` o `scripts/upload-benchmark.mjs` con token opt-in. Detalles y comandos en [README](../README.md#probar-y-comparar) y [contrato](EXTERNAL_BENCHMARKS.md). No atribuir a VELIQ tokens de razonamiento interno no reportados.

A working MCP connection does not establish token savings. Run paired evaluations, keep auxiliary work and retries, aggregate case-level results, and submit explicitly. Uploaded reports remain self-reported.
