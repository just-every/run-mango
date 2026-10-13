import type { Context } from 'hono';
import { renderMessagePage, type MessagePage } from '../site/message-page';

/** Answers with a reader-facing message page (consent confirmation, unsubscribe) and the headers it carries. */
export async function messagePage(context: Context, status: 200 | 404 | 410 | 429, page: MessagePage) {
  const { html, headers } = await renderMessagePage(page);
  return context.html(html, status, headers);
}

/** A link from mail that is malformed, unknown or expired: a plain note, no drawing, with the genuine 404 status. */
export const invalidLink = (context: Context) => messagePage(context, 404, {
  title: 'Link not valid', heading: 'This link is not valid', text: 'It may be incomplete, or it may have expired.',
});

/** A link opened past its allowance (MSG-010): a plain note with the 429 status. */
export const tooManyRequests = (context: Context) => messagePage(context, 429, {
  title: 'Too many requests', heading: 'Too many requests for this link', text: 'Wait a minute, then try again.',
});
