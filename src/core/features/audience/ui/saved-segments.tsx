import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { useResource } from '@/core/app/client/lib/use-resource';
import { Modal } from '@/core/app/client/ui/modal';
import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { AudienceRuleEditor, type AudienceRuleDraft } from '@/core/features/campaigns/ui/audience-rule-editor';
import { summarizeAudienceRules } from '@/core/features/campaigns/audience-summary';
import type { SavedSegment } from '../segments';

const emptyRules=():AudienceRuleDraft=>({inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'}]}),exclusionRulesJson:'[]',steps:[{channel:'email'}]});
export function SavedSegments() {
  const {data,error,reload}=useResource<{segments:SavedSegment[]}>('/api/audience/segments');
  const [editing,setEditing]=useState<string|null>(),[name,setName]=useState(''),[draft,setDraft]=useState(emptyRules);
  const [deleting,setDeleting]=useState<SavedSegment>(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  function edit(segment?:SavedSegment) {setEditing(segment?.id??null);setName(segment?.name??'');setDraft(segment?{...segment,steps:[{channel:'email'}]}:emptyRules());setMessage('');}
  async function save() {
    setBusy(true);setMessage('');
    try {
      const result=await requestJson<{detail?:string}>(`/api/audience/segments${editing?`/${editing}`:''}`,{method:editing?'PUT':'POST',body:JSON.stringify({name,inclusionRuleJson:draft.inclusionRuleJson,exclusionRulesJson:draft.exclusionRulesJson})});
      if(result.status>=400) {setMessage(result.data.detail??'Complete the segment name and audience conditions.');return;}
      setEditing(undefined);setMessage('Segment saved. Existing campaign revisions keep their copied rules.');await reload();
    } catch {setMessage('The segment could not be saved. Try again.');} finally {setBusy(false);}
  }
  async function remove() {
    if(!deleting)return;setBusy(true);
    try {
      const result=await requestJson(`/api/audience/segments/${deleting.id}`,{method:'DELETE'});
      if(result.status>=400)throw new Error();
      setDeleting(undefined);if(editing===deleting.id)setEditing(undefined);
      setMessage('Segment deleted. Existing campaign revisions keep their copied rules.');await reload();
    } catch {setMessage('The segment could not be deleted. Try again.');} finally {setBusy(false);}
  }
  return <section className="panel audience-ledger" aria-labelledby="segments-title">
    <div className="section-heading"><div><p className="eyebrow">Reusable audiences</p><h2 id="segments-title">Saved segments</h2></div><button className="secondary-action" type="button" onClick={()=>edit()}>Create segment</button></div>
    <p className="muted-copy">Save conditions, then copy them into a campaign draft. Consent protections always apply.</p>
    {error?<p role="alert">{error}</p>:null}{message?<p role="status">{message}</p>:null}
    {data?.segments.length?<div className="table-scroll" tabIndex={0} role="region" aria-label="Saved segment list"><table className="responsive-table audience-ledger__table saved-segments__table"><thead><tr><th scope="col">Segment</th><th scope="col">Conditions</th><th scope="col">Actions</th></tr></thead><tbody>{data.segments.map(segment=><tr key={segment.id}><th scope="row">{segment.name}</th><td data-label="Conditions">{summarizeAudienceRules(segment.inclusionRuleJson,segment.exclusionRulesJson)}</td><td data-label="Actions"><button type="button" className="text-link" onClick={()=>edit(segment)}>Edit {segment.name}</button>{' '}<button type="button" className="text-link" onClick={()=>setDeleting(segment)}>Delete {segment.name}</button></td></tr>)}</tbody></table></div>:data?<p>No saved segments yet.</p>:!error?<p>Loading saved segments…</p>:null}
    {editing!==undefined?<ValidationForm className="editor-panel" onValidSubmit={()=>void save()} aria-busy={busy}><fieldset className="draft-fields" disabled={busy}><legend>{editing?'Edit segment':'Create segment'}</legend><label>Segment name<Field name="name" label="Segment name" required><input value={name} maxLength={160} onChange={event=>setName(event.target.value)}/></Field></label><label>Preview channel<select value={draft.steps[0].channel} onChange={event=>setDraft({...draft,steps:[{channel:event.target.value as 'email'|'sms'}]})}><option value="email">Email</option><option value="sms">SMS</option></select></label><AudienceRuleEditor draft={draft} onChange={setDraft}/><div className="edit-actions"><button type="submit" className="primary-action">Save segment</button><button type="button" className="secondary-action" onClick={()=>setEditing(undefined)}>Cancel editing</button></div></fieldset></ValidationForm>:null}
    <Modal open={Boolean(deleting)} title="Delete saved segment?" description={`Delete ${deleting?.name??'this segment'}? Saved and approved campaigns retain the rules already copied into them.`} onClose={()=>{if(!busy)setDeleting(undefined);}}><div className="edit-actions"><button className="secondary-action" disabled={busy} onClick={()=>setDeleting(undefined)}>Cancel</button><button className="primary-action" disabled={busy} onClick={()=>void remove()}>Delete segment</button></div></Modal>
  </section>;
}
