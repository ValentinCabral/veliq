import {MemoryStore,defaultScope} from '../../packages/memory/store.ts';
import {naturalExample,supportedLanguages} from '../../packages/semantic/vsr.ts';
import {storeExactDocument,selectExactRecord,validateDocument} from '../../packages/codec/selective.ts';

for(const language of supportedLanguages){
  const doc=validateDocument({version:'0.1',constraints:['No eliminar archivos originales','Conservar rutas, IDs y valores exactos'],records:Array.from({length:100},(_,index)=>{
    const id=`case-${String(index+1).padStart(3,'0')}`;
    return {id,body:`${naturalExample(language,id)} Referencia ${id}: /proyecto/${id}/original.txt; SHA256=${'a'.repeat(64)}; valor=${index+1} unidades.`};
  })});
  const store=new MemoryStore(':memory:');
  try{
    storeExactDocument(store,'doc:benchmark',defaultScope,doc);
    const selected=doc.records.map(row=>{
      const context=selectExactRecord(store,'doc:benchmark',defaultScope,row.id);
      if(context.record.body!==row.body||context.constraints.length!==doc.constraints.length||context.record.hash!==MemoryStore.hash(row.body))throw new Error('Recuperación infiel');
      return context;
    });
    process.stdout.write(JSON.stringify({language,document:doc,selected})+'\n');
  }finally{store.close()}
}
