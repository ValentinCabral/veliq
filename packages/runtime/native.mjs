// Shared, fail-open native transforms. Never rewrite prompts, permissions or tool inputs.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {openSync,closeSync,fstatSync,readFileSync,writeSync,mkdirSync,lstatSync,constants} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../../scripts/count-tokens.py',import.meta.url));
const maxBytes=1_000_000;
const hash=s=>createHash('sha256').update(s).digest('hex');
export function privateRead(project,name,limit=maxBytes){
  const home=join(project,'.veliq');if(lstatSync(home).isSymbolicLink())throw Error('Directorio enlazado');
  const fd=openSync(join(home,name),constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const st=fstatSync(fd);if(!st.isFile()||(st.mode&0o077)||st.size>limit)throw Error('Archivo inseguro o excesivo');return readFileSync(fd,'utf8')}finally{closeSync(fd)}
}
export function auditNative(project,row){
  const home=join(project,'.veliq');mkdirSync(home,{recursive:true,mode:0o700});if(lstatSync(home).isSymbolicLink())throw Error('Directorio enlazado');
  const fd=openSync(join(home,'native-metrics.jsonl'),constants.O_WRONLY|constants.O_CREAT|constants.O_APPEND|constants.O_NOFOLLOW,0o600);
  try{const st=fstatSync(fd);if(!st.isFile()||(st.mode&0o077)||st.size>10_000_000)return;writeSync(fd,JSON.stringify({version:'0.1',at:new Date().toISOString(),...row})+'\n')}finally{closeSync(fd)}
}
export function nativeSummary(project){
  const out={events:0,applied:0,originalTokens:0,optimizedTokens:0,overheadTokens:0,savedTextTokens:0,countKind:'exact-text',providerSavings:null,byStrategy:{}};
  try{for(const line of privateRead(project,'native-metrics.jsonl',10_100_000).split('\n').filter(Boolean)){
    const r=JSON.parse(line);if(r.countKind!=='exact-text'||![r.originalTokens,r.optimizedTokens,r.overheadTokens].every(x=>Number.isSafeInteger(x)&&x>=0))continue;
    out.events++;if(r.applied)out.applied++;out.originalTokens+=r.originalTokens;out.optimizedTokens+=r.optimizedTokens;out.overheadTokens+=r.overheadTokens;
    out.byStrategy[r.strategy]=(out.byStrategy[r.strategy]??0)+1;
  }}catch{}out.savedTextTokens=out.originalTokens-out.optimizedTokens-out.overheadTokens;return out;
}
export function loadNativeConfig(project){
  try{const c=JSON.parse(privateRead(project,'native.json'));
    if(c.version!=='0.1'||!['observe','hybrid','research'].includes(c.mode)||!['cl100k_base','o200k_base'].includes(c.encoding)||typeof c.model!=='string'||!c.model||!Array.isArray(c.jsonTools)||!c.jsonTools.every(x=>typeof x==='string')||!Array.isArray(c.strategies)||c.strategies.some(x=>!['json-whitespace','context-reference'].includes(x)))throw Error('Configuración inválida');
    return c;
  }catch{return null}
}
export function countTexts(texts,encoding){
  const r=spawnSync('python3',[script,encoding,'--batch'],{input:JSON.stringify(texts),encoding:'utf8',timeout:2500,maxBuffer:100_000});
  if(r.status!==0)throw Error('Tokenizador no disponible');const counts=JSON.parse(r.stdout);
  if(!Array.isArray(counts)||counts.length!==texts.length||!counts.every(x=>Number.isSafeInteger(x)&&x>=0))throw Error('Conteo inválido');return counts;
}
/** Remove only JSON whitespace outside strings. Keep every key, numeric lexeme, escape and duplicate key. */
export function stripJsonWhitespace(text){
  if(typeof text!=='string'||Buffer.byteLength(text)>maxBytes||!/^\s*[\[{]/.test(text))return text;
  try{JSON.parse(text)}catch{return text}
  let quoted=false,escaped=false,result='';
  for(const c of text){if(quoted){result+=c;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false}else if(c==='"'){quoted=true;result+=c}else if(!' \r\n\t'.includes(c))result+=c}
  return result;
}
// Gates are model/harness/strategy bound. A benchmark never enables a plugin on its own.
export function hasGate(project,config,harness,strategy){
  try{const e=JSON.parse(privateRead(project,'native-gates.json'));return e.version==='0.1'&&e.gates.some(g=>g.harness===harness&&g.model===config.model&&g.strategy===strategy&&g.passed===true&&g.cases>=5&&g.criticalViolations===0&&typeof g.reportDigest==='string'&&/^sha256:[a-f0-9]{64}$/.test(g.reportDigest))}catch{return false}
}
export function optimizeToolText({project,harness,tool,text,config,model,reference},counter=countTexts){
  const unchanged={text,applied:false,strategy:'natural',originalTokens:0,optimizedTokens:0,overheadTokens:0,countKind:'unavailable',fallback:'unconfigured'};
  if(!config||config.model!==model||typeof text!=='string'||Buffer.byteLength(text)>maxBytes)return unchanged;
  let candidate=text,strategy='natural';
  if(config.strategies.includes('json-whitespace')&&config.jsonTools.includes(tool)){candidate=stripJsonWhitespace(text);if(candidate!==text)strategy='json-whitespace'}
  if(reference&&config.strategies.includes('context-reference')&&reference.original===text&&/^[A-Za-z0-9_.:-]{1,128}$/.test(reference.callID)){
    const marker=`[VELIQ: identical tool data from call ${reference.callID}, SHA-256 ${hash(text)}. Full data remains earlier in this request.]`;
    if(marker.length<candidate.length){candidate=marker;strategy='context-reference'}
  }
  try{
    const [originalTokens,candidateTokens]=counter([text,candidate],config.encoding);
    const allowed=strategy!=='natural'&&candidateTokens<originalTokens&&((config.mode==='hybrid'&&hasGate(project,config,harness,strategy))||(config.mode==='research'&&process.env.VELIQ_RESEARCH_WORKSPACE===project));
    const row={harness,model:config.model,encoding:config.encoding,strategy:allowed?strategy:'natural',proposed:strategy,applied:allowed,originalTokens,optimizedTokens:allowed?candidateTokens:originalTokens,overheadTokens:0,countKind:'exact-text',fallback:allowed?null:config.mode==='observe'?'observe':candidateTokens>=originalTokens?'no-net-saving':'gate-missing'};
    // If audit cannot be written, preserve original. Do not log bodies, IDs, arguments or hashes.
    auditNative(project,row);return {...row,text:allowed?candidate:text};
  }catch{return {...unchanged,fallback:'tokenizer-or-audit-unavailable'}}
}
