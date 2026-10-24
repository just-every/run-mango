import type { Revision, RevisionLink, Step } from '@/core/app/client/lib/types';

export type DraftLink = Pick<RevisionLink, 'label' | 'destinationUrl'>;
export type DraftStep = Pick<Step, 'channel' | 'timezone' | 'scheduledAt' | 'sendByAt' | 'whyThisTime'> & {localScheduledAt?:string; localSendByAt?:string};
export type DraftComposition = Pick<
  Revision,
  | 'inclusionRuleJson'
  | 'exclusionRulesJson'
  | 'messageCategory'
  | 'name'
  | 'emailSubject'
  | 'emailBody'
  | 'emailText'
  | 'preheader'
  | 'physicalAddress'
  | 'smsBody'
  | 'senderName'
  | 'fromEmail'
  | 'replyToEmail'
  | 'smsSender'
> & {
  designTemplateKey?: string;
  trackingEnabled: boolean;
  links: DraftLink[];
  steps: DraftStep[];
};

export type DraftScalarField = Exclude<keyof DraftComposition, 'links' | 'steps' | 'trackingEnabled' | 'designTemplateKey'>;

export function toDraftComposition(
  revision: Revision,
  links: RevisionLink[],
  steps: Step[],
): DraftComposition {
  return {
    inclusionRuleJson:revision.inclusionRuleJson,
    exclusionRulesJson:revision.exclusionRulesJson,
    messageCategory:revision.messageCategory,
    name: revision.name,
    trackingEnabled: revision.trackingEnabled ?? false,
    emailSubject: revision.emailSubject,
    emailBody: revision.emailBody,
    emailText: revision.emailText,
    preheader: revision.preheader ?? '',
    physicalAddress: revision.physicalAddress ?? '',
    smsBody: revision.smsBody,
    senderName: revision.senderName,
    fromEmail: revision.fromEmail,
    replyToEmail: revision.replyToEmail,
    smsSender: revision.smsSender,
    links: links.map(({ label, destinationUrl }) => ({ label, destinationUrl })),
    steps: steps.length ? steps.map(({ channel, timezone, scheduledAt, sendByAt, whyThisTime }) => ({
      channel,
      timezone,
      scheduledAt,
      sendByAt,
      whyThisTime,
    })) : (revision.stepSettings ?? []).map(step=>({...step,scheduledAt:'',sendByAt:''})),
  };
}
