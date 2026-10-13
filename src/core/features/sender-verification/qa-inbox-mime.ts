import { VerificationError } from './types';
import { tags } from './dns';

export function headersFromMime(raw: string) {
  const end = raw.indexOf('\r\n\r\n');
  if (end < 0 || end > 128 * 1024) throw new VerificationError('receiver-raw-malformed');
  const headers: Array<{ name: string; value: string }> = [];
  for (const line of raw.slice(0,end).split('\r\n')) {
    if (/^[ \t]/.test(line) && headers.length) headers.at(-1)!.value += ' ' + line.trim();
    else { const m = /^([^:]+):\s*(.*)$/.exec(line); if (!m) throw new VerificationError('receiver-raw-malformed'); headers.push({ name: m[1].toLowerCase(), value: m[2] }); }
  }
  return { headers, body: raw.slice(end + 4) };
}

/** Trusted receiver confirms signature validity; independently require full-body coverage and matching digest. */
export async function signedBodyCoverage(raw: string, domain: string, selector: string) {
  const { headers, body } = headersFromMime(raw);
  const signatures = headers.filter(h => h.name === 'dkim-signature').map(h => tags(h.value))
    .filter(s => s.d === domain && s.s === selector);
  if (signatures.length !== 1) throw new VerificationError('receiver-signature-ambiguous');
  const signature = signatures[0];
  if ('l' in signature || signature.a !== 'rsa-sha256' || !signature.b || !signature.h) throw new VerificationError('receiver-signature-coverage');
  const signedHeaders = signature.h.toLowerCase().split(':').map(h => h.trim());
  if (!['from','to','subject'].every(h => signedHeaders.includes(h))) throw new VerificationError('receiver-signature-coverage');
  const mode = (signature.c ?? 'simple/simple').split('/')[1] ?? 'simple';
  if (!['simple','relaxed'].includes(mode)) throw new VerificationError('receiver-signature-canonicalization');
  let lines = body.split('\r\n');
  if (mode === 'relaxed') lines = lines.map(line => line.replace(/[ \t]+/g, ' ').replace(/[ \t]+$/, ''));
  while (lines.at(-1) === '') lines.pop();
  const canonical = lines.join('\r\n') + '\r\n';
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical)));
  if (btoa(String.fromCharCode(...digest)) !== signature.bh?.replace(/\s/g,'')) throw new VerificationError('receiver-body-digest-mismatch');
  return { headers, signature };
}
