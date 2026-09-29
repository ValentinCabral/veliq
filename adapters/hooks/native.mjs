import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadNativeConfig,optimizeToolText,privateRead} from '../../packages/runtime/native.mjs';
import {createHash} from 'node:crypto';
import {openSync,closeSync,fstatSync,ftruncateSync,writeSync,mkdirSync,lstatSync,constants} from 'node:fs';
import {recordToolObservation} from '../../packages/metrics/observations.mjs';
export function transformHook(event,project,counter){
  if(typeof event?.cwd!=='string'||resolve(event.cwd)!==resolve(project)||typeof event.session_id!=='string')return null;
  const key=createHash('sha256').update(event.session_id).digest('hex');
  if(['SessionStart','PostModelSwitch'].includes(event.hook_event_name)){
    const model=event.hook_event_name==='SessionStart'?event.model:event.to_model;
    try{const home=join(project,'.veliq');mkdirSync(home,{recursive:true,mode:0o700});if(lstatSync(home).isSymbolicLink())return null;
      const fd=openSync(join(home,`claude-model-${key}.json`),constants.O_WRONLY|constants.O_CREAT|constants.O_NOFOLLOW,0o600);
      try{const s=fstatSync(fd);if(s.isFile()&&!(s.mode&0o077)){ftruncateSync(fd,0);writeSync(fd,JSON.stringify({model:typeof model==='string'?model:null}))}}finally{closeSync(fd)}
    }catch{}return null;
  }
  if(event.hook_event_name!=='PostToolUse'||event.agent_id)return null;
  const config=loadNativeConfig(project);if(!config)return null;
  const tool=event.tool_name,r=event.tool_response;
  try{recordToolObservation(project,'claude-code',tool,typeof r==='string'?r:JSON.stringify(r??null))}catch{}
  // Claude Bash schema is documented. Preserve stderr/errors/interrupted/image and all other fields.
  // Only configured JSON-output tools. No transcript access, dedup based on hidden history, or privilege changes.
  if(tool!=='Bash'||!r||typeof r!=='object'||typeof r.stdout!=='string'||r.stderr!==''||r.interrupted!==false||r.isImage!==false)return null;
  let model='';try{model=JSON.parse(privateRead(project,`claude-model-${key}.json`)).model??''}catch{}
  const d=optimizeToolText({project,harness:'claude-code',tool,text:r.stdout,config,model},counter);
  return d.applied?{hookSpecificOutput:{hookEventName:'PostToolUse',updatedToolOutput:{...r,stdout:d.text}}}:null;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  let input='';try{for await(const chunk of process.stdin){input+=chunk;if(input.length>1_100_000)process.exit(0)}const output=transformHook(JSON.parse(input),process.argv[2]);if(output)process.stdout.write(JSON.stringify(output))}catch{} // Fail open, no sensitive diagnostics.
}
