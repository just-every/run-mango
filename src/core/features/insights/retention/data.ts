import type { RetentionDatabase, RetentionOrder } from './types';

type OrderRow = {
  id: string; contactId: string; contactName:string; purchasedAt: number; currency: string;
  gross: number; reversed: number; payload: string; refundPayloads: string; source: string | null; form: string | null;
};

/** The financial projection owns paid/test/cancellation/refund truth. No send or
 * attribution fact is used to infer a purchase. One SQL statement reads a single
 * database snapshot, including the first recorded acquisition evidence. */
export async function readOrders(database: RetentionDatabase, now: Date): Promise<RetentionOrder[]> {
  const db = '$client' in database ? database.$client : database;
  const result = await db.prepare(`WITH purchases AS (
    SELECT o.*,c.display_name contactName,a.reversed_minor FROM commerce_orders o
    JOIN commerce_order_amounts a ON a.provider_order_id=o.provider_order_id
    JOIN contacts c ON c.id=o.contact_id
    WHERE o.qualifying=1 AND o.cancelled_at IS NULL AND o.financial_status<>'VOIDED'
      AND o.gross_amount_minor>a.reversed_minor AND o.purchased_at<=?1
  ), first_orders AS (SELECT contact_id,MIN(purchased_at) first_at FROM purchases GROUP BY contact_id),
  captures AS (
    SELECT e.contact_id,e.capture_method,e.capture_source,
      ROW_NUMBER() OVER(PARTITION BY e.contact_id ORDER BY e.occurred_at,e.id) position
    FROM consent_evidence e JOIN first_orders f ON f.contact_id=e.contact_id
    WHERE e.occurred_at<=f.first_at
  ), origins AS (
    SELECT s.contact_id,s.provider,ROW_NUMBER() OVER(PARTITION BY s.contact_id ORDER BY s.occurred_at,s.id) position
    FROM source_records s JOIN first_orders f ON f.contact_id=s.contact_id
    WHERE s.source_type='customer' AND s.occurred_at<=f.first_at
  ) SELECT o.provider_order_id id,o.contact_id contactId,o.contactName,o.purchased_at purchasedAt,o.currency,
    o.gross_amount_minor gross,o.reversed_minor reversed,s.payload,
    (SELECT json_group_array(fs.payload) FROM commerce_refunds f JOIN source_records fs ON fs.id=f.source_record_id
      WHERE f.provider_order_id=o.provider_order_id AND fs.source_type='refund' AND f.amount_minor>0) refundPayloads,
    CASE WHEN e.contact_id IS NOT NULL THEN e.capture_method||': '||e.capture_source ELSE g.provider END source,
    CASE WHEN instr(lower(e.capture_method),'form')>0 OR instr(lower(e.capture_method),'popup')>0
      OR instr(lower(e.capture_method),'landing')>0 OR instr(lower(e.capture_method),'kiosk')>0
      THEN e.capture_source ELSE NULL END form
    FROM purchases o JOIN source_records s ON s.id=o.source_record_id
    LEFT JOIN captures e ON e.contact_id=o.contact_id AND e.position=1
    LEFT JOIN origins g ON g.contact_id=o.contact_id AND g.position=1
    ORDER BY o.contact_id,o.purchased_at,o.provider_order_id`).bind(now.getTime()).all<OrderRow>();
  return result.results.map(row => ({id: row.id, contactId: row.contactId, contactName:row.contactName, purchasedAt: row.purchasedAt,
    currency: row.currency, grossMinor: BigInt(row.gross), reversedMinor: BigInt(row.reversed),
    netMinor: BigInt(row.gross) - BigInt(row.reversed), products: retainedProducts(row.payload, row.refundPayloads),
    source: row.source, form: row.form}));
}

function retainedProducts(payload: string, refundPayloads: string): string[] {
  const value: unknown = JSON.parse(payload);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Order source payload is not an object.');
  const order = value as Record<string, unknown>;
  if (!Array.isArray(order.lines)) throw new Error('Order product lines are missing.');
  const quantities = new Map<string, { product: string; quantity: number }>();
  for (const raw of order.lines) {
    const line = raw as Record<string, unknown>;
    if (typeof line.id !== 'string' || typeof line.quantity !== 'number') throw new Error('Order product line identity or quantity is missing.');
    if (line.productId === null) continue; // Deleted catalogue products have no product identity.
    if (typeof line.productId !== 'string') throw new Error('Order product identity is missing.');
    quantities.set(line.id, {product: line.productId, quantity: line.quantity});
  }
  if (!Array.isArray(order.refunds)) throw new Error('Order refund product lines are missing.');
  const refunds = new Map<string, Record<string, unknown>>();
  const standalone: unknown = JSON.parse(refundPayloads);
  if (!Array.isArray(standalone)) throw new Error('Refund source payloads are invalid.');
  for (const raw of [...order.refunds, ...standalone.map((item: string) => JSON.parse(item))]) {
    const refund = raw as Record<string, unknown>;
    if (typeof refund.id !== 'string') throw new Error('Refund source identity is missing.');
    const previous = refunds.get(refund.id);
    if (!previous || String(refund.updatedAt) >= String(previous.updatedAt)) refunds.set(refund.id, refund);
  }
  for (const refund of refunds.values()) {
    if (refund.financialState !== 'SUCCESS') continue;
    if (!Array.isArray(refund.lines)) throw new Error('Successful refund product lines are missing.');
    for (const rawLine of refund.lines) {
      const refunded = rawLine as { line?: { id?: string }; quantity?: number };
      const line = refunded.line?.id ? quantities.get(refunded.line.id) : undefined;
      if (line && typeof refunded.quantity === 'number') line.quantity = Math.max(0, line.quantity - refunded.quantity);
    }
  }
  return [...new Set([...quantities.values()].filter(line => line.quantity > 0).map(line => line.product))].sort();
}
