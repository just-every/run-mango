import { expect, test } from '@playwright/test';
import { invalidPersonalisation, renderMessageContent } from '../src/core/features/campaigns/message-content';
import { escapeHtml, inspectEmailHtml } from '../src/core/features/campaigns/email-html-policy';
import { prepareDeliveryRequest, serializeDeliveryRequest } from '../src/core/features/lifecycle/message-renderer';
import type { LifecycleRuntime } from '../src/core/features/lifecycle/types';
import type { CampaignRevisionSnapshot } from '../src/core/features/lifecycle/types';

const inertUnsubscribe = 'https://mango.example.test/unsubscribe/preview-example';
const offer = 'https://shop.example.test/offer';
function revision(overrides: Partial<CampaignRevisionSnapshot['revision']> = {}): CampaignRevisionSnapshot['revision'] {
  return {
    id: 'saved-revision', campaignId: 'campaign', state: 'draft', version: 1,
    name: 'Reviewed offer', audienceRule: 'Saved rule', inclusionRuleJson: '{}', exclusionRulesJson: '[]', sourceTypesJson: '[]',
    emailSubject: 'Hello {{displayName | fallback: "Friend"}}',
    preheader: 'Offer for {{displayName | fallback: "Friend"}}',
    emailBody: `<p>Hello {{displayName | fallback: "Friend"}}</p><p><a href="${offer}">Offer</a></p><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>`,
    emailText: `Hello {{displayName | fallback: "Friend"}}\nOffer: ${offer}\n{{physical_address}}\nUnsubscribe: {{unsubscribe_url}}`,
    smsBody: 'Mango: Hello {{displayName | fallback: "Friend"}}. Reply STOP to unsubscribe.',
    senderName: 'Mango', fromEmail: 'offers@example.test', replyToEmail: 'help@example.test', smsSender: 'Mango',
    physicalAddress: '5 Main & Market <Street>', messageCategory: 'offers', trackingEnabled: false,
    updatedAt: new Date('2026-10-02T00:00:00.000Z'), ...overrides,
  };
}

test('[CAMP-003][MSG-009] pure rendering resolves the saved revision consistently without managed-token leftovers', () => {
  const saved = revision();
  const before = JSON.stringify(saved);
  const options = { values: { displayName: 'Ada' }, unsubscribeUrl: inertUnsubscribe };
  const preview = renderMessageContent(saved, options);
  expect(renderMessageContent(saved, options)).toEqual(preview);
  expect(JSON.stringify(saved)).toBe(before);
  expect(preview.subject).toBe('Hello Ada');
  expect(preview.preheader).toBe('Offer for Ada');
  expect(preview.html).toContain('Hello Ada');
  expect(preview.html).toContain(escapeHtml(saved.physicalAddress));
  expect(preview.text).toContain(saved.physicalAddress);
  expect(preview.html).toContain(inertUnsubscribe);
  expect(preview.text).toContain(inertUnsubscribe);
  expect(preview.sms).toContain('Hello Ada');
  expect(JSON.stringify(preview)).not.toContain('{{');
});

test('[BASE-INPUT-002] contact values and fallback text are escaped in HTML while text remains literal', () => {
  const attack = '<img src=x onerror=alert(1)> & "Ada"';
  const rendered = renderMessageContent(revision(), { values: { displayName: attack }, unsubscribeUrl: inertUnsubscribe });
  expect(rendered.html).toContain(escapeHtml(attack));
  expect(rendered.html).not.toContain(attack);
  expect(rendered.subject).toBe(`Hello ${attack}`);
  expect(rendered.text).toContain(attack);
  const fallback = '<strong>Friend & guest</strong>';
  const fallbackRendered = renderMessageContent(revision({ emailBody: `<p>{{displayName | fallback: '${fallback}'}}</p>` }), { values: {}, unsubscribeUrl: inertUnsubscribe });
  expect(fallbackRendered.html).toContain(escapeHtml(fallback));
  expect(fallbackRendered.html).not.toContain(fallback);
});

test('[MSG-006][MSG-009] rewriting exact destinations does not corrupt a different URL with the same prefix', () => {
  const extended = `${offer}-extended`;
  const tracked = 'https://mango.example.test/l/synthetic-example';
  const saved = revision({
    emailBody: `<a href="${offer}">Offer</a><a href="${extended}">Other offer</a>`,
    emailText: `Offer: ${offer}\nOther offer: ${extended}`,
    smsBody: `${offer} ${extended}`,
  });
  const rendered = renderMessageContent(saved, { unsubscribeUrl: inertUnsubscribe, rewrittenLinks: new Map([[offer, tracked]]) });
  expect(rendered.html).toContain(`href="${tracked}"`);
  expect(rendered.html).toContain(`href="${extended}"`);
  expect(rendered.text).toContain(`Offer: ${tracked}`);
  expect(rendered.text).toContain(`Other offer: ${extended}`);
  expect(rendered.sms).toContain(extended);
  expect(JSON.stringify(rendered)).not.toContain(`${tracked}-extended`);
});

