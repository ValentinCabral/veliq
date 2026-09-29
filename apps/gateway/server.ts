import {ingestRun,listRuns,authorized} from '../../packages/metrics/benchmarks.ts';
import type {MemoryStore} from '../../packages/memory/store.ts';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {defaultScope} from '../../packages/memory/store.ts';
import {processMessage} from '../../packages/runtime/runtime.ts';
import {print} from '../../packages/language/parser.ts';
import {canonical,fromText,fromNatural,toNatural,supportedLanguages,type SupportedLanguage} from '../../packages/semantic/vsr.ts';
import {printCompact} from '../../packages/language/compact.ts';
import {printC2} from '../../packages/language/compact2.ts';
import {printC3} from '../../packages/language/compact3.ts';
import {observationSummary} from '../../packages/metrics/observations.mjs';
const html=readFileSync(fileURLToPath(new URL('../studio/index.html',import.meta.url)));
const multilingualReport=readFileSync(fileURLToPath(new URL('../../research/benchmarks/results-2026-09-29.json',import.meta.url)));
const selectiveReport=readFileSync(fileURLToPath(new URL('../../research/benchmarks/selective-results-2026-09-29.json',import.meta.url)));
const harnessReport=readFileSync(fileURLToPath(new URL('../../research/benchmarks/harness-results-2026-09-29.json',import.meta.url)));
export function startServer(store:MemoryStore,port=4173){return createServer(async(req,res)=>{
  const send=(code:number,data:unknown)=>{res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'http://127.0.0.1:'+port});res.end(JSON.stringify(data))};
  try{
    if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'"});res.end(html);return}
    if(req.method==='GET'&&req.url==='/api/status'){send(200,{metrics:store.metrics(),observations:observationSummary(process.cwd()),benchmarks:listRuns(store),memories:store.retrieve(defaultScope),mode:'observe',model:'utf8-byte-baseline',counterKind:'exact-local-bytes'});return}
    if(req.method==='GET'&&req.url==='/api/research/multilingual'){send(200,JSON.parse(multilingualReport.toString('utf8')));return}
    if(req.method==='GET'&&req.url==='/api/research/selective'){send(200,JSON.parse(selectiveReport.toString('utf8')));return}
    if(req.method==='GET'&&req.url==='/api/research/harness'){send(200,JSON.parse(harnessReport.toString('utf8')));return}
    if(req.method==='POST'&&req.url==='/api/benchmarks'){
      if(!authorized(req.headers.authorization,process.env.VELIQ_INGEST_TOKEN)){send(401,{error:'Token de ingesta no configurado o inválido'});return}
      let body='';for await(const chunk of req){body+=chunk;if(body.length>64_000)throw new Error('Corrida demasiado grande')}
      send(201,ingestRun(store,JSON.parse(body)));return
    }
    if(req.method==='POST'&&req.url==='/api/explore'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>200_000)throw new Error('Cuerpo demasiado grande')}
      const {text,mode='observe',language='es'}=JSON.parse(body);if(typeof text!=='string'||text.length>100_000||!['observe','hybrid','native','research'].includes(mode)||!supportedLanguages.includes(language as SupportedLanguage))throw new Error('Entrada inválida');
      const v=text.startsWith('veliq:')?fromText(text.slice(6)):fromNatural(text,language);
      const result=processMessage(text,store,mode,language);
      let compact:string|undefined;try{compact=printCompact(v.root)}catch{}
      let c2:string|undefined;try{c2=printC2(v.root)}catch{}
      let c3:string|undefined;try{c3=printC3(v.root)}catch{}
      send(200,{text:print(v.root),compact,c2,c3,vsr:JSON.parse(canonical(v)),natural:toNatural(v),decision:result.decision});return;
    }
    send(404,{error:'Ruta desconocida'});
  }catch(e){send(400,{error:e instanceof Error?e.message:'Error'})}
}).listen(port,'127.0.0.1')}
