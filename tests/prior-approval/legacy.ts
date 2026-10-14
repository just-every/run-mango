import type {composeFixture} from '../sender-verification/test-runtime';
import {draft} from './historical-draft';
import type {FrozenCandidate} from '../../src/core/features/lifecycle/types';
import {digestJson} from '../../src/core/features/lifecycle/digest';
import {messageRendererVersion} from '../../src/core/features/campaigns/message-content';

// Release-shaped rows, persisted on the original 0000-0012 schema, before any
// sender tables exist. Real consent capture supplies the evidence; historical
// source, audience and approval snapshots are explicit migration fixture data.
export async function legacyApproval(f:ReturnType<typeof composeFixture>,suffix=crypto.randomUUID(),includeAll=false) {
  const campaign=await draft(f,suffix);
  if(includeAll) await f.db.prepare('UPDATE campaign_revisions SET inclusion_rule_json=? WHERE id=?')
    .bind(JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'customer',field:'email',comparator:'contains',value:'@example.test'}]}),campaign.revisionId).run();
  const snapshot=(await f.lifecycle.repository.readRevisionSnapshot(campaign.campaignId,campaign.revisionId))!;
  snapshot.revision.sourceTypesJson='["customer"]';
  const now=Date.now();
  // Read the release's columns explicitly. The current audience projection
  // includes later commerce columns and must not run against an old schema.
  const contacts=(await f.db.prepare(`SELECT DISTINCT c.id,c.email FROM contacts c JOIN source_records s ON s.contact_id=c.id
    JOIN contact_email_addresses a ON a.contact_id=c.id AND a.email=c.email
    WHERE c.email_status='subscribed' AND a.channel_status='subscribed' AND s.source_type='customer'
    AND ${includeAll?"c.email LIKE '%@example.test'":"c.email=?"} ORDER BY c.id`).bind(...includeAll?[]:[`recipient-${suffix}@example.test`]).all<{id:string;email:string}>()).results;
  const candidates:FrozenCandidate[]=[];
  for(const contact of contacts){
    const consents=(await f.db.prepare(`SELECT destination,brand_or_legal_sender AS brandOrLegalSender,
      frequency_disclosure AS frequencyDisclosure,message_category AS category,destination_jurisdiction AS jurisdiction
      FROM consent_evidence WHERE contact_id=? AND channel='email' AND destination=? AND confirmed_at IS NOT NULL AND confirmed_at<=?`)
      .bind(contact.id,contact.email,now).all<{destination:string;brandOrLegalSender:string;frequencyDisclosure:string;category:string;jurisdiction:string}>()).results;
    if(!consents.length)throw new Error('Historical candidate has no confirmed consent');
    candidates.push({contactId:contact.id,contactIdentityKey:contact.id,channels:{email:{destination:contact.email,consents}}});
  }
  if(!candidates.length)throw new Error('Historical consent/source audience is empty');
  const personalisationUsage=[{channel:'email',eligibleContactCount:candidates.length,fallbackContactCount:0}];
  const revisionDigest=await digestJson({rendererVersion:messageRendererVersion,revision:snapshot.revision,
    steps:snapshot.steps,links:snapshot.links,personalisationUsage,frozenCandidates:candidates});
  const statements=[
    f.db.prepare(`INSERT INTO campaign_approval_requests
      (idempotency_key,campaign_id,revision_id,revision_digest,write_token,operator_id,approved_at,created_at)
      VALUES (?,?,?,?,?,?,?,?)`).bind(campaign.idempotencyKey,campaign.campaignId,campaign.revisionId,revisionDigest,crypto.randomUUID(),'historical-operator',now,now),
    f.db.prepare("UPDATE campaign_revisions SET state='approved',content_digest=?,approved_at=?,approved_by_operator_id='historical-operator',source_types_json='[\"customer\"]',updated_at=? WHERE id=?")
      .bind(revisionDigest,now,now,campaign.revisionId),
    f.db.prepare("UPDATE campaigns SET state='scheduled',updated_at=? WHERE id=?").bind(now,campaign.campaignId),
  ];
  const recipientIds:string[]=[];
  for(const candidate of candidates) {
    const recipientId=crypto.randomUUID();recipientIds.push(recipientId);
    const key=`${campaign.campaignId}:${campaign.revisionId}:${campaign.stepId}:${candidate.contactIdentityKey}`;
    statements.push(f.db.prepare('INSERT INTO campaign_revision_candidates (id,revision_id,contact_id,contact_identity_key,matched_at,created_at) VALUES (?,?,?,?,?,?)')
      .bind(crypto.randomUUID(),campaign.revisionId,candidate.contactId,candidate.contactIdentityKey,now,now),
    f.db.prepare(`INSERT INTO recipient_steps
      (id,campaign_id,revision_id,step_id,contact_id,contact_identity_key,channel,destination,idempotency_key,transport_disposition,
       attempt_count,next_attempt_at,reconcile_until,send_by_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,'email',?,?,'queued',0,?,?,?,?,?)`)
      .bind(recipientId,campaign.campaignId,campaign.revisionId,campaign.stepId,candidate.contactId,candidate.contactIdentityKey,candidate.channels.email!.destination,key,
        now-1000,now+7200000,now+3600000,now,now));
  }
  await f.db.batch(statements);
  return {...campaign,recipientId:recipientIds[0],recipientIds,revisionDigest};
}
export async function approvalBytes(db:D1Database) {
  return JSON.stringify((await db.prepare('SELECT * FROM campaign_approval_requests ORDER BY idempotency_key').all()).results);
}

/** Preserve every original serialized field while stating the migration's new
 * authority facts: prior handoff start can bound an attempt, but the upgrade
 * cannot invent an actual sender or the credential used by that handoff. */
export function recipientBytesAfterAuthorityMigration(before:string) {
  return JSON.stringify(JSON.parse(before).map((row:Record<string,unknown>)=>({...row,
    first_attempt_at:row.handoff_started_at,actual_sender:null,provider_credential_digest:null,
  })));
}
