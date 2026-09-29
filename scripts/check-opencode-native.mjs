// Real OpenCode binary + deterministic local mock model endpoint. Tests hook plumbing, NOT LLM comprehension/savings.
import {createServer} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {installOpenCodeNative,privateWrite} from '../packages/runtime/install.ts';
import {nativeSummary} from '../packages/runtime/native.mjs';
const executable=process.argv[2];if(!executable)throw Error('Uso: node scripts/check-opencode-native.mjs /ruta/opencode');
const version=spawnSync(executable,['--version'],{encoding:'utf8',timeout:5000}).stdout.trim();if(version!=='1.18.33')throw Error('Smoke fijado a OpenCode 1.18.33');
const project=mkdtempSync(join(tmpdir(),'veliq-native-live-')),path=join(project,'fixture.json');
const fixture=JSON.stringify({constraints:['NO eliminar originales','No modificar cantidad ni destino'],quantity:7,destination:'local',records:Array.from({length:100},(_,i)=>({id:i,body:'Dato exacto público de prueba '+i}))},null,2);
let child,requests=0,references=0,originals=0,report;
const server=createServer(async(req,res)=>{try{
  let data='';for await(const c of req)data+=c;const body=JSON.parse(data),tools=body.messages?.filter(m=>m.role==='tool')??[];
  requests++;references+=tools.filter(m=>JSON.stringify(m.content).includes('[VELIQ: identical tool data')).length;originals+=tools.filter(m=>JSON.stringify(m.content).includes('NO eliminar originales')).length;
  const main=body.tools?.some(t=>t.function?.name==='read')&&body.messages?.some(m=>JSON.stringify(m.content).includes('VELIQ_NATIVE_PROBE'));
  const calls=main&&tools.length===0?Array.from({length:2},(_,i)=>({index:i,id:`probe_call_${i}`,type:'function',function:{name:'read',arguments:JSON.stringify({filePath:path})}})):null;
  res.writeHead(200,{'content-type':'text/event-stream'});
  const chunk=(delta,finish_reason=null)=>res.write('data: '+JSON.stringify({id:'local-probe',object:'chat.completion.chunk',created:1,model:'probe',choices:[{index:0,delta,finish_reason}]})+'\n\n');
  if(calls){chunk({role:'assistant',tool_calls:calls});chunk({},'tool_calls')}else{chunk({role:'assistant',content:main?'Prueba local completada en español.':'Prueba VELIQ'});chunk({},'stop')}
  res.end('data: [DONE]\n\n');
 }catch{res.writeHead(500);res.end()}}).listen(0,'127.0.0.1');
await new Promise(done=>server.on('listening',done));
try{
  writeFileSync(path,fixture);spawnSync('git',['init','-q'],{cwd:project});installOpenCodeNative(project);
  privateWrite(project,'native.json',{version:'0.1',mode:'research',model:'veliq-probe/probe',encoding:'o200k_base',jsonTools:['read'],strategies:['context-reference']});
  writeFileSync(join(project,'opencode.json'),JSON.stringify({$schema:'https://opencode.ai/config.json',provider:{'veliq-probe':{npm:'@ai-sdk/openai-compatible',name:'VELIQ local mock',options:{baseURL:`http://127.0.0.1:${server.address().port}/v1`,apiKey:'local-mock-not-a-credential'},models:{probe:{name:'probe',limit:{context:100_000,output:2048}}}}}}));
  const env={PATH:process.env.PATH,PYTHONPATH:process.env.PYTHONPATH,TIKTOKEN_CACHE_DIR:process.env.TIKTOKEN_CACHE_DIR,VELIQ_RESEARCH_WORKSPACE:project,XDG_CONFIG_HOME:join(project,'config'),XDG_DATA_HOME:join(project,'data'),XDG_CACHE_HOME:join(project,'cache'),XDG_STATE_HOME:join(project,'state'),OPENCODE_DISABLE_MODELS_FETCH:'true',OPENCODE_DISABLE_DEFAULT_PLUGINS:'true',OPENCODE_DISABLE_AUTOUPDATE:'true'};
  for(const name of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY'])if(process.env[name])env[name]=process.env[name];
  child=spawn(resolve(executable),['run','--print-logs','--format','json','--title','VELIQ native smoke','--model','veliq-probe/probe','VELIQ_NATIVE_PROBE: Lee fixture.json dos veces. No modificar archivos. Respondé en español.'],{cwd:project,env,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>{if(stderr.length<8000)stderr+=c});
  const code=await new Promise(done=>{const timer=setTimeout(()=>{child.kill('SIGTERM');done(-1)},45_000);child.on('close',code=>{clearTimeout(timer);done(code)});child.on('error',()=>{clearTimeout(timer);done(-1)})});
  const native=nativeSummary(project);report={harness:'opencode',version,endpoint:'deterministic loopback mock; no external LLM',requests,referenceMarkersReceived:references,exactAnchorsReceived:originals,protectedFileUnchanged:readFileSync(path,'utf8')===fixture,finalSpanish:stdout.includes('Prueba local completada en español.'),native,hookVerified:code===0&&references>0&&originals>0&&native.applied>0,providerSavings:null};
  console.log(JSON.stringify(report,null,2));if(!report.hookVerified){console.error(stderr);console.error(stdout.slice(-4000));process.exitCode=1}
}finally{if(child&&child.exitCode===null)child.kill('SIGKILL');server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(project,{recursive:true,force:true})}
