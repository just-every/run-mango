import { audienceRuleFields as fields, audienceRuleComparisons } from '../audience-rule-labels';
import { Field } from '@/core/app/client/ui/validation-form';
import { parseEditableRules, incompleteCondition } from '../authoring-rules';
import { useEffect, useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import type { InclusionRule, ExclusionRule } from '@/core/features/lifecycle/rules';
export type AudienceRuleDraft = {inclusionRuleJson:string;exclusionRulesJson:string;steps:{channel:'email'|'sms'}[]};

type Predicate = InclusionRule['predicates'][number];
const newPredicate = ():Predicate => ({sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'});
function PredicateFields({predicate,onChange,label}: {predicate:Predicate;onChange:(value:Predicate)=>void;label:string}) {
  const [lookback, setLookback] = useState(String(predicate.lookbackDays ?? ''));
  useEffect(() => setLookback(String(predicate.lookbackDays ?? '')), [predicate.lookbackDays]);
  const numeric = ['gt','gte','lt','lte'].includes(predicate.comparator);
  return <div className="rule-editor-row">
    <label>{label} field<select aria-label={`${label} field`} value={`${predicate.sourceType}:${predicate.field}`} onChange={event=>{
      const [sourceType,field]=event.target.value.split(':');
      const next={...predicate,sourceType:sourceType as Predicate['sourceType'],field};
      if(sourceType==='contact') delete next.lookbackDays;
      onChange(next);
    }}>
      {!fields.some(([source,field])=>source===predicate.sourceType&&field===predicate.field)?<option value={`${predicate.sourceType}:${predicate.field}`}>{predicate.sourceType}: {predicate.field}</option>:null}
      {fields.map(([source,field,title])=><option key={`${source}:${field}`} value={`${source}:${field}`}>{title}</option>)}
    </select></label>
    <label>{label} comparison<select aria-label={`${label} comparison`} value={predicate.comparator} onChange={event=>onChange({...predicate,comparator:event.target.value as Predicate['comparator'],value:event.target.value==='in'?(Array.isArray(predicate.value)?predicate.value:[String(predicate.value)]):Array.isArray(predicate.value)?predicate.value.join(', '):predicate.value})}>{audienceRuleComparisons.map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label>
    <label>{label} value{predicate.comparator==='contains'||predicate.comparator==='in' ? ' (required)' : ''}<Field name={`${label}.value`} label={`${label} value`} required={predicate.comparator==='contains'||predicate.comparator==='in'} validate={() => incompleteCondition(predicate) ? "Enter a value to complete this condition." : numeric && (String(predicate.value).trim() === '' || !Number.isFinite(Number(predicate.value))) ? "Enter a number for this comparison." : undefined}><input value={Array.isArray(predicate.value)?predicate.value.join(', '):String(predicate.value)} onChange={event=>onChange({...predicate,value:predicate.comparator==='in'?event.target.value.split(',').map(value=>value.trim()):numeric && event.target.value.trim() && Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : event.target.value})}/></Field></label>
    {predicate.sourceType!=='contact'?<label>{label} lookback days<Field name={`${label}.lookbackDays`} label={`${label} lookback days`} validate={() => lookback && (!Number.isInteger(Number(lookback)) || Number(lookback)<0 || Number(lookback)>3650) ? "Use a whole number of days between 0 and 3650." : undefined}><input type="number" min="0" max="3650" value={lookback} onChange={event=>{const value=event.target.value;setLookback(value);if(!value || (Number.isInteger(Number(value)) && Number(value)>=0 && Number(value)<=3650)) onChange({...predicate,lookbackDays:value?Number(value):undefined});}}/></Field></label>:null}
  </div>;
}
export function AudienceRuleEditor<T extends AudienceRuleDraft>({draft,onChange}: {draft:T;onChange:(draft:T)=>void}) {
  const rules = parseEditableRules(draft.inclusionRuleJson,draft.exclusionRulesJson);
  const channels = [...new Set(draft.steps.map(step=>step.channel))];
  const stepCounts = {email:draft.steps.filter(step=>step.channel==='email').length,sms:draft.steps.filter(step=>step.channel==='sms').length};
  const key = JSON.stringify([draft.inclusionRuleJson,draft.exclusionRulesJson,channels,stepCounts]);
  const [live,setLive] = useState<{key:string;status:string;candidateCount:number|null;eligibleCount:number|null;excludedCount?:number|null;detail?:string;channelCounts?:{channel:'email'|'sms';stepCount:number;eligibleContactCount:number;recipientStepCount:number}[]|null;exclusions?:{reason:string;count:number}[]}>();
  useEffect(()=>{
    let active=true;
    if (!channels.length) {setLive({key,status:'unavailable',candidateCount:null,eligibleCount:null,detail:'Add a channel step to review its audience.'});return;}
    const timer=setTimeout(()=>{void requestJson<Omit<NonNullable<typeof live>,'key'>>('/api/campaign-authoring/audience',{method:'POST',body:JSON.stringify({inclusionRuleJson:draft.inclusionRuleJson,exclusionRulesJson:draft.exclusionRulesJson,channels,stepCounts})}).then(result=>{if(active)setLive(result.status<300?{...result.data,key}:{key,status:'unavailable',candidateCount:null,eligibleCount:null,detail:'Audience could not be checked. Try again after saving.'});}).catch(()=>{if(active)setLive({key,status:'unavailable',candidateCount:null,eligibleCount:null,detail:'Audience could not be checked. Try again after saving.'});});},200);
    return ()=>{active=false;clearTimeout(timer);};
  },[key]);
  const changeRules = (inclusion:InclusionRule,exclusions:ExclusionRule[])=>onChange({...draft,inclusionRuleJson:JSON.stringify(inclusion),exclusionRulesJson:JSON.stringify(exclusions)});
  return <fieldset className="composition-fieldset"><legend>Who should receive this?</legend>
    <p className="muted-copy">Consent, suppression and frequency protections always apply. These controls change the actual audience.</p>
    {!rules.ok?<p className="inline-error" role="alert">This draft has invalid audience rules. <Field name="inclusionRuleJson" label="Audience conditions" validate={() => "Replace these invalid audience conditions before saving."}><button type="button" onClick={()=>changeRules({version:1,operator:'all',predicates:[newPredicate()]},[])}>Use subscribed email contacts</button></Field></p>:<>
      <label>Match conditions<select value={rules.inclusion.operator} onChange={event=>changeRules({...rules.inclusion,operator:event.target.value as 'all'|'any'},rules.exclusions)}><option value="all">All conditions</option><option value="any">Any condition</option></select></label>
      {rules.inclusion.predicates.map((predicate,index)=><div className="rule-editor-group" key={index}><PredicateFields predicate={predicate} label={`Include ${index+1}`} onChange={value=>changeRules({...rules.inclusion,predicates:rules.inclusion.predicates.map((item,i)=>i===index?value:item)},rules.exclusions)}/>{rules.inclusion.predicates.length>1?<button type="button" className="text-link edit-action" onClick={()=>changeRules({...rules.inclusion,predicates:rules.inclusion.predicates.filter((_,i)=>i!==index)},rules.exclusions)}>Remove inclusion {index+1}</button>:null}</div>)}
      {rules.exclusions.map((rule,index)=><div className="rule-editor-group" key={index}><PredicateFields predicate={rule.predicate} label={`Exclude ${index+1}`} onChange={predicate=>changeRules(rules.inclusion,rules.exclusions.map((item,i)=>i===index?{...item,predicate}:item))}/><button type="button" className="text-link edit-action" onClick={()=>changeRules(rules.inclusion,rules.exclusions.filter((_,i)=>i!==index))}>Remove exclusion {index+1}</button></div>)}
      <div className="edit-actions">
        <button type="button" className="text-link edit-action edit-action--add" onClick={()=>changeRules({...rules.inclusion,predicates:[...rules.inclusion.predicates,newPredicate()]},rules.exclusions)}>Add inclusion condition</button>
        <button type="button" className="text-link edit-action edit-action--add" onClick={()=>changeRules(rules.inclusion,[...rules.exclusions,{version:1,reason:`operator-exclusion-${rules.exclusions.length+1}`,predicate:{sourceType:'contact',field:'email',comparator:'contains',value:''}}])}>Add exclusion</button>
      </div>
    </>}
    <div className="audience-estimate" aria-label="Live audience estimate" aria-live="polite">{live?.key!==key?<p>Checking current audience…</p>:live.status==='ok'?<><p>{live.candidateCount} candidate{live.candidateCount === 1 ? '' : 's'} · {live.eligibleCount} eligible contact{live.eligibleCount === 1 ? '' : 's'} · {live.excludedCount} excluded contact{live.excludedCount === 1 ? '' : 's'}</p>{live.channelCounts?.map(count=><p key={count.channel}>{count.channel==='email'?'Email':'SMS'}: {count.eligibleContactCount} eligible contact{count.eligibleContactCount === 1 ? '' : 's'} · {count.recipientStepCount} recipient-step{count.recipientStepCount === 1 ? '' : 's'} across {count.stepCount} {count.stepCount===1?'step':'steps'}</p>)}<p className="muted-copy">Based on current eligibility. Every step rechecks consent, frequency and store evidence before sending. A contact can have more than one exclusion reason.</p>{live.exclusions?.map(item=><p key={item.reason}>{item.reason}: {item.count} excluded</p>)}</>:<p className="inline-error" role="alert">Audience blocked: {live.detail} Counts unavailable.</p>}</div>
  </fieldset>;
}
