import { createResendAdapter } from '../../src/core/platform/adapters/resend';
import type { SenderIdentity } from '../../src/core/features/settings/sender-validation';

const apiKey = 'synthetic-fixture-signup-mail-key';
let installed = false;
const expectedSenders = new Map<string, SenderIdentity>();

// Exercise the production confirmation dispatcher and Resend serializer. Only
// the external provider's HTTP response is substituted, after checking the
// actual confirmation envelope. Other provider requests fail closed.
export function signupFixtureMailer(currentSender: () => SenderIdentity) {
  if (!installed) {
    installed = true;
    const transport = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin !== 'https://api.resend.com') return transport(input, init);
      const request = new Request(input, init);
      if (url.pathname !== '/emails' || request.method !== 'POST'
        || request.headers.get('authorization') !== `Bearer ${apiKey}`
        || !request.headers.get('idempotency-key')?.startsWith('consent-confirmation:')) {
        throw new Error('Unexpected signup mail provider request.');
      }
      const sender = expectedSenders.get(request.headers.get('idempotency-key')!);
      if (!sender) throw new Error('Signup mail has no authorized fixture handoff.');
      const body = await request.json() as Record<string, unknown>;
      if (!Array.isArray(body.to) || body.to.length !== 1 || typeof body.to[0] !== 'string' || !body.to[0].endsWith('@example.test')
        || body.from !== `${sender.displayName} <${sender.fromEmail}>`
        || body.reply_to !== sender.replyToEmail || body.subject !== `Confirm your ${sender.displayName} subscription`
        || typeof body.text !== 'string' || !body.text.endsWith(`\n\n${sender.displayName}\n${sender.physicalAddress}`)
        || typeof body.html !== 'string') {
        throw new Error('Signup confirmation envelope is incomplete.');
      }
      const link = body.text.match(/https?:\/\/\S+/)?.[0];
      const confirmation = link && new URL(link);
      if (!confirmation || confirmation.hostname !== '127.0.0.1' || !/^\/consent\/confirm\/[^/]+$/.test(confirmation.pathname)
        || !body.html.includes(`href="${link}"`)) {
        throw new Error('Signup confirmation mail must contain its real public token link.');
      }
      return Response.json({ id: crypto.randomUUID() });
    };
  }
  const adapter = createResendAdapter({ apiKey, webhookSecret: 'synthetic-fixture-webhook-secret', webhookId: 'fixture-webhook' });
  return {
    ...adapter,
    async send(request: Parameters<typeof adapter.send>[0]) {
      // Saved sender settings are loaded by the real dispatcher before send.
      // Scope expectations to this handoff so concurrent requests cannot borrow
      // another request's sender identity. Never retain a mail body or token.
      expectedSenders.set(request.idempotencyKey, { ...currentSender() });
      try { return await adapter.send(request); }
      finally { expectedSenders.delete(request.idempotencyKey); }
    },
  };
}
