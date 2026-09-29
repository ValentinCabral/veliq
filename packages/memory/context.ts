import {z} from 'zod';
import {MemoryStore,type Scope} from './store.ts';
import {decode,canonical,toNatural,type VSR} from '../semantic/vsr.ts';
import {printC3,parseC3} from '../language/compact3.ts';
import {print} from '../language/parser.ts';
const id=z.string().min(1).max(256);
export const contextScopeSchema=z.object({user:id,workspace:id,project:id,session:id,agent:id}).strict();
export const contextRecordSchema=z.object({id,kind:z.enum(['fact','instruction','tool','document','decision','preference']),authority:z.enum(['user','system','tool','external','agent']),body:z.string().max(100_000),constraints:z.array(z.string().min(1).max(10_000)).max(100),tags:z.array(z.string().min(1).max(128)).max(100),pinned:z.boolean(),provenance:z.string().min(1).max(256),acquiredAt:z.string().datetime({offset:true}),expiresAt:z.string().datetime({offset:true}).optional(),vsr:z.string().max(100_000).optional()}).strict();
export const contextInputSchema=z.object({id,scope:contextScopeSchema,records:z.array(contextRecordSchema).max(1000)}).strict();
export type ContextRecord=z.infer<typeof contextRecordSchema>;
export type ContextInput=z.infer<typeof contextInputSchema>;
export type ContextSnapshot=ContextInput&{version:'0.1';revision:number;digest:string};
const digestSchema=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const snapshotSchema=contextInputSchema.extend({version:z.literal('0.1'),revision:z.number().int().positive(),digest:digestSchema});
export const contextPacketSchema=z.object({version:z.literal('0.1'),id,scope:contextScopeSchema,revision:z.number().int().positive(),digest:digestSchema,encoding:z.enum(['full','delta']),baseDigest:digestSchema.optional(),upsert:z.array(contextRecordSchema).max(1000),removed:z.array(id).max(1000)}).strict();
export type ContextPacket=z.infer<typeof contextPacketSchema>;
function normalized(input:ContextInput):ContextInput{
  const x=contextInputSchema.parse(input),seen=new Set();
  for(const r of x.records){if(seen.has(r.id))throw Error('ID de contexto duplicado');seen.add(r.id);
    if(r.vsr){const v=decode(r.vsr);if(v.provenance?.authority!==r.authority)throw Error('VSR no puede cambiar autoridad');if(v.original?toNatural(v)!==r.body:print(v.root)!==r.body)throw Error('VSR no corresponde al cuerpo exacto');r.vsr=canonical(v)}
  }
  x.records.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);return x;
}
function digest(input:ContextInput,revision:number){return 'sha256:'+MemoryStore.hash(JSON.stringify({version:'0.1',revision,...normalized(input)}))}
function verified(raw:unknown):ContextSnapshot{const s=snapshotSchema.parse(raw);if(s.digest!==digest({id:s.id,scope:s.scope,records:s.records},s.revision))throw Error('Snapshot alterado');return s}
export function putContext(store:MemoryStore,input:ContextInput,expectedVersion:number):ContextSnapshot{
  const n=normalized(input),revision=expectedVersion+1,s={version:'0.1' as const,revision,...n,digest:digest(n,revision)};
  const previous=store.latest('context:'+n.id,n.scope);if(previous&&!previous.invalidated){const old=getContext(store,n.id,n.scope),byId=new Map(old.records.map(r=>[r.id,r]));for(const r of n.records)if(byId.has(r.id)&&byId.get(r.id)!.authority!==r.authority)throw Error('Cambiar autoridad requiere un nuevo ID, no una transformación');}
  store.put('context:'+n.id,n.scope,'project',JSON.stringify(s),'veliq.context',expectedVersion);return s;
}
export function getContext(store:MemoryStore,id:string,scope:Scope):ContextSnapshot{
  const row=store.latest('context:'+id,scope);if(!row||row.invalidated)throw Error('Contexto inexistente en este ámbito');return verified(JSON.parse(store.getContent(row.hash)));
}
export function selectContext(snapshot:ContextSnapshot,query:string,maxBytes=100_000,now=Date.now()){
  verified(snapshot);if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('Presupuesto inválido');
  const words=query.toLocaleLowerCase().split(/\s+/).filter(Boolean),required=snapshot.records.filter(r=>r.pinned||r.constraints.length>0||r.kind==='instruction');
  // Critical instructions/constraints stay even when expired; expiry is annotated, never silently dropped.
  const score=(r:ContextRecord)=>words.reduce((n,w)=>n+((r.id+' '+r.tags.join(' ')+' '+r.body).toLocaleLowerCase().includes(w)?1:0),0);
  const rest=snapshot.records.filter(r=>!required.includes(r)&&(!r.expiresAt||Date.parse(r.expiresAt)>now)&&score(r)>0).sort((a,b)=>score(b)-score(a)||(a.id<b.id?-1:1));
  const selected=[...required];
  const size=()=>Buffer.byteLength(JSON.stringify(selected));if(size()>maxBytes)throw Error('Restricciones/instrucciones exceden presupuesto: usar contexto completo o aumentar límite');
  for(const r of rest){selected.push(r);if(size()>maxBytes)selected.pop()}
  return {version:'0.1',digest:snapshot.digest,scope:snapshot.scope,records:selected,omitted:snapshot.records.filter(r=>!selected.includes(r)).map(r=>r.id),expiredRequired:required.filter(r=>r.expiresAt&&Date.parse(r.expiresAt)<=now).map(r=>r.id),bytes:size()};
}
export function prepareContext(store:MemoryStore,id:string,scope:Scope,receiverDigest?:string):ContextPacket{
  const current=getContext(store,id,scope),full:ContextPacket={version:'0.1',id,scope,revision:current.revision,digest:current.digest,encoding:'full',upsert:current.records,removed:[]};
  if(!receiverDigest)return full;
  // ACK must identify an actual scoped historical snapshot. Unknown ACK falls back to full.
  const rows=store.db.prepare('SELECT hash FROM memory WHERE id=? AND user=? AND workspace=? AND project=? AND session=? AND agent=? ORDER BY version DESC').all('context:'+id,scope.user,scope.workspace,scope.project,scope.session,scope.agent) as {hash:string}[];
  const old=rows.map(r=>verified(JSON.parse(store.getContent(r.hash)))).find(s=>s.digest===receiverDigest);
  if(!old)return full;
  const byId=new Map(old.records.map(r=>[r.id,JSON.stringify(r)])),next=new Set(current.records.map(r=>r.id));
  const delta:ContextPacket={...full,encoding:'delta',baseDigest:old.digest,upsert:current.records.filter(r=>byId.get(r.id)!==JSON.stringify(r)),removed:old.records.filter(r=>!next.has(r.id)).map(r=>r.id)};
  return Buffer.byteLength(JSON.stringify(delta))<Buffer.byteLength(JSON.stringify(full))?delta:full;
}
export function applyContext(store:MemoryStore,input:ContextPacket,authorizedScope:Scope){
  const packet=contextPacketSchema.parse(input);if(JSON.stringify(contextScopeSchema.parse(packet.scope))!==JSON.stringify(contextScopeSchema.parse(authorizedScope)))throw Error('Ámbito no autorizado');
  const exists=store.latest('context:'+packet.id,authorizedScope);const old=exists&&!exists.invalidated?getContext(store,packet.id,authorizedScope):undefined;
  if(old?.digest===packet.digest)return {ack:old.digest,revision:old.revision,duplicate:true};
  if(old&&packet.revision<=old.revision)throw Error('Contexto fuera de orden');
  if(packet.encoding==='delta'&&(!old||old.digest!==packet.baseDigest))throw Error('Base faltante: solicitar FULL');
  if(packet.encoding==='full'&&(packet.baseDigest||packet.removed.length))throw Error('FULL no admite base ni eliminaciones');
  if(new Set(packet.removed).size!==packet.removed.length||new Set(packet.upsert.map(r=>r.id)).size!==packet.upsert.length)throw Error('Delta duplicado');
  const records=new Map(packet.encoding==='delta'?old!.records.map(r=>[r.id,r]):[]);
  for(const key of packet.removed){if(!records.has(key))throw Error('Eliminación desconocida');records.delete(key)}
  for(const r of packet.upsert)records.set(r.id,r);
  for(const r of packet.upsert){const prior=old?.records.find(x=>x.id===r.id);if(prior&&prior.authority!==r.authority)throw Error('Autoridad alterada');}
  const n=normalized({id:packet.id,scope:packet.scope,records:[...records.values()]}),next:ContextSnapshot={...n,version:'0.1',revision:packet.revision,digest:packet.digest};verified(next);
  // Local storage version and wire revision are deliberately separate after missing deliveries.
  store.put('context:'+packet.id,authorizedScope,'project',JSON.stringify(next),'veliq.context.receive',store.latest('context:'+packet.id,authorizedScope)?.version??0);
  return {ack:packet.digest,revision:packet.revision,duplicate:false};
}
/** C3 is a reversible wire view of verified VSR, never an unvalidated natural-language summary. */
export function contextC3(record:ContextRecord){
  if(!record.vsr)throw Error('Registro sin VSR verificada');const v:VSR=decode(record.vsr);
  if(v.provenance?.authority!==record.authority)throw Error('Autoridad alterada');const text=printC3(v.root);
  if(print(parseC3(text))!==print(v.root))throw Error('C3 no reversible');return {text,authority:record.authority,provenance:record.provenance,constraints:record.constraints};
}
