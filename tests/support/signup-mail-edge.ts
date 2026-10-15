import { createResendAdapter } from '../../src/core/platform/adapters/resend';

const apiKey = 'fixture-signup-mail-key';
let installed = false;

// Exercise the production confirmation dispatcher and Resend serializer. Only
// the external provider's HTTP response is substituted, after checking the
// actual confirmation envelope. Other provider requests fail closed.
export function signupFixtureMailer() {
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
      const body = await request.json() as Record<string, unknown>;
      if (!Array.isArray(body.to) || body.to.length !== 1 || typeof body.to[0] !== 'string' || !body.to[0].endsWith('@example.test')
        || typeof body.from !== 'string' || !body.from.endsWith('<newsletter@example.test>')
        || body.reply_to !== 'reply@example.test' || typeof body.subject !== 'string' || !body.subject
        || typeof body.text !== 'string' || typeof body.html !== 'string') {
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
  return createResendAdapter({ apiKey, webhookSecret: 'fixture-webhook-secret', webhookId: 'fixture-webhook' });
}
