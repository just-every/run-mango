/** Advisory policy only; safety findings never enter this acknowledgement allowlist. */
export function emailSubjectAdvisory(subject: string) {
  const length = [...subject.trim()].length;
  return length > 80 ? {
    kind: 'message.email-subject-length', status: 'advisory' as const, blocking: false,
    detail: `Email subject is ${length} characters. Some inboxes may truncate it; review the opening words.`,
  } : undefined;
}

export function isAcknowledgableFinding(check: {kind: string; status: string; blocking: boolean}) {
  return check.kind === 'message.email-subject-length' && check.status === 'advisory' && !check.blocking;
}
