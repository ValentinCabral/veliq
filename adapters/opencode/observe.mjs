// Hook OpenCode V1: observación exclusivamente; no altera la salida.
import {recordToolObservation} from '../../packages/metrics/observations.mjs';
import {mkdirSync,lstatSync} from 'node:fs';
import {openSync,closeSync,writeSync,fstatSync,constants} from 'node:fs';
import {join} from 'node:path';
export const VeliqObserve = async ({directory})=>{
  const home=join(directory,'.veliq');
  return {'tool.execute.after':async(input,output)=>{
    const body=typeof output?.output==='string'?output.output:'';
    // Observer failures must not change or abort an operational tool result.
    try{recordToolObservation(directory,'opencode',input?.tool,body)}catch{}
    // Explicit local capture only. Untrusted tool output can contain secrets: private file, no network.
    try{if(process.env.VELIQ_CAPTURE_CONTENT==='1'&&body&&body.length<=100_000){
      mkdirSync(home,{recursive:true,mode:0o700});if(lstatSync(home).isSymbolicLink())return;
      const target=join(home,'harness-trace.jsonl');
      const flags=constants.O_WRONLY|constants.O_CREAT|constants.O_APPEND|constants.O_NOFOLLOW;
      const fd=openSync(target,flags,0o600);
      try{const stat=fstatSync(fd);if(stat.isFile()&&(stat.mode&0o077)===0&&stat.size<10_000_000)writeSync(fd,JSON.stringify({category:'tool-result',text:body})+'\n')}finally{closeSync(fd)}
    }}catch{}
  }};
};
