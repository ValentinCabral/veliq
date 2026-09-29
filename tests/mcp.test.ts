import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {MemoryStore} from '../packages/memory/store.ts';
import {createVeliqMcp} from '../adapters/mcp/server.ts';
const parse=(r:any)=>JSON.parse(r.content[0].text);
const scope={user:'u',workspace:'w',project:'p',session:'s',agent:'a'};
test('MCP SDK: handshake, herramientas, VSR, Observe y memoria aislada',async()=>{
 const db=new MemoryStore(':memory:'),server=createVeliqMcp(db),client=new Client({name:'veliq-test',version:'1.0'}),[a,b]=InMemoryTransport.createLinkedPair();
 try{await Promise.all([server.connect(a),client.connect(b)]);const listed=await client.listTools();assert.deepEqual(listed.tools.map(x=>x.name).sort(),['veliq.benchmark','veliq.capabilities','veliq.context.apply','veliq.context.select','veliq.context.store','veliq.context.sync','veliq.decode','veliq.encode','veliq.memory.exact.select','veliq.memory.exact.store','veliq.memory.retrieve','veliq.memory.store','veliq.optimize','veliq.pick','veliq.validate']);
 const text='Analiza el error "1" y no elimines los archivos originales.';
 const encoded=parse(await client.callTool({name:'veliq.encode',arguments:{text}}));assert.match(encoded.text,/pro\(del/);
 const c1=parse(await client.callTool({name:'veliq.encode',arguments:{text:'Analyze error "1" and do not delete the original files.',language:'en',surface:'compact'}}));assert.equal(c1.text,'sen@error:1;pro{del@archivos:originales}');
 const decoded=parse(await client.callTool({name:'veliq.decode',arguments:{text:c1.text,format:'compact'}}));assert.match(decoded.veliq,/pro\(del/);
 const c3=parse(await client.callTool({name:'veliq.encode',arguments:{text:'Analyze error "case-001", fix it, and verify tests "case-001".',language:'en',surface:'c3'}}));assert.equal(c3.text,'case-001 sen error nar error sel tests');
 const c3Decoded=parse(await client.callTool({name:'veliq.decode',arguments:{text:c3.text,format:'c3'}}));assert.match(c3Decoded.veliq,/seq\(sen\(ri\("error:case-001"\)\),nar/);
 const charged=parse(await client.callTool({name:'veliq.optimize',arguments:{text,mode:'hybrid',c3Negotiated:true}}));assert.equal(charged.strategy,'natural');
 const c3Selected=parse(await client.callTool({name:'veliq.optimize',arguments:{text,mode:'hybrid',c3Negotiated:true,setupPaid:true}}));assert.equal(c3Selected.strategy,'veliq-c3');
 const optimized=parse(await client.callTool({name:'veliq.optimize',arguments:{text,mode:'observe'}}));assert.equal(optimized.output,text);assert.equal(optimized.strategy,'natural');
 const invalid=await client.callTool({name:'veliq.encode',arguments:{text:'Borrá archivos'}});assert.equal(invalid.isError,true);
 const saved=parse(await client.callTool({name:'veliq.memory.store',arguments:{id:'m',scope,kind:'project',body:'contenido',provenance:'user'}}));assert.equal(saved.version,1);
 const found=parse(await client.callTool({name:'veliq.memory.retrieve',arguments:{scope}}));assert.equal(found[0].body,'contenido');
 const isolated=parse(await client.callTool({name:'veliq.memory.retrieve',arguments:{scope:{...scope,project:'otro'}}}));assert.equal(isolated.length,0);
 parse(await client.callTool({name:'veliq.memory.exact.store',arguments:{id:'d',scope,document:{version:'0.1',constraints:['No borrar originales'],records:[{id:'r',body:'Dato exacto'}]}}}));
 const selected=parse(await client.callTool({name:'veliq.memory.exact.select',arguments:{id:'d',scope,recordId:'r'}}));assert.equal(selected.record.body,'Dato exacto');assert.deepEqual(selected.constraints,['No borrar originales']);
 const picked=parse(await client.callTool({name:'veliq.pick',arguments:{id:'d',scope,recordId:'r'}}));assert.deepEqual(picked,{constraints:['No borrar originales'],record:{id:'r',body:'Dato exacto'}});
 const absent=await client.callTool({name:'veliq.memory.exact.select',arguments:{id:'d',scope:{...scope,project:'otro'},recordId:'r'}});assert.equal(absent.isError,true);
 const record={id:'constraint',kind:'instruction',authority:'user',body:'No borrar /original.',constraints:['No borrar /original.'],tags:['safety'],pinned:true,provenance:'test',acquiredAt:'2026-09-29T00:00:00Z'};
 const context=parse(await client.callTool({name:'veliq.context.store',arguments:{input:{id:'context',scope,records:[record]},expectedVersion:0}}));
 const relevant=parse(await client.callTool({name:'veliq.context.select',arguments:{id:'context',scope,query:'unrelated'}}));assert.equal(relevant.records[0].body,record.body);
 const packet=parse(await client.callTool({name:'veliq.context.sync',arguments:{id:'context',scope}}));assert.equal(packet.digest,context.digest);
 const duplicate=parse(await client.callTool({name:'veliq.context.apply',arguments:{packet,authorizedScope:scope}}));assert.equal(duplicate.duplicate,true);
 }finally{await client.close();await server.close();db.close()}
});
test('MCP stdio: cliente oficial inicia servidor real y llama herramienta',async()=>{
 const transport=new StdioClientTransport({command:process.execPath,args:['--experimental-strip-types',new URL('../apps/cli/main.ts',import.meta.url).pathname,'mcp'],env:{...process.env,VELIQ_HOME:'.veliq/test-mcp-stdio'}});
 const client=new Client({name:'veliq-stdio-test',version:'1.0'});try{await client.connect(transport);const r=await client.callTool({name:'veliq.capabilities',arguments:{}});assert.equal(parse(r).language,'0.1')}finally{await client.close()}
});
