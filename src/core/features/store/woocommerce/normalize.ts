import type {SourceRecordInput} from '@/core/shared/platform';
import {moneyMinor} from '@/core/features/insights/commerce-money';
export type WooObject = Record<string, any>;
export function object(value: unknown): WooObject {if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('WooCommerce record is malformed.'); return value as WooObject;}
export function identifier(value: unknown): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === 'string' && /^[1-9]\d{0,30}$/.test(value)) return value;
  throw new Error('WooCommerce source identity is invalid.');
}
function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z?$/.test(value)) throw new Error('WooCommerce UTC occurrence time is missing.');
  const parsed = new Date(value.endsWith('Z') ? value : value + 'Z');
  if (!Number.isFinite(parsed.getTime())) throw new Error('WooCommerce UTC occurrence time is invalid.');
  return parsed.toISOString();
}
const text = (value: unknown) => typeof value === 'string' ? value : '';
export function wooIdentity(connectionId: string, type: string, id: unknown) {return `woocommerce:${connectionId}:${type}:${identifier(id)}`;}
export function normalizeWoo(type: 'customer'|'product'|'order'|'refund', raw: unknown, connectionId: string, parent?: WooObject): SourceRecordInput {
  const value = object(raw), id = wooIdentity(connectionId, type, value.id);
  const createdAt = date(value.date_created_gmt), updatedAt = date(value.date_modified_gmt ?? value.date_created_gmt);
  const profile = type === 'customer' ? value : parent?.billing ?? value.billing;
  const customer = profile && typeof profile.email === 'string' && profile.email ? {email: profile.email, firstName: text(profile.first_name), lastName: text(profile.last_name)} : undefined;
  const lines = (input: unknown) => {
    if (!Array.isArray(input)) throw new Error('WooCommerce order lines are missing.');
    return input.map(rawLine => {const line = object(rawLine); if (!Number.isSafeInteger(line.quantity)) throw new Error('WooCommerce line quantity is invalid.'); return {
      id: wooIdentity(connectionId, 'line', line.id), productId: wooIdentity(connectionId, 'product', line.product_id), quantity: line.quantity, name: text(line.name),
    };});
  };
  let payload: WooObject = {schema: 'woocommerce-record-v1', id, createdAt, updatedAt};
  if (type === 'customer') payload = {...payload, ...customer};
  if (type === 'product') payload = {...payload, title: text(value.name), status: text(value.status), url: text(value.permalink),
    categories: Array.isArray(value.categories) ? value.categories.map((item: WooObject) => ({id: wooIdentity(connectionId, 'category', item.id), name: text(item.name)})) : []};
  if (type === 'order') {
    const currency = text(value.currency), total = text(value.total); moneyMinor({amount: total, currency});
    const paid = value.date_paid_gmt ? date(value.date_paid_gmt) : null;
    payload = {...payload, customer, status: text(value.status), currency, total, paidAt: paid,
      lines: lines(value.line_items), refunds: Array.isArray(value.refunds) ? value.refunds.map((r: WooObject) => ({id: wooIdentity(connectionId, 'refund', r.id), total: text(r.total)})) : []};
  }
  if (type === 'refund') {
    if (!parent) throw new Error('WooCommerce refund requires its order.');
    const currency = text(parent.currency), amount = text(value.amount); moneyMinor({amount, currency});
    payload = {...payload, customer, orderId: wooIdentity(connectionId, 'order', parent.id), amount, currency, paymentRefundedViaApi: value.refunded_payment === true, lines: lines(value.line_items)};
  }
  // Never persist the original API object: order keys, recovery/payment URLs,
  // addresses, notes, IPs, agent strings and arbitrary metadata stay at the edge.
  return {sourceType: type, sourceId: id, occurredAt: new Date(createdAt), updatedAt: new Date(updatedAt), payload};
}
