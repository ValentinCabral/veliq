export type AdapterCapabilities={name:string;version:string;intercepts:{prompt:boolean;modelRequest:boolean;toolResult:boolean;agentMessage:boolean};mode:'observe'|'hybrid'|'native'|'research'};
export interface Adapter {
  detectCapabilities():Promise<AdapterCapabilities>;
  initialize():Promise<void>;
  observeMessage(message:{content:string;origin:string}):Promise<void>;
  transformContext?(content:string):Promise<string>;
  processToolResult?(content:string):Promise<string>;
  handleAgentMessage?(content:string):Promise<string>;
  recoverReference?(hash:string):Promise<string>;
  dispose():Promise<void>;
}
