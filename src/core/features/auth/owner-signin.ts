// @ts-expect-error Base operator-auth internals are portable ESM without declarations.
import { configure } from '@/vendor/base/operator-auth/config.mjs';
// @ts-expect-error Base operator-auth internals are portable ESM without declarations.
import { AuthStore } from '@/vendor/base/operator-auth/accounts/store.mjs';
// @ts-expect-error Base operator-auth internals are portable ESM without declarations.
import { oaSessions } from '@/vendor/base/operator-auth/accounts/oa.mjs';
// @ts-expect-error Base operator-auth internals are portable ESM without declarations.
import { requireOrigin, requirePost } from '@/vendor/base/operator-auth/http.mjs';
// @ts-expect-error Base operator-auth internals are portable ESM without declarations.
import { validToken } from '@/vendor/base/operator-auth/crypto.mjs';
import { renderMessagePage } from '@/core/features/site/message-page';

/** rer's `rer signin` grant (operator-auth owner-signin-grant.mjs in @runeditrun/rer): the CLI
 * writes only this digest into oa_owner_signins with the deployment's Cloudflare credentials. */
const lifetimeMs = 900_000;
async function grantDigest(token: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`owner-signin\0${token}`));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
const live = `g.token_hash=? AND g.consumed_at IS NULL AND g.expires_at>? AND g.expires_at<=? AND g.operator_version=o.version
  AND o.role='owner' AND o.status='active'`;

async function page(status: number, content: Parameters<typeof renderMessagePage>[0], cookie?: string) {
  const { html, headers } = await renderMessagePage(content);
  return new Response(html, { status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer', ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
}
const invalid = () => page(404, { title: 'Link not valid', heading: 'This sign-in link is not valid',
  text: 'It may have been used already or expired. Run rer signin again for a new link.', links: [{ href: '/signin', label: 'Sign in by email' }] });

/**
 * The owner's way in without mail. GET shows a Confirm page and writes nothing (link
 * scanners cannot spend it); the POST consumes the grant once, only for the active owner
 * it names at that owner's version, within 15 minutes, and opens a native session. The
 * consumed grant row is the record of its use.
 */
export async function ownerSignin(request: Request, db: D1Database, input: Record<string, unknown>) {
  const config = configure(input), url = new URL(request.url), token = url.searchParams.get('token') ?? '';
  try { if (request.method === 'POST') requirePost(request, config); else requireOrigin(request, config); }
  catch { return invalid(); }
  if (!validToken(token)) return invalid();
  const digest = await grantDigest(token), now = Date.now();
  if (request.method !== 'POST') {
    const grant = await db.prepare(`SELECT o.email FROM oa_owner_signins g JOIN oa_operators o ON o.id=g.operator_id WHERE ${live}`)
      .bind(digest, now, now + lifetimeMs).first<{ email: string }>();
    if (!grant) return invalid();
    return page(200, { title: 'Owner sign-in', heading: 'Sign in as the owner', mark: 'stamp',
      text: `This one-time link from rer signin signs in ${grant.email}.`, form: { action: `/auth/owner-signin?token=${token}`, button: 'Sign in' } });
  }
  const sessions = oaSessions({ config, store: new AuthStore(db), clock: Date.now });
  const session = await sessions.newSession();
  await db.batch([
    db.prepare(`INSERT INTO oa_sessions(id,token_hash,operator_id,operator_version,kind,created_at,expires_at)
      SELECT ?,?,o.id,o.version,'native',?,? FROM oa_owner_signins g JOIN oa_operators o ON o.id=g.operator_id WHERE ${live}`)
      .bind(session.id, session.hash, now, session.expiresAt, digest, now, now + lifetimeMs),
    db.prepare('UPDATE oa_owner_signins SET consumed_at=? WHERE token_hash=? AND consumed_at IS NULL AND EXISTS(SELECT 1 FROM oa_sessions WHERE id=?)')
      .bind(now, digest, session.id),
  ]);
  const record = await new AuthStore(db).session(session.hash, now);
  if (!record) return invalid();
  const { cookie } = sessions.completed(session, record, '/app');
  return new Response(null, { status: 303, headers: { Location: '/app', 'Set-Cookie': cookie, 'Cache-Control': 'no-store' } });
}
