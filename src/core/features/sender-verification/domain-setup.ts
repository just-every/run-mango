import {domainName} from './identity';
import {createDnsInspection, tags} from './dns';
import {VerificationError} from './types';
type EdgeDomain = {id: number; domain: string; valid: boolean; dns: Record<string, {host: string; type: string; data: string}>};
export type SetupRecord = {purpose: string; name: string; type: 'CNAME' | 'TXT'; value: string; providerReturned: boolean; passed: boolean};
async function sendgrid(apiKey: string, path: string, method = 'GET', body?: unknown, transport: typeof fetch = fetch) {
  const response = await transport('https://api.sendgrid.com/v3/whitelabel/domains' + path, {method, headers: {Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json'},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw new VerificationError('provider-domain-unavailable', 'unknown');
  return response.json();
}
export async function setupSendgridDomain(apiKey: string, name: string, create = false, transport: typeof fetch = fetch) {
  const domain = domainName(name), matches: EdgeDomain[] = [];
  for (let offset = 0; ; offset += 200) {
    if (offset >= 20000) throw new VerificationError('domain-list-incomplete', 'unknown');
    const rows = await sendgrid(apiKey, `?limit=200&offset=${offset}&domain=${encodeURIComponent(domain)}`, 'GET', undefined, transport);
    if (!Array.isArray(rows)) throw new VerificationError('provider-domain-malformed');
    matches.push(...rows.filter(row => typeof row.domain === 'string' && domainName(row.domain) === domain));
    if (rows.length < 200) break;
  }
  if (matches.length > 1) throw new VerificationError('domain-ambiguous');
  const edge: EdgeDomain | undefined = matches[0] ?? (create ? await sendgrid(apiKey, '', 'POST', {domain, automatic_security: true}, transport) : undefined);
  if (!edge) return {domain, exists: false, providerValid: false, records: [] as SetupRecord[]};
  if (!Number.isSafeInteger(edge.id) || edge.id <= 0 || edge.domain !== domain || !edge.dns || typeof edge.dns !== 'object') throw new VerificationError('provider-domain-malformed');
  const records: SetupRecord[] = [];
  for (const [key, purpose] of [['mail_cname', 'SPF and return-path'], ['dkim1', 'DKIM selector 1'], ['dkim2', 'DKIM selector 2']]) {
    const row = edge.dns[key];
    if (!row || row.type.toLowerCase() !== 'cname' || typeof row.host !== 'string' || !row.host.toLowerCase().endsWith('.' + domain)) throw new VerificationError('domain-record-malformed');
    records.push({purpose, name: row.host.toLowerCase().replace(/\.$/, ''), type: 'CNAME', value: domainName(row.data), providerReturned: true, passed: false});
  }
  records.push({purpose: 'DMARC (recommended policy; preserve any existing policy)', name: '_dmarc.' + domain, type: 'TXT', value: 'v=DMARC1; p=none;', providerReturned: false, passed: false});
  const dns = createDnsInspection(Date.now(), transport);
  await Promise.all(records.map(async row => {
    try {
      const values = await dns.resolve(row.name, row.type);
      row.passed = row.type === 'CNAME' ? values.length === 1 && values[0].toLowerCase().replace(/\.$/, '') === row.value
        : values.length === 1 && tags(values[0]).v === 'DMARC1' && ['none', 'quarantine', 'reject'].includes(tags(values[0]).p);
    } catch {row.passed = false;}
  }));
  return {domain, exists: true, providerValid: edge.valid === true, records, domainId: edge.id};
}
export async function validateSendgridDomain(apiKey: string, domain: string, transport: typeof fetch = fetch) {
  const setup = await setupSendgridDomain(apiKey, domain, false, transport);
  if (!setup.domainId) throw new VerificationError('domain-missing');
  await sendgrid(apiKey, '/' + setup.domainId + '/validate', 'POST', {}, transport);
  return setupSendgridDomain(apiKey, domain, false, transport);
}
