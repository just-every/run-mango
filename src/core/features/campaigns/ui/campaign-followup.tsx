import {useState} from 'react';
import {Link,useNavigate} from '@tanstack/react-router';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
import {Disclosure} from '@/core/app/client/ui/disclosure';
type Source={name:string;subject:string;lastSentAt:number;recipients:number;openEstimatesEnabled:boolean};
export function CampaignFollowup({campaignId}:{campaignId:string}) {
  const {data}=useResource<{source:Source|null}>(`/api/campaigns/${campaignId}/followup`),navigate=useNavigate();
  const [subject,setSubject]=useState(''),[hours,setHours]=useState('48'),[metric,setMetric]=useState<'click'|'open-estimate'>('click'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  if(!data?.source)return null;
  const create=async()=>{
    setBusy(true);setError('');
    try {
      const response=await requestJson<{kind:string;campaignId:string;availableAt?:string}>(`/api/campaigns/${campaignId}/followup`,{method:'POST',body:JSON.stringify({subject,delayHours:Number(hours),metric})});
      if(response.status!==201)throw new Error(response.data.kind==='too-early'?`Wait until ${response.data.availableAt} before creating this follow-up.`:'The follow-up could not be confirmed. Check Campaigns before trying again.');
      await navigate({to:'/app/campaigns/$id/review',params:{id:response.data.campaignId},reloadDocument:true});
    } catch(cause){setError(cause instanceof Error?cause.message:'Follow-up could not be created.');setBusy(false);}
  };
  return <Disclosure className="panel" title="Follow up with non-engaged readers">
    <p>Create an unscheduled email draft for recipients who had no {metric==='click'?'human click':'recorded open estimate'} by the chosen delay after the last email hand-off. {metric==='click'?'Known scanners do not count. ':''}Current consent, suppression and frequency checks still apply at review and sending.</p>
    <div className="draft-fields">
      <label>New follow-up subject<input aria-label="New follow-up subject" maxLength={250} value={subject} onChange={event=>setSubject(event.target.value)}/></label>
      <label>Wait after sending (hours)<input aria-label="Follow-up delay hours" type="number" min="1" max="720" value={hours} onChange={event=>setHours(event.target.value)}/></label>
      <label>Engagement<select aria-label="Follow-up engagement" value={metric} onChange={event=>setMetric(event.target.value as typeof metric)}><option value="click">Did not click</option>{data.source.openEstimatesEnabled?<option value="open-estimate">Did not open — estimate</option>:null}</select></label>
      {metric==='open-estimate'?<p>Image loads are privacy-sensitive estimates and do not prove a person read a message.</p>:null}
      <button className="secondary-action" type="button" disabled={busy||!subject.trim()||!Number.isInteger(Number(hours))||Number(hours)<1||Number(hours)>720} onClick={()=>void create()}>{busy?'Creating follow-up…':'Create follow-up draft'}</button>
    </div>{error?<p role="alert">{error}</p>:null}
  </Disclosure>;
}
export function FollowupParent({campaignId}:{campaignId:string}) {
  const {data}=useResource<{followup:{sourceCampaignId:string;name:string;metric:string;cutoffAt:number;delayHours:number}|null}>(`/api/campaigns/${campaignId}/followup-parent`);
  if(!data?.followup)return null;
  const f=data.followup;
  return <aside className="notice-note" aria-label="Follow-up source"><p>Follow-up to <Link to="/app/campaigns/$id/scheduled" params={{id:f.sourceCampaignId}}>{f.name}</Link>: no {f.metric==='click'?'human click':'open estimate'} by {new Date(f.cutoffAt).toISOString()} ({f.delayHours} hours after the last email hand-off). This campaign needs its own dates, review and approval.</p></aside>;
}
