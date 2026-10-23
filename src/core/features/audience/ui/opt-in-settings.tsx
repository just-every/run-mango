import {useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
import type {OptInMode} from '../opt-in-modes';
type Data={points:OptInMode[];credentials:Array<{id:string;name:string}>;connections:string[]};
const labels={hosted:'Hosted signup form',kiosk:'Kiosk forms',manual:'Manual entry'};
export function OptInSettings(){
 const {data,error,reload}=useResource<Data>('/api/settings/opt-in');
 return <section className="panel" aria-labelledby="opt-in-title"><h2 id="opt-in-title">Opt-in</h2>
  <p>Email modes apply to future captures. A public form always requires confirmation before resubscribing an unsubscribed person. Existing subscriptions keep their status.</p>
  {error?<p role="alert">{error}</p>:!data?<p>Loading capture points…</p>:<>
   {data.points.map(point=><ModeForm key={point.point} point={point} saved={reload}/>)}
   <h3>Other sources</h3>
   {data.credentials.map(key=><p key={key.id}><strong>API key: {key.name}</strong> · Email: double opt-in (fixed). SMS: express written consent and carrier confirmation required.</p>)}
   {data.connections.map(name=><p key={name}><strong>{name}</strong> · Set by the connection or move-in (read only).</p>)}
   <p>Zapier and Crank capture settings are not available. SMS always requires express written consent and destination confirmation.</p>
  </>}
 </section>;
}
function ModeForm({point,saved}:{point:OptInMode;saved:()=>Promise<unknown>}){
 const [mode,setMode]=useState(point.mode),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 return <form className="signup-settings-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setNotice('');try{const result=await requestJson('/api/settings/opt-in/'+point.point,{method:'PUT',body:JSON.stringify({mode})});if(result.status>=400){setNotice(result.status===403?'Only an Owner or Admin can change this mode.':'Opt-in mode could not be saved.');return;}await saved();setNotice('Opt-in mode saved for future captures.');}catch{setNotice('Opt-in mode could not be saved.');}finally{setBusy(false);}}}>
  <h3>{labels[point.point]}</h3><label>{labels[point.point]} email mode<select aria-label={labels[point.point]+" email mode"} value={mode} onChange={e=>setMode(e.target.value as 'double'|'single')}><option value="double">Double opt-in</option><option value="single">Single opt-in</option></select></label>
  <p>SMS: express written consent and carrier confirmation required; hand entry alone never subscribes a phone.</p>
  <button className="secondary-action" type="submit" disabled={busy}>Save {labels[point.point].toLowerCase()} mode</button>{notice?<p role="status">{notice}</p>:null}
 </form>;
}
