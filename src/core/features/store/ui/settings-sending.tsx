import {useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
type Review={proposalId:string;provider:string;account:string;lastFour:string;broader:boolean;webhookUrl:string;events:string[];requiredScopes:string[]};
type Status={developerRoute:boolean;connection:null|{provider:string;state:string;account:string;lastFour:string;connectedBy:string;connectedAt:number;broader:boolean;deliveryEventsVerified:boolean;error:string|null}};
export function SettingsSending() {
  const status=useResource<Status>('/api/settings/sending');
  const [provider,setProvider]=useState('sendgrid');
  const providerName=provider==='resend'?'Resend':'SendGrid';
  const [apiKey,setApiKey]=useState(''),[review,setReview]=useState<Review|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function act(path:string,body?:unknown,method='POST') {
    setBusy(true);setError('');
    try {
      const response=await requestJson<Review&{detail?:string;missing?:string[]}>('/api/settings/sending'+path,{method,...(body===undefined?{}:{body:JSON.stringify(body)})});
      if(response.status!==200){setError([response.data.detail??'The sending connection was refused.',...(response.data.missing??[])].join(' '));return;}
      if(path==='/review'){setReview(response.data);setApiKey('');}
      else {setReview(null);await status.reload();}
    }catch {setError('The sending connection is unavailable. Try again.');}
    finally {setBusy(false);}
  }
  const connection=status.data?.connection;
  return <section id="sending" className="panel" aria-labelledby="sending-title"><p className="eyebrow">Sending connection</p><h2 id="sending-title">{connection?.provider??providerName}</h2>
    <p>Connect your sending account. Review its permissions and Mango’s signed event webhook before you authorize a change.</p>
    {status.loading?<p role="status">Loading sending connection…</p>:null}
    {status.error?<p role="alert">Sending status is unavailable. <button onClick={()=>void status.reload()}>Try again</button></p>:null}
    {connection?<div role="status"><p>{connection.provider} account <strong>{connection.account}</strong> · key ending <code>{connection.lastFour}</code> · {connection.state}</p>
      <p>Connected by {connection.connectedBy} on {new Date(connection.connectedAt).toLocaleString()}.</p>
      {connection.broader?<p>Broader than Mango needs. Use a restricted key with the permissions listed in the connection review.</p>:null}
      {connection.deliveryEventsVerified?<p>Signed delivery events verified.</p>:<p>delivery-events-missing: send the Owner sender check in Settings. Campaign approval and flow activation stay blocked until its signed delivered event arrives.</p>}
      {connection.error?<p role="alert">{connection.error}</p>:null}
      <button className="secondary-action" type="button" disabled={busy||connection.state==='connecting'} onClick={()=>void act('',undefined,'DELETE')}>Disconnect {connection.provider}</button></div>:null}
    {review?<div className="integration-create" role="group" aria-label={"Review "+review.provider+" connection"}><h3>Review {review.provider} connection</h3>
      <p>Provider account: <strong>{review.account}</strong>. Key ending <code>{review.lastFour}</code>.</p>
      <p>Webhook: <span >{review.webhookUrl}</span></p><p>Name: Mango {new URL(review.webhookUrl).origin}</p>
      <p>Signing will be on. Mango creates or reuses its own webhook and changes no other webhook.</p>
      <p>Events: {review.events.join(', ')}.</p>
      {review.broader?<p>Broader than Mango needs.</p>:null}<p>Restricted permissions:</p><ul>{review.requiredScopes.map(scope=><li key={scope}><code>{scope}</code></li>)}</ul>
      <button className="primary-action" disabled={busy} onClick={()=>void act('/connect',{proposalId:review.proposalId})}>Connect {review.provider}</button>
      <button className="secondary-action" disabled={busy} onClick={()=>setReview(null)}>Cancel review</button>
    </div>:<form className="integration-create" onSubmit={event=>{event.preventDefault();void act('/review',{apiKey,provider});}}>
      <label>Sending provider<select value={provider} disabled={busy} onChange={event=>{setProvider(event.target.value);setApiKey('');}}><option value="sendgrid">SendGrid</option><option value="resend">Resend</option></select></label><label htmlFor="sendgrid-key">{providerName} API key<input id="sendgrid-key" type="password" autoComplete="off" required value={apiKey} onChange={event=>setApiKey(event.currentTarget.value)} disabled={busy}/></label>
      <button className="primary-action" disabled={busy}>Review {providerName} key</button></form>}
    <p>Route in use: {status.data?.developerRoute?'Developer deployment inputs (read only here)':'Settings sending connection'}. Use the connection form above first. <a href="/docs/install">Developer and forwarding setup</a>.</p>
    {error?<p role="alert" className="inline-error">{error}</p>:null}
  </section>;
}
