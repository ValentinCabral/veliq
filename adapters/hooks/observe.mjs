import {resolve,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {recordToolObservation} from '../../packages/metrics/observations.mjs';
export function observeHook(event,harness,project){
  if(!['codex','claude-code'].includes(harness)||event?.hook_event_name!=='PostToolUse')return false;
  const cwd=typeof event.cwd==='string'?relative(resolve(project),resolve(event.cwd)):'..';
  if(cwd==='..'||cwd.startsWith('../')||cwd.startsWith('..\\')||isAbsolute(cwd))return false;
  // Never open transcript_path, inspect tool_input, or emit model-visible instructions.
  return recordToolObservation(project,harness,event.tool_name,JSON.stringify(event.tool_response??null));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const [harness,project]=process.argv.slice(2);
  try{
    let text='';for await(const chunk of process.stdin){text+=chunk;if(Buffer.byteLength(text)>2_000_000)throw Error('Evento demasiado grande')}
    observeHook(JSON.parse(text),harness,resolve(project));
  }catch{process.stderr.write('VELIQ Observe: no se registró este evento; se conserva el resultado original.\n')}
  // Exit 0 and empty stdout: no blocking decision, rewritten input, extra context or permissions.
}
