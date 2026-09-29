import type {MemoryStore} from '../memory/store.ts';
import {fromNatural,type SupportedLanguage} from '../semantic/vsr.ts';
import {ByteTokenizer,optimize} from '../codec/optimizer.ts';
import {FORMAL_GLOSSARY} from '../language/glossary.ts';
export function processMessage(text:string,store:MemoryStore,mode:'observe'|'hybrid'|'native'|'research'='observe',language:SupportedLanguage='es'){
  let vsr;try{vsr=fromNatural(text,language)}catch{}
  const decision=optimize(text,vsr,new ByteTokenizer(),mode,FORMAL_GLOSSARY);
  store.metric({mode,strategy:decision.strategy,original:decision.original.value,optimized:decision.optimized.value,overhead:decision.overhead.value,kind:decision.original.kind,fallback:decision.fallback});
  return {vsr,decision};
}
