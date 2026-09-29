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
export function fromNatural(input:string,language:SupportedLanguage):VSR {
  const match=naturalPatterns[language].exec(input.trim());
  if(!match)throw new Error(`Traducción no soportada en ${language}: ingresá VELIQ formal o la plantilla documentada`);
  const target=`error:${match[1]}`;
  const text=`seq(sen(ri(${JSON.stringify(target)})),pro(del(ri("archivos:originales"))))`;
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
