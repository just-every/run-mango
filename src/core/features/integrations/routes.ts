import {PropertyError} from '@/core/features/audience/properties/types';
import type {Platform} from '@/core/shared/platform';
import {customEventInput,recordCustomEvent} from './custom-events';
import {integrationOpenApi} from './openapi';
import {clientSource} from './client-source';
import { conversionEventInput } from '@/core/features/insights/conversion-events';
import {hasPermission} from '@/core/features/auth/permissions';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AuthVariables } from '@/core/features/auth/routes';
import type { Credential } from './credentials';
import type { createIntegrationService } from './service';
import { contactInput, credentialInput, integrationScopes, IntegrationError, pageInput, sendInput, suppressionInput, type IntegrationScope } from './schema';

type Service = ReturnType<typeof createIntegrationService>;
type Environment = {Variables: AuthVariables & {integrationCredential: Credential; integrationTarget: string}};
type IntegrationContext = Context<Environment>;

async function body<T>(context: IntegrationContext, schema: z.ZodType<T>, consentEvidence = false) {
  const value = await context.req.json().catch(() => null);
  if (consentEvidence && value?.subscribe === true && !value.consent) throw new IntegrationError('consent_evidence_required', 400);
  const result = schema.safeParse(value);
  if (!result.success) throw new IntegrationError('invalid_request', 400);
  return result.data;
}
function query<T>(context: IntegrationContext, schema: z.ZodType<T>) {
  const result = schema.safeParse(context.req.query());
  if (!result.success) throw new IntegrationError('invalid_query', 400);
  return result.data;
}
function operation(context: IntegrationContext, settings: boolean) {
  // Only fixed operation names enter audit: arbitrary paths can contain PII.
  const path = context.req.path;
  const endpoint = settings ? path.endsWith('/audit') ? 'audit' : 'credentials'
    : /\/campaigns\/[^/]+\/send$/.test(path) ? 'campaigns.send'
    : ['contacts', 'segments', 'events', 'suppressions'].find(name => path.endsWith(`/${name}`)) ?? 'unknown';
  return `${settings ? 'settings' : 'api'}.${endpoint}.${context.req.method.toLowerCase()}`;
}
function audited(service: Service, settings: boolean): MiddlewareHandler<Environment> {
  return async (context, next) => {
    context.header('Cache-Control', 'no-store');
    // Opening Settings is a page view, not something an operator did: only changes and integration requests are logged.
    const logged = !(settings && context.req.method === 'GET');
    let auditId: string | undefined;
    try {
      if (logged) auditId = await service.audit.begin(operation(context, settings), null, settings ? context.get('operator')?.id ?? null : null);
      const credential = settings ? null : await service.credentials.identify(context.req.raw);
      if (credential) {
        context.set('integrationTarget', credential.id);
        await service.audit.attribute(auditId!, credential.id);
      }
      if (settings) {
        if (!hasPermission(context.get('operator').role,'integration.manage')) throw new IntegrationError('owner_required', 403);
      } else {
        if (!credential) throw new IntegrationError('invalid_credential', 401);
        context.set('integrationCredential', credential);
        await service.credentials.takeAllowance(credential.id);
        await service.available();
      }
      await next();
    } catch (error) {
      if (error instanceof IntegrationError && error.status === 429) context.header('Retry-After', String(60 - Math.floor(Date.now() / 1000) % 60));
      context.res = context.json({...(error instanceof PropertyError?{property:error.key}:{}),error: error instanceof PropertyError ? error.code : error instanceof IntegrationError ? error.code : 'integration_unavailable'}, error instanceof PropertyError || error instanceof IntegrationError ? error.status : 503);
    }
    if (!logged) return;
    if (!auditId) return context.json({error: 'audit_unavailable'}, 503);
    const status = context.res.status;
    const outcome = status < 400 ? 'allowed' : status === 429 ? 'rate_limited' : status >= 500 ? 'error' : 'denied';
    try { await service.audit.finish(auditId, status, outcome, context.get('integrationTarget')); }
    catch { return context.json({error: 'audit_unavailable'}, 503); }
  };
}
function scope(required: IntegrationScope): MiddlewareHandler<Environment> {
  return async (context, next) => {
    if (!context.get('integrationCredential').scopes.includes(required)) return context.json({error: 'insufficient_scope', requiredScope: required}, 403);
    await next();
  };
}
function routes() {
  const router = new Hono<Environment>();
  router.onError((error, context) => {
    if(error instanceof IntegrationError&&error.status===429)context.header('Retry-After',String(60-Math.floor(Date.now()/1000)%60));
    return context.json({...(error instanceof PropertyError?{property:error.key}:{}),error: error instanceof PropertyError ? error.code : error instanceof IntegrationError ? error.code : 'integration_unavailable'}, error instanceof PropertyError || error instanceof IntegrationError ? error.status : 503);
  });
  return router;
}
const boundedBody = () => bodyLimit({maxSize: 64 * 1024, onError: context => context.json({error: 'request_too_large'}, 413)});

