export const sendingScopes=['mail.send','user.username.read','whitelabel.read','whitelabel.create',
  'user.webhooks.event.settings.read','user.webhooks.event.settings.create','user.webhooks.event.settings.update',
  'user.webhooks.event.settings.delete','user.webhooks.event.test.create'] as const;
export const sendingEvents=['delivered','bounce','dropped','deferred','spam_report','unsubscribe','group_unsubscribe'] as const;
export class SendingConnectionError extends Error {
  constructor(readonly reason:string,readonly missing:string[]=[]) {super(reason);}
}
export function sendgridAccount(apiKey:string) {
  async function request(path:string,method='GET',body?:unknown) {
    const response=await fetch('https://api.sendgrid.com/v3'+path,{method,headers:{Authorization:'Bearer '+apiKey,
      ...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new SendingConnectionError(response.status===401||response.status===403?'SendGrid refused this key or its permission.':`SendGrid request failed (${response.status}).`);
    if(response.status===204)return null;
    return response.json().catch(()=>{throw new SendingConnectionError('SendGrid returned invalid connection JSON.');}) as Promise<any>;
  }
  return {
    request,
    async inspect() {
      const permissions=await request('/scopes');
      if(!Array.isArray(permissions.scopes)||permissions.scopes.some((v:unknown)=>typeof v!=='string'))throw new SendingConnectionError('SendGrid did not return the key permissions.');
      const scopes=permissions.scopes as string[],missing=sendingScopes.filter(scope=>!scopes.includes(scope));
      if(missing.length)throw new SendingConnectionError('The SendGrid key is missing required permissions.',missing);
      const account=await request('/user/username');
      if(typeof account.username!=='string'||!account.username||!Number.isSafeInteger(account.user_id))throw new SendingConnectionError('SendGrid did not identify the provider account.');
      return {accountId:String(account.user_id),accountName:account.username,broader:scopes.some(scope=>!sendingScopes.includes(scope as typeof sendingScopes[number]))};
    },
    async capacity() {
      const all=await request('/user/webhooks/event/settings/all');
      if(!Array.isArray(all.webhooks)||!Number.isSafeInteger(all.max_allowed)||all.max_allowed<0)throw new SendingConnectionError('SendGrid did not return the webhook limit.');
      return {webhooks:all.webhooks as any[],maxAllowed:all.max_allowed as number};
    },
  };
}
