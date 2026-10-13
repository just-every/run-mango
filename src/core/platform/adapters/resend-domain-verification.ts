import { domainName } from '@/core/features/sender-verification/identity';
import { VerificationError, type DomainRecord, type ProviderDomain } from '@/core/features/sender-verification/types';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new VerificationError('provider-response-malformed', 'unknown');
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new VerificationError('provider-response-malformed', 'unknown');
  return value;
}
export async function readResendDomain(apiKey: string, domain: string, transport: typeof fetch = fetch): Promise<ProviderDomain> {
  const get = async (path: string) => {
    const response = await transport(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new VerificationError(response.status === 401 || response.status === 403 ? 'provider-access-denied' : 'provider-unavailable', 'unknown');
    return record(await response.json());
  };
  let after: string | undefined;
  const seen = new Set<string>();
  const matches: Record<string, unknown>[] = [];
  // A bounded complete scan. Hitting this limit is unknown, never absence.
  for (let pageNumber = 0; ; pageNumber++) {
    if (pageNumber === 100) throw new VerificationError('domain-list-incomplete', 'unknown');
    const query = new URLSearchParams({ limit: '100' });
    if (after) query.set('after', after);
    const page = await get(`/domains?${query}`);
    if (!Array.isArray(page.data) || typeof page.has_more !== 'boolean') throw new VerificationError('domain-list-incomplete', 'unknown');
    for (const value of page.data) {
      const row = record(value), id = string(row.id);
      if (seen.has(id)) throw new VerificationError('domain-list-incomplete', 'unknown');
      seen.add(id);
      if (domainName(string(row.name)) === domain) matches.push(row);
      after = id;
    }
    if (!page.has_more) break;
    if (!page.data.length) throw new VerificationError('domain-list-incomplete', 'unknown');
  }
  if (matches.length !== 1) throw new VerificationError(matches.length ? 'domain-ambiguous' : 'domain-missing');
  const listed = matches[0];
  const detail = await get(`/domains/${encodeURIComponent(string(listed.id))}`);
  if (detail.id !== listed.id || domainName(string(detail.name)) !== domain || detail.region !== listed.region) throw new VerificationError('domain-detail-mismatch');
  if (detail.status !== 'verified' || listed.status !== 'verified') throw new VerificationError('domain-unverified');
  if (record(detail.capabilities).sending !== 'enabled' || record(listed.capabilities).sending !== 'enabled') throw new VerificationError('domain-sending-disabled');
  if (!Array.isArray(detail.records)) throw new VerificationError('domain-records-missing');
  const records: DomainRecord[] = detail.records.map(record).filter(item => item.record === 'SPF' || item.record === 'DKIM').map(item => {
    if (item.status !== 'verified') throw new VerificationError('domain-record-unverified');
    if (!['TXT', 'MX', 'CNAME'].includes(string(item.type))) throw new VerificationError('domain-record-unsupported');
    const label = string(item.name).toLowerCase();
    const name = label === '@' ? domain : label === domain || label.endsWith(`.${domain}`) ? label : `${label}.${domain}`;
    return { record: item.record as 'SPF' | 'DKIM', name, type: item.type as DomainRecord['type'], value: string(item.value),
      ...(item.type === 'MX' ? { priority: Number(item.priority) } : {}) };
  });
  if (!records.some(row => row.record === 'SPF' && row.type === 'TXT') || !records.some(row => row.record === 'DKIM')) throw new VerificationError('domain-records-missing');
  records.sort((a, b) => `${a.name}:${a.type}`.localeCompare(`${b.name}:${b.type}`));
  return { id: string(detail.id), name: domain, region: string(detail.region), records,
    settings: JSON.stringify([detail.open_tracking, detail.click_tracking, detail.tracking_subdomain]) };
}