/** Mount /api/integrations/v1 before operator-session middleware. Never sets an operator. */
export function createIntegrationApiRoutes(service: Service, platform: Platform, enqueue: (credential: Credential,campaignId:string,input:z.infer<typeof sendInput>)=>Promise<unknown>, read:(credential:Credential,kind:'contacts'|'segments'|'memberships'|'events',args:Record<string,unknown>)=>Promise<unknown>) {
  const router = routes();
  router.get('/openapi.json', context => context.json(integrationOpenApi));
  router.get('/client.mjs', context => {context.header('Content-Type','text/javascript; charset=utf-8');return context.body(clientSource);});
  router.use('*', audited(service, false));
  router.use('*', boundedBody());
  router.get('/segments', scope('contacts:read'), async context => context.json(await read(context.get('integrationCredential'),'segments',{})));
  router.get('/contacts/:id/segments', scope('contacts:read'), async context => context.json(await read(context.get('integrationCredential'),'memberships',{id:context.req.param('id')})));
  router.get('/contacts', scope('contacts:read'), async context => {
    const input = query(context, z.object({cursor: z.string().max(160).optional(), email: z.string().trim().toLowerCase().email().max(320).optional(),
      segmentId: z.string().max(160).optional(), limit: z.coerce.number().int().min(1).max(100).default(50)}).strict());
    return context.json(await read(context.get('integrationCredential'),'contacts',input));
  });
  router.put('/contacts', scope('contacts:write'), async context => {
    const input = await body(context, contactInput, true);
    return context.json(await service.contacts.upsert(context.get('integrationCredential').id, input));
  });
  router.post('/suppressions', scope('contacts:write'), async context => {
    const input = await body(context, suppressionInput);
    return context.json(await service.suppress(context.get('integrationCredential').id, input));
  });
  router.post('/events', scope('events:write'), async context => {
    const input = await body(context, z.union([conversionEventInput,customEventInput]));
    const key=context.get('integrationCredential').id;
    return context.json('name' in input ? await recordCustomEvent(platform.database.$client,key,input) : await service.recordEvent(key,input));
  });
  router.get('/events', scope('events:read'), async context => {
    const input = query(context, pageInput.strict());
    return context.json(await read(context.get('integrationCredential'),'events',input));
  });
  router.post('/campaigns/:id/send', scope('campaigns:send'), async context => {
    if (context.req.param('id').length > 160) throw new IntegrationError('invalid_request', 400);
    const input = await body(context, sendInput);
    return context.json(await enqueue(context.get('integrationCredential'), context.req.param('id'), input), 202);
  });
  router.all('*', context => context.json({error: 'not_found'}, 404));
  return router;
}

/** Mount /api after the native session/origin middleware. Owner check remains native. */
export function createIntegrationSettingsRoutes(service: Service) {
  const router = routes();
  router.use('/settings/integrations/*', audited(service, true));
  router.use('/settings/integrations/*', boundedBody());
  router.get('/settings/integrations', async context => context.json({credentials: await service.credentials.list(), scopes: integrationScopes}));
  router.post('/settings/integrations', async context => {
    const input = await body(context, credentialInput);
    const result = await service.credentials.create(input, context.get('operator').id);
    context.set('integrationTarget', result.credential.id);
    return context.json(result, 201);
  });
  router.get('/settings/integrations/audit', async context => {
    const input = query(context, pageInput.strict());
    return context.json(await service.audit.list(input.cursor, input.limit));
  });
  router.delete('/settings/integrations/:id', async context => {
    const result = await service.credentials.revoke(context.req.param('id'));
    context.set('integrationTarget', result.credential.id);
    return context.json(result);
  });
  return router;
}
