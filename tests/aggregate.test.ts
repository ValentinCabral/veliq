import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aggregateCases} from '../packages/metrics/aggregate.ts';
const row={case_id:'a',baseline:{input:12,output:3,overhead:0,retries:0,correct:true,critical_violation:false},candidate:{input:10,output:3,overhead:5,retries:1,correct:false,critical_violation:true}};
const meta={run_id:'test-1',harness:'opencode',harness_version:'1',model:'m',model_version:'1',dataset:'d',dataset_bytes:Buffer.from('dataset'),count_kind:'provider-reported' as const,started_at:'2026-09-29T15:00:00-03:00'};
test('agregación conserva veredictos, overhead, reintentos y hash del corpus',()=>{const x=aggregateCases([row],meta);assert.equal(x.cases,1);assert.equal(x.correct_candidate,0);assert.equal(x.critical_violations,1);assert.equal(x.candidate.overhead,5);assert.equal(x.candidate.retries,1);assert.match(x.dataset_digest,/^sha256:[a-f0-9]{64}$/)});
test('casos duplicados o sin veredicto fallan',()=>{assert.throws(()=>aggregateCases([row,row],meta));assert.throws(()=>aggregateCases([{...row,candidate:{...row.candidate,correct:undefined}}] as any,meta))});
