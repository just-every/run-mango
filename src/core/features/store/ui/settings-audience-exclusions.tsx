import {useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
import {LoadState} from '@/core/app/client/ui/layout';
import type {DormancyPolicy} from '@/core/features/audience/dormancy-policy';
export function SettingsAudienceExclusions() {
  const resource=useResource<{policy:DormancyPolicy}>('/api/settings/audience-exclusions');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  if(!resource.data)return <LoadState error={resource.error}/>;
  const policy=resource.data.policy;
  return <section className="panel"><h2>Audience inactivity default</h2><p>New campaigns copy this default. Each saved campaign keeps its own reviewed policy.</p>
    <form className="draft-fields" key={JSON.stringify(policy)} onSubmit={async e=>{
      e.preventDefault();const form=new FormData(e.currentTarget);setBusy(true);setError('');
      try{const result=await requestJson('/api/settings/audience-exclusions',{method:'PUT',body:JSON.stringify({policy:{enabled:form.get('enabled')==='on',windowDays:Number(form.get('days'))}})});
        if(result.status>=300){setError('The default could not be saved. Check the window and try again.');return;}await resource.reload();
      }catch{setError('The default could not be confirmed. Reload and try again.');}finally{setBusy(false);}
    }}><label><input name="enabled" type="checkbox" defaultChecked={policy.enabled}/> Exclude dormant contacts by default</label>
      <label>Dormancy window in days<input name="days" type="number" min="1" max="3650" required defaultValue={policy.windowDays}/></label>
      <button className="primary-action" disabled={busy}>Save inactivity default</button>
      {error?<p className="inline-error" role="alert">{error}</p>:null}
    </form></section>;
}
