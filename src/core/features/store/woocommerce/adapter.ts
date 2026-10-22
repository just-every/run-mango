import type {CommerceStore, SourceRecordInput} from '@/core/shared/platform';
import {hmacSha256Base64, timingSafeEqual} from '@/core/platform/crypto';
import {readWebhookBytes} from '@/core/platform/adapters/webhook-body';
import {sha256} from '@/core/shared/ids';
import {CommerceWebhookUnreadable} from '../webhook-unreadable';
import type {WooConnection} from './connection';
import {wooApi} from './http';
import {identifier, normalizeWoo, object, type WooObject} from './normalize';
export const wooSources = ['customer', 'product', 'order', 'refund'] as const;
const collections = {customer: 'customers', product: 'products', order: 'orders', refund: 'orders'};
export function createWooCommerceAdapter(connection: WooConnection): CommerceStore {
  const api = wooApi(connection), provider = 'woocommerce:' + connection.id;
  async function refunds(order: WooObject, progress?: () => Promise<void>) {
    const records: SourceRecordInput[] = [];
    for (let page = 1; ; page++) {
      const result = await api(`orders/${identifier(order.id)}/refunds?per_page=100&page=${page}&orderby=id&order=asc`);
      if (!Array.isArray(result.value)) throw new Error('WooCommerce refunds response is malformed.');
      records.push(...result.value.map(value => normalizeWoo('refund', value, connection.id, order)));
      await progress?.();
      const pages = pagination(result.totalPages);
      if (page >= pages) return records;
      if (page >= 10) throw new Error('WooCommerce order refund page limit exceeded; sync is incomplete.');
    }
  }
  function pagination(value: string | null) {
    if (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('WooCommerce pagination is missing.');
    return Number(value);
  }
  return {
    capabilities: () => ({provider, sourceTypes: [...wooSources], detail: 'WooCommerce customers, products, orders and refunds. Onsite tracking and abandoned checkouts are not enabled.'}),
    async refreshHealth(progress) {const result = await api('customers?per_page=1'); if (!Array.isArray(result.value)) throw new Error('WooCommerce customer access is unavailable.'); await progress?.();},
    async synchronize(type, cursor, progress) {
      if (!wooSources.includes(type as any)) throw new Error('WooCommerce source is unavailable.');
      const page = cursor === undefined ? 1 : Number(cursor);
      if (!Number.isSafeInteger(page) || page < 1 || (cursor !== undefined && String(page) !== cursor)) throw new Error('WooCommerce cursor is invalid.');
      const source = type as typeof wooSources[number];
      const result = await api(`${collections[source]}?per_page=10&page=${page}&orderby=id&order=asc`);
      if (!Array.isArray(result.value)) throw new Error('WooCommerce collection is malformed.');
      const records: SourceRecordInput[] = [];
      for (const raw of result.value) {
        if (source === 'refund') records.push(...await refunds(object(raw), progress));
        else records.push(normalizeWoo(source, raw, connection.id));
      }
      await progress?.();
      const pages = pagination(result.totalPages), nextCursor = page < pages ? String(page + 1) : undefined;
      return {records, nextCursor, coverage: {mode: 'snapshot', exhaustive: true, complete: nextCursor === undefined}};
    },
    async verifyWebhook(request) {
      const topic = request.headers.get('X-WC-Webhook-Topic') ?? '';
      const match = /^(customer|product|order)\.(created|updated)$/.exec(topic);
      const source = request.headers.get('X-WC-Webhook-Source'), delivery = request.headers.get('X-WC-Webhook-Delivery-ID');
      if (!match || source?.replace(/\/+$/, '') !== connection.url.replace(/\/+$/, '') || !delivery || !/^[A-Za-z0-9_-]{1,128}$/.test(delivery)) throw new Error('WooCommerce webhook source or topic refused.');
      const raw = new TextDecoder('utf-8', {fatal: true}).decode(await readWebhookBytes(request, 1048576));
      if (!timingSafeEqual(request.headers.get('X-WC-Webhook-Signature') ?? '', await hmacSha256Base64(connection.signingSecret, raw))) throw new Error('WooCommerce webhook signature refused.');
      // Woo signs only the body. A secret exclusive to this connection is required;
      // read the object from this store instead of trusting unsigned topic fields.
      const value = object(JSON.parse(raw)), id = identifier(value.id), type = match[1] as 'customer'|'product'|'order';
      const receiptId = `${provider}:delivery:${delivery}`, digest = await sha256(topic + '\n' + raw);
      let records: SourceRecordInput[];
      try {
        const current = object((await api(`${collections[type]}/${id}`)).value);
        if (identifier(current.id) !== id) throw new Error('WooCommerce object identity changed.');
        records = [normalizeWoo(type, current, connection.id)];
        if (type === 'order') records.push(...await refunds(current));
      } catch (error) {throw new CommerceWebhookUnreadable(error instanceof Error ? error.message : 'WooCommerce read failed.', receiptId, type);}
      return {...records[0], records, rawBody: '', receivedAt: new Date(), receipt: {ids: [receiptId], digest}};
    },
  };
}
