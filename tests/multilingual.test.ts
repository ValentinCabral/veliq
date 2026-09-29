import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fromNatural,naturalExample,supportedLanguages,semanticId,canonical,decode,toNatural,toSpanish} from '../packages/semantic/vsr.ts';
import {print} from '../packages/language/parser.ts';
import {printCompact,parseCompact} from '../packages/language/compact.ts';
import {ByteTokenizer,optimize} from '../packages/codec/optimizer.ts';

test('diez plantillas controladas preservan prohibición, referencia y round-trip C1',()=>{
  const ids=['case-001','ABC.2/3'];
  for(const id of ids)for(const language of supportedLanguages){
    const original=naturalExample(language,id),v=fromNatural(original,language);
    assert.equal(toNatural(v),original);
    assert.match(print(v.root),/pro\(del\(ri/);
    const compact=printCompact(v.root);
    assert.equal(semanticId({...v,root:parseCompact(compact)}),semanticId(v));
    assert.equal(semanticId(decode(canonical(v))),semanticId(v));
    assert.equal(optimize(original,v,new ByteTokenizer(),'native','',{compactNegotiated:true}).output,compact);
    if(language!=='es')assert.notEqual(toSpanish(v),original);
  }
});
test('C1 no pierde negación, no admite referencias ambiguas ni interpretaciones inventadas',()=>{
  assert.equal(printCompact(parseCompact('sen@error:1;pro{del@archivos:originales}')),'sen@error:1;pro{del@archivos:originales}');
  for(const text of ['sen@error:1;del@archivos:originales;', 'pro{}','sen@../x\n','sen@x|del@y','sen@"x"','sen@x;pro{del@y'])assert.throws(()=>parseCompact(text));
  assert.throws(()=>fromNatural('Delete the original files.','en'));
  assert.throws(()=>fromNatural(naturalExample('es','1'),'en'));
  assert.throws(()=>printCompact(fromNatural(naturalExample('es','contiene espacios'),'es').root));
  const v=fromNatural(naturalExample('en','1'),'en');v.root=parseCompact('del@archivos:originales');
  assert.notEqual(toNatural(v),v.original);
  assert.equal(optimize(v.original!,v,new ByteTokenizer(),'native').strategy,'natural');
});
