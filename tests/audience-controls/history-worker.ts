import {testIdentity} from '../support/test-identity';
import authoringWorker from '../campaign-authoring/worker';
import {createFixturePlatform} from '../support/local-platform';
import {createAppServices} from '../../src/core/app/app';
import {createDraft} from '../../src/core/features/campaigns/create-draft';
import type {NormalizedCommerceRecord} from '../../src/core/features/store/service';
import type {ContactTimelineEntry} from '../../src/core/features/audience/contact-timeline';
import type {LocalAppBindings} from '../support/fixture-app';

// Test data is persisted in native D1. The operator page and its resource route
// are the production app; no application read is intercepted or replaced.
async function seed(bindings:LocalAppBindings) {
  const platform=createFixturePlatform(bindings,bindings.LOCAL_BOOTSTRAP_TOKEN);
  const {audienceService,storeService}=createAppServices(platform), db=bindings.DB;
  const now=Date.now(), day=86400000;
  const at=(days:number)=>new Date(now-days*day);
  // Expectations come from fixture inputs and raw persisted receipts, never the
  // timeline projection or the detail response being checked.
  const expectedFacts:Array<Pick<ContactTimelineEntry,'id'|'kind'|'source'|'occurredAt'>>=[];
  const expectFact=(id:string,kind:string,source:string,time:Date|number)=>expectedFacts.push({id,kind,source,occurredAt:new Date(time).toISOString()});
  const capture=async(email:string,name:string)=>audienceService.captureConsent({
    contact:{email,displayName:name},channel:'email',brandOrLegalSender:'Harvest House',messageCategory:'newsletter',
    frequencyDisclosure:'Weekly',destinationJurisdiction:'US',captureMethod:'hosted-signup-form',
    captureSource:'https://harvest.example.test/signup?private=source-marker#private',consentText:'Send me weekly harvest news.',
    consentVersion:'harvest-v1',occurredAt:at(20),confirmationRequired:false,
  });
  const {contact,evidence}=await capture('nadia@example.test','Nadia Patel');
  // Separate occurrence and storage times make ingestion-time substitutions fail.
  await db.prepare('UPDATE consent_evidence SET confirmed_at=?,created_at=?,updated_at=? WHERE id=?')
    .bind(at(19).getTime(),now,now,evidence.id).run();
  const formSource='hosted-signup-form · https://harvest.example.test/signup';
  expectFact(`form:${evidence.id}`,'form-submitted',formSource,at(20));
  expectFact(`consent:${evidence.id}`,'consent-captured',formSource,at(20));
  expectFact(`confirmation:${evidence.id}`,'consent-confirmed',formSource,at(19));
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
      db.prepare('UPDATE campaign_state_transitions SET occurred_at=?,created_at=? WHERE campaign_id=?').bind(at(days+2).getTime(),now,value.campaignId),
    ]);
    const step=await db.prepare('SELECT id FROM campaign_steps WHERE revision_id=?').bind(value.revisionId).first<{id:string}>();
    if(!step)throw new Error('History fixture step was not saved.');
    const transition=await db.prepare('SELECT id FROM campaign_state_transitions WHERE campaign_id=?').bind(value.campaignId).first<{id:string}>();
    expectFact(`transition:${transition!.id}`,'operator-action','Campaign history',at(days+2));
    return {...value,stepId:step.id};
  };
  const campaign=await draft('Autumn harvest',4),skipped=await draft('Members early access',1),failed=await draft('Earlier service notice',3.75);
  const insertRecipient=(id:string,campaignId:string,revisionId:string,stepId:string,status:string,when:number)=>db.prepare(`INSERT INTO recipient_steps
    (id,campaign_id,revision_id,step_id,contact_id,contact_identity_key,channel,destination,idempotency_key,transport_disposition,
      skip_reason,provider,provider_message_id,handed_off_at,delivered_at,terminal_at,send_by_at,created_at,updated_at)
    VALUES (?,?,?,?,?,?,'email',?,?,?,?,'sendgrid',?,?,?,?,?,?,?)`)
    .bind(id,campaignId,revisionId,stepId,contact.id,contact.id,contact.email,`history-${id}`,status,
      status==='skipped'?'channel-not-subscribed':null,status==='skipped'?null:`provider-${id}`,
      status==='skipped'?null:when, status==='delivered'?when+60000:null,when+60000,now+day,now,now);
  await db.batch([
    db.prepare('INSERT INTO campaign_revision_candidates(id,revision_id,contact_id,contact_identity_key,matched_at,created_at) VALUES(?,?,?,?,?,?)')
      .bind('history-candidate',campaign.revisionId,contact.id,contact.id,at(5).getTime(),now),
    insertRecipient('history-delivered',campaign.campaignId,campaign.revisionId,campaign.stepId,'delivered',at(4).getTime()),
    insertRecipient('history-skipped',skipped.campaignId,skipped.revisionId,skipped.stepId,'skipped',at(1).getTime()),
    insertRecipient('history-failed',failed.campaignId,failed.revisionId,failed.stepId,'failed',at(3.75).getTime()),
    db.prepare("UPDATE recipient_steps SET provider=NULL,last_error_code='transport-unavailable' WHERE id='history-failed'"),
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
  expectFact('eligible:history-candidate','campaign-eligible','Campaign approval',at(5));
  expectFact('skipped:history-skipped','campaign-skipped','Dispatch eligibility',at(1).getTime()+60000);
  expectFact('handoff:history-delivered','message-handed-off','sendgrid',at(4));
  expectFact('handoff:history-failed','message-handed-off','Recorded transport',at(3.75));
  expectFact('failed:history-failed','message-failed','Recorded transport',at(3.75).getTime()+60000);
  expectFact('provider:history-delivery','message-delivered','sendgrid',at(4).getTime()+60000);
  expectFact('action:history-operator','operator-action','Operator',at(3));
  await db.batch([
    db.prepare("INSERT INTO integration_contact_profiles(contact_id,fields_json,tags_json) VALUES(?,?,?)").bind(contact.id,JSON.stringify({favourite:'Autumn linen'}),JSON.stringify(['harvest-vip'])),
    db.prepare("INSERT INTO audience_segments(id,name,inclusion_rule_json,exclusion_rules_json,created_by,created_at,updated_at) VALUES('history-segment','Harvest VIP',?,'[]','authoring-operator',?,?)").bind(JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'tags',comparator:'contains',value:'harvest-vip'}]}),now,now),
    db.prepare("INSERT INTO link_click_facts(id,recipient_step_id,request_digest,occurred_at,automated,created_at) VALUES('history-click','history-delivered','history-click',?,0,?)").bind(at(3.5).getTime(),now),
    db.prepare("INSERT INTO sms_inbound_receipts(id,contact_id,destination_hash,action,occurred_at,created_at) VALUES('history-reply',?,'synthetic-mango-history','HELP',?,?)").bind(contact.id,at(1.5).getTime(),now),
  ]);
  expectFact('click:history-click','message-clicked','First-party link tracking',at(3.5));
  expectFact('sms-inbound:history-reply','sms-reply','Signed SMS inbound receipt',at(1.5));
  await db.batch([
    db.prepare("INSERT INTO link_click_facts(id,recipient_step_id,request_digest,occurred_at,automated,created_at) VALUES('history-automated','history-delivered','history-automated',?,1,?)").bind(at(3.25).getTime(),now),
    ...['campaign','campaign-revision'].map((entity,index)=>db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
      VALUES(?,?,?,?,'history.reviewed',?,?,?, ?,?)`).bind(`history-action-${index}`,`history-action-${index}`,entity,index?campaign.revisionId:campaign.campaignId,index?'system':'operator','authoring-operator',JSON.stringify({private:'audit-payload-marker'}),at(2.75-index/10).getTime(),now)),
  ]);
  expectFact('click:history-automated','automated-link-request','First-party link tracking',at(3.25));
  expectFact('action:history-action-0','operator-action','Operator',at(2.75));
  expectFact('action:history-action-1','operator-action','system',at(2.65));
  await audienceService.receiveSmsComplianceReply({destination:'+15555550123',providerEventId:'history-compliance',canonicalAction:'help',keyword:'INFO',sender:'Harvest',program:'Harvest news',jurisdiction:'US',occurredAt:at(1.75),providerAlreadyResponded:true});
  const reply=await db.prepare("SELECT id FROM sms_compliance_replies WHERE provider_event_id='history-compliance'").first<{id:string}>();
  expectFact(`sms-reply:${reply!.id}`,'sms-reply','SMS compliance ledger',at(1.75));
  await storeService.ingestSuccessfulCommerceBatch('shopify',[{sourceType:'order',providerSourceId:'harvest-conversion',contactId:contact.id,
    occurredAt:at(2.5),payload:{id:'harvest-conversion',email:contact.email,total:42,currency:'USD'},activity:{kind:'order',state:'completed'}}],'delta',['order'],true,new Date());
  const conversion=await db.prepare("SELECT id FROM source_records WHERE provider='shopify' AND provider_source_id='harvest-conversion'").first<{id:string}>();
  await db.prepare("INSERT INTO attribution_facts(id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,currency,attributed_at,updated_at,created_at) VALUES('history-conversion',?,?,'history-delivered','history-click',7,4200,'USD',?,?,?)").bind(conversion!.id,campaign.campaignId,at(2.5).getTime(),now,now).run();
  expectFact('conversion:history-conversion','conversion','Campaign attribution',at(2.5));
  // Match generated activity ids back to the independently supplied source batch.
  const sourceInputs=[...records.filter(record=>record.contactId===contact.id),{providerSourceId:'harvest-conversion',occurredAt:at(2.5),sourceType:'order',activity:{kind:'order'}}];
  const activities=await db.prepare('SELECT a.id,s.provider_source_id FROM source_activities a JOIN source_records s ON s.id=a.source_record_id WHERE a.contact_id=?').bind(contact.id).all<{id:string;provider_source_id:string}>();
  if(activities.results.length!==sourceInputs.length)throw new Error('History fixture did not persist its complete source batch.');
  for(const row of activities.results) {
    const input=sourceInputs.find(input=>input.providerSourceId===row.provider_source_id);
    if(!input)throw new Error('Unexpected source activity in history fixture.');
    expectFact(`source:${row.id}`,input.activity!.kind,`shopify · ${input.sourceType}`,input.occurredAt);
  }
  const {contact:merged}=await audienceService.ensureContact({email:'nadia-merged@example.test',displayName:'Nadia merged'},new Date());
  await audienceService.mergeContacts(contact.id,merged.id,'authoring-operator');
  const merge=await db.prepare('SELECT id,occurred_at FROM contact_merges WHERE merged_contact_id=?').bind(merged.id).first<{id:string;occurred_at:number}>();
  expectFact(`merge:${merge!.id}`,'contact-merged','Operator',merge!.occurred_at);
  await db.prepare('UPDATE contact_merges SET created_at=?,updated_at=? WHERE id=?').bind(now,now,merge!.id).run();
  // Imported and typed-property facts are native history families too. Their
  // private objects must not turn into timeline payloads or lose provenance.
  const legacy=[
    {id:'history-property',kind:'property-change',days:18,source:'operator · Author',detail:{key:'favourite',oldValue:'Winter linen',newValue:'Autumn linen',source:{kind:'operator',label:'Author'}}},
    ...['order','click','open','event'].map((kind,index)=>({id:`history-incumbent-${kind}`,kind:`incumbent-${kind}`,days:17-index/10,source:'Incumbent export',detail:{order_id:'synthetic-mango-order',value:12,currency:'USD',private:'source-payload-marker'}})),
  ];
  for(const row of legacy) {
    await db.prepare('INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
      .bind(row.id,contact.id,row.kind,JSON.stringify(row.detail),at(row.days).getTime(),now,now).run();
    expectFact(`history:${row.id}`,row.kind,row.source,at(row.days));
  }
  await db.batch([
    db.prepare(`INSERT INTO move_in_archives(id,principal_id,name,sha256,size,consent_digest,consent_json,fingerprint,state,summary_json,content_total,content_done,created_at,updated_at,applied_at)
      VALUES('history-archive','authoring-operator','Synthetic history','synthetic-mango-archive',0,'synthetic-mango-consent','{}','synthetic-mango-history','applied','{}',1,1,?,?,?)`).bind(now,now,now),
    db.prepare(`INSERT INTO move_in_content(id,archive_id,ordinal,kind,source_path,title,subject,sent_at_source,html,text,removed_json,flagged_json,merge_tags_json,state,created_at,updated_at)
      VALUES('history-imported-letter','history-archive',0,'history','synthetic-mango-history.csv','Earlier harvest','Earlier harvest',?,'','','[]','[]','[]','imported',?,?)`).bind(at(18).toISOString(),now,now),
  ]);
  for(const [index,kind] of ['click','open'].entries()) {
    const id=`history-imported-${kind}`;
    await db.prepare(`INSERT INTO imported_engagement_facts(id,archive_id,contact_id,history_id,source,source_row,source_ordinal,source_campaign_id,kind,occurred_at)
      VALUES(?,'history-archive',?,'history-imported-letter','Mailchimp',?,0,'synthetic-mango-history',?,?)`)
      .bind(id,contact.id,index+1,kind,at(16-index).getTime()).run();
    expectFact(id,`imported-${kind}`,'Imported · Mailchimp',at(16-index));
  }
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
  const suppression=await db.prepare("SELECT id FROM contact_suppressions WHERE provider_event_id='history-bounce'").first<{id:string}>();
  expectFact(`suppression:${suppression!.id}`,'channel-suppressed','Suppression ledger',at(0.5));
  // Ledger rows generated by consent and suppression are represented by their
  // structured facts above; merge names and opt-outs keep their own ledger source.
  const ledger=await db.prepare("SELECT id,kind,occurred_at FROM contact_history WHERE contact_id=? AND kind NOT IN ('consent-captured','consent-confirmed','suppression','contact-merged','property-change','incumbent-order','incumbent-click','incumbent-open','incumbent-event')").bind(contact.id).all<{id:string;kind:string;occurred_at:number}>();
  for(const row of ledger.results)expectFact(`history:${row.id}`,row.kind,'Contact ledger',row.occurred_at);
  await db.prepare('UPDATE contact_history SET created_at=?,updated_at=? WHERE contact_id=?').bind(now,now,contact.id).run();
  return {expectedFacts,restricted,mergedId:merged.id,contactId:contact.id,campaignId:campaign.campaignId,orderAt:at(7).toISOString(),deliveryAt:new Date(at(4).getTime()+60000).toISOString()};
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
