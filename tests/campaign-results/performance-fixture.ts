import {sha256} from '../../src/core/shared/ids';
/** Purchases recorded after the journey's genuine redirects. Attribution remains
 * owned by the application's existing order/click database projections. */
export async function seedPerformanceOrders(db:D1Database) {
  await db.prepare("DELETE FROM commerce_orders WHERE provider_order_id LIKE 'performance-%'").run();
  await db.prepare("DELETE FROM source_records WHERE id LIKE 'performance-%'").run();
  const now=Date.now();
  await db.prepare("UPDATE recipient_steps SET handoff_started_at=?,handed_off_at=?,provider_accepted_at=? WHERE campaign_id='orchard-letter' AND contact_id IN ('ada','chris')").bind(now-86400000,now-86400000,now-86400000).run();
  for(const [suffix,person,gross,refund,currency] of [['linen','ada',10000,2000,'USD'],['returned','ada',5000,5000,'USD'],['ceramics','chris',1200,200,'JPY']] as const) {
    const id=`performance-${suffix}`,payload=JSON.stringify({id,lines:[],refunds:[]});
    await db.prepare("INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,payload,occurred_at,provider_updated_at,payload_digest,created_at,updated_at) VALUES(?,'shopify','order',?,?,?,?,?,?,?,?)").bind(id,id,person,payload,now,now,await sha256(payload),now,now).run();
    await db.prepare("INSERT INTO commerce_orders(source_record_id,provider_order_id,contact_id,purchased_at,gross_amount_minor,reported_refund_minor,currency,qualifying,financial_status,cancelled_at,updated_at) VALUES(?,?,?,?,?,?,?,1,'PAID',NULL,?)").bind(id,id,person,now,gross,refund,currency,now).run();
  }
  return {ok:true};
}
