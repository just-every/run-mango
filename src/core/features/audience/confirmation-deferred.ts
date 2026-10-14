import type { Database } from '@/core/platform/db/client';
import type { ProviderDeferredError } from '@/core/shared/provider-deferred-error';

/** Only the shared transport's typed preflight refusal may release a claim.
 * The original pending confirmation is retained; this is not a queued resend. */
export async function recordConfirmationDeferral(database: Database, input: {contactId: string;consentId: string}, error: ProviderDeferredError) {
 const id=`${input.consentId}_confirmation`,now=Date.now();
 const detail=`Email confirmation was not handed to the provider. A fresh consent request may be attempted after ${error.retryAt.toISOString()}.`;
 await database.$client.batch([
  database.$client.prepare(`INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at)
   VALUES(?,?,'confirmation-deferred',?,?,?,?) ON CONFLICT(id) DO UPDATE SET detail=excluded.detail,updated_at=excluded.updated_at`)
   .bind(`${id}:deferred`,input.contactId,detail,now,now,now),
  database.$client.prepare('DELETE FROM consent_handoff_claims WHERE id=? AND contact_id=?').bind(id,input.contactId),
 ]);
}
