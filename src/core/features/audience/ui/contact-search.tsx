import './contact-search.css';
import {useState} from 'react';
import {Link} from '@tanstack/react-router';
import {requestJson} from '@/core/app/client/lib/api';
import {useResource} from '@/core/app/client/lib/use-resource';
import {StatusPill} from '@/core/app/client/ui/layout';
import {Can,usePermissions} from '@/core/features/auth/ui/permissions';
import {BulkActions} from './bulk-actions';
import {BulkJob} from './bulk-job';
import type {BulkReceipt,Hit} from './bulk-types';

type Form={q:string;tag:string;propertyKey:string;propertyValue:string;segmentId:string;consentChannel:string;consentState:string};
const empty:Form={q:'',tag:'',propertyKey:'',propertyValue:'',segmentId:'',consentChannel:'email',consentState:''};
const states=['subscribed','pending','non-subscribed','unsubscribed','suppressed'];

/** The same filters, as a query string for results and as an object for a bulk selection. */
function filtersOf(form:Form) {
  const filters:Record<string,unknown>={};
  if(form.q.trim())filters.q=form.q.trim();
  if(form.tag.trim())filters.tag=form.tag.trim();
  if(form.segmentId)filters.segmentId=form.segmentId;
  if(form.propertyKey&&form.propertyValue!=='')filters.property={key:form.propertyKey,value:form.propertyValue};
  if(form.consentState)filters.consent={channel:form.consentChannel,state:form.consentState};
  return filters;
}
function query(form:Form,cursor?:string) {
  const params=new URLSearchParams();
  const f=filtersOf(form) as {q?:string;tag?:string;segmentId?:string;property?:{key:string;value:string};consent?:{channel:string;state:string}};
  if(f.q)params.set('q',f.q);if(f.tag)params.set('tag',f.tag);if(f.segmentId)params.set('segmentId',f.segmentId);
  if(f.property){params.set('propertyKey',f.property.key);params.set('propertyValue',f.property.value);}
  if(f.consent){params.set('consentChannel',f.consent.channel);params.set('consentState',f.consent.state);}
  if(cursor)params.set('cursor',cursor);
  return params.toString();
}

