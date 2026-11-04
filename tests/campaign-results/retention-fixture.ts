import { sha256 } from '../../src/core/shared/ids';
import { createDatabase } from '../../src/core/platform/db/client';
import { consentEvidence } from '../../src/core/features/audience/schema';

export type RetentionFixture = Awaited<ReturnType<typeof seedRetention>>;
type OrderFact = {
  id:string; contactId:string; purchasedAt:number; amountMinor:number; grossMinor:number;
  refundedMinor:number; currency:string; lines:{id:string;productId:string;quantity:number;refundedQuantity:number}[];
};
/** Stored commerce facts for the retention acceptance journey, never application data. */
export async function seedRetention(db:D1Database) {
  const now=Date.now(),day=86400000;
  const profiles=[['iris','Iris Dawson',5,5],['luis','Luis Moreno',1,10],['maya','Maya Chen',3,60],['noah','Noah Brooks',2,120],['opal','Opal Bennett',4,210]] as const;
  // Retention reports on every recorded order, so this fixture owns the whole order population;
  // purchases seeded by earlier journeys in the same runtime must not join it.
  await db.prepare('DELETE FROM commerce_refunds').run();
  await db.prepare('DELETE FROM commerce_orders').run();
  await db.prepare("DELETE FROM source_records WHERE source_type IN ('order','refund')").run();
  const orders:OrderFact[]=[],excludedOrders:OrderFact[]=[];
  const captures:{contactId:string;method:string;source:string;occurredAt:number}[]=[];
  const customerSources:{contactId:string;provider:string;occurredAt:number}[]=[];
  for(const[id,name,count,recency]of profiles) {
    const contactId=`retention-${id}`,destination=[`synthetic-mango-${id}`,'example.test'].join(String.fromCharCode(64));
    await db.prepare("INSERT OR REPLACE INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES(?,?,?,'subscribed','never-subscribed',?,?)").bind(contactId,destination,name,now-400*day,now).run();
    await db.prepare('DELETE FROM consent_evidence WHERE contact_id=?').bind(contactId).run();
    await db.prepare("DELETE FROM source_records WHERE contact_id=? AND source_type='customer'").bind(contactId).run();
    const captureFacts=id==='iris'
      ? [{method:'hosted-signup-form',source:'Studio opening',occurredAt:now-400*day},
        {method:'hosted-signup-form',source:'Later signup',occurredAt:now-390*day}]
      : id==='luis'||id==='maya'
        ? [{method:'manual-entry',source:'Partner event',occurredAt:now-400*day}]
        : [{method:'hosted-signup-form',source:'After purchase',occurredAt:now-day}];
    for(const[index,capture]of captureFacts.entries()) {
      captures.push({contactId,...capture});
      await createDatabase(db).insert(consentEvidence).values({id:`retention-consent-${id}-${index}`,contactId,channel:'email',destination,brandOrLegalSender:'Orchard Studio',messageCategory:'newsletter',frequencyDisclosure:'Monthly studio letters',destinationJurisdiction:'US',captureMethod:capture.method,captureSource:capture.source,consentText:'Send me the monthly studio newsletter.',consentVersion:'v1',occurredAt:new Date(capture.occurredAt),confirmationRequired:true,confirmedAt:new Date(capture.occurredAt+day),createdAt:new Date(capture.occurredAt),updatedAt:new Date(capture.occurredAt+day)});
    }
    // A recorded customer source is the fallback when no capture predates purchase;
    // it must never replace earlier consent evidence. Opal has neither kind of origin.
    if(id!=='opal') {
      const sourceId=`retention-origin-${id}`,provider='woocommerce',occurredAt=now-410*day,payload=JSON.stringify({id:sourceId});
      customerSources.push({contactId,provider,occurredAt});
      await db.prepare("INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,payload,occurred_at,provider_updated_at,payload_digest,created_at,updated_at) VALUES(?,?,'customer',?,?,?,?,?,?,?,?)").bind(sourceId,provider,sourceId,contactId,payload,occurredAt,occurredAt,await sha256(payload),now,now).run();
    }
    for(let index=0;index<count;index++) {
      const orderId=`retention-${id}-${index}`,purchasedAt=now-(recency+index*40)*day,currency=id==='maya'&&index===0?'JPY':'USD',refunded=id==='iris'&&index===0?2000:0;
      const products=index===0?['Orchard linen','Studio ceramics']:[['Orchard linen','Garden print','Studio ceramics'][index%3]];
      const lines=products.map((productId,line)=>({id:`${orderId}-${line}`,productId,quantity:1,refundedQuantity:0}));
      if(refunded)lines.push({id:`${orderId}-returned`,productId:'Returned vase',quantity:1,refundedQuantity:1});
      const refunds=refunded?[{id:`${orderId}-refund`,financialState:'SUCCESS',updatedAt:now,lines:[{line:{id:`${orderId}-returned`},quantity:1}]}]:[];
      const payload=JSON.stringify({id:orderId,lines:lines.map(({refundedQuantity,...line})=>line),refunds});
      await db.prepare("INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,payload,occurred_at,provider_updated_at,payload_digest,created_at,updated_at) VALUES(?,'shopify','order',?,?,?,?,?,?,?,?)").bind(orderId,orderId,contactId,payload,purchasedAt,purchasedAt,await sha256(payload),now,now).run();
      await db.prepare("INSERT INTO commerce_orders(source_record_id,provider_order_id,contact_id,purchased_at,gross_amount_minor,reported_refund_minor,currency,qualifying,financial_status,cancelled_at,updated_at) VALUES(?,?,?,?,10000,?,?,1,'PAID',NULL,?)").bind(orderId,orderId,contactId,purchasedAt,refunded,currency,now).run();
      orders.push({id:orderId,contactId,purchasedAt,amountMinor:10000-refunded,grossMinor:10000,refundedMinor:refunded,currency,lines});
    }
  }
  // Positive product lines ensure these refusals affect value and affinity if lost.
  for(const[index,[id,qualifying,refund]]of ([['fully-refunded',1,10000],['unpaid',0,0]] as const).entries()) {
    const sourceId=`retention-excluded-${id}`,purchasedAt=now-(index+1)*day;
    const lines=[{id:`source-${id}`,productId:`Excluded ${id} product`,quantity:1,refundedQuantity:0},
      {id:`source-${id}-linen`,productId:'Orchard linen',quantity:1,refundedQuantity:0}];
    const payload=JSON.stringify({id:sourceId,lines:lines.map(({refundedQuantity,...line})=>line),refunds:[]});
    await db.prepare("INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,payload,occurred_at,provider_updated_at,payload_digest,created_at,updated_at) VALUES(?,'shopify','order',?,'retention-luis',?,?,?,?,?,?)").bind(sourceId,sourceId,payload,purchasedAt,purchasedAt,await sha256(payload),now,now).run();
    await db.prepare("INSERT INTO commerce_orders(source_record_id,provider_order_id,contact_id,purchased_at,gross_amount_minor,reported_refund_minor,currency,qualifying,financial_status,cancelled_at,updated_at) VALUES(?,?,'retention-luis',?,10000,?,'USD',?,?,NULL,?)").bind(sourceId,sourceId,purchasedAt,refund,qualifying,qualifying?'PAID':'PENDING',now).run();
    excludedOrders.push({id:sourceId,contactId:'retention-luis',purchasedAt,amountMinor:10000-refund,grossMinor:10000,refundedMinor:refund,currency:'USD',lines});
  }
  return {orders,excludedOrders,captures,customerSources,now};
}
