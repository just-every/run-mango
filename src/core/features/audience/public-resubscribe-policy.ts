/** Only recipient unsubscribe reasons can be superseded by public confirmed consent.
 * Unknown reasons, including owner blocks, fail closed. Erasure-only legacy records
 * cannot establish whether the erased person had a bounce or complaint. */
export const recipientOptOutSql = "(reason IN ('recipient-unsubscribe','provider-unsubscribe','unsubscribe','operator-recorded-opt-out','preference-unsubscribe','erasure-unsubscribe') OR reason='import-unsubscribed' OR reason GLOB 'import-unsubscribed:*')";
export const recipientSuppressionSql = "(cause IN ('recipient-unsubscribe','provider-unsubscribe','unsubscribe') AND (provider_event_id IS NULL OR provider_event_id NOT LIKE 'integration:%'))";

export function recipientOptOut(reason: string) {
  return ['recipient-unsubscribe','provider-unsubscribe','unsubscribe','operator-recorded-opt-out','preference-unsubscribe','erasure-unsubscribe','import-unsubscribed'].includes(reason) || reason.startsWith('import-unsubscribed:');
}
export function recipientSuppression(row: {cause:string;providerEventId:string|null}) {
  return ['recipient-unsubscribe','provider-unsubscribe','unsubscribe'].includes(row.cause) && !row.providerEventId?.startsWith('integration:');
}
