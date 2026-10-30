import {senderWriteGuard} from '@/core/features/settings/sender-authority';
import {effectiveRole} from '@/core/features/auth/product-roles';
import type {SenderWriteAuthority} from '@/core/features/settings/sender-authority';
import type {OptInMode} from './opt-in-modes';
import {recipientOptOutSql,recipientSuppressionSql} from './public-resubscribe-policy';
import type {Database} from '@/core/platform/db/client';
import type {consentEvidence} from './schema';
import {manualEmailEligibility} from './manual-email-policy';

/** Public capture records confirmed-only reconsent. All identity, profile and evidence
 * writes share the D1 transaction that checks the destination's current state. */
export function createPublicCaptureWriter(database: Database) {
  const db = database.$client;
  return async (evidence: typeof consentEvidence.$inferInsert, destinationHash: string, displayName?: string, captureIp?: string, policy?:{mode?:OptInMode;credentialId?:string;allowResubscribe?:boolean;operator?:SenderWriteAuthority}) => {
    const {id, contactId, destination} = evidence, now = evidence.createdAt.getTime(), occurred = evidence.occurredAt.getTime();
    const single=evidence.confirmationRequired===false;
    const manual=policy?.mode?.point==='manual' && Boolean(policy.operator) && policy.allowResubscribe===false;
    const owner = `COALESCE((SELECT contact_id FROM contact_email_addresses WHERE email=?),
      (SELECT id FROM contacts WHERE email=?), ?)`;
    const ownerValues = [destination, destination, contactId];
    // The absent evidence ID gates all capture writes. Single-mode subscription
    // follows the newly inserted evidence inside the same transaction,
    // so a concurrent replay cannot update a profile or append metadata/history.
    let eligible = `NOT EXISTS(SELECT 1 FROM consent_evidence WHERE id=?)
      AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND channel='email' AND (NOT (${recipientOptOutSql}) OR occurred_at>=?))
      AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel='email' AND (NOT (${recipientSuppressionSql}) OR occurred_at>=?))
      AND NOT EXISTS(SELECT 1 FROM contact_email_addresses WHERE email=? AND (channel_status='subscribed' OR (channel_status='suppressed' AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel='email' AND ${recipientSuppressionSql}))))
      AND NOT EXISTS(SELECT 1 FROM contacts WHERE (email=? OR id IN (SELECT contact_id FROM contact_email_addresses WHERE email=?))
        AND (email_status='subscribed' OR merge_lock IS NOT NULL OR (email_status='suppressed' AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel='email' AND ${recipientSuppressionSql}))))`;
    const guard = [id, destinationHash, occurred, destinationHash, occurred, destination, destinationHash, destination, destination, destinationHash];
    if(manual){
      const restriction=manualEmailEligibility(destination,destinationHash);
      eligible=`NOT EXISTS(SELECT 1 FROM consent_evidence WHERE id=?) AND ${restriction.sql}`;
      guard.splice(0,guard.length,id,...restriction.values);
    }
    if(single){
      if(!policy?.mode)throw new Error('Single opt-in requires its current capture-point policy.');
      eligible+=" AND EXISTS(SELECT 1 FROM opt_in_modes WHERE point=? AND mode='single' AND version=?)";
      guard.push(policy.mode.point,policy.mode.version);
    }
    if(!manual && (single||policy?.allowResubscribe===false)){
      eligible+=" AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND channel='email') AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel='email') AND NOT EXISTS(SELECT 1 FROM contacts WHERE (email=? OR id IN (SELECT contact_id FROM contact_email_addresses WHERE email=?)) AND email_status IN ('unsubscribed','suppressed')) AND NOT EXISTS(SELECT 1 FROM contact_email_addresses WHERE email=? AND channel_status IN ('unsubscribed','suppressed'))";
      guard.push(destinationHash,destinationHash,destination,destination,destination);
    }
    if(policy?.credentialId){eligible+=" AND EXISTS(SELECT 1 FROM integration_credentials WHERE id=? AND revoked_at IS NULL AND EXISTS(SELECT 1 FROM json_each(scopes_json) WHERE value='contacts:write'))";guard.push(policy.credentialId);}
    if(policy?.operator){
      const actor=policy.operator;
      eligible+=` AND ${senderWriteGuard} AND EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=? AND n.status='active' AND ${effectiveRole} IN ('owner','admin','manager','author'))`;
      guard.push(actor.sessionId,actor.operatorId,actor.version,Date.now(),actor.operatorId);
    }
    const isResubscribe = manual ? '0' : `EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND channel='email')
      OR EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel='email')
      OR EXISTS(SELECT 1 FROM contacts WHERE id=${owner} AND email_status IN ('unsubscribed','suppressed'))`;
    const resubscribeValues = manual ? [] : [destinationHash,destinationHash,...ownerValues];
    const restrictionTime=`COALESCE((SELECT MAX(occurred_at) FROM surviving_opt_outs WHERE destination_hash=? AND channel='email'),?)`;
    const statements = [
      db.prepare(`INSERT INTO audience_resubscriptions(contact_id,expires_at)
        SELECT ?,? WHERE ${eligible} AND NOT EXISTS(SELECT 1 FROM contacts WHERE id=${owner})
        AND EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND channel='email')`)
        .bind(contactId,now+30*24*60*60*1000,...guard,...ownerValues,destinationHash),
      db.prepare(`INSERT INTO contacts(id,email,display_name,email_status,sms_status,email_status_at,sms_status_at,last_activity_at,created_at,updated_at)
        SELECT ?,?,?,CASE WHEN ${isResubscribe} THEN 'unsubscribed' ELSE 'pending' END,'non-subscribed',${restrictionTime},?,?,?,? WHERE ${eligible}
        AND NOT EXISTS(SELECT 1 FROM contacts WHERE email=?)
        AND NOT EXISTS(SELECT 1 FROM contact_email_addresses WHERE email=?) ON CONFLICT DO NOTHING`)
        .bind(contactId, destination, displayName?.trim() || destination, ...resubscribeValues, destinationHash, occurred, now, occurred, now, now, ...guard, destination, destination),
      db.prepare(`INSERT INTO contact_email_addresses(id,contact_id,email,channel_status,channel_status_at,created_at,updated_at)
        SELECT ?,${owner},?,CASE WHEN ${isResubscribe} THEN 'unsubscribed' ELSE 'pending' END,${restrictionTime},?,? WHERE ${eligible}
        AND EXISTS(SELECT 1 FROM contacts WHERE id=${owner}) ON CONFLICT(email) DO NOTHING`)
        .bind(`${id}_email`, ...ownerValues, destination, ...resubscribeValues, destinationHash, occurred, now, now, ...guard, ...ownerValues),
      db.prepare(`UPDATE contacts SET display_name=COALESCE(NULLIF(?,''),display_name),email_status=CASE WHEN email_status IN ('subscribed','unsubscribed','suppressed') THEN email_status ELSE 'pending' END,email_status_at=CASE WHEN email_status IN ('subscribed','unsubscribed','suppressed') THEN email_status_at ELSE ? END,
        last_activity_at=MAX(COALESCE(last_activity_at,?),?),updated_at=? WHERE id=${owner} AND ${eligible}`)
        .bind(displayName?.trim() ?? '', occurred, occurred, occurred, now, ...ownerValues, ...guard),
      db.prepare(`UPDATE contact_email_addresses SET channel_status=CASE WHEN channel_status IN ('subscribed','unsubscribed','suppressed') THEN channel_status ELSE 'pending' END,channel_status_at=CASE WHEN channel_status IN ('subscribed','unsubscribed','suppressed') THEN channel_status_at ELSE ? END,updated_at=? WHERE email=? AND ${eligible}`)
        .bind(occurred, now, destination, ...guard),
    ];
    if (captureIp) statements.push(db.prepare(`INSERT INTO consent_capture_metadata(id,contact_id,capture_ip,confirmation_ip,created_at,updated_at)
      SELECT ?,${owner},?,NULL,?,? WHERE ${eligible}`).bind(id, ...ownerValues, captureIp, now, now, ...guard));
    statements.push(
      db.prepare(`INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at)
        SELECT ?,${owner},'resubscribe-request',?,?,?,? WHERE ${eligible} AND (${isResubscribe})`)
        .bind(`${id}_resubscribe`,...ownerValues,`Recipient requested email resubscription through ${evidence.captureMethod}; confirmation required.`,occurred,occurred,occurred,...guard,...resubscribeValues),
      db.prepare(`INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at)
        SELECT ?,${owner},'consent-captured',?,?,?,? WHERE ${eligible}`)
        .bind(`${id}_captured`, ...ownerValues, `email consent captured through ${evidence.captureMethod}.`, occurred, occurred, occurred, ...guard),
      db.prepare(`INSERT INTO consent_evidence(id,contact_id,channel,destination,brand_or_legal_sender,sms_program,message_category,
        frequency_disclosure,destination_jurisdiction,capture_method,capture_source,consent_text,consent_version,occurred_at,
        confirmation_required,confirmed_at,created_at,updated_at)
        SELECT ?,${owner},'email',?,?,NULL,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${eligible} RETURNING id`)
        .bind(id, ...ownerValues, destination, evidence.brandOrLegalSender, evidence.messageCategory, evidence.frequencyDisclosure,
          evidence.destinationJurisdiction, evidence.captureMethod, evidence.captureSource, evidence.consentText, evidence.consentVersion,
          occurred, evidence.confirmationRequired?1:0, evidence.confirmedAt?.getTime()??null, now, now, ...guard),
    );
    const evidenceIndex=statements.length-1;
    if(single)statements.push(
      db.prepare(`UPDATE contacts SET email_status='subscribed',email_status_at=CASE WHEN email_status='subscribed' THEN email_status_at ELSE ? END,last_activity_at=MAX(COALESCE(last_activity_at,0),?),updated_at=?
        WHERE changes()=1 AND id=(SELECT contact_id FROM consent_evidence WHERE id=? AND confirmation_required=0) AND email_status NOT IN ('unsubscribed','suppressed')`).bind(occurred,occurred,now,id),
      db.prepare(`UPDATE contact_email_addresses SET channel_status='subscribed',channel_status_at=CASE WHEN channel_status='subscribed' THEN channel_status_at ELSE ? END,updated_at=?
        WHERE changes()=1 AND email=? AND contact_id=(SELECT contact_id FROM consent_evidence WHERE id=? AND confirmation_required=0) AND channel_status NOT IN ('unsubscribed','suppressed')`).bind(occurred,now,destination,id)
    );
    statements.push(db.prepare(`UPDATE audience_resubscriptions SET expires_at=MAX(expires_at,?)
      WHERE contact_id=(SELECT contact_id FROM consent_evidence WHERE id=?)`).bind(now+30*24*60*60*1000,id));
    const result = await db.batch(statements);
    // D1's change count includes reporting triggers; only the evidence row
    // returned by this guarded insert authorizes confirmation delivery.
    return result[evidenceIndex].results.length === 1;
  };
}
