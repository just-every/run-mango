import { hasPermission, permissionLocation, type ProductRole } from './permissions';

type Row = Record<string, unknown>;
const object = (value: unknown): Row => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(object) : [];
const id = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_:-]{1,200}$/.test(value) ? value : '';
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const time = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(typeof value === 'number' || typeof value === 'string' ? value : NaN);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};
const label = (value: unknown, allowed: readonly string[], other = 'restricted') => typeof value === 'string' && allowed.includes(value) ? value : other;
const channel = (value: unknown) => label(value, ['email', 'sms']);
const statuses = ['subscribed', 'pending', 'non-subscribed', 'unsubscribed', 'suppressed'];
const state = (value: unknown) => label(value, statuses);
const masked = (value: unknown) => typeof value === 'string' && value.length > 0 ? '••••' : null;

/** Identity labels are user-supplied too; never use them as an alternate address channel. */
function displayName(value: unknown) {
  if (typeof value !== 'string' || /[@\d:/?#=]/.test(value)) return 'Contact';
  return value.slice(0, 160);
}

function contact(value: unknown) {
  const row = object(value);
  return {id: id(row.id), displayName: displayName(row.displayName), email: masked(row.email),
    emailStatus: state(row.emailStatus), smsStatus: state(row.smsStatus),
    lastActivityAt: time(row.lastActivityAt), createdAt: time(row.createdAt), updatedAt: time(row.updatedAt)};
}

const eventKinds = ['consent-captured', 'consent-confirmed', 'channel-suppressed', 'suppression',
  'contact-merged', 'campaign-eligible', 'campaign-skipped', 'message-handed-off', 'message-failed',
  'message-delivered', 'message-bounced', 'message-complained', 'message-clicked', 'automated-link-request',
  'operator-action', 'unsubscribe', 'unsubscribed', 'subscribed', 'form-submitted', 'order-placed'];
function event(row: Row) {
  const kind = label(row.kind, eventKinds, 'recorded-activity');
  // History detail/source can contain imported addresses, URLs or provider payloads.
  return {id: id(row.id), kind, detail: kind.replaceAll('-', ' '), source: 'Contact history',
    occurredAt: time(row.occurredAt), ...(id(row.campaignId) ? {campaignId: id(row.campaignId)} : {})};
}

/** Explicit public shape: new source fields stay private until deliberately added here. */
export function maskContactResponse(value: unknown): Row {
  const body = object(value);
  if (Array.isArray(body.contacts)) return {contacts: body.contacts.map(contact)};
  return {
    contact: contact(body.contact),
    emails: rows(body.emails).map(row => ({id: id(row.id), email: masked(row.email), channelStatus: state(row.channelStatus)})),
    phones: rows(body.phones).map(row => ({id: id(row.id), phoneE164: masked(row.phoneE164), channelStatus: state(row.channelStatus)})),
    consent: rows(body.consent).map(row => ({id: id(row.id), channel: channel(row.channel), destination: masked(row.destination),
      brandOrLegalSender: 'Restricted', messageCategory: 'Restricted', frequencyDisclosure: 'Restricted',
      destinationJurisdiction: 'Restricted', captureMethod: 'Restricted', captureSource: 'Restricted',
      consentText: 'Restricted', consentVersion: 'Restricted', smsProgram: null,
      occurredAt: time(row.occurredAt), confirmedAt: time(row.confirmedAt), confirmationRequired: row.confirmationRequired === true,
      captureIp: null, confirmationIp: null})),
    timeline: rows(body.timeline).map(event), history: rows(body.history).map(event),
    suppressions: rows(body.suppressions).map(row => ({id: id(row.id), channel: channel(row.channel), cause: 'Restricted', occurredAt: time(row.occurredAt)})),
    campaignHistory: rows(body.campaignHistory).map(row => ({id: id(row.id), campaignId: id(row.campaignId),
      channel: channel(row.channel), name: 'Campaign', disposition: disposition(row.disposition), createdAt: time(row.createdAt)})),
    // These raw provenance and provider records are outside the restricted view.
    importObservations: [], sourceActivity: [], smsServices: [], masked: true,
  };
}

const dispositions = ['pending', 'queued', 'accepted', 'delivered', 'bounced', 'failed', 'skipped', 'suppressed',
  'handoff-unknown', 'handed-off', 'cancelled', 'sent', 'complained', 'unsubscribed'];
const disposition = (value: unknown) => label(value, dispositions);

/** Neither report filters nor nested rows may echo destination URLs, tokens or raw reasons. */
export function maskCampaignReportResponse(value: unknown): Row {
  const body = object(value);
  return {
    campaignId: id(body.campaignId), revisionId: id(body.revisionId), total: count(body.total),
    offset: count(body.offset), limit: count(body.limit),
    ...(body.grouping === 'destination' ? {grouping: 'destination', destinationUrl: 'Restricted'} : {}),
    rows: rows(body.rows).map(row => ({
      recipientStepId: id(row.recipientStepId), stepId: id(row.stepId), contactId: id(row.contactId) || null,
      displayName: displayName(row.displayName), email: masked(row.email), destination: masked(row.destination),
      channel: channel(row.channel), disposition: disposition(row.disposition),
      bounceType: row.bounceType===null||row.bounceType===undefined?null:label(row.bounceType, ['hard', 'soft'], 'restricted'), reason: row.reason ? 'Restricted' : null,
      clicks: count(row.clicks), firstClickedAt: time(row.firstClickedAt), lastClickedAt: time(row.lastClickedAt),
      complainedAt: time(row.complainedAt), suppressedAt: time(row.suppressedAt), unsubscribedAt: time(row.unsubscribedAt),
    })),
    buckets: rows(body.buckets).map(row => ({stepId: id(row.stepId), disposition: disposition(row.disposition), reason: row.reason ? 'Restricted' : null, count: count(row.count)})),
    overlappingFacts: rows(body.overlappingFacts).map(row => ({stepId: id(row.stepId), complained: count(row.complained), suppressed: count(row.suppressed), unsubscribed: count(row.unsubscribed)})),
    masked: true,
  };
}

/** Apply to successful JSON reads, after authorization and before serialization/SSR snapshots.
 * CSV is refused by requiredPermission; it must never bypass this JSON projection.
 */
export function projectPrivateResponse(role: ProductRole, path: string, value: unknown): unknown {
  if (hasPermission(role, 'contact.unmasked')) return value;
  const pathname = permissionLocation(path)?.pathname.replace(/\/+$/, '');
  if (pathname === '/api/audience' || pathname === '/api/contacts/search' || /^\/api\/contacts\/[^/]+$/.test(pathname ?? '')) return maskContactResponse(value);
  if (/^\/api\/campaigns\/[^/]+\/(?:recipients|clickers)$/.test(pathname ?? '')) return maskCampaignReportResponse(value);
  if(pathname==='/api/campaigns') {
    const body=object(value);
    return {...body,campaigns:rows(body.campaigns).map(row=>({...row,audienceSummary:'Restricted audience rule'})),masked:true};
  }
  if (/^\/api\/campaigns\/[^/]+(?:\/(?:review|scheduled))?$/.test(pathname ?? '')) {
    const body = object(value);
    // Campaign content is readable by these roles, but handoff recovery includes
    // individual recipient destinations and provider receipts outside that grant.
    return {...body,revision:{...object(body.revision),audienceRule:'Restricted audience rule',audienceMasked:true,inclusionRuleJson:'',exclusionRulesJson:''},masked:true, uncertainDeliveries: rows(body.uncertainDeliveries).map(row => ({
      id: id(row.id), destination: masked(row.destination), providerMessageId: null, detail: 'Restricted',
    }))};
  }
  return value;
}
