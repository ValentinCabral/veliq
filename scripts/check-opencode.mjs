// Optional live V1 smoke test. A synthetic shell probe, no model request or API key.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {installOpenCodeObserver,connectOpenCode} from '../adapters/opencode/config.ts';
import {observationSummary} from '../packages/metrics/observations.mjs';
const executable=process.argv[2];if(!executable)throw Error('Uso: node scripts/check-opencode.mjs /ruta/opencode');
const version=spawnSync(executable,['--version'],{encoding:'utf8',timeout:10_000});
if(version.status!==0||!/^1\./.test(version.stdout.trim()))throw Error('Este smoke test exige OpenCode V1; V2 requiere otro adaptador');
const project=mkdtempSync(join(tmpdir(),'veliq-opencode-smoke-'));
let child;
try{
  connectOpenCode(project);installOpenCodeObserver(project);
  const environment={PATH:process.env.PATH,XDG_CONFIG_HOME:join(project,'xdg-config'),XDG_DATA_HOME:join(project,'xdg-data'),XDG_CACHE_HOME:join(project,'xdg-cache'),XDG_STATE_HOME:join(project,'xdg-state')};
  for(const name of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY'])if(process.env[name])environment[name]=process.env[name];
  child=spawn(resolve(executable),['serve','--hostname','127.0.0.1','--port','0'],{cwd:project,env:environment,stdio:['ignore','pipe','pipe']});
  const endpoint=await new Promise((done,fail)=>{
    const timer=setTimeout(()=>fail(Error('OpenCode no inició en 20 segundos')),20_000);let output='';
    child.on('exit',()=>{clearTimeout(timer);fail(Error('OpenCode terminó antes de iniciar'))});
    child.stdout.on('data',chunk=>{output+=chunk;const found=output.match(/listening on (http:\/\/127\.0\.0\.1:\d+)/);if(found){clearTimeout(timer);done(found[1])}});
    // Drain stderr without leaking runtime paths or environment in the report.
    child.stderr.resume();
  });
  const request=async(path,body)=>{const r=await fetch(endpoint+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25_000)});if(!r.ok)throw Error(`OpenCode ${path}: HTTP ${r.status}`);return r.json()};
  const session=await request('/session',{title:'VELIQ local observer smoke test'});
  const result=await request(`/session/${session.id}/shell`,{agent:'build',command:'printf veliq-observe-probe'});
  const preserved=JSON.stringify(result).includes('veliq-observe-probe');
  const observations=observationSummary(project);
  console.log(JSON.stringify({harness:'opencode',version:version.stdout.trim(),probe:'local synthetic shell command; no LLM call',outputPreserved:preserved,observations,hookVerified:preserved&&observations.observations>0},null,2));
  if(!preserved||observations.observations===0)process.exitCode=1;
}finally{
  if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(done=>{child.once('exit',done);setTimeout(()=>{child.kill('SIGKILL');done()},2000).unref()})}
  rmSync(project,{recursive:true,force:true});
}
