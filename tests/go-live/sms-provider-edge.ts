import {createHmac,randomUUID} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {smsSecret,smsSender} from './sms-bindings';

export function smsProviderEdge() {
  let clockOffset=0;
  let heldAt:number|undefined;
  const now=()=>heldAt??Date.now()+clockOffset;
  let substitutedSender:string|undefined,loseNextMarketing=false;
  const hidden=new Set<string>();
  const reads:Array<{messageId:string|null;reference:string|null;returnedIds:string[];at:number}>=[];
  const sends:Array<{body:Record<string,any>;messageId:string;at:number;idempotencyKey:string;outcome:'accepted'|'lost';actualSender:string}>=[];
  const json=(response:ServerResponse,value:unknown)=>{response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify(value));};
  return {sends,reads,loseNextMarketingResponse(){loseNextMarketing=true;},publishLostSubmissions(){hidden.clear();},setClock(at:number,held=false){clockOffset=at-Date.now();heldAt=held?at:undefined;},substituteSender(sender:string){substitutedSender=sender;},async handle(url:URL,request:IncomingMessage,response:ServerResponse) {
    if(url.hostname!=='api.mobilemessage.com.au')return false;
    if(request.method==='GET'&&url.pathname==='/v1/senders')json(response,{status:'complete',results:[{sender:smsSender,type:'dedicated'}]});
    else if(request.method==='GET'&&url.pathname==='/v1/account')json(response,{status:'complete',credit_balance:100000});
    else if(request.method==='POST'&&url.pathname==='/v1/messages') {
      const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(chunk);
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8')),messageId=randomUUID();
      const lose=loseNextMarketing&&body.ignore_unsubscribes===false;
      const actualSender=substitutedSender??body.messages[0].sender;
      sends.push({body,messageId,at:now(),idempotencyKey:String(request.headers['idempotency-key']??''),outcome:lose?'lost':'accepted',actualSender});
      if(lose){loseNextMarketing=false;hidden.add(messageId);response.destroy();return true;}
      json(response,{status:'complete',ignore_unsubscribes:body.ignore_unsubscribes,shorten_urls:false,
        results:body.messages.map((item:Record<string,unknown>)=>({...item,...(substitutedSender?{sender:substitutedSender}:{}),status:'success',message_id:messageId,cost:1,encoding:'gsm7'}))});
    } else if(request.method==='GET'&&url.pathname==='/v1/messages') {
      const results=sends.filter(send=>!hidden.has(send.messageId)&&(send.messageId===url.searchParams.get('message_id')||send.body.messages[0].custom_ref===url.searchParams.get('custom_ref')))
        .map(send=>({...send.body.messages[0],sender:send.actualSender,message_id:send.messageId,status:'delivered',requested_at:new Date(send.at).toISOString()}));
      reads.push({messageId:url.searchParams.get('message_id'),reference:url.searchParams.get('custom_ref'),returnedIds:results.map(row=>row.message_id),at:now()});
      json(response,{status:'complete',results});
    } else return false;
    return true;
  },signed(payload:Record<string,unknown>,now:number) {
    const body=JSON.stringify(payload),timestamp=String(Math.floor(now/1000));
    return {body,headers:{'Content-Type':'application/json','X-MM-Timestamp':timestamp,
      'X-MM-Signature':createHmac('sha256',smsSecret).update(`${timestamp}.${body}`).digest('hex')}};
  }};
}
