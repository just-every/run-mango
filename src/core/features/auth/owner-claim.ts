import { createOwnerClaimHandler } from '@/vendor/base/owner-claim/index.mjs';
import type { AppBindings, Platform } from '@/core/shared/platform';

/** Signed admission feeds the ordinary Base operator/session transaction. */
export async function ownerClaim(request: Request, environment: AppBindings, platform: Platform) {
  const {config} = platform;
  try {
    const issuer = environment.RER_OWNER_CLAIM_ISSUER;
    if (!issuer || issuer !== environment.RER_MANAGEMENT_ORIGIN || !environment.RER_INSTALLATION_ID || !environment.RER_OWNER_CLAIM_PUBLIC_KEYS) {
      return Response.json({error: 'owner_claim_not_configured'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
    }
    const headers = new Headers(request.headers);
    if (config.local && !headers.has('Host')) headers.set('Host', new URL(request.url).host);
    const handler = createOwnerClaimHandler({
      db: environment.DB,
      authConfig: {origin: config.publicBaseUrl.origin, OWNER_EMAIL: config.initialOperatorEmails[0], SESSION_SECRET: config.sessionSigningKey,
        SETUP_TOKEN: config.authSetupToken, local: config.local === true,
        branding: {productName: 'Mango', signInPath: '/signin', accentColor: '#bd492b', theme: '/rer-theme.css'}},
      clientIp: req => config.local ? new URL(req.url).hostname : req.headers.get('CF-Connecting-IP') ?? '',
      issuer, installationId: environment.RER_INSTALLATION_ID, appOrigin: config.publicBaseUrl.origin,
      expectedEmail: config.initialOperatorEmails[0], publicKeys: JSON.parse(environment.RER_OWNER_CLAIM_PUBLIC_KEYS),
    });
    return await handler(new Request(request, {headers})) ?? new Response(null, {status: 404});
  } catch {
    return Response.json({error: 'owner_claim_not_configured'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
