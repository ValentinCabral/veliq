import {loadNativeConfig,optimizeToolText} from '../../packages/runtime/native.mjs';
import {recordToolObservation} from '../../packages/metrics/observations.mjs';
// OpenCode V1 1.18.33 API. No system/user messages or tool inputs are changed.
export const VeliqNative=async({directory})=>({
  'tool.execute.after':async(input,output)=>{try{recordToolObservation(directory,'opencode',input.tool,output.output??'')}catch{}},
  'experimental.chat.messages.transform':async(_input,output)=>{
    try{
      const config=loadNativeConfig(directory);if(!config)return;
      // Derive model from latest exposed user message. Do not guess across providers.
      const user=output.messages.findLast(m=>m.info.role==='user');
      const model=user?.info.model;if(!model)return;const id=`${model.providerID}/${model.modelID}`;
      const seen=new Map();
      for(const message of output.messages){if(message.info.role!=='assistant')continue;
        for(const part of message.parts){
          if(part.type!=='tool'||part.state?.status!=='completed'||typeof part.state.output!=='string'||part.state.time?.compacted||part.state.attachments?.length)continue;
          // Only read-only tools explicitly allowed by project config. Inputs and source must match.
          if(!config.jsonTools.includes(part.tool))continue;
          const original=part.state.output,key=JSON.stringify([part.tool,part.state.input,original]);
          const previous=seen.get(key);
          const decision=optimizeToolText({project:directory,harness:'opencode',tool:part.tool,text:original,config,model:id,reference:previous});
          part.state.output=decision.text;
          // Anchor must retain original exact text in this very request; never reference a marker/minified copy.
          if(decision.text===original&&!previous)seen.set(key,{original,callID:part.callID});
        }
      }
    }catch{} // On malformed/unsupported context retain operational messages.
  }
});
