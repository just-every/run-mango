import type {AiProvider,AppConfig,GroundedGenerationRequest} from '../../src/core/shared/platform';
import type {GeneratedProposalWire} from '../../src/core/features/proposals/generation';

/** Only the generation provider edge is synthetic; the caller uses native generation and storage. */
export function proposalGenerationEdge(sender:AppConfig['mailSender']) {
    const controls:{alter?:(output:GeneratedProposalWire)=>void;failure?:Error;lastRequest?:GroundedGenerationRequest}={};
    const ai:AiProvider={costIdentity:{provider:'openai',model:'fixture-model'},async generateGroundedJson(request){
      controls.lastRequest=request;
      const acceptsStrictSchema=(schema:Record<string,any>)=>{
        if(schema.type==='object') {
          if(schema.additionalProperties!==false||!Array.isArray(schema.required)||Object.keys(schema.properties).some(key=>!schema.required.includes(key)))throw new Error('Provider rejected an open or optional object field');
          Object.values(schema.properties).forEach(child=>acceptsStrictSchema(child as Record<string,any>));
        }
        if(schema.items)acceptsStrictSchema(schema.items);
        for(const child of schema.anyOf??[])acceptsStrictSchema(child);
        if(schema.format==='uri')throw new Error('Provider does not support URI format');
      };
      acceptsStrictSchema(request.schema);
      if(controls.failure)throw controls.failure;
      const evidence=request.evidence as {items:Array<{key:string;observedValueJson:string;allowedClaim:string}>;now:string};
      const item=evidence.items[0],at=Date.parse(evidence.now);
      const claim={text:item.allowedClaim,citations:[{key:item.key,observedValueJson:item.observedValueJson}]};
      const output:GeneratedProposalWire={summary:structuredClone(claim),audience:{inclusion:{version:1,operator:'all',predicates:[{sourceType:'contact',field:'email',comparator:'contains',value:'@example.test',lookbackDays:null}]},exclusions:[],explanation:structuredClone(claim)},email:{subject:'From the garden',html:'<p>Garden news for you.</p>',text:'Garden news for you.',preheader:'Garden update'},sms:null,sender:{...{displayName:sender.displayName,fromEmail:sender.fromEmail,replyToEmail:sender.replyToEmail,physicalAddress:sender.physicalAddress},smsSender:'MANGO'},messageCategory:'newsletter',links:[],steps:[{channel:'email',scheduledAt:new Date(at+3600000).toISOString(),sendByAt:new Date(at+7200000).toISOString(),timezone:'Etc/UTC',whyThisTime:structuredClone(claim)}],forecast:null};
      controls.alter?.(output);
      return {output,provider:'openai',model:'fixture-model',billableUnits:100,reportedCostMicros:25,currency:'USD'};
    }};
    return {ai,controls};
}
