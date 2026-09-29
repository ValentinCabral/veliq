import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import type {Count,TokenCounter} from './optimizer.ts';

/** Optional offline Python adapter. Exact encoded text, not a complete provider request. */
export class TiktokenCounter implements TokenCounter {
  readonly encoding:'cl100k_base'|'o200k_base';
  constructor(encoding:'cl100k_base'|'o200k_base'){this.encoding=encoding}
  count(value:string):Count{
    const script=fileURLToPath(new URL('../../scripts/count-tokens.py',import.meta.url));
    const result=spawnSync('python3',[script,this.encoding],{input:value,encoding:'utf8',timeout:10_000,maxBuffer:100_000});
    if(result.status!==0||!/^\d+\s*$/.test(result.stdout))throw new Error(`Tokenizador tiktoken no disponible: ${result.stderr||'instalá research/benchmarks/requirements.txt'}`);
    return {value:Number(result.stdout.trim()),kind:'exact-text-tokens',model:this.encoding};
  }
}
