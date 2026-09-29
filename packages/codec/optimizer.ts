import type {VSR} from '../semantic/vsr.ts';
import {print} from '../language/parser.ts';
import {printCompact,parseCompact} from '../language/compact.ts';
import {printC2,parseC2} from '../language/compact2.ts';
import {printC3,parseC3} from '../language/compact3.ts';
import {C1_GLOSSARY,C2_GLOSSARY,C3_GLOSSARY} from '../language/glossary.ts';
import {fromText,fromNatural,semanticId} from '../semantic/vsr.ts';
export type Count={value:number;kind:'exact-local-bytes'|'exact-text-tokens'|'estimated';model:string};
export interface TokenCounter {count(text:string):Count}
/** Tokenizador byte a byte exacto, perfil de prueba. No equivale a tokens de un LLM comercial. */
export class ByteTokenizer implements TokenCounter{count(text:string):Count{return {value:Buffer.byteLength(text,'utf8'),kind:'exact-local-bytes',model:'utf8-byte-baseline'}}}
export class EstimateTokenizer implements TokenCounter{count(text:string):Count{return {value:Math.ceil(Buffer.byteLength(text,'utf8')/4),kind:'estimated',model:'bytes-div-4-estimate'}}}
export type Decision={strategy:'natural'|'veliq-text'|'veliq-compact'|'veliq-c2'|'veliq-c3';output:string;original:Count;optimized:Count;overhead:Count;fallback?:string};
export function optimize(original:string,vsr:VSR|undefined,counter:TokenCounter,mode:'observe'|'hybrid'|'native'|'research'='observe',overhead='',options:{compactNegotiated?:boolean;c2Negotiated?:boolean;c3Negotiated?:boolean;setupPaid?:boolean}={}):Decision{
  const base=counter.count(original),extra=counter.count(overhead);
  const fallback=(reason:string):Decision=>({strategy:'natural',output:original,original:base,optimized:base,overhead:counter.count(''),fallback:reason});
  if(mode==='observe')return fallback('observe');
  if(!vsr)return fallback('Sin VSR verificable');
  try{const candidate=print(vsr.root);const roundtrip=fromText(candidate);
    if(semanticId(roundtrip)!==semanticId(vsr))return fallback('Round-trip semántico falló');
    if(!vsr.original||vsr.original!==original)return fallback('Texto original o procedencia no verificables');
    if(!vsr.sourceLanguage)return fallback('Idioma fuente no declarado');
    if(semanticId(fromNatural(original,vsr.sourceLanguage))!==semanticId(vsr))return fallback('VSR divergente del original');
    // El destinatario debe conocer el idioma; aquí sólo se devuelve una propuesta, nunca se ejecuta una acción.
    const choices:{strategy:'veliq-text'|'veliq-compact'|'veliq-c2'|'veliq-c3';output:string;optimized:Count;overhead:Count}[]=[{strategy:'veliq-text',output:candidate,optimized:counter.count(candidate),overhead:extra}];
    if(options.compactNegotiated)try{const compact=printCompact(vsr.root);if(semanticId({...vsr,root:parseCompact(compact)})===semanticId(vsr))choices.push({strategy:'veliq-compact',output:compact,optimized:counter.count(compact),overhead:counter.count(options.setupPaid?'':C1_GLOSSARY)})}catch{}
    if(options.c2Negotiated)try{const c2=printC2(vsr.root);if(semanticId({...vsr,root:parseC2(c2)})===semanticId(vsr))choices.push({strategy:'veliq-c2',output:c2,optimized:counter.count(c2),overhead:counter.count(options.setupPaid?'':C2_GLOSSARY)})}catch{}
    if(options.c3Negotiated)try{const c3=printC3(vsr.root);if(semanticId({...vsr,root:parseC3(c3)})===semanticId(vsr))choices.push({strategy:'veliq-c3',output:c3,optimized:counter.count(c3),overhead:counter.count(options.setupPaid?'':C3_GLOSSARY)})}catch{}
    const selected=choices.reduce((best,item)=>item.optimized.value+item.overhead.value<best.optimized.value+best.overhead.value?item:best);
    if(mode==='hybrid'&&selected.optimized.value+selected.overhead.value>=base.value)return fallback('Sin ahorro medido');
    return {...selected,original:base};
  }catch(e){return fallback(e instanceof Error?e.message:'Error desconocido')}
}
export function netPercent(d:Decision){return d.original.value?100*(d.original.value-d.optimized.value-d.overhead.value)/d.original.value:0}
