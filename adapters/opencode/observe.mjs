// Hook OpenCode V1: observación exclusivamente; no altera la salida.
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
export const VeliqObserve = async ({directory})=>{
  const home=join(directory,'.veliq');mkdirSync(home,{recursive:true});
  const db=new DatabaseSync(join(home,'opencode-observe.sqlite'));
  db.exec('CREATE TABLE IF NOT EXISTS tool_observations (at TEXT NOT NULL, tool TEXT NOT NULL, bytes INTEGER NOT NULL)');
  return {'tool.execute.after':async(input,output)=>{
    const body=typeof output?.output==='string'?output.output:'';
    db.prepare('INSERT INTO tool_observations VALUES (?,?,?)').run(new Date().toISOString(),String(input?.tool??'unknown'),Buffer.byteLength(body));
  }};
};
