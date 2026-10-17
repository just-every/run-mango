import { useEffect, useState } from 'react';
import { useResource } from '@/core/app/client/lib/use-resource';
import type { SavedSegment } from '@/core/features/audience/segments';
import type { DraftComposition } from './draft-composition';

export function SegmentPicker({draft,onChange}:{draft:DraftComposition;onChange:(draft:DraftComposition)=>void}) {
  const {data,error}=useResource<{segments:SavedSegment[]}>('/api/audience/segments');
  const [selected,setSelected]=useState(''),[message,setMessage]=useState('');
  // This field is server-rendered before its route chunk hydrates. Keep it
  // inert until this component can retain the selection and handle copying.
  const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  const segment=data?.segments.find(item=>item.id===selected);
  return <fieldset className="composition-fieldset"><legend>Start from a saved segment</legend>
    {error?<p role="alert">{error}</p>:<><label>Saved segment<select disabled={!ready} value={selected} onChange={event=>setSelected(event.target.value)}><option value="">Choose a segment</option>{data?.segments.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" className="secondary-action" disabled={!ready||!segment} onClick={()=>{if(segment){onChange({...draft,inclusionRuleJson:segment.inclusionRuleJson,exclusionRulesJson:segment.exclusionRulesJson});setMessage(`Copied ${segment.name}. Save the draft to keep these conditions.`);}}}>Copy segment into draft</button><p className="muted-copy">This replaces the draft's audience conditions. Later segment changes do not change saved or approved revisions.</p>{message?<p role="status">{message}</p>:null}</>}
  </fieldset>;
}
