import {useResource} from '@/core/app/client/lib/use-resource';
import {propertyComparisons} from '@/core/features/audience/properties/comparison';
import type {PropertyDefinition} from '@/core/features/audience/properties/types';
import { useEffect, useState } from 'react';
import { audienceRuleFields as fields, audienceRuleComparisons } from '../audience-rule-labels';
import { Field } from '@/core/app/client/ui/validation-form';
import { incompleteCondition } from '../authoring-rules';
import type { InclusionRule } from '@/core/features/lifecycle/rules';
import { EventPropertyFilters } from './event-property-filters';

export type Predicate = InclusionRule['predicates'][number];
export const newPredicate = ():Predicate => ({sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'});
const booleans = ['consent','topic','clicked','paidMember'];
const numericFields = ['count','distanceMiles','rfmRecencyDays','rfmRecencyScore','rfmFrequency','rfmFrequencyScore','rfmMonetaryScore','rfmMonetaryMinor'];

export function PredicateFields({predicate,onChange,label}: {predicate:Predicate;onChange:(value:Predicate)=>void;label:string}) {
  const [lookback,setLookback]=useState(String(predicate.lookbackDays??''));
  useEffect(()=>setLookback(String(predicate.lookbackDays??'')),[predicate.lookbackDays]);
  const definitions=useResource<{definitions:PropertyDefinition[]}>('/api/contact-properties');
  const definition=predicate.field==='property'?definitions.data?.definitions.find(d=>d.key===predicate.property):undefined;
  const date=definition?.type==='date',relative=['within_last','not_within_last'].includes(predicate.comparator);
  const boolean=definition?.type==='boolean'||predicate.sourceType==='contact'&&booleans.includes(predicate.field);
  const numeric=relative||definition?.type==='money'||definition?.type==='number'||numericFields.includes(predicate.field)||['gt','gte','lt','lte'].includes(predicate.comparator);
  if(predicate.sourceType==='campaign')return <p>Saved non-engagement audience. Its source campaign and cutoff are shown above. Current consent and frequency protections still apply.</p>;
  return <div className="rule-editor-group"><div className="rule-editor-row">
    <label>{label} field<select aria-label={`${label} field`} value={`${predicate.sourceType}:${predicate.field}`} onChange={event=>{
      const [sourceType,field]=event.target.value.split(':');
      const isBoolean=sourceType==='contact'&&booleans.includes(field);
      const next:Predicate={sourceType:sourceType as Predicate['sourceType'],field,comparator:isBoolean?'eq':numericFields.includes(field)?'gte':predicate.comparator,value:isBoolean?true:numericFields.includes(field)?1:typeof predicate.value==='boolean'?'':predicate.value};
      if(isBoolean)next.channel='email';
      if(field==='clicked'||field==='count')next.lookbackDays=90;
      if(field==='distanceMiles'){next.originZip='';next.comparator='lte';next.value=25;}
      if(field==='property'){next.property='';next.comparator='eq';next.value='';}
      if(field==='topic')next.topicId='';
      onChange(next);
    }}>
      {!fields.some(([source,field])=>source===predicate.sourceType&&field===predicate.field)?<option value={`${predicate.sourceType}:${predicate.field}`}>{predicate.sourceType}: {predicate.field}</option>:null}
      {fields.map(([source,field,title])=><option key={`${source}:${field}`} value={`${source}:${field}`}>{title}</option>)}
    </select></label>
    {predicate.field==='property'&&definitions.error?<p role="alert">Property definitions could not be loaded.</p>:null}
    {predicate.field==='property'?<label>{label} property name<input aria-label={`${label} property name`} value={predicate.property??''} maxLength={100} list={`${label}-properties`} onChange={event=>{const d=definitions.data?.definitions.find(d=>d.key===event.target.value);onChange({...predicate,property:event.target.value,comparator:d?propertyComparisons[d.type][0]:'eq',value:d?.type==='boolean'?true:d?.type==='money'||d?.type==='number'?0:''});}}/><datalist id={`${label}-properties`}>{definitions.data?.definitions.map(d=><option key={d.key} value={d.key}>{d.label} ({d.type})</option>)}</datalist></label>:null}
    {boolean&&!definition?<label>{label} channel<select aria-label={`${label} channel`} value={predicate.channel??'email'} onChange={event=>onChange({...predicate,channel:event.target.value as 'email'|'sms'})}><option value="email">Email</option><option value="sms">SMS</option></select></label>:null}
    {predicate.field==='topic'?<label>{label} topic<input aria-label={`${label} topic`} value={predicate.topicId??''} maxLength={160} onChange={event=>onChange({...predicate,topicId:event.target.value})}/></label>:null}
    {predicate.field==='distanceMiles'?<label>{label} origin ZIP<input aria-label={`${label} origin ZIP`} inputMode="numeric" maxLength={5} value={predicate.originZip??''} onChange={event=>onChange({...predicate,originZip:event.target.value})}/></label>:null}
    <label>{label} comparison<select aria-label={`${label} comparison`} value={predicate.comparator} onChange={event=>onChange({...predicate,comparator:event.target.value as Predicate['comparator'],value:event.target.value==='in'?(Array.isArray(predicate.value)?predicate.value:[String(predicate.value)]):Array.isArray(predicate.value)?predicate.value.join(', '):predicate.value})}>
      {audienceRuleComparisons.filter(([value])=>definition?propertyComparisons[definition.type].includes(value):!['on','before','after','within_last','not_within_last'].includes(value)&&(!boolean||value==='eq'||value==='neq')).map(([value,title])=><option key={value} value={value}>{title}</option>)}
    </select></label>
    <label>{label} value{predicate.comparator==='contains'||predicate.comparator==='in'?' (required)':''}<Field name={`${label}.value`} label={`${label} value`} required={predicate.comparator==='contains'||predicate.comparator==='in'} validate={()=>incompleteCondition(predicate)?'Complete this audience condition.':numeric&&(String(predicate.value).trim()===''||!Number.isFinite(Number(predicate.value)))?'Enter a number for this comparison.':undefined}>
      {boolean?<select value={String(predicate.value)} onChange={event=>onChange({...predicate,value:event.target.value==='true'})}><option value="true">Yes</option><option value="false">No</option></select>:<input type={date&&!relative?'date':numeric?'number':'text'} step={definition?.type==='number'?'any':undefined} value={Array.isArray(predicate.value)?predicate.value.join(', '):String(predicate.value)} onChange={event=>onChange({...predicate,value:predicate.comparator==='in'?event.target.value.split(',').map(value=>value.trim()):numeric&&event.target.value.trim()&&Number.isFinite(Number(event.target.value))?Number(event.target.value):event.target.value})}/>}
    </Field></label>
    {predicate.sourceType!=='contact'||predicate.field==='clicked'?<label>{label} lookback days<Field name={`${label}.lookbackDays`} label={`${label} lookback days`} validate={()=>lookback&&(!Number.isInteger(Number(lookback))||Number(lookback)<0||Number(lookback)>3650)?'Use a whole number of days between 0 and 3650.':undefined}><input type="number" min="0" max="3650" value={lookback} onChange={event=>{const value=event.target.value;setLookback(value);if(!value||(Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<=3650))onChange({...predicate,lookbackDays:value?Number(value):undefined});}}/></Field></label>:null}
    {predicate.field.startsWith('rfmMonetary')?<label>{label} currency<input aria-label={`${label} currency`} value={predicate.currency??'USD'} maxLength={3} onChange={event=>onChange({...predicate,currency:event.target.value.toUpperCase()})}/></label>:null}
  </div>
  {predicate.sourceType==='order'&&predicate.field==='count'?<EventPropertyFilters predicate={predicate} label={label} onChange={onChange}/>:null}
  {predicate.field==='boughtCollectionId'||predicate.field==='boughtCategory'?<p className="muted-copy">Matches recorded purchases of products the synced catalog currently places in this {predicate.field==='boughtCollectionId'?'collection':'category'}. Use the catalog's {predicate.field==='boughtCollectionId'?'collection ID':'full category name'}.</p>:null}
  {definition?.type==='money'?<p className="muted-copy">Compare exact USD minor units: 12345 means $123.45.</p>:null}
  {date?<p className="muted-copy">Calendar dates use UTC calendar days for relative windows, including today and the date N days ago. Missing values are excluded.</p>:null}
  {predicate.field==='distanceMiles'?<p className="muted-copy">Approximate straight-line miles between Census ZIP-area representative points. Contacts without a recorded US ZIP or a matching area are excluded.</p>:null}
  </div>;
}
