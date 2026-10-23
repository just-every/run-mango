import {seedCampaign,recipient} from './fixtures';
import {createDatabase} from '../../src/core/platform/db/client';
import {consentEvidence} from '../../src/core/features/audience/schema';
import {recordExternalCost} from '../../src/core/features/insights/cost-recording';

/** A small persisted month of native report facts. Nothing replaces an application read. */
export async function seedOverview(db:D1Database) {
  const now=new Date(),start=Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1),end=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1),day=86400000;
  const days=(end-start)/day,previous=start-days*day,at=(base:number,n:number)=>base+n*day;
  await db.prepare('UPDATE list_growth_baseline SET covered_from=?,subscribed=0').bind(previous).run();
  await db.prepare('DELETE FROM list_growth_events WHERE id IN (SELECT event_id FROM list_growth_attribution WHERE contact_id LIKE ?)').bind('overview-%').run();
  await db.prepare("DELETE FROM list_growth_attribution WHERE contact_id LIKE 'overview-%'").run();
  await db.prepare("DELETE FROM consent_evidence WHERE contact_id LIKE 'overview-%'").run();
  const records=[];
  for(const [name,base,amount,clicks] of [['current',start,5000,2],['top',start,8000,1],['previous',previous,2000,1]] as const) {
    const id=`overview-${name}`,contactId=`${id}-contact`,when=at(base,4);
    await db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES(?,?,?,'subscribed','non-subscribed',?,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at").bind(contactId,`${name}@example.test`,`Overview ${name}`,when,when).run();
    await createDatabase(db).insert(consentEvidence).values({id:`${id}-consent`,contactId,channel:'email',destination:`${name}@example.test`,brandOrLegalSender:'Overview studio',messageCategory:'newsletter',frequencyDisclosure:'Monthly',destinationJurisdiction:'US',captureMethod:'hosted-signup-form',captureSource:name==='top'?'Studio event':'Newsletter form',consentText:'Send monthly studio news.',consentVersion:'v1',occurredAt:new Date(when),confirmationRequired:true,confirmedAt:new Date(when),createdAt:new Date(when),updatedAt:new Date(when)});
    const growth=await db.prepare("INSERT INTO list_growth_events(observed_at,channel,kind,delta) VALUES(?,'email','subscription',1) RETURNING id").bind(when).first<{id:number}>();
    await db.prepare('INSERT INTO list_growth_attribution(event_id,contact_id,evidence_id) VALUES(?,?,?)').bind(growth!.id,contactId,`${id}-consent`).run();
    await seedCampaign(db,id,'completed');
    await db.prepare('UPDATE campaign_steps SET scheduled_at=?,send_by_at=? WHERE revision_id=?').bind(when,when+day,`${id}-revision`).run();
    const rid=await recipient(db,id,1,'delivered',null,{contactId,contactIdentityKey:contactId,provider:'sendgrid',destination:`${name}@example.test`,firstAttemptAt:new Date(when),handoffStartedAt:new Date(when),handedOffAt:new Date(when),providerAcceptedAt:new Date(when),deliveredAt:new Date(when+1000)});
    for(let i=0;i<clicks+1;i++)await db.prepare('INSERT INTO link_click_facts(id,recipient_step_id,request_digest,occurred_at,automated,created_at) VALUES(?,?,?,?,?,?)').bind(`${id}-click-${i}`,rid,`${id}-digest-${i}`,when+1000+i,i===clicks?1:0,when).run();
    const kinds=name==='current'?['delivered','complained']:['delivered'];
    for(const kind of kinds)await db.prepare("INSERT INTO delivery_facts(id,identity_key,recipient_step_id,provider,provider_message_id,kind,provider_occurred_at,payload_digest,detail_json,created_at) VALUES(?,?,?,'sendgrid',?,?,?,'synthetic-mango-overview','{}',?)").bind(`${id}-${kind}`,`${id}-${kind}`,rid,`${id}-message`,kind,when+1000,when).run();
    for(const currency of name==='current'?['USD','EUR']:['USD']) {
      const oid=`${id}-order-${currency}`;
      await db.prepare("INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,payload,occurred_at,provider_updated_at,payload_digest,created_at,updated_at) VALUES(?,'shopify','order',?,?,?, ?,?,'synthetic-mango-overview',?,?) ON CONFLICT(id) DO UPDATE SET occurred_at=excluded.occurred_at").bind(oid,oid,contactId,JSON.stringify({id:oid,lines:[],refunds:[]}),when+day,when+day,when,when).run();
      await db.prepare('INSERT INTO attribution_facts(id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,refund_amount_minor,currency,attributed_at,updated_at,created_at) VALUES(?,?,?,?,?,7,?,?,?,?,?,?)').bind(oid,oid,id,rid,`${id}-click-0`,currency==='EUR'?7000:amount+1000,1000,currency,when+day,when,when).run();
    }
    await recordExternalCost(createDatabase(db),{key:`${id}-cost`,campaignId:id,provider:'sendgrid',operation:'provider-handoff',modelOrChannel:'email',billableUnits:1,unitKind:'messages',reportedCostMicros:name==='previous'?2000:4000,currency:'USD',occurredAt:new Date(when)});
    records.push({id,amount,clicks,when});
  }
  await recordExternalCost(createDatabase(db),{key:'overview-unpriced',campaignId:'overview-current',provider:'sendgrid',operation:'provider-handoff',modelOrChannel:'email',billableUnits:1,unitKind:'messages',currency:'USD',occurredAt:new Date(at(start,4))});
  return {from:new Date(start).toISOString().slice(0,10),to:new Date(end-day).toISOString().slice(0,10),previousFrom:new Date(previous).toISOString().slice(0,10),previousTo:new Date(start-day).toISOString().slice(0,10),days,records};
}
