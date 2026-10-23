import {readPaidState, type PaidSnapshot} from './paid-state';
import {z} from 'zod';

/** PUB-002: one paid tier on the creator's own Stripe account. Mango stores
 * Stripe ids, states and the tax Stripe reports; never card data or funds. */
export const paidTierSchema = z.object({
  paidTopic: z.string().trim().min(1).max(80), freeTopic: z.string().trim().min(1).max(80),
  priceId: z.string().regex(/^price_[A-Za-z0-9]+$/).max(255), automaticTax: z.literal(true),
}).strict();
export type PaidTier = z.infer<typeof paidTierSchema>;
type StripeObject = Record<string, any>;
export function createPaidTier(db: D1Database, hasConsent?: (contactId: string) => Promise<boolean>) {
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
      if (!hasConsent) throw new Error('Paid reader counts require channel consent authority.');
      const rows = await db.prepare(`SELECT p.state,p.contact_id,p.stripe_status,json_extract(s.payload,'$.eventType') AS event_type
        FROM paid_subscriptions p LEFT JOIN source_records s ON s.provider='stripe' AND s.provider_source_id=p.state_event_id`).all<{state: string; contact_id: string | null; stripe_status: string | null; event_type: string | null}>();
      const counts = {paidTopic: 0, consentMissing: 0, paymentFailed: 0, statusUnconfirmed: 0, canceled: 0};
      for (const row of rows.results) {
        if (row.state === 'active') counts[row.contact_id && await hasConsent(row.contact_id) ? 'paidTopic' : 'consentMissing']++;
        else if (row.state === 'payment-failed') counts[row.stripe_status !== 'unverified' && row.event_type === 'invoice.payment_failed' ? 'paymentFailed' : 'statusUnconfirmed']++;
        else if (row.state === 'canceled') counts.canceled++;
      }
      return counts;
    },
    checkout(value: PaidTier, email: string, origin: string) {
      return new URLSearchParams({'mode': 'subscription', 'line_items[0][price]': value.priceId, 'line_items[0][quantity]': '1', 'automatic_tax[enabled]': 'true',
        'payment_method_types[0]': 'card', 'customer_email': email, 'success_url': origin + '/subscribe?paid=1&returned=1', 'cancel_url': origin + '/subscribe?paid=1',
        'metadata[mango_paid_tier]': '1', 'subscription_data[metadata][mango_paid_tier]': '1'});
    },
    async failClosed(event: StripeObject, readAt: number) {
      const object = event.data.object;
      const id = event.type.startsWith('customer.subscription.') ? object.id
        : event.type === 'checkout.session.completed' && object.mode === 'subscription' ? object.subscription
        : ['invoice.payment_failed', 'invoice.paid'].includes(event.type) ? object.subscription ?? object.parent?.subscription_details?.subscription : null;
      if (typeof id !== 'string') return;
      await db.prepare(`UPDATE paid_subscriptions SET state='payment-failed',stripe_status='unverified',read_started_at=?,updated_at=?
        WHERE subscription_id=? AND read_started_at<=?`).bind(readAt, Date.now(), id, readAt).run();
    },
    async read(event: StripeObject, lookup: (path: string) => Promise<StripeObject>) {
      const current = await tier();
      return current ? readPaidState(event, current.priceId, lookup) : null;
    },
    /** Paid state and its application receipt commit together. A completed event
     * is inert on replay, even after another event changes the subscription. */
    async apply(event: StripeObject, snapshot: PaidSnapshot | null, contactId: string | null, receiptId: string) {
      const statements: D1PreparedStatement[] = [];
      if (snapshot) {
        const {subscription, readAt, state, tax, currency} = snapshot;
        const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
        if (typeof customer !== 'string') throw new Error('Stripe subscription customer is unavailable.');
        statements.push(db.prepare(`INSERT INTO paid_subscriptions(subscription_id,customer_id,contact_id,state,stripe_status,tax_amount,currency,state_event_id,state_at,read_started_at,created_at,updated_at)
          SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM commerce_receipts WHERE id=? AND stripe_applied_at IS NULL)
          ON CONFLICT(subscription_id) DO UPDATE SET contact_id=coalesce(excluded.contact_id,paid_subscriptions.contact_id),
            state=excluded.state,stripe_status=excluded.stripe_status,tax_amount=coalesce(excluded.tax_amount,paid_subscriptions.tax_amount),
            currency=coalesce(excluded.currency,paid_subscriptions.currency),state_event_id=excluded.state_event_id,state_at=excluded.state_at,
            read_started_at=excluded.read_started_at,updated_at=excluded.updated_at
          WHERE excluded.read_started_at>paid_subscriptions.read_started_at
            OR (excluded.read_started_at=paid_subscriptions.read_started_at AND excluded.state<>'active')`)
          .bind(subscription.id, customer, contactId, state, String(subscription.status ?? ''), tax, currency, event.id, readAt, readAt, Date.now(), Date.now(), receiptId));
      }
      statements.push(db.prepare('UPDATE commerce_receipts SET stripe_applied_at=? WHERE id=? AND stripe_applied_at IS NULL').bind(Date.now(), receiptId));
      await db.batch(statements);
    },
  };
}
