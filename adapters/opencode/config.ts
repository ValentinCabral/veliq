import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync,statSync,lstatSync,unlinkSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';
const command=fileURLToPath(new URL('../../apps/cli/main.ts',import.meta.url));
function safePaths(dir:string){for(const path of [join(dir,'opencode.json'),join(dir,'.veliq'),join(dir,'.veliq','backups'),join(dir,'.opencode'),join(dir,'.opencode','plugins')])if(existsSync(path)&&lstatSync(path).isSymbolicLink())throw Error('Configuración o directorio enlazado: sin cambios');}
export function connectOpenCode(project=process.cwd()){
  const dir=resolve(project),target=join(dir,'opencode.json');
  safePaths(dir);
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
  safePaths(resolve(project));
  const target=join(resolve(project),'opencode.json');if(!existsSync(target))throw new Error('No existe opencode.json');
  const config=JSON.parse(readFileSync(target,'utf8')) as Record<string,unknown>,mcp=config.mcp as Record<string,unknown>;
  if(!mcp?.veliq)throw new Error('VELIQ no figura en opencode.json');
  const current=mcp.veliq as {command?:string[]};if(!current.command?.includes(command))throw new Error('Entrada veliq ajena o modificada: sin cambios');
  const backup=join(resolve(project),'.veliq','backups',`opencode.json.${Date.now()}-${randomUUID()}.bak`);mkdirSync(join(resolve(project),'.veliq','backups'),{recursive:true,mode:0o700});writeFileSync(backup,readFileSync(target),{mode:0o600,flag:'wx'});
  const copy={...mcp};delete copy.veliq;const next={...config,mcp:copy},temp=join(resolve(project),`.opencode.json.veliq-${process.pid}.tmp`);writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{mode:statSync(target).mode&0o777,flag:'wx'});renameSync(temp,target);return {target,backup};
}
const observerSource=fileURLToPath(new URL('./observe.mjs',import.meta.url));
const hash=(body:Buffer)=>createHash('sha256').update(body).digest('hex');
export function installOpenCodeObserver(project=process.cwd()){
  const dir=resolve(project),pluginDir=join(dir,'.opencode','plugins'),target=join(pluginDir,'veliq-observe.js');
  safePaths(dir);
  if(existsSync(target))throw new Error('Plugin VELIQ ya existe: no sobrescribir');
  const receipt=join(dir,'.veliq','opencode-observer.json');
  if(existsSync(receipt))throw new Error('Existe recibo del observador anterior: revisar antes de instalar');
  const metricsUrl=pathToFileURL(fileURLToPath(new URL('../../packages/metrics/observations.mjs',import.meta.url))).href;
  const body=Buffer.from(readFileSync(observerSource,'utf8').replace("'../../packages/metrics/observations.mjs'",JSON.stringify(metricsUrl)));mkdirSync(pluginDir,{recursive:true});mkdirSync(join(dir,'.veliq'),{recursive:true,mode:0o700});
  writeFileSync(target,body,{mode:0o600,flag:'wx'});
  try{writeFileSync(receipt,JSON.stringify({target,sha256:hash(body)}),{mode:0o600,flag:'wx'})}catch(e){unlinkSync(target);throw e}
  return {target,receipt,capture:'desactivada por defecto; VELIQ_CAPTURE_CONTENT=1 habilita JSONL local'};
}
export function uninstallOpenCodeObserver(project=process.cwd()){
  const dir=resolve(project),receipt=join(dir,'.veliq','opencode-observer.json'),target=join(dir,'.opencode','plugins','veliq-observe.js');
  safePaths(dir);for(const path of [receipt,target])if(existsSync(path)&&lstatSync(path).isSymbolicLink())throw Error('Recibo/plugin enlazado');
  if(!existsSync(receipt)||!existsSync(target))throw new Error('Plugin o recibo inexistente: sin cambios');
  const installed=JSON.parse(readFileSync(receipt,'utf8')) as {target:string;sha256:string};
  if(installed.target!==target||installed.sha256!==hash(readFileSync(target)))throw new Error('Plugin modificado: sin eliminar');
  unlinkSync(target);unlinkSync(receipt);return {removed:target};
}
