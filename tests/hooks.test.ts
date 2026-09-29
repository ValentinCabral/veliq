import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {installHookObserver,uninstallHookObserver} from '../adapters/hooks/config.ts';
import {observeHook} from '../adapters/hooks/observe.mjs';
import {observationSummary} from '../packages/metrics/observations.mjs';
test('hooks diarios: instalación conserva ajustes y desinstala sólo la entrada propia',()=>{
 for(const harness of ['codex','claude-code'] as const){const dir=mkdtempSync(join(tmpdir(),'veliq-hook-'));
  try{const folder=join(dir,harness==='codex'?'.codex':'.claude');mkdirSync(folder);const target=join(folder,harness==='codex'?'hooks.json':'settings.local.json');
   const other={matcher:'Write',hooks:[{type:'command',command:'other-tool'}]};writeFileSync(target,JSON.stringify({theme:'keep',hooks:{PostToolUse:[other]}}));
   const installed=installHookObserver(harness,dir);assert.equal(installed.mode,'observe');assert.equal(installed.tokenSavings,false);assert.ok(installed.backup);
   let config=JSON.parse(readFileSync(target,'utf8'));assert.equal(config.theme,'keep');assert.deepEqual(config.hooks.PostToolUse[0],other);assert.equal(config.hooks.PostToolUse.length,2);assert.throws(()=>installHookObserver(harness,dir));
   const original=readFileSync(target);config.hooks.PostToolUse[1].matcher='changed';writeFileSync(target,JSON.stringify(config));assert.throws(()=>uninstallHookObserver(harness,dir),/modificado/);writeFileSync(target,original);
   uninstallHookObserver(harness,dir);config=JSON.parse(readFileSync(target,'utf8'));assert.deepEqual(config.hooks.PostToolUse,[other]);assert.equal(config.theme,'keep');
  }finally{rmSync(dir,{recursive:true,force:true})}
 }
});
test('receptor stdio real: stdout vacío, ninguna inyección, sólo metadatos locales',()=>{
 const dir=mkdtempSync(join(tmpdir(),'veliq-hook-'));try{
  const hook=new URL('../adapters/hooks/observe.mjs',import.meta.url).pathname;
  const event={hook_event_name:'PostToolUse',cwd:dir,tool_name:'Bash',tool_response:{stdout:'SECRET: no registrar',stderr:'',interrupted:false},tool_input:{command:'no ejecutar'},transcript_path:'/no/leer'};
  for(const harness of ['codex','claude-code']){const run=spawnSync(process.execPath,[hook,harness,dir],{input:JSON.stringify(event),encoding:'utf8'});assert.equal(run.status,0);assert.equal(run.stdout,'')}
  const summary=observationSummary(dir);assert.equal(summary.observations,2);assert.equal(summary.savedBytes,0);assert.deepEqual(summary.byHarness,{codex:1,'claude-code':1});
  const log=readFileSync(join(dir,'.veliq','observations.jsonl'),'utf8');assert.equal(log.includes('SECRET'),false);assert.equal(log.includes('no ejecutar'),false);
  assert.equal(observeHook({...event,cwd:tmpdir()},'codex',dir),false);assert.equal(observeHook({...event,hook_event_name:'PreToolUse'},'codex',dir),false);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('observación falla abierta ante archivos enlazados sin escribir fuera del proyecto',()=>{
 const dir=mkdtempSync(join(tmpdir(),'veliq-hook-'));try{mkdirSync(join(dir,'.veliq'));const outside=join(dir,'untouched');writeFileSync(outside,'keep');symlinkSync(outside,join(dir,'.veliq','observations.jsonl'));
  const hook=new URL('../adapters/hooks/observe.mjs',import.meta.url).pathname;
  const run=spawnSync(process.execPath,[hook,'codex',dir],{input:JSON.stringify({hook_event_name:'PostToolUse',cwd:dir,tool_name:'Bash',tool_response:'data'}),encoding:'utf8'});assert.equal(run.status,0);assert.equal(run.stdout,'');assert.equal(readFileSync(outside,'utf8'),'keep');assert.equal(observationSummary(dir).errors,1);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
