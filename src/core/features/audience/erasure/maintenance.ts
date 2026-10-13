import type {Platform} from '@/core/shared/platform';
import {createContactErasure} from './service';
export async function pendingErasure(db:D1Database){return db.prepare("SELECT reference FROM audience_erasures WHERE state='pending' LIMIT 1").first<{reference:string}>();}
/** A queued continuation has only the authority granted by the committed request.
 * It cannot start a new erasure or choose another subject. */
export async function continueErasure(platform:Platform,reference:string){
  const db=platform.database.$client;
  const context={destination:'mango',authorization:{principalId:'erasure-maintenance',predicate:()=>({sql:"EXISTS(SELECT 1 FROM audience_erasures WHERE reference=?)",params:[reference]})}};
  const service=createContactErasure(db,platform.config.contactHashSalt,{ASSETS_BUCKET:platform.blobs});
  const prior=await service.read(reference);if(!prior||prior.state==='complete')return;
  const receipt=await service.advance(reference,context);
  if(receipt?.state==='pending')await platform.jobs.enqueue({kind:'contact.erase',idempotencyKey:`erasure:${reference}:${crypto.randomUUID()}`,payload:{reference}});
}
