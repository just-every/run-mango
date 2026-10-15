import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { requestJson } from '@/core/app/client/lib/api';
import type { Contact } from '@/core/app/client/lib/types';
import { StatusPill } from '@/core/app/client/ui/layout';
import { Modal } from '@/core/app/client/ui/modal';

type Preview={survivor:Contact;merged:Contact;emailStatus:string;smsStatus:string};
export function ContactMerge({contact}:{contact:Contact}) {
  const navigate=useNavigate();
  const [open,setOpen]=useState(false),[address,setAddress]=useState(''),[matches,setMatches]=useState<Contact[]>([]);
  const [preview,setPreview]=useState<Preview>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    let active=true;setMatches([]);
    if(!open||address.trim().length<2)return;
    const timer=setTimeout(()=>{void requestJson<{contacts:Contact[]}>(`/api/contacts/search?address=${encodeURIComponent(address.trim())}`).then(result=>{if(active){if(result.status<300)setMatches(result.data.contacts.filter(item=>item.id!==contact.id));else setError('Search could not be completed.');}}).catch(()=>{if(active)setError('Search could not be completed.');});},200);
    return ()=>{active=false;clearTimeout(timer);};
  },[address,open,contact.id]);
  async function choose(survivor:Contact) {
    setBusy(true);setError('');
    try {
      const result=await requestJson<Preview&{detail?:string}>('/api/contacts/merge-preview',{method:'POST',body:JSON.stringify({survivorContactId:survivor.id,mergedContactId:contact.id})});
      if(result.status>=400){setError(result.data.detail??'Unable to preview this merge.');return;}setPreview(result.data);
    } catch {setError('Unable to preview this merge.');} finally {setBusy(false);}
  }
  async function confirm() {
    if(!preview)return;setBusy(true);setError('');
    try {
      const result=await requestJson<{contact:Contact;detail?:string}>('/api/contacts/merge',{method:'POST',body:JSON.stringify({survivorContactId:preview.survivor.id,mergedContactId:contact.id})});
      if(result.status>=400){setError(result.data.detail??'Unable to merge these contacts.');return;}
      setOpen(false);await navigate({to:'/app/audience/$id',params:{id:result.data.contact.id}});
    } catch {setError('Unable to merge these contacts.');} finally {setBusy(false);}
  }
  return <><button type="button" className="secondary-action" onClick={()=>{setOpen(true);setPreview(undefined);setAddress('');setError('');}}>Merge into another contact</button>
    <Modal open={open} title={preview?'Confirm contact merge':'Merge into another contact'} role={preview?'alertdialog':'dialog'} onClose={()=>{if(!busy)setOpen(false);}} description="Choose the contact to keep. Both contacts’ consent evidence, source activity and history are retained. The most restrictive status wins on each channel.">
      {error?<p className="inline-error" role="alert">{error}</p>:null}
      {preview?<><p>Merge {contact.email??contact.displayName} into <strong>{preview.survivor.email??preview.survivor.displayName}</strong>.</p><div className="table-scroll"><table><caption>Resulting channel states</caption><thead><tr><th>Channel</th><th>After merge</th></tr></thead><tbody><tr><th>Email</th><td><StatusPill value={preview.emailStatus}/></td></tr><tr><th>SMS</th><td><StatusPill value={preview.smsStatus}/></td></tr></tbody></table></div><p>Suppressed → unsubscribed → non-subscribed → pending → subscribed. A merge cannot restore permission to send. Scheduled recipients for the removed contact will be excluded.</p><div className="edit-actions"><button type="button" className="secondary-action" disabled={busy} onClick={()=>setPreview(undefined)}>Choose another contact</button><button type="button" className="primary-action" disabled={busy} onClick={()=>void confirm()}>Confirm merge</button></div></>:<><label>Survivor email or phone<input type="search" value={address} onChange={event=>{setAddress(event.target.value);setError('');}}/></label>{address.trim().length<2?<p>Enter at least two characters to search by address.</p>:<ul>{matches.map(item=><li key={item.id}><button type="button" className="text-link" disabled={busy} onClick={()=>void choose(item)}>{item.email ? `${item.email} · ${item.displayName}` : item.displayName}</button></li>)}</ul>}</>}
      <button type="button" className="secondary-action" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button>
    </Modal></>;
}
