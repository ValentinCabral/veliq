import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {VeliqObserve} from '../adapters/opencode/observe.mjs';
test('hook V1 Observe registra bytes sin cambiar salida',async()=>{const dir=mkdtempSync(join(tmpdir(),'veliq-'));try{const p=await VeliqObserve({directory:dir});const out={output:'resultado exacto'};await p['tool.execute.after']({tool:'read'},out);assert.deepEqual(out,{output:'resultado exacto'});const db=new DatabaseSync(join(dir,'.veliq','opencode-observe.sqlite'));assert.equal((db.prepare('SELECT bytes FROM tool_observations').get() as {bytes:number}).bytes,Buffer.byteLength(out.output));db.close()}finally{rmSync(dir,{recursive:true,force:true})}});
