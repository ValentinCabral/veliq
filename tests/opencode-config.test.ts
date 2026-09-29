import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {connectOpenCode,disconnectOpenCode} from '../adapters/opencode/config.ts';
test('instalador OpenCode preserva configuración, respalda y desinstala sólo VELIQ',()=>{const dir=mkdtempSync(join(tmpdir(),'veliq-config-')),target=join(dir,'opencode.json');writeFileSync(target,JSON.stringify({theme:'dark',mcp:{other:{type:'remote',url:'https://example.org'}}}));const a=connectOpenCode(dir);assert.ok(existsSync(a.backup!));let x=JSON.parse(readFileSync(target,'utf8'));assert.equal(x.theme,'dark');assert.ok(x.mcp.other);assert.equal(x.mcp.veliq.type,'local');assert.throws(()=>connectOpenCode(dir));const b=disconnectOpenCode(dir);assert.ok(existsSync(b.backup));x=JSON.parse(readFileSync(target,'utf8'));assert.ok(x.mcp.other);assert.equal(x.mcp.veliq,undefined)});
test('configuración JSONC no se pisa',()=>{const dir=mkdtempSync(join(tmpdir(),'veliq-config-'));writeFileSync(join(dir,'opencode.jsonc'),'{}');assert.throws(()=>connectOpenCode(dir),/jsonc/)});
