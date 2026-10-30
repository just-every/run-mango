import {useEffect,useRef,useState} from 'react';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import {Link} from '@tanstack/react-router';
import {Can} from '@/core/features/auth/ui/permissions';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
import type {SenderRenewalStatus} from '../renewal';
export function SenderRenewalCard(){return <Can permission="settings.manage"><RenewalCard/></Can>;}
function RenewalCard() {
  const formatDate = useDateFormatter();
  const {data,error,replace}=useResource<{status:SenderRenewalStatus}>('/api/settings/sender/renewal');
  const attempted=useRef(''),[failure,setFailure]=useState(false);
  useEffect(()=>{
    const status=data?.status,key=`${status?.periodKey}:${status?.stage}`;
    if(!status?.due||attempted.current===key)return;
    attempted.current=key;
    void requestJson<{status:SenderRenewalStatus}>('/api/settings/sender/renewal/run',{method:'POST',body:'{}'}).then(result=>{if(result.status<400)replace(result.data);else setFailure(true);}).catch(()=>setFailure(true));
  },[data?.status.periodKey,data?.status.stage,replace]);
  if(error)return <section className="panel"><h2>Sender evidence renewal</h2><p role="alert">Renewal status could not be checked. <Link to="/app/settings">Open Settings</Link>.</p></section>;
  const status=data?.status;if(!status?.visible)return null;
  return <section className="panel" aria-labelledby="sender-renewal-title" data-renewal-stage={status.stage}>
    <p className="eyebrow">Sending</p><h2 id="sender-renewal-title">Sender evidence renewal</h2>
    <p>{status.stage==='renewed'?'Sender evidence renewed from an authenticated receipt.':status.stage==='changed'?'Sender evidence changed. Inspect the provider and DNS records, then confirm a new diagnostic.':status.stage==='lapsed'?'Sender evidence has lapsed. Sending needs renewed evidence.':'Renew the sender evidence before it expires.'}</p>
    {status.expiresAt?<p>Evidence expires {formatDate(status.expiresAt)}.</p>:null}
    <p>{status.waitingMessages} queued email messages need current sender evidence.{status.earliestDeadline?` Earliest deadline: ${formatDate(status.earliestDeadline)}.`:''}</p>
    {status.requiresConfirmation?<p role="status">This restored or older confirmation needs a fresh operator diagnostic from Settings before automatic renewal or reminders can resume.</p>:null}
    <p>{status.automaticRenewal?'The configured receipt connector can renew only from authenticated diagnostic results.':'A diagnostic goes to the operator who last confirmed; they must confirm its inbox receipt. Renewal never confirms on their behalf.'}</p>
    {status.deliveries.map(row=><p key={`${row.kind}:${row.state}:${row.reason}`}>{row.count} {row.kind} {row.state}{row.reason?` · ${row.reason}`:''}</p>)}
    {failure?<p role="alert">The renewal attempt could not be confirmed. Check Settings before trying again.</p>:null}
    {status.deliveries.some(row=>row.state==='deferred')?<button type="button" className="secondary-action" onClick={()=>void requestJson<{status:SenderRenewalStatus}>('/api/settings/sender/renewal/run',{method:'POST',body:'{}'}).then(result=>{if(result.status<400)replace(result.data);else setFailure(true);}).catch(()=>setFailure(true))}>Check renewal again</button>:null}
    <Link className="secondary-action" to="/app/settings">Review sender evidence</Link>
  </section>;
}
