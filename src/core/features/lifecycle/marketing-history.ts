/** Prefer the recorded handoff. A lost response can instead be proved by a
 * provider acceptance or delivery fact. These are recorded occurrence times,
 * never reconciliation time or a fabricated handoff timestamp. Unknown sends
 * remain protected separately by their durable transport/frequency fences. */
export const marketingOccurrenceSql = 'COALESCE(handed_off_at, provider_accepted_at, delivered_at)';
