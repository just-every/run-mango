import {createDormancyRoutes} from '@/core/features/audience/dormancy-routes';
import {domainSetupRoutes} from '@/core/features/sender-verification/setup-routes';
import {stripeRoutes} from '@/core/features/store/stripe/routes';
import {hasPermission,requiredPermission} from '@/core/features/auth/permissions';
import {projectPrivateResponse} from '@/core/features/auth/response-privacy';
import {contactSupportRoutes} from '@/core/features/auth/contact-actions';
import {approvalRequestRoutes} from '@/core/features/auth/approval-requests';
import {activityRoutes} from '@/core/features/auth/activity';
import {reviewLinkHostRoutes} from '@/core/features/settings/review-link-hosts';
import {blockedLinkHosts,inspectRevisionLinks} from '@/core/features/lifecycle/link-checks';
import {archiveOperatorRoutes,archivePublicRoutes} from '@/core/features/archive/routes';
import {createOpenPixelRoutes,createOpenTrackingSettingsRoutes} from '@/core/features/insights/open-tracking';
import {smsReviewPreview} from '@/core/features/sms/review-preview';
import { recordConfirmationDeferral } from '@/core/features/audience/confirmation-deferred';
import { ProviderDeferredError } from '@/core/shared/provider-deferred-error';
import { createSmsSignupRoutes } from '@/core/features/sms/signup';
import { createSmsInboundRoutes } from '@/core/features/sms/inbound';
import { sendSmsConfirmation, validateSmsConsent } from '@/core/features/sms/confirmation';
import {retireTransfers} from '@/core/features/portability/retire-transfers';
import {erasureFencedDatabase,withErasureWriteFence} from '@/core/features/audience/erasure/write-fence';
import {pendingErasure} from '@/core/features/audience/erasure/maintenance';
import { createSegmentRoutes } from '@/core/features/audience/segments';
import { senderIdentitySchema } from '@/core/features/settings/sender-validation';
import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { createLinkHostRoutes, loadLinkHosts } from '@/core/features/settings/link-hosts';
import { createIntegrationService } from '@/core/features/integrations/service';
import { createIntegrationApiRoutes, createIntegrationSettingsRoutes } from '@/core/features/integrations/routes';
import { createAudienceImportRoutes } from '@/core/features/audience/import-routes';
import { createSignupRoutes } from '@/core/features/audience/signup-routes';
import { createPortabilityRoutes } from '@/core/features/portability/routes';
import { createMediaRoutes } from '@/core/features/campaign-assets/media-routes';
import { createCampaignAssetRoutes } from '@/core/features/campaign-assets/upload-routes';
import { createDesignGenerationRoutes } from '@/core/features/design-generation/routes';
import { createAuthoringService } from '@/core/features/campaigns/authoring-service';
import { createSyncRoutes } from '@/core/features/store/sync-routes';
import { createCommerceSynchronizer } from '@/core/features/store/synchronize';
import { Hono } from 'hono';
import {ownerClaim} from '@/core/features/auth/owner-claim';
import {configuredEditor} from '@/core/features/editor/config';

import { createCommerceWebhookRoutes } from '@/core/features/audience/commerce-webhook-routes';
import { createAudienceRepository } from '@/core/features/audience/repository';
import { createAudiencePublicRoutes } from '@/core/features/audience/public-routes';
import { createAudienceRoutes } from '@/core/features/audience/routes';
import { createAudienceService } from '@/core/features/audience/service';
import { createLifecycleAudience } from '@/core/features/audience/lifecycle-adapter';
import { createAuthRepository } from '@/core/features/auth/repository';
import { createOperatorRoutes, createPublicAuthRoutes, type AuthVariables } from '@/core/features/auth/routes';
import { createAuthService } from '@/core/features/auth/service';
import { createCampaignRepository } from '@/core/features/campaigns/repository';
import { createCampaignCompositionRepository } from '@/core/features/campaigns/composition-repository';
import { createCampaignRoutes } from '@/core/features/campaigns/routes';
import { createCampaignService } from '@/core/features/campaigns/service';
import { createHealthRepository } from '@/core/features/health/repository';
import { createHealthRoutes } from '@/core/features/health/routes';
import { createMoveInRoutes } from '@/core/features/move-in/routes';
import { createHealthService } from '@/core/features/health/service';
import { createInsightsRepository } from '@/core/features/insights/repository';
import { createInsightsRoutes } from '@/core/features/insights/routes';
import { createInsightsService } from '@/core/features/insights/service';
import { prepareHandoffCost, cancelHandoffCost, settleHandoffCost, settleHandoffFailure } from '@/core/features/insights/cost-handoff';
import {
  moveContactDeliveryFacts,
  registerLifecycleRoutes,
  type LifecycleRuntime,
} from '@/core/features/lifecycle';
import { createSettingsRoutes } from '@/core/features/settings/routes';
import { createSettingsService } from '@/core/features/settings/service';
import { createSenderCheckRoutes } from '@/core/features/settings/sender-check-routes';
import { createStoreRepository } from '@/core/features/store/repository';
import { createStoreRoutes } from '@/core/features/store/routes';
import { createStoreService } from '@/core/features/store/service';
import { createDatabase } from '@/core/platform/db/client';
import type { AppBindings, Platform } from '@/core/shared/platform';
import { initialReads, initialReadOnce } from './request-platform';

