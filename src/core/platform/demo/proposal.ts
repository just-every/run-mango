import type { AiGenerationResult, AppConfig, GroundedGenerationRequest } from '@/core/shared/platform';

/** A provider success grounded in the same supplied observations as a real generation. */
export function demoProposal(request: GroundedGenerationRequest, config: AppConfig): AiGenerationResult {
  const evidence = request.evidence as { items: Array<{ key: string; allowedClaim: string; observedValueJson: string }>; now: string; sendByAt: string };
  const first = evidence.items[0];
  const claim = { text: first.allowedClaim, citations: [{ key: first.key, observedValueJson: first.observedValueJson }] };
  const start = Date.parse(evidence.now), end = Date.parse(evidence.sendByAt);
  return { provider: 'openai', model: 'demo', billableUnits: 0, output: {
    summary: claim,
    audience: { inclusion: { version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'emailStatus', comparator: 'eq', value: 'subscribed', lookbackDays: null }] }, exclusions: [], explanation: claim },
    email: { subject: 'A note from Mango Sample Store', html: '<h1>A note from our store</h1><p>Hello {{displayName|fallback:friend}},</p><p>Explore our latest collection and the stories behind it.</p>', text: 'Explore our latest collection and the stories behind it.', preheader: 'News and stories from our store.' },
    sms: null, sender: { ...config.mailSender, smsSender: 'MangoSample' }, messageCategory: 'Store newsletter', links: [{ label: 'Explore the collection', destinationUrl: 'https://example.com/' }],
    steps: [{ channel: 'email', scheduledAt: new Date(start + (end - start) / 2).toISOString(), sendByAt: evidence.sendByAt, timezone: 'Australia/Brisbane', whyThisTime: claim }], forecast: null,
  } };
}
