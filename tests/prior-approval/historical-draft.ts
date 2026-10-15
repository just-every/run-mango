import type {composeFixture} from '../sender-verification/test-runtime';
import {digestJson} from '../../src/core/features/lifecycle/digest';

// A persisted pre-sender-verification draft, used only as migration input.
// Consent is captured through the real service; historical commerce rows and
// campaign data are explicitly seeded in the schema that existed at the time.
export async function draft(f: ReturnType<typeof composeFixture>, suffix = crypto.randomUUID()) {
  const now = Date.now(), campaignId = `campaign-${suffix}`, revisionId = `revision-${suffix}`, stepId = `step-${suffix}`;
  await f.services.audienceService.captureConsent({ idempotencyKey: `consent-${suffix}`, contact: { email: `recipient-${suffix}@example.test`, displayName: 'Recipient' },
    channel: 'email', brandOrLegalSender: 'Mango', messageCategory: 'offers', destinationJurisdiction: 'AU', frequencyDisclosure: 'Weekly', captureMethod: 'test', captureSource: 'test',
    consentText: 'I consent to weekly offers.', consentVersion: 'v1', occurredAt: new Date(now), confirmationRequired: false });
  const contact=await f.db.prepare('SELECT id FROM contacts WHERE email=?').bind(`recipient-${suffix}@example.test`).first<{id:string}>();
  if(!contact)throw new Error('Historical consent did not create its contact');
  const sourceId=crypto.randomUUID(),payload=JSON.stringify({email:`recipient-${suffix}@example.test`,firstName:'Test'});
  // Deliberate release-shaped data: current ingestion requires 0051 columns.
  // The upgrade tests must persist this source before those migrations run.
  await f.db.batch([
    f.db.prepare(`INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,occurred_at,payload,payload_digest,created_at,updated_at)
      VALUES (?,'shopify','customer',?,?,?,?,?,?,?)`).bind(sourceId,`customer-${suffix}`,contact.id,now,payload,await digestJson(JSON.parse(payload)),now,now),
    f.db.prepare(`INSERT INTO commerce_source_capabilities(id,source_type,available,detail,updated_at) VALUES (?,'customer',1,'Historical imported customers',?)
      ON CONFLICT(source_type) DO UPDATE SET available=1,updated_at=excluded.updated_at`).bind(crypto.randomUUID(),now),
    f.db.prepare(`INSERT INTO source_syncs(id,source_type,last_successful_at,last_error,created_at,updated_at) VALUES (?,'customer',?,NULL,?,?)
      ON CONFLICT(source_type) DO UPDATE SET last_successful_at=excluded.last_successful_at,last_error=NULL,updated_at=excluded.updated_at`).bind(crypto.randomUUID(),now,now,now),
  ]);
  await f.db.prepare(`INSERT INTO campaigns (id,state,active_revision_id,created_at,updated_at) VALUES (?,'draft',?,?,?)`).bind(campaignId, revisionId, now, now).run();
  await f.db.prepare(`INSERT INTO campaign_revisions (id,campaign_id,version,state,name,email_subject,email_body,email_text,preheader,sms_body,sender_name,from_email,reply_to_email,physical_address,message_category,audience_rule,inclusion_rule_json,exclusion_rules_json,created_at,updated_at)
    VALUES (?,?,1,'draft','Native sender test','Offers','<p>Offer</p><p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>','Offer {{physical_address}} Unsubscribe: {{unsubscribe_url}}','Offers','','Mango','offers@example.test','reply@example.test','1 Test Street','offers','All subscribed',?,'[]',?,?)`)
    .bind(revisionId, campaignId, JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'customer',field:'email',comparator:'eq',value:`recipient-${suffix}@example.test`}]}), now, now).run();
  await f.db.prepare(`INSERT INTO campaign_steps (id,revision_id,sequence,channel,timezone,scheduled_at,send_by_at,why_this_time,created_at,updated_at)
    VALUES (?,?,1,'email','UTC',?,?,'Approved test time',?,?)`).bind(stepId, revisionId, now - 1000, now + 3600000, now, now).run();
  return { campaignId, revisionId, stepId, operatorId: 'operator', idempotencyKey: `approve-${suffix}` };
}
