import type {DecisionRuntime} from './runtime';

/** Owned historic campaigns include an unsuccessful recipient and a zero-revenue campaign. */
export async function history(runtime:DecisionRuntime) {
  const db=runtime.db,at=Date.now()-10*86400000;
  const writes:D1PreparedStatement[]=[];
  for(let campaign=0;campaign<3;campaign++) {
    writes.push(db.prepare("INSERT INTO campaigns(id,state,created_at,updated_at) VALUES (?,'completed',?,?)").bind(`history-${campaign}`,at,at));
    for(let index=0;index<8;index++) {
      const id=`historic-${campaign}-${index}`;
      writes.push(db.prepare(`INSERT INTO recipient_steps(id,campaign_id,revision_id,step_id,contact_id,contact_identity_key,channel,destination,idempotency_key,transport_disposition,send_by_at,created_at,updated_at) VALUES (?,?,?,?,?,?,'email',?,?,?, ?,?,?)`).bind(id,`history-${campaign}`,`old-revision-${campaign}`,`old-step-${campaign}`,id,id,`${id}@example.test`,id,index===0?'failed':'delivered',at,at,at));
    }
  }
  for(let index=0;index<3;index++) {
    const event=`historic-order-${index}`,recipient=`historic-${index%2}-${index}`;
    writes.push(db.prepare(`INSERT INTO source_records(id,provider,source_type,provider_source_id,occurred_at,payload,payload_digest,created_at,updated_at) VALUES (?,'shopify','order',?,?,?,'fixture',?,?)`).bind(event,event,at,JSON.stringify({totalMinor:1000,currency:'USD'}),at,at));
    writes.push(db.prepare(`INSERT INTO attribution_facts(id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,refund_amount_minor,currency,attributed_at,created_at,updated_at) VALUES (?,?,?,?,?,7,1000,200,'USD',?,?,?)`).bind(`attribution-${index}`,event,`history-${index%2}`,recipient,`click-${index}`,at+1000,at,at));
  }
  await db.batch(writes);
  // Imported order history is available to the generation evidence selection too.
  await db.prepare("INSERT INTO commerce_source_capabilities(id,source_type,available,detail,updated_at) VALUES ('history-order-capability','order',1,'Fixture own history',?)").bind(Date.now()).run();
  await db.prepare("INSERT INTO source_syncs(id,source_type,last_successful_at,created_at,updated_at) VALUES ('history-order-sync','order',?,?,?)").bind(Date.now(),Date.now(),Date.now()).run();
}
