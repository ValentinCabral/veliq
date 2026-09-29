import {mkdirSync,lstatSync,openSync,closeSync,writeSync,readFileSync,fstatSync,constants} from 'node:fs';
import {join} from 'node:path';
const maximum=10_000_000;
const harnesses=new Set(['opencode','codex','claude-code']);
/** Local metadata only. No prompts, output bodies, paths, session IDs, network or model context. */
export function recordToolObservation(project,harness,tool,body){
  if(!harnesses.has(harness)||typeof body!=='string')return false;
  const home=join(project,'.veliq');mkdirSync(home,{recursive:true,mode:0o700});
  if(lstatSync(home).isSymbolicLink())throw Error('Directorio de observación enlazado');
  const target=join(home,'observations.jsonl'),fd=openSync(target,constants.O_WRONLY|constants.O_CREAT|constants.O_APPEND|constants.O_NOFOLLOW,0o600);
  try{
    const stat=fstatSync(fd);if(!stat.isFile()||(stat.mode&0o077)!==0||stat.size>=maximum)return false;
    const row={version:'0.1',at:new Date().toISOString(),harness,mode:'observe',tool:typeof tool==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(tool)?tool:'unknown',countKind:'local-bytes',originalBytes:Buffer.byteLength(body),optimizedBytes:Buffer.byteLength(body),savedBytes:0};
    writeSync(fd,JSON.stringify(row)+'\n');return true;
  }finally{closeSync(fd)}
}
export function observationSummary(project){
  const empty={mode:'observe',countKind:'local-bytes',observations:0,originalBytes:0,savedBytes:0,byHarness:{},errors:0};
  const home=join(project,'.veliq'),target=join(home,'observations.jsonl');
  let fd;
  try{
    if(lstatSync(home).isSymbolicLink())return {...empty,errors:1};
    fd=openSync(target,constants.O_RDONLY|constants.O_NOFOLLOW);
    const stat=fstatSync(fd);if(!stat.isFile()||stat.size>maximum+4096||(stat.mode&0o077)!==0)return {...empty,errors:1};
    for(const line of readFileSync(fd,'utf8').split('\n').filter(Boolean))try{
      const row=JSON.parse(line);
      if(row.version!=='0.1'||row.mode!=='observe'||row.countKind!=='local-bytes'||!harnesses.has(row.harness)||!Number.isSafeInteger(row.originalBytes)||row.originalBytes<0||row.optimizedBytes!==row.originalBytes||row.savedBytes!==0)throw Error('Registro inválido');
      empty.observations++;empty.originalBytes+=row.originalBytes;empty.byHarness[row.harness]=(empty.byHarness[row.harness]??0)+1;
    }catch{empty.errors++}
  }catch(e){if(e.code!=='ENOENT')empty.errors++}finally{if(fd!==undefined)closeSync(fd)}
  return empty;
}
