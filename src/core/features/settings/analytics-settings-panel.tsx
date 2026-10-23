import {useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
import {parseAnalyticsPolicy,type AnalyticsPolicy} from './analytics-policy';

export function AnalyticsSettingsPanel(){
  const {data,error,reload}=useResource<AnalyticsPolicy>('/api/settings/analytics');
  return <section className="panel" aria-labelledby="analytics-settings-title"><h2 id="analytics-settings-title">Web analytics tagging</h2>
    <p>Defaults are frozen into new campaign drafts. Author-provided UTM values win. Contact details and managed links are never tagged.</p>
    {error?<p role="alert">{error}</p>:data?<AnalyticsForm initial={data} saved={reload}/>:<p>Loading analytics defaults…</p>}
    {data?<CampaignAnalyticsSettings defaults={data}/>:null}
  </section>;
}
function AnalyticsForm({initial,saved}:{initial:AnalyticsPolicy;saved:()=>Promise<unknown>}){
  const [policy,setPolicy]=useState(initial),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const fields=[['source','UTM source'],['emailMedium','Email UTM medium'],['smsMedium','SMS UTM medium'],['campaign','UTM campaign (blank uses campaign name slug)'],['content','UTM content (blank uses message id)']] as const;
  return <form className="signup-settings-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setNotice('');try{const result=await requestJson('/api/settings/analytics',{method:'PUT',body:JSON.stringify(policy)});if(result.status>=400){setNotice('Analytics defaults could not be saved. Use static text without contact data.');return;}await saved();setNotice('Analytics defaults saved for new campaigns.');}catch{setNotice('Analytics defaults could not be saved.');}finally{setBusy(false);}}}>
    <label><input type="checkbox" checked={policy.enabled} onChange={e=>setPolicy({...policy,enabled:e.target.checked})}/> Enable tagging for new campaigns</label>
    {fields.map(([key,label])=><label key={key}>{label}<input value={policy[key]} maxLength={64} required={['source','emailMedium','smsMedium'].includes(key)} onChange={e=>setPolicy({...policy,[key]:e.target.value})}/></label>)}
    <p>Only HTTP and HTTPS destinations are tagged. Leave campaign and content empty to derive them from the campaign and message. Flow tagging remains unavailable.</p>
    <button type="submit" className="secondary-action" disabled={busy}>Save analytics defaults</button>
    {notice?<p role="status">{notice}</p>:null}
  </form>;
}

function CampaignAnalyticsSettings({defaults}:{defaults:AnalyticsPolicy}){
  const {data,error,reload}=useResource<{campaigns:Array<{id:string;name:string;utmPolicyJson:string|null}>}>('/api/settings/analytics/campaigns');
  const [id,setId]=useState(''),[enabled,setEnabled]=useState<boolean>(),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const campaign=data?.campaigns.find(row=>row.id===id)??data?.campaigns[0];
  const policy=campaign?.utmPolicyJson?parseAnalyticsPolicy(JSON.parse(campaign.utmPolicyJson)):undefined;
  return <form className="signup-settings-form" onSubmit={async e=>{e.preventDefault();if(!campaign)return;setBusy(true);setNotice('');try{const result=await requestJson(`/api/campaign-revisions/${campaign.id}`,{method:'PATCH',body:JSON.stringify({utmPolicyJson:JSON.stringify({...(policy??defaults),enabled:enabled??policy?.enabled??false})})});setNotice(result.status<400?'Campaign tagging saved. Review this draft before sending.':'Campaign tagging could not be saved.');await reload();}catch{setNotice('Campaign tagging could not be saved.');}finally{setBusy(false);}}}>
    <h3>Campaign tagging</h3><p>Change a draft without changing other campaigns or installation defaults.</p>
    {error?<p role="alert">{error}</p>:!campaign?<p>No campaign drafts.</p>:<>
      <label>Campaign draft<select aria-label="Campaign draft" value={campaign.id} onChange={e=>{setId(e.target.value);setEnabled(undefined);setNotice('');}}>{data!.campaigns.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label><input type="checkbox" checked={enabled??policy?.enabled??false} onChange={e=>setEnabled(e.target.checked)}/> Tag this campaign's links</label>
      <button type="submit" className="secondary-action" disabled={busy}>Save campaign tagging</button>
    </>}{notice?<p role="status">{notice}</p>:null}
  </form>;
}
