import {validateRun} from '../metrics/benchmarks.ts';
import type {ExternalRun} from '../metrics/benchmarks.ts';
/** SDK opt-in para harnesses: el llamador aporta las métricas; no se infieren resultados falsos. */
export async function submitBenchmark(run:ExternalRun,endpoint:string,token:string,fetcher:typeof fetch=fetch){
  validateRun(run);if(!token||token.length<16)throw new Error('Token corto o ausente');
  const url=new URL(endpoint);if(url.protocol!=='https:'&&!['localhost','127.0.0.1','::1'].includes(url.hostname))throw new Error('Requiere HTTPS o loopback');
  if(url.username||url.password||url.hash)throw new Error('URL inválida');
  const response=await fetcher(url,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(run),redirect:'error'});
  if(!response.ok)throw new Error(`Ingesta rechazada: HTTP ${response.status}`);
  return response.json();
}
