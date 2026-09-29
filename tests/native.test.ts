import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,symlinkSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {stripJsonWhitespace,optimizeToolText,nativeSummary,type NativeConfig} from '../packages/runtime/native.mjs';
import {privateWrite,installOpenCodeNative,uninstallOpenCodeNative} from '../packages/runtime/install.ts';
import {VeliqNative} from '../adapters/opencode/native.mjs';
import {transformHook} from '../adapters/hooks/native.mjs';
import {installHookObserver,uninstallHookObserver} from '../adapters/hooks/config.ts';
const config:NativeConfig={version:'0.1',mode:'hybrid',model:'fixture/model',encoding:'o200k_base',jsonTools:['read','Bash'],strategies:['context-reference']};
const counter=(texts:string[])=>texts.map(s=>Buffer.byteLength(s)); // Deliberate deterministic unit counter, not measured LLM tokens.
function gates(dir:string,harness='opencode'){privateWrite(dir,'native-gates.json',{version:'0.1',gates:['context-reference','json-whitespace'].map(strategy=>({harness,model:config.model,strategy,passed:true,cases:5,criticalViolations:0,reportDigest:'sha256:'+'0'.repeat(64)}))})}
test('JSON lexical: escapes, unicode, duplicate keys and big numbers remain exact; malformed/code unchanged',()=>{
 const s=' { "x": 12345678901234567890123, "x": 1e+03, "n": -0, "safe": "No borrar  /ruta original\\n ni \\"salir\\"" } ';
 const result=stripJsonWhitespace(s);assert.equal(result,'{"x":12345678901234567890123,"x":1e+03,"n":-0,"safe":"No borrar  /ruta original\\n ni \\"salir\\""}');assert.deepEqual(JSON.parse(result),JSON.parse(s));
 for(let i=0;i<1000;i++){const data={id:i,no:false,text:'路径 \\"\n NO cambiar  cantidades '+i,list:[null,-0,1e20]},source=JSON.stringify(data,null,2);assert.deepEqual(JSON.parse(stripJsonWhitespace(source)),JSON.parse(source))}
 for(const text of ['{bad json}','const x = 5;','No eliminar originales.'])assert.equal(stripJsonWhitespace(text),text);
});
test('native: no gates, Observe, model mismatch, no saving and failed tokenizer preserve original',()=>{
 const dir=mkdtempSync(join(tmpdir(),'veliq-native-'));try{privateWrite(dir,'native.json',config);const text='data '.repeat(500),input={project:dir,harness:'opencode',tool:'read',text,config,model:config.model,reference:{original:text,callID:'call-1'}};
  assert.equal(optimizeToolText(input,counter).text,text);gates(dir);assert.equal(optimizeToolText({...input,config:{...config,mode:'observe'}},counter).text,text);assert.equal(optimizeToolText({...input,model:'other'},counter).text,text);assert.equal(optimizeToolText(input,()=>{throw Error('missing')}).text,text);assert.equal(optimizeToolText(input,()=>[1,2]).text,text);
  assert.equal(optimizeToolText(input,counter).applied,true);assert.match(optimizeToolText(input,counter).text,/call-1/);const log=readFileSync(join(dir,'.veliq/native-metrics.jsonl'),'utf8');assert.equal(log.includes(text),false);assert.equal(log.includes('call-1'),false);
  assert.ok(nativeSummary(dir).applied>=1);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('OpenCode context hook keeps exact anchor, constraints and tool inputs; never uses missing history',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'veliq-native-'));try{privateWrite(dir,'native.json',config);gates(dir);
  // No installed tiktoken is required by the unit suite: Observe tests actual hook; optimizer reference tested above.
  const hooks=await VeliqNative({directory:dir}),text='NO delete /original. '.repeat(300);
  const make=(id:string)=>({type:'tool',callID:id,tool:'read',state:{status:'completed',input:{filePath:'/same'},output:text,time:{start:1,end:2}}});
  const context={messages:[{info:{role:'user',model:{providerID:'fixture',modelID:'model'}},parts:[{type:'text',text:'Instrucción original'}]},{info:{role:'assistant'},parts:[make('c1'),make('c2')]}]},original=structuredClone(context);
  privateWrite(dir,'native.json',{...config,mode:'observe'},true);await hooks['experimental.chat.messages.transform']({},context);assert.deepEqual(context,original);
  const single={messages:[original.messages[0],{info:{role:'assistant'},parts:[make('c2')]}]};await hooks['experimental.chat.messages.transform']({},single);assert.equal((single.messages[1].parts[0] as ReturnType<typeof make>).state.output,text);
  const installed=installOpenCodeNative(dir);assert.match(readFileSync(installed.target,'utf8'),/VeliqNative/);uninstallOpenCodeNative(dir);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('Claude native: session model tracking, supported output schema, unchanged stderr and no privilege injection',()=>{
 const dir=mkdtempSync(join(tmpdir(),'veliq-native-'));try{privateWrite(dir,'native.json',{...config,strategies:['json-whitespace']});gates(dir,'claude-code');installHookObserver('claude-code',dir,true);
  const event={cwd:dir,session_id:'s',hook_event_name:'PostToolUse',tool_name:'Bash',tool_response:{stdout:JSON.stringify({secret:'do not log',noDelete:true},null,4),stderr:'',interrupted:false,isImage:false}};
  assert.equal(transformHook(event,dir,counter),null);transformHook({...event,hook_event_name:'SessionStart',model:config.model},dir,counter);
  const result=transformHook(event,dir,counter);assert.ok(result);assert.deepEqual(JSON.parse(result!.hookSpecificOutput.updatedToolOutput.stdout),{secret:'do not log',noDelete:true});assert.equal('additionalContext' in result!.hookSpecificOutput,false);
  assert.equal(transformHook({...event,tool_response:{...event.tool_response,stderr:'failure'}},dir,counter),null);transformHook({...event,hook_event_name:'PostModelSwitch',to_model:'other'},dir,counter);assert.equal(transformHook(event,dir,counter),null);uninstallHookObserver('claude-code',dir,true);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
