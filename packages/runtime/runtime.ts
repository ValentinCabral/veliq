import type {MemoryStore} from '../memory/store.ts';
import {fromSpanish} from '../semantic/vsr.ts';
import {ByteTokenizer,optimize} from '../codec/optimizer.ts';
export function processMessage(text:string,store:MemoryStore,mode:'observe'|'hybrid'|'native'|'research'='observe'){
  let vsr;try{vsr=fromSpanish(text)}catch{}
  const decision=optimize(text,vsr,new ByteTokenizer(),mode,'VELIQ dictionary 0.1');
  store.metric({mode,strategy:decision.strategy,original:decision.original.value,optimized:decision.optimized.value,overhead:decision.overhead.value,kind:decision.original.kind,fallback:decision.fallback});
  return {vsr,decision};
}
