import {z} from 'zod';

/** PUB-002: one paid tier on the creator's own Stripe account. Mango stores
 * Stripe ids, states and the tax Stripe reports; never card data or funds. */
export const paidTierSchema = z.object({
  paidTopic: z.string().trim().min(1).max(80), freeTopic: z.string().trim().min(1).max(80),
  priceId: z.string().regex(/^price_[A-Za-z0-9]+$/).max(255), automaticTax: z.literal(true),
}).strict();
export type PaidTier = z.infer<typeof paidTierSchema>;
type StripeObject = Record<string, any>;
type State = 'active' | 'payment-failed' | 'canceled';
// Consent is the contact's own: an active payment adds the paid topic only
// over a subscribed address with confirmed email consent.
const covered = `EXISTS(SELECT 1 FROM contacts c WHERE c.id=p.contact_id AND c.email_status='subscribed')
  AND EXISTS(SELECT 1 FROM consent_evidence e WHERE e.contact_id=p.contact_id AND e.channel='email' AND e.confirmed_at IS NOT NULL)`;

export function createPaidTier(db: D1Database) {
  async function tier(): Promise<PaidTier | null> {
    const row = await db.prepare('SELECT paid_topic AS paidTopic,free_topic AS freeTopic,price_id AS priceId FROM paid_tier WHERE id=1').first<Omit<PaidTier, 'automaticTax'>>();
    return row ? {...row, automaticTax: true} : null;
  }
  return {
    tier,
    save: (value: PaidTier, operator: string, now: number) => db.prepare(`INSERT INTO paid_tier(id,paid_topic,free_topic,price_id,automatic_tax,updated_by,updated_at) VALUES(1,?,?,?,1,?,?)
      ON CONFLICT(id) DO UPDATE SET paid_topic=excluded.paid_topic,free_topic=excluded.free_topic,price_id=excluded.price_id,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
      .bind(value.paidTopic, value.freeTopic, value.priceId, operator, now),
    async readers() {
      const row = await db.prepare(`SELECT
        SUM(CASE WHEN p.state='active' AND ${covered} THEN 1 ELSE 0 END) AS paidTopic,
        SUM(CASE WHEN p.state='active' AND NOT (${covered}) THEN 1 ELSE 0 END) AS consentMissing,
        SUM(CASE WHEN p.state='payment-failed' THEN 1 ELSE 0 END) AS paymentFailed,
        SUM(CASE WHEN p.state='canceled' THEN 1 ELSE 0 END) AS canceled FROM paid_subscriptions p`).first<Record<string, number | null>>();
      return Object.fromEntries(['paidTopic', 'consentMissing', 'paymentFailed', 'canceled'].map(key => [key, Number(row?.[key] ?? 0)]));
    },
    checkout(value: PaidTier, email: string, origin: string) {
      return new URLSearchParams({'mode': 'subscription', 'line_items[0][price]': value.priceId, 'line_items[0][quantity]': '1', 'automatic_tax[enabled]': 'true',
        'customer_email': email, 'success_url': origin + '/subscribe/info', 'cancel_url': origin + '/subscribe',
        'metadata[mango_paid_tier]': '1', 'subscription_data[metadata][mango_paid_tier]': '1'});
    },
    /** Moves a reader between the paid and free topics from a verified Stripe event.
     * Re-applying an event changes nothing, an older event never overrides a newer
     * one, and on a same-second conflict the reader leaves the paid topic. */
    async apply(event: StripeObject, lookup: (path: string) => Promise<StripeObject>, contactId: string | null) {
      const current = await tier();
      if (!current) return;
      const object = event.data.object as StripeObject, type = event.type as string;
      const subscriptionOf = (id: unknown) => typeof id === 'string' ? lookup('subscriptions/' + encodeURIComponent(id)) : Promise.resolve(null);
      let subscription: StripeObject | null, state: State | null, tax: number | null = null, currency: string | null = null;
      if (type === 'checkout.session.completed') {
        if (object.mode !== 'subscription') return;
        subscription = await subscriptionOf(object.subscription);
        state = ['active', 'trialing'].includes(subscription?.status) ? 'active' : null;
        tax = object.total_details?.amount_tax ?? null; currency = object.currency ?? null;
      } else if (type.startsWith('customer.subscription.')) {
        subscription = object;
        state = type.endsWith('.deleted') || ['canceled', 'incomplete_expired'].includes(object.status) ? 'canceled' : ['active', 'trialing'].includes(object.status) ? 'active' : null;
      } else if (type === 'invoice.payment_failed') {
        subscription = await subscriptionOf(object.subscription ?? object.parent?.subscription_details?.subscription);
        // Stripe retries a failed renewal; the reader leaves only once Stripe marks it past due.
        state = ['past_due', 'unpaid'].includes(subscription?.status) ? 'payment-failed' : null;
        tax = typeof object.tax === 'number' ? object.tax : null; currency = object.currency ?? null;
      } else return;
      if (!subscription || !(subscription.metadata?.mango_paid_tier === '1' || subscription.items?.data?.some((item: StripeObject) => item.price?.id === current.priceId))) return;
      const at = event.created * 1000, now = Date.now(), customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
      if (!state || typeof customer !== 'string') {
        await db.prepare('UPDATE paid_subscriptions SET stripe_status=?,updated_at=? WHERE subscription_id=? AND state_at<=?').bind(String(subscription.status ?? ''), now, subscription.id, at).run();
        return;
      }
      await db.prepare(`INSERT INTO paid_subscriptions(subscription_id,customer_id,contact_id,state,stripe_status,tax_amount,currency,state_event_id,state_at,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(subscription_id) DO UPDATE SET contact_id=coalesce(excluded.contact_id,paid_subscriptions.contact_id),
          state=excluded.state,stripe_status=excluded.stripe_status,tax_amount=coalesce(excluded.tax_amount,paid_subscriptions.tax_amount),
          currency=coalesce(excluded.currency,paid_subscriptions.currency),state_event_id=excluded.state_event_id,state_at=excluded.state_at,updated_at=excluded.updated_at
        WHERE excluded.state_at>paid_subscriptions.state_at OR (excluded.state_at=paid_subscriptions.state_at AND excluded.state<>'active')`)
        .bind(subscription.id, customer, contactId, state, String(subscription.status ?? ''), tax, currency, event.id, at, now, now).run();
    },
  };
}
