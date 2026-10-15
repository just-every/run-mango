import { Hono } from 'hono';
import { invalidLink, messagePage } from '@/core/features/audience/message-response';
import { senderReasonText } from '@/core/features/sender-verification/reason-text';
import { VerificationError } from '@/core/features/sender-verification/types';
import type { Platform } from '@/core/shared/platform';

/** The page an operator reaches from the inbox check Settings sends. GET only shows it;
 * the Confirm button's POST records the confirmation, so link scanners cannot confirm. */
export function createSenderCheckRoutes(platform: Pick<Platform, 'senderVerification'>) {
  const routes = new Hono();
  routes.use('/sender-check/*', async (context, next) => {
    context.header('Cache-Control', 'no-store'); context.header('Referrer-Policy', 'no-referrer'); await next();
  });
  const read = (context: { req: { param(name: string): string | undefined; query(name: string): string | undefined } }) =>
    ({ id: context.req.param('id') ?? '', key: context.req.query('key') ?? '' });
  routes.get('/sender-check/:id', async (context) => {
    const verification = platform.senderVerification;
    if (!verification) return invalidLink(context);
    const { id, key } = read(context);
    try {
      const preview = await verification.previewOwnerConfirmation(id, key);
      if (preview.kind === 'confirmed') return messagePage(context, 200, { title: 'Sender confirmed', heading: 'Sender already confirmed', mark: 'posted',
        text: `${preview.from} is confirmed. You can approve campaigns in Mango.`, links: [{ href: '/app/settings', label: 'Open Settings' }] });
      if (preview.kind === 'expired') return messagePage(context, 410, { title: 'Check expired', heading: 'This check has expired',
        text: 'Send a new check from Settings in Mango.', links: [{ href: '/app/settings', label: 'Open Settings' }] });
      return messagePage(context, 200, { title: 'Confirm your sender', heading: 'Did this email reach your inbox?', mark: 'stamp',
        text: `Confirm only if the check from ${preview.from} arrived in your inbox, not in spam or junk. Confirming lets you approve campaigns from this sender.`,
        form: { action: `/sender-check/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`, button: 'Yes, it reached my inbox' } });
    } catch { return invalidLink(context); }
  });
  routes.post('/sender-check/:id', async (context) => {
    const verification = platform.senderVerification;
    if (!verification) return invalidLink(context);
    const { id, key } = read(context);
    const body = await context.req.parseBody().catch(() => undefined);
    if (body?.confirm !== 'true') return invalidLink(context);
    try {
      await verification.confirmOwnerReceipt(id, key);
      return messagePage(context, 200, { title: 'Sender confirmed', heading: 'Sender confirmed', mark: 'posted',
        text: 'Thank you. Mango can now approve campaigns from this sender while its domain records stay as they are.',
        links: [{ href: '/app/settings', label: 'Open Settings' }] });
    } catch (error) {
      if (error instanceof VerificationError && error.reason === 'challenge-missing') return invalidLink(context);
      const reason = error instanceof VerificationError ? error.reason : 'verification-unavailable';
      return messagePage(context, 410, { title: 'Not confirmed', heading: 'Sender not confirmed', text: senderReasonText(reason),
        links: [{ href: '/app/settings', label: 'Open Settings' }] });
    }
  });
  return routes;
}
