import type {VSR} from '../semantic/vsr.ts';
import {print} from '../language/parser.ts';
import {printCompact,parseCompact} from '../language/compact.ts';
import {fromText,fromNatural,semanticId} from '../semantic/vsr.ts';
export type Count={value:number;kind:'exact-local-bytes'|'exact-text-tokens'|'estimated';model:string};
export interface TokenCounter {count(text:string):Count}
/** Tokenizador byte a byte exacto, perfil de prueba. No equivale a tokens de un LLM comercial. */
export class ByteTokenizer implements TokenCounter{count(text:string):Count{return {value:Buffer.byteLength(text,'utf8'),kind:'exact-local-bytes',model:'utf8-byte-baseline'}}}
export class EstimateTokenizer implements TokenCounter{count(text:string):Count{return {value:Math.ceil(Buffer.byteLength(text,'utf8')/4),kind:'estimated',model:'bytes-div-4-estimate'}}}
export type Decision={strategy:'natural'|'veliq-text'|'veliq-compact';output:string;original:Count;optimized:Count;overhead:Count;fallback?:string};
export function optimize(original:string,vsr:VSR|undefined,counter:TokenCounter,mode:'observe'|'hybrid'|'native'|'research'='observe',overhead='',options:{compactNegotiated?:boolean}={}):Decision{
  const base=counter.count(original),extra=counter.count(overhead);
  const fallback=(reason:string):Decision=>({strategy:'natural',output:original,original:base,optimized:base,overhead:extra,fallback:reason});
  if(mode==='observe')return fallback('observe');
  if(!vsr)return fallback('Sin VSR verificable');
  try{const candidate=print(vsr.root);const roundtrip=fromText(candidate);
    if(semanticId(roundtrip)!==semanticId(vsr))return fallback('Round-trip semántico falló');
    if(!vsr.original||vsr.original!==original)return fallback('Texto original o procedencia no verificables');
    if(!vsr.sourceLanguage)return fallback('Idioma fuente no declarado');
    if(semanticId(fromNatural(original,vsr.sourceLanguage))!==semanticId(vsr))return fallback('VSR divergente del original');
    // El destinatario debe conocer el idioma; aquí sólo se devuelve una propuesta, nunca se ejecuta una acción.
    let selected=candidate, strategy:'veliq-text'|'veliq-compact'='veliq-text';
    if(options.compactNegotiated)try{const compact=printCompact(vsr.root);if(semanticId({...vsr,root:parseCompact(compact)})===semanticId(vsr)&&counter.count(compact).value<counter.count(candidate).value){selected=compact;strategy='veliq-compact'}}catch{}
    const count=counter.count(selected);
    if(mode==='hybrid'&&count.value+extra.value>=base.value)return fallback('Sin ahorro medido');
    return {strategy,output:selected,original:base,optimized:count,overhead:extra};
  }catch(e){return fallback(e instanceof Error?e.message:'Error desconocido')}
}
export function netPercent(d:Decision){return d.original.value?100*(d.original.value-d.optimized.value-d.overhead.value)/d.original.value:0}