export type AppEnvironment = { Bindings: AppBindings; Variables: AuthVariables };

function isSafeMethod(method: string) {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

function validOrigin(
  context: { req: { header(name: string): string | undefined; url: string } },
  platform: Platform,
  trustedLocal: boolean,
) {
  const origin = context.req.header('Origin');
  return origin === platform.config.publicBaseUrl.origin
    || (trustedLocal && (origin === undefined || origin === new URL(context.req.url).origin));
}

function audienceDependencies(
  platform: Platform,
  storeService: ReturnType<typeof createStoreService>,
  lifecycle: () => LifecycleRuntime,
) {
  return {
    validateConsent(input: import('@/core/features/audience/service').ConsentCapture){if(input.channel==='sms')validateSmsConsent(platform,input);},
    contactHashSalt: platform.config.contactHashSalt,
    publicTokens: {
      issuePublicToken: (id: string, purpose: string, expiresAt: Date) => platform.publicTokens.issue({ id, purpose, expiresAt }),
      async verifyPublicToken(token: string, purpose: string) {
        try {
          const claims = await platform.publicTokens.verify(token, purpose);
          return { id: claims.id };
        } catch {
          return undefined;
        }
      },
    },
    confirmationDispatcher: {
      async sendConfirmation(input: { channel: 'email' | 'sms'; destination: string; token: string; expiresAt: Date; contactId: string; consentId: string }, authorizeHandoff: () => Promise<boolean>) {
        if(input.channel==='sms'){await sendSmsConfirmation(platform,input);return true;}
        const identity = senderIdentitySchema.parse(await loadSenderSettings(platform));
        const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\"', '&quot;');
        const sender = `${identity.displayName} <${identity.fromEmail}>`;
        const tokenDigest = await platform.publicTokens.digest(input.token);
        const handoffStartedAt = new Date();
        const destination = new URL(`/consent/confirm/${encodeURIComponent(input.token)}`, platform.config.publicBaseUrl).toString();
        const request = {
          purpose: 'consent-confirmation' as const,
          recipientStepId: `consent-confirmation:${tokenDigest}`,
          idempotencyKey: `consent-confirmation:${tokenDigest}`,
          handoffStartedAt,
          to: input.destination,
          sender,
          content: {
                subject: `Confirm your ${identity.displayName} subscription`,
                text: `Confirm your subscription within 30 days: ${destination}\n\n${identity.displayName}\n${identity.physicalAddress}`,
                html: `<p>Confirm your subscription within 30 days:</p><p><a href="${destination}">Confirm subscription</a></p><footer>${escape(identity.displayName)}<br>${escape(identity.physicalAddress)}</footer>`,
                replyTo: identity.replyToEmail,
              },
          callbackUrl: new URL('/webhooks/mail/resend', platform.config.publicBaseUrl).toString(),
        };
        const adapter = platform.confirmationMailer ?? platform.mailer;
        const provider = (await adapter.capabilities()).provider ?? (platform.config.mailProvider ?? 'unreported');
        const costContext = {
          key: `handoff:${provider}:${request.idempotencyKey}:attempt:${crypto.randomUUID()}`, provider, operation: 'confirmation-handoff' as const,
        };
        await prepareHandoffCost(platform.database, adapter, request, costContext);
        // No asynchronous preparation may occur between this D1 authorization
        // and adapter invocation. A provider handoff already in progress cannot
        // be recalled by a later database transition.
        if (!await authorizeHandoff()) {
          await cancelHandoffCost(platform.database, costContext.key);
          return false;
        }
        let result;
        try { result = await adapter.send(request); }
        catch (error) {
          if (error instanceof ProviderDeferredError) {
            await recordConfirmationDeferral(platform.database, input, error);
            await cancelHandoffCost(platform.database, costContext.key);
            throw error;
          }
          try { await settleHandoffFailure(platform.database, adapter, request, costContext, error); }
          catch { /* The durable prepared fact retains uncertainty; preserve the transport error. */ }
          throw error;
        }
        try { await settleHandoffCost(platform.database, adapter, request, costContext, result); }
        catch { /* The receipt controls confirmation; failed enrichment leaves its prepared cost unpriced. */ }
        if (input.channel === 'email' && result.disposition !== 'accepted') throw new Error('Confirmation delivery is uncertain; the attempt will not be repeated automatically.');
        return true;
      },
    },
    store: {...storeService, async freshness(types: Parameters<typeof storeService.freshness>[0], now:Date) {
      if (!platform.commerce && types.length) return types.map(sourceType=>({sourceType,reason:'source-unavailable' as const,detail:'Commerce is unavailable. Connect the store before using this source in an audience.'}));
      return storeService.freshness(types,now);
    }},

    async moveLifecycleData(mergedContactId: string, survivorContactId: string) {
      await moveContactDeliveryFacts(lifecycle(), mergedContactId, survivorContactId);
    },
  };
}

type AppServices = {
  platform: Platform;
  database: ReturnType<typeof createDatabase>;
  healthService: ReturnType<typeof createHealthService>;
  authService: ReturnType<typeof createAuthService>;
  audienceService: ReturnType<typeof createAudienceService>;
  storeService: ReturnType<typeof createStoreService>;
  campaignService: ReturnType<typeof createCampaignService>;
  insightsService: ReturnType<typeof createInsightsService>;
  lifecycleRuntime: LifecycleRuntime;
};

type BeforeAuthenticationRoutes = (app: Hono<AppEnvironment>, services: AppServices) => void;

export function createAppServices(platform: Platform): AppServices {
  const database = platform.database;
  const healthService = createHealthService(createHealthRepository(database), platform);
  const authService = createAuthService(createAuthRepository(database), platform);
  const storeService = createStoreService(createStoreRepository(database));
  let lifecycleRuntime: LifecycleRuntime | undefined;
  const audienceService = createAudienceService(createAudienceRepository(database), audienceDependencies(platform, storeService, () => {
    if (!lifecycleRuntime) throw new Error('Lifecycle runtime has not been composed.');
    return lifecycleRuntime;
  }));
  lifecycleRuntime = {
    platform,
    audience: createLifecycleAudience(audienceService),
    synchronizeCommerce: platform.commerce
      ? createCommerceSynchronizer(platform.commerce, storeService, audienceService)
      : undefined,
  };
  const campaignService = createCampaignService(
    createCampaignRepository(database,{publicBaseUrl:platform.config.publicBaseUrl.toString(),openTrackingEnabled:true}),
    createCampaignCompositionRepository(database,{publicBaseUrl:platform.config.publicBaseUrl.toString(),openTrackingEnabled:true}),
    storeService,
    { smsEnabled: platform.config.modules.sms.enabled, commerceEnabled:platform.config.modules.commerce.enabled, aiEnabled:platform.config.modules.ai.enabled,
      marketingConnectionRequired:platform.config.authMail !== undefined && platform.config.mailProvider === 'rer',
      smsPreview:(campaignId,revisionId)=>smsReviewPreview(lifecycleRuntime!,campaignId,revisionId),
      blockedHosts:async input=>blockedLinkHosts(await inspectRevisionLinks(input,platform)) },
  );
  const insightsService = createInsightsService(createInsightsRepository(database), platform.config.deliverabilityReportingWindowDays);

  return {
    platform,
    database,
    healthService,
    authService,
    audienceService,
    storeService,
    campaignService,
    insightsService,
    lifecycleRuntime,
  };
}

export function createApp(
  environment: AppBindings,
  platform: Platform,
  mountBeforeAuthentication?: BeforeAuthenticationRoutes,
  trustedLocal = false,
) {
  const retirementDatabase=environment.DB;
  environment={...environment,DB:erasureFencedDatabase(environment.DB)};
  const app = new Hono<AppEnvironment>();
  const services = createAppServices(platform);
  // Health owns its deadline; no settings or maintenance read may run ahead of it.
  app.route('/', createHealthRoutes(services.healthService, environment));
  app.use('*',async(_context,next)=>{
    await initialReadOnce('retire-transfers', () => retireTransfers(retirementDatabase,{ASSETS_BUCKET:environment.ASSETS_BUCKET}));
    return next();
  });
  app.use('*',async(context,next)=>{
    const path=context.req.path;
    const erasure=path.startsWith('/api/audience/erasures/')||(context.req.method==='DELETE'&&/^\/api\/contacts\/[^/]+$/.test(path));
    // Campaign images write only a per-image request counter, never personal data (CAMP-012).
    if(initialReads.getStore()||erasure||path.startsWith('/auth/')||path.startsWith('/media/')||path==='/health')return next();
    return withErasureWriteFence(environment.DB,next);
  });
  const {
    authService,
    storeService,
    audienceService,
    campaignService,
    insightsService,
    lifecycleRuntime,
  } = services;
  const secureCookie = platform.config.publicBaseUrl.protocol === 'https:';

  app.use('*', async (context, next) => {
    const path = context.req.path;
    // Public tracked-link GETs also write facts. During restore every product
    // request pauses; only the separate authentication/transfer custody runs.
    if (environment.MANGO_RESTORE_MODE === '1'
      && !path.startsWith('/auth/') && !path.startsWith('/api/portability/')
      && !['/health', '/api/operator', '/api/auth/magic-link'].includes(path)) {
      return context.json({ error: 'restore_in_progress' }, 503);
    }
    if(!path.startsWith('/api/')&&!path.startsWith('/auth/')&&!path.startsWith('/app')&&!['/health','/signin','/__dev/key'].includes(path)&&await pendingErasure(environment.DB))return context.json({error:'contact_erasure_in_progress'},503);
    await next();
  });
  app.use('*', async (context, next) => {
    // Settings are independent, but both must be current before route work.
    const settings = await Promise.allSettled([
      initialReads.getStore() ? undefined : loadSenderSettings(platform),
      initialReadOnce('link-hosts', () => loadLinkHosts(platform)),
    ]);
    for (const result of settings) if (result.status === 'rejected') throw result.reason;
    context.header('X-Mango-Version', platform.config.appVersion);
    await next();
  });
  app.all('/auth/owner-claim', context => ownerClaim(context.req.raw, environment, platform));
  app.get('/auth/environment', async context => {
    context.header('Cache-Control', 'no-store');
    let editorConfigured = false;
    try { editorConfigured = configuredEditor(environment)?.enabled === true; } catch { /* Invalid configuration grants no editor. */ }
    return context.json({local: platform.config.local === true,
      editorEligible: editorConfigured && await authService.isNativeOwner(context.req.raw)});
  });
  app.route('/', createPublicAuthRoutes(authService, { secureCookie }));
  app.route('/', createAudiencePublicRoutes(audienceService));
  app.route('/', createSenderCheckRoutes(platform));
  app.route('/', createSignupRoutes(audienceService, platform, environment.DB));
  app.route('/', createSmsSignupRoutes(platform,audienceService));
  app.route('/', createMediaRoutes(environment.DB, platform.blobs));
  const stripe = stripeRoutes(platform, audienceService);
  app.route('/', stripe.webhooks);
  if (platform.commerce) app.route('/', createCommerceWebhookRoutes(audienceService, platform.commerce));
  app.route('/',createOpenPixelRoutes(platform));
  app.route('/',archivePublicRoutes(environment.DB,platform.config.publicBaseUrl.origin));
  const integrations = createIntegrationService(platform, audienceService);
  app.route('/api/integrations/v1', createIntegrationApiRoutes(integrations));
  mountBeforeAuthentication?.(app, services);
  if (!mountBeforeAuthentication) app.all('/api/_local/*', (context) => context.json({ error: 'not_found' }, 404));

  app.use('/api/*', async (context, next) => {
    const operator = initialReads.getStore()?.operator ?? await authService.authenticate(context.req.raw);
    if (!operator) return context.json({ error: 'unauthenticated' }, 401);
    if (!isSafeMethod(context.req.method) && !validOrigin(context, platform, trustedLocal)) return context.json({ error: 'invalid_origin' }, 403);
    context.set('operator', operator);
    context.header('Cache-Control','no-store');
    const required=requiredPermission(context.req.method,context.req.url);
    if(!hasPermission(operator.role,required))return context.json({error:'role_forbidden',requiredPermission:required},403);
    if(!context.req.path.startsWith('/api/audience/erasures/')&&!/^\/api\/contacts\/[^/]+$/.test(context.req.path)&&context.req.path!=='/api/operator'&&await initialReadOnce('pending-erasure', () => pendingErasure(environment.DB)))return context.json({error:'contact_erasure_in_progress'},503);
    await next();
    if(['GET','HEAD'].includes(context.req.method)&&context.res.ok&&context.res.headers.get('Content-Type')?.includes('application/json')) {
      const value=await context.res.json();
      const projected=projectPrivateResponse(operator.role==='analyst'&&operator.unmaskedContacts?'admin':operator.role,context.req.url,value);
      context.res=new Response(JSON.stringify(projected),{status:context.res.status,headers:context.res.headers});
    }
  });
  app.route('/api',contactSupportRoutes(environment.DB,audienceService));
  app.route('/api',approvalRequestRoutes(environment.DB));
  app.route('/api',activityRoutes(environment.DB));
  app.route('/api', createOperatorRoutes(authService, { secureCookie }));
  app.route('/api', createIntegrationSettingsRoutes(integrations));
  app.get('/api/editor/config', async context => {
    context.header('Cache-Control', 'no-store');
    const operator = context.get('operator');
    const authority = await environment.DB.prepare('SELECT role,status FROM oa_operators WHERE id=?').bind(operator.id).first<{role: string; status: string}>();
    if (operator.role !== 'owner' || authority?.role !== 'owner' || authority.status !== 'active') return context.json({error: 'owner_required'}, 403);
    try {
      const config = configuredEditor(environment);
      if (!config) return context.json({error: 'editor_not_configured'}, 503);
      return context.json({config, expiresAt: Date.now() + 30_000});
    } catch { return context.json({error: 'editor_not_configured'}, 503); }
  });
  app.route('/api', createPortabilityRoutes(environment, platform));
  app.route('/',createSmsInboundRoutes(platform));
  const lifecycleServices = registerLifecycleRoutes(app, lifecycleRuntime);
  app.route('/api',archiveOperatorRoutes(environment.DB,platform.config.publicBaseUrl.origin));
  app.route('/api', createSettingsRoutes(createSettingsService(platform)));
  app.route('/api', createLinkHostRoutes(platform));
  app.route('/api',createDormancyRoutes(platform));
  app.route('/api', reviewLinkHostRoutes(platform,lifecycleServices.approval));
  app.route('/api', stripe.settings);
  app.route('/api', domainSetupRoutes(platform));
  app.route('/api', createStoreRoutes(storeService,platform.commerce));
  app.route('/api', createSyncRoutes(platform, services.storeService));
  app.route('/api', createSegmentRoutes(environment.DB));
  app.route('/api', createAudienceRoutes(audienceService,environment.DB,platform,environment));
  app.route('/api', createAudienceImportRoutes(platform));
  app.route('/api', createMoveInRoutes(platform));
  app.route('/api', createCampaignAssetRoutes(environment.DB, platform.blobs, platform.config.publicBaseUrl));
  app.route('/api', createDesignGenerationRoutes(environment.DB, platform));
  app.route('/api', createCampaignRoutes(campaignService, createAuthoringService(platform, lifecycleRuntime, storeService), platform.config.publicBaseUrl.origin,
    (campaignId, revisionId) => lifecycleServices.approval.preview({campaignId, revisionId})));
  app.route('/api', createInsightsRoutes(insightsService,platform.database));
  app.route('/api', createOpenTrackingSettingsRoutes(platform));

  app.all('*', (context) => context.json({ error: 'not_found' }, 404));

  return app;
}

export type AppType = ReturnType<typeof createApp>;
