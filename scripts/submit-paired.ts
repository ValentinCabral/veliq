// Explicit external action. Never uploads prompts, tool results, credentials or raw event streams.
import {readFileSync} from 'node:fs';
import {exportPairedRun,type PairedReport} from '../packages/metrics/paired.ts';
import {submitBenchmark} from '../packages/adapter-sdk/benchmark-client.ts';
const file=process.argv[2],endpoint=process.env.VELIQ_BENCHMARK_URL,token=process.env.VELIQ_INGEST_TOKEN;
if(!file||!endpoint||!token)throw Error('Uso: VELIQ_BENCHMARK_URL=https://endpoint/api/benchmarks VELIQ_INGEST_TOKEN=... node scripts/submit-paired.ts report.json');
const raw=readFileSync(file,'utf8');if(raw.length>20_000_000)throw Error('Informe demasiado grande');const report=JSON.parse(raw) as PairedReport;
console.log(JSON.stringify(await submitBenchmark(exportPairedRun(report),endpoint,token)));
