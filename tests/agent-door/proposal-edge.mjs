/** Responses API boundary: copy the request's actual grounded evidence. Native
 * validation, persistence, audience eligibility and adoption stay in Mango. */
export default {async fetch(request,{fixture}){
 if(request.method!=='POST'||new URL(request.url).pathname!=='/v1/responses')return new Response(null,{status:404});
 const body=await request.json(),evidence=JSON.parse(body.input),item=evidence.items[0];
 if(!item?.allowedClaim||!item.observedValueJson)return Response.json({error:'missing_grounding'},{status:400});
 const claim={text:item.allowedClaim,citations:[{key:item.key,observedValueJson:item.observedValueJson}]};
 const now=Date.parse(evidence.now),output={summary:claim,audience:{inclusion:{version:1,operator:'all',predicates:[
  {sourceType:'contact',field:'email',comparator:'eq',value:fixture.email,lookbackDays:null}]},exclusions:[],explanation:claim},
  email:{subject:'Fresh orchard news',html:'<p>News from our orchard.</p>',text:'News from our orchard.',preheader:'Orchard news'},sms:null,
  sender:{...fixture.sender,smsSender:'ORCHARD'},messageCategory:'newsletter',links:[],steps:[{channel:'email',timezone:'Etc/UTC',
   scheduledAt:new Date(now+3600000).toISOString(),sendByAt:new Date(now+7200000).toISOString(),whyThisTime:claim}],forecast:null};
 return Response.json({model:body.model,output_text:JSON.stringify(output),usage:{input_tokens:100,output_tokens:100,total_tokens:200}});
}};
