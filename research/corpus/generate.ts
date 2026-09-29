import {writeFileSync} from 'node:fs';
writeFileSync(new URL('./synthetic.jsonl',import.meta.url),Array.from({length:1000},(_,i)=>JSON.stringify({id:i+1,source:'synthetic',text:`Analiza el error "caso-${i+1}" y no elimines los archivos originales.`})).join('\n')+'\n');
