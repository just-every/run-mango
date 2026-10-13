import { domainName } from '@/core/features/sender-verification/identity';
import { VerificationError, type DomainRecord, type ProviderDomain } from '@/core/features/sender-verification/types';

export async function readSendgridDomain(apiKey: string, domain: string, transport: typeof fetch = fetch): Promise<ProviderDomain> {
  const matches: Record<string, any>[] = [];
  for (let offset = 0; ; offset += 200) {
    if (offset >= 4000) throw new VerificationError('domain-list-incomplete', 'unknown');
    const response = await transport(`https://api.sendgrid.com/v3/whitelabel/domains?limit=200&offset=${offset}`, {
      headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new VerificationError('provider-domain-unavailable', 'unknown');
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new VerificationError('provider-domain-malformed');
    matches.push(...rows.filter(row => typeof row.domain === 'string' && domainName(row.domain) === domain));
    if (rows.length < 200) break;
  }
  if (matches.length !== 1) throw new VerificationError(matches.length ? 'domain-ambiguous' : 'domain-missing');
  const listed = matches[0];
  const response = await transport(`https://api.sendgrid.com/v3/whitelabel/domains/${encodeURIComponent(String(listed.id))}`, {
    headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new VerificationError('provider-domain-unavailable', 'unknown');
  const detail = await response.json() as Record<string, any>;
  if (detail.id !== listed.id || detail.domain !== listed.domain || detail.user_id !== listed.user_id) throw new VerificationError('domain-detail-mismatch');
  if (listed.valid !== true || detail.valid !== true || detail.automatic_security !== true) throw new VerificationError('domain-unverified');
  const records: DomainRecord[] = [];
  for (const [name, row] of Object.entries(detail.dns ?? {}) as [string, Record<string, any>][]) {
    if (!['mail_cname', 'dkim1', 'dkim2'].includes(name)) continue;
    if (row.valid !== true || row.type !== 'cname' || typeof row.data !== 'string') throw new VerificationError('domain-record-unverified');
    if (typeof row.host !== 'string') throw new VerificationError('domain-record-malformed');
    domainName(row.host.toLowerCase().replace('._domainkey.', '.domainkey.'));
    records.push({ record: name === 'mail_cname' ? 'SPF' : 'DKIM', name: row.host.toLowerCase().replace(/\.$/, ''), type: 'CNAME', value: domainName(row.data) });
  }
  if (!records.some(row => row.record === 'SPF') || records.filter(row => row.record === 'DKIM').length !== 2) throw new VerificationError('domain-records-missing');
  records.sort((a,b) => a.name.localeCompare(b.name));
  return { id: String(detail.id), name: domain, region: 'global', records, settings: JSON.stringify([detail.user_id, detail.automatic_security, detail.custom_spf]) };
}
