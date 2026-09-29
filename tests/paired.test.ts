import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUsage,summarizePairs,sameJson,runPaired,approvePairedReport,exportPairedRun} from '../packages/metrics/paired.ts';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
test('paired accounting: reasoning/cache never counted twice; unknown usage stays unknown',()=>{
 const codex=normalizeUsage('codex',[{type:'turn.completed',usage:{input_tokens:100,output_tokens:20,cached_input_tokens:70}}]);assert.equal(codex.usage!.total,120);assert.equal(codex.usage!.reasoning,null);
 const claude=normalizeUsage('claude-code',[{type:'result',result:'{}',usage:{input_tokens:100,output_tokens:20,cache_read_input_tokens:70,cache_creation_input_tokens:30},total_cost_usd:0.01}]);assert.equal(claude.usage!.total,220);
 const opencode=normalizeUsage('opencode',[{type:'step_finish',part:{tokens:{input:100,output:20,reasoning:10,cache:{read:70,write:30}}}},{type:'step_finish',part:{tokens:{input:5,output:5,reasoning:1,cache:{read:0,write:0}}}}]);assert.equal(opencode.usage!.total,241);assert.equal(opencode.usage!.reasoning,11);
 assert.equal(normalizeUsage('opencode',[]).usage,null);assert.equal(sameJson('{"b":2,"a":1}',{a:1,b:2}),true);assert.equal(sameJson('maybe',{a:1}),false);
 const partial=normalizeUsage('opencode',[{type:'step_finish',part:{tokens:{input:1,output:1,reasoning:0,cache:{read:0,write:0}}}},{type:'step_finish',part:{tokens:{input:1}}}]);assert.equal(partial.usage!.complete,false);
});
test('paired evidence approval is explicit, recomputed, strategy-bound; export includes reasoning inside output',()=>{
 const dir=mkdtempSync(join(tmpdir(),'veliq-paired-'));try{
  const u=(total:number)=>({input:total-10,output:8,reasoning:2,cacheRead:0,cacheWrite:0,total,complete:true,source:'harness-reported',costEstimateUsd:null});
  const rows=Array.from({length:5},(_,i)=>({id:'id-'+i,repeat:0,order:['baseline','candidate'],baseline:{correct:true,criticalViolation:false,exitCode:0,usage:u(100),latencyMs:10},candidate:{correct:true,criticalViolation:false,exitCode:0,usage:u(60),latencyMs:11,native:{applied:1,byStrategy:{'context-reference':1}}}}));
  // Synthetic unit evidence only. Never publish this as a real harness experiment.
  const report:any={version:'0.1',runId:'test-report',dataset:'test',datasetDigest:'sha256:'+'0'.repeat(64),harness:'opencode',harnessVersion:'1.18.33',model:'fixture/model',strategy:'context-reference',startedAt:'2026-09-29T00:00:00Z',rows,summary:{eligible:false},limitations:[]};
  const path=approvePairedReport(dir,report),g=JSON.parse(readFileSync(path,'utf8'));assert.equal(g.gates[0].model,'fixture/model');assert.equal(g.gates[0].passed,true);
  const exported=exportPairedRun(report);assert.equal(exported.baseline.output,50);assert.equal(exported.baseline.input,450);assert.equal(exported.candidate.input+exported.candidate.output,300);
  report.rows[0].candidate.usage.total=-1;assert.throws(()=>approvePairedReport(dir,report),/inválida/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('paired gate: missing usage, lost constraints, output growth and inactive hooks reject activation',()=>{
 const row={baseline:{correct:true,criticalViolation:false,exitCode:0,usage:{complete:true,total:100}},candidate:{correct:true,criticalViolation:false,exitCode:0,usage:{complete:true,total:60},native:{applied:1}}},rows=Array.from({length:5},()=>structuredClone(row));assert.equal(summarizePairs(rows).eligible,true);
 for(const change of [(r:any)=>r.candidate.correct=false,(r:any)=>r.candidate.criticalViolation=true,(r:any)=>r.candidate.usage=null,(r:any)=>r.candidate.usage.total=200,(r:any)=>r.candidate.native.applied=0]){const altered=structuredClone(rows);change(altered[0]);assert.equal(summarizePairs(altered).eligible,false)}
 assert.equal(summarizePairs(rows.slice(0,1)).eligible,false);
});
test('paired runner requires explicit external action and refuses unsupported Codex candidate',async()=>{
 await assert.rejects(runPaired({},false),/allow-external/);
 const manifest={version:'0.1',dataset:'test',harness:'codex',executable:'codex',model:'test',encoding:'o200k_base',strategy:'context-reference',repetitions:1,timeoutMs:1000,cases:[{id:'c1',prompt:'task',files:{'test.json':'{}'},protectedFiles:['test.json'],expectedJson:{}}]};
 await assert.rejects(runPaired(manifest,true),/no puede sustituir/);
});