test('[MSG-009] allowed authored email markup and managed unsubscribe href remain admissible', () => {
  const result = inspectEmailHtml(`<p><strong>Offer</strong> <a href="${offer}">Read offer</a></p><p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>`);
  expect(result.issues).toEqual([]);
  expect(result.destinations).toContain(offer);
  expect(result.destinations).not.toContain('{{unsubscribe_url}}');
});

const forbidden: Array<[string, string]> = [
  ['script', '<script>alert(1)</script>'],
  ['form', '<form action="https://shop.example.test/submit"><input name="secret"></form>'],
  ['inline stylesheet', '<style>body{background:url(https://tracker.example.test/pixel)}</style>'],
  ['remote stylesheet', '<link rel="stylesheet" href="https://tracker.example.test/style.css">'],
  ['SVG namespace', '<svg><a href="javascript:alert(1)">Click</a></svg>'],
  ['MathML namespace', '<math><mtext>active markup</mtext></math>'],
  ['event handler', '<p onclick="alert(1)">Offer</p>'],
  ['data URL', '<a href="data:text/html,attack">Offer</a>'],
  ['javascript URL', '<a href="javascript:alert(1)">Offer</a>'],
  ['control-character URL', '<a href="java\tscript:alert(1)">Offer</a>'],
  ['entity-obfuscated URL', '<a href="java&#115;cript:alert(1)">Offer</a>'],
  ['unquoted attribute', `<a href=${offer}>Offer</a>`],
  ['personalisation in URL', '<a href="{{destination | fallback: \'https://shop.example.test/offer\'}}">Offer</a>'],
  ['personalisation in attribute', '<p title="{{displayName | fallback: \'Friend\'}}">Offer</p>'],
  ['image without dimensions', '<img src="https://shop.example.test/offer.png" alt="Offer">'],
  ['tracking pixel', '<img src="https://tracker.example.test/pixel" width="1" height="1" alt="">'],
  ['partly missing dimensions', '<img src="https://shop.example.test/offer.png" width="200" alt="Offer">'],
];
for (const [name, html] of forbidden) {
  test(`[CAMP-004][BASE-INPUT-002] approval rejects ${name}`, () => {
    expect(inspectEmailHtml(html).issues.length).toBeGreaterThan(0);
  });
}

test('[BASE-INPUT-002] personalisation values cannot introduce a second managed-token expansion', () => {
  const rendered = renderMessageContent(revision(), {
    values: { displayName: '{{unsubscribe_url}}' }, unsubscribeUrl: inertUnsubscribe,
  });
  expect(rendered.subject).toBe('Hello {{unsubscribe_url}}');
  expect(rendered.html).toContain('Hello {{unsubscribe_url}}');
  expect(rendered.text).toContain('Hello {{unsubscribe_url}}');
});


const malformedTokens = [
  '{{displayName}}',
  '{{displayName | fallback: "Friend}}',
  "{{displayName | fallback: 'Friend}}",
  '{{displayName | fallback: ""}}',
  '{{displayName | default: }}',
  '{{displayName | fallback: "Friend" extra}}',
  '{{displayName | fallback: "Friend\nGuest"}}',
  '{{displayName | fallback: "Friend"}',
  'displayName | fallback: "Friend"}}',
];
for (const token of malformedTokens) {
  test(`[CAMP-004] malformed token grammar is blocked in subject and preheader: ${JSON.stringify(token)}`, () => {
    const saved = revision({ emailSubject: `Subject ${token}`, preheader: `Preheader ${token}` });
    expect(invalidPersonalisation(saved.emailSubject).length).toBeGreaterThan(0);
    expect(invalidPersonalisation(saved.preheader).length).toBeGreaterThan(0);
    const rendered = renderMessageContent(saved, { values: { displayName: 'Ada' }, unsubscribeUrl: inertUnsubscribe });
    expect(rendered.subject).toBe(saved.emailSubject);
    expect(rendered.preheader).toBe(saved.preheader);
  });
}

test('[CAMP-003][CAMP-004] validator accepts only tokens the shared renderer can resolve', () => {
  for (const token of [
    '{{displayName | fallback: "Friend"}}',
    "{{displayName | default: 'Friend'}}",
    '{{displayName | fallback: Friend}}',
    '{{unsubscribe_url}}', '{{physical_address}}',
  ]) {
    expect(invalidPersonalisation(token)).toEqual([]);
    const rendered = renderMessageContent(revision({ emailSubject: token, preheader: token }), { unsubscribeUrl: inertUnsubscribe });
    expect(rendered.subject).not.toContain('{{');
    expect(rendered.preheader).not.toContain('{{');
  }
});

