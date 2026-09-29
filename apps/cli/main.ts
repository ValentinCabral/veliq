import {spawnSync} from 'node:child_process';
import {ingestRun,listRuns} from '../../packages/metrics/benchmarks.ts';
import {resolve} from 'node:path';
import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {parse,print} from '../../packages/language/parser.ts';
import {parseCompact,printCompact} from '../../packages/language/compact.ts';
import {parseC2,printC2} from '../../packages/language/compact2.ts';
import {parseC3,printC3} from '../../packages/language/compact3.ts';
import {fromText,canonical,decode,diagnostic,fromNatural,toNatural,supportedLanguages,type SupportedLanguage} from '../../packages/semantic/vsr.ts';
import {MemoryStore,defaultScope} from '../../packages/memory/store.ts';
import {processMessage} from '../../packages/runtime/runtime.ts';
import {startServer} from '../gateway/server.ts';
import {observationSummary} from '../../packages/metrics/observations.mjs';
const args=process.argv.slice(2),cmd=args.shift()??'help';
const home=resolve(process.env.VELIQ_HOME??'.veliq');
const dbPath=resolve(home,'veliq.sqlite');
function store(){return new MemoryStore(dbPath)}
function output(x:unknown){console.log(typeof x==='string'?x:JSON.stringify(x,null,2))}
async function main(){
  switch(cmd){
    case 'init':mkdirSync(home,{recursive:true});if(!existsSync(resolve(home,'config.json')))writeFileSync(resolve(home,'config.json'),JSON.stringify({mode:'observe',privacy:'local'},null,2));store().close();output(`Inicializado: ${home}`);break;
    case 'doctor':{const detect=(name:string)=>{const r=spawnSync(name,['--version'],{encoding:'utf8',timeout:2000});return r.status===0?(r.stdout||r.stderr).trim():null};output({node:process.versions.node,nodeCompatible:Number(process.versions.node.split('.')[0])>=24,database:existsSync(dbPath),opencode:detect('opencode'),codex:detect('codex'),claude:detect('claude'),opencodeProjectConfig:existsSync(resolve('opencode.json')),mcpCommand:'node --experimental-strip-types apps/cli/main.ts mcp',externalRequests:false});break}
    case 'encode':{const language=args[0]==='--lang' ? args.splice(0,2)[1] : 'es';const surface=args[0]==='--compact'?(args.shift(),'compact'):args[0]==='--c2'?(args.shift(),'c2'):args[0]==='--c3'?(args.shift(),'c3'):'formal';if(language!=='veliq'&&!supportedLanguages.includes(language as SupportedLanguage))throw new Error('Idioma no soportado');const input=args.join(' ');if(!input)throw new Error('Falta texto');const v=language==='veliq'?fromText(input):fromNatural(input,language as SupportedLanguage);output({text:surface==='c3'?printC3(v.root):surface==='c2'?printC2(v.root):surface==='compact'?printCompact(v.root):print(v.root),vsr:JSON.parse(canonical(v))});break}
    case 'decode':{const surface=args[0]==='--compact'?(args.shift(),'compact'):args[0]==='--c2'?(args.shift(),'c2'):args[0]==='--c3'?(args.shift(),'c3'):'formal';const input=args.join(' ');const v=input.startsWith('{')?decode(input):fromText(surface==='c3'?print(parseC3(input)):surface==='c2'?print(parseC2(input)):surface==='compact'?print(parseCompact(input)):input);output({natural:toNatural(v),diagnostic:diagnostic(v)});break}
    case 'status':{const s=store();output({mode:'observe',observations:observationSummary(process.cwd()),metrics:s.metrics().slice(0,10),memory:s.retrieve(defaultScope)});s.close();break}
    case 'benchmark':{if(args[0]==='--multilingual'||args[0]==='--selective'||args[0]==='--harness'){const flag=args.shift(),script=flag==='--selective'?'selective.py':flag==='--harness'?'harness.py':'multilingual.py';const supplied=flag==='--harness'&&args[0]?resolve(args[0]):undefined;const result=spawnSync('python3',[`research/benchmarks/${script}`,...(supplied?[supplied]:[])],{cwd:resolve(import.meta.dirname,'../..'),encoding:'utf8',timeout:30_000,maxBuffer:5_000_000});if(result.status!==0)throw new Error(result.stderr||'Instalá research/benchmarks/requirements.txt');output(JSON.parse(result.stdout));break}const {runBenchmark}=await import('../../research/benchmarks/run.ts');output(runBenchmark());break}
    case 'bench':{const sub=args.shift();const s=store();try{if(sub==='import'){const file=args.shift();if(!file)throw new Error('Uso: veliq bench import archivo.json');output(ingestRun(s,JSON.parse(readFileSync(resolve(file),'utf8'))))}else if(sub==='list')output(listRuns(s));else throw new Error('Uso: veliq bench import archivo.json | bench list')}finally{s.close()}break}
    case 'mcp':{const {serveVeliqMcp}=await import('../../adapters/mcp/server.ts');await serveVeliqMcp();break}
    case 'tui':{const s=store();try{const {runTui}=await import('./tui.ts');await runTui(s)}finally{s.close()}break}
    case 'dashboard':{const s=store();const server=startServer(s,Number(process.env.VELIQ_PORT??4173));await new Promise<void>(resolve=>server.on('listening',resolve));console.log(`VELIQ Studio local: http://127.0.0.1:${(server.address() as {port:number}).port}`);break}
    case 'install':case 'uninstall':{if(['codex-observe','claude-observe'].includes(args[0])){const {installHookObserver,uninstallHookObserver}=await import('../../adapters/hooks/config.ts');const harness=args[0]==='codex-observe'?'codex':'claude-code';output(cmd==='install'?installHookObserver(harness):uninstallHookObserver(harness));break}if(!['opencode','opencode-observe'].includes(args[0]))throw new Error('Uso: veliq install|uninstall opencode|opencode-observe|codex-observe|claude-observe');const {connectOpenCode,disconnectOpenCode,installOpenCodeObserver,uninstallOpenCodeObserver}=await import('../../adapters/opencode/config.ts');output(args[0]==='opencode-observe'?(cmd==='install'?installOpenCodeObserver():uninstallOpenCodeObserver()):(cmd==='install'?connectOpenCode():disconnectOpenCode()));break}
    default:output('veliq init | doctor | status | encode [--lang es|en|pt|fr|de|it|nl|zh|ja|ko|veliq] [--compact|--c2|--c3] TEXTO | decode [--compact|--c2|--c3] VELIQ | benchmark [--multilingual|--selective|--harness [CORPUS.jsonl]] | bench import|list | mcp | tui | dashboard | install|uninstall opencode|opencode-observe|codex-observe|claude-observe');
  }
}
main().catch(e=>{console.error(`Error: ${e instanceof Error?e.message:String(e)}`);process.exitCode=1});
