import {randomUUID,createHash} from 'node:crypto';
import type {MemoryStore} from '../memory/store.ts';
export const messageTypes=['HELLO','CAPABILITIES','DICTIONARY_NEGOTIATE','MESSAGE','TASK','RESULT','ERROR','REFERENCE_REQUEST','REFERENCE_RESPONSE','MEMORY_UPDATE','CONTEXT_DELTA','ACK','CANCEL','HEARTBEAT'] as const;
export type MessageType=typeof messageTypes[number];
export type Encoding='natural'|'veliq-text'|'vsr'|'reference'|'delta'|'hybrid';
export type Envelope={protocol_version:'0.1';message_id:string;session_id:string;source:string;destination:string;timestamp:string;message_type:MessageType;encoding:Encoding;dictionary_version:'0.1';payload:string;references:string[];constraints:string[];correlation_id?:string;integrity:string};
const digest=(e:Omit<Envelope,'integrity'>)=>createHash('sha256').update(JSON.stringify(e)).digest('hex');
export function message(input:Omit<Envelope,'protocol_version'|'message_id'|'timestamp'|'dictionary_version'|'integrity'>):Envelope{
  const data={protocol_version:'0.1' as const,message_id:randomUUID(),timestamp:new Date().toISOString(),dictionary_version:'0.1' as const,...input};return {...data,integrity:digest(data)};
}
export function validate(e:Envelope){if(e.protocol_version!=='0.1'||e.dictionary_version!=='0.1'||!messageTypes.includes(e.message_type)||!Array.isArray(e.references)||!Array.isArray(e.constraints)||!e.source||!e.destination||!e.session_id)throw new Error('Envelope inválido');
  const {integrity,...data}=e;if(integrity!==digest(data))throw new Error('Integridad inválida');}
export type Capabilities={versions:string[];dictionaries:string[];encodings:Encoding[];referenceRecovery:boolean;maxPayload:number};
export function negotiate(a:Capabilities,b:Capabilities):Encoding{
  if(!a.versions.includes('0.1')||!b.versions.includes('0.1'))throw new Error('Sin versión común');
  const compatible=a.dictionaries.includes('0.1')&&b.dictionaries.includes('0.1');
  for(const c of (compatible?['veliq-text','vsr','reference','natural']:['natural']) as Encoding[]){if(c==='reference'&&(!a.referenceRecovery||!b.referenceRecovery))continue;if(a.encodings.includes(c)&&b.encodings.includes(c))return c;}throw new Error('Sin codificación común');
}
export class Peer {
  seen=new Set<string>();received:Envelope[]=[];
  id:string;store:MemoryStore;capabilities:Capabilities;
  constructor(id:string,store:MemoryStore,capabilities:Capabilities){this.id=id;this.store=store;this.capabilities=capabilities}
  receive(e:Envelope,sender:Peer):string {
    validate(e);if(e.destination!==this.id)throw new Error('Destino incorrecto');if(this.seen.has(e.message_id))return 'duplicado';
    if(e.payload.length>this.capabilities.maxPayload)throw new Error('Payload excedido');
    const encoding=negotiate(this.capabilities,sender.capabilities);if(e.encoding!=='natural'&&e.encoding!==encoding&&!(e.encoding==='reference'&&this.capabilities.referenceRecovery))throw new Error('Codificación no negociada');
    const recovered=e.references.map(ref=>{try{return this.store.getContent(ref)}catch{return this.store.putContent(sender.store.getContent(ref))&&this.store.getContent(ref)}});
    this.seen.add(e.message_id);this.received.push(e);return e.encoding==='reference'?recovered.join('\n'):e.payload;
  }
}
