import { requestPlatform } from './request-platform';
import { createAppServices } from './app';
import type { AppBindings, Platform } from '@/core/shared/platform';
import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { senderIdentitySchema } from '@/core/features/settings/sender-validation';
import {configuredEditor} from '@/core/features/editor/config';

const honoPrefixes = ['/api', '/auth', '/unsubscribe', '/consent', '/l', '/links', '/webhooks', '/signin/verify', '/__dev'];
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
  const path = url.pathname;
  if (path.startsWith('/__dev') && platform.config.local !== true) return Response.json({error: 'not_found'}, {status: 404});
  if (path === '/subscribe/info' || (path === '/subscribe' && request.method === 'POST') || path === '/health' || honoPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) {
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
  // The public subscription document is delivered for embedding on owner sites.
  // Operator documents and the owner editor remain restricted to this origin.
  const ancestors = path === '/subscribe' ? '' : "frame-ancestors 'self'; ";
  headers.set('Content-Security-Policy', `frame-src 'self' ${frameOrigin}; ${ancestors}object-src 'none'; base-uri 'self'`);
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}
