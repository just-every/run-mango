// @ts-expect-error Base mail is portable ESM; its transport interface is checked at runtime.
import { createMailSender } from '@/vendor/base/mail/index.mjs';
import { createD1DevelopmentOutbox } from '@/vendor/base/mail/src/development/index.mjs';
import type { InferSelectModel } from 'drizzle-orm';
import { createOperatorAuth, createAuthHandler, AuthError, securityHeaders, type Operator } from '@/vendor/base/operator-auth/index.mjs';
// @ts-expect-error Base's shared wire parser is portable ESM without declarations.
import { readInput, readParameters } from '@/vendor/base/operator-auth/input.mjs';
import { createBaseMailSender } from '@/core/platform/adapters/base-mail';
import { renderMessagePage } from '@/core/features/site/message-page';
import type { Platform } from '@/core/shared/platform';
import type { createAuthRepository } from './repository';
import type { operators } from './schema';
import { completeLocalSetup } from './setup-complete';

export type AuthenticatedOperator = InferSelectModel<typeof operators>;

async function requestNativeMagicLink(auth: ReturnType<typeof createOperatorAuth>, request: Request) {
  try {
    // Mango returns a message document instead of Base's form-notice redirect.
    // Keep Base's query/body validation and pass the original request to its
    // operation so origin, cookies, return paths and rate limits stay intact.
    const query = readParameters(new URL(request.url).searchParams);
    if (Object.hasOwn(query, 'token')) throw new AuthError('invalid_input');
    const result = await auth.requestMagicLink(request, await readInput(request));
    return Response.json(result, { status: 202, headers: securityHeaders() });
  } catch (error) {
    return Response.json({ error: error instanceof AuthError ? error.code : 'auth_unavailable' }, {
      status: error instanceof AuthError ? error.status : 503, headers: securityHeaders(),
    });
  }
}

