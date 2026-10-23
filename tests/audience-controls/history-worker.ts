import {testIdentity} from '../support/test-identity';
import authoringWorker from '../campaign-authoring/worker';
import {createFixturePlatform} from '../support/local-platform';
import {createAppServices} from '../../src/core/app/app';
import {createDraft} from '../../src/core/features/campaigns/create-draft';
import type {NormalizedCommerceRecord} from '../../src/core/features/store/service';
import type {LocalAppBindings} from '../support/fixture-app';

// Test data is persisted in native D1. The operator page and its resource route
// are the production app; no application read is intercepted or replaced.
async function seed(bindings:LocalAppBindings) {
  const platform=createFixturePlatform(bindings,bindings.LOCAL_BOOTSTRAP_TOKEN);
  const {audienceService,storeService}=createAppServices(platform), db=bindings.DB;
  const now=Date.now(), day=86400000;
  const at=(days:number)=>new Date(now-days*day);
  const capture=async(email:string,name:string)=>audienceService.captureConsent({
    contact:{email,displayName:name},channel:'email',brandOrLegalSender:'Harvest House',messageCategory:'newsletter',
    frequencyDisclosure:'Weekly',destinationJurisdiction:'US',captureMethod:'hosted-signup-form',
    captureSource:'https://harvest.example.test/signup?private=source-marker#private',consentText:'Send me weekly harvest news.',
    consentVersion:'harvest-v1',occurredAt:at(20),confirmationRequired:false,
  });
  const {contact}=await capture('nadia@example.test','Nadia Patel');
  await audienceService.ensureContact({email:contact.email!,phone:'+15555550123'},new Date());
  const {contact:other}=await capture('unrelated-person@example.test','Unrelated person');
  const records:NormalizedCommerceRecord[]=[{sourceType:'order',providerSourceId:'harvest-order-1042',contactId:contact.id,
    occurredAt:at(7),payload:{id:'harvest-order-1042',email:contact.email,total:84,currency:'USD',private:'source-payload-marker'},
    activity:{kind:'order',state:'completed'}},
    ...Array.from({length:44},(_,index)=>({sourceType:'browsing-event' as const,providerSourceId:`harvest-view-${index}`,
      contactId:contact.id,occurredAt:at(10+index/10),payload:{productId:`linen-${index%4}`},
      activity:{kind:'browsing-event' as const,state:'viewed-product'}})),
    {sourceType:'order' as const,providerSourceId:'other-private-order',contactId:other.id,occurredAt:at(6),
      payload:{private:'other-contact-marker'},activity:{kind:'order',state:'other-contact-marker'}},
  ];
  await storeService.ingestSuccessfulCommerceBatch('shopify',records,'delta',['order','browsing-event'],true,new Date());
  const draft=async(name:string,days:number)=>{
    const value=await createDraft(platform.database,{name,emailSubject:name,emailBody:'<p>Harvest news.</p>',steps:[{
      channel:'email',timezone:'America/New_York',scheduledAt:at(days).toISOString(),sendByAt:at(days-0.5).toISOString(),whyThisTime:'Weekly harvest update',
    }]},'authoring-operator');
    await db.batch([
      db.prepare("UPDATE campaigns SET state='completed',created_at=?,updated_at=? WHERE id=?").bind(at(days+2).getTime(),at(days).getTime(),value.campaignId),
      db.prepare("UPDATE campaign_revisions SET state='approved',approved_at=?,approved_by_operator_id='authoring-operator',created_at=?,updated_at=? WHERE id=?")
        .bind(at(days+1).getTime(),at(days+2).getTime(),at(days+1).getTime(),value.revisionId),
      db.prepare('UPDATE campaign_state_transitions SET occurred_at=?,created_at=? WHERE campaign_id=?').bind(at(days+2).getTime(),at(days+2).getTime(),value.campaignId),
    ]);
    const step=await db.prepare('SELECT id FROM campaign_steps WHERE revision_id=?').bind(value.revisionId).first<{id:string}>();
    if(!step)throw new Error('History fixture step was not saved.');
    return {...value,stepId:step.id};
  };
  const campaign=await draft('Autumn harvest',4),skipped=await draft('Members early access',1);
  const insertRecipient=(id:string,campaignId:string,revisionId:string,stepId:string,status:string,when:number)=>db.prepare(`INSERT INTO recipient_steps
    (id,campaign_id,revision_id,step_id,contact_id,contact_identity_key,channel,destination,idempotency_key,transport_disposition,
      skip_reason,provider,provider_message_id,handed_off_at,delivered_at,terminal_at,send_by_at,created_at,updated_at)
    VALUES (?,?,?,?,?,?,'email',?,?,?,?,'sendgrid',?,?,?,?,?,?,?)`)
    .bind(id,campaignId,revisionId,stepId,contact.id,contact.id,contact.email,`history-${id}`,status,
      status==='skipped'?'channel-not-subscribed':null,status==='skipped'?null:`provider-${id}`,
      status==='skipped'?null:when, status==='delivered'?when+60000:null,when+60000,now+day,when,now);
  await db.batch([
    db.prepare('INSERT INTO campaign_revision_candidates(id,revision_id,contact_id,contact_identity_key,matched_at,created_at) VALUES(?,?,?,?,?,?)')
      .bind('history-candidate',campaign.revisionId,contact.id,contact.id,at(5).getTime(),now),
    insertRecipient('history-delivered',campaign.campaignId,campaign.revisionId,campaign.stepId,'delivered',at(4).getTime()),
    insertRecipient('history-skipped',skipped.campaignId,skipped.revisionId,skipped.stepId,'skipped',at(1).getTime()),
    db.prepare(`INSERT INTO delivery_facts(id,identity_key,recipient_step_id,provider,provider_message_id,kind,provider_occurred_at,payload_digest,detail_json,created_at)
      VALUES('history-delivery','history-delivery','history-delivered','sendgrid','provider-history-delivered','delivered',?,'fixture-digest',?,?)`)
      .bind(at(4).getTime()+60000,JSON.stringify({private:'provider-payload-marker'}),now),
    db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
      VALUES('history-operator','history-operator','contact',?,'profile.updated','operator','authoring-operator',?,?,?)`)
      .bind(contact.id,JSON.stringify({private:'audit-payload-marker'}),at(3).getTime(),now),
    db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
      VALUES('history-unrelated','history-unrelated','contact',?,'other-contact-marker','operator','authoring-operator','{}',?,?)`)
      .bind(other.id,at(2).getTime(),now),
  ]);
  await db.batch([
    db.prepare("INSERT INTO integration_contact_profiles(contact_id,fields_json,tags_json) VALUES(?,?,?)").bind(contact.id,JSON.stringify({favourite:'Autumn linen'}),JSON.stringify(['harvest-vip'])),
    db.prepare("INSERT INTO audience_segments(id,name,inclusion_rule_json,exclusion_rules_json,created_by,created_at,updated_at) VALUES('history-segment','Harvest VIP',?,'[]','authoring-operator',?,?)").bind(JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'tags',comparator:'contains',value:'harvest-vip'}]}),now,now),
    db.prepare("INSERT INTO link_click_facts(id,recipient_step_id,request_digest,occurred_at,automated,created_at) VALUES('history-click','history-delivered','history-click',?,0,?)").bind(at(3.5).getTime(),now),
    db.prepare("INSERT INTO sms_inbound_receipts(id,contact_id,destination_hash,action,occurred_at,created_at) VALUES('history-reply',?,'synthetic-mango-history','HELP',?,?)").bind(contact.id,at(1.5).getTime(),now),
  ]);
  await storeService.ingestSuccessfulCommerceBatch('shopify',[{sourceType:'order',providerSourceId:'harvest-conversion',contactId:contact.id,
    occurredAt:at(2.5),payload:{id:'harvest-conversion',email:contact.email,total:42,currency:'USD'},activity:{kind:'order',state:'completed'}}],'delta',['order'],true,new Date());
  const conversion=await db.prepare("SELECT id FROM source_records WHERE provider='shopify' AND provider_source_id='harvest-conversion'").first<{id:string}>();
  await db.prepare("INSERT INTO attribution_facts(id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,currency,attributed_at,updated_at,created_at) VALUES('history-conversion',?,?,'history-delivered','history-click',7,4200,'USD',?,?,?)").bind(conversion!.id,campaign.campaignId,at(2.5).getTime(),now,now).run();
  const {contact:merged}=await audienceService.ensureContact({email:'nadia-merged@example.test',displayName:'Nadia merged'},new Date());
  await audienceService.mergeContacts(contact.id,merged.id,'authoring-operator');
  const restricted=[];
  for(const role of ['support','analyst']) {
    const operator={id:`history-${role}`,email:`history-${role}@example.test`,displayName:role};
    await testIdentity(platform).importLocalDemoOperator(operator,new Date());
    await db.prepare("UPDATE oa_operators SET role='member' WHERE id=?").bind(operator.id).run();
    await db.prepare('INSERT INTO operator_product_roles(operator_id,role,unmasked_contacts,updated_by,updated_at) VALUES(?,?,0,?,?)').bind(operator.id,role,'authoring-operator',now).run();
    restricted.push({role,token:(await testIdentity(platform).createTestSession(operator.id)).token});
  }
  await audienceService.recordChannelOptOut({contactId:contact.id,channel:'email',destination:contact.email!,reason:'recipient-unsubscribe',occurredAt:at(2)});
  await audienceService.recordProviderSuppression({destination:contact.email!,channel:'email',cause:'hard-bounce',occurredAt:at(0.5),providerEventId:'history-bounce'});
  return {restricted,mergedId:merged.id,contactId:contact.id,campaignId:campaign.campaignId,orderAt:at(7).toISOString(),deliveryAt:new Date(at(4).getTime()+60000).toISOString()};
}

export default {
  ...authoringWorker,
  async fetch(request:Request,bindings:LocalAppBindings,context:ExecutionContext) {
    if(new URL(request.url).pathname==='/_history/seed') {
      if(request.method!=='POST'||request.headers.get('X-Test-Token')!==bindings.LOCAL_BOOTSTRAP_TOKEN)return new Response(null,{status:403});
      return Response.json(await seed(bindings));
    }
    return authoringWorker.fetch(request,bindings,context);
  },
} satisfies ExportedHandler<LocalAppBindings>;
