import { createOpenAiAdapter } from '../../src/core/platform/adapters/openai';
import type { AppConfig } from '../../src/core/shared/platform';
import type { GeneratedProposalWire } from '../../src/core/features/proposals/generation';

/** Only the HTTP edge is synthetic; native generation uses the production adapter. */
export function costAiEdge(db: D1Database, sender: AppConfig['mailSender']) {
  const adapter = createOpenAiAdapter({ apiKey: 'synthetic-mango-50', model: 'cost-requested' });
  return { ...adapter, async generateGroundedJson(input: Parameters<typeof adapter.generateGroundedJson>[0]) {
    const control = await db.prepare('SELECT mode FROM cost_test_control').first<{ mode: string }>();
    const mode = control!.mode, originalFetch = globalThis.fetch;
    globalThis.fetch = async (resource, init) => {
      if (String(resource) !== 'https://api.openai.com/v1/responses') return originalFetch(resource, init);
      if (init?.method !== 'POST') throw new Error('Expected a generation POST');
      const request = JSON.parse(String(init.body));
      const model = mode === 'failed' ? null : `cost-${mode}`;
      await db.prepare('INSERT INTO cost_test_ai_calls (mode,provider,requested_model,response_model) VALUES (?,?,?,?)')
        .bind(mode, 'openai', request.model, model).run();
      if (mode === 'failed') throw new TypeError('Synthetic provider connection interrupted');
      let output = 'not JSON';
      if (mode === 'success') {
        const evidence = JSON.parse(request.input) as {
          items: Array<{ key: string; observedValueJson: string; allowedClaim: string }>; now: string;
        };
        const item = evidence.items[0], at = Date.parse(evidence.now);
        const claim = { text: item.allowedClaim, citations: [{ key: item.key, observedValueJson: item.observedValueJson }] };
        const proposal: GeneratedProposalWire = {
          summary: claim,
          audience: { inclusion: { version: 1, operator: 'all', predicates: [
            { sourceType: 'contact', field: 'email', comparator: 'contains', value: 'costs', lookbackDays: null },
          ] }, exclusions: [], explanation: claim },
          email: { subject: 'Garden news', html: '<p>Garden news.</p>', text: 'Garden news.', preheader: 'From the garden' },
          sms: null, sender: { ...sender, smsSender: 'MANGO' }, messageCategory: 'newsletter', links: [],
          steps: [{ channel: 'email', scheduledAt: new Date(at + 3_600_000).toISOString(),
            sendByAt: new Date(at + 7_200_000).toISOString(), timezone: 'UTC', whyThisTime: claim }], forecast: null,
        };
        output = JSON.stringify(proposal);
      }
      return Response.json({ model, output_text: output, ...(mode === 'unknown' ? {} : {
        usage: { input_tokens: 11, output_tokens: mode === 'success' ? 12 : 6 },
      }) });
    };
    try { return await adapter.generateGroundedJson(input); }
    finally { globalThis.fetch = originalFetch; }
  } };
}
