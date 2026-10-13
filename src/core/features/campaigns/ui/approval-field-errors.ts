import { compositionFieldErrors } from './composition-field-errors';
import { authoredBody, htmlToText } from '../authoring-content';
import { type FieldErrors } from '@/core/app/client/ui/field-errors';
import type { DraftComposition } from './draft-composition';
const contentFields = ['emailSubject','preheader','emailBody','senderName','fromEmail','replyToEmail','physicalAddress'] as const;
export function approvalFieldErrors(checks: {kind: string; blocking: boolean; fields?: unknown}[], draft: DraftComposition): FieldErrors {
  const result: FieldErrors = {};
  for (const check of checks.filter(item => item.blocking)) {
    Object.assign(result, compositionFieldErrors(check.fields, undefined, draft));
    if (check.kind === 'message.sms-compliance') {
      result.smsBody = 'Include the sender name and Reply STOP to unsubscribe in the SMS message before approval.';
      if (!draft.smsSender.trim()) result.smsSender = 'Add the SMS sender before approval.';
    }
    if (check.kind === 'message.sms-sender') result.smsSender = 'Use a registered SMS sender for every recipient country before approval.';
    if (check.kind === 'campaign.name') result.name = 'Add a campaign name before approval.';
    if (check.kind === 'message.email-identity') for (const field of contentFields) if (!(field === 'emailBody' ? htmlToText(authoredBody(draft.emailBody)) : String(draft[field] ?? '')).trim()) result[field] = 'Complete this field before approval.';
    if (['message.email-configured-identity','message.email-sender','message.email-authentication'].includes(check.kind)) result.fromEmail = 'Save and verify the matching sender identity in Settings, then update this draft.';
    if (check.kind === 'message.email-address') result.physicalAddress = 'Enter your complete physical postal address and save the draft to update its footer.';
  }
  return result;
}
