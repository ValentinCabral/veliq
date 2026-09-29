import {createHash} from 'node:crypto';
import {validateRun} from './benchmarks.ts';
import type {ExternalRun,CountKind} from './benchmarks.ts';
export type CaseResult={case_id:string;baseline:{input:number;output:number;overhead:number;retries:number;correct:boolean;critical_violation:boolean};candidate:CaseResult['baseline']};
export function aggregateCases(cases:CaseResult[],metadata:{run_id:string;harness:string;harness_version:string;model:string;model_version:string;dataset:string;dataset_bytes:Buffer;count_kind:CountKind;started_at:string}):ExternalRun{
  if(!cases.length)throw new Error('Sin casos');const seen=new Set<string>();
  const sum=()=>({input:0,output:0,overhead:0,retries:0});const baseline=sum(),candidate=sum();let correctBaseline=0,correctCandidate=0,critical=0;
  for(const c of cases){if(!c||typeof c.case_id!=='string'||!c.case_id||seen.has(c.case_id))throw new Error('ID de caso ausente o duplicado');seen.add(c.case_id);
    for(const side of ['baseline','candidate'] as const){const x=c[side];if(!x||typeof x.correct!=='boolean'||typeof x.critical_violation!=='boolean')throw new Error('Veredicto por caso obligatorio');
      for(const key of ['input','output','overhead','retries'] as const){if(!Number.isSafeInteger(x[key])||x[key]<0)throw new Error(`Conteo inválido: ${key}`);(side==='baseline'?baseline:candidate)[key]+=x[key]}}
    correctBaseline+=Number(c.baseline.correct);correctCandidate+=Number(c.candidate.correct);critical+=Number(c.candidate.critical_violation);
  }
  return validateRun({schema_version:'0.1',run_id:metadata.run_id,harness:metadata.harness,harness_version:metadata.harness_version,model:metadata.model,model_version:metadata.model_version,dataset:metadata.dataset,dataset_digest:'sha256:'+createHash('sha256').update(metadata.dataset_bytes).digest('hex'),started_at:metadata.started_at,count_kind:metadata.count_kind,baseline,candidate,cases:cases.length,correct_baseline:correctBaseline,correct_candidate:correctCandidate,critical_violations:critical});
}
