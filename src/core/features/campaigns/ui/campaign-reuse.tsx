import type {ComponentProps} from 'react';
import {Can} from '@/core/features/auth/ui/permissions';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { requestJson } from '@/core/app/client/lib/api';
import { useResource } from '@/core/app/client/lib/use-resource';
import { Disclosure } from '@/core/app/client/ui/disclosure';

type Template = { id:string;name:string;kind:'starter'|'saved';updatedAt:string|null };
type Library = {templates:Template[]};

function DuplicateCampaignContent({campaignId,disabled=false}:{campaignId:string;disabled?:boolean}) {
  const navigate=useNavigate(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const duplicate=async()=>{
    setBusy(true);setError('');
    try {
      const response=await requestJson<{campaignId:string}>(`/api/campaigns/${campaignId}/duplicate`,{method:'POST'});
      if(response.status!==201)throw new Error();
      await navigate({to:'/app/campaigns/$id/review',params:{id:response.data.campaignId},reloadDocument:true});
    } catch {setError('The copy could not be confirmed. Check campaign history before trying again.');setBusy(false);}
  };
  return <div><button type="button" className="secondary-action" disabled={disabled||busy} onClick={()=>void duplicate()}>{busy?'Copying…':'Duplicate'}</button>{error?<p role="alert">{error}</p>:null}</div>;
}

function SaveCampaignTemplateContent({revisionId,name,disabled}:{revisionId:string;name:string;disabled:boolean}) {
  const library=useResource<Library>('/api/campaign-templates');
  const [templateName,setTemplateName]=useState(name),[templateId,setTemplateId]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
  const save=async()=>{
    setBusy(true);setNotice('');setFailed(false);
    try {
      const selected=library.data?.templates.find(item=>item.id===templateId);
      const response=await requestJson<{kind:string}>('/api/campaign-templates',{method:'POST',body:JSON.stringify({revisionId,name:templateName,templateId:templateId||undefined,updatedAt:selected?.updatedAt?Date.parse(selected.updatedAt):undefined})});
      if(response.status!==201)throw new Error(response.status===409?'This template changed. Reload the library before replacing it.':'Template could not be saved.');
      setNotice('Template saved. Existing drafts and approved revisions keep their own content.');await library.reload();
    } catch(error) {setFailed(true);setNotice(error instanceof Error?error.message:'Template could not be saved.');}
    finally {setBusy(false);}
  };
  return <Disclosure className="panel" title="Save as a template">
    <p>Reuse this saved revision’s content and audience. New campaigns need their own dates and approval.</p>
    {disabled?<p>Save your draft changes before saving a template.</p>:null}
    <div className="draft-fields"><label>Template name<input aria-label="Template name" value={templateName} maxLength={160} onChange={event=>setTemplateName(event.target.value)}/></label>
      <label>Save to<select aria-label="Save to template" value={templateId} onChange={event=>setTemplateId(event.target.value)}><option value="">New template</option>{library.data?.templates.filter(item=>item.kind==='saved').map(item=><option key={item.id} value={item.id}>Replace: {item.name}</option>)}</select></label>
      <button type="button" className="secondary-action" disabled={disabled||busy||!templateName.trim()} onClick={()=>void save()}>{busy?'Saving template…':templateId?'Update template':'Save template'}</button>
    </div>
    {notice?<p role={failed?'alert':'status'}>{notice}</p>:null}
  </Disclosure>;
}

export function TemplateLibrary() {
  const library=useResource<Library>('/api/campaign-templates'),navigate=useNavigate();
  const [busy,setBusy]=useState(''),[error,setError]=useState('');
  const start=async(id:string)=>{
    setBusy(id);setError('');
    try {
      const response=await requestJson<{campaignId:string}>(`/api/campaign-templates/${encodeURIComponent(id)}/start`,{method:'POST'});
      if(response.status!==201)throw new Error();
      await navigate({to:'/app/campaigns/$id/review',params:{id:response.data.campaignId},reloadDocument:true});
    } catch {setError('The draft could not be confirmed. Check campaign history before trying again.');setBusy('');}
  };
  return <section aria-labelledby="template-library-title" style={{borderTop:'1px solid #ead8ae',marginTop:24,paddingTop:24}}><h3 id="template-library-title">Template library</h3>
    <p>Choose a starting point, or edit a saved template in a new draft and save it back. Campaigns keep independent snapshots.</p>
    {library.error?<p role="alert">Templates could not be loaded.</p>:null}
    {(['saved','starter'] as const).map(kind=><div key={kind} style={{marginTop:16}}><h4>{kind==='saved'?'Your templates':'Common jobs'}</h4>
      {kind==='saved'&&!library.data?.templates.some(item=>item.kind===kind)?<p>No saved templates yet. Save one from a campaign’s review.</p>:null}
      <ul style={{listStyle:'none',padding:0,display:'flex',flexWrap:'wrap',gap:12,marginTop:12}}>{library.data?.templates.filter(item=>item.kind===kind).map(item=><li key={item.id}><button type="button" className="secondary-action" disabled={Boolean(busy)} onClick={()=>void start(item.id)}>{busy===item.id?'Starting…':`Use ${item.name}`}</button></li>)}</ul>
    </div>)}
    {error?<p role="alert">{error}</p>:null}
  </section>;
}

export function DuplicateCampaign(props:ComponentProps<typeof DuplicateCampaignContent>) {return <Can permission="draft.write"><DuplicateCampaignContent {...props}/></Can>;}

export function SaveCampaignTemplate(props:ComponentProps<typeof SaveCampaignTemplateContent>) {return <Can permission="draft.write"><SaveCampaignTemplateContent {...props}/></Can>;}
