import {useState,type FormEvent} from 'react';
import {usePermissions} from '@/core/features/auth/ui/permissions';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
async function request(path:string,init:RequestInit){const result=await requestJson(path,init);if(result.status>=400)throw new Error('connection_refused');return result.data;}

type App={id:string;name:string;supported:boolean;gap:string|null;webhookPath:string;connection:{accountId:string;unmatchedCount:number}|null};
const endpoint='/api/settings/integrations/reviews-loyalty';
export function ReviewLoyaltySettings() {
  const {role}=usePermissions();
  return ['owner','admin'].includes(role)?<Connections/>:null;
}
function Connections() {
  const state=useResource<{apps:App[]}>(endpoint);
  const [selected,setSelected]=useState('judgeme'),[accountId,setAccount]=useState(''),[secret,setSecret]=useState(''),[exclusive,setExclusive]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const app=state.data?.apps.find(a=>a.id===selected);
  async function save(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try{await request(endpoint+'/'+selected,{method:'PUT',body:JSON.stringify({accountId,secret,exclusiveSecret:exclusive})});setSecret('');setExclusive(false);await state.reload();}
    catch{setError('The connection could not be saved. Check its account and signing details.');}finally{setBusy(false);}
  }
  async function disconnect() {
    setBusy(true);setError('');try{await request(endpoint+'/'+selected,{method:'DELETE'});await state.reload();setSecret('');}catch{setError('The connection could not be removed.');}finally{setBusy(false);}
  }
  return <section className="panel page-flow" aria-labelledby="review-loyalty-title" id="review-loyalty">
    <header><h2 id="review-loyalty-title">Reviews and loyalty</h2><p>Receive signed facts for existing contacts. Connecting an app never creates contacts, subscribes anyone or sends messages. Review-request flow exits are not available yet.</p></header>
    {state.loading&&!state.data?<p role="status">Loading review and loyalty connections…</p>:null}
    {state.error?<p role="alert">Connections are unavailable. <button type="button" onClick={()=>void state.reload()}>Try again</button></p>:null}
    {state.data?<>
      <label htmlFor="review-loyalty-app">Review or loyalty app<select id="review-loyalty-app" value={selected} onChange={e=>{setSelected(e.target.value);setAccount('');setSecret('');setExclusive(false);setError('');}}>{state.data.apps.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      {app?<>
        <p role="status">{app.connection?`Connected to ${app.connection.accountId}. ${app.connection.unmatchedCount} unmatched events counted.`:'Not connected.'}</p>
        {app.gap?<p>{app.gap}</p>:null}
        {app.supported?<form className="integration-create" onSubmit={e=>void save(e)}>
          <p>Configure this delivery path in the app: <code style={{overflowWrap:'anywhere'}}>{app.webhookPath}</code></p>
          <label htmlFor="review-loyalty-account">Account or store ID<input id="review-loyalty-account" value={accountId} onChange={e=>setAccount(e.target.value)} required maxLength={200}/></label>
          <label htmlFor="review-loyalty-secret">Webhook signing secret<input id="review-loyalty-secret" type="password" autoComplete="new-password" value={secret} onChange={e=>setSecret(e.target.value)} required minLength={16} maxLength={512}/></label>
          <p>Secrets are encrypted on this installation, never shown again and excluded from account exports. A restored installation needs a new connection. Judge.me requires a store-specific private API token, not a shared OAuth app secret. Okendo uses its Svix signing secret; Smile uses the app client secret and your Smile account ID.</p>
          <label htmlFor="review-loyalty-exclusive"><input id="review-loyalty-exclusive" type="checkbox" checked={exclusive} onChange={e=>setExclusive(e.target.checked)} required/>I have checked that this secret authorizes only the configured account at this Mango connection.</label>
          <button type="submit" className="primary-action" disabled={busy}>{busy?'Saving…':app.connection?'Replace app connection':'Connect app'}</button>
          {app.connection?<button type="button" className="secondary-action" disabled={busy} onClick={()=>void disconnect()}>Disconnect app</button>:null}
        </form>:null}
      </>:null}
    </>:null}
    {error?<p role="alert" className="inline-error">{error}</p>:null}
  </section>;
}
