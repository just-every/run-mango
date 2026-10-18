/** Advisory policy only; safety findings never enter this acknowledgement allowlist. */
export function emailSubjectAdvisory(subject: string) {
  const length = [...subject.trim()].length;
  return length > 80 ? {
    kind: 'message.email-subject-length', status: 'advisory' as const, blocking: false,
    detail: `Email subject is ${length} characters. Some inboxes may truncate it; review the opening words.`,
  } : undefined;
}

const acknowledgableKinds = new Set([
  'message.email-subject-length', 'message.email-image-alt', 'message.email-heading-order',
  'message.email-link-text', 'message.email-spam-wording', 'message.email-size-advisory',
]);
export function isAcknowledgableFinding(check: {kind: string; status: string; blocking: boolean}) {
  return acknowledgableKinds.has(check.kind) && check.status === 'advisory' && !check.blocking;
}
