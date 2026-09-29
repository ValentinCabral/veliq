import type {Term} from './parser.ts';
import {byId,byWord} from './dictionary.ts';
import {validateTerm} from '../semantic/vsr.ts';

/** Surface profile C1. ASCII identifiers only; every supported expression has one canonical form. */
const identifier=/^[A-Za-z0-9_.:/-]+$/;
const actions=new Set(['sen','nar','sel','mak','sav','zen','del']);
const scoped=new Set(['pro','obl','per','hyp','nu']);
const concept=(word:string,args:Term[]):Term=>{const entry=byWord.get(word);if(!entry)throw new Error('Raíz desconocida');return {type:'Concept',concept:entry.id,args}};
export function printCompact(term:Term):string {
  if(term.type!=='Concept')throw new Error('Perfil C1 requiere concepto');
  const word=byId.get(term.concept)?.word;
  if(word==='seq'&&term.args.length>=2)return term.args.map(printCompact).join(';');
  if(word&&scoped.has(word)&&term.args.length===1)return `${word}{${printCompact(term.args[0])}}`;
  if(word&&actions.has(word)&&term.args.length===1){
    const target=term.args[0];
    if(target.type==='Concept'&&byId.get(target.concept)?.word==='ri'&&target.args.length===1&&target.args[0].type==='Literal'&&identifier.test(target.args[0].value))return `${word}@${target.args[0].value}`;
  }
  throw new Error('Expresión fuera del perfil compacto C1');
}
export function parseCompact(text:string):Term {
  if(text.length>100_000)throw new Error('Entrada demasiado grande');
  let offset=0;
  function expression(depth:number):Term {
    if(depth>32)throw new Error('Anidamiento excesivo');
    const terms:Term[]=[];
    while(true){
      const start=offset;
      while(/[a-z]/.test(text[offset]??''))offset++;
      const word=text.slice(start,offset);
      if(scoped.has(word)&&text[offset]==='{'){
        offset++;
        const child=expression(depth+1);
        if(text[offset++]!=='}')throw new Error('Falta cierre de alcance');
        terms.push(concept(word,[child]));
      }else if(actions.has(word)&&text[offset]==='@'){
        offset++;
        const idStart=offset;
        while(/[A-Za-z0-9_.:/-]/.test(text[offset]??''))offset++;
        const id=text.slice(idStart,offset);
        if(!identifier.test(id))throw new Error('Referencia inválida');
        terms.push(concept(word,[concept('ri',[{type:'Literal',value:id}])]));
      }else throw new Error(`Expresión C1 inválida en ${start}`);
      if(text[offset]!==';')break;
      offset++;
    }
    return terms.length===1?terms[0]:concept('seq',terms);
  }
  const term=expression(0);
  if(offset!==text.length)throw new Error(`Contenido adicional en ${offset}`);
  validateTerm(term);
  if(printCompact(term)!==text)throw new Error('Forma no canónica');
  return term;
}
