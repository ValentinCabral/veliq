import type {Term} from '../language/parser.ts';
import {createHash} from 'node:crypto';
import {parse,print} from '../language/parser.ts';
import {byId,dictionaryVersion} from '../language/dictionary.ts';
export type VSR={version:'0.1';dictionaryVersion:'0.1';root:Term;provenance?:{authority:'user'|'tool'|'external'|'agent'|'system';acquiredAt:string};original?:string;sourceLanguage?:SupportedLanguage};
export const supportedLanguages=['es','en','pt','fr','de','it','nl','zh','ja','ko'] as const;
export type SupportedLanguage=typeof supportedLanguages[number];
const exact=(n:Term,c:number,count:number)=>n.type==='Concept'&&n.concept===c&&n.args.length===count;
export function validateTerm(term:Term,known?:Set<string>):void {
  if(term.type==='Literal')return;
  const word=byId.get(term.concept)?.word;
  if(!word)throw new Error(`Concepto desconocido: ${term.concept}`);
  if(['ri','agn','va','lit','opq','unt','tem','dur','val'].includes(word)){
    if(term.args.length!==1||term.args[0]?.type!=='Literal')throw new Error(`${word} requiere un literal`);
    if(word==='ri'&&known&&!known.has(term.args[0].value))throw new Error('Referencia sin resolver');
  }
  if(word==='nu'&&term.args.length!==1)throw new Error('nu requiere alcance único');
  if(['pro','obl','per','hyp'].includes(word)&&term.args.length!==1)throw new Error(`${word} requiere una expresión`);
  if(['sen','nar','sel','mak','sav','zen','del'].includes(word)&&term.args.length!==1)throw new Error(`${word} requiere un objeto`);
  if(word==='sel'&&term.args[0]?.type==='Literal')throw new Error('VERIFY requiere afirmación, condición, evidencia o referencia');
  if(word==='dar'&&term.args.length!==2)throw new Error('TRANSFER requiere contenido y destino');
  if(['kon','kal','pre','pos','rel','qty'].includes(word)&&term.args.length!==2)throw new Error(`${word} requiere dos argumentos`);
  if(['seq','par','yun','col'].includes(word)&&term.args.length<1)throw new Error(`${word} requiere argumentos`);
  if(word==='qty'&&(!exact(term.args[0],1015,1)||!exact(term.args[1],1036,1)))throw new Error('qty requiere val y unt');
  for(const arg of term.args)validateTerm(arg,known);
}
export function fromText(text:string,provenance?:VSR['provenance'],known?:Set<string>):VSR{
  const root=parse(text);validateTerm(root,known);return {version:'0.1',dictionaryVersion,root,...(provenance?{provenance}:{})};
}
export function canonical(vsr:VSR):string {
  if(vsr.version!=='0.1'||vsr.dictionaryVersion!==dictionaryVersion)throw new Error('Versión incompatible');
  validateTerm(vsr.root);
  return JSON.stringify({version:vsr.version,dictionaryVersion:vsr.dictionaryVersion,root:vsr.root,...(vsr.provenance?{provenance:vsr.provenance}:{}),...(vsr.original?{original:vsr.original}:{}),...(vsr.sourceLanguage?{sourceLanguage:vsr.sourceLanguage}:{})});
}
export function decode(serialized:string):VSR{const v=JSON.parse(serialized);if(!v||v.version!=='0.1'||v.dictionaryVersion!==dictionaryVersion)throw new Error('Versión incompatible');if(v.sourceLanguage!==undefined&&!supportedLanguages.includes(v.sourceLanguage))throw new Error('Idioma desconocido');validateTerm(v.root);return v as VSR;}
export function semanticId(v:VSR):string{return createHash('sha256').update(print(v.root)).digest('hex');}
export function diagnostic(v:VSR):string{return `${print(v.root)} [origen=${v.provenance?.authority??'desconocido'}]`;}
/** Traducción controlada de UNA instrucción equivalente; no se infiere semántica de prosa libre. */
const naturalPatterns:Record<SupportedLanguage,RegExp>={
  es:/^Analiz[aá] el error "([^"\n]+)" y no elimin[ae]s? los archivos originales\.?$/i,
  en:/^Analyze error "([^"\n]+)" and do not delete the original files\.?$/i,
  pt:/^Analise o erro "([^"\n]+)" e não exclua os arquivos originais\.?$/i,
  fr:/^Analysez l'erreur "([^"\n]+)" et ne supprimez pas les fichiers originaux\.?$/i,
  de:/^Analysiere den Fehler "([^"\n]+)" und lösche die Originaldateien nicht\.?$/i,
  it:/^Analizza l'errore "([^"\n]+)" e non eliminare i file originali\.?$/i,
  nl:/^Analyseer de fout "([^"\n]+)" en verwijder de originele bestanden niet\.?$/i,
  zh:/^分析错误“([^”\n]+)”，不要删除原始文件。?$/,
  ja:/^エラー「([^」\n]+)」を分析し、元のファイルを削除しないでください。?$/,
  ko:/^오류 "([^"\n]+)"을 분석하고 원본 파일을 삭제하지 마세요\.?$/,
};
const naturalTemplates:Record<SupportedLanguage,(id:string)=>string>={
  es:id=>`Analiza el error "${id}" y no elimines los archivos originales.`,
  en:id=>`Analyze error "${id}" and do not delete the original files.`,
  pt:id=>`Analise o erro "${id}" e não exclua os arquivos originais.`,
  fr:id=>`Analysez l'erreur "${id}" et ne supprimez pas les fichiers originaux.`,
  de:id=>`Analysiere den Fehler "${id}" und lösche die Originaldateien nicht.`,
  it:id=>`Analizza l'errore "${id}" e non eliminare i file originali.`,
  nl:id=>`Analyseer de fout "${id}" en verwijder de originele bestanden niet.`,
  zh:id=>`分析错误“${id}”，不要删除原始文件。`,
  ja:id=>`エラー「${id}」を分析し、元のファイルを削除しないでください。`,
  ko:id=>`오류 "${id}"을 분석하고 원본 파일을 삭제하지 마세요.`,
};
export function naturalExample(language:SupportedLanguage,id:string):string{if(/["”」\n]/.test(id))throw new Error('Identificador inválido');return naturalTemplates[language](id)}
export const taskKinds=['fix_verify','transfer','create_before','conditional_verify','prohibit_delete','analyze_fix_verify','persist_after'] as const;
export type TaskKind=typeof taskKinds[number];
const taskTemplates:Record<'en'|'es',Record<TaskKind,(id:string)=>string>>={
  en:{
    fix_verify:id=>`Fix error "${id}" and verify tests "${id}".`,
    transfer:id=>`Transfer result "${id}" to agent "agent-2".`,
    create_before:id=>`Create artifact "${id}" before analyzing error "${id}".`,
    conditional_verify:id=>`If condition "${id}" holds, verify result "${id}".`,
    prohibit_delete:id=>`Do not delete file "${id}".`,
    analyze_fix_verify:id=>`Analyze error "${id}", fix it, and verify tests "${id}".`,
    persist_after:id=>`Persist memory "${id}" after verifying result "${id}".`,
  },
  es:{
    fix_verify:id=>`Corrige el error "${id}" y verifica las pruebas "${id}".`,
    transfer:id=>`Transfiere el resultado "${id}" al agente "agent-2".`,
    create_before:id=>`Crea el artefacto "${id}" antes de analizar el error "${id}".`,
    conditional_verify:id=>`Si se cumple la condición "${id}", verifica el resultado "${id}".`,
    prohibit_delete:id=>`No elimines el archivo "${id}".`,
    analyze_fix_verify:id=>`Analiza el error "${id}", corrígelo y verifica las pruebas "${id}".`,
    persist_after:id=>`Persiste la memoria "${id}" después de verificar el resultado "${id}".`,
  },
};
export function taskExample(language:'en'|'es',kind:TaskKind,id:string):string{if(!/^[A-Za-z0-9_.:/-]+$/.test(id))throw new Error('ID fuera de plantilla');return taskTemplates[language][kind](id)}
const conciseTemplates:Record<'en'|'es',Partial<Record<TaskKind,(id:string)=>string>>>= {
  en:{
    fix_verify:id=>`Fix error "${id}"; verify tests "${id}".`,
    transfer:id=>`Send result "${id}" to agent "agent-2".`,
    prohibit_delete:id=>`Never delete file "${id}".`,
    analyze_fix_verify:id=>`Analyze error "${id}"; fix it; verify tests "${id}".`,
  },
  es:{
    fix_verify:id=>`Corrige error "${id}"; verifica pruebas "${id}".`,
    transfer:id=>`Envía resultado "${id}" al agente "agent-2".`,
    prohibit_delete:id=>`Nunca elimines archivo "${id}".`,
    analyze_fix_verify:id=>`Analiza error "${id}"; corrígelo; verifica pruebas "${id}".`,
  },
};
export function conciseExample(language:'en'|'es',kind:TaskKind,id:string):string{return conciseTemplates[language][kind]?.(id)??taskExample(language,kind,id)}
// Stronger conventional baseline: a natural-language heading shares the exact ID too.
const scopedClauses:Record<'en'|'es',Record<TaskKind,string>>={
  en:{fix_verify:'fix error; verify tests.',transfer:'send result to agent "agent-2".',create_before:'create artifact before analyzing error.',conditional_verify:'if condition holds, verify result.',prohibit_delete:'never delete file.',analyze_fix_verify:'analyze and fix error; verify tests.',persist_after:'persist memory after verifying result.'},
  es:{fix_verify:'corrige error; verifica pruebas.',transfer:'envía resultado al agente "agent-2".',create_before:'crea artefacto antes de analizar error.',conditional_verify:'si se cumple condición, verifica resultado.',prohibit_delete:'nunca elimines archivo.',analyze_fix_verify:'analiza y corrige error; verifica pruebas.',persist_after:'persiste memoria después de verificar resultado.'},
};
export function scopedNaturalExample(language:'en'|'es',kind:TaskKind,id:string):string{
  if(!/^[A-Za-z0-9_.:/-]+$/.test(id))throw new Error('ID fuera de plantilla');
  return `ID "${id}": ${scopedClauses[language][kind]}`;
}
const taskPatterns:Record<'en'|'es',Array<{kind:TaskKind;regex:RegExp}>>={
  en:[
    {kind:'fix_verify',regex:/^Fix error "([^"\n]+)" and verify tests "\1"\.$/},
    {kind:'fix_verify',regex:/^Fix error "([^"\n]+)"; verify tests "\1"\.$/},
    {kind:'transfer',regex:/^Transfer result "([^"\n]+)" to agent "agent-2"\.$/},
    {kind:'transfer',regex:/^Send result "([^"\n]+)" to agent "agent-2"\.$/},
    {kind:'create_before',regex:/^Create artifact "([^"\n]+)" before analyzing error "\1"\.$/},
    {kind:'conditional_verify',regex:/^If condition "([^"\n]+)" holds, verify result "\1"\.$/},
    {kind:'prohibit_delete',regex:/^Do not delete file "([^"\n]+)"\.$/},
    {kind:'prohibit_delete',regex:/^Never delete file "([^"\n]+)"\.$/},
    {kind:'analyze_fix_verify',regex:/^Analyze error "([^"\n]+)", fix it, and verify tests "\1"\.$/},
    {kind:'analyze_fix_verify',regex:/^Analyze error "([^"\n]+)"; fix it; verify tests "\1"\.$/},
    {kind:'persist_after',regex:/^Persist memory "([^"\n]+)" after verifying result "\1"\.$/},
  ],
  es:[
    {kind:'fix_verify',regex:/^Corrige el error "([^"\n]+)" y verifica las pruebas "\1"\.$/},
    {kind:'fix_verify',regex:/^Corrige error "([^"\n]+)"; verifica pruebas "\1"\.$/},
    {kind:'transfer',regex:/^Transfiere el resultado "([^"\n]+)" al agente "agent-2"\.$/},
    {kind:'transfer',regex:/^Envía resultado "([^"\n]+)" al agente "agent-2"\.$/},
    {kind:'create_before',regex:/^Crea el artefacto "([^"\n]+)" antes de analizar el error "\1"\.$/},
    {kind:'conditional_verify',regex:/^Si se cumple la condición "([^"\n]+)", verifica el resultado "\1"\.$/},
    {kind:'prohibit_delete',regex:/^No elimines el archivo "([^"\n]+)"\.$/},
    {kind:'prohibit_delete',regex:/^Nunca elimines archivo "([^"\n]+)"\.$/},
    {kind:'analyze_fix_verify',regex:/^Analiza el error "([^"\n]+)", corrígelo y verifica las pruebas "\1"\.$/},
    {kind:'analyze_fix_verify',regex:/^Analiza error "([^"\n]+)"; corrígelo; verifica pruebas "\1"\.$/},
    {kind:'persist_after',regex:/^Persiste la memoria "([^"\n]+)" después de verificar el resultado "\1"\.$/},
  ],
};
function taskTerm(kind:TaskKind,id:string):string{
  const ref=(prefix:string)=>`ri(${JSON.stringify(`${prefix}:${id}`)})`;
  switch(kind){
    case 'fix_verify':return `seq(nar(${ref('error')}),sel(${ref('tests')}))`;
    case 'transfer':return `dar(${ref('result')},agn("agent-2"))`;
    case 'create_before':return `pre(mak(${ref('artifact')}),sen(${ref('error')}))`;
    case 'conditional_verify':return `kon(${ref('condition')},sel(${ref('result')}))`;
    case 'prohibit_delete':return `pro(del(${ref('file')}))`;
    case 'analyze_fix_verify':return `seq(sen(${ref('error')}),nar(${ref('error')}),sel(${ref('tests')}))`;
    case 'persist_after':return `pos(sav(${ref('memory')}),sel(${ref('result')}))`;
  }
}
export function fromNatural(input:string,language:SupportedLanguage):VSR {
  const match=naturalPatterns[language].exec(input.trim());
  let text:string;
  if(match){const target=`error:${match[1]}`;text=`seq(sen(ri(${JSON.stringify(target)})),pro(del(ri("archivos:originales"))))`}
  else {
    const scoped=(language==='en'||language==='es')?/^ID "([A-Za-z0-9_.:/-]+)": (.+)$/.exec(input.trim()):null;
    const scopedKind=scoped&&(language==='en'||language==='es')?taskKinds.find(kind=>scopedClauses[language][kind]===scoped[2]):undefined;
    const extension=(language==='en'||language==='es')?taskPatterns[language].map(row=>({kind:row.kind,match:row.regex.exec(input.trim())})).find(row=>row.match):undefined;
    if(scoped&&scopedKind)text=taskTerm(scopedKind,scoped[1]);
    else if(extension?.match)text=taskTerm(extension.kind,extension.match[1]);
    else throw new Error(`Traducción no soportada en ${language}: ingresá VELIQ formal o una plantilla documentada`);
  }
  const v=fromText(text,{authority:'user',acquiredAt:new Date().toISOString()});v.original=input;v.sourceLanguage=language;return v;
}
export function fromSpanish(input:string):VSR{return fromNatural(input,'es')}
export function toNatural(v:VSR):string{
  if(v.original&&v.sourceLanguage){try{if(semanticId(fromNatural(v.original,v.sourceLanguage))===semanticId(v))return v.original}catch{}}
  if(v.original&&!v.sourceLanguage){try{if(semanticId(fromSpanish(v.original))===semanticId(v))return v.original}catch{}}
  return `Representación formal: ${print(v.root)}`;
}
export function toSpanish(v:VSR):string{
  // Sólo se emite una plantilla comprobada; fuera de ella se ofrece diagnóstico, nunca una paráfrasis inventada.
  if(v.sourceLanguage&&v.sourceLanguage!=='es')return `Representación formal: ${print(v.root)}`;
  if(v.original){try{if(semanticId(fromSpanish(v.original))===semanticId(v))return v.original}catch{}}
  return `Representación formal: ${print(v.root)}`;
}
