import {Can} from '@/core/features/auth/ui/permissions';
import './report-tables.css';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { requestJson } from '@/core/app/client/lib/api';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import { useResource } from '@/core/app/client/lib/use-resource';
import type { CampaignRecipientReport } from '../campaign-recipient-report';
const outcomes=['queued','handoff-unknown','handed-off','accepted','delivered','bounced','skipped','failed','complained','suppressed','unsubscribed'];
export function CampaignRecipients({campaignId,revisionId,steps}:{campaignId:string;revisionId:string;steps:{id:string;sequence:number;channel:string}[]}) {
  const formatDate=useDateFormatter();
  const [outcome,setOutcome]=useState(''),[stepId,setStepId]=useState(''),[offset,setOffset]=useState(0),[notice,setNotice]=useState('');
  const query=new URLSearchParams({revisionId,offset:String(offset),limit:'100'});if(outcome)query.set('outcome',outcome);if(stepId)query.set('stepId',stepId);
  const url=`/api/campaigns/${campaignId}/recipients?${query}`,{data,error}=useResource<CampaignRecipientReport>(url);
  const segment=async()=>{
    try {
      const response=await requestJson<{detail?:string;error?:string}>(`/api/campaigns/${campaignId}/report-segment`,{method:'POST',body:JSON.stringify({revisionId,outcome:outcome||undefined,stepId:stepId||undefined,name:`${outcome||'All'} recipients: ${campaignId}`.slice(0,160)})});
      setNotice(response.status===201?'Recipient segment saved. Current consent and suppression still apply.':response.data.detail??response.data.error??'Segment could not be saved.');
    }catch{setNotice('Segment could not be confirmed. Check saved segments before retrying.');}
  };
  return <section className="panel" aria-labelledby="recipient-report-title"><h2 id="recipient-report-title">Recipients by outcome</h2><p>Transport outcomes count recipient-steps. Complaints and message unsubscriptions overlap them. Erased contacts remain anonymous in the totals.</p>
    <div className="draft-fields"><label>Recipient outcome<select aria-label="Recipient outcome" value={outcome} onChange={event=>{setOutcome(event.target.value);setOffset(0);}}><option value="">All outcomes</option>{outcomes.map(value=><option key={value} value={value}>{value}</option>)}</select></label><label>Recipient step<select aria-label="Recipient step" value={stepId} onChange={event=>{setStepId(event.target.value);setOffset(0);}}><option value="">All steps</option>{steps.map(step=><option key={step.id} value={step.id}>Step {step.sequence} · {step.channel}</option>)}</select></label></div>
    <div className="detail-actions"><Can permission="audience.export"><a className="text-link" href={`${url}&format=csv`}>Export recipients CSV</a></Can><Can permission="segment.manage"><button type="button" className="secondary-action" onClick={()=>void segment()} disabled={!data?.total}>Save recipients as segment</button></Can></div>
    {notice?<p role="status">{notice}</p>:null}{!data?<p>{error?'Recipients could not be loaded.':'Loading recipients…'}</p>:<><p>{data.total} matching recipient-steps</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Campaign recipient records"><table className="responsive-table report-table" aria-label="Recipient outcomes"><thead><tr><th>Contact</th><th>Destination</th><th>Outcome</th><th>Reason</th><th>Message unsubscribe</th></tr></thead><tbody>{data.rows.map(row=><tr key={row.recipientStepId}><th scope="row">{row.contactId?<Link to="/app/audience/$id" params={{id:row.contactId}}>{row.displayName||'Contact'}</Link>:'Erased contact'}</th><td data-label="Destination" style={{overflowWrap:'anywhere'}}>{row.destination??'Anonymous'}</td><td data-label="Outcome">{row.disposition}{row.bounceType?` · ${row.bounceType}`:''}{row.complainedAt?' · complained':''}</td><td data-label="Reason">{row.reason??'—'}</td><td data-label="Message unsubscribe">{row.unsubscribedAt?formatDate(row.unsubscribedAt):'—'}</td></tr>)}</tbody></table></div><div className="detail-actions"><button type="button" className="secondary-action" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-100))}>Previous recipients</button><button type="button" className="secondary-action" disabled={offset+data.rows.length>=data.total} onClick={()=>setOffset(offset+100)}>Next recipients</button></div></>}
  </section>;
}
