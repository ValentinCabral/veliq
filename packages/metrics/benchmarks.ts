import {randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {MemoryStore} from '../memory/store.ts';
export type CountKind='provider-reported'|'exact-text'|'estimated'|'local-bytes';
export type ExternalRun={schema_version:'0.1';run_id:string;harness:string;harness_version:string;model:string;model_version:string;dataset:string;dataset_digest:string;started_at:string;count_kind:CountKind;baseline:{input:number;output:number;overhead:number;retries:number};candidate:{input:number;output:number;overhead:number;retries:number};cases:number;correct_baseline?:number;correct_candidate?:number;critical_violations:number;latency_ms?:number;notes?:string};
const kinds=new Set(['provider-reported','exact-text','estimated','local-bytes']);
const id=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
function integer(n:unknown){return typeof n==='number'&&Number.isSafeInteger(n)&&n>=0}
export function validateRun(input:unknown):ExternalRun{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Corrida debe ser objeto');
  const x=input as Record<string,unknown>;
  const keys=['schema_version','run_id','harness','harness_version','model','model_version','dataset','dataset_digest','started_at','count_kind','baseline','candidate','cases','correct_baseline','correct_candidate','critical_violations','latency_ms','notes'];
  if(Object.keys(x).some(k=>!keys.includes(k)))throw new Error('Campo desconocido');
  if(x.schema_version!=='0.1'||!kinds.has(String(x.count_kind)))throw new Error('Versión o tipo de conteo inválido');
  for(const key of ['run_id','harness','harness_version','model','model_version','dataset'])if(typeof x[key]!=='string'||!id.test(x[key]))throw new Error(`Campo inválido: ${key}`);
  if(typeof x.dataset_digest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(x.dataset_digest))throw new Error('Digest inválido');
  if(typeof x.started_at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x.started_at)||Number.isNaN(Date.parse(x.started_at)))throw new Error('Fecha con zona horaria obligatoria');
  for(const key of ['cases','critical_violations','correct_baseline','correct_candidate','latency_ms'])if(x[key]!==undefined&&!integer(x[key]))throw new Error(`Cantidad inválida: ${key}`);
  if(!integer(x.cases)||x.cases===0||!integer(x.critical_violations)||Number(x.critical_violations)>Number(x.cases))throw new Error('Cantidad de casos o violaciones inválida');
  for(const key of ['correct_baseline','correct_candidate'])if(x[key]!==undefined&&Number(x[key])>Number(x.cases))throw new Error('Correctos exceden casos');
  for(const key of ['baseline','candidate']){
    const counts=x[key];if(!counts||typeof counts!=='object'||Array.isArray(counts))throw new Error('Conteos requeridos');
    const obj=counts as Record<string,unknown>;if(Object.keys(obj).sort().join()!=='input,output,overhead,retries'||!Object.values(obj).every(integer))throw new Error('Conteos inválidos');
  }
  if(x.notes!==undefined&&(typeof x.notes!=='string'||x.notes.length>500))throw new Error('Notas excesivas');
  return x as ExternalRun;
}
export function initBenchmarks(store:MemoryStore){store.db.exec(`CREATE TABLE IF NOT EXISTS benchmark_runs (run_id TEXT PRIMARY KEY, imported_at TEXT NOT NULL, trust TEXT NOT NULL, digest TEXT NOT NULL, body TEXT NOT NULL)`)}
export function ingestRun(store:MemoryStore,input:unknown){const run=validateRun(input);initBenchmarks(store);const body=JSON.stringify(run),digest='sha256:'+createHash('sha256').update(body).digest('hex');
  try{store.db.prepare('INSERT INTO benchmark_runs VALUES (?,?,?,?,?)').run(run.run_id,new Date().toISOString(),'self-reported',digest,body)}catch{throw new Error('run_id duplicado; las corridas son inmutables')}
  const baseline=run.baseline.input+run.baseline.output+run.baseline.overhead;
  const candidate=run.candidate.input+run.candidate.output+run.candidate.overhead;
  return {run_id:run.run_id,digest,trust:'self-reported',count_kind:run.count_kind,net_percent:baseline?100*(baseline-candidate)/baseline:null,comparable:run.critical_violations===0&&run.correct_baseline!==undefined&&run.correct_candidate!==undefined};
}
export function listRuns(store:MemoryStore){initBenchmarks(store);return (store.db.prepare('SELECT run_id,imported_at,trust,digest,body FROM benchmark_runs ORDER BY imported_at DESC LIMIT 100').all() as {run_id:string;imported_at:string;trust:string;digest:string;body:string}[]).map(x=>({...x,run:JSON.parse(x.body),body:undefined}))}
export function authorized(header:string|undefined,token:string|undefined){if(!token||token.length<16||!header?.startsWith('Bearer '))return false;const a=Buffer.from(header.slice(7)),b=Buffer.from(token);return a.length===b.length&&timingSafeEqual(a,b)}
