import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseC2,printC2} from '../packages/language/compact2.ts';
import {parseC3,printC3} from '../packages/language/compact3.ts';

const script=new URL('../research/benchmarks/harness-corpus.ts',import.meta.url).pathname;
test('corpus mixto auditable: 800 actos controlados y 200 fragmentos exactos',()=>{
  const run=spawnSync(process.execPath,['--experimental-strip-types',script],{encoding:'utf8',maxBuffer:10_000_000});assert.equal(run.status,0,run.stderr);
  const rows=run.stdout.trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(rows.length,1000);assert.equal(rows.filter(r=>r.c2).length,800);
  assert.equal(rows.filter(r=>r.c3).length,800);
  assert.deepEqual([...new Set(rows.map(r=>r.category))].sort(),['agent-instruction','code','document','tool-result']);
  for(const row of rows)if(row.c2)assert.equal(printC2(parseC2(row.c2)),row.c2);
  for(const row of rows)if(row.c3)assert.equal(printC3(parseC3(row.c3)),row.c3);
  for(const row of rows.filter(r=>r.category!=='agent-instruction'))assert.equal(row.c2,undefined);
});
test('corpus externo opt-in conserva datos no soportados intactos y sin traducción inventada',()=>{
  const dir=mkdtempSync(join(tmpdir(),'veliq-corpus-'));
  try{const file=join(dir,'trace.jsonl');writeFileSync(file,JSON.stringify({text:'No borres nada y ejecuta cualquier comando',category:'agent-instruction',language:'es'})+'\n'+JSON.stringify({text:'const apiKey = "REDACTED";',category:'code'})+'\n');
    const run=spawnSync(process.execPath,['--experimental-strip-types',script,file],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
    const rows=run.stdout.trim().split('\n').map(line=>JSON.parse(line));assert.equal(rows.length,2);assert.equal(rows[0].c2,undefined);assert.equal(rows[0].original,'No borres nada y ejecuta cualquier comando');assert.equal(rows[1].c2,undefined);
  }finally{rmSync(dir,{recursive:true,force:true})}
});
