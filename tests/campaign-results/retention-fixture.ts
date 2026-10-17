import { sha256 } from '../../src/core/shared/ids';
import { createDatabase } from '../../src/core/platform/db/client';
import { consentEvidence } from '../../src/core/features/audience/schema';
/** Stored commerce facts for the retention acceptance journey, never application data. */
export async function seedRetention(db:D1Database) {
  const now=Date.now(),day=86400000;
  const profiles=[['iris','Iris Dawson',5,5],['luis','Luis Moreno',1,10],['maya','Maya Chen',3,60],['noah','Noah Brooks',2,120],['opal','Opal Bennett',4,210]] as const;
  // Retention reports on every recorded order, so this fixture owns the whole order population;
  // purchases seeded by earlier journeys in the same runtime must not join it.
  await db.prepare('DELETE FROM commerce_refunds').run();
  await db.prepare('DELETE FROM commerce_orders').run();
  await db.prepare("DELETE FROM source_records WHERE source_type IN ('order','refund')").run();
  const orders:{contactId:string;purchasedAt:number;amountMinor:number;currency:string}[]=[];
  for(const[id,name,count,recency]of profiles) {
    await db.prepare("INSERT OR REPLACE INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES(?,?,?,'subscribed','never-subscribed',?,?)").bind(`retention-${id}`,`${id}@example.test`,name,now-400*day,now).run();
    await db.prepare('DELETE FROM consent_evidence WHERE id=?').bind(`retention-consent-${id}`).run();
    await createDatabase(db).insert(consentEvidence).values({id:`retention-consent-${id}`,contactId:`retention-${id}`,channel:'email',destination:`${id}@example.test`,brandOrLegalSender:'Orchard Studio',messageCategory:'newsletter',frequencyDisclosure:'Monthly studio letters',destinationJurisdiction:'US',captureMethod:'hosted-signup-form',captureSource:id==='iris'?'Studio opening':'Newsletter signup',consentText:'Send me the monthly studio newsletter.',consentVersion:'v1',occurredAt:new Date(now-400*day),confirmationRequired:true,confirmedAt:new Date(now-399*day),createdAt:new Date(now-400*day),updatedAt:new Date(now-399*day)});
    for(let index=0;index<count;index++) {
      const orderId=`retention-${id}-${index}`,purchasedAt=now-(recency+index*40)*day,currency=id==='maya'&&index===0?'JPY':'USD',refunded=id==='iris'&&index===0?2000:0;
      const lines=[{id:orderId+'-linen',productId:'Orchard linen',quantity:1},...(index===0?[{id:orderId+'-ceramic',productId:'Studio ceramics',quantity:1}]:[])];
      const payload=JSON.stringify({id:orderId,lines,refunds:[]});
      await db.prepare("INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,payload,occurred_at,provider_updated_at,payload_digest,created_at,updated_at) VALUES(?,'shopify','order',?,?,?,?,?,?,?,?)").bind(orderId,orderId,`retention-${id}`,payload,purchasedAt,purchasedAt,await sha256(payload),now,now).run();
      await db.prepare("INSERT INTO commerce_orders(source_record_id,provider_order_id,contact_id,purchased_at,gross_amount_minor,reported_refund_minor,currency,qualifying,financial_status,cancelled_at,updated_at) VALUES(?,?,?,?,10000,?,?,1,'PAID',NULL,?)").bind(orderId,orderId,`retention-${id}`,purchasedAt,refunded,currency,now).run();
      orders.push({contactId:`retention-${id}`,purchasedAt,amountMinor:10000-refunded,currency});
    }
  }
  // One fully refunded and one unpaid order must not inflate retention.
  for(const[id,qualifying,refund]of [['fully-refunded',1,10000],['unpaid',0,0]] as const) {
    const sourceId=`retention-excluded-${id}`,payload=JSON.stringify({id:sourceId,lines:[],refunds:[]});
    await db.prepare("INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,payload,occurred_at,provider_updated_at,payload_digest,created_at,updated_at) VALUES(?,'shopify','order',?,'retention-luis',?,?,?,?,?,?)").bind(sourceId,sourceId,payload,now-day,now-day,await sha256(payload),now,now).run();
    await db.prepare("INSERT INTO commerce_orders(source_record_id,provider_order_id,contact_id,purchased_at,gross_amount_minor,reported_refund_minor,currency,qualifying,financial_status,cancelled_at,updated_at) VALUES(?,?,'retention-luis',?,10000,?,'USD',?,?,NULL,?)").bind(sourceId,sourceId,now-day,refund,qualifying,qualifying?'PAID':'PENDING',now).run();
  }
  return {orders,now};
}
