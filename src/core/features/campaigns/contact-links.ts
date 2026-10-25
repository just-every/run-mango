import { canonicalEmail } from '../audience/identity';

export type ContactLink = { kind: 'email' | 'phone' | 'text'; destination: string; subject?: string; body?: string };

/** Contact destinations have no network host. Reject header injection, extra recipients and unknown parameters. */
export function contactLink(value: string): ContactLink | undefined {
  const match = /^(mailto|tel|sms):([^?#]+)(?:\?([^#]*))?$/i.exec(value);
  if (!match || /[\u0000-\u001f\u007f{}<>"\\]/.test(value) || /%(?![0-9a-f]{2})/i.test(value)) return;
  try {
    const [, protocol, encoded, query] = match;
    const scheme = protocol.toLowerCase();
    const destination = decodeURIComponent(encoded);
    if (/[\u0000-\u001f\u007f,;?&#]/.test(destination)) return;
    if (query && /\s/.test(query)) return;
    if (query) decodeURIComponent(query);
    const params = new URLSearchParams(query);
    const allowed = scheme === 'mailto' ? ['subject', 'body'] : scheme === 'sms' ? ['body'] : [];
    for (const [key, content] of params) {
      if (!allowed.includes(key) || params.getAll(key).length !== 1 || /[\u0000-\u001f\u007f]/.test(content)) return;
    }
    if (scheme === 'mailto') {
      if (destination !== destination.trim() || !canonicalEmail(destination)) return;
    } else {
      if (!/^[+\d\s().-]+$/.test(destination)) return;
      const number = destination.replace(/[\s().-]/g, '');
      if (!/^\+[1-9]\d{7,14}$/.test(number) && !/^\d{10}$/.test(number)) return;
    }
    return {kind: scheme === 'mailto' ? 'email' : scheme === 'tel' ? 'phone' : 'text', destination,
      ...(params.has('subject') ? {subject: params.get('subject')!} : {}),
      ...(params.has('body') ? {body: params.get('body')!} : {})};
  } catch { return; }
}

export function safeEmailLink(value: string, managed = false) {
  if (managed && ['{{unsubscribe_url}}','{{preferences_url}}'].includes(value)) return true;
  if (contactLink(value)) return true;
  if (/[\u0000- \u007f-\u00a0{}"<>]/.test(value)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
