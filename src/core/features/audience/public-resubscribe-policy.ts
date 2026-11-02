export const recipientReasons = ['recipient-unsubscribe','provider-unsubscribe','unsubscribe','operator-recorded-opt-out','preference-unsubscribe','import-unsubscribed'];
const erasureReason = 'erasure-opt-out';
/** The id prefix of an erasure opt-out written by an erasure that kept the address's own reasons
 * beside it (CONT-013). An erasure before that dropped those reasons and wrote a plain id. */
export const retainingErasureId = 'erasure-retained:';

/** Only recipient unsubscribe reasons can be superseded by public confirmed consent; unknown
 * reasons, including owner blocks, fail closed. An erasure opt-out follows only the reasons its own
 * erasure kept beside it: rows that already existed when that erasure wrote it. An earlier erasure
 * dropped them, so its lone opt-out cannot establish whether the erased person had a bounce or
 * complaint, and it stays refused whatever opt-outs arrive later. The derived table's renamed
 * columns let the unqualified ones name the caller's opt-out row under any alias. */
export const recipientOptOutSql = `(reason IN (${recipientReasons.map(reason => `'${reason}'`).join(',')}) OR reason GLOB 'import-unsubscribed:*'
  OR (reason='${erasureReason}' AND id GLOB '${retainingErasureId}*' AND EXISTS(SELECT 1 FROM (SELECT destination_hash AS kept_hash,channel AS kept_channel,reason AS kept_reason,created_at AS kept_at FROM surviving_opt_outs) kept
    WHERE kept_hash=destination_hash AND kept_channel=channel AND kept_reason<>'${erasureReason}' AND kept_at<=created_at)))`;
export const recipientSuppressionSql = "(cause IN ('recipient-unsubscribe','provider-unsubscribe','unsubscribe') AND (provider_event_id IS NULL OR provider_event_id NOT LIKE 'integration:%'))";

/** recipientOptOutSql over every opt-out that one destination and channel hold. */
export function recipientOptOuts(rows: Array<{id: string; reason: string; createdAt: Date}>) {
  return rows.every(row => row.reason === erasureReason
    ? row.id.startsWith(retainingErasureId) && rows.some(other => other.reason !== erasureReason && other.createdAt.getTime() <= row.createdAt.getTime())
    : recipientReasons.includes(row.reason) || row.reason.startsWith('import-unsubscribed:'));
}
export function recipientSuppression(row: {cause:string;providerEventId:string|null}) {
  return ['recipient-unsubscribe','provider-unsubscribe','unsubscribe'].includes(row.cause) && !row.providerEventId?.startsWith('integration:');
}
