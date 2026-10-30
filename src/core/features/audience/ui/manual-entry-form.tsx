import './manual-entry-form.css';
import {useState,type FormEvent} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {localDateTime,useTimeZone,useZoneChoices} from '@/core/app/client/lib/time-zone';
import {resolveLocalInstant} from '@/core/features/lifecycle/schedule';
type Options={sender:string;frequencyDisclosure:string;mode:{mode:'double'|'single'};sms:{available:boolean;detail?:string;brand?:string;programme?:string;category?:string;frequency?:string;jurisdiction?:string;consentText?:string;consentVersion?:string}};
export function ManualEntryForm(){
 const zone=useTimeZone(),zones=useZoneChoices(zone);
 const {data,error}=useResource<Options>('/api/contacts/consent'),[emailOn,setEmail]=useState(true),[smsOn,setSms]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[contactId,setContactId]=useState(''),[properties,setProperties]=useState<Array<{name:string;value:string}>>([]);
 if(!data)return <section className="panel"><h2>Add a contact by hand</h2><p role={error?'alert':undefined}>{error||'Loading consent settings…'}</p></section>;
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!data)return;setBusy(true);setNotice('');setContactId('');const form=new FormData(event.currentTarget),value=(key:string)=>String(form.get(key)??'');
  try{
   const instant=(local:string)=>{const resolved=resolveLocalInstant(local,zone);if(resolved.status!=='resolved')throw new Error(`${resolved.detail} Choose another time.`);return resolved.instant;};
   const entries=properties.filter(p=>p.name.trim());if(new Set(entries.map(p=>p.name.trim())).size!==entries.length)throw new Error('Each property needs a unique name.');const fields=Object.fromEntries(entries.map(p=>[p.name.trim(),p.value]));
   if(!emailOn&&!smsOn)throw new Error('Select at least one channel.');
   const outcomes:string[]=[];
   for(const channel of ['email','sms'] as const){if(channel==='email'?!emailOn:!smsOn)continue;
    const sms=channel==='sms',p=data.sms;
    const body={contact:{...(value('email')?{email:value('email')}:{}),...(value('phone')?{phone:value('phone')}:{}),displayName:value('name')},channel,
     brandOrLegalSender:sms?p.brand:data.sender,messageCategory:sms?p.category:'newsletter',frequencyDisclosure:sms?p.frequency:data.frequencyDisclosure,destinationJurisdiction:sms?p.jurisdiction:value('jurisdiction'),
     ...(sms?{smsProgram:p.programme,timeZone:value('timeZone'),locationSource:value('locationSource'),locationRecordedAt:instant(value('smsWhen'))}:{}),
     captureMethod:'operator-entry',captureSource:value('source'),permissionMethod:value(channel+'Method'),affirmed:form.get(channel+'Affirmed')==='on',
     ...(sms?{expressWrittenConsent:form.get(channel+'Affirmed')==='on'}:{}),consentText:value(channel+'Text'),consentVersion:'manual-entry-v1',occurredAt:instant(value(channel+'When')),properties:fields};
    const response=await fetch('/api/contacts/consent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),result=await response.json() as {detail?:string;error?:string;contact:{id:string;emailStatus:string}};
    if(!response.ok)throw new Error(`${outcomes.join(' ')} ${result.detail||(response.status===403?'Your role cannot add contacts.':response.status===400?'Check the contact details and permission fields.':'The entry could not be saved.')}`.trim());
    setContactId(result.contact.id);outcomes.push(sms?'SMS permission recorded; the phone stays pending until its confirmation reply.':result.contact.emailStatus==='subscribed'?'Email subscribed with operator-recorded evidence.':'Email permission recorded; confirmation is required.');
   }
   setNotice(outcomes.join(' '));
  }catch(error){setNotice(error instanceof Error?error.message:'The entry could not be saved.');}finally{setBusy(false);}
 }
 const when=()=>localDateTime(new Date(Date.now()-60000).toISOString(),zone);
 return <section className="panel" aria-labelledby="manual-entry-title"><p className="eyebrow">Permission recorded by an operator</p><h2 id="manual-entry-title">Add a contact by hand</h2><p>Email uses {data.mode.mode==='single'?'single':'double'} opt-in. Hand entry cannot reverse an unsubscribe or suppression. SMS always requires the person’s confirmation reply.</p>
 <form className="manual-entry-form" onSubmit={submit}>
  <label>Name<input name="name" maxLength={200}/></label><label>Email<input name="email" type="email" required={emailOn}/></label><label>Phone<input name="phone" type="tel" placeholder="+614…" required={smsOn}/></label>
  <fieldset><legend>Properties</legend>{properties.map((property,index)=><div key={index}><label>Property {index+1} name<input value={property.name} maxLength={100} required onChange={event=>setProperties(rows=>rows.map((row,i)=>i===index?{...row,name:event.target.value}:row))}/></label><label>Property {index+1} value<input value={property.value} maxLength={2000} onChange={event=>setProperties(rows=>rows.map((row,i)=>i===index?{...row,value:event.target.value}:row))}/></label><button className="secondary-action" type="button" onClick={()=>setProperties(rows=>rows.filter((_,i)=>i!==index))}>Remove property {index+1}</button></div>)}<button className="secondary-action" type="button" disabled={properties.length>=50} onClick={()=>setProperties(rows=>[...rows,{name:'',value:''}])}>Add property</button></fieldset><label>Where permission was recorded<input name="source" required maxLength={2000} placeholder="Saturday market signup sheet"/></label>
  <label><input type="checkbox" checked={emailOn} onChange={e=>setEmail(e.target.checked)}/>Record email permission</label>
  {data.sms.available?<label><input type="checkbox" checked={smsOn} onChange={e=>setSms(e.target.checked)}/>Record SMS permission</label>
   :<p>Text messages are off in this setup. <a href="/docs/going-live#turn-on-text-messages">How to turn them on</a></p>}
  {(['email','sms'] as const).filter(channel=>channel==='email'?emailOn:smsOn).map(channel=><fieldset key={channel} disabled={channel==='email'?!emailOn:!smsOn}><legend>{channel==='email'?'Email':'SMS'} permission</legend>
   <label>How {channel==='email'?'email':'SMS'} permission was given<select name={channel+'Method'}><option value="in-person">In person</option><option value="event">At an event</option><option value="phone">By phone</option><option value="written">In writing</option></select></label>
   <label>When {channel==='email'?'email':'SMS'} permission was given<input name={channel+'When'} type="datetime-local" required defaultValue={when()}/></label>
   <label>{channel==='email'?'Email':'SMS'} consent wording shown<textarea name={channel+'Text'} required maxLength={2000} rows={3} defaultValue={channel==='sms'?data.sms.consentText:''}/></label>
   {channel==='email'?<label>Destination jurisdiction<input name="jurisdiction" required placeholder="AU"/></label>:<><label>Recipient time zone<select name="timeZone" defaultValue={zone}>{zones.map(name=><option key={name} value={name}>{name.replaceAll('_',' ')}</option>)}</select></label><label>How the recipient’s location was established<input name="locationSource" required/></label></>}
   <label><input name={channel+'Affirmed'} type="checkbox" required/>I record that this person gave the {channel==='email'?'email permission':'express written SMS permission'} above.</label>
  </fieldset>)}
  <button className="primary-action" type="submit" disabled={busy}>{busy?'Saving permission…':'Add contact with permission'}</button>
  {notice?<p role="status">{notice}</p>:null}{contactId?<a href={'/app/audience/'+contactId}>View recorded contact</a>:null}
 </form></section>;
}
