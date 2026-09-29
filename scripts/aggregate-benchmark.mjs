#!/usr/bin/env node
// Uso: node --experimental-strip-types scripts/aggregate-benchmark.mjs resultados.jsonl corpus.jsonl salida.json
import {readFileSync,writeFileSync} from 'node:fs';
import {aggregateCases} from '../packages/metrics/aggregate.ts';
const [results,dataset,destination]=process.argv.slice(2);
const required=['VELIQ_RUN_ID','VELIQ_HARNESS','VELIQ_HARNESS_VERSION','VELIQ_MODEL','VELIQ_MODEL_VERSION','VELIQ_DATASET','VELIQ_COUNT_KIND'];
if(!results||!dataset||!destination||required.some(k=>!process.env[k]))throw new Error('Uso: resultados.jsonl corpus.jsonl salida.json; configurar '+required.join(', '));
const source=readFileSync(results,'utf8');if(source.length>10_000_000)throw new Error('Resultados demasiado grandes');
const cases=source.trim().split(/\r?\n/).map((line,index)=>{try{return JSON.parse(line)}catch{throw new Error(`JSON inválido en línea ${index+1}`)}});
const run=aggregateCases(cases,{run_id:process.env.VELIQ_RUN_ID,harness:process.env.VELIQ_HARNESS,harness_version:process.env.VELIQ_HARNESS_VERSION,model:process.env.VELIQ_MODEL,model_version:process.env.VELIQ_MODEL_VERSION,dataset:process.env.VELIQ_DATASET,dataset_bytes:readFileSync(dataset),count_kind:process.env.VELIQ_COUNT_KIND,started_at:new Date().toISOString()});
writeFileSync(destination,JSON.stringify(run,null,2)+'\n',{flag:'wx'});console.log(`Corrida creada: ${destination} · ${run.cases} casos · ${run.count_kind}`);
