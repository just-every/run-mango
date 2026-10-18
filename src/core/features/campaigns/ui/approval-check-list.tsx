import {useDateFormatter} from '@/core/app/client/lib/use-date-formatter';
import { Disclosure } from '@/core/app/client/ui/disclosure';
import { plainServiceText } from '@/core/app/client/ui/product-copy';
import { useId, useState } from 'react';
import { titleCase } from '@/core/app/client/lib/format';
import type { ApprovalBlocker, Check } from '@/core/app/client/lib/types';

type ApprovalFinding = Check | ApprovalBlocker;

function findingKey(finding: ApprovalFinding, index: number) {
  return 'id' in finding ? finding.id : `${finding.kind}-${index}`;
}

function findingLabel(finding: ApprovalFinding) {
  return finding.blocking ? 'Blocking' : titleCase(finding.status);
}

function readableKind(kind:string) {
  if(kind==='message.email-consent-scope')return 'Match email consent category and sender';
  if(kind.startsWith('mail.sender'))return 'Email delivery connection';
  if(kind.startsWith('sms.sender'))return 'SMS delivery connection';
  const labels:Record<string,string>={'campaign.name':'Campaign name','message.email-subject-length':'Email subject length','message.email-identity':'Complete the email','message.email-sender':'Verify your sender','message.email-configured-identity':'Use your configured sender identity','message.email-authentication':'Verify email authentication','message.email-unsubscribe':'Unsubscribe link','message.email-address':'Postal address','message.multipart-equivalence':'Match message links','message.links':'Allowed destinations','message.links.resolved':'Check destination links','message.content':'Email formatting','message.personalisation':'Personalisation fallback text','schedule.steps':'Choose a send time and deadline','schedule.timezone':'Choose a valid time zone','audience.structured-rule':'Audience conditions','audience.resolution':'Audience data','audience.eligible':'Eligible contacts','audience.recheck':'Current eligibility','commerce.store.v1':'Store connection'};
  return labels[kind] ?? (kind.startsWith('ai.') ? 'AI writing' : kind.startsWith('audience.') ? 'Audience eligibility' : kind.startsWith('schedule.') ? 'Send schedule' : 'Campaign readiness');
}
function readableDetail(detail:string) {
  const labels:Record<string,string>={'authentication-unobserved':'Verify this sender in Settings before approval.','verification-not-configured':'Configure sender verification in Settings before approval.','provider-domain-unverified':'Verify the sending domain with your email provider.'};
  return plainServiceText(labels[detail]??detail);
}

export function approvalFindingDescription(finding: ApprovalFinding) {
  return `${readableKind(finding.kind)}: ${readableDetail(finding.detail)}`;
}

export function ApprovalCheckList({
  checks,
  onAcknowledge,
  acknowledgementDisabled = false,
  title = 'What needs attention',
  eyebrow = 'Approval checks',
  emptyMessage = 'No approval checks are stored for this revision.',
}: {
  checks?: ApprovalFinding[];
  onAcknowledge?: (check: Check) => void;
  acknowledgementDisabled?: boolean;
  title?: string;
  eyebrow?: string;
  emptyMessage?: string;
}) {
  const dateTime=useDateFormatter({locale:undefined,options:{year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'}});
  const titleId = useId();
  const [expanded, setExpanded] = useState(true);
  const findings = checks ?? [];
  const attention = findings.filter(check => check.blocking || check.status !== 'passed');
  const passed = findings.filter(check => !check.blocking && check.status === 'passed');
  const renderFindings = (items: ApprovalFinding[]) => items.map((check, index) => (
    <p key={findingKey(check, index)} className={`check-list__item check-list__item--${check.status}`}>
      <strong>{readableKind(check.kind)}</strong>
      <span><b aria-label={`Status: ${findingLabel(check)}`}>{findingLabel(check)}</b>{readableDetail(check.detail)}{check.blocking ? <small className="check-next-step">Next step: {check.kind === 'message.email-consent-scope' ? 'Review the recorded consent on the audience’s contact pages, then save the corrected draft and check again.' : check.kind === 'mail.sender.v1.configured' ? 'Deploy Mango with a mail provider to send. Drafts, previews and imports work here.' : check.kind === 'message.email-sender' ? 'Open Settings and send the inbox check, then press “Yes, it reached my inbox” in that email.' : check.kind.startsWith('mail.') || check.kind.includes('sender') || check.kind.includes('authentication') ? 'Open Settings and complete sender setup, then save this draft and check again.' : check.kind.startsWith('audience.') ? 'Review the audience conditions and contact consent, then save the draft and check again.' : check.kind.startsWith('schedule.') ? 'Choose a valid send time, time zone and later deadline, then save the draft.' : 'Correct the indicated campaign content or connection, then save the draft and check again.'}</small> : null}
        {'id' in check && check.acknowledgement ? <small className="check-next-step">Acknowledged by {check.acknowledgement.operatorId} · <time dateTime={check.acknowledgement.acknowledgedAt}>{dateTime(check.acknowledgement.acknowledgedAt)}</time></small>
          : onAcknowledge && 'id' in check && check.findingIdentity && check.status === 'advisory' && !check.blocking
            ? <button type="button" className="text-link" disabled={acknowledgementDisabled} onClick={() => onAcknowledge(check)}>Acknowledge advisory</button> : null}
      </span>
    </p>
  ));
  return (
    <section className="panel approval-checks" aria-labelledby={titleId}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={titleId}><button type="button" className="disclosure-toggle" aria-expanded={expanded} aria-controls={`${titleId}-checks`} onClick={() => setExpanded(value => !value)}>{title}</button></h2>
      <div id={`${titleId}-checks`} className="check-list" hidden={!expanded}>
        {attention.length ? <p className="muted-copy">Advisories can be acknowledged for this saved revision. Blocking checks must be corrected before approval.</p> : null}
        {renderFindings(attention)}
        {passed.length ? <Disclosure className="passed-checks" title={`${passed.length} checks passed`}>{renderFindings(passed)}</Disclosure> : null}
        {!findings.length ? <p className="muted-copy">{emptyMessage}</p> : null}
      </div>
    </section>
  );
}
