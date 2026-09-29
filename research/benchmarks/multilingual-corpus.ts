import {fromNatural,naturalExample,supportedLanguages,canonical,decode,semanticId} from '../../packages/semantic/vsr.ts';
import {print} from '../../packages/language/parser.ts';
import {printCompact,parseCompact} from '../../packages/language/compact.ts';

// 100 distinct identifiers × 10 controlled translations. Synthetic template corpus, not 1,000 independent tasks.
for(let index=1;index<=100;index++){
  const id=`case-${String(index).padStart(3,'0')}`;
  for(const language of supportedLanguages){
    const original=naturalExample(language,id);
    const vsr=fromNatural(original,language);
    if(vsr.provenance)vsr.provenance.acquiredAt='1970-01-01T00:00:00.000Z';
    const serialized=canonical(vsr);
    if(semanticId(decode(serialized))!==semanticId(vsr))throw new Error(`VSR round-trip failed: ${language}/${id}`);
    const compact=printCompact(vsr.root);
    if(semanticId({...vsr,root:parseCompact(compact)})!==semanticId(vsr))throw new Error(`C1 round-trip failed: ${language}/${id}`);
    process.stdout.write(JSON.stringify({id,language,original,veliq:print(vsr.root),compact,vsr:serialized})+'\n');
  }
}
