import {SignupSettingsForm} from './signup-settings-form';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import {useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';

type Level={name:string;label:string;floor:number;ceiling:number;value:number;scheduled:{value:number;effective_at:number}|null};
export function SignupCapacitySettings() {
  const {data,error,reload}=useResource<{allowances:Level[];destinationPerDay:number;challengeConfigured:boolean}>('/api/audience/signup-allowance');
  const signup=useResource<{frequencyDisclosure:string;embedOrigins:string[];kioskEnabled:boolean;kioskDeviceLabel:string;challengeEnabled:boolean}>('/api/audience/signup');
  const [notice,setNotice]=useState('');
  async function save(name:string,value:number){const result=await requestJson<{error?:string}>('/api/audience/signup-allowance',{method:'PUT',body:JSON.stringify({name,value})});setNotice(result.status<400?'Allowance saved for the next UTC window.':result.data.error?.replaceAll('_',' ')??'Allowance could not be saved.');await reload();}
  return <section className="panel" id="signup-allowances" aria-labelledby="signup-capacity-title">
    <h2 id="signup-capacity-title">Signup allowances</h2>
    <p>Only an Owner changes a level. Changes take effect from the next UTC window. Kiosk and unchallenged traffic have their own partitions.</p>
    {error?<p role="alert">{error}</p>:!data?<p>Loading allowances…</p>:<>
      {!data.challengeConfigured?<p role="alert">Public forms are running without Turnstile keys. Configure verification before sharing them; kiosk intake is blocked until then.</p>:null}
      {data.allowances.map(level=><Allowance key={`${level.name}:${level.value}:${level.scheduled?.value}`} level={level} save={save}/>)}
      <p>Confirmation reservations per destination per UTC day: {data.destinationPerDay}. Floor 3 · Ceiling 3 (fixed).</p>
    </>}
    {signup.data?<SignupSettingsForm {...signup.data} saved={signup.reload}/>:null}
    {notice?<p role="status">{notice}</p>:null}
  </section>;
}
function Allowance({level,save}:{level:Level;save:(name:string,value:number)=>Promise<void>}) {
  const formatDate = useDateFormatter();
  const [value,setValue]=useState(level.value),[busy,setBusy]=useState(false);
  return <form className="signup-settings-form" onSubmit={async event=>{event.preventDefault();setBusy(true);try{await save(level.name,value);}finally{setBusy(false);}}}>
    <label>{level.label}<input type="number" min={level.floor} max={level.ceiling} value={value} onChange={e=>setValue(Number(e.target.value))} required/></label>
    <p>Floor {level.floor.toLocaleString('en-US')} · Ceiling {level.ceiling.toLocaleString('en-US')} · Active {level.value.toLocaleString('en-US')}</p>
    {level.scheduled?<p>Next window: {level.scheduled.value.toLocaleString('en-US')} from {formatDate(new Date(level.scheduled.effective_at).toISOString())}.</p>:null}
    <button className="secondary-action" type="submit" disabled={busy}>Save {level.label.toLowerCase()}</button>
  </form>;
}
