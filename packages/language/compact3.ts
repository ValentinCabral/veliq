import type {Term} from './parser.ts';
import {byId,byWord} from './dictionary.ts';
import {validateTerm} from '../semantic/vsr.ts';

/** C3: scoped referents + typed prefix composition. No natural-language inference. */
const id=/^[A-Za-z0-9_.:/-]+$/;
const domain=/^[A-Za-z][A-Za-z0-9_-]*$/;
const actions=new Set(['sen','nar','sel','mak','sav','zen','del']);
const unary=new Set(['pro','obl','per','hyp','nu']);
const binary=new Set(['pre','pos','kon','kal','par']);
const make=(word:string,args:Term[]):Term=>{const entry=byWord.get(word);if(!entry)throw Error('Raíz C3 desconocida');return {type:'Concept',concept:entry.id,args}};
function literal(term:Term,word:string):string{
  if(term.type!=='Concept'||byId.get(term.concept)?.word!==word||term.args.length!==1||term.args[0].type!=='Literal'||!id.test(term.args[0].value))throw Error('Referencia fuera del perfil C3');
  return term.args[0].value;
}
function chooseScope(root:Term):string{
  const candidates=new Map<string,number>();
  function visit(term:Term){
    if(term.type!=='Concept')return;
    if(byId.get(term.concept)?.word==='ri'){
      const value=literal(term,'ri'),at=value.indexOf(':');
      const role=value.slice(0,at),suffix=value.slice(at+1);
      if(at>0&&domain.test(role)&&id.test(suffix)&&suffix!=='-')candidates.set(suffix,(candidates.get(suffix)??0)+1);
    }
    term.args.forEach(visit);
  }
  visit(root);
  return [...candidates].sort(([a,n],[b,m])=>m-n||(a<b?-1:a>b?1:0))[0]?.[0]??'-';
}
export function printC3(root:Term):string{
  validateTerm(root);
  const scope=chooseScope(root);
  const reference=(term:Term)=>{const value=literal(term,'ri'),suffix=`:${scope}`;const prefix=value.endsWith(suffix)?value.slice(0,-suffix.length):'';return scope!=='-'&&domain.test(prefix)?prefix:`@${value}`};
  function expression(term:Term):string{
    if(term.type!=='Concept')throw Error('Literal fuera de C3');
    const word=byId.get(term.concept)?.word;
    if(word==='ri')return `ri ${reference(term)}`;
    if(word==='agn')return `agn ${literal(term,'agn')}`;
    if(word&&actions.has(word)&&term.args.length===1)return `${word} ${reference(term.args[0])}`;
    if(word&&unary.has(word)&&term.args.length===1)return `${word} ${expression(term.args[0])}`;
    if(word&&binary.has(word)&&term.args.length===2)return `${word} ${term.args.map(expression).join(' ')}`;
    if(word==='dar'&&term.args.length===2)return `dar ${reference(term.args[0])} ${literal(term.args[1],'agn')}`;
    if(word==='seq'&&term.args.length>=1)return `seq ${term.args.length} ${term.args.map(expression).join(' ')}`;
    throw Error('Expresión fuera de C3');
  }
  const body=root.type==='Concept'&&byId.get(root.concept)?.word==='seq'&&root.args.length>=2?root.args.map(expression).join(' '):expression(root);
  return `${scope} ${body}`;
}
export function parseC3(text:string):Term{
  if(text.length>100_000||!text||text.trim()!==text||text.includes('  ')||/[\t\r\n]/.test(text))throw Error('Texto C3 no canónico');
  const tokens=text.split(' '),scope=tokens.shift();
  if(!scope||!id.test(scope))throw Error('Ámbito C3 inválido');
  let offset=0;
  const next=()=>{const token=tokens[offset++];if(!token)throw Error('Argumento C3 faltante');return token};
  const reference=()=>{const token=next();if(token.startsWith('@')){const value=token.slice(1);if(!id.test(value))throw Error('Referencia C3 inválida');return make('ri',[{type:'Literal',value}])}if(scope==='-'||!domain.test(token))throw Error('Referencia ligada C3 inválida');return make('ri',[{type:'Literal',value:`${token}:${scope}`}])};
  const agent=()=>{const value=next();if(!id.test(value))throw Error('Agente C3 inválido');return make('agn',[{type:'Literal',value}])};
  function expression(depth:number):Term{
    if(depth>32)throw Error('Anidamiento C3 excesivo');
    const word=next();
    if(word==='ri')return reference();
    if(word==='agn')return agent();
    if(actions.has(word))return make(word,[reference()]);
    if(unary.has(word))return make(word,[expression(depth+1)]);
    if(binary.has(word))return make(word,[expression(depth+1),expression(depth+1)]);
    if(word==='dar')return make(word,[reference(),agent()]);
    if(word==='seq'){
      const count=next();if(!/^[1-9][0-9]*$/.test(count)||Number(count)>1000)throw Error('Aridad C3 inválida');
      return make('seq',Array.from({length:Number(count)},()=>expression(depth+1)));
    }
    throw Error(`Raíz C3 desconocida: ${word}`);
  }
  const terms:Term[]=[];while(offset<tokens.length)terms.push(expression(0));
  if(!terms.length)throw Error('Oración C3 vacía');
  const root=terms.length===1?terms[0]:make('seq',terms);validateTerm(root);
  if(printC3(root)!==text)throw Error('Forma C3 no canónica');
  return root;
}
