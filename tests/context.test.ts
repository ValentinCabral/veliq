import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore,defaultScope} from '../packages/memory/store.ts';
import {putContext,getContext,selectContext,prepareContext,applyContext,contextC3,type ContextRecord} from '../packages/memory/context.ts';
import {fromNatural,canonical} from '../packages/semantic/vsr.ts';
const record=(id:string,body:string):ContextRecord=>({id,body,kind:'document',authority:'external',constraints:[],tags:[id],pinned:false,provenance:'fixture',acquiredAt:'2026-09-29T00:00:00Z'});
test('contexto incremental: dos bases, FULL, ACK, DELTA, actualización y eliminación exactas',()=>{
 const sender=new MemoryStore(':memory:'),receiver=new MemoryStore(':memory:');try{
  const input={id:'ctx',scope:defaultScope,records:Array.from({length:40},(_,i)=>record('id-'+i,'Contenido exacto '+i+' '.repeat(100)))};
  const first=putContext(sender,input,0),full=prepareContext(sender,'ctx',defaultScope);assert.equal(full.encoding,'full');const ack=applyContext(receiver,full,defaultScope);assert.equal(ack.ack,first.digest);assert.deepEqual(getContext(receiver,'ctx',defaultScope),first);
  const records=input.records.slice(1);records[0]={...records[0],body:'Modificado; no borrar /exact/path'};const next=putContext(sender,{...input,records},1);
  const delta=prepareContext(sender,'ctx',defaultScope,ack.ack);assert.equal(delta.encoding,'delta');assert.equal(delta.upsert.length,1);assert.deepEqual(delta.removed,['id-0']);applyContext(receiver,delta,defaultScope);assert.deepEqual(getContext(receiver,'ctx',defaultScope),next);
  assert.equal(applyContext(receiver,delta,defaultScope).duplicate,true);assert.throws(()=>applyContext(receiver,full,defaultScope),/fuera de orden/);
  assert.equal(prepareContext(sender,'ctx',defaultScope,'sha256:'+'f'.repeat(64)).encoding,'full');assert.throws(()=>putContext(sender,input,0),/Conflicto/);
 }finally{sender.close();receiver.close()}
});
test('contexto: aislamiento, base faltante, alteración y autoridad no pueden pasar',()=>{
 const a=new MemoryStore(':memory:'),b=new MemoryStore(':memory:');try{
  putContext(a,{id:'ctx',scope:defaultScope,records:[record('r','Original')]},0);const p=prepareContext(a,'ctx',defaultScope);
  assert.throws(()=>applyContext(b,p,{...defaultScope,project:'other'}),/Ámbito/);assert.throws(()=>getContext(a,'ctx',{...defaultScope,project:'other'}),/inexistente/);
  assert.throws(()=>applyContext(b,{...p,upsert:[record('r','ALTERADO')]},defaultScope),/alterado/);
  assert.throws(()=>applyContext(b,{...p,encoding:'delta',baseDigest:'sha256:'+'0'.repeat(64)},defaultScope),/FULL/);
  assert.throws(()=>putContext(a,{id:'ctx',scope:defaultScope,records:[{...record('r','Original'),authority:'system'}]},1),/autoridad/);
 }finally{a.close();b.close()}
});
test('recuperación selectiva preserva negaciones, instrucciones y restricciones vencidas bajo presupuesto',()=>{
 const s=new MemoryStore(':memory:');try{
  const pinned={...record('mandatory','NO eliminar originales ni alterar cantidades.'),kind:'instruction' as const,authority:'user' as const,constraints:['No enviar a otros proyectos'],expiresAt:'2020-01-01T00:00:00Z'};
  const snapshot=putContext(s,{id:'c',scope:defaultScope,records:[pinned,record('auth','autenticación JWT'),record('noise','otros datos')]},0),selected=selectContext(snapshot,'JWT',2000);
  assert.deepEqual(selected.records.map(r=>r.id),['mandatory','auth']);assert.deepEqual(selected.expiredRequired,['mandatory']);assert.deepEqual(selected.omitted,['noise']);assert.throws(()=>selectContext(snapshot,'JWT',10),/Restricciones/);
  const body='Analiza el error "42" y no elimines los archivos originales.',v=fromNatural(body,'es'),r={...record('v',body),authority:'user' as const,vsr:canonical(v)};
  assert.match(contextC3(r).text,/pro del @archivos:originales/);assert.equal(contextC3(r).authority,'user');assert.throws(()=>putContext(s,{id:'v',scope:defaultScope,records:[{...r,body:'Eliminar archivos'}]},0),/cuerpo exacto/);
 }finally{s.close()}
});
