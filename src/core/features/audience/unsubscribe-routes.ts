import type { Context, Hono } from 'hono';
import { z } from 'zod';

import { readParams } from '@/core/api/input';

import { invalidLink, messagePage, tooManyRequests } from './message-response';
import type { createAudienceService } from './service';
import { confirmationUnsubscribePath } from './unsubscribe-paths';

const tokenParams = z.object({ token: z.string().min(16) });
const confirmation = z.object({ confirm: z.union([z.literal(true), z.literal('true')]) });

function confirmationPage(token: string) {
  return {
    title: 'Confirm unsubscribe', heading: 'Confirm unsubscribe', text: "This action stops future marketing messages for this link's channel.",
    form: { action: confirmationUnsubscribePath(token), button: 'Unsubscribe' },
  };
}

/** The answer once CONT-004 has been applied: a plain, respectful note with no drawing. */
const unsubscribedPage = {
  title: 'Unsubscribed', heading: 'You are unsubscribed', text: "Future marketing messages for this link's channel have stopped.",
};

/**
 * Reads form fields from JSON, multipart/form-data (RFC 8058 §3.2 SHOULD) or urlencoded text
 * (MAY; also how a body with any other or no media type is read). Undefined when unparsable.
 */
async function readForm(context: Context): Promise<Record<string, unknown> | undefined> {
  const mediaType = (context.req.header('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  try {
    if (mediaType === 'application/json') return await context.req.json();
    if (mediaType === 'multipart/form-data') return await context.req.parseBody();
    return Object.fromEntries(new URLSearchParams(await context.req.text()));
  } catch {
    return undefined;
  }
}

/** The fixed RFC 8058 key/value pair `List-Unsubscribe=One-Click`. */
function isOneClick(form: Record<string, unknown> | undefined) {
  const value = form?.['List-Unsubscribe'];
  return typeof value === 'string' && value.trim() === 'One-Click';
}

export function registerUnsubscribeRoutes(routes: Hono, service: ReturnType<typeof createAudienceService>) {
  async function unsubscribe(context: Context, token: string) {
    const result = await service.unsubscribeWithToken(token);
    if (result.kind === 'rate-limited') return tooManyRequests(context);
    if (result.kind === 'invalid') return invalidLink(context);
    return messagePage(context, 200, unsubscribedPage);
  }

  // GET never changes state on either URL, so scanners and prefetchers cannot unsubscribe anyone.
  async function preview(context: Context) {
    const parsed = readParams(context, tokenParams);
    if ('error' in parsed) return invalidLink(context);
    const result = await service.previewUnsubscribeToken(parsed.data.token);
    if (result.kind === 'rate-limited') return tooManyRequests(context);
    if (result.kind !== 'confirmation-required') return invalidLink(context);
    return messagePage(context, 200, confirmationPage(parsed.data.token));
  }

  routes.get('/unsubscribe/:token', preview);
  routes.get('/unsubscribe/one-click/:token', preview);

  // The visible link's confirming action. It also takes the RFC 8058 body because mail
  // prepared before the header moved to the one-click URL advertises this URL.
  routes.post('/unsubscribe/:token', async (context) => {
    const params = readParams(context, tokenParams);
    if ('error' in params) return invalidLink(context);
    const form = await readForm(context);
    if (!confirmation.safeParse(form).success && !isOneClick(form)) return context.json({ error: 'invalid_request' }, 400);
    return unsubscribe(context, params.data.token);
  });

  // The List-Unsubscribe URL: a context-free RFC 8058 POST, answered without redirect.
  routes.post('/unsubscribe/one-click/:token', async (context) => {
    const params = readParams(context, tokenParams);
    if ('error' in params) return invalidLink(context);
    if (!isOneClick(await readForm(context))) return context.json({ error: 'invalid_request' }, 400);
    return unsubscribe(context, params.data.token);
  });
}
