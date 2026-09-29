import type {Term} from '../language/parser.ts';
import {createHash} from 'node:crypto';
import {parse,print} from '../language/parser.ts';
import {byId,dictionaryVersion} from '../language/dictionary.ts';
export type VSR={version:'0.1';dictionaryVersion:'0.1';root:Term;provenance?:{authority:'user'|'tool'|'external'|'agent'|'system';acquiredAt:string};original?:string};
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
  return JSON.stringify({version:vsr.version,dictionaryVersion:vsr.dictionaryVersion,root:vsr.root,...(vsr.provenance?{provenance:vsr.provenance}:{}),...(vsr.original?{original:vsr.original}:{})});
}
export function decode(serialized:string):VSR{const v=JSON.parse(serialized);if(!v||v.version!=='0.1'||v.dictionaryVersion!==dictionaryVersion)throw new Error('Versión incompatible');validateTerm(v.root);return v as VSR;}
export function semanticId(v:VSR):string{return createHash('sha256').update(print(v.root)).digest('hex');}
export function diagnostic(v:VSR):string{return `${print(v.root)} [origen=${v.provenance?.authority??'desconocido'}]`;}
/** Traductor determinista de un subconjunto; falla cerrado con cualquier oración no reconocida. */
export function fromSpanish(input:string):VSR {
  const m=/^Analiz[aá] (el error) "([^"\n]+)" y no elimin[ae]s? los archivos originales\.?$/i.exec(input.trim());
  if(!m)throw new Error('Traducción no soportada: ingresá VELIQ formal o una plantilla documentada');
  const target=`error:${m[2]}`;
  const text=`seq(sen(ri(${JSON.stringify(target)})),pro(del(ri("archivos:originales"))))`;
  const v=fromText(text,{authority:'user',acquiredAt:new Date().toISOString()});v.original=input;return v;
}
export function toSpanish(v:VSR):string{
  // Sólo se emite una plantilla comprobada; fuera de ella se ofrece diagnóstico, nunca una paráfrasis inventada.
  if(v.original){try{if(semanticId(fromSpanish(v.original))===semanticId(v))return v.original}catch{}}
  return `Representación formal: ${print(v.root)}`;
}
