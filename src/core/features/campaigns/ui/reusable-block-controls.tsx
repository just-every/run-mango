import {getJson,requestJson} from '@/core/app/client/lib/api';
import {useEffect,useState} from 'react';
import type {EditorBlock} from '../email-blocks';
import type {ReusableBlock} from '../reusable-block-model';
type SavedBlock={id:string;name:string;version:number;block:ReusableBlock};
export function ReusableBlockControls({selected,value,campaignId,busy,onChange}:{selected?:EditorBlock;value:string;campaignId?:string;busy:boolean;onChange:(html:string)=>void}){
  const [blocks,setBlocks]=useState<SavedBlock[]>([]),[id,setId]=useState(''),[name,setName]=useState(''),[canWrite,setCanWrite]=useState(false),[pending,setPending]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const selectedSaved=blocks.find(block=>block.id===id),disabled=busy||pending||!canWrite;
  useEffect(()=>{let active=true;getJson<{blocks:SavedBlock[];canWrite:boolean}>('/api/reusable-email-blocks').then(result=>{if(active){setBlocks(result.blocks);setCanWrite(result.canWrite);}}).catch(cause=>{if(active)setError(cause.message);});return()=>{active=false;};},[]);
  const call=async<T,>(path:string,method:string,data:unknown):Promise<T>=>{const response=await requestJson<T&{detail?:string}>(path,{method,body:JSON.stringify(data)});if(response.status>=400)throw new Error(response.data.detail??'The reusable block change was refused.');return response.data;};
  const run=async(action:()=>Promise<void>)=>{setPending(true);setError('');setMessage('');try{await action();}catch(cause){setError(cause instanceof Error?cause.message:'The reusable block change was refused.');}finally{setPending(false);}};
  const save=(update:boolean)=>run(async()=>{
    if(!selected)return;const {html,mobile}=selected;
    const result=await call<SavedBlock>('/api/reusable-email-blocks'+(update?'/'+id:''),update?'PATCH':'POST',{name,block:{html,...(mobile?{mobile}:{})},...(update?{version:selectedSaved!.version}:{})});
    setBlocks([...blocks.filter(block=>block.id!==result.id),result]);setId(result.id);setName(result.name);
    setMessage(update?'Reusable block updated. Linked drafts changed; approved revisions keep their saved content and receive new drafts for approval.':'Reusable block saved. Insert it from the library to link a draft.');
  });
  const target=async()=>{const result=await getJson<{revision?:{id:string;state:string}}>(`/api/campaigns/${campaignId}/review`);if(result.revision?.state!=='draft')throw new Error('Open an editable draft before changing a reusable placement.');return {kind:'campaign',id:result.revision.id};};
  return <fieldset><legend>Reusable blocks</legend>
    <label>Saved reusable block<select value={id} disabled={busy||pending} onChange={event=>{setId(event.target.value);setName(blocks.find(block=>block.id===event.target.value)?.name??'');}}><option value="">Choose a saved block</option>{blocks.map(block=><option key={block.id} value={block.id}>{block.name}</option>)}</select></label>
    {canWrite?<><label>Reusable block name<input value={name} disabled={disabled} onChange={event=>setName(event.target.value)}/></label><div className="detail-actions">
      <button type="button" className="secondary-action" disabled={disabled||!selected||!name.trim()} onClick={()=>save(false)}>Save reusable block</button>
      <button type="button" className="secondary-action" disabled={disabled||!selected||!selectedSaved||!name.trim()} onClick={()=>save(true)}>Update reusable block</button>
      <button type="button" className="secondary-action" disabled={disabled||!selectedSaved||!campaignId} onClick={()=>run(async()=>{const result=await call<{emailBody:string}>(`/api/reusable-email-blocks/${id}/place`,'POST',{version:selectedSaved!.version,target:await target(),emailBody:value});onChange(result.emailBody);setMessage('Reusable block inserted and email body saved. Save the full draft to keep other edits.');})}>Insert reusable block</button>
      <button type="button" className="secondary-action" disabled={disabled||!selectedSaved||!campaignId} onClick={()=>run(async()=>{await call(`/api/reusable-email-blocks/${id}/placements`,'DELETE',{target:await target()});setMessage('This draft keeps an independent copy. Later reusable edits leave it unchanged.');})}>Keep independent copy</button>
    </div></>:<p>Owners, Admins and Managers can save, place and edit reusable blocks.</p>}
    {message?<p role="status">{message}</p>:null}{error?<p role="alert">{error}</p>:null}
  </fieldset>;
}
