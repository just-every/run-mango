import {useId, useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import type {SavedSegment} from '@/core/features/audience/segments';
import type {ContentCondition} from '../conditional-content';
import {readBlockFields} from '../email-block-content';
import {escapeBlock} from '../email-blocks';

type Props = {
  condition?: ContentCondition;
  otherwise: string;
  busy: boolean;
  onChange: (condition: ContentCondition | undefined, otherwise: string) => void;
};

function SegmentKey({value, busy, onChange}: {value:string;busy:boolean;onChange:(value:string)=>void}) {
  const id = useId();
  const {data, error, loading} = useResource<{segments:SavedSegment[]}>('/api/audience/segments');
  return <>
    <label>Condition key<input list={id} disabled={busy} value={value} onChange={event=>onChange(event.target.value)}/></label>
    <datalist id={id}>{data?.segments.map(segment=><option key={segment.id} value={segment.id}>{segment.name}</option>)}</datalist>
    <p className="muted-copy">Use the ID of a saved segment.{loading?' Loading saved segments…':''}</p>
    {error?<p role="alert">{error}</p>:null}
  </>;
}

function NumberValue({value, busy, onChange}: {value:number;busy:boolean;onChange:(value:number)=>void}) {
  const [draft, setDraft] = useState({value, text:String(value)});
  if(draft.value!==value) setDraft({value, text:String(value)});
  return <label>Condition value<input type="number" step="any" required disabled={busy} value={draft.text} onChange={event=>{
    const number = event.target.valueAsNumber;
    setDraft({value:Number.isFinite(number)?number:value, text:event.target.value});
    if(Number.isFinite(number)) onChange(number);
  }}/></label>;
}

export function EmailConditionFields({condition, otherwise, busy, onChange}: Props) {
  const change = (patch:Partial<ContentCondition>) => {
    if(condition) onChange({...condition, ...patch}, otherwise);
  };
  // Preserve authored line breaks while letting the shared parser decode entities.
  const otherwiseText = readBlockFields(otherwise.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p>\s*<p\b[^>]*>/gi, '\n')).text;
  return <fieldset className="composition-fieldset" disabled={busy}>
    <legend>Conditional content</legend>
    <label>Show block<select value={condition?'conditional':'always'} onChange={event=>onChange(event.target.value==='always'?undefined:{source:'segment',key:'',comparator:'eq',value:true}, otherwise)}>
      <option value="always">Always</option><option value="conditional">When a condition matches</option>
    </select></label>
    {condition?<>
      <label>Condition source<select value={condition.source} onChange={event=>{
        const source = event.target.value as ContentCondition['source'];
        change({source,key:source==='predicted-stage'?'predictedStage':''});
      }}>
        <option value="segment">Segment</option><option value="property">Contact property</option><option value="topic">Consent topic</option><option value="predicted-stage">Predicted stage</option><option value="event">Trigger event property</option>
      </select></label>
      {condition.source==='segment'?<SegmentKey value={condition.key} busy={busy} onChange={key=>change({key})}/>:<>
        <label>Condition key<input value={condition.key} onChange={event=>change({key:event.target.value})}/></label>
        <p className="muted-copy">{condition.source==='topic'?'Use the topic category.':'Use the property key.'}</p>
      </>}
      <label>Condition comparison<select value={condition.comparator} onChange={event=>change({comparator:event.target.value as ContentCondition['comparator']})}>
        <option value="eq">Equals</option><option value="neq">Does not equal</option><option value="contains">Contains</option><option value="gt">Greater than</option><option value="gte">Greater than or equal to</option><option value="lt">Less than</option><option value="lte">Less than or equal to</option>
      </select></label>
      <label>Condition value type<select value={typeof condition.value} onChange={event=>{
        const type = event.target.value;
        change({value:type==='number'?0:type==='boolean'?true:String(condition.value)});
      }}><option value="string">Text</option><option value="number">Number</option><option value="boolean">Yes or no</option></select></label>
      {typeof condition.value==='boolean'?<label>Condition value<select value={String(condition.value)} onChange={event=>change({value:event.target.value==='true'})}><option value="true">Yes</option><option value="false">No</option></select></label>
        :typeof condition.value==='number'?<NumberValue value={condition.value} busy={busy} onChange={value=>change({value})}/>
        :<label>Condition value<input value={condition.value} onChange={event=>change({value:event.target.value})}/></label>}
      <label>Otherwise text<textarea value={otherwiseText} onChange={event=>onChange(condition, event.target.value?`<p>${escapeBlock(event.target.value).replaceAll('\n','<br>')}</p>`:'')}/></label>
      <p className="muted-copy">Missing facts choose the otherwise text. Leave it empty to hide the block when the condition does not match.</p>
    </>:null}
  </fieldset>;
}
