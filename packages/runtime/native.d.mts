export type NativeConfig={version:'0.1';mode:'observe'|'hybrid'|'research';model:string;encoding:'cl100k_base'|'o200k_base';jsonTools:string[];strategies:('json-whitespace'|'context-reference')[]};
export function privateRead(project:string,name:string,limit?:number):string;
export function auditNative(project:string,row:Record<string,unknown>):void;
export function nativeSummary(project:string):{events:number;applied:number;originalTokens:number;optimizedTokens:number;overheadTokens:number;savedTextTokens:number;countKind:string;providerSavings:null;byStrategy:Record<string,number>};
export function loadNativeConfig(project:string):NativeConfig|null;
export function countTexts(texts:string[],encoding:string):number[];
export function stripJsonWhitespace(text:string):string;
export function hasGate(project:string,config:NativeConfig,harness:string,strategy:string):boolean;
export function optimizeToolText(input:{project:string;harness:string;tool:string;text:string;config:NativeConfig|null;model:string;reference?:{original:string;callID:string}},counter?:typeof countTexts):{text:string;applied:boolean;strategy:string;originalTokens:number;optimizedTokens:number;overheadTokens:number;countKind:string;fallback:string|null};
