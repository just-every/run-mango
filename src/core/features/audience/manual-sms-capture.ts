import type {Database} from '@/core/platform/db/client';
import type {consentEvidence} from './schema';
import type {SenderWriteAuthority} from '@/core/features/settings/sender-authority';
import {senderWriteGuard} from '@/core/features/settings/sender-authority';
import {effectiveRole} from '@/core/features/auth/product-roles';
/** A hand entry never changes a restricted phone, including an older refusal. */
export async function recordManualSmsCapture(database:Database,e:typeof consentEvidence.$inferInsert,hash:string,actor:SenderWriteAuthority){
 const db=database.$client,now=e.createdAt.getTime(),at=e.occurredAt.getTime();
 const result=await db.batch([
  db.prepare(`INSERT INTO consent_evidence(id,contact_id,channel,destination,brand_or_legal_sender,sms_program,message_category,frequency_disclosure,destination_jurisdiction,capture_method,capture_source,consent_text,consent_version,occurred_at,confirmation_required,confirmed_at,created_at,updated_at)
   SELECT ?,?,'sms',?,?,?,?,?,?,?,?,?,?,?,1,NULL,?,? WHERE ${senderWriteGuard}
   AND EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=? AND n.status='active' AND ${effectiveRole} IN ('owner','admin','manager','author'))
   AND EXISTS(SELECT 1 FROM contacts c JOIN contact_phones p ON p.contact_id=c.id WHERE c.id=? AND p.phone_e164=? AND c.merge_lock IS NULL AND p.identity_status='active' AND c.sms_status NOT IN ('subscribed','unsubscribed','suppressed') AND p.channel_status NOT IN ('subscribed','unsubscribed','suppressed'))
   AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND channel='sms') AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel='sms') ON CONFLICT(id) DO NOTHING RETURNING id`)
   .bind(e.id,e.contactId,e.destination,e.brandOrLegalSender,e.smsProgram,e.messageCategory,e.frequencyDisclosure,e.destinationJurisdiction,e.captureMethod,e.captureSource,e.consentText,e.consentVersion,at,now,now,actor.sessionId,actor.operatorId,actor.version,now,actor.operatorId,e.contactId,e.destination,hash,hash),
  db.prepare("UPDATE contacts SET sms_status='pending',sms_status_at=?,updated_at=? WHERE changes()=1 AND id=?").bind(at,now,e.contactId),
  db.prepare("UPDATE contact_phones SET channel_status='pending',channel_status_at=?,updated_at=? WHERE changes()=1 AND contact_id=? AND phone_e164=?").bind(at,now,e.contactId,e.destination)
 ]);
 return result[0].results.length===1;
}
