import {useDateFormatter} from '@/core/app/client/lib/use-date-formatter';
import {useState} from 'react';
import {requestJson} from '@/core/app/client/lib/api';
import {useResource} from '@/core/app/client/lib/use-resource';
import {usePermissions} from './permissions';

export function ApprovalRequests({campaignId,revisionId,dirty}:{campaignId:string;revisionId:string;dirty:boolean}) {
  const formatDate=useDateFormatter();
  const {can}=usePermissions(),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const resource=useResource<{requests:Array<{revisionId:string;operator:string;requestedAt:number}>}>(`/api/campaigns/${campaignId}/approval-requests`);
  async function request() {
    setBusy(true);setNotice('');
    try {
      const result=await requestJson(`/api/campaigns/${campaignId}/request-approval`,{method:'POST',body:JSON.stringify({revisionId})});
      if(result.status>=300){setNotice('Approval could not be requested. Reload the saved draft and check your access.');return;}
      await resource.reload();setNotice('Approval requested for the saved revision. A Manager, Admin or Owner can review it.');
    } catch {setNotice('The request could not be confirmed. Reload before trying again.');}
    finally{setBusy(false);}
  }
  const latest=resource.data?.requests.find(row=>row.revisionId===revisionId);
  if(!latest&&!(can('draft.write')&&!can('campaign.approve'))&&!notice)return null;
  return <div className="notice-note">
    {latest?<p>Approval requested by {latest.operator} on {formatDate(new Date(latest.requestedAt).toISOString())}.</p>:null}
    {can('draft.write')&&!can('campaign.approve')?<><p>Your role can draft and request approval. A Manager, Admin or Owner approves the saved revision.</p><button type="button" className="secondary-action" disabled={busy||dirty} onClick={()=>void request()}>Request approval</button>{dirty?<p>Save changes before requesting approval.</p>:null}</>:null}
    {notice?<p role="status">{notice}</p>:null}
  </div>;
}
