// Public synthetic tasks. No installation, model invocation or upload.
import {writeFileSync} from 'node:fs';
const output=process.argv[2];if(!output)throw Error('Uso: node scripts/create-paired-fixtures.mjs manifest.json [provider/model]');
const manifest={version:'0.1',dataset:'public-repeated-context-v1',harness:'opencode',executable:'opencode',model:process.argv[3]??'openai/gpt-5.4',encoding:'o200k_base',strategy:'context-reference',repetitions:1,timeoutMs:120000,cases:Array.from({length:5},(_,i)=>{
  const expectedJson={id:'case-'+i,quantity:7+i,allowed:false,destination:'local'},body=JSON.stringify({constraints:['NO eliminar archivos originales.','No alterar cantidades ni destinos.'],answer:expectedJson,records:Array.from({length:100},(_,j)=>({id:'record-'+j,data:'Información pública sintética '+j}))},null,2);
  return {id:'case-'+i,prompt:'Lee fixture.json con la herramienta read. Luego vuelve a leer el mismo archivo con los mismos argumentos para comprobar su vigencia. Devuelve sólo el objeto answer como JSON. No modificar ningún archivo ni violar constraints.',files:{'fixture.json':body},expectedJson,protectedFiles:['fixture.json']};
})};
writeFileSync(output,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});console.log('Manifest sintético creado; la ejecución requiere --allow-external.');
