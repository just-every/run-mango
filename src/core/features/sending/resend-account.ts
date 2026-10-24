import {SendingConnectionError} from './sendgrid-account';
export const resendEvents=['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed'];
export class ResendConnectionError extends SendingConnectionError {
  constructor(reason:string,readonly status:number,missing:string[]=[]){super(reason,missing);}
}
export function resendAccount(apiKey:string){
  async function request(path:string,method='GET',body?:unknown):Promise<any>{
    const response=await fetch('https://api.resend.com'+path,{method,headers:{Authorization:'Bearer '+apiKey,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new ResendConnectionError(response.status===401||response.status===403?'Resend refused this key or its permission.':`Resend request failed (${response.status}).`,response.status);
    if(response.status===204)return null;
    return response.json().catch(()=>{throw new SendingConnectionError('Resend returned invalid connection JSON.');});
  }
  return {request,async inspect(){
    try{const keys=await request('/api-keys');if(!Array.isArray(keys.data))throw new SendingConnectionError('Resend did not return key management access.');}
    catch(error){if(error instanceof ResendConnectionError&&(error.status===401||error.status===403))throw new SendingConnectionError('A sending-only Resend key cannot manage Mango’s delivery webhook. Supply a Full access key.',['Full access API key: webhook management']);throw error;}
    const hooks=await request('/webhooks');if(!Array.isArray(hooks.data))throw new SendingConnectionError('Resend did not return webhook management access.');return hooks.data as Array<{id:string}>;
  }};
}
