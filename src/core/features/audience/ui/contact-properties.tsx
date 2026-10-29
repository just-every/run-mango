import {useState} from 'react';
import {Can} from '@/core/features/auth/ui/permissions';
import {requestJson} from '@/core/app/client/lib/api';
import type {ContactProfile} from '../contact-profile';
import {readTypedProperty} from '../properties/read';
import {formatProperty} from '../properties/validation';
import {PropertyInput} from './property-input';
export function ContactProperties({id,profile,reload}:{id:string;profile?:ContactProfile;reload:()=>Promise<unknown>}) {
  const [editing,setEditing]=useState(false),[fields,setFields]=useState<Record<string,unknown>>({}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const definitions=profile?.definitions??[];
  return <section className="panel" aria-label="Contact properties" style={{overflowWrap:'anywhere',minWidth:0}}><h2>Properties</h2>
    {profile&&Object.keys(profile.properties).length?<dl>{Object.entries(profile.properties).map(([key,value])=>{const definition=definitions.find(d=>d.key===key),typed=definition?readTypedProperty(definition,profile.properties):undefined;return <div key={key}><dt>{definition?.label??key}</dt><dd>{typed?.error?`Invalid legacy value: ${JSON.stringify(value)}`:definition?formatProperty(definition,typed!.value)??'No value':typeof value==='string'?value:JSON.stringify(value)}</dd></div>;})}</dl>:<p>No properties recorded.</p>}
    {profile?.tags.length?<p>Tags: {profile.tags.join(' · ')}</p>:null}
    <Can permission="integration.manage">{!editing?<button className="secondary-action" disabled={!definitions.length} onClick={()=>{setFields(Object.fromEntries(definitions.map(d=>{const read=readTypedProperty(d,profile?.properties??{});return [d.key,read.error?profile?.properties[d.key]:d.type==='money'?formatProperty(d,read.value):read.value];})));setEditing(true);}}>Edit properties</button>:<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const response=await requestJson<{error?:string;property?:string}>(`/api/contacts/${encodeURIComponent(id)}/properties`,{method:'PUT',body:JSON.stringify({fields})});if(response.status>=300){setError(`${response.data.error}: ${response.data.property??''}`);return;}setEditing(false);await reload();}catch{setError('Property changes could not be confirmed. Reload before trying again.');}finally{setBusy(false);}}}><fieldset className="draft-fields" disabled={busy}><legend>Edit contact properties</legend>{definitions.map(definition=><label key={definition.key}>{definition.label}<PropertyInput definition={definition} value={fields[definition.key]} onChange={value=>setFields(current=>({...current,[definition.key]:value}))}/></label>)}<p>These changes do not change consent.</p><div className="edit-actions"><button className="primary-action" type="submit">Save properties</button><button className="secondary-action" type="button" onClick={()=>setEditing(false)}>Cancel property changes</button></div></fieldset></form>}</Can>{error?<p className="inline-error" role="alert">{error}</p>:null}
  </section>;
}