/** Product projection and policy only. Base owns credentials, sessions, limits and transactions. */
export function createAuthService(repository: ReturnType<typeof createAuthRepository>, platform: Pick<Platform, 'config' | 'mailer'>) {
  const { config } = platform;
  const local = config.local === true;
  const db = repository.database.$client;
  async function project(operator: Operator) {
    const now = new Date();
    await db.prepare(`INSERT INTO operators(id,email,display_name,is_initial,invited_at,removed_at,created_at,updated_at)
      SELECT id,email,display_name,?,created_at,CASE WHEN status='inactive' THEN ? ELSE NULL END,created_at,?
      FROM oa_operators WHERE id=?
      ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,
      removed_at=CASE WHEN excluded.removed_at IS NULL THEN NULL ELSE COALESCE(operators.removed_at,excluded.removed_at) END,updated_at=excluded.updated_at
      WHERE operators.display_name IS NOT excluded.display_name
        OR (operators.removed_at IS NULL) IS NOT (excluded.removed_at IS NULL)`)
      .bind(config.initialOperatorEmails.includes(operator.email) ? 1 : 0, now.getTime(), now.getTime(), operator.id).run();
    return (await repository.getOperator(operator.id))!;
  }
  function normalize(request: Request, includeBody = false) {
    if (!local) return request;
    const headers = new Headers(request.headers), url = new URL(request.url);
    if (!headers.has('Host')) headers.set('Host', url.host);
    // Mango's operator routes have already parsed their body. Session and
    // policy checks need request metadata; only Base's wire handler reads it.
    return includeBody ? new Request(request.clone() as Request, { headers })
      : new Request(request.url, { method: request.method, headers });
  }
  function core(request: Request) {
    return createOperatorAuth({ db, config: {
      origin: local ? new URL(request.url).origin : config.publicBaseUrl.origin,
      OWNER_EMAIL: config.initialOperatorEmails[0] ?? 'local@example.test',
      SESSION_SECRET: config.sessionSigningKey, SETUP_TOKEN: config.authSetupToken,
      MAIL_FROM: config.mailAuthFrom || undefined, local,
      branding: { productName: 'Mango', accentColor: '#ffcf47', signInPath: '/signin', theme: '/rer-theme.css' },
    }, mailSender: local ? createMailSender({ provider: 'development', mode: 'development' }, { outbox: createD1DevelopmentOutbox({ db }) }) : createBaseMailSender(config, repository.database),
      clientIp: req => local ? new URL(req.url).hostname : req.headers.get('CF-Connecting-IP') ?? '',
      rolePolicy: async ({ actor, action, target, role }) => {
        if (action === 'operators:role') return false;
        if (action === 'operators:invite') return role === 'owner';
        if (action === 'operators:deactivate' && target) {
          const original = await repository.getOperator(target.id);
          if (original?.isInitial && target.id !== actor.id) return false;
        }
        return true;
      },
    });
  }
  return {
    async handle(request: Request) {
      if (new URL(request.url).pathname === '/auth/environment') return Response.json({ local });
      // Administrative APIs are mediated by Mango's operator policy.
      if (['/auth/review-session', '/auth/invite', '/auth/invite/cancel', '/auth/operators', '/auth/operator/status', '/auth/operator/role', '/auth/sessions', '/auth/session/revoke'].includes(new URL(request.url).pathname)) return new Response(null, { status: 404 });
      const normalized = normalize(request, true);
      if (new URL(request.url).pathname === '/auth/setup-complete') return completeLocalSetup(normalized, db, config);
      const auth = core(normalized);
      const nativeMagicLink = new URL(request.url).pathname === '/auth/magic-link'
        && request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() === 'application/x-www-form-urlencoded';
      const response = nativeMagicLink && request.method === 'POST'
        ? await requestNativeMagicLink(auth, normalized)
        : await createAuthHandler(auth)(normalized);
      if (new URL(request.url).pathname === '/auth/signout' && request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') && response?.status === 204) {
        return new Response(null, {status: 303, headers: {...Object.fromEntries(response.headers), Location: '/signin'}});
      }
      if (nativeMagicLink && response) {
        const ok = response.status === 202;
        await response.body?.cancel();
        const { html, headers } = await renderMessagePage(ok
          ? { title: 'Mango sign-in', heading: 'Check your sign-in message', text: 'If this address has access, open your message and press Confirm.', mark: 'stamp',
              links: [...(local ? [{ href: '/__dev/outbox', label: 'Open the development outbox' }] : []), { href: '/signin', label: 'Return to sign-in' }] }
          : { title: 'Mango sign-in', heading: 'Sign-in unavailable', text: 'Return to sign-in and try again, or check the operations guide.', links: [{ href: '/signin', label: 'Return to sign-in' }] });
        const answer = new Headers(response.headers);
        for (const [name, value] of Object.entries(headers)) answer.set(name, value); // the page's own policy replaces the JSON answer's
        answer.set('Content-Type', 'text/html; charset=utf-8');
        return new Response(html, {status: response.status, headers: answer});
      }
      if (response?.status === 303 && response.headers.has('Set-Cookie')) {
        const cookie = response.headers.get('Set-Cookie')!.split(';')[0];
        const session = await auth.getSession(new Request(normalized.url, { headers: { Host: new URL(normalized.url).host, Cookie: cookie } }));
        if (session) await project(session.operator);
      }
      return response;
    },
    async authenticate(request: Request) {
      const normalized = normalize(request);
      const session = await core(normalized).getSession(normalized);
      return session ? project(session.operator) : undefined;
    },
    async isNativeOwner(request: Request) {
      const normalized = normalize(request);
      const session = await core(normalized).getSession(normalized);
      return session?.operator.role === 'owner' && session.operator.status === 'active';
    },
    async listOperators(request: Request) {
      const normalized = normalize(request);
      const actor = await this.authenticate(normalized);
      const auth = core(normalized);
      return Promise.all((await auth.listOperators(normalized)).filter(row => row.status !== 'inactive')
        .map(async row => ({ ...await project(row), status: row.status })));
    },
    async inviteOperator(request: Request, email: string) {
      const normalized = normalize(request), actor = await this.authenticate(normalized);
      const auth = core(normalized);
      await auth.invite(normalized, { email, displayName: email.split('@')[0], role: 'owner' });
      const row = (await auth.listOperators(normalized)).find(operator => operator.email === email.trim().toLowerCase());
      if (!row) throw new Error('operator_invitation_failed');
      return { ...await project(row), status: row.status };
    },
    async removeOperator(request: Request, targetId: string) {
      const normalized = normalize(request), actor = await this.authenticate(normalized);
      const target = await repository.getOperator(targetId);
      if (target?.isInitial && target.id !== actor?.id) throw new Error('The initial operator can remove themselves only.');
      const post = new Request(normalized, { method: 'POST' });
      const auth = core(post);
      const authority = (await auth.listOperators(post)).find(operator => operator.id === targetId);
      if (!authority) throw new AuthError('operator_not_found', 404);
      const updated = authority.status === 'invited'
        ? await auth.cancelInvitation(post, targetId)
        : await auth.setOperatorStatus(post, targetId, 'inactive');
      await project(updated);
    },
    async signOut(request: Request) { return core(normalize(request)).signOut(normalize(request)); },
  };
}
