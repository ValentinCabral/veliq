import {existsSync,readFileSync,writeFileSync,mkdirSync,lstatSync,unlinkSync,openSync,fstatSync,ftruncateSync,closeSync,writeSync,constants} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {z} from 'zod';
export const nativeConfigSchema=z.object({version:z.literal('0.1'),mode:z.enum(['observe','hybrid','research']),model:z.string().min(1).max(256),encoding:z.enum(['cl100k_base','o200k_base']),jsonTools:z.array(z.string().regex(/^[A-Za-z0-9_.:-]+$/)).max(50),strategies:z.array(z.enum(['json-whitespace','context-reference'])).max(2)}).strict();
export function privateWrite(project:string,name:string,value:unknown,replace=false){
  const home=join(resolve(project),'.veliq'),target=join(home,name);mkdirSync(home,{recursive:true,mode:0o700});
  if(lstatSync(home).isSymbolicLink()||existsSync(target)&&(lstatSync(target).isSymbolicLink()||!replace))throw Error('Archivo enlazado o existente: sin sobrescribir');
  if(existsSync(target)&&lstatSync(target).mode&0o077)throw Error('Archivo no privado');
  const fd=openSync(target,constants.O_WRONLY|constants.O_CREAT|constants.O_NOFOLLOW|(replace?0:constants.O_EXCL),0o600);
  try{const s=fstatSync(fd);if(!s.isFile()||s.mode&0o077)throw Error('Archivo no privado');ftruncateSync(fd,0);writeSync(fd,JSON.stringify(value,null,2)+'\n')}finally{closeSync(fd)}return target;
}
export function installOpenCodeNative(project=process.cwd()){
  const dir=resolve(project),folder=join(dir,'.opencode','plugins'),target=join(folder,'veliq-native.js'),receipt=join(dir,'.veliq','opencode-native.json');
  for(const path of [join(dir,'.opencode'),folder,join(dir,'.veliq')])if(existsSync(path)&&lstatSync(path).isSymbolicLink())throw Error('Directorio enlazado');
  if(existsSync(target)||existsSync(receipt))throw Error('Plugin nativo ya instalado');
  const source=pathToFileURL(fileURLToPath(new URL('../../adapters/opencode/native.mjs',import.meta.url))).href;
  const body=`export {VeliqNative} from ${JSON.stringify(source)};\n`;mkdirSync(folder,{recursive:true,mode:0o700});writeFileSync(target,body,{mode:0o600,flag:'wx'});
  try{privateWrite(dir,'opencode-native.json',{target,hash:createHash('sha256').update(body).digest('hex')})}catch(e){unlinkSync(target);throw e}
  return {target,mode:'observe until configured',automatic:true,api:'OpenCode V1 1.18.33; V2 not compatible'};
}
export function uninstallOpenCodeNative(project=process.cwd()){
  const dir=resolve(project),receipt=join(dir,'.veliq','opencode-native.json'),target=join(dir,'.opencode','plugins','veliq-native.js');
  for(const path of [join(dir,'.veliq'),receipt,join(dir,'.opencode'),dirname(target),target])if(lstatSync(path).isSymbolicLink())throw Error('Archivo enlazado');
  const r=JSON.parse(readFileSync(receipt,'utf8'));if(r.target!==target||r.hash!==createHash('sha256').update(readFileSync(target)).digest('hex'))throw Error('Plugin modificado');
  unlinkSync(target);unlinkSync(receipt);return {removed:target};
}
