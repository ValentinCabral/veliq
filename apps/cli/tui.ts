import {createInterface} from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';
import {MemoryStore,defaultScope} from '../../packages/memory/store.ts';
import {listRuns} from '../../packages/metrics/benchmarks.ts';
import {processMessage} from '../../packages/runtime/runtime.ts';
import {print} from '../../packages/language/parser.ts';
import {observationSummary} from '../../packages/metrics/observations.mjs';
export function renderHome(store:MemoryStore){const metrics=store.metrics(),runs=listRuns(store);const total=metrics.length,fall=metrics.filter(x=>x.fallback).length;
  const observations=observationSummary(process.cwd());
  return `VELIQ 0.1 · consola local\n${'─'.repeat(42)}\nMensajes analizados: ${total}   Fallbacks: ${fall}\nHerramientas observadas automáticamente: ${observations.observations}\nBytes observados: ${observations.originalBytes} · Observe: ahorro 0\nMemorias en ámbito demo: ${store.retrieve(defaultScope).length}\nBenchmarks importados: ${runs.length} (autodeclarados)\n\n1  Explorar idioma\n2  Ver mediciones recientes\n3  Ver benchmarks\n4  Ver memoria\n5  Salir\n`;
}
export async function runTui(store:MemoryStore){if(!input.isTTY)throw new Error('La interfaz interactiva requiere una terminal; usá los comandos CLI en scripts');const rl=createInterface({input,output});try{while(true){output.write('\x1b[2J\x1b[H'+renderHome(store));const choice=(await rl.question('Elegí una opción: ')).trim();if(choice==='5'||choice==='q')break;
    if(choice==='1'){const text=await rl.question('Instrucción (plantilla española): ');const {vsr,decision}=processMessage(text,store,'observe');output.write(vsr?`\nVELIQ: ${print(vsr.root)}\nOriginal: ${decision.original.value} bytes UTF-8\nModo: Observe (sin alterar)\n`:'\nPlantilla no soportada; se preservó el original.\n')}
    else if(choice==='2')output.write('\n'+JSON.stringify(store.metrics().slice(0,10),null,2)+'\n');
    else if(choice==='3')output.write('\n'+JSON.stringify(listRuns(store).slice(0,10),null,2)+'\n');
    else if(choice==='4')output.write('\n'+JSON.stringify(store.retrieve(defaultScope),null,2)+'\n');
    else output.write('\nOpción desconocida.\n');
    await rl.question('\nEnter para continuar…');
  }}finally{rl.close()}}
