import {readFileSync} from 'node:fs';
import {taskKinds,taskExample,conciseExample,scopedNaturalExample,naturalExample,fromNatural,semanticId,type SupportedLanguage} from '../../packages/semantic/vsr.ts';
import {printC2,parseC2} from '../../packages/language/compact2.ts';
import {printC3,parseC3} from '../../packages/language/compact3.ts';

type Case={id:string;category:'agent-instruction'|'code'|'tool-result'|'document'|'other';source:string;language?:string;original:string;concise?:string;scopedNatural?:string;c2?:string;c3?:string};
function emit(row:Case){process.stdout.write(JSON.stringify(row)+'\n')}
const input=process.argv[2];
if(input){
  const lines=readFileSync(input,'utf8').split(/\r?\n/).filter(Boolean);
  if(lines.length>10_000)throw new Error('Corpus demasiado grande');
  for(const [index,line] of lines.entries()){
    const row=JSON.parse(line);
    if(typeof row.text!=='string'||row.text.length>100_000||typeof row.category!=='string')throw new Error(`Caso externo inválido: ${index+1}`);
    const category=(['agent-instruction','code','tool-result','document'].includes(row.category)?row.category:'other') as Case['category'];
    const result:Case={id:String(index+1),category,source:'external-opt-in',original:row.text};
    if(category==='agent-instruction'&&['en','es','pt','fr','de','it','nl','zh','ja','ko'].includes(row.language)){
      result.language=row.language;
      try{const vsr=fromNatural(row.text,row.language as SupportedLanguage),c2=printC2(vsr.root),c3=printC3(vsr.root);if(semanticId({...vsr,root:parseC2(c2)})!==semanticId(vsr)||semanticId({...vsr,root:parseC3(c3)})!==semanticId(vsr))throw new Error('Divergencia');result.c2=c2;result.c3=c3}catch{}
    }
    emit(result);
  }
}else{
  // Workload proxy: controlled agent instructions plus exact public source excerpts, NOT actual harness telemetry.
  for(const language of ['en','es'] as const)for(let n=1;n<=50;n++){
    const id=`case-${String(n).padStart(3,'0')}`;
    for(const kind of ['analyze_no_delete',...taskKinds] as const){
      const original=kind==='analyze_no_delete'?naturalExample(language,id):taskExample(language,kind,id);
      const concise=kind==='analyze_no_delete'?original:conciseExample(language,kind,id);
      const scopedNatural=kind==='analyze_no_delete'?original:scopedNaturalExample(language,kind,id);
      const v=fromNatural(original,language),candidate=printC2(v.root),c3=printC3(v.root);
      if(semanticId(fromNatural(scopedNatural,language))!==semanticId(v)||semanticId(fromNatural(concise,language))!==semanticId(v)||semanticId({...v,root:parseC2(candidate)})!==semanticId(v)||semanticId({...v,root:parseC3(c3)})!==semanticId(v))throw new Error(`Caso divergente ${language}/${kind}/${id}`);
      emit({id:`${language}:${kind}:${id}`,category:'agent-instruction',source:'synthetic-controlled',language,original,concise,scopedNatural,c2:candidate,c3});
    }
  }
  const code=['packages/language/parser.ts','packages/language/dictionary.ts','packages/protocol/protocol.ts','packages/memory/store.ts','packages/codec/optimizer.ts','packages/codec/selective.ts','apps/gateway/server.ts','apps/cli/main.ts','adapters/mcp/server.ts','adapters/opencode/config.ts'];
  const docs=['README.md','ARCHITECTURE.md','PROGRESS.md','docs/BENCHMARKS.md','docs/HARNESSES.md','docs/EXTERNAL_BENCHMARKS.md','docs/SECURITY.md','docs/MEMORY_SPEC.md','docs/TOKEN_OPTIMIZATION.md','docs/language/LANGUAGE_SPEC.md'];
  for(const [category,files] of [['code',code],['document',docs]] as const)for(const path of files){
    const content=readFileSync(path,'utf8');
    for(let n=0;n<10;n++){
      const start=Math.floor(n*content.length/10),end=Math.floor((n+1)*content.length/10);
      const original=`FILE ${path}\n${content.slice(start,end)}`;
      emit({id:`${category}:${path}:${n}`,category:category==='code'?'code':n<5?'tool-result':'document',source:'repository-public',original});
    }
  }
}
