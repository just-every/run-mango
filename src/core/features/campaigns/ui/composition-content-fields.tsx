import { EmailSizeMeter } from './email-size-meter';
import { Field } from '@/core/app/client/ui/validation-form';
import { useLoaderData } from '@tanstack/react-router';
import { summarizeAudienceRules } from '../audience-summary';
import { RichEmailEditor } from './rich-email-editor';
import { DesignImport } from '@/core/features/design-import/ui/design-import';
import type { DraftComposition, DraftScalarField } from './draft-composition';

export function CompositionContentFields({campaignId, draft, savedEmailBody, mediaOrigin, setField, busy}: {campaignId: string; draft: DraftComposition; savedEmailBody: string; mediaOrigin: string; busy: boolean; setField: (field: DraftScalarField, value: string, imported?: boolean) => void}) {
  const { modules } = useLoaderData({ from: '/app' });
  const smsRequired = draft.steps.some(step => step.channel === 'sms');
  const text = (field: DraftScalarField, label: string, type = 'text', required = true) => <label>{label}{required ? ' (required for approval)' : ''}<Field name={field} label={label} required={required} advisory={type !== 'email' || !String(draft[field] ?? '').trim()}><input value={draft[field] ?? ''} type={type} onChange={event => setField(field, event.target.value)} /></Field></label>;
  return <>
    {text('name', 'Campaign name')}
    <div className="audience-rule-field">
      <span className="audience-rule-field__label">Audience</span>
      <p className="audience-rule-summary" aria-label="Audience summary" aria-live="polite">{summarizeAudienceRules(draft.inclusionRuleJson, draft.exclusionRulesJson)}</p>
    </div>
    {text('messageCategory', 'Consent message category')}
    {text('emailSubject', 'Email subject')}
    {text('preheader', 'Email preheader')}
    {text('physicalAddress', 'Physical postal address')}
    <RichEmailEditor busy={busy} value={draft.emailBody} onChange={value => setField('emailBody', value)} designImport={<DesignImport campaignId={campaignId} draft={draft} savedEmailBody={savedEmailBody} mediaOrigin={mediaOrigin} busy={busy} onImport={html => setField('emailBody', html, true)} />} />
    <EmailSizeMeter draft={draft} />
    {modules.sms ? <label>SMS message{smsRequired ? ' (required for approval)' : ''} <small>{draft.smsBody.length} characters</small><Field name="smsBody" label="SMS message" required={smsRequired} advisory><textarea aria-label="SMS message" value={draft.smsBody} onChange={event => setField('smsBody', event.target.value)} rows={4} /></Field></label> : null}
    <div className="form-two-up">{text('senderName', 'Sender name')}{text('fromEmail', 'From email', 'email')}{text('replyToEmail', 'Reply-to email', 'email')}{modules.sms ? text('smsSender', 'SMS sender', 'text', smsRequired) : null}</div>
  </>;
}
