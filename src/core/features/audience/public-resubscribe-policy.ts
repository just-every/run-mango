const recipientReasons = ['recipient-unsubscribe','provider-unsubscribe','unsubscribe','operator-recorded-opt-out','preference-unsubscribe','import-unsubscribed'];
const erasureReason = 'erasure-opt-out';

/** Only recipient unsubscribe reasons can be superseded by public confirmed consent; unknown
 * reasons, including owner blocks, fail closed. Erasure keeps each restricted address's own
 * opt-outs and adds an erasure opt-out beside them (CONT-013), so that erasure opt-out follows
 * the reasons kept with it. Alone, as a legacy erasure left it, it cannot establish whether the
 * erased person had a bounce or complaint. The derived table's renamed columns let the unqualified
 * ones name the caller's opt-out row under any alias. */
export const recipientOptOutSql = `(reason IN (${recipientReasons.map(reason => `'${reason}'`).join(',')}) OR reason GLOB 'import-unsubscribed:*'
  OR (reason='${erasureReason}' AND EXISTS(SELECT 1 FROM (SELECT destination_hash AS kept_hash,channel AS kept_channel,reason AS kept_reason FROM surviving_opt_outs) kept
    WHERE kept_hash=destination_hash AND kept_channel=channel AND kept_reason<>'${erasureReason}')))`;
export const recipientSuppressionSql = "(cause IN ('recipient-unsubscribe','provider-unsubscribe','unsubscribe') AND (provider_event_id IS NULL OR provider_event_id NOT LIKE 'integration:%'))";

/** recipientOptOutSql over every opt-out that one destination and channel hold. */
export function recipientOptOuts(rows: Array<{reason: string}>) {
  return rows.every(row => row.reason === erasureReason ? rows.some(other => other.reason !== erasureReason)
    : recipientReasons.includes(row.reason) || row.reason.startsWith('import-unsubscribed:'));
}
export function recipientSuppression(row: {cause:string;providerEventId:string|null}) {
  return ['recipient-unsubscribe','provider-unsubscribe','unsubscribe'].includes(row.cause) && !row.providerEventId?.startsWith('integration:');
}
