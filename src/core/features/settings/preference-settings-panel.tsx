import {useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
export function PreferenceSettingsPanel() {
  const {data,error,reload}=useResource<{editableFields:string[]}>('/api/settings/preferences');
  return <section className="panel" aria-labelledby="preference-settings-title"><h2 id="preference-settings-title">Recipient preferences</h2>
    <p>Choose which profile fields a recipient can update from their email preference link.</p>
    {error?<p role="alert">{error}</p>:data?<PreferenceFields initial={data.editableFields.includes('displayName')} saved={reload}/>:<p>Loading preference settings…</p>}
  </section>;
}
function PreferenceFields({initial,saved}:{initial:boolean;saved:()=>Promise<unknown>}) {
  const [enabled,setEnabled]=useState(initial),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  return <form className="signup-settings-form" onSubmit={async event=>{event.preventDefault();setBusy(true);setNotice('');try {
    const result=await requestJson('/api/settings/preferences',{method:'PUT',body:JSON.stringify({editableFields:enabled?['displayName']:[]})});
    if(result.status>=400){setNotice('Preference settings could not be saved.');return;}
    await saved();setNotice('Preference settings saved.');
  }catch{setNotice('Preference settings could not be saved.');}finally{setBusy(false);}}}>
    <label><input type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)}/> Let recipients update their display name</label>
    <button type="submit" className="secondary-action" disabled={busy}>Save preference settings</button>
    {notice?<p role="status">{notice}</p>:null}
  </form>;
}
