import {timingSafeEqual} from '@/core/platform/crypto';
import type {NormalizedCommerceRecord, CommerceSourceType} from '../service';
export const stripeSources = ['customer', 'payment', 'checkout-session', 'subscription', 'refund'] as const;
type ObjectValue = Record<string, any>;
export async function verifyStripe(request: Request, secret: string, now = Date.now()) {
  const header = request.headers.get('stripe-signature') ?? '';
  const parts = header.split(',').map(value => value.trim().split('='));
  const timestamps = parts.filter(([name]) => name === 't');
  const timestamp = timestamps[0]?.[1] ?? '';
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) throw new Error('signature');
  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength > 1048576) throw new Error('size');
  const prefix = new TextEncoder().encode(timestamp + '.');
  const signed = new Uint8Array(prefix.length + body.length); signed.set(prefix); signed.set(body, prefix.length);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, signed));
  const expected = [...signature].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (!parts.some(([name, value]) => name === 'v1' && /^[a-f0-9]{64}$/.test(value ?? '') && timingSafeEqual(value, expected))) throw new Error('signature');
  const event = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(body));
  if (typeof event.id !== 'string' || !event.id.startsWith('evt_') || typeof event.type !== 'string' || !Number.isSafeInteger(event.created) || typeof event.livemode !== 'boolean' || !event.data?.object?.id) throw new Error('shape');
  return event as ObjectValue;
}
/** The recorded source type and lifecycle state of a Stripe event, or null when it is not recorded. */
export function stripeEventSource(type: string, object: ObjectValue): {sourceType: Extract<CommerceSourceType, typeof stripeSources[number]>; state: string} | null {
  if (type.startsWith('customer.subscription.')) return {sourceType: 'subscription',
    state: type.endsWith('.deleted') ? 'subscription.canceled' : object.status === 'past_due' ? 'subscription.past_due' : type.endsWith('.created') ? 'subscription.started' : 'subscription.updated'};
  if (type.startsWith('customer.')) return {sourceType: 'customer', state: type};
  if (type.startsWith('checkout.session.')) return {sourceType: 'checkout-session', state: type};
  if (type.startsWith('refund.') || type === 'charge.refunded') return {sourceType: 'refund', state: type};
  if (type.startsWith('payment_intent.') || type.startsWith('charge.') || type.startsWith('invoice.')) {
    if (type === 'invoice.paid' || type === 'invoice.payment_succeeded') return {sourceType: 'payment', state: object.billing_reason === 'subscription_cycle' ? 'subscription.renewed' : 'payment.succeeded'};
    if (type === 'invoice.payment_failed') return {sourceType: 'payment', state: 'invoice.payment_failed'};
    return {sourceType: 'payment', state: type === 'payment_intent.succeeded' || type === 'charge.succeeded' ? 'payment.succeeded' : type};
  }
  return null;
}
export async function stripeRecord(event: ObjectValue, lookup: (path: string) => Promise<ObjectValue>): Promise<NormalizedCommerceRecord | null> {
  const object = event.data.object as ObjectValue, type = event.type as string;
  const source = stripeEventSource(type, object);
  if (!source) return null;
  const {sourceType, state} = source;
  let customerId = sourceType === 'customer' ? object.id : typeof object.customer === 'string' ? object.customer : object.customer?.id;
  let profile: ObjectValue = sourceType === 'customer' ? object : typeof object.customer === 'object' && object.customer ? object.customer : object.customer_details ?? {};
  // Refund payloads identify their charge/payment intent, not their customer.
  // Resolve that provider relationship before importing the contact identity.
  if (sourceType === 'refund' && !customerId) {
    const related = typeof object.charge === 'string' ? await lookup('charges/' + encodeURIComponent(object.charge))
      : object.charge && typeof object.charge === 'object' ? object.charge
        : typeof object.payment_intent === 'string' ? await lookup('payment_intents/' + encodeURIComponent(object.payment_intent)) : null;
    customerId = typeof related?.customer === 'string' ? related.customer : related?.customer?.id;
    if (related?.customer && typeof related.customer === 'object') profile = related.customer;
  }
  if (!profile.email && customerId) profile = await lookup('customers/' + encodeURIComponent(customerId));
  if (!profile.email && object.customer_email) profile = {...profile, email: object.customer_email};
  // Persist only event facts, never the provider object (which can contain client secrets and URLs).
  return {sourceType, providerSourceId: event.id, occurredAt: new Date(event.created * 1000),
    payload: {eventType: type, objectId: object.id, customerId: customerId ?? null, state, livemode: event.livemode,
      amount: object.amount_received ?? object.amount_paid ?? object.amount_total ?? object.amount ?? null, currency: object.currency ?? null},
    contact: typeof profile.email === 'string' ? {email: profile.email, displayName: typeof profile.name === 'string' ? profile.name : undefined} : undefined,
    activity: {kind: sourceType, state}};
}
