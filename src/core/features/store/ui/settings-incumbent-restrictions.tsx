import {useState} from 'react';
import {Can} from '@/core/features/auth/ui/permissions';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';

type Connection={id:string;dataCenter:string;audienceId:string;lastSuccessAt:number|null;lastError:string|null};
export function SettingsIncumbentRestrictions() {
  const status=useResource<{connections:Connection[]}>('/api/settings/incumbent-restrictions');
  const [dataCenter,setDataCenter]=useState(''),[audienceId,setAudienceId]=useState(''),[apiKey,setApiKey]=useState('');
  const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function act(path:string,method:string,body?:unknown) {
    setBusy(true);setError('');
    try {
      const result=await requestJson(path,{method,body:body===undefined?undefined:JSON.stringify(body)});
      if(result.status>=300)throw new Error();
      if(method==='POST'&&body){setApiKey('');setConsent(false);}
      await status.reload();
    }catch{setError('Synchronization could not complete. Check the audience, data center and key, then retry. Pending restrictions remain in Mango.');}
    finally{setBusy(false);}
  }
  return <section className="panel" id="incumbent-restrictions" aria-labelledby="incumbent-restrictions-title">
    <p className="eyebrow">Parallel run</p><h2 id="incumbent-restrictions-title">Mailchimp restrictions</h2>
    <p>Keep opt-outs and cleaned addresses restricted while both systems run. Mango checks the connected audiences before approval and sending, and every minute. Mango opt-outs and suppressions are written back as unsubscribed.</p>
    <p>This connection only restricts delivery. It does not import subscribers, grant consent or activate flows. Connect each moved audience that still sends.</p>
    {status.loading?<p role="status">Loading parallel connections…</p>:null}
    {status.error?<p role="alert">Connection status is unavailable. <button onClick={()=>void status.reload()}>Try again</button></p>:null}
    {status.data?<><ul className="integration-credentials">{status.data.connections.map(connection=><li key={connection.id}>
      <div><strong>Audience {connection.audienceId} · {connection.dataCenter}</strong>
        <p>{connection.lastSuccessAt?`Last synchronized ${new Date(connection.lastSuccessAt).toLocaleString()}`:'Awaiting a successful synchronization.'}</p>
        {connection.lastError?<p role="alert">{connection.lastError} Sending waits for recovery.</p>:null}</div>
      <Can permission="provider.connect"><button className="secondary-action" disabled={busy} onClick={()=>void act('/api/settings/incumbent-restrictions/'+connection.id,'DELETE')}>End parallel connection</button></Can>
    </li>)}</ul>
    {!status.data.connections.length?<p>No parallel audiences connected.</p>:<Can permission="provider.connect"><button className="secondary-action" disabled={busy} onClick={()=>void act('/api/settings/incumbent-restrictions/sync','POST')}>Synchronize restrictions</button></Can>}
    <Can permission="provider.connect"><form className="integration-create" onSubmit={event=>{event.preventDefault();void act('/api/settings/incumbent-restrictions','POST',{dataCenter,audienceId,apiKey,consent});}}>
      <label htmlFor="incumbent-dc">Mailchimp data center<input id="incumbent-dc" value={dataCenter} onChange={event=>setDataCenter(event.target.value)} placeholder="us21" pattern="us[1-9][0-9]*" required /></label>
      <label htmlFor="incumbent-audience">Mailchimp audience ID<input id="incumbent-audience" value={audienceId} onChange={event=>setAudienceId(event.target.value)} required /></label>
      <label htmlFor="incumbent-key">Mailchimp API key<input id="incumbent-key" type="password" autoComplete="new-password" value={apiKey} onChange={event=>setApiKey(event.target.value)} minLength={16} required /></label>
      <label htmlFor="incumbent-consent"><input id="incumbent-consent" type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} required />I authorize reading this audience and writing Mango restrictions back to Mailchimp.</label>
      <p>The key is encrypted here and excluded from account exports. Ending the connection first synchronizes outstanding restrictions, then deletes the key.</p>
      <button className="primary-action" disabled={busy} type="submit">{busy?'Synchronizing…':'Connect parallel audience'}</button>
    </form></Can></>:null}
    {error?<p className="inline-error" role="alert">{error}</p>:null}
  </section>;
}
