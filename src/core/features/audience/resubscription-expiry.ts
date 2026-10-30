export const confirmationLifetimeMs=30*24*60*60*1000;

/** Expiry owns only recreated, still-unconfirmed request contacts. It never
 * touches the retained destination restrictions or an independently edited profile.
 * A bounded Cron pass and public signup admission share this same cleanup. */
export async function expireRecreatedContacts(db:D1Database,now=Date.now()) {
  const selected=`SELECT r.contact_id FROM audience_reconsent_contacts r JOIN contacts c ON c.id=r.contact_id
    WHERE r.expires_at<=? AND c.email_status IN ('pending','unsubscribed') AND c.merge_lock IS NULL
    AND NOT EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending')
    AND NOT EXISTS(SELECT 1 FROM consent_evidence e WHERE e.contact_id=c.id AND (e.confirmed_at IS NOT NULL OR e.capture_method NOT IN ('hosted-signup-form','kiosk')))
    AND NOT EXISTS(SELECT 1 FROM contact_history h WHERE h.contact_id=c.id AND h.kind NOT IN
      ('consent-captured','resubscribe-request','confirmation-attempted','confirmation-handed-off','confirmation-deferred','resubscribe-refused'))
    ORDER BY r.expires_at LIMIT 50`;
  // Recheck eligibility in every statement of the native transaction. Delete
  // the owning marker last, so all request rows use the same selection.
  const tables=['audience_signup_requests','consent_handoff_claims','consent_confirmations','consent_capture_metadata','consent_evidence','contact_history','contact_email_addresses'];
  await db.batch([
    ...tables.map(table=>db.prepare(table==='audience_signup_requests'
      ?`DELETE FROM ${table} WHERE id IN (SELECT id FROM consent_evidence WHERE contact_id IN (${selected}))`
      :`DELETE FROM ${table} WHERE contact_id IN (${selected})`).bind(now)),
    db.prepare(`DELETE FROM contacts WHERE id IN (${selected})`).bind(now),
    db.prepare('DELETE FROM audience_reconsent_contacts WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE id=contact_id)').bind(),
  ]);
}
