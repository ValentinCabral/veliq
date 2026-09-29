import {byWord,byId} from './dictionary.ts';
export type Term = {type:'Literal';value:string} | {type:'Concept';concept:number;args:Term[]};
export class SyntaxErrorVeliq extends Error { offset:number; constructor(message:string, offset:number){super(`${message} en posición ${offset}`);this.offset=offset} }
const MAX_DEPTH=32, MAX_INPUT=100_000;
export function parse(text:string):Term {
  if(text.length>MAX_INPUT) throw new SyntaxErrorVeliq('Entrada demasiado grande',MAX_INPUT);
  let i=0; const skip=()=>{while(/\s/.test(text[i]??'')&&i<text.length)i++};
  function term(depth:number):Term {
    if(depth>MAX_DEPTH)throw new SyntaxErrorVeliq('Anidamiento excesivo',i);
    skip();
    if(text[i]==='"') {
      const start=i++; let escaped=false;
      while(i<text.length){const c=text[i++];if(c==='"'&&!escaped){let value:unknown;try{value=JSON.parse(text.slice(start,i))}catch{throw new SyntaxErrorVeliq('Literal inválido',start)}; if(typeof value!=='string')throw new SyntaxErrorVeliq('Literal inválido',start);return {type:'Literal',value};} if(c==='\\'&&!escaped)escaped=true;else escaped=false;}
      throw new SyntaxErrorVeliq('Literal sin cerrar',start);
    }
    const start=i;while(/[a-z]/.test(text[i]??''))i++;
    const word=text.slice(start,i),entry=byWord.get(word);
    if(!entry)throw new SyntaxErrorVeliq(`Raíz desconocida: ${word||text[i]||'EOF'}`,start);
    skip();if(text[i++]!=='(')throw new SyntaxErrorVeliq('Falta (',i-1);
    const args:Term[]=[];skip();
    if(text[i]!==')') {while(true){args.push(term(depth+1));skip();if(text[i]===')')break;if(text[i++]!==',')throw new SyntaxErrorVeliq('Falta coma',i-1);skip();if(text[i]===')')throw new SyntaxErrorVeliq('Argumento vacío',i);}}
    i++;return {type:'Concept',concept:entry.id,args};
  }
  const result=term(0);skip();if(i!==text.length)throw new SyntaxErrorVeliq('Contenido adicional',i);return result;
}
export function print(term:Term):string {
  if(term.type==='Literal')return JSON.stringify(term.value);
  const entry=byId.get(term.concept);if(!entry)throw new Error(`Concepto desconocido ${term.concept}`);
  return `${entry.word}(${term.args.map(print).join(',')})`;
}
