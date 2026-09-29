import {z} from 'zod';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,mkdirSync,readFileSync,rmSync,lstatSync,existsSync} from 'node:fs';
import {join,resolve,dirname,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {nativeSummary} from '../runtime/native.mjs';
import {installOpenCodeNative,privateWrite,nativeConfigSchema} from '../runtime/install.ts';
import {installHookObserver} from '../../adapters/hooks/config.ts';
import {validateRun,type ExternalRun} from './benchmarks.ts';
const safePath=z.string().min(1).max(512).refine(p=>!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(x=>x==='..'||x==='.'||x.startsWith('.')),'Ruta de fixture insegura');
export const pairedManifestSchema=z.object({version:z.literal('0.1'),dataset:z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/),harness:z.enum(['opencode','codex','claude-code']),executable:z.string().min(1),model:z.string().min(1).max(256),encoding:z.enum(['cl100k_base','o200k_base']),strategy:z.enum(['json-whitespace','context-reference']),repetitions:z.number().int().min(1).max(20),timeoutMs:z.number().int().min(1000).max(600_000),providerConfig:z.record(z.unknown()).optional(),cases:z.array(z.object({id:z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/),prompt:z.string().min(1).max(100_000),files:z.record(safePath,z.string().max(100_000)),expectedJson:z.unknown(),protectedFiles:z.array(safePath)}).strict()).min(1).max(1000)}).strict();
export type PairedManifest=z.infer<typeof pairedManifestSchema>;
export type Usage={input:number;output:number;cacheRead:number;cacheWrite:number;reasoning:number|null;total:number;complete:boolean;source:'harness-reported';costEstimateUsd:number|null};
function integer(x:unknown):x is number{return typeof x==='number'&&Number.isSafeInteger(x)&&x>=0}
/** Cache fields are subsets in Codex, disjoint in Claude. Never add reasoning twice. */
export function normalizeUsage(harness:PairedManifest['harness'],events:any[]):{usage:Usage|null;text:string;failed:boolean}{
  let text='',failed=false,usage:Usage|null=null,missing=false;
  if(harness==='codex'){
    for(const e of events){if(e.type==='item.completed'&&e.item?.type==='agent_message')text=e.item.text;if(['error','turn.failed'].includes(e.type))failed=true;
      if(e.type==='turn.completed'){const u=e.usage;if(!u||!integer(u.input_tokens)||!integer(u.output_tokens)||!integer(u.cached_input_tokens)){missing=true;continue;}
        const next={input:u.input_tokens,output:u.output_tokens,cacheRead:u.cached_input_tokens,cacheWrite:0,reasoning:null,total:u.input_tokens+u.output_tokens,complete:true,source:'harness-reported' as const,costEstimateUsd:null};
        usage=usage?{...next,input:usage.input+next.input,output:usage.output+next.output,cacheRead:usage.cacheRead+next.cacheRead,total:usage.total+next.total}:next;
      }
    }
  }else if(harness==='claude-code'){
    const e=[...events].reverse().find((e:any)=>e.type==='result');if(e){text=e.result??'';failed=!!e.is_error;const u=e.usage;
      if(u&&[u.input_tokens,u.output_tokens,u.cache_read_input_tokens,u.cache_creation_input_tokens].every(integer))usage={input:u.input_tokens,output:u.output_tokens,cacheRead:u.cache_read_input_tokens,cacheWrite:u.cache_creation_input_tokens,reasoning:null,total:u.input_tokens+u.output_tokens+u.cache_read_input_tokens+u.cache_creation_input_tokens,complete:true,source:'harness-reported',costEstimateUsd:typeof e.total_cost_usd==='number'?e.total_cost_usd:null};
    }
  }else{
    // V1 step-finish normalized tokens: input/output/reasoning/cache are disjoint. See pinned source in docs.
    for(const e of events){if(e.type==='text')text+=e.part?.text??'';if(e.type==='error')failed=true;
      if(e.type==='step_finish'){const t=e.part?.tokens;if(!t||![t.input,t.output,t.reasoning,t.cache?.read,t.cache?.write].every(integer)){missing=true;continue;}
        const next={input:t.input,output:t.output,cacheRead:t.cache.read,cacheWrite:t.cache.write,reasoning:t.reasoning,total:t.input+t.output+t.reasoning+t.cache.read+t.cache.write,complete:true,source:'harness-reported' as const,costEstimateUsd:typeof e.part.cost==='number'?e.part.cost:null};
        usage=usage?{...next,input:usage.input+next.input,output:usage.output+next.output,cacheRead:usage.cacheRead+next.cacheRead,cacheWrite:usage.cacheWrite+next.cacheWrite,reasoning:(usage.reasoning??0)+next.reasoning,total:usage.total+next.total,costEstimateUsd:usage.costEstimateUsd!==null&&next.costEstimateUsd!==null?usage.costEstimateUsd+next.costEstimateUsd:null}:next;
      }
    }
  }
  if(usage&&missing)usage.complete=false;return {usage,text,failed};
}
export type Invocation={stdout:string;code:number|null;latencyMs:number};
export async function invokeHarness(executable:string,args:string[],cwd:string,env:NodeJS.ProcessEnv,timeoutMs:number):Promise<Invocation>{
  return new Promise((done,reject)=>{const start=performance.now(),child=spawn(executable,args,{cwd,env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});let stdout='',size=0,killed=false;
    const terminate=()=>{killed=true;try{if(process.platform!=='win32')process.kill(-child.pid!,'SIGTERM');else child.kill('SIGTERM')}catch{}setTimeout(()=>{try{if(process.platform!=='win32')process.kill(-child.pid!,'SIGKILL');else child.kill('SIGKILL')}catch{}},1000).unref()};
    const timer=setTimeout(terminate,timeoutMs);
    child.stdout.on('data',chunk=>{size+=chunk.length;if(size>20_000_000)terminate();else stdout+=chunk});child.stderr.resume();
    child.on('error',e=>{clearTimeout(timer);reject(Error('No se pudo iniciar el harness: '+e.message))});child.on('close',code=>{clearTimeout(timer);done({stdout,code:killed?-1:code,latencyMs:Math.round(performance.now()-start)})});
  });
}
function commands(m:PairedManifest,prompt:string){if(m.harness==='opencode')return ['run','--format','json','--title','VELIQ paired experiment','--model',m.model,prompt];if(m.harness==='codex')return ['exec','--json','--sandbox','workspace-write','--skip-git-repo-check','--model',m.model,prompt];return ['-p',prompt,'--output-format','json','--model',m.model]}
const stable=(x:any):string=>JSON.stringify(x&&typeof x==='object'?Array.isArray(x)?x.map(v=>JSON.parse(stable(v))):Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(stable(x[k]))])):x);
export function sameJson(text:string,expected:unknown){try{return stable(JSON.parse(text.trim()))===stable(expected)}catch{return false}}
export type PairedReport={version:'0.1';runId:string;dataset:string;datasetDigest:string;harness:string;harnessVersion:string;model:string;strategy:string;startedAt:string;rows:any[];summary:{cases:number;correctBaseline:number;correctCandidate:number;criticalViolations:number;baselineTokens:number;candidateTokens:number;netPercent:number|null;completeUsage:boolean;eligible:boolean;reason:string};limitations:string[]};
export async function runPaired(raw:unknown,allowExternal:boolean,invoke=invokeHarness,onProgress:(x:string)=>void=()=>{}):Promise<PairedReport>{
  if(!allowExternal)throw Error('Requiere --allow-external: se ejecutará el harness configurado y puede consumir cuota');
  const m=pairedManifestSchema.parse(raw);if(new Set(m.cases.map(c=>c.id)).size!==m.cases.length)throw Error('IDs duplicados');
  if(m.harness==='codex')throw Error('Codex Observe no puede sustituir resultados: no existe candidato nativo comparable; usar OpenCode o Claude para este experimento');
  if(m.cases.some(c=>c.expectedJson===undefined||c.protectedFiles.some(f=>!(f in c.files))))throw Error('Oracle o archivo protegido faltante');
  const version=spawnSync(m.executable,['--version'],{encoding:'utf8',timeout:5000});if(version.status!==0)throw Error('Harness no disponible');
  const harnessVersion=version.stdout.trim();if(m.harness==='opencode'&&harnessVersion!=='1.18.33')throw Error('Runner fijado al contrato verificado OpenCode 1.18.33; revalidar antes de agregar otra versión');
  const rows:any[]=[],startedAt=new Date().toISOString();
  for(let repeat=0;repeat<m.repetitions;repeat++)for(let index=0;index<m.cases.length;index++){
    const c=m.cases[index],order=(index+repeat)%2?['candidate','baseline']:['baseline','candidate'];const row:any={id:c.id,repeat,order};
    for(const variant of order){const dir=mkdtempSync(join(tmpdir(),'veliq-paired-'));try{
      for(const [path,body] of Object.entries(c.files)){const target=join(dir,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,body)}
      const config=nativeConfigSchema.parse({version:'0.1',mode:variant==='candidate'?'research':'observe',model:m.model,encoding:m.encoding,jsonTools:m.harness==='opencode'?['read','bash']:['Bash'],strategies:[m.strategy]});privateWrite(dir,'native.json',config);
      if(m.harness==='opencode'){if(m.providerConfig)writeFileSync(join(dir,'opencode.json'),JSON.stringify(m.providerConfig),{mode:0o600});installOpenCodeNative(dir)}else installHookObserver('claude-code',dir,true);
      // Fresh sessions/workspaces; caller's already configured provider auth is used by the harness, never inspected here.
      const env:NodeJS.ProcessEnv={...process.env,VELIQ_RESEARCH_WORKSPACE:dir};delete env.VELIQ_CAPTURE_CONTENT;
      onProgress(`${c.id} · repetición ${repeat+1} · ${variant}`);
      const result=await invoke(m.executable,commands(m,c.prompt),dir,env,m.timeoutMs);
      let events:any[]=[];try{events=m.harness==='claude-code'?[JSON.parse(result.stdout)]:result.stdout.split('\n').filter(x=>x.trim().startsWith('{')).map(x=>JSON.parse(x))}catch{}
      const data=normalizeUsage(m.harness,events),protectedOk=c.protectedFiles.every(path=>{try{return !lstatSync(join(dir,path)).isSymbolicLink()&&readFileSync(join(dir,path),'utf8')===c.files[path]}catch{return false}});
      const native=nativeSummary(dir);row[variant]={usage:data.usage,exitCode:result.code,latencyMs:result.latencyMs,correct:result.code===0&&!data.failed&&sameJson(data.text,c.expectedJson),criticalViolation:!protectedOk,native,responseDigest:'sha256:'+createHash('sha256').update(data.text).digest('hex')};
    }finally{rmSync(dir,{recursive:true,force:true})}}
    rows.push(row);
  }
  const summary=summarizePairs(rows);
  return {version:'0.1',runId:randomUUID(),dataset:m.dataset,datasetDigest:'sha256:'+createHash('sha256').update(stable(m.cases)).digest('hex'),harness:m.harness,harnessVersion,model:m.model,strategy:m.strategy,startedAt,rows,summary,limitations:['Harness-reported usage; unreported internal retries/calls remain unknown. Failed/missing usage blocks activation.','No monetary savings claim: token totals do not apply cache prices. Claude costs are client estimates.','Fixed prompt, fresh sessions, alternating order; not a randomized production trial.','5 passing paired rows are a local smoke gate, not statistical proof of general daily savings.','No content or credentials stored in report; dataset includes explicitly supplied fixture text.']};
}
export function summarizePairs(rows:any[]):PairedReport['summary']{
  const cases=rows.length,correctBaseline=rows.filter(r=>r.baseline?.correct).length,correctCandidate=rows.filter(r=>r.candidate?.correct).length,criticalViolations=rows.filter(r=>r.baseline?.criticalViolation||r.candidate?.criticalViolation).length;
  const completeUsage=cases>0&&rows.every(r=>r.baseline?.usage?.complete&&r.candidate?.usage?.complete&&r.baseline.exitCode===0&&r.candidate.exitCode===0);
  const baselineTokens=rows.reduce((n,r)=>n+(r.baseline?.usage?.total??0),0),candidateTokens=rows.reduce((n,r)=>n+(r.candidate?.usage?.total??0),0),applied=rows.every(r=>r.candidate?.native?.applied>0);
  const perCaseCostOk=rows.every(r=>r.candidate?.usage?.total<=r.baseline?.usage?.total);
  const eligible=cases>=5&&completeUsage&&criticalViolations===0&&correctBaseline===cases&&correctCandidate===cases&&applied&&perCaseCostOk&&candidateTokens<baselineTokens;
  return {cases,correctBaseline,correctCandidate,criticalViolations,baselineTokens,candidateTokens,netPercent:completeUsage&&baselineTokens>0?100*(baselineTokens-candidateTokens)/baselineTokens:null,completeUsage,eligible,reason:eligible?'passing-local-paired-gate':!completeUsage?'incomplete-usage':criticalViolations?'critical-violation':correctBaseline!==cases||correctCandidate!==cases?'task-regression':!applied?'hook-not-applied':cases<5?'insufficient-cases':'no-net-saving'};
}
export function approvePairedReport(project:string,raw:PairedReport){
  // Recompute from per-case evidence; external summaries cannot silently approve themselves.
  if(raw.version!=='0.1'||!['opencode','claude-code'].includes(raw.harness)||!['context-reference','json-whitespace'].includes(raw.strategy))throw Error('Informe incompatible');
  if(!Array.isArray(raw.rows)||raw.rows.length>20_000||typeof raw.model!=='string'||!raw.model)throw Error('Informe inválido');
  for(const r of raw.rows)for(const side of ['baseline','candidate']){
    const s=r[side],u=s?.usage;if(!u||u.source!=='harness-reported'||![u.input,u.output,u.cacheRead,u.cacheWrite,u.total].every(integer)||u.reasoning!==null&&!integer(u.reasoning)||typeof s.correct!=='boolean'||typeof s.criticalViolation!=='boolean')throw Error('Evidencia incompleta o inválida');
  }
  if(!raw.rows.every(r=>r.candidate.native?.byStrategy?.[raw.strategy]>0))throw Error('Estrategia no aplicada');
  const summary=summarizePairs(raw.rows);if(!summary.eligible)throw Error('Benchmark no habilitable: '+summary.reason);
  const reportDigest='sha256:'+createHash('sha256').update(stable(raw)).digest('hex');
  const gate={harness:raw.harness,model:raw.model,strategy:raw.strategy,passed:true,cases:summary.cases,criticalViolations:summary.criticalViolations,reportDigest,createdAt:new Date().toISOString()};
  let gates:any[]=[];const path=join(project,'.veliq','native-gates.json');if(existsSync(path)){if(lstatSync(path).isSymbolicLink()||lstatSync(path).mode&0o077)throw Error('Archivo inseguro');gates=JSON.parse(readFileSync(path,'utf8')).gates}
  return privateWrite(project,'native-gates.json',{version:'0.1',gates:[...gates.filter(g=>g.harness!==gate.harness||g.model!==gate.model||g.strategy!==gate.strategy),gate]},existsSync(path));
}
/** Export only aggregates for the existing opt-in benchmark ingestion API. Reported overhead is already inside input/output. */
export function exportPairedRun(report:PairedReport):ExternalRun{
  const summary=summarizePairs(report.rows);if(!summary.completeUsage)throw Error('Consumo incompleto: no exportar como conteo completo');
  const counts=(side:string)=>{const output=report.rows.reduce((n,r)=>n+r[side].usage.output+(report.harness==='opencode'?(r[side].usage.reasoning??0):0),0),total=report.rows.reduce((n,r)=>n+r[side].usage.total,0);return {input:total-output,output,overhead:0,retries:0}};
  const tag=(s:string)=>s.replace(/[^a-zA-Z0-9._:-]/g,':').slice(0,128);
  return validateRun({schema_version:'0.1',run_id:report.runId,harness:report.harness,harness_version:tag(report.harnessVersion),model:tag(report.model),model_version:'not-reported',dataset:report.dataset,dataset_digest:report.datasetDigest,started_at:report.startedAt,count_kind:'provider-reported',baseline:counts('baseline'),candidate:counts('candidate'),cases:summary.cases,correct_baseline:summary.correctBaseline,correct_candidate:summary.correctCandidate,critical_violations:summary.criticalViolations,latency_ms:report.rows.reduce((n,r)=>n+r.baseline.latencyMs+r.candidate.latencyMs,0),notes:'Self-reported harness session aggregates; retries=0 means no VELIQ retries, provider internal retries unknown. Overhead included in reported input/output. Raw model: '+report.model});
}
