import {z} from 'zod';
import {readWebhookBytes} from '@/core/platform/adapters/webhook-body';
import {hmacSha256Base64, timingSafeEqual} from '@/core/platform/crypto';
import {sha256} from '@/core/shared/ids';
import type {SourceRecordInput} from '@/core/shared/platform';
import type {WooConnection} from './connection';
import {wooApi} from './http';
import {identifier, object, wooIdentity} from './normalize';
export const pluginEventSchema = z.object({
  version: z.literal(1), id: z.string().uuid(), kind: z.enum(['active_on_site','viewed_product','added_to_cart','started_checkout','abandoned_checkout','privacy_withdrawal']),
  occurredAt: z.string().datetime(), customerId: z.string().regex(/^[1-9]\d{0,30}$/),
  checkoutId: z.string().uuid().optional(), checkoutStartedAt: z.string().datetime().optional(), products: z.array(z.string().regex(/^[1-9]\d{0,30}$/)).max(50),
  consent: z.object({analytics: z.boolean(), marketing: z.boolean()}).strict(), gpc: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.kind !== 'privacy_withdrawal' && (!value.consent.analytics || !value.consent.marketing || value.gpc)) context.addIssue({code:'custom',message:'Observation consent is required.'});
  if (value.kind === 'privacy_withdrawal' && (value.products.length || value.checkoutId || value.checkoutStartedAt)) context.addIssue({code:'custom',message:'Withdrawal cannot contain product or checkout facts.'});
  if (['started_checkout','abandoned_checkout'].includes(value.kind) && (!value.checkoutId || !value.checkoutStartedAt)) context.addIssue({code: 'custom', message: 'Checkout identity is required.'});});
export type PluginEvent = z.infer<typeof pluginEventSchema>;
export async function verifyPluginEvent(request: Request, connection: WooConnection) {
  if (new URL(request.url).protocol !== 'https:' || (request.headers.has('Origin') && new URL(request.headers.get('Origin')!).protocol !== 'https:')) throw new Error('Onsite observations require HTTPS.');
  const timestamp = request.headers.get('X-Mango-Timestamp') ?? '';
  if (!/^\d{10}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error('Plugin signature expired.');
  const raw = new TextDecoder('utf-8', {fatal: true}).decode(await readWebhookBytes(request, 65536));
  const expected = await hmacSha256Base64(connection.signingSecret, 'mango-plugin-v1\n' + timestamp + '.' + raw);
  if (!timingSafeEqual(request.headers.get('X-Mango-Signature') ?? '', expected)) throw new Error('Plugin signature refused.');
  const event = pluginEventSchema.parse(JSON.parse(raw));
  const at = Date.parse(event.occurredAt);
  if (event.checkoutStartedAt && (Date.parse(event.checkoutStartedAt) > at || at-Date.parse(event.checkoutStartedAt) > 7*86400000)) throw new Error('Checkout timing refused.');
  if (at > Date.now() + 60000 || at < Date.now() - 7 * 86400000) throw new Error('Plugin event is outside its relevance window.');
  return {event, receipt: {ids: ['woocommerce:' + connection.id + ':plugin:' + event.id], digest: await sha256(raw), wooConnection: {id: connection.id, generation: connection.generation}}};
}
export async function pluginRecord(event: PluginEvent, connection: WooConnection): Promise<SourceRecordInput> {
  const profile = object((await wooApi(connection)('customers/' + identifier(event.customerId))).value);
  if (identifier(profile.id) !== event.customerId || typeof profile.email !== 'string') throw new Error('Plugin store identity is unavailable.');
  const sourceType = event.checkoutId ? 'cart' : 'browsing-event';
  return {sourceType, sourceId: `woocommerce:${connection.id}:${sourceType}:${event.checkoutId ?? event.id}`, occurredAt: new Date(event.occurredAt), updatedAt: new Date(event.occurredAt),
    payload: {schema: 'woocommerce-observation-v1', eventId: event.id, observation: event.kind, identity: 'woocommerce-signed-logged-in-customer',
      consent: event.consent, gpc: false, customer: {email: profile.email, firstName: profile.first_name, lastName: profile.last_name},
      checkoutId: event.checkoutId ?? null, checkoutStartedAt: event.checkoutStartedAt ?? null, lines: event.products.map(id => ({productId: wooIdentity(connection.id, 'product', id)}))}};
}
