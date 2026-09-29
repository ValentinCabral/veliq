import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync,lstatSync,unlinkSync,statSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
type Harness='codex'|'claude-code';
const receiver=fileURLToPath(new URL('./observe.mjs',import.meta.url));
const quote=(text:string)=>"'"+text.replaceAll("'","'\"'\"'")+"'";
function locations(harness:Harness,project:string){
  const dir=resolve(project),configDir=join(dir,harness==='codex'?'.codex':'.claude');
  for(const path of [join(dir,'.veliq'),join(dir,'.veliq','backups')])if(existsSync(path)&&lstatSync(path).isSymbolicLink())throw Error('Directorio VELIQ enlazado: sin cambios');
  if(existsSync(configDir)&&lstatSync(configDir).isSymbolicLink())throw Error('Directorio de configuración enlazado: sin cambios');
  return {dir,target:join(configDir,harness==='codex'?'hooks.json':'settings.local.json'),receipt:join(dir,'.veliq',`${harness}-observer.json`)};
}
function read(target:string):Record<string,any>{
  if(existsSync(target)&&lstatSync(target).isSymbolicLink())throw Error('Configuración enlazada: sin cambios');
  const config=existsSync(target)?JSON.parse(readFileSync(target,'utf8')):{};
  if(!config||typeof config!=='object'||Array.isArray(config)||config.hooks&&(!config.hooks||typeof config.hooks!=='object'||Array.isArray(config.hooks)))throw Error('Configuración inválida');
  if(config.hooks?.PostToolUse!==undefined&&!Array.isArray(config.hooks.PostToolUse))throw Error('PostToolUse inválido');
  return config;
}
function write(target:string,config:Record<string,any>,project:string){
  const backups=join(project,'.veliq','backups');mkdirSync(backups,{recursive:true,mode:0o700});
  const backup=existsSync(target)?join(backups,`hooks.${Date.now()}-${randomUUID()}.bak`):undefined;
  if(backup)writeFileSync(backup,readFileSync(target),{flag:'wx',mode:0o600});
  mkdirSync(dirname(target),{recursive:true,mode:0o700});
  const temp=`${target}.veliq-${randomUUID()}.tmp`;
  writeFileSync(temp,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:existsSync(target)?statSync(target).mode&0o777:0o600});renameSync(temp,target);
  return backup;
}
export function installHookObserver(harness:Harness,project=process.cwd(),native=false){
  if(native&&harness!=='claude-code')throw Error('Codex no admite updatedToolOutput: usar Observe o herramientas MCP');
  if(harness==='codex'&&process.platform==='win32')throw Error('Instalador Codex shell sólo verificado en POSIX; usar configuración manual en Windows');
  const location=locations(harness,project),{dir,target}=location,receipt=native?join(dir,'.veliq','claude-code-native.json'):location.receipt,config=read(target);
  if(existsSync(receipt))throw Error('Observador ya instalado: sin sobrescribir');
  const nativeReceiver=fileURLToPath(new URL('./native.mjs',import.meta.url));
  const handler=harness==='claude-code'?{type:'command',command:process.execPath,args:native?[nativeReceiver,dir]:[receiver,harness,dir],timeout:4}:{type:'command',command:[process.execPath,receiver,harness,dir].map(quote).join(' '),timeout:3};
  const group={matcher:harness==='codex'?'.*':'*',hooks:[handler]};
  const prior=config.hooks?.PostToolUse??[];
  if(prior.some((x:any)=>JSON.stringify(x)===JSON.stringify(group)))throw Error('Hook idéntico ya configurado');
  const next={...config,hooks:{...config.hooks,PostToolUse:[...prior,group]}};
  const groups:Record<string,unknown>={PostToolUse:group};
  if(native)for(const event of ['SessionStart','PostModelSwitch']){
    const tracking={hooks:[handler]};if(config.hooks?.[event]!==undefined&&!Array.isArray(config.hooks[event]))throw Error('Hook inválido');
    next.hooks[event]=[...(config.hooks?.[event]??[]),tracking];groups[event]=tracking;
  }
  mkdirSync(dirname(receipt),{recursive:true,mode:0o700});
  writeFileSync(receipt,JSON.stringify({target,group,...(native?{groups}:{})}),{flag:'wx',mode:0o600});
  let backup;try{backup=write(target,next,dir)}catch(e){unlinkSync(receipt);throw e}
  return {target,backup,mode:'observe',automaticAfterTrust:true,tokenSavings:false,native,trust:harness==='codex'?'Revisar y confiar en /hooks; nunca se evita esa aprobación':'Revisar /hooks y reiniciar la sesión'};
}
export function uninstallHookObserver(harness:Harness,project=process.cwd(),native=false){
  const location=locations(harness,project),{dir,target}=location,receipt=native?join(dir,'.veliq','claude-code-native.json'):location.receipt;
  if(!existsSync(receipt)||lstatSync(receipt).isSymbolicLink())throw Error('Recibo inexistente o enlazado: sin cambios');
  const installed=JSON.parse(readFileSync(receipt,'utf8')),config=read(target);
  if(installed.target!==target)throw Error('Recibo incompatible: sin cambios');
  const prior=config.hooks?.PostToolUse??[],matches=prior.filter((x:any)=>JSON.stringify(x)===JSON.stringify(installed.group));
  if(matches.length!==1)throw Error('Hook modificado o ausente: sin eliminar');
  const next={...config,hooks:{...config.hooks,PostToolUse:prior.filter((x:any)=>JSON.stringify(x)!==JSON.stringify(installed.group))}};
  if(native)for(const [event,group] of Object.entries(installed.groups)){
    const entries=config.hooks?.[event]??[];if(!Array.isArray(entries)||entries.filter((x:any)=>JSON.stringify(x)===JSON.stringify(group)).length!==1)throw Error('Hook modificado');
    next.hooks[event]=entries.filter((x:any)=>JSON.stringify(x)!==JSON.stringify(group));
  }
  const backup=write(target,next,dir);unlinkSync(receipt);return {target,backup,removed:'sólo el hook VELIQ; observaciones conservadas'};
}
