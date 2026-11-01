import {useEffect,useId,useRef,useState} from 'react';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import {Link} from '@tanstack/react-router';
import {Can} from '@/core/features/auth/ui/permissions';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
import type {SenderRenewalStatus} from '../renewal';

// The line says the first sentence; Details opens with the rest of that stage's text.
const lines:Record<string,{first:string;rest?:string}>={
  renewed:{first:'Sender evidence renewed from an authenticated receipt.'},
  changed:{first:'Sender evidence changed.',rest:'Inspect the provider and DNS records, then confirm a new diagnostic.'},
  lapsed:{first:'Sender evidence has lapsed.',rest:'Sending needs renewed evidence.'},
};
const tones:Record<string,string>={renewed:'action-notice',changed:'inline-error',lapsed:'inline-error'};

export function SenderRenewalCard(){return <Can permission="settings.manage"><RenewalCard/></Can>;}
function RenewalCard() {
  const formatDate = useDateFormatter();
  const {data,error,replace}=useResource<{status:SenderRenewalStatus}>('/api/settings/sender/renewal');
  const attempted=useRef(''),[failure,setFailure]=useState(false),[open,setOpen]=useState(false),detailsId=useId();
  useEffect(()=>{
    const status=data?.status,key=`${status?.periodKey}:${status?.stage}`;
    if(!status?.due||attempted.current===key)return;
    attempted.current=key;
    void requestJson<{status:SenderRenewalStatus}>('/api/settings/sender/renewal/run',{method:'POST',body:'{}'}).then(result=>{if(result.status<400)replace(result.data);else setFailure(true);}).catch(()=>setFailure(true));
  },[data?.status.periodKey,data?.status.stage,replace]);
  if(error)return <section className="notice-warning desk-attention__line" aria-label="Sender evidence renewal"><div className="desk-attention__row"><p role="alert">Renewal status could not be checked.</p><span className="desk-attention__actions"><Link className="text-link" to="/app/settings">Open Settings</Link></span></div></section>;
  const status=data?.status;if(!status?.visible)return null;
  const line=lines[status.stage]??{first:'Renew the sender evidence before it expires.'};
  const check=()=>void requestJson<{status:SenderRenewalStatus}>('/api/settings/sender/renewal/run',{method:'POST',body:'{}'}).then(result=>{if(result.status<400)replace(result.data);else setFailure(true);}).catch(()=>setFailure(true));
  return <section className={`${tones[status.stage]??'notice-warning'} desk-attention__line`} aria-label="Sender evidence renewal" data-renewal-stage={status.stage}>
    <div className="desk-attention__row">
      <span>{line.first}</span>
      <span className="desk-attention__actions">
        <Link className="text-link" to="/app/settings" aria-label="Review sender evidence">Review</Link>
        <button type="button" className="text-link" aria-expanded={open} aria-controls={detailsId} onClick={()=>setOpen(!open)}>Details</button>
      </span>
    </div>
    {failure?<p role="alert" className="desk-attention__failure">The renewal attempt could not be confirmed. Check Settings before trying again.</p>:null}
    <div id={detailsId} className="desk-attention__details" hidden={!open}>
      {line.rest?<p>{line.rest}</p>:null}
      {status.expiresAt?<p>Evidence expires {formatDate(status.expiresAt)}.</p>:null}
      <p>{status.waitingMessages} queued email messages need current sender evidence.{status.earliestDeadline?` Earliest deadline: ${formatDate(status.earliestDeadline)}.`:''}</p>
      {status.requiresConfirmation?<p role="status">This restored or older confirmation needs a fresh operator diagnostic from Settings before automatic renewal or reminders can resume.</p>:null}
      <p>{status.automaticRenewal?'The configured receipt connector can renew only from authenticated diagnostic results.':'A diagnostic goes to the operator who last confirmed; they must confirm its inbox receipt. Renewal never confirms on their behalf.'}</p>
      {status.deliveries.map(row=><p key={`${row.kind}:${row.state}:${row.reason}`}>{row.count} {row.kind} {row.state}{row.reason?` · ${row.reason}`:''}</p>)}
      {status.deliveries.some(row=>row.state==='deferred')?<button type="button" className="secondary-action" onClick={check}>Check renewal again</button>:null}
    </div>
  </section>;
}
