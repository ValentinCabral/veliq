import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const command=fileURLToPath(new URL('../../apps/cli/main.ts',import.meta.url));
export function connectOpenCode(project=process.cwd()){
  const dir=resolve(project),target=join(dir,'opencode.json');
  if(existsSync(join(dir,'opencode.jsonc')))throw new Error('Existe opencode.jsonc; editá ese archivo manualmente para preservar sus comentarios y precedencia');
  let config:Record<string,unknown>={};if(existsSync(target)){try{config=JSON.parse(readFileSync(target,'utf8'))}catch{throw new Error('opencode.json no es JSON válido: sin cambios')}}
  if(!config||typeof config!=='object'||Array.isArray(config))throw new Error('Configuración inválida');
  const mcp=(config.mcp??{}) as Record<string,unknown>;if(!mcp||typeof mcp!=='object'||Array.isArray(mcp))throw new Error('mcp inválido');
  if(mcp.veliq)throw new Error('Ya existe una entrada veliq: sin sobrescribir');
  const entry={type:'local',command:[process.execPath,'--experimental-strip-types',command,'mcp'],enabled:true,environment:{VELIQ_HOME:join(dir,'.veliq')}};
  const backups=join(dir,'.veliq','backups');mkdirSync(backups,{recursive:true,mode:0o700});let backup:string|undefined;
  if(existsSync(target)){backup=join(backups,`opencode.json.${Date.now()}-${randomUUID()}.bak`);writeFileSync(backup,readFileSync(target),{mode:0o600,flag:'wx'})}
  const next={...config,mcp:{...mcp,veliq:entry}},temp=join(dir,`.opencode.json.veliq-${process.pid}.tmp`);
  try{writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{mode:existsSync(target)?statSync(target).mode&0o777:0o600,flag:'wx'});renameSync(temp,target)}catch(e){throw e}
  return {target,backup,entry};
}
export function disconnectOpenCode(project=process.cwd()){
  const target=join(resolve(project),'opencode.json');if(!existsSync(target))throw new Error('No existe opencode.json');
  const config=JSON.parse(readFileSync(target,'utf8')) as Record<string,unknown>,mcp=config.mcp as Record<string,unknown>;
  if(!mcp?.veliq)throw new Error('VELIQ no figura en opencode.json');
  const current=mcp.veliq as {command?:string[]};if(!current.command?.includes(command))throw new Error('Entrada veliq ajena o modificada: sin cambios');
  const backup=join(resolve(project),'.veliq','backups',`opencode.json.${Date.now()}-${randomUUID()}.bak`);mkdirSync(join(resolve(project),'.veliq','backups'),{recursive:true,mode:0o700});writeFileSync(backup,readFileSync(target),{mode:0o600,flag:'wx'});
  const copy={...mcp};delete copy.veliq;const next={...config,mcp:copy},temp=join(resolve(project),`.opencode.json.veliq-${process.pid}.tmp`);writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{mode:statSync(target).mode&0o777,flag:'wx'});renameSync(temp,target);return {target,backup};
}