function PropertyFields({form,set}:{form:Form;set:(key:keyof Form,value:string)=>void}) {
  const {data}=useResource<{definitions:{key:string;label:string}[]}>('/api/contact-properties');
  if(!data?.definitions.length)return null;
  return <><label>Property<select value={form.propertyKey} onChange={event=>set('propertyKey',event.target.value)}><option value="">Any</option>{data.definitions.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
    <label>Property value<input value={form.propertyValue} onChange={event=>set('propertyValue',event.target.value)} disabled={!form.propertyKey} autoComplete="off"/></label></>;
}
function SegmentField({value,set}:{value:string;set:(value:string)=>void}) {
  const {data}=useResource<{segments:{id:string;name:string}[]}>('/api/audience/segments');
  if(!data?.segments.length)return null;
  return <label>Segment<select value={value} onChange={event=>set(event.target.value)}><option value="">Any</option>{data.segments.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}

export function ContactSearch() {
  const {can}=usePermissions(),open=can('contact.unmasked');
  const [form,setForm]=useState<Form>(empty),[hits,setHits]=useState<Hit[]>([]),[total,setTotal]=useState<number|null>(null),[cursor,setCursor]=useState<string|null>(null);
  const [picked,setPicked]=useState<Set<string>>(new Set()),[all,setAll]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[searched,setSearched]=useState(false);
  const [jobs,setJobs]=useState<BulkReceipt[]>([]);
  const set=(key:keyof Form,value:string)=>setForm(current=>({...current,[key]:value}));
  async function find(next?:string) {
    setBusy(true);setError('');
    try{
      const result=await requestJson<{contacts:Hit[];nextCursor:string|null;total:number|null;detail?:string}>(`/api/audience/search?${query(form,next)}`);
      if(result.status>=400){setError(result.data.detail??'Check the search fields and try again.');return;}
      setHits(rows=>next?[...rows,...result.data.contacts]:result.data.contacts);setCursor(result.data.nextCursor);
      if(!next){setTotal(result.data.total);setPicked(new Set());setAll(false);}
      setSearched(true);
    }catch{setError('The search could not run. Try again.');}finally{setBusy(false);}
  }
  const count=all?total??0:picked.size;
  const toggle=(id:string)=>{setAll(false);setPicked(current=>{const copy=new Set(current);if(!copy.delete(id))copy.add(id);return copy;});};
  return <section className="panel contact-search" aria-labelledby="contact-search-title">
    <div className="section-heading"><div><p className="eyebrow">Find and change contacts</p><h2 id="contact-search-title">Search contacts</h2></div></div>
    <form className="contact-search__form" onSubmit={event=>{event.preventDefault();void find();}}>
      <label>{open?'Email, phone or name':'Full email or phone'}<input value={form.q} onChange={event=>set('q',event.target.value)} autoComplete="off"/></label>
      {open?<label>Tag<input value={form.tag} onChange={event=>set('tag',event.target.value)} autoComplete="off"/></label>:null}
      <Can permission="contact.unmasked"><PropertyFields form={form} set={set}/></Can>
      <Can permission="segment.read"><SegmentField value={form.segmentId} set={value=>set('segmentId',value)}/></Can>
      <label>Consent channel<select value={form.consentChannel} onChange={event=>set('consentChannel',event.target.value)}><option value="email">Email</option><option value="sms">SMS</option></select></label>
      <label>Consent state<select value={form.consentState} onChange={event=>set('consentState',event.target.value)}><option value="">Any</option>{states.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
      <button className="primary-action" type="submit" disabled={busy}>{busy?'Searching…':'Search'}</button>
    </form>
    {error?<p className="inline-error" role="alert">{error}</p>:null}
    {searched?<p role="status">{total===null?`${hits.length} shown`:`${total.toLocaleString('en-US')} ${total===1?'contact matches':'contacts match'}`}</p>:null}
    {count>0?<BulkActions count={count} selection={all?{search:filtersOf(form)}:{contactIds:[...picked]}} onStarted={receipt=>setJobs(current=>[receipt,...current])}/>:null}
    {hits.length?<label className="contact-search__all"><input type="checkbox" checked={hits.every(hit=>picked.has(hit.id))} onChange={event=>{setAll(false);setPicked(event.target.checked?new Set(hits.map(hit=>hit.id)):new Set());}}/>Select every contact shown</label>:null}
    {hits.length?<div className="table-scroll" tabIndex={0} role="region" aria-label="Search results"><table className="responsive-table audience-ledger__table"><thead><tr>
      <th scope="col" aria-label="Selected"/>
      <th scope="col">Contact</th><th scope="col">Email consent</th><th scope="col">SMS consent</th><th scope="col">Tags</th></tr></thead><tbody>
      {hits.map(hit=><tr key={hit.id}><td><input type="checkbox" aria-label={`Select ${hit.displayName}`} checked={all||picked.has(hit.id)} onChange={()=>toggle(hit.id)}/></td>
        <th scope="row"><Link to="/app/audience/$id" params={{id:hit.id}}>{hit.displayName}</Link><small>{hit.email}</small></th>
        <td data-label="Email consent"><StatusPill value={hit.emailStatus}/></td><td data-label="SMS consent"><StatusPill value={hit.smsStatus}/></td>
        <td data-label="Tags">{hit.tags?.join(', ')}</td></tr>)}
    </tbody></table></div>:searched?<p>No contacts match.</p>:null}
    {total!==null&&total>hits.length&&hits.every(hit=>picked.has(hit.id))&&!all&&can('segment.manage')?<p>{picked.size} selected. <button type="button" className="secondary-action" onClick={()=>setAll(true)}>Select all {total.toLocaleString('en-US')} matching</button></p>:null}
    {cursor?<button type="button" className="secondary-action" disabled={busy} onClick={()=>void find(cursor)}>Show more</button>:null}
    {jobs.map(job=><BulkJob key={job.id} initial={job} onFinished={()=>void find()}/>)}
  </section>;
}
