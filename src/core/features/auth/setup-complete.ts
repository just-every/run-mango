import { createOperatorAuth, createAuthHandler } from '@runeditrun/rer/modules/operator-auth';
import type { AppConfig } from '@/core/shared/platform';

/** The pinned Base package owns this local CLI handshake. Email sign-in stays on Mango's retained Base source. */
export function completeLocalSetup(request: Request, db: D1Database, config: AppConfig) {
  const local = config.local === true;
  const auth = createOperatorAuth({ db, config: {
    origin: local ? new URL(request.url).origin : config.publicBaseUrl.origin,
    OWNER_EMAIL: config.initialOperatorEmails[0], SESSION_SECRET: config.sessionSigningKey,
    SETUP_TOKEN: config.authSetupToken, local,
  }, clientIp: req => local ? new URL(req.url).hostname : req.headers.get('CF-Connecting-IP') ?? '' });
  return createAuthHandler(auth)(request);
}
