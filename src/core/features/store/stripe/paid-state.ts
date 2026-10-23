type StripeObject = Record<string, any>;
export type PaidSnapshot = {subscription: StripeObject; readAt: number; state: 'active' | 'payment-failed' | 'canceled'; tax: number | null; currency: string | null};

/** Events are notifications to read current authority, never payment authority
 * themselves. Starting the read orders overlapping requests conservatively:
 * an older slow response cannot restore access after a newer observation. */
export async function readPaidState(event: StripeObject, priceId: string, lookup: (path: string) => Promise<StripeObject>): Promise<PaidSnapshot | null> {
  const object = event.data.object as StripeObject, type = event.type as string;
  let id: unknown;
  if (type.startsWith('customer.subscription.')) id = object.id;
  else if (type === 'checkout.session.completed' && object.mode === 'subscription') id = object.subscription;
  else if (type === 'invoice.payment_failed' || type === 'invoice.paid') id = object.subscription ?? object.parent?.subscription_details?.subscription;
  else return null;
  if (typeof id !== 'string') return null;
  const readAt = Date.now();
  const subscription = await lookup('subscriptions/' + encodeURIComponent(id));
  if (subscription.id !== id) throw new Error('Stripe subscription identity did not match.');
  if (!(subscription.metadata?.mango_paid_tier === '1' || subscription.items?.data?.some((item: StripeObject) => item.price?.id === priceId))) return null;
  const status = subscription.status;
  const state = status === 'active' || status === 'trialing' ? 'active'
    : status === 'canceled' || status === 'incomplete_expired' ? 'canceled' : 'payment-failed';
  return {subscription, readAt, state,
    tax: type === 'checkout.session.completed' ? object.total_details?.amount_tax ?? null : typeof object.tax === 'number' ? object.tax : null,
    currency: typeof object.currency === 'string' ? object.currency : null};
}
