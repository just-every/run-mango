import {randomUUID} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {resendWebhookId,resendWebhookSecret} from './resend-bindings';

type Send={body:Record<string,any>;messageId:string;at:number;key:string};
/** Documented API envelopes at the network edge; application state stays real. */
export function resendProviderEdge(dkim:string) {
  let clockOffset=0;
  const other={id:'synthetic-mango-130-other',endpoint:'https://other.example.test/events',status:'enabled',events:['email.sent']};
  const connection={fullAccess:true,readStatus:0,webhooks:[other] as Array<{id:string;endpoint:string;status:string;events:string[]}>,mutations:[] as Array<{method:string;path:string;body:unknown}>,other};
  const sends:Send[]=[],attempts:Array<{body:Record<string,any>;key:string}>=[],lost=new Set<string>(),indexed=new Set<string>(),delivered=new Map<string,number>();
  const reads:Array<{path:string;after:string|null}>=[];
  const domain={id:'go-live-resend-domain',name:'example.test',status:'verified',region:'us-east-1',capabilities:{sending:'enabled',receiving:'disabled'}};
  const records=[{record:'SPF',name:'send',type:'TXT',value:'v=spf1 ip4:192.0.2.1 -all',status:'verified'},
    {record:'DKIM',name:'resend._domainkey',type:'TXT',value:`v=DKIM1; k=rsa; p=${dkim}`,status:'verified'}];
  const json=(response:ServerResponse,value:unknown)=>{response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify(value));};
  const mail=(send:Send)=>({object:'email',id:send.messageId,...send.body,created_at:new Date(send.at).toISOString(),last_event:'sent'});
  const decoy=(id:string)=>{
    const source=sends.find(send=>send.body.headers?.['List-Unsubscribe'])??sends[0];
    const value=source?mail(source):{from:'unrelated@example.test',to:['other@example.test'],subject:'Other',text:'Other',tags:[]};
    const index=Number(id.split('-').at(-1));
    return {...value,id,...(index===0?{from:'unrelated@example.test'}:index===1?{to:['other@example.test']}:index===2?{subject:'Different context'}:{tags:(value as any).tags?.slice(0,1)??[]})};
  };
  const event=(id:string)=>{
    const target=sends.find(send=>id===`delivered-${send.messageId}`);
    if(target)return {id,object:'webhook_event',status:'failed',payload:{type:'email.delivered',created_at:new Date(delivered.get(target.messageId)!).toISOString(),data:{email_id:target.messageId,to:target.body.to}}};
    const accepted=sends.find(send=>indexed.has(send.messageId));
    return {id,object:'webhook_event',status:'delivered',payload:{type:'email.sent',created_at:new Date(accepted?.at??Date.now()+clockOffset).toISOString(),data:{email_id:accepted?.messageId??'unrelated-email',to:accepted?.body.to??['other@example.test']}}};
  };
  return {connection,sends,attempts,reads,setClock(now:number){clockOffset=now-Date.now();},loseResponseFor(email:string){lost.add(email);},
    index(messageId:string){indexed.add(messageId);},deliver(messageId:string){if(!delivered.has(messageId))delivered.set(messageId,Date.now()+clockOffset);},
    async handle(url:URL,request:IncomingMessage,response:ServerResponse) {
      if(url.hostname!=='api.resend.com')return false;
      if(request.method==='GET'&&(url.pathname==='/api-keys'||url.pathname.startsWith('/webhooks')&&!url.pathname.includes('/events'))){const status=connection.readStatus||(!connection.fullAccess&&url.pathname==='/api-keys'?403:0);if(status){response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify({message:'Synthetic refusal'}));return true;}}
      if(url.pathname==='/api-keys'){json(response,{data:[]});return true;}
      if(url.pathname==='/webhooks'&&request.method==='GET'){json(response,{data:connection.webhooks,has_more:false});return true;}
      if(url.pathname==='/webhooks'&&request.method==='POST'){const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));connection.mutations.push({method:'POST',path:url.pathname,body});const hook={id:'synthetic-mango-130-created',status:'enabled',...body};connection.webhooks.push(hook);json(response,{id:hook.id,signing_secret:resendWebhookSecret});return true;}
      if(/^\/webhooks\/[^/]+$/.test(url.pathname)){const id=url.pathname.split('/').at(-1),hook=connection.webhooks.find(hook=>hook.id===id);if(request.method==='DELETE'){connection.mutations.push({method:'DELETE',path:url.pathname,body:null});connection.webhooks=connection.webhooks.filter(hook=>hook.id!==id);response.writeHead(204);response.end();return true;}if(hook){json(response,hook);return true;}response.writeHead(404,{'Content-Type':'application/json'});response.end('{}');return true;}
      if(request.method==='GET')reads.push({path:url.pathname,after:url.searchParams.get('after')});
      if(request.method==='POST'&&url.pathname==='/emails') {
        const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(chunk);
        const body=JSON.parse(Buffer.concat(chunks).toString('utf8')),key=String(request.headers['idempotency-key']);
        attempts.push({body,key});
        const prior=sends.find(send=>send.key===key);
        const send=prior??{body,key,messageId:randomUUID(),at:Date.now()+clockOffset};if(!prior)sends.push(send);
        if(lost.has(body.to[0]))response.destroy();else json(response,{id:send.messageId});
      } else if(url.pathname==='/domains')json(response,{object:'list',data:[domain],has_more:false});
      else if(url.pathname===`/domains/${domain.id}`)json(response,{object:'domain',...domain,records,open_tracking:false,click_tracking:false});
      else if(url.pathname==='/usage')json(response,{object:'usage',emails:Object.fromEntries(['daily','monthly'].map(key=>[key,{used:sends.length,sent:sends.length,received:0,limit:100000,resets_at:new Date(Date.now()+clockOffset+86400000).toISOString()}]))});
      else if(url.pathname==='/emails') {
        const ids=url.searchParams.has('after')?[]:[...indexed,...Array.from({length:4},(_,i)=>`decoy-${i}`)].slice(0,4);
        json(response,{object:'list',data:ids.map(id=>({id})),has_more:ids.length>0});
      } else if(url.pathname.startsWith('/emails/')) {
        const id=url.pathname.split('/').at(-1)!,send=sends.find(send=>send.messageId===id);
        json(response,send?mail(send):decoy(id));
      } else if(url.pathname===`/webhooks/${resendWebhookId}/events`) {
        const ids=url.searchParams.has('after')?[]:[...delivered.keys()].map(id=>`delivered-${id}`).concat(Array.from({length:4},(_,i)=>`event-${i}`)).slice(0,4);
        json(response,{object:'list',data:ids.map(id=>({id})),has_more:ids.length>0});
      } else if(url.pathname.startsWith(`/webhooks/${resendWebhookId}/events/`))json(response,event(url.pathname.split('/').at(-1)!));
      else return false;
      return true;
    }};
}
