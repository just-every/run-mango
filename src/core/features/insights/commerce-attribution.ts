import type { Database } from '@/core/platform/db/client';
import { stableJson } from '@/core/shared/ids';
import { shopMoney } from './commerce-money';

type Input = {sourceRecordId:string;sourceType:string;providerSourceId:string;contactId?:string|null;payload:Record<string,unknown>;occurredAt:Date;updatedAt:Date};
function instant(value:unknown, label:string) {
  if(typeof value!=='string' || !Number.isFinite(Date.parse(value))) throw new Error(`Missing commerce ${label}.`);
  return Date.parse(value);
}
function currencyGuard(db:Database,input:Input,table:'commerce_orders'|'commerce_refunds',orderId:string,currency:string) {
  // Run with the accepted source, identity and receipt writes in their D1 batch.
  // A missing parent may arrive later; that order checks existing orphan refunds.
  return db.$client.prepare(`INSERT INTO commerce_transaction_guard(valid) SELECT 0
    WHERE EXISTS(SELECT 1 FROM source_records WHERE id=? AND payload=? AND contact_id IS ?)
      AND EXISTS(SELECT 1 FROM ${table} WHERE provider_order_id=? AND currency<>?)`)
    .bind(input.sourceRecordId,stableJson(input.payload),input.contactId??null,orderId,currency);
}
function refundStatements(db:Database,input:Input,value:Record<string,unknown>,parentCurrency?:string) {
  if(typeof value.id!=='string'||typeof value.orderId!=='string') throw new Error('Refund requires original refund and order identities.');
  const money=shopMoney(value.total), at=instant(value.createdAt,'refund time');
  if(parentCurrency!==undefined&&money.currency!==parentCurrency) throw new Error('Order and refund shop currencies disagree.');
  if(!Array.isArray(value.transactions)) throw new Error('Refund transactions are missing.');
  let successful=0n;
  const seen=new Set<string>();
  for(const raw of value.transactions) {
    const tx=raw as Record<string,unknown>;
    if(typeof tx.id!=='string'||seen.has(tx.id)) throw new Error('Refund transaction identity is missing or duplicated.');
    seen.add(tx.id);
    if(tx.kind!=='REFUND') continue;
    const amount=shopMoney(tx.amount);
    if(amount.currency!==money.currency) throw new Error('Refund transaction currencies disagree.');
    if(tx.status==='SUCCESS'&&tx.test===false)successful+=BigInt(amount.amountMinor);
  }
  if(successful>BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Refund amount exceeds safe integer precision.');
  const updated=instant(value.updatedAt,'refund update');
  const statement=db.$client.prepare(`INSERT INTO commerce_refunds (provider_refund_id,provider_order_id,source_record_id,contact_id,financial_state,original_amount_minor,amount_minor,currency,occurred_at,updated_at)
    SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM source_records WHERE id=? AND payload=? AND contact_id IS ?)
    ON CONFLICT(provider_refund_id) DO UPDATE SET source_record_id=excluded.source_record_id,contact_id=COALESCE(excluded.contact_id,commerce_refunds.contact_id),financial_state=excluded.financial_state,original_amount_minor=excluded.original_amount_minor,amount_minor=excluded.amount_minor,currency=excluded.currency,occurred_at=excluded.occurred_at,updated_at=excluded.updated_at WHERE excluded.updated_at>=commerce_refunds.updated_at`)
    .bind(value.id,value.orderId,input.sourceRecordId,input.contactId??null,String(value.financialState??'UNKNOWN'),money.amountMinor,Number(successful),money.currency,at,updated,input.sourceRecordId,stableJson(input.payload),input.contactId??null);
  return [currencyGuard(db,input,'commerce_orders',value.orderId,money.currency),statement];
}
/** Append to the source/activity transaction, after its canonical source upsert. The
 * source payload guard makes stale ingestion and lost leases unable to change money.
 * SQL triggers reconcile on source changes AND late click indexing. */
export function commerceAttributionStatements(db:Database,input:Input):D1PreparedStatement[] {
  const p=input.payload;
  if(!['shopify-commerce-v1','woocommerce-commerce-v1'].includes(String(p.schema))||!['order','refund'].includes(input.sourceType)) return [];
  if(input.sourceType==='refund') return refundStatements(db,input,p);
  if(typeof p.test!=='boolean'||typeof p.financialStatus!=='string') throw new Error('Order financial status is missing.');
  const total=shopMoney(p.total), received=shopMoney(p.received), refunded=shopMoney(p.refunded);
  if(total.currency!==received.currency||total.currency!==refunded.currency) throw new Error('Order money currencies disagree.');
  const purchasedAt=instant(p.processedAt??p.createdAt,'purchase time');
  const cancelledAt=p.cancelledAt===null?null:instant(p.cancelledAt,'cancellation time');
  const qualifying=!p.test && ['PAID','PARTIALLY_PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(p.financialStatus) && received.amountMinor>0;
  // Part-paid orders attribute only cash actually received. Cancellation reverses
  // that amount; unpaid/authorized/voided/test orders never create revenue.
  const statement=db.$client.prepare(`INSERT INTO commerce_orders (source_record_id,provider_order_id,contact_id,purchased_at,gross_amount_minor,reported_refund_minor,currency,qualifying,was_qualifying,financial_status,cancelled_at,cancellation_reason,updated_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM source_records WHERE id=? AND payload=? AND contact_id IS ?)
    ON CONFLICT(provider_order_id) DO UPDATE SET source_record_id=excluded.source_record_id,contact_id=excluded.contact_id,purchased_at=excluded.purchased_at,gross_amount_minor=CASE WHEN excluded.qualifying=0 THEN commerce_orders.gross_amount_minor ELSE excluded.gross_amount_minor END,reported_refund_minor=excluded.reported_refund_minor,currency=excluded.currency,qualifying=excluded.qualifying,was_qualifying=MAX(commerce_orders.was_qualifying,excluded.was_qualifying),financial_status=excluded.financial_status,cancelled_at=excluded.cancelled_at,cancellation_reason=excluded.cancellation_reason,updated_at=excluded.updated_at WHERE excluded.updated_at>=commerce_orders.updated_at`)
    .bind(input.sourceRecordId,input.providerSourceId,input.contactId??null,purchasedAt,Math.min(total.amountMinor,received.amountMinor),refunded.amountMinor,total.currency,qualifying?1:0,qualifying?1:0,p.financialStatus,cancelledAt,typeof p.cancelReason==='string'?p.cancelReason:null,input.updatedAt.getTime(),input.sourceRecordId,stableJson(p),input.contactId??null);
  return [currencyGuard(db,input,'commerce_refunds',input.providerSourceId,total.currency),statement,...(Array.isArray(p.refunds)?p.refunds.flatMap(r=>refundStatements(db,input,r as Record<string,unknown>,total.currency)):[])];
}
