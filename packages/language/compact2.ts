import type {Term} from './parser.ts';
import {byId,byWord} from './dictionary.ts';
import {validateTerm} from '../semantic/vsr.ts';

/** C2 is a strictly reversible experimental surface, never a new meaning for a root. */
const ident=/^[A-Za-z0-9_.:/-]+$/;
const action=new Set(['sen','nar','sel','mak','sav','zen','del']);
const scope=new Set(['pro','obl','per','hyp','nu']);
const binary=new Set(['pre','pos','kon','kal']);
const node=(word:string,args:Term[]):Term=>{const root=byWord.get(word);if(!root)throw new Error('Raíz desconocida');return {type:'Concept',concept:root.id,args}};
function reference(term:Term,word:'ri'|'agn'){
  if(term.type!=='Concept'||byId.get(term.concept)?.word!==word||term.args.length!==1||term.args[0].type!=='Literal'||!ident.test(term.args[0].value))throw new Error('Referencia fuera de C2');
  return term.args[0].value;
}
export function printC2(term:Term):string{
  if(term.type!=='Concept')throw new Error('C2 requiere concepto');
  const word=byId.get(term.concept)?.word;
  if(word==='ri')return `@${reference(term,'ri')}`;
  if(word==='agn')return `^${reference(term,'agn')}`;
  if(word==='seq'&&term.args.length>=2)return term.args.map(printC2).join(';');
  if(word&&scope.has(word)&&term.args.length===1)return `${word}{${printC2(term.args[0])}}`;
  if(word&&action.has(word)&&term.args.length===1)return `${word}@${reference(term.args[0],'ri')}`;
  if(word==='dar'&&term.args.length===2)return `dar@${reference(term.args[0],'ri')}>^${reference(term.args[1],'agn')}`;
  if(word&&binary.has(word)&&term.args.length===2)return `${word}{${printC2(term.args[0])}}{${printC2(term.args[1])}}`;
  if(word==='par'&&term.args.length===2)return `par{${printC2(term.args[0])}}{${printC2(term.args[1])}}`;
  throw new Error('Expresión fuera de C2');
}
export function parseC2(text:string):Term{
  if(text.length>100_000)throw new Error('C2 excede tamaño');
  let i=0;
  const readWord=()=>{const start=i;while(/[a-z]/.test(text[i]??''))i++;return text.slice(start,i)};
  const readId=()=>{const start=i;while(/[A-Za-z0-9_.:/-]/.test(text[i]??''))i++;const id=text.slice(start,i);if(!ident.test(id))throw new Error('Identificador C2 inválido');return id};
  function expr(depth:number):Term{
    if(depth>32)throw new Error('Anidamiento C2 excesivo');
    const terms:Term[]=[];
    do{
      if(text[i]==='@'||text[i]==='^'){
        const word=text[i++]==='@'?'ri':'agn';terms.push(node(word,[{type:'Literal',value:readId()}]));
        if(text[i]!==';')break;i++;continue;
      }
      const word=readWord();
      if(action.has(word)&&text[i]==='@'){
        i++;terms.push(node(word,[node('ri',[{type:'Literal',value:readId()}])]));
      }else if(word==='dar'&&text[i]==='@'){
        i++;const ref=readId();if(text.slice(i,i+2)!=='>^')throw new Error('Destino de transferencia C2 obligatorio');i+=2;
        terms.push(node('dar',[node('ri',[{type:'Literal',value:ref}]),node('agn',[{type:'Literal',value:readId()}])]));
      }else if((scope.has(word)||binary.has(word)||word==='par')&&text[i]==='{'){
        i++;const first=expr(depth+1);if(text[i++]!=='}')throw new Error('Alcance C2 sin cierre');
        if(scope.has(word))terms.push(node(word,[first]));
        else {if(text[i++]!=='{')throw new Error('Falta segundo argumento C2');const second=expr(depth+1);if(text[i++]!=='}')throw new Error('Alcance C2 sin cierre');terms.push(node(word,[first,second]))}
      }else throw new Error(`Expresión C2 inválida en ${i}`);
      if(text[i]!==';')break;i++;
    }while(true);
    return terms.length===1?terms[0]:node('seq',terms);
  }
  const result=expr(0);
  if(i!==text.length)throw new Error(`Contenido adicional C2 en ${i}`);
  validateTerm(result);
  if(printC2(result)!==text)throw new Error('Forma C2 no canónica');
  return result;
}
