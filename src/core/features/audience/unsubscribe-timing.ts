import {sha256} from '@/core/shared/ids';
/** used_at retains the original request time. updated_at records completion only
 * after CONT-004 has been applied. Legacy equal timestamps remain unmeasured.
 * A repeat must never overwrite the first request's completion measurement. */
export async function recordUnsubscribeCompletion(db:D1Database,token:string,requestedAt:Date) {
  await db.prepare(`UPDATE public_action_tokens SET updated_at=? WHERE token_digest=? AND purpose='unsubscribe'
    AND used_at=? AND updated_at=used_at`).bind(Date.now(),await sha256(token),requestedAt.getTime()).run();
}