test('[BASE-INPUT-002] names inherited from Object do not bypass saved fallback text', () => {
  const rendered = renderMessageContent(revision({ emailBody: '<p>{{constructor | fallback: "Friend"}}</p>', emailSubject: '{{toString | fallback: "Friend"}}' }), { values: {}, unsubscribeUrl: inertUnsubscribe });
  expect(rendered.html).toContain('<p>Friend</p>');
  expect(rendered.subject).toBe('Friend');
});


test('[CAMP-003][MSG-009][SEND-001] actual delivery uses pure rendering and persisted retries acquire no new capabilities', async () => {
  const now = new Date('2026-10-02T02:00:00.000Z');
  const saved = revision({trackingEnabled: true});
  const effects = {unsubscribe: 0, tracking: 0, digest: 0};
  const runtime = {
    platform: {
      config: {publicBaseUrl: new URL('https://mango.example.test'), allowedLinkHosts: [new URL(offer).hostname]},
      publicTokens: {
        async issue() { effects.tracking++; return 'synthetic-link-token'; },
        async digest(token: string) { effects.digest++; return `digest:${token}`; },
      },
    },
    audience: {
      async issueMarketingUnsubscribe(input: {contactId: string; channel: string; recipientStepId: string}) {
        effects.unsubscribe++;
        expect(input).toMatchObject({contactId: 'contact-one', channel: 'email', recipientStepId: 'recipient-one'});
        return {token: 'synthetic-unsubscribe-token'};
      },
    },
  } as unknown as LifecycleRuntime;
  const envelope: Parameters<typeof prepareDeliveryRequest>[1] = {
    recipient: {
      id: 'recipient-one', campaignId: 'campaign', revisionId: 'saved-revision', stepId: 'step-one',
      contactId: 'contact-one', contactIdentityKey: 'contact-one', channel: 'email', destination: 'ada@example.test',
      idempotencyKey: 'handoff:recipient-one', transportDisposition: 'queued', attemptCount: 0,
      sendByAt: new Date('2026-10-03T02:00:00.000Z'),
      provider: undefined, providerMessageId: undefined, reconcileUntil: undefined, reconcileCursor: undefined,
      handoffStartedAt: undefined, outboundRequestJson: undefined, leaseToken: undefined,
    },
    timezone: 'Etc/UTC', sourceTypes: [], inclusionRuleJson: '{}', exclusionRulesJson: '[]',
    revision: saved, links: [{label: 'Offer', destinationUrl: offer}],
  };
  const eligibility = {eligible: true as const, contact: {contactId: 'contact-one', destination: 'ada@example.test', personalisation: {displayName: 'Ada & family'}}};
  const result = await prepareDeliveryRequest(runtime, envelope, eligibility, now);
  const unsubscribeUrl = 'https://mango.example.test/unsubscribe/synthetic-unsubscribe-token';
  const expected = renderMessageContent(saved, {values: eligibility.contact.personalisation, unsubscribeUrl,
    rewrittenLinks: new Map([[offer, 'https://mango.example.test/l/synthetic-link-token']])});
  expect(result.request.content).toMatchObject({subject: expected.subject, preheader: expected.preheader, html: expected.html, text: expected.text});
  expect(result.request.content.headers).toMatchObject({'List-Unsubscribe': '<https://mango.example.test/unsubscribe/one-click/synthetic-unsubscribe-token>'});
  expect(result.trackedLinks).toEqual([{tokenDigest: 'digest:synthetic-link-token', destinationUrl: offer, expiresAt: new Date('2026-11-02T02:00:00.000Z')}]);
  expect(effects).toEqual({unsubscribe: 1, tracking: 1, digest: 1});

  envelope.recipient.outboundRequestJson = serializeDeliveryRequest(result.request);
  envelope.revision = {...saved, emailBody: '<script>now forbidden</script>', emailSubject: '{{malformed}}'};
  const inaccessibleRuntime = new Proxy({} as LifecycleRuntime, {get() {throw new Error('Persisted retry must not acquire runtime capabilities');}});
  const replay = await prepareDeliveryRequest(inaccessibleRuntime, envelope, eligibility, new Date('2026-10-03T02:00:00.000Z'));
  expect(replay.request).toEqual(result.request);
  expect(serializeDeliveryRequest(replay.request)).toBe(envelope.recipient.outboundRequestJson);
  expect(replay.trackedLinks).toEqual([]);
  expect(effects).toEqual({unsubscribe: 1, tracking: 1, digest: 1});
});
