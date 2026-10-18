import { useState } from 'react';
import { useResource } from '@/core/app/client/lib/use-resource';
import { requestJson } from '@/core/app/client/lib/api';
export function CampaignPublication({campaignId,revisionId,completed}:{campaignId:string;revisionId:string;completed:boolean}) {
  const path=`/api/campaigns/${campaignId}/publications`;
  const {data,error,reload}=useResource<{publications:{id:string;revisionId:string}[]}>(path);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  if(!completed&&!data?.publications.length)return null;
  const publish=async()=>{setBusy(true);try {const response=await requestJson<{error?:string;detail?:string}>(path,{method:'POST',body:JSON.stringify({revisionId})});setMessage(response.status<300?'Newsletter published. Review the public copy below.':response.data.detail??'Publication could not be saved.');await reload();}catch{setMessage('Publication could not be confirmed. Refresh before retrying.');}finally{setBusy(false);}};
  const remove=async(id:string)=>{setBusy(true);try{const response=await requestJson(`${path}/${id}`,{method:'DELETE'});setMessage(response.status<300?'Newsletter removed from the public archive.':'Removal could not be confirmed.');await reload();}catch{setMessage('Removal could not be confirmed. Refresh before retrying.');}finally{setBusy(false);}};
  return <section className="panel" aria-labelledby="publication-title"><h2 id="publication-title">Public web version</h2>
    <p>Publish a reading copy with neutral personalisation. Unsubscribe links, tracking links and remote images are removed. The sent revision stays unchanged.</p>
    <p>Review your wording before publishing: text you typed directly becomes public.</p>
    {error?<p className="inline-error" role="alert">Publications could not be loaded.</p>:null}
    {data?.publications.map(entry=><p key={entry.id}><a href={`/archive/${entry.id}`} target="_blank" rel="noreferrer">Read public newsletter</a>{' · '}<button className="text-action" type="button" disabled={busy} onClick={()=>void remove(entry.id)}>Unpublish</button></p>)}
    {completed&&data&&!data.publications.some(entry=>entry.revisionId===revisionId)?<button className="secondary-action" type="button" disabled={busy} onClick={()=>void publish()}>{busy?'Publishing…':'Publish web version'}</button>:null}
    <p><a href="/archive">Open newsletter archive</a></p>{message?<p role="status">{message}</p>:null}
  </section>;
}
