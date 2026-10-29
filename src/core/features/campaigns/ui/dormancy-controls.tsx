import {useState} from 'react';
import {requestJson} from '@/core/app/client/lib/api';
import {readDormancyPolicy} from '@/core/features/audience/dormancy-policy';
export function DormancyControls({campaignId,revisionId,policyJson,disabled,onSaved}:{campaignId:string;revisionId:string;policyJson?:string;disabled:boolean;onSaved:()=>Promise<void>}) {
  const [pending,setPending]=useState<ReturnType<typeof readDormancyPolicy>|null>(null);
  const policy=pending??readDormancyPolicy(policyJson),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const save=async(next:typeof policy)=>{
    setPending(next);setBusy(true);setError('');
    try{
      const result=await requestJson(`/api/campaigns/${campaignId}/dormancy`,{method:'PUT',body:JSON.stringify({revisionId,policy:next})});
      if(result.status>=300){setError('Dormancy policy could not be saved. Reload and try again.');return;}
      await requestJson(`/api/campaigns/${campaignId}/checks`,{method:'POST',body:JSON.stringify({revisionId})});
      await onSaved();
    }catch{setError('Dormancy policy could not be confirmed. Reload before approving.');}finally{setPending(null);setBusy(false);}
  };
  return <fieldset className="composition-fieldset dormancy-controls"><legend>Inactivity for this campaign</legend>
    <p>Dormancy window: {policy.windowDays} days. Consent, topics, suppression and opt-outs still apply.</p>
    <label><input type="checkbox" checked={policy.enabled} disabled={disabled||busy} onChange={e=>void save({...policy,enabled:e.target.checked})}/> Exclude dormant contacts</label>
    <button className="secondary-action" type="button" disabled={disabled||busy||!policy.enabled||policy.includeOpenOnly} onClick={()=>void save({...policy,includeOpenOnly:true})}>{policy.includeOpenOnly?'Open-only contacts included':'Include open-only contacts'}</button>
    {error?<p className="inline-error" role="alert">{error}</p>:null}
  </fieldset>;
}
