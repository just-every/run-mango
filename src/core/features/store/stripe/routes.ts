import {paidSignupInfo, paidSignupConsent, PaidSignupCapacityError} from './paid-signup';
import {limitedBody} from '@/core/features/audience/signup-routes';
import {Hono} from 'hono';
import type {AuthVariables} from '@/core/features/auth/routes';
import {z} from 'zod';
import type {Platform} from '@/core/shared/platform';
import type {createAudienceService} from '@/core/features/audience/service';
import {activityStatement} from '@/core/features/auth/activity-record';
import {sha256} from '@/core/shared/ids';
import {seal, unseal} from './secrets';
import {stripeEventSource, stripeSources, stripeRecord, verifyStripe} from './events';
import {CommerceWebhookUnreadable} from '../webhook-unreadable';
import type {FailedOperations} from '@/core/features/audience/commerce-webhook-routes';
import {createPaidTier, paidTierSchema} from './paid-tier';
const connection = z.object({key: z.string().regex(/^rk_(?:test|live)_[A-Za-z0-9]+$/).max(512), signingSecret: z.string().regex(/^whsec_[A-Za-z0-9]+$/).max(256)}).strict();
type Stored = {key_cipher: string; signing_cipher: string; mode: string};
export function stripeRoutes(platform: Platform, audience: ReturnType<typeof createAudienceService>, operations: FailedOperations) {
  const db = platform.database.$client;
  const read = () => db.prepare('SELECT key_cipher,signing_cipher,mode FROM stripe_connection WHERE id=1').first<Stored>();
  const signupConsent = paidSignupConsent(platform, audience);
  const paid = createPaidTier(db, audience.hasConfirmedEmailConsent);
  async function api(path: string, key: string) {
    const response = await fetch('https://api.stripe.com/v1/' + path, {headers: {Authorization: 'Bearer ' + key}, signal: AbortSignal.timeout(10000)})
      .catch(() => {throw new Error('Stripe API request failed (no response).');});
    if (!response.ok) throw new Error(`Stripe API request failed (${response.status}).`);
    return response.json() as Promise<Record<string, any>>;
  }
  async function create(path: string, key: string, form: URLSearchParams, idempotencyKey: string = crypto.randomUUID()) {
    const response = await fetch('https://api.stripe.com/v1/' + path, {method: 'POST', body: form, signal: AbortSignal.timeout(10000),
      headers: {Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotencyKey}});
    if (!response.ok) throw new Error(`Stripe API request failed (${response.status}).`);
    return response.json() as Promise<Record<string, any>>;
  }
  const settings = new Hono<{Variables: AuthVariables}>();
  settings.get('/settings/stripe', async context => {
    const row = await db.prepare('SELECT mode,last_four AS lastFour,connected_by AS connectedBy,connected_at AS connectedAt FROM stripe_connection WHERE id=1').first();
    return context.json({connection: row, sourceTypes: stripeSources, webhookPath: '/webhooks/commerce/stripe', paidTier: await paid.tier(), paidReaders: await paid.readers()});
  });
  settings.put('/settings/stripe/paid-tier', async context => {
    const operator = context.get('operator');
    if (operator.role !== 'owner') return context.json({error: 'owner_required'}, 403);
    const parsed = paidTierSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return context.json({error: 'invalid_paid_tier'}, 400);
    const stored = await read();
    if (!stored) return context.json({error: 'stripe_not_connected'}, 409);
    try {
      const price = await api('prices/' + encodeURIComponent(parsed.data.priceId), await unseal(stored.key_cipher, platform.config.sessionSigningKey));
      if (price.type !== 'recurring' || price.active !== true) return context.json({error: 'paid_tier_price_refused'}, 422);
    } catch {return context.json({error: 'paid_tier_price_refused'}, 422);}
    const now = Date.now();
    await db.batch([paid.save(parsed.data, operator.email, now), activityStatement(db, {key: crypto.randomUUID(), action: 'paid-tier-saved', entityType: 'integration', entityId: 'stripe', actorId: operator.id, detail: {paidTopic: parsed.data.paidTopic, freeTopic: parsed.data.freeTopic}, at: now})]);
    return context.json({paidTier: await paid.tier()});
  });
  settings.put('/settings/stripe', async context => {
    const operator = context.get('operator');
    if (operator.role !== 'owner') return context.json({error: 'owner_required'}, 403);
    const parsed = connection.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return context.json({error: 'invalid_stripe_connection'}, 400);
    const mode = parsed.data.key.includes('_test_') ? 'test' : 'live';
    try {await api('customers?limit=1', parsed.data.key);} catch {return context.json({error: 'stripe_connection_refused'}, 422);}
    const now = Date.now();
    await db.batch([db.prepare(`INSERT INTO stripe_connection(id,key_cipher,signing_cipher,mode,last_four,connected_by,connected_at)
      VALUES(1,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET key_cipher=excluded.key_cipher,signing_cipher=excluded.signing_cipher,
      mode=excluded.mode,last_four=excluded.last_four,connected_by=excluded.connected_by,connected_at=excluded.connected_at`).bind(
      await seal(parsed.data.key, platform.config.sessionSigningKey), await seal(parsed.data.signingSecret, platform.config.sessionSigningKey), mode, parsed.data.key.slice(-4), operator.email, now),
      activityStatement(db, {key: crypto.randomUUID(), action: 'stripe-connected', entityType: 'integration', entityId: 'stripe', actorId: operator.id, detail: {mode}, at: now})]);
    return context.json({connected: true, mode});
  });
  settings.delete('/settings/stripe', async context => {
    const operator = context.get('operator');
    if (operator.role !== 'owner') return context.json({error: 'owner_required'}, 403);
    await db.batch([db.prepare('DELETE FROM stripe_connection WHERE id=1'), activityStatement(db, {key: crypto.randomUUID(), action: 'stripe-disconnected', entityType: 'integration', entityId: 'stripe', actorId: operator.id})]);
    return context.json({disconnected: true});
  });
  const webhooks = new Hono();
  // A reader's checkout runs on the creator's own Stripe account with Stripe Tax;
  // Mango never sees card data and never holds funds.
  webhooks.get('/paid/info', async context => {
    const [stored, tier] = await Promise.all([read(), paid.tier()]);
    if (!stored || !tier) return context.json({error: 'paid_tier_unavailable'}, 404);
    try {
      const price = await api('prices/' + encodeURIComponent(tier.priceId), await unseal(stored.key_cipher, platform.config.sessionSigningKey));
      context.header('Cache-Control', 'no-store');
      return context.json(await paidSignupInfo(platform, tier, price));
    } catch {return context.json({error: 'paid_tier_unavailable'}, 503);}
  });
  webhooks.post('/paid/checkout', async context => {
    const body = await limitedBody(context.req.raw).then(JSON.parse).catch(() => null);
    const parsed = z.object({email: z.string().trim().email().max(320), consent: z.literal(true).optional(), disclosure: z.string().max(4096).optional(),
      requestId: z.string().uuid().optional(), website: z.string().max(500).optional(), 'cf-turnstile-response': z.string().max(2048).optional()}).strict().safeParse(body);
    if (!parsed.success) return context.json({error: 'invalid_checkout'}, 400);
    const [stored, tier] = await Promise.all([read(), paid.tier()]);
    if (!stored || !tier) return context.json({error: 'paid_tier_unavailable'}, 409);
    let admitted: Awaited<ReturnType<typeof signupConsent.admit>>;
    try {admitted = await signupConsent.admit(parsed.data, context.req.raw, tier);}
    catch (error) {
      if(error instanceof PaidSignupCapacityError){context.header('Retry-After',String(error.retryAfter));return context.json({error:'rate_limited',reason:error.reason,detail:error.message},429);}
      return context.json({error:'signup_refused',detail:'Review the signup details and verification before continuing.'},400);
    }
    try {
      const session = await create('checkout/sessions', await unseal(stored.key_cipher, platform.config.sessionSigningKey), paid.checkout(tier, parsed.data.email, platform.config.publicBaseUrl.origin), parsed.data.requestId ? await sha256(`${parsed.data.email.toLowerCase()}:${tier.priceId}:${parsed.data.requestId}`) : undefined);
      if (admitted && typeof session.id === 'string' && typeof session.url === 'string' && new URL(session.url).origin === 'https://checkout.stripe.com') await signupConsent.capture(parsed.data, session.id, admitted);
      return typeof session.url === 'string' ? context.json({url: session.url}) : context.json({error: 'checkout_unavailable'}, 502);
    } catch (error) {
      if(error instanceof PaidSignupCapacityError){context.header('Retry-After',String(error.retryAfter));return context.json({error:'rate_limited',reason:error.reason,detail:error.message},429);}
      return context.json({error: 'checkout_unavailable'}, 502);
    }
  });
  webhooks.post('/webhooks/commerce/stripe', async context => {
    const stored = await read();
    if (!stored) return context.json({error: 'stripe_not_connected'}, 409);
    let event;
    try {
      event = await verifyStripe(context.req.raw, await unseal(stored.signing_cipher, platform.config.sessionSigningKey));
      if (event.livemode !== (stored.mode === 'live')) throw new Error('mode');
    } catch {return context.json({error: 'invalid_stripe_signature'}, 401);}
    const readStartedAt = Date.now();
    try {
      const receipt = 'stripe:' + event.id, digest = await sha256(JSON.stringify(event));
      const receiptId = await sha256(receipt);
      const previous = await db.prepare('SELECT digest,stripe_applied_at FROM commerce_receipts WHERE id=?').bind(receiptId).first<{digest: string; stripe_applied_at: number | null}>();
      if (previous && previous.digest !== digest) return context.json({error: 'stripe_event_conflict'}, 409);
      if (previous?.stripe_applied_at != null) return context.body(null, 204);
      const key = await unseal(stored.key_cipher, platform.config.sessionSigningKey);
      const sourceType = stripeEventSource(event.type, event.data.object)?.sourceType ?? 'payment';
      const lookup = (path: string) => api(path, key).catch(error => {
        throw new CommerceWebhookUnreadable(error instanceof Error ? error.message : 'Stripe API request failed.', receipt, sourceType);
      });
      const snapshot = await paid.read(event, lookup);
      if (!snapshot) await paid.failClosed(event, readStartedAt);
      if (!previous) {
        const observed = snapshot && event.type.startsWith('customer.subscription.')
          ? {...event, data: {...event.data, object: {...event.data.object, status: snapshot.subscription.status}}} : event;
        const record = await stripeRecord(observed, lookup);
        if (!record) return context.body(null, 204);
        if (!record.contact && snapshot) {
          const existing = await db.prepare('SELECT contact_id FROM paid_subscriptions WHERE subscription_id=?').bind(snapshot.subscription.id).first<{contact_id: string | null}>();
          if (existing?.contact_id) record.contactId = existing.contact_id;
        }
        await audience.ingestCommerceWebhook({provider: 'stripe', completion: 'delta', adapterCompleted: false, sourceTypes: [record.sourceType], records: [record], receipt: {ids: [receipt], digest}});
      }
      // Paid membership follows the fresh read, including when Stripe deleted the customer.
      const contact = await db.prepare("SELECT contact_id AS id FROM source_records WHERE provider='stripe' AND provider_source_id=?").bind(event.id).first<{id: string | null}>();
      await paid.apply(event, snapshot, contact?.id ?? null, receiptId);
      // Only a fully applied event completes a failed operation for this delivery.
      await operations.recoverDeliveries([receipt], new Date());
      return context.body(null, 204);
    } catch (error) {
      // Uncertain authority cannot preserve paid eligibility. Keep the event
      // retryable, and never overwrite a newer successful observation.
      await paid.failClosed(event, readStartedAt);
      // A verified event whose Stripe read failed is recorded once per event.
      if (error instanceof CommerceWebhookUnreadable) await operations.recordFailedOperation({operation: 'webhook', provider: 'stripe', sourceType: error.sourceType, deliveryKey: error.deliveryKey, error: error.message, now: new Date()});
      return context.json({error: 'stripe_ingestion_failed'}, 422);
    }
  });
  return {settings, webhooks};
}
