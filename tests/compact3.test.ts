import {test} from 'node:test';
import assert from 'node:assert/strict';
import {printC3,parseC3} from '../packages/language/compact3.ts';
import {fromText,fromNatural,taskExample,scopedNaturalExample,taskKinds,naturalExample,supportedLanguages,semanticId} from '../packages/semantic/vsr.ts';
import {ByteTokenizer,optimize} from '../packages/codec/optimizer.ts';
import {FORMAL_GLOSSARY,C3_GLOSSARY} from '../packages/language/glossary.ts';
import {spawnSync} from 'node:child_process';

test('C3 liga referentes repetidos con alcance determinista sin cambiar VSR',()=>{
  for(const language of ['en','es'] as const)for(const kind of taskKinds){
    const v=fromNatural(taskExample(language,kind,'case-001'),language),c3=printC3(v.root);
    assert.equal(semanticId({...v,root:parseC3(c3)}),semanticId(v));
    assert.equal(c3.split('case-001').length-1,1);
    assert.equal(semanticId(fromNatural(scopedNaturalExample(language,kind,'case-001'),language)),semanticId(v));
  }
  const v=fromNatural(naturalExample('es','case-001'),'es');
  assert.equal(printC3(v.root),'case-001 sen error pro del @archivos:originales');
  assert.equal(semanticId({...v,root:parseC3(printC3(v.root))}),semanticId(v));
  for(const language of supportedLanguages){const translated=fromNatural(naturalExample(language,'case-001'),language);assert.equal(semanticId({...translated,root:parseC3(printC3(translated.root))}),semanticId(translated))}
});
test('C3: 1000 expresiones generadas preservan alcance, orden, IDs y destino',()=>{
  // Fixed LCG seed: deterministic structural property test, not an LLM task evaluation.
  let seed=7241;
  const next=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};
  const ref=()=>`ri(${JSON.stringify(['error:x','file:x','memory:y','absolute/id','x:y:z'][next(5)])})`;
  function expression(depth:number):string{
    const kind=depth>3?0:next(5);
    if(kind===0)return `${['sen','nar','sel','mak','sav','zen','del'][next(7)]}(${ref()})`;
    if(kind===1)return `${['pro','obl','per','hyp','nu'][next(5)]}(${expression(depth+1)})`;
    if(kind===2)return `${['pre','pos','kon','kal','par'][next(5)]}(${expression(depth+1)},${expression(depth+1)})`;
    if(kind===3)return `dar(${ref()},agn("agent-${next(9)}"))`;
    return `seq(${Array.from({length:1+next(4)},()=>expression(depth+1)).join(',')})`;
  }
  for(let n=0;n<1000;n++){
    const v=fromText(expression(0)),text=printC3(v.root),decoded=parseC3(text);
    assert.equal(semanticId({...v,root:decoded}),semanticId(v));
    assert.equal(printC3(decoded),text);
  }
});
test('C3 Hybrid no presume compatibilidad ni glosario gratuito',()=>{
  const text=taskExample('es','analyze_fix_verify','case-001'),v=fromNatural(text,'es'),counter=new ByteTokenizer();
  assert.equal(optimize(text,v,counter,'hybrid',FORMAL_GLOSSARY).strategy,'natural');
  assert.equal(optimize(text,v,counter,'hybrid',FORMAL_GLOSSARY,{c3Negotiated:true}).strategy,'natural');
  const paid=optimize(text,v,counter,'hybrid',FORMAL_GLOSSARY,{c3Negotiated:true,setupPaid:true});
  assert.equal(paid.strategy,'veliq-c3');assert.equal(paid.output,printC3(v.root));assert.equal(paid.overhead.value,0);
  const research=optimize(text,v,counter,'research',FORMAL_GLOSSARY.repeat(10),{c3Negotiated:true});
  assert.equal(research.strategy,'veliq-c3');
  assert.equal(research.overhead.value,counter.count(C3_GLOSSARY).value);
  const observed=optimize(text,v,counter,'observe',FORMAL_GLOSSARY,{c3Negotiated:true,setupPaid:true});
  assert.equal(observed.output,text);assert.equal(observed.overhead.value,0);
});
test('CLI encode/decode C3 usa implementación real',()=>{
  const main=new URL('../apps/cli/main.ts',import.meta.url).pathname;
  const encoded=spawnSync(process.execPath,['--experimental-strip-types',main,'encode','--lang','en','--c3',taskExample('en','analyze_fix_verify','case-001')],{encoding:'utf8'});
  assert.equal(encoded.status,0,encoded.stderr);const data=JSON.parse(encoded.stdout);assert.equal(data.text,'case-001 sen error nar error sel tests');
  const decoded=spawnSync(process.execPath,['--experimental-strip-types',main,'decode','--c3',data.text],{encoding:'utf8'});
  assert.equal(decoded.status,0,decoded.stderr);assert.match(JSON.parse(decoded.stdout).diagnostic,/tests:case-001/);
});
test('C3 preserva alcance de prohibición, secuencia anidada y destino',()=>{
  const v=fromText('seq(pro(seq(del(ri("file:x")),sav(ri("memory:x")))),dar(ri("result:x"),agn("agent-2")))');
  assert.equal(printC3(v.root),'x pro seq 2 del file sav memory dar result agent-2');
  assert.equal(semanticId({...v,root:parseC3(printC3(v.root))}),semanticId(v));
  for(const text of ['x pro del','x dar result','x pro seq 2 del file','x sen @','x sen error  nar error','x kon ri condition','x seq 1001 sen error','- sen error'])assert.throws(()=>parseC3(text));
  const prohibited=fromText('pro(del(ri("file:x")))');
  assert.notEqual(semanticId({...prohibited,root:parseC3('x del file')}),semanticId(prohibited));
});
