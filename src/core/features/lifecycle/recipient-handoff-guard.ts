import {nativeExecutionGuard} from '../agent-door/native-context';
import {savedSenderRevisionGuard} from '@/core/features/settings/sender-persistence';
import {approvalAuthorityGuard} from '@/core/features/sender-verification/approval-authority';
import {providerHoldGuard} from './provider-holds';
import {reputationGuard} from './reputation-guard';

// SQLite parses a flat AND chain as a left-deep tree. The final handoff embeds
// the complete historical approval proof, so balance its surrounding predicates
// to stay within D1's expression-depth limit without moving any read outside
// the atomic UPDATE. Preserve predicate order, including positional bindings.
function all(predicates: string[]): string {
  if (predicates.length === 1) return `(${predicates[0]})`;
  const middle = Math.floor(predicates.length / 2);
  return `(${all(predicates.slice(0, middle))} AND ${all(predicates.slice(middle))})`;
}

export function recipientHandoffGuard(senderGuard: string, provider: string, reputationSince: number) {
  const emailAuthority = all([
    'outbound_request_json = ?',
    senderGuard,
    approvalAuthorityGuard('recipient_steps.campaign_id', 'recipient_steps.revision_id'),
    "json_extract(outbound_request_json, '$.recipientStepId') = id",
    "json_extract(outbound_request_json, '$.idempotencyKey') = idempotency_key",
    "json_extract(outbound_request_json, '$.to') = destination",
    `EXISTS (SELECT 1 FROM campaign_revision_candidates fc
      WHERE fc.revision_id = recipient_steps.revision_id
        AND fc.contact_id = recipient_steps.contact_id
        AND fc.contact_identity_key = recipient_steps.contact_identity_key)`,
    `EXISTS (SELECT 1 FROM campaign_revisions av WHERE av.id = recipient_steps.revision_id
      AND ${savedSenderRevisionGuard('av')}
      AND COALESCE(json_extract(outbound_request_json, '$.content.from.name') || ' <' ||
        json_extract(outbound_request_json, '$.content.from.email') || '>',
        json_extract(outbound_request_json, '$.sender')) = av.sender_name || ' <' || av.from_email || '>')`,
  ]);
  return all([
    nativeExecutionGuard(),
    'id = ?',
    'lease_token = ?',
    "transport_disposition = 'queued'",
    'lease_expires_at > ?',
    'send_by_at > ?',
    `channel <> 'email' OR ${emailAuthority}`,
    'EXISTS(SELECT 1 FROM audience_source_authority WHERE id=1 AND generation=?)',
    `NOT EXISTS(SELECT 1 FROM provider_fact_inbox b WHERE
      ((recipient_steps.channel='email' AND b.provider IN ('resend','sendgrid')) OR (recipient_steps.channel='sms' AND b.provider='mobile-message'))
      AND (json_extract(b.detail_json,'$.destination')=recipient_steps.destination OR json_extract(b.detail_json,'$.destinationHash')=?)
      AND (b.kind IN ('complained','suppressed') OR (b.kind='bounced' AND json_extract(b.detail_json,'$.hard')=1)))`,
    `EXISTS (SELECT 1 FROM contacts ct WHERE ct.id=recipient_steps.contact_id
      AND (CASE WHEN channel='email' THEN ct.email_status ELSE ct.sms_status END)='subscribed')`,
    "NOT EXISTS(SELECT 1 FROM provider_outages o WHERE o.channel=recipient_steps.channel AND o.state='paused')",
    `EXISTS(SELECT 1 FROM campaign_revisions pv WHERE pv.id=recipient_steps.revision_id
      AND ${providerHoldGuard(provider, 'pv', 'recipient_steps.channel')}
      AND (recipient_steps.channel<>'email' OR ${reputationGuard('pv', reputationSince)}))`,
    `EXISTS (SELECT 1 FROM campaigns c WHERE c.id = recipient_steps.campaign_id
      AND c.active_revision_id = recipient_steps.revision_id AND c.state = 'dispatching')`,
  ]);
}
