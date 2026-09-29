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
 try{await Promise.all([server.connect(a),client.connect(b)]);const listed=await client.listTools();assert.deepEqual(listed.tools.map(x=>x.name).sort(),['veliq.benchmark','veliq.capabilities','veliq.decode','veliq.encode','veliq.memory.retrieve','veliq.memory.store','veliq.optimize','veliq.validate']);
 const text='Analiza el error "1" y no elimines los archivos originales.';
 const encoded=parse(await client.callTool({name:'veliq.encode',arguments:{text}}));assert.match(encoded.text,/pro\(del/);
 const optimized=parse(await client.callTool({name:'veliq.optimize',arguments:{text,mode:'observe'}}));assert.equal(optimized.output,text);assert.equal(optimized.strategy,'natural');
 const invalid=await client.callTool({name:'veliq.encode',arguments:{text:'Borrá archivos'}});assert.equal(invalid.isError,true);
 const saved=parse(await client.callTool({name:'veliq.memory.store',arguments:{id:'m',scope,kind:'project',body:'contenido',provenance:'user'}}));assert.equal(saved.version,1);
 const found=parse(await client.callTool({name:'veliq.memory.retrieve',arguments:{scope}}));assert.equal(found[0].body,'contenido');
 const isolated=parse(await client.callTool({name:'veliq.memory.retrieve',arguments:{scope:{...scope,project:'otro'}}}));assert.equal(isolated.length,0);
 }finally{await client.close();await server.close();db.close()}
});
test('MCP stdio: cliente oficial inicia servidor real y llama herramienta',async()=>{
 const transport=new StdioClientTransport({command:process.execPath,args:['--experimental-strip-types',new URL('../apps/cli/main.ts',import.meta.url).pathname,'mcp'],env:{...process.env,VELIQ_HOME:'.veliq/test-mcp-stdio'}});
 const client=new Client({name:'veliq-stdio-test',version:'1.0'});try{await client.connect(transport);const r=await client.callTool({name:'veliq.capabilities',arguments:{}});assert.equal(parse(r).language,'0.1')}finally{await client.close()}
});
