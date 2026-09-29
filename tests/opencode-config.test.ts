import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {connectOpenCode,disconnectOpenCode,installOpenCodeObserver,uninstallOpenCodeObserver} from '../adapters/opencode/config.ts';
test('instalador OpenCode preserva configuración, respalda y desinstala sólo VELIQ',()=>{const dir=mkdtempSync(join(tmpdir(),'veliq-config-')),target=join(dir,'opencode.json');writeFileSync(target,JSON.stringify({theme:'dark',mcp:{other:{type:'remote',url:'https://example.org'}}}));const a=connectOpenCode(dir);assert.ok(existsSync(a.backup!));let x=JSON.parse(readFileSync(target,'utf8'));assert.equal(x.theme,'dark');assert.ok(x.mcp.other);assert.equal(x.mcp.veliq.type,'local');assert.throws(()=>connectOpenCode(dir));const b=disconnectOpenCode(dir);assert.ok(existsSync(b.backup));x=JSON.parse(readFileSync(target,'utf8'));assert.ok(x.mcp.other);assert.equal(x.mcp.veliq,undefined)});
test('configuración JSONC no se pisa',()=>{const dir=mkdtempSync(join(tmpdir(),'veliq-config-'));writeFileSync(join(dir,'opencode.jsonc'),'{}');assert.throws(()=>connectOpenCode(dir),/jsonc/)});
test('observador OpenCode se instala reversible y rechaza modificaciones ajenas',()=>{
 const dir=mkdtempSync(join(tmpdir(),'veliq-observe-config-'));
 try{const installed=installOpenCodeObserver(dir);assert.ok(existsSync(installed.target));assert.ok(existsSync(installed.receipt));assert.throws(()=>installOpenCodeObserver(dir));
  const original=readFileSync(installed.target);writeFileSync(installed.target,'// cambio ajeno');assert.throws(()=>uninstallOpenCodeObserver(dir),/modificado/);writeFileSync(installed.target,original);
  uninstallOpenCodeObserver(dir);assert.equal(existsSync(installed.target),false);assert.equal(existsSync(installed.receipt),false);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
