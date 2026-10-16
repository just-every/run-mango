import { tags, type DnsInspection } from './dns';
import { domainName } from './identity';
import { VerificationError } from './types';

type Policy = { domain: string; p: string; aspf: 's' | 'r'; adkim: 's' | 'r'; psd?: string };
export function prefetchDmarc(dns: DnsInspection, domain: string) {
  let target = domain;
  for (;;) {
    dns.prefetch(`_dmarc.${target}`, 'TXT');
    const labels = target.split('.');
    if (labels.length === 1) break;
    target = labels.slice(labels.length >= 8 ? labels.length - 7 : 1).join('.');
  }
}
async function policyAt(dns: DnsInspection, domain: string): Promise<Policy | undefined> {
  const candidates = (await dns.resolve(`_dmarc.${domain}`, 'TXT')).filter(value => /^v=DMARC1(?:;|$)/.test(value));
  // RFC9989 discards multiple records. Mango blocks rather than claiming a pass
  // under an ambiguous parent policy.
  if (candidates.length > 1) throw new VerificationError('dmarc-policy-conflict');
  if (!candidates.length) return;
  const parsed = tags(candidates[0]);
  if (!['none', 'quarantine', 'reject'].includes(parsed.p) || ['sp', 'np'].some(key => parsed[key] && !['none', 'quarantine', 'reject'].includes(parsed[key]))
      || parsed.aspf && !['r', 's'].includes(parsed.aspf) || parsed.adkim && !['r', 's'].includes(parsed.adkim)
      || parsed.psd && !['y', 'n', 'u'].includes(parsed.psd)) throw new VerificationError('dmarc-policy-malformed');
  return { domain, p: parsed.p, aspf: (parsed.aspf ?? 'r') as 's' | 'r', adkim: (parsed.adkim ?? 'r') as 's' | 'r', psd: parsed.psd };
}
/** RFC9989 4.10: at most eight queries, including the starting domain. */
async function walk(dns: DnsInspection, domain: string) {
  // Fetch raw answers concurrently; policy validation still observes the RFC
  // walk and stops at its original boundary, without retaining unused evidence.
  prefetchDmarc(dns, domain);
  const policies: Policy[] = [];
  let target = domain;
  for (;;) {
    const policy = await policyAt(dns, target);
    if (policy) policies.push(policy);
    if (policy?.psd === 'n' || policy?.psd === 'y') break;
    const labels = target.split('.');
    if (labels.length === 1) break;
    target = labels.slice(labels.length >= 8 ? labels.length - 7 : 1).join('.');
  }
  const terminal = policies.at(-1);
  const organizationalDomain = terminal?.psd === 'y' && terminal.domain !== domain
    ? domain.split('.').slice(-(terminal.domain.split('.').length + 1)).join('.')
    : terminal?.domain ?? domain;
  return { policies, organizationalDomain };
}
export function createDmarcInspection(dns: DnsInspection, from: string) {
  const pendingSource = (async () => {
    domainName(from);
    return walk(dns, from);
  })();
  // Configuration validation still takes precedence over a source-policy error.
  void pendingSource.catch(() => {});
  return async (spf: string, dkim: string) => {
    for (const name of [from, spf, dkim]) domainName(name);
    const source = await pendingSource;
    const policy = source.policies.find(row => row.domain === from)
      ?? source.policies.find(row => row.domain === source.organizationalDomain)
      ?? source.policies.find(row => row.psd === 'y');
    if (!policy) throw new VerificationError('dmarc-policy-missing');
    const aligned = async (domain: string, mode: 's' | 'r') => domain === from || mode === 'r' && (await walk(dns, domain)).organizationalDomain === source.organizationalDomain;
    const [spfAligned, dkimAligned] = await Promise.all([aligned(spf, policy.aspf), aligned(dkim, policy.adkim)]);
    return { policy, spfAligned, dkimAligned };
  };
}
