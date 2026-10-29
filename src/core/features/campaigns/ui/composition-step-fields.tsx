import { Field } from '@/core/app/client/ui/validation-form';
import { useLoaderData } from '@tanstack/react-router';
import { resolveLocalInstant } from '@/core/features/lifecycle/schedule';
import { localDateTime, useTimeZone, zoneChoices } from '@/core/app/client/lib/time-zone';
import type { DraftComposition, DraftStep } from './draft-composition';

export function CompositionStepFields({steps, setSteps}: {steps:DraftComposition['steps'];setSteps:(steps:DraftStep[])=>void}) {
  const viewerZone = useTimeZone();
  const { modules } = useLoaderData({ from: '/app' });
  const update = (index:number, changes:Partial<DraftStep>) => setSteps(steps.map((step,i)=>i===index?{...step,...changes}:step));
  const localChange = (index:number, step:DraftStep, local:string, deadline=false) => {
    const resolved = resolveLocalInstant(local,step.timezone);
    if (deadline) update(index,{localSendByAt:local,sendByAt:resolved.status==='resolved'?resolved.instant:''});
    else {
      const previousSend=step.localScheduledAt ?? localDateTime(step.scheduledAt,step.timezone);
      const previousDeadline=step.localSendByAt ?? localDateTime(step.sendByAt,step.timezone);
      const end = previousDeadline && previousDeadline !== previousSend.slice(0,10)+'T23:59' ? previousDeadline : local.slice(0,10)+'T23:59';
      const endResolved=resolveLocalInstant(end,step.timezone);
      update(index,{localScheduledAt:local,scheduledAt:resolved.status==='resolved'?resolved.instant:'',localSendByAt:end,sendByAt:endResolved.status==='resolved'?endResolved.instant:''});
    }
  };
  return <fieldset className="composition-fieldset"><legend>Selected channel steps (required for approval)</legend>
    {steps.map((step,index)=> {
      const local = step.localScheduledAt ?? localDateTime(step.scheduledAt,step.timezone), deadline = step.localSendByAt ?? localDateTime(step.sendByAt,step.timezone);
      const resolution = resolveLocalInstant(local,step.timezone), end = resolveLocalInstant(deadline,step.timezone);
      return <div className="composition-step" key={index}><p>Step {index+1}</p>
        <label>Channel<select value={step.channel} onChange={event=>update(index,{channel:event.target.value as 'email'|'sms'})}><option value="email">Email</option>{modules.sms || step.channel === 'sms' ? <option value="sms" disabled={!modules.sms}>{modules.sms ? 'SMS' : 'SMS (disabled)'}</option> : null}</select></label>
        <label>Time zone<Field name={`steps.${index}.timezone`} label={`Step ${index+1} time zone`} required live validate={() => {try {new Intl.DateTimeFormat("en", {timeZone:step.timezone});return undefined;} catch {return "Choose a time zone.";}}}><select aria-label="Time zone" value={step.timezone} onChange={event=>{const timezone=event.target.value; const send=resolveLocalInstant(local,timezone),until=resolveLocalInstant(deadline,timezone);update(index,{timezone,localScheduledAt:local,localSendByAt:deadline,scheduledAt:send.status==='resolved'?send.instant:'',sendByAt:until.status==='resolved'?until.instant:''});}}>{zoneChoices(step.timezone).map(name=><option key={name} value={name}>{name.replaceAll('_',' ')}</option>)}</select></Field></label>
        <label>Local send date and time (required)<Field name={`steps.${index}.scheduledAt`} label={`Step ${index+1} send time`} required live validate={() => resolution.status === "resolved" ? undefined : `${resolution.detail} Choose another local time.`}><input aria-label="Local send date and time" type="datetime-local" value={local} onChange={event=>localChange(index,step,event.target.value)} required /></Field></label>
        <label>Local send-by date and time (required)<Field name={`steps.${index}.sendByAt`} label={`Step ${index+1} deadline`} required live validate={() => end.status !== "resolved" ? `${end.detail} Choose another local time.` : Date.parse(step.sendByAt) <= Date.parse(step.scheduledAt) ? "Choose a deadline after the send time." : undefined}><input aria-label="Local send-by date and time" type="datetime-local" value={deadline} onChange={event=>localChange(index,step,event.target.value,true)} required /></Field></label>
        <label>Why this time (required)<Field name={`steps.${index}.whyThisTime`} label={`Step ${index+1} timing reason`} required><textarea aria-label="Why this time" value={step.whyThisTime} onChange={event=>update(index,{whyThisTime:event.target.value})} rows={2}/></Field></label>
        <button type="button" className="text-link edit-action" onClick={()=>setSteps(steps.filter((_,i)=>i!==index))}>Remove step {index+1}</button>
      </div>;
    })}
    <Field name="steps" label="Channel steps" advisory validate={() => steps.length ? undefined : "Add a channel step before approval."}><button type="button" className="text-link edit-action edit-action--add" onClick={()=>setSteps([...steps,{channel:'email',timezone:viewerZone,scheduledAt:'',sendByAt:'',localScheduledAt:'',localSendByAt:'',whyThisTime:'Selected by the operator.'}])}>Add email step</button></Field>
  </fieldset>;
}
