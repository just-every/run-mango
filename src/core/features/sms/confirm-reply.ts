import type {Platform} from '@/core/shared/platform';
import {smsPolicyAuthority} from './content';
type Reply={id:string;reference:string;messageId:string;contactId:string;hash:string;destination:string;sender:string;occurred:number};
/** Only the signed reply to this accepted confirmation can consume its evidence. */
export async function confirmOperatorSmsReply(platform:Platform,r:Reply){
 const db=platform.database.$client,now=Date.now(),authority=await smsPolicyAuthority(platform.config),p=authority.policy;
 const result=await db.batch([
  db.prepare(`INSERT INTO sms_inbound_receipts(id,contact_id,destination_hash,action,occurred_at,created_at)
   SELECT ?,m.contact_id,m.destination_hash,'confirm',?,? FROM sms_service_messages m JOIN consent_evidence e ON e.id=m.consent_id
   JOIN consent_confirmations f ON f.consent_evidence_id=e.id JOIN contacts c ON c.id=e.contact_id
   JOIN contact_phones a ON a.contact_id=c.id AND a.phone_e164=e.destination
   WHERE m.id=? AND m.provider_message_id=? AND m.contact_id=? AND m.destination_hash=? AND m.sender=? AND m.purpose='consent-confirmation' AND m.state='accepted' AND m.policy_digest=?
   AND e.channel='sms' AND f.channel='sms' AND f.contact_id=c.id AND e.destination=? AND e.capture_method='operator-recorded'
   AND e.brand_or_legal_sender=? AND e.sms_program=? AND e.message_category=? AND e.frequency_disclosure=? AND e.destination_jurisdiction=?
   AND e.confirmed_at IS NULL AND f.confirmed_at IS NULL AND f.expires_at>? AND m.expires_at>?
   AND ?>=CAST(e.occurred_at/1000 AS INTEGER)*1000 AND ?>=CAST(f.sent_at/1000 AS INTEGER)*1000
   AND c.merge_lock IS NULL AND a.identity_status='active' AND c.sms_status NOT IN ('unsubscribed','suppressed') AND a.channel_status NOT IN ('unsubscribed','suppressed')
   AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=m.destination_hash AND channel='sms')
   AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=m.destination_hash AND channel='sms') ON CONFLICT(id) DO NOTHING RETURNING id`)
   .bind(r.id,r.occurred,now,r.reference,r.messageId,r.contactId,r.hash,r.sender,authority.digest,r.destination,p.brand,p.programme,p.category,p.frequency,p.jurisdiction,now,now,r.occurred,r.occurred),
  db.prepare("UPDATE contacts SET sms_status='subscribed',sms_status_at=?,last_activity_at=MAX(COALESCE(last_activity_at,0),?),updated_at=? WHERE changes()=1 AND id=?").bind(now,now,now,r.contactId),
  db.prepare("UPDATE contact_phones SET channel_status='subscribed',channel_status_at=?,updated_at=? WHERE changes()=1 AND contact_id=? AND phone_e164=?").bind(now,now,r.contactId,r.destination),
  db.prepare('UPDATE consent_evidence SET confirmed_at=?,updated_at=? WHERE changes()=1 AND id=(SELECT consent_id FROM sms_service_messages WHERE id=?)').bind(now,now,r.reference),
  db.prepare('UPDATE consent_confirmations SET confirmed_at=?,updated_at=? WHERE changes()=1 AND consent_evidence_id=(SELECT consent_id FROM sms_service_messages WHERE id=?)').bind(now,now,r.reference),
  db.prepare("INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) SELECT consent_id||'_confirmed',contact_id,'consent-confirmed','SMS consent confirmed by authenticated YES reply to its confirmation text.',?,?,? FROM sms_service_messages WHERE changes()=1 AND id=? ON CONFLICT(id) DO NOTHING").bind(now,now,now,r.reference),
  db.prepare("INSERT INTO sms_compliance_replies(id,provider_event_id,contact_id,channel,canonical_action,keyword,sender,program,jurisdiction,occurred_at,created_at,updated_at) SELECT ?,?,?,'sms','confirm','YES',?,?,?,?,?,? WHERE changes()=1 ON CONFLICT(provider_event_id) DO NOTHING").bind(r.id,r.id,r.contactId,r.sender,p.programme,p.jurisdiction,r.occurred,now,now),
 ]);
 if(result[0].results.length)return true;
 // A consumed confirmation is harmless on replay; a restriction never changes.
 return Boolean(await db.prepare("SELECT 1 FROM sms_inbound_receipts WHERE id=? AND action='confirm' AND contact_id=? AND destination_hash=?").bind(r.id,r.contactId,r.hash).first());
}
