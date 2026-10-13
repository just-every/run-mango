import { validSpf, type DnsInspection } from './dns';
import { domainName } from './identity';
import { VerificationError } from './types';

/** Configuration inspection, never an SPF result. Only mechanisms whose DNS
 * dependencies are inspected here are supported; unknown constructs block. */
export async function inspectSpf(dns: DnsInspection, domain: string, expected: string) {
  let lookups = 0;
  async function visit(name: string, ancestry: Set<string>, expectedRecord?: string): Promise<void> {
    if (ancestry.has(name) || ++lookups > 10) throw new VerificationError('spf-dns-cycle-or-limit');
    const path = new Set(ancestry).add(name);
    const records = (await dns.resolve(name, 'TXT')).filter(value => /^v=spf1(?:\s|$)/i.test(value));
    if (records.length !== 1 || !validSpf(records[0]) || expectedRecord !== undefined && records[0] !== expectedRecord) throw new VerificationError('spf-dns-mismatch');
    for (const token of records[0].trim().split(/\s+/).slice(1)) {
      const term = token.replace(/^[+?~-]/, '');
      if (term === 'all') continue;
      if (term.startsWith('include:') || term.startsWith('redirect=')) {
        await visit(domainName(term.slice(term.indexOf(term.startsWith('include:') ? ':' : '=') + 1)), path);
      } else if (term.startsWith('ip4:')) {
        const [address, prefix] = term.slice(4).split('/');
        if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(address) || address.split('.').some(octet => Number(octet) > 255)
          || prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) > 32)) throw new VerificationError('spf-address-malformed');
      } else if (term.startsWith('ip6:')) {
        const [address, prefix] = term.slice(4).split('/');
        try { new URL(`http://[${address}]/`); } catch { throw new VerificationError('spf-address-malformed'); }
        if (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) > 128)) throw new VerificationError('spf-address-malformed');
      } else if (/^[a-z][a-z0-9_.-]*=/i.test(term) && !term.startsWith('redirect=')) {
        // Unknown modifiers do not affect SPF authorization (RFC7208 6).
        continue;
      } else throw new VerificationError('spf-mechanism-unsupported');
    }
  }
  await visit(domain, new Set(), expected);
}
