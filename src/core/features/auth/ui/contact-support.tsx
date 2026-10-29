import {useState} from 'react';
import {requestJson} from '@/core/app/client/lib/api';
import {useResource} from '@/core/app/client/lib/use-resource';
import {useMenuNotice} from '@/core/app/client/ui/action-menu';
import {usePermissions} from './permissions';

export function ContactSupport({contactId,reload}:{contactId:string;reload:()=>Promise<unknown>}) {
  const {can}=usePermissions(),report=useMenuNotice(),[busy,setBusy]=useState(false);
  const requests=useResource<{requests:Array<{id:string;kind:string;createdAt:number}>}>(`/api/contacts/${contactId}/privacy-requests`);
  async function record(kind:'opt-out'|'privacy-requests',channel?:'email'|'sms') {
    setBusy(true);report(null);
    try {
      const response=await requestJson(`/api/contacts/${contactId}/${kind}`,{method:'POST',body:JSON.stringify(channel?{channel}:{kind:'erasure'})});
      if(response.status>=300){report(<p role="alert">The request could not be recorded. Check the contact and your access, then try again.</p>);return;}
      await Promise.all([reload(),requests.reload()]);
      report(<p role="status">{channel?`${channel==='email'?'Email':'SMS'} opt-out recorded. Existing consent cannot override it.`:'Erasure request recorded for an Owner or Admin to fulfil.'}</p>);
    } catch {report(<p role="alert">The result could not be confirmed. Reload before trying again.</p>);}
    finally{setBusy(false);}
  }
  return <>
    {can('contact.optout')?<><button type="button" className="secondary-action" disabled={busy} onClick={()=>void record('opt-out','email')}>Record email opt-out</button><button type="button" className="secondary-action" disabled={busy} onClick={()=>void record('opt-out','sms')}>Record SMS opt-out</button></>:null}
    {can('contact.privacy-request')?<button type="button" className="secondary-action" disabled={busy} onClick={()=>void record('privacy-requests')}>Record erasure request</button>:null}
    {requests.data?.requests.length?<p>{requests.data.requests.length} erasure request{requests.data.requests.length===1?'':'s'} recorded.</p>:null}
    {requests.error?<p role="alert">Contact requests could not be loaded.</p>:null}
  </>;
}
