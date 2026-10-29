import { PredicateFields, newPredicate } from './audience-predicate-fields';
import { AudienceGroupEditor } from './audience-group-editor';
import { summarizeAudienceRules } from '../audience-summary';
import { Field } from '@/core/app/client/ui/validation-form';
import { parseEditableRules } from '../authoring-rules';
import { useEffect, useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import type { InclusionRule, ExclusionRule } from '@/core/features/lifecycle/rules';
export type AudienceRuleDraft = {inclusionRuleJson:string;exclusionRulesJson:string;steps:{channel:'email'|'sms'}[]};

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
      <AudienceGroupEditor group={rules.inclusion} label="Include" onChange={group=>changeRules({...group,version:1},rules.exclusions)}/>
      {rules.exclusions.map((rule,index)=><div className="rule-editor-group" key={index}><PredicateFields predicate={rule.predicate} label={`Exclude ${index+1}`} onChange={predicate=>changeRules(rules.inclusion,rules.exclusions.map((item,i)=>i===index?{...item,predicate}:item))}/><button type="button" className="text-link edit-action" onClick={()=>changeRules(rules.inclusion,rules.exclusions.filter((_,i)=>i!==index))}>Remove exclusion {index+1}</button></div>)}
      <div className="edit-actions">
        <button type="button" className="text-link edit-action edit-action--add" onClick={()=>changeRules(rules.inclusion,[...rules.exclusions,{version:1,reason:`operator-exclusion-${rules.exclusions.length+1}`,predicate:{sourceType:'contact',field:'email',comparator:'contains',value:''}}])}>Add exclusion</button>
      </div>
    </>}
    <p className="audience-rule-summary" aria-label="Audience conditions summary">{summarizeAudienceRules(draft.inclusionRuleJson,draft.exclusionRulesJson)}</p>
    <div className="audience-estimate" aria-label="Live audience estimate" aria-live="polite">{live?.key!==key?<p>Checking current audience…</p>:live.status==='ok'?<><p>{live.candidateCount} candidate{live.candidateCount === 1 ? '' : 's'} · {live.eligibleCount} eligible contact{live.eligibleCount === 1 ? '' : 's'} · {live.excludedCount} excluded contact{live.excludedCount === 1 ? '' : 's'}</p>{live.channelCounts?.map(count=><p key={count.channel}>{count.channel==='email'?'Email':'SMS'}: {count.eligibleContactCount} eligible contact{count.eligibleContactCount === 1 ? '' : 's'} · {count.recipientStepCount} message{count.recipientStepCount === 1 ? '' : 's'} across {count.stepCount} {count.stepCount===1?'step':'steps'}</p>)}<p className="muted-copy">Based on current eligibility. Every step rechecks consent, frequency and store evidence before sending. A contact can have more than one exclusion reason.</p>{live.exclusions?.map(item=><p key={item.reason}>{item.reason}: {item.count} excluded</p>)}</>:<p className="inline-error" role="alert">Audience blocked: {live.detail} Counts unavailable.</p>}</div>
  </fieldset>;
}
