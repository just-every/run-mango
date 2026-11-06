import {useEffect,useState} from 'react';
import {getJson} from '@/core/app/client/lib/api';
import {newEmailBlock,type EditorBlock} from '../email-blocks';
import {conditionalBlockContent,contentConditionSchema,decodeCondition,type ContentCondition} from '../conditional-blocks';

type Kind='segment'|'property'|'topic'|'stage';
const stages=['new','active','at-risk','lapsed','champion'];
const wrapperKey=(html:string)=>/^<div data-mango-(?:when|otherwise)="([^"]+)"/.exec(html)?.[1];
const unwrap=(html:string)=>html.replace(/^<div data-mango-(?:when|otherwise)="[^"]+">/,'').replace(/<\/div>$/,'');
export function conditionSummary(condition:ContentCondition,names:Record<string,string>={}) {
  if(condition.kind==='segment')return `in segment ${names[condition.segmentId]??condition.segmentId}`;
  const p=condition.predicate;
  if(p.field==='property')return `${p.property} ${p.comparator==='neq'?'is not':p.comparator==='contains'?'contains':'is'} ${String(p.value)}`;
  if(p.field==='topic')return `has consented to ${p.topicId} by ${p.channel}`;
  if(p.field==='rfmStage')return `lifecycle stage is ${String(p.value)}`;
  return 'matches the condition';
}
/** BUILD-005: show the selected block only to contacts a condition selects, with an optional "otherwise" block. */
export function ConditionalBlockControls({block,blocks,busy,apply}:{block:EditorBlock;blocks:EditorBlock[];busy:boolean;apply:(next:EditorBlock[])=>void}) {
  const key=wrapperKey(block.html),existing=key?decodeCondition(key):undefined,isOtherwise=block.html.startsWith('<div data-mango-otherwise=');
  const [kind,setKind]=useState<Kind>('property'),[segments,setSegments]=useState<Array<{id:string;name:string}>>([]),[properties,setProperties]=useState<Array<{key:string;label:string}>>([]);
  const [segmentId,setSegmentId]=useState(''),[property,setProperty]=useState(''),[comparator,setComparator]=useState<'eq'|'neq'|'contains'>('eq'),[value,setValue]=useState(''),[topicId,setTopicId]=useState(''),[channel,setChannel]=useState<'email'|'sms'>('email'),[stage,setStage]=useState(stages[0]),[error,setError]=useState('');
  useEffect(()=>{let current=true;void getJson<{segments:Array<{id:string;name:string}>}>('/api/audience/segments').then(r=>{if(current)setSegments(r.segments);}).catch(()=>{});void getJson<{definitions:Array<{key:string;label:string}>}>('/api/contact-properties').then(r=>{if(current)setProperties(r.definitions);}).catch(()=>{});return()=>{current=false;};},[]);
  const names=Object.fromEntries(segments.map(s=>[s.id,s.name]));
  const build=():ContentCondition=>kind==='segment'?{kind:'segment',segmentId}
    :kind==='property'?{kind:'contact',predicate:{sourceType:'contact',field:'property',property,comparator,value}}
    :kind==='topic'?{kind:'contact',predicate:{sourceType:'contact',field:'topic',comparator:'eq',value:true,channel,topicId}}
    :{kind:'contact',predicate:{sourceType:'contact',field:'rfmStage',comparator:'eq',value:stage}};
  const place=(next:EditorBlock[])=>{setError('');apply(next);};
  const wrap=()=>{
    const parsed=contentConditionSchema.safeParse(build());
    if(!parsed.success||(kind==='segment'&&!segmentId)||(kind==='property'&&(!property||!value.trim()))||(kind==='topic'&&!topicId.trim())){setError('Complete the condition before applying it.');return;}
    place(blocks.map(row=>row.id===block.id?{...row,html:conditionalBlockContent(parsed.data,row.html)}:row));
  };
  const addOtherwise=()=>{if(!existing||!key)return;const html=`<div data-mango-otherwise="${key}">${newEmailBlock('text').html}</div>`;const index=blocks.findIndex(row=>row.id===block.id);place([...blocks.slice(0,index+1),{id:crypto.randomUUID(),html},...blocks.slice(index+1)]);};
  const remove=()=>place(blocks.map(row=>row.id===block.id?{...row,html:unwrap(row.html)}:row));
  const hasOtherwise=Boolean(key)&&blocks.some(row=>row.html.startsWith(`<div data-mango-otherwise="${key}"`));
  return <fieldset><legend>Conditional display</legend>
    {existing?<>
      <p>{isOtherwise?'Shown to contacts who do not match: ':'Shown only to contacts who match: '}{conditionSummary(existing,names)}.</p>
      <div className="detail-actions">
        {!isOtherwise&&!hasOtherwise?<button type="button" className="secondary-action" disabled={busy} onClick={addOtherwise}>Add otherwise block</button>:null}
        <button type="button" className="secondary-action" disabled={busy} onClick={remove}>Show to everyone</button>
      </div></>
    :<>
      <label>Show this block to<select value={kind} disabled={busy} onChange={e=>setKind(e.target.value as Kind)}><option value="property">Contacts with a property value</option><option value="segment">A saved segment</option><option value="topic">Contacts who consented to a topic</option><option value="stage">A lifecycle stage</option></select></label>
      {kind==='segment'?<label>Saved segment<select value={segmentId} disabled={busy} onChange={e=>setSegmentId(e.target.value)}><option value="">Choose a segment</option>{segments.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:null}
      {kind==='property'?<><label>Property<select value={property} disabled={busy} onChange={e=>setProperty(e.target.value)}><option value="">Choose a property</option>{properties.map(p=><option key={p.key} value={p.key}>{p.label||p.key}</option>)}</select></label>
        <label>Comparison<select value={comparator} disabled={busy} onChange={e=>setComparator(e.target.value as typeof comparator)}><option value="eq">is</option><option value="neq">is not</option><option value="contains">contains</option></select></label>
        <label>Value<input value={value} maxLength={160} disabled={busy} onChange={e=>setValue(e.target.value)}/></label></>:null}
      {kind==='topic'?<><label>Channel<select value={channel} disabled={busy} onChange={e=>setChannel(e.target.value as 'email'|'sms')}><option value="email">Email</option><option value="sms">SMS</option></select></label><label>Topic<input value={topicId} maxLength={160} disabled={busy} onChange={e=>setTopicId(e.target.value)}/></label></>:null}
      {kind==='stage'?<label>Lifecycle stage<select value={stage} disabled={busy} onChange={e=>setStage(e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select></label>:null}
      <button type="button" className="secondary-action" disabled={busy} onClick={wrap}>Show only to this condition</button>
      <p className="muted-copy">The email's plain-text part follows the same choice. Preview the email as a contact, or as each branch.</p>
    </>}
    {error?<p role="alert">{error}</p>:null}
  </fieldset>;
}
