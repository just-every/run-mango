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
export async function stripeRecord(event: ObjectValue, customer: (id: string) => Promise<ObjectValue>): Promise<NormalizedCommerceRecord | null> {
  const object = event.data.object as ObjectValue, type = event.type as string;
  let sourceType: CommerceSourceType, state = type;
  if (type.startsWith('customer.subscription.')) {
    sourceType = 'subscription';
    state = type.endsWith('.deleted') ? 'subscription.canceled' : type.endsWith('.created') ? 'subscription.started' : object.status === 'past_due' ? 'subscription.past_due' : 'subscription.updated';
  } else if (type.startsWith('customer.')) sourceType = 'customer';
  else if (type.startsWith('checkout.session.')) sourceType = 'checkout-session';
  else if (type.startsWith('refund.') || type === 'charge.refunded') sourceType = 'refund';
  else if (type.startsWith('payment_intent.') || type.startsWith('charge.') || type.startsWith('invoice.')) {
    sourceType = 'payment';
    if (type === 'invoice.paid' || type === 'invoice.payment_succeeded') state = object.billing_reason === 'subscription_cycle' ? 'subscription.renewed' : 'payment.succeeded';
    else if (type === 'invoice.payment_failed') state = 'subscription.past_due';
    else if (type === 'payment_intent.succeeded' || type === 'charge.succeeded') state = 'payment.succeeded';
  } else return null;
  const customerId = sourceType === 'customer' ? object.id : typeof object.customer === 'string' ? object.customer : object.customer?.id;
  let profile: ObjectValue = sourceType === 'customer' ? object : typeof object.customer === 'object' && object.customer ? object.customer : object.customer_details ?? {};
  if (!profile.email && customerId) profile = await customer(customerId);
  if (!profile.email && object.customer_email) profile = {...profile, email: object.customer_email};
  // Persist only event facts, never the provider object (which can contain client secrets and URLs).
  return {sourceType, providerSourceId: event.id, occurredAt: new Date(event.created * 1000),
    payload: {eventType: type, objectId: object.id, customerId: customerId ?? null, state, livemode: event.livemode,
      amount: object.amount_received ?? object.amount_paid ?? object.amount_total ?? object.amount ?? null, currency: object.currency ?? null},
    contact: typeof profile.email === 'string' ? {email: profile.email, displayName: typeof profile.name === 'string' ? profile.name : undefined} : undefined,
    activity: {kind: sourceType, state}};
}
