import {MemoryStore,defaultScope} from '../packages/memory/store.ts';
import {putContext,prepareContext,applyContext,getContext,selectContext} from '../packages/memory/context.ts';
import {fromNatural,canonical} from '../packages/semantic/vsr.ts';
import {contextC3} from '../packages/memory/context.ts';
const sender=new MemoryStore(':memory:'),receiver=new MemoryStore(':memory:');
try{
 const body='Analiza el error "42" y no elimines los archivos originales.',vsr=fromNatural(body,'es');
 const instruction={id:'instruction',kind:'instruction' as const,authority:'user' as const,body,vsr:canonical(vsr),constraints:['No eliminar archivos originales'],tags:['error'],pinned:true,provenance:'usuario',acquiredAt:'2026-09-29T00:00:00Z'};
 const records=[instruction,...Array.from({length:30},(_,i)=>({id:'fact-'+i,kind:'fact' as const,authority:'tool' as const,body:`Observación exacta ${i}: sin errores.`,constraints:[],tags:['test-'+i],pinned:false,provenance:'prueba local',acquiredAt:'2026-09-29T00:00:00Z'}))];
 putContext(sender,{id:'demo',scope:defaultScope,records},0);const first=prepareContext(sender,'demo',defaultScope),ack=applyContext(receiver,first,defaultScope);
 records[1]={...records[1],body:'Observación exacta 0: prueba verificada.'};putContext(sender,{id:'demo',scope:defaultScope,records},1);
 const delta=prepareContext(sender,'demo',defaultScope,ack.ack);applyContext(receiver,delta,defaultScope);
 console.log(JSON.stringify({instruction:body,c3:contextC3(instruction),fullBytes:Buffer.byteLength(JSON.stringify(first)),deltaBytes:Buffer.byteLength(JSON.stringify(delta)),encoding:delta.encoding,snapshotsEqual:getContext(sender,'demo',defaultScope).digest===getContext(receiver,'demo',defaultScope).digest,relevant:selectContext(getContext(receiver,'demo',defaultScope),'test-0'),final:'Contexto actualizado: se conservó la instrucción de no eliminar los archivos originales.'},null,2));
}finally{sender.close();receiver.close()}
