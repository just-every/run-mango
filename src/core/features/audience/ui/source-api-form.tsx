import {useState} from 'react';
import {requestJson} from '@/core/app/client/lib/api';
import type {SourceExport} from '../../move-in/source-api';
export function SourceApiForm({disabled,onExport}:{disabled:boolean;onExport:(value:SourceExport)=>void}){
  const [provider,setProvider]=useState<'activecampaign'|'klaviyo'>('activecampaign'),[endpoint,setEndpoint]=useState(''),[key,setKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <section className="panel audience-import-panel"><h2>Read a source export</h2><p>Use an Owner or Admin key. Mango does not keep it.</p>
    <form onSubmit={event=>{event.preventDefault();if(busy||disabled)return;setBusy(true);setError('');void requestJson<SourceExport&{detail?:string}>('/api/audience/import-source',{method:'POST',body:JSON.stringify({provider,endpoint,key})}).then(response=>{if(response.status!==200){setError(response.data.detail??'The source export could not be read.');return;}onExport(response.data);}).catch(()=>setError('The source export could not be confirmed. Nothing was imported.')).finally(()=>{setKey('');setBusy(false);});}}>
    <div className="audience-import-consent-grid"><label>Source API<select aria-label="Source API" value={provider} disabled={disabled||busy} onChange={e=>{setProvider(e.target.value as typeof provider);setEndpoint(e.target.value==='klaviyo'?'https://a.klaviyo.com':'');setKey('');}}><option value="activecampaign">ActiveCampaign</option><option value="klaviyo">Klaviyo</option></select></label>
    <label>Account API origin<input type="url" required value={endpoint} disabled={disabled||busy} onChange={e=>setEndpoint(e.target.value)}/></label><label>One-time source API key<input type="password" required autoComplete="off" value={key} disabled={disabled||busy} onChange={e=>setKey(e.target.value)}/></label></div>
    {error?<p className="inline-error" role="alert">{error}</p>:null}<button className="secondary-action" type="submit" disabled={disabled||busy}>{busy?'Reading export…':'Read export'}</button></form></section>;
}
