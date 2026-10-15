import { loadSignupSettings } from '@/core/features/audience/signup-settings';
import { requestPlatform } from './request-platform';
import { createAppServices } from './app';
import type { AppBindings, Platform } from '@/core/shared/platform';
import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { senderIdentitySchema } from '@/core/features/settings/sender-validation';
import {configuredEditor} from '@/core/features/editor/config';
import { lobbyResponse } from '@/base/lobby';
import { setupStateResponse } from '@/base/setup-state';
import { identity } from '@/identity';

const honoPrefixes = ['/api', '/auth', '/unsubscribe', '/consent', '/l', '/o', '/links', '/media', '/webhooks', '/signin/verify', '/__dev'];
export async function dispatchDocuments(
  request: Request, environment: AppBindings, executionContext: ExecutionContext,
  platform: Platform, hono: {fetch: (request: Request, environment: AppBindings, executionContext: ExecutionContext) => Response | Promise<Response>},
) {
  const url = new URL(request.url);
  let host: string;
  try { host = new URL(`http://${request.headers.get('Host') ?? url.host}`).hostname; }
  catch { return Response.json({error: 'not_found'}, {status: 404}); }
  const permitted = platform.config.local === true
    ? ['localhost', '127.0.0.1', '[::1]'].includes(host)
    : host === platform.config.publicBaseUrl.hostname;
  if (!permitted) return Response.json({error: 'not_found'}, {status: 404});
  // HOME-001: the installed `/` is Base's Lobby and `/setup/state` its claim, both read from the sender identity that
  // first-run setup saves (the same completeness /setup and /app check below). The host check above admits the request.
  const claim = {DB: environment.DB, AUTH_ORIGIN: ''};
  const claimed = async () => senderIdentitySchema.safeParse(await loadSenderSettings(platform)).success;
  const state = await setupStateResponse(request, claim, claimed);
  if (state) return state;
  const lobby = await lobbyResponse(request, claim, identity, claimed);
  if (lobby) return lobby;
  const path = url.pathname;
  // Start decodes URI letters and accepts case/trailing-slash aliases. Only a
  // complete signup match is canonicalized; encoded separators stay encoded.
  let signupPath=path;
  try { signupPath=decodeURI(path); } catch { /* Malformed encodings are not a signup alias. */ }
  if (path !== '/subscribe' && /^\/+subscribe\/*$/i.test(signupPath) && ['GET','HEAD'].includes(request.method)) {
    return new Response(null,{status:308,headers:{Location:`/subscribe${url.search}`,'Cache-Control':'no-store'}});
  }
  if (path.startsWith('/__dev') && platform.config.local !== true) return Response.json({error: 'not_found'}, {status: 404});
  if (path === '/subscribe/info' || ((path === '/subscribe' || path === '/subscribe/sms') && request.method === 'POST') || path === '/health' || honoPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) {
    return hono.fetch(request, environment, executionContext);
  }
  if (path === '/setup' || path === '/app' || path.startsWith('/app/')) {
    const operator = await createAppServices(platform).authService.authenticate(request);
    if (!operator) return new Response(null, {status: 303, headers: {Location: path === '/setup' ? '/signin?reason=session-required&returnTo=%2Fsetup' : '/signin?reason=session-required'}});
    const complete = senderIdentitySchema.safeParse(await loadSenderSettings(platform)).success;
    if (path === '/setup' ? complete : !complete) return new Response(null, {status: 303, headers: {Location: complete ? '/app' : '/setup', 'Cache-Control': 'no-store'}});
  }
  const { default: start } = await import('@tanstack/react-start/server-entry');
  const response = await requestPlatform.run(platform, () => start.fetch(request));
  const headers = new Headers(response.headers);
  if (path === '/setup') headers.set('Cache-Control', 'no-store');
  let frameOrigin = '';
  try { frameOrigin = configuredEditor(environment)?.managementOrigin ?? ''; } catch { /* A broken editor configuration grants no frame origin. */ }
  // CSP checks every ancestor, including a hostile host around an allowed embed.
  const origins = path === '/subscribe' ? (await loadSignupSettings(platform)).embedOrigins : [];
  const ancestors = `frame-ancestors ${path === '/subscribe' ? (origins.length ? origins.join(' ') : "'none'") : "'self'"}; `;
  if (path === '/subscribe') headers.set('Cache-Control', 'no-store');
  headers.set('Content-Security-Policy', `frame-src 'self' ${frameOrigin} ${path === '/subscribe' && platform.config.signupTurnstile ? 'https://challenges.cloudflare.com' : ''}; ${ancestors}object-src 'none'; base-uri 'self'`);
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}
