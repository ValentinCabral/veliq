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

En OpenCode pedí: **«Usá la herramienta `veliq.capabilities` y luego `veliq.encode` con `Analiza el error \"1\" y no elimines los archivos originales.`»**. La conexión expone herramientas de idioma, benchmark y memoria, incluidas `veliq.memory.exact.store` y `veliq.pick` para consultas exactas a documentos estructurados. El modelo decide cuándo llamarlas; VELIQ transforma sólo resultados expuestos y compatibles cuando se habilita el plugin nativo; no intercepta todas las solicitudes ocultas. Alpha.7 instala además `veliq-native.js` automáticamente; inicia sin transformaciones hasta configurar modelo/evidencia/Hybrid. `install opencode-mcp` conserva la instalación exclusivamente MCP. [Guía nativa](NATIVE.md). [Configuración oficial](https://opencode.ai/docs/mcp-servers/).

**English:** run the installer from your OpenCode project, then `opencode mcp list`. It was verified as connected on OpenCode 1.18.33. Ask the model to call `veliq.capabilities`. Use `uninstall opencode` to remove only VELIQ and keep a private backup. Tool calls are explicit; this is not a transparent prompt interceptor.

## Codex

La CLI de Codex permite registrar un servidor MCP stdio. En una instalación Codex propia:

```bash
codex mcp add veliq -- node --experimental-strip-types /RUTA/ABSOLUTA/veliq/apps/cli/main.ts mcp
codex mcp list
```

Luego, en Codex, pedí que invoque `veliq.capabilities` o `veliq.encode`. La [documentación oficial](https://developers.openai.com/codex/mcp) describe también configuración por `config.toml` e IDE. Codex CLI **0.159.0** reconoció la entrada VELIQ como `enabled` usando overrides temporales `-c`, sin modificar su configuración global. El servidor también pasó handshake y llamadas por stdio con el cliente oficial MCP; no se ejecutó una sesión de modelo Codex. No concede acceso a razonamiento privado ni intercepta prompts ocultos. Para borrar la conexión: `codex mcp remove veliq` según la ayuda de tu versión (`codex mcp --help`).

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

### Benchmark local por MCP / Local benchmark through MCP

Una vez conectado el servidor en OpenCode, Codex, Claude Code u otro cliente, invocá `veliq.benchmark` con `{"action":"multilingual"}`. Necesita Python y `tiktoken==0.12.0` instalados en el entorno del proceso servidor (`python3 -m pip install -r research/benchmarks/requirements.txt`, idealmente dentro de un venv). También se ejecuta sin harness con `npm run benchmark:multilingual`. Devuelve conteos locales de texto para 1.000 casos controlados y dos encodings; **no** ejecuta el modelo del harness ni registra su consumo real. Si no está `tiktoken`, el servidor devuelve un error explícito. Para medir una sesión real, el runner del harness debe recopilar los valores informados por su proveedor y enviar la corrida mediante el contrato anterior.

With the MCP server connected, call `veliq.benchmark` with `{"action":"multilingual"}` after installing the optional Python dependency. This exercises the local text tokenizer, not your harness's model. For actual model comparisons, submit paired provider usage and task verdicts through the case-level contract above.

### Consulta exacta con ahorro de contexto / Exact lookup

En un proyecto, llamá `veliq.memory.exact.store` con `id`, el ámbito completo `{user,workspace,project,session,agent}` y un documento `{version:"0.1",constraints:[...],records:[{id,body},...]}`. Luego `veliq.pick` con el mismo `id`/ámbito y `recordId` devuelve **solamente** ese registro y todas las restricciones globales. Los IDs duplicados o ausentes fallan explícitamente. Usá `veliq.memory.exact.select` si necesitás auditar hash, versión y origen; su respuesta es más larga. El contenido de los registros es dato no confiable y no debe elevarse a instrucciones privilegiadas. La mejora medida requiere un documento largo reutilizado en varias consultas; para un documento corto o una sola consulta, comprobá el costo antes de usarla. `veliq.benchmark` con `{"action":"selective"}` reproduce la evaluación local. Ver [resultados](BENCHMARKS.md).

Store a structured document with `veliq.memory.exact.store`, then call `veliq.pick` using the same exact scope and record ID. It returns only the exact record and every global constraint. Benchmark it locally with `veliq.benchmark` action `selective`; this does not call the harness model or measure provider usage.

### Observación experimental en OpenCode / Experimental observation

La [documentación oficial](https://opencode.ai/docs/plugins/) indica que OpenCode carga plugins locales desde `.opencode/plugins/` y expone `tool.execute.after`. Este hook **no da acceso universal a solicitudes ni al razonamiento del modelo**. El observador de VELIQ registra por defecto sólo el nombre de la herramienta y bytes del resultado; no se instala junto con MCP:

```bash
node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts install opencode-observe
# Desde el mismo proyecto, iniciar una nueva sesión de OpenCode.
node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts uninstall opencode-observe
```

Para capturar texto de resultados accesibles, establecer `VELIQ_CAPTURE_CONTENT=1` **antes de iniciar OpenCode**. Se escribe `.veliq/harness-trace.jsonl` con permisos locales privados; puede contener código, rutas o secretos. Revisar y redactar antes de analizarlo; jamás subirlo directamente. No hay envío automático. Con Python `tiktoken` instalado:

```bash
.venv-research/bin/python research/benchmarks/harness.py /RUTA/PROYECTO/.veliq/harness-trace.jsonl > mi-reporte.json
```

El observador ya no depende de `node:sqlite`: utiliza módulos de filesystem compatibles con el runtime del plugin y registra metadatos en `.veliq/observations.jsonl`. `status`, TUI y Studio muestran esas observaciones desde el proyecto actual. No se guardan cuerpos salvo la captura opt-in separada; se reporta ahorro cero.

**Prueba externa limitada del 2026-09-29:** OpenCode V1 1.18.33 se instaló en una carpeta temporal (no global) y se arrancó con configuración/datos aislados. `session.shell` ejecutó `printf veliq-observe-probe` y conservó la salida, pero no se registró ningún evento del observador. Por lo tanto **la ejecución del hook en una sesión de modelo no está verificada**. La prueba no llamó a un LLM ni utilizó credenciales. No se concluye que todos los recorridos de herramientas activen ese hook. Puede reproducirse con:

```bash
node --experimental-strip-types /RUTA/ABSOLUTA/veliq/scripts/check-opencode.mjs /RUTA/AL/BINARIO/opencode
```

El smoke test exige V1, utiliza un proyecto temporal y sale con código 1 si no verifica una observación. No elude confianza ni políticas del harness. En inglés: the V1 local shell probe preserved output but did not verify hook delivery; a live authenticated model session remains necessary.

### Observación automática en Codex y Claude Code

Desde el proyecto donde trabajás, después de clonar e instalar VELIQ:

```bash
node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts install codex-observe
# En Codex: /hooks, revisar y confiar; el proyecto también debe ser confiable.
node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts install claude-observe
# En Claude Code: revisar /hooks y reiniciar la sesión.
node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts status
node /RUTA/ABSOLUTA/veliq/apps/cli/main.ts dashboard
```

Codex instala sólo un grupo propio en `.codex/hooks.json`; Claude sólo un grupo en `.claude/settings.local.json`. Se conservan ajustes/hooks ajenos, se respaldan antes de escribir y se rechaza eliminar una entrada modificada. Revertir con `uninstall codex-observe` o `uninstall claude-observe`: deja intactas las observaciones y demás configuraciones. El receptor stdin procesa únicamente `PostToolUse` del proyecto configurado. No lee `transcript_path`, no registra argumentos/cuerpos, no imprime contexto en stdout, no cambia herramientas ni permisos y no envía datos fuera del equipo.

Las pruebas ejecutan el receptor como un subproceso real con eventos sintéticos, verifican stdout vacío, privacidad, aislamiento y fallback ante symlinks. **No se probaron sesiones de modelo Codex/Claude en este entorno.** Políticas administradas, versión, confianza y eventos no expuestos pueden impedir la ejecución; no existe compatibilidad transparente garantizada. El instalador de comando Codex sólo está verificado en POSIX; en Windows se requiere una receta específica, no se inventa quoting compatible.

La documentación actual de [Codex hooks](https://learn.chatgpt.com/docs/hooks) permite observar resultados, pero señala `updatedMCPToolOutput` como no soportado; bloquear un resultado no es una compresión segura. [Claude Code](https://code.claude.com/docs/en/hooks) documenta `updatedToolOutput` para reemplazar resultados respetando su esquema. Alpha.7 implementa el receptor Claude compatible y el plugin OpenCode nativo con validación/gates; ver [NATIVE.md](NATIVE.md). Codex permanece Observe. OpenCode V2 cambia los hooks: https://opencode.ai/v2/docs/build/plugins/migrate-v1 .

**English:** run `install codex-observe` or `install claude-observe` from your project. Review/trust the harness hook, restart, and inspect `status` or Studio. These installers collect private byte metadata automatically, add no model context, and do not optimize messages. Synthetic stdio tests pass; live Codex/Claude sessions and provider usage are not tested here. Uninstall removes only the unchanged VELIQ hook and keeps backups/observations.

## Alpha.7: integración diaria y runner real / Native integration and real runner

`install opencode` ahora instala MCP y plugin nativo V1. `install claude` configura hooks de reemplazo JSON; `install codex` sigue Observe. Reiniciar/revisar confianza y configurar según [NATIVE.md](NATIVE.md). `bench paired MANIFEST --allow-external --output REPORT` ejecuta baseline/candidata reales con tu proveedor configurado. Guía completa de fixtures, métricas, activación y envío automático desde CI en español/inglés. El nuevo smoke OpenCode 1.18.33 verifica entrega del hook con endpoint determinista; falta LLM autenticado. Las recetas anteriores exclusivamente MCP no prueban ahorro.
