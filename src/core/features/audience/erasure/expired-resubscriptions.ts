import type {Platform} from '@/core/shared/platform';
import {createContactErasure,ErasureAdmissionConflict} from './service';

/** Expiry grants erasure authority only over the recreated, still-unconfirmed
 * contact. Reuse the durable cascade and source floors, including later copies.
 * Confirmation removes the expiry marker in its own native transaction. */
export async function beginExpiredResubscription(platform:Platform,now=Date.now()){
  const db=platform.database.$client;
  const due=await db.prepare(`SELECT contact_id FROM audience_resubscriptions
    WHERE expires_at<=? AND NOT EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending')
    ORDER BY expires_at LIMIT 1`).bind(now).first<{contact_id:string}>();
  if(!due)return;
  const predicate={sql:`EXISTS(SELECT 1 FROM audience_resubscriptions WHERE contact_id=? AND expires_at<=?)
    AND NOT EXISTS(SELECT 1 FROM consent_evidence WHERE contact_id=? AND confirmed_at IS NOT NULL)`,params:[due.contact_id,now,due.contact_id]};
  // A confirmation can win between discovery and admission; the same predicate
  // fences admission and all its restriction writes in one D1 transaction.
  const service=createContactErasure(db,platform.config.contactHashSalt,{ASSETS_BUCKET:platform.blobs});
  try {
    await service.begin(due.contact_id,{destination:'mango',authorization:{principalId:'resubscription-expiry',predicate:()=>predicate}});
  }catch(error){
    if(error instanceof ErasureAdmissionConflict)return;
    if(!await db.prepare(`SELECT 1 AS due WHERE ${predicate.sql}`).bind(...predicate.params).first())return;
    throw error;
  }
}
