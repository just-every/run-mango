import {useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
import {LoadState} from '@/core/app/client/ui/layout';
import {propertyTypes,type PropertyDefinition} from '@/core/features/audience/properties/types';
import {Modal} from '@/core/app/client/ui/modal';
type Definition=PropertyDefinition&{recordedContacts:number;invalidLegacyValues:number};
export function SettingsProperties() {
  const resource=useResource<{definitions:Definition[];limit:number}>('/api/settings/properties');
  const [type,setType]=useState<PropertyDefinition['type']>('text'),[editing,setEditing]=useState<Definition>(),[deleting,setDeleting]=useState<Definition>();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  if(!resource.data)return <LoadState error={resource.error}/>;
  const save=async(form:HTMLFormElement)=>{
    const fields=new FormData(form);setBusy(true);setError('');
    try{
      const result=await requestJson<{error?:string}>('/api/settings/properties',{method:editing?'PUT':'POST',body:JSON.stringify({key:fields.get('key'),label:fields.get('label'),type,options:type==='list'?String(fields.get('options')).split(';').map(v=>v.trim()).filter(Boolean):[]})});
      if(result.status>=300){setError(result.data.error??'Property could not be saved.');return;}
      setEditing(undefined);setType('text');form.reset();await resource.reload();
    }catch{setError('Property save could not be confirmed. Reload before trying again.');}finally{setBusy(false);}
  };
  return <section className="panel" aria-label="Custom property definitions"><h2>Custom properties</h2><p>{resource.data.definitions.length} of {resource.data.limit} definitions. Property changes never change consent.</p>
    {resource.data.definitions.map(d=><article key={d.key} style={{overflowWrap:'anywhere',marginBlock:'1rem'}}><h3>{d.label}</h3><p>{d.key} · {d.type==='money'?'USD money':d.type} · {d.recordedContacts} contacts with recorded values</p>{d.invalidLegacyValues?<p role="status">{d.invalidLegacyValues} legacy values do not match this type. They remain recorded; edit each contact to correct them.</p>:null}<div className="edit-actions"><button className="secondary-action" disabled={busy} onClick={()=>{setEditing(d);setType(d.type);}}>Edit {d.label}</button><button className="text-link" disabled={busy} onClick={()=>setDeleting(d)}>Delete {d.label}</button></div></article>)}
    <form key={editing?.key??'new'} onSubmit={e=>{e.preventDefault();void save(e.currentTarget);}}><fieldset className="draft-fields" disabled={busy}><legend>{editing?'Edit property':'Define a property'}</legend>
      <label>Property key<input name="key" required pattern="[a-z][a-z0-9_]{0,99}" maxLength={100} defaultValue={editing?.key} readOnly={Boolean(editing)}/></label>
      <label>Property label<input name="label" required maxLength={160} defaultValue={editing?.label}/></label>
      <label>Property type<select name="type" aria-label="Property type" value={type} onChange={e=>setType(e.target.value as PropertyDefinition['type'])} disabled={Boolean(editing?.recordedContacts)}>{propertyTypes.map(t=><option key={t} value={t}>{t==='money'?'USD money':t==='list'?'List of values':t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select></label>
      {type==='list'?<label>Allowed values, separated by semicolons<input name="options" required defaultValue={editing?.options.join('; ')} readOnly={Boolean(editing?.recordedContacts)}/></label>:null}
      <p>Dates use YYYY-MM-DD. Money accepts USD amounts such as $1,234.56. Once values exist, the type and allowed list are fixed.</p><div className="edit-actions"><button className="primary-action" type="submit">{editing?'Save property':'Create property'}</button>{editing?<button className="secondary-action" type="button" onClick={()=>{setEditing(undefined);setType('text');}}>Cancel property edit</button>:null}</div>
    </fieldset></form>{error?<p className="inline-error" role="alert">{error}</p>:null}
    <Modal open={Boolean(deleting)} title="Delete property?" description={`Delete ${deleting?.label??'this property'} and its current values, legacy fields and property-change history from all contacts? This cannot be undone here.`} onClose={()=>{if(!busy)setDeleting(undefined);}}><button className="secondary-action" disabled={busy} onClick={()=>setDeleting(undefined)}>Cancel</button><button className="primary-action" disabled={busy} onClick={async()=>{if(!deleting)return;setBusy(true);setError('');try{const result=await requestJson<{error?:string}>('/api/settings/properties/'+encodeURIComponent(deleting.key),{method:'DELETE'});if(result.status>=300){setError(result.data.error??'Delete failed.');return;}setDeleting(undefined);await resource.reload();}catch{setError('Delete could not be confirmed. Reload before trying again.');}finally{setBusy(false);}}}>Delete property and values</button></Modal>
  </section>;
}
