import { readSendgridDomain } from '@/core/platform/adapters/sendgrid-domain-verification';
import { readResendDomain } from '@/core/platform/adapters/resend-domain-verification';
import { createDnsInspection, tags, txt } from './dns';
import { inspectSpf } from './spf';
import { inspectDmarc } from './dmarc';
import { digest } from './identity';
import { VerificationError, type SenderBinding } from './types';

export async function inspectConfiguration(binding: SenderBinding, apiKey: string, now: number, transport: typeof fetch = fetch) {
  const provider = await (binding.provider === 'sendgrid' ? readSendgridDomain : readResendDomain)(apiKey, binding.domain, transport);
  try {
  const dns = createDnsInspection(now, transport);
  let spfDomain = '', signingDomain = '', selector = '', keyDigest = '';
  const signingKeys: Array<{ signingDomain: string; selector: string; keyDigest: string }> = [];
  for (const row of provider.records) {
    const values = await dns.resolve(row.name, row.type);
    if (row.type === 'MX') {
      if (!values.some(value => value.toLowerCase().replace(/\.$/, '') === `${row.priority} ${row.value.toLowerCase().replace(/\.$/, '')}`)) throw new VerificationError('spf-mx-mismatch');
    } else if (row.record === 'SPF') {
      if (row.type === 'CNAME') {
        const aliases = await dns.resolve(row.name, 'CNAME');
        if (aliases.length !== 1 || aliases[0].replace(/\.$/, '') !== row.value) throw new VerificationError('spf-alias-mismatch');
        const values = await dns.resolve(row.name, 'TXT');
        const spf = values.filter(value => /^v=spf1\s/i.test(value));
        if (spf.length !== 1) throw new VerificationError('spf-record-conflict');
        await inspectSpf(dns, row.name, spf[0]);
      } else await inspectSpf(dns, row.name, txt(row.value));
      spfDomain = row.name;
    } else {
      const keyRecords = row.type === 'CNAME' ? await dns.resolve(row.name, 'TXT') : values;
      if (row.type === 'CNAME' && (values.length !== 1 || values[0].replace(/\.$/, '') !== row.value.replace(/\.$/, ''))) throw new VerificationError('dkim-alias-mismatch');
      if (keyRecords.length !== 1) throw new VerificationError('dkim-key-conflict');
      const key = tags(keyRecords[0]);
      if (!key.p || !/^[a-zA-Z0-9+/]+={0,2}$/.test(key.p.replace(/\s/g, '')) || key.v && key.v !== 'DKIM1' || key.k && !['rsa', 'ed25519'].includes(key.k)) throw new VerificationError('dkim-key-revoked-or-invalid');
      try {
        const bytes = Uint8Array.from(atob(key.p.replace(/\s/g, '')), character => character.charCodeAt(0));
        if (key.k === 'ed25519') {
          if (bytes.length !== 32) throw new Error('Invalid Ed25519 key');
        } else {
          const imported = await crypto.subtle.importKey('spki', bytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
          if ((imported.algorithm as RsaKeyAlgorithm).modulusLength < 1024) throw new Error('Invalid RSA key');
        }
      } catch { throw new VerificationError('dkim-key-revoked-or-invalid'); }
      if (row.type === 'TXT' && tags(txt(row.value)).p !== key.p) throw new VerificationError('dkim-key-mismatch');
      const parts = row.name.split('._domainkey.');
      if (parts.length !== 2 || !parts[0] || (signingDomain && signingDomain !== parts[1])) throw new VerificationError('dkim-selector-ambiguous');
      [selector, signingDomain] = parts;
      keyDigest = await digest(key);
      signingKeys.push({ signingDomain, selector, keyDigest });
    }
  }
  if (!spfDomain || !signingDomain) throw new VerificationError('dns-records-missing');
  const dmarc = await inspectDmarc(dns, binding.domain, spfDomain, signingDomain);
  const snapshot = dns.snapshot();
  const configurationDigest = await digest({ provider, dns: snapshot.evidence, dmarc, engine: 'rfc9989-v1' });
  return { provider, dns: snapshot.evidence, dmarc, resolver: 'cloudflare-dns.com', checkedAt: now, configurationDigest, expiresAt: snapshot.expiresAt, spfDomain, signingDomain, selector, keyDigest, signingKeys,
    aligned: dmarc.spfAligned || dmarc.dkimAligned };
  } catch (error) {
    const failure = error instanceof VerificationError ? error : new VerificationError('dns-unavailable', 'unknown');
    failure.providerVerified = true;
    throw failure;
  }
}
export type ConfigurationInspection = Awaited<ReturnType<typeof inspectConfiguration>>;
