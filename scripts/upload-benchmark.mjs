#!/usr/bin/env node
// Cliente opt-in: no transmite contenido de prompts, sólo el resumen JSON provisto.
import {readFileSync} from 'node:fs';
const [file]=process.argv.slice(2),url=process.env.VELIQ_BENCHMARK_URL,token=process.env.VELIQ_INGEST_TOKEN;
if(!file||!url||!token){console.error('Uso: VELIQ_BENCHMARK_URL=http://127.0.0.1:4173/api/benchmarks VELIQ_INGEST_TOKEN=... node scripts/upload-benchmark.mjs corrida.json');process.exit(2)}
const target=new URL(url);if(target.protocol!=='https:'&&!['127.0.0.1','localhost','::1'].includes(target.hostname))throw new Error('Sólo HTTPS o loopback');
const body=readFileSync(file,'utf8');if(body.length>64_000)throw new Error('Archivo demasiado grande');
const response=await fetch(target,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body});
console.log(await response.text());if(!response.ok)process.exitCode=1;
