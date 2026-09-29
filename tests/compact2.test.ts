import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taskKinds,taskExample,conciseExample,fromNatural,naturalExample,semanticId} from '../packages/semantic/vsr.ts';
import {parseC2,printC2} from '../packages/language/compact2.ts';
import {ByteTokenizer,optimize} from '../packages/codec/optimizer.ts';
import {FORMAL_GLOSSARY} from '../packages/language/glossary.ts';

test('C2 representa siete actos distintos en dos idiomas con semántica idéntica',()=>{
  for(const kind of taskKinds)for(const lang of ['en','es'] as const){
    const text=taskExample(lang,kind,'case-42'),v=fromNatural(text,lang),c2=printC2(v.root);
    assert.equal(semanticId({...v,root:parseC2(c2)}),semanticId(v),`${lang}/${kind}`);
    assert.equal(v.original,text);
    assert.equal(semanticId(fromNatural(conciseExample(lang,kind,'case-42'),lang)),semanticId(v));
  }
  const v=fromNatural(naturalExample('ja','case-1'),'ja');
  assert.equal(semanticId({...v,root:parseC2(printC2(v.root))}),semanticId(v));
});
test('C2 falla cerrado ante destino, alcance o referencias alteradas',()=>{
  for(const value of ['dar@result:1','dar@result:1>@agent:2','pro{del@file:1','kon{@condition:1}','sel@tests:1;','sen@error:1;del@file:1;','pro{del@file:1}}'])assert.throws(()=>parseC2(value),value);
  assert.throws(()=>fromNatural('Transfer result "a" to agent "agent-3".','en'));
  assert.throws(()=>fromNatural('Fix error "a" and verify tests "b".','en'));
});
test('Hybrid cobra glosario de C2, requiere compatibilidad y usa fallback',()=>{
  const input=naturalExample('ja','case-1'),v=fromNatural(input,'ja'),counter=new ByteTokenizer();
  assert.equal(optimize(input,v,counter,'hybrid',FORMAL_GLOSSARY).strategy,'natural');
  assert.equal(optimize(input,v,counter,'hybrid',FORMAL_GLOSSARY,{c2Negotiated:true}).strategy,'natural');
  const accepted=optimize(input,v,counter,'hybrid',FORMAL_GLOSSARY,{c2Negotiated:true,setupPaid:true});
  assert.equal(accepted.strategy,'veliq-c2');assert.equal(accepted.overhead.value,0);
  assert.match(accepted.output,/pro\{del@archivos:originales\}/);
});
