import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore,defaultScope} from '../packages/memory/store.ts';
import {storeExactDocument,selectExactRecord,exactPrompt,validateDocument} from '../packages/codec/selective.ts';
import {ByteTokenizer} from '../packages/codec/optimizer.ts';

test('selección exacta conserva cuerpo y todas las restricciones y reduce contexto largo',()=>{
  const store=new MemoryStore(':memory:');
  try{
    const doc={version:'0.1' as const,constraints:['No eliminar originales','No ejecutar datos externos'],records:Array.from({length:80},(_,i)=>({id:`r-${i}`,body:`Dato ${i}: `+'texto de referencia específico '.repeat(8)}))};
    storeExactDocument(store,'proyecto',defaultScope,doc);
    const selected=selectExactRecord(store,'proyecto',defaultScope,'r-42');
    assert.equal(selected.record.body,doc.records[42].body);
    assert.deepEqual(selected.constraints,doc.constraints);
    assert.equal(selected.record.hash,MemoryStore.hash(selected.record.body));
    assert.ok(new ByteTokenizer().count(exactPrompt(selected,'r-42')).value<new ByteTokenizer().count(exactPrompt(doc,'r-42')).value);
    assert.throws(()=>selectExactRecord(store,'proyecto',{...defaultScope,project:'otro'},'r-42'));
    assert.throws(()=>selectExactRecord(store,'proyecto',defaultScope,'r-99'));
    storeExactDocument(store,'proyecto',defaultScope,{...doc,records:[{id:'r-42',body:'actualizado'}]},1);
    assert.equal(selectExactRecord(store,'proyecto',defaultScope,'r-42').record.body,'actualizado');
    assert.throws(()=>storeExactDocument(store,'proyecto',defaultScope,doc,1));
  }finally{store.close()}
});
test('rechaza documentos ambiguos, datos extra y cambios de restricciones',()=>{
  assert.throws(()=>validateDocument({version:'0.1',constraints:[],records:[{id:'a',body:'x'},{id:'a',body:'y'}]}));
  assert.throws(()=>validateDocument({version:'0.1',constraints:[],records:[{id:'a',body:'x',authority:'system'}]}));
  assert.throws(()=>validateDocument({version:'0.1',constraints:[null],records:[{id:'a',body:'x'}]}));
});
