import {spawnSync} from 'node:child_process';
import {ingestRun,listRuns} from '../../packages/metrics/benchmarks.ts';
import {resolve} from 'node:path';
import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {parse,print} from '../../packages/language/parser.ts';
import {parseCompact,printCompact} from '../../packages/language/compact.ts';
import {fromText,canonical,decode,diagnostic,fromNatural,toNatural,supportedLanguages,type SupportedLanguage} from '../../packages/semantic/vsr.ts';
import {MemoryStore,defaultScope} from '../../packages/memory/store.ts';
import {processMessage} from '../../packages/runtime/runtime.ts';
import {startServer} from '../gateway/server.ts';
const args=process.argv.slice(2),cmd=args.shift()??'help';
const home=resolve(process.env.VELIQ_HOME??'.veliq');
const dbPath=resolve(home,'veliq.sqlite');
function store(){return new MemoryStore(dbPath)}
function output(x:unknown){console.log(typeof x==='string'?x:JSON.stringify(x,null,2))}
async function main(){
  switch(cmd){
    case 'init':mkdirSync(home,{recursive:true});if(!existsSync(resolve(home,'config.json')))writeFileSync(resolve(home,'config.json'),JSON.stringify({mode:'observe',privacy:'local'},null,2));store().close();output(`Inicializado: ${home}`);break;
    case 'doctor':{const detect=(name:string)=>{const r=spawnSync(name,['--version'],{encoding:'utf8',timeout:2000});return r.status===0?(r.stdout||r.stderr).trim():null};output({node:process.versions.node,nodeCompatible:Number(process.versions.node.split('.')[0])>=24,database:existsSync(dbPath),opencode:detect('opencode'),codex:detect('codex'),claude:detect('claude'),opencodeProjectConfig:existsSync(resolve('opencode.json')),mcpCommand:'node --experimental-strip-types apps/cli/main.ts mcp',externalRequests:false});break}
    case 'encode':{const language=args[0]==='--lang' ? args.splice(0,2)[1] : 'es';const compact=args[0]==='--compact' ? !!args.shift() : false;if(language!=='veliq'&&!supportedLanguages.includes(language as SupportedLanguage))throw new Error('Idioma no soportado');const input=args.join(' ');if(!input)throw new Error('Falta texto');const v=language==='veliq'?fromText(input):fromNatural(input,language as SupportedLanguage);output({text:compact?printCompact(v.root):print(v.root),vsr:JSON.parse(canonical(v))});break}
    case 'decode':{const compact=args[0]==='--compact' ? !!args.shift() : false;const input=args.join(' ');const v=input.startsWith('{')?decode(input):compact?fromText(print(parseCompact(input))):fromText(input);output({natural:toNatural(v),diagnostic:diagnostic(v)});break}
    case 'status':{const s=store();output({mode:'observe',metrics:s.metrics().slice(0,10),memory:s.retrieve(defaultScope)});s.close();break}
    case 'benchmark':{if(args[0]==='--multilingual'||args[0]==='--selective'){const script=args[0]==='--selective'?'selective.py':'multilingual.py';const result=spawnSync('python3',[`research/benchmarks/${script}`],{cwd:resolve(import.meta.dirname,'../..'),encoding:'utf8',timeout:30_000,maxBuffer:5_000_000});if(result.status!==0)throw new Error(result.stderr||'Instalá research/benchmarks/requirements.txt');output(JSON.parse(result.stdout));break}const {runBenchmark}=await import('../../research/benchmarks/run.ts');output(runBenchmark());break}
    case 'bench':{const sub=args.shift();const s=store();try{if(sub==='import'){const file=args.shift();if(!file)throw new Error('Uso: veliq bench import archivo.json');output(ingestRun(s,JSON.parse(readFileSync(resolve(file),'utf8'))))}else if(sub==='list')output(listRuns(s));else throw new Error('Uso: veliq bench import archivo.json | bench list')}finally{s.close()}break}
    case 'mcp':{const {serveVeliqMcp}=await import('../../adapters/mcp/server.ts');await serveVeliqMcp();break}
    case 'tui':{const s=store();try{const {runTui}=await import('./tui.ts');await runTui(s)}finally{s.close()}break}
    case 'dashboard':{const s=store();const server=startServer(s,Number(process.env.VELIQ_PORT??4173));await new Promise<void>(resolve=>server.on('listening',resolve));console.log(`VELIQ Studio local: http://127.0.0.1:${(server.address() as {port:number}).port}`);break}
    case 'install':case 'uninstall':{if(args[0]!=='opencode')throw new Error('Uso: veliq install|uninstall opencode');const {connectOpenCode,disconnectOpenCode}=await import('../../adapters/opencode/config.ts');output(cmd==='install'?connectOpenCode():disconnectOpenCode());break}
    default:output('veliq init | doctor | status | encode [--lang es|en|pt|fr|de|it|nl|zh|ja|ko|veliq] TEXTO | decode VELIQ | benchmark | bench import|list | mcp | tui | dashboard | install opencode | uninstall opencode');
  }
}
main().catch(e=>{console.error(`Error: ${e instanceof Error?e.message:String(e)}`);process.exitCode=1});
