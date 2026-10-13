import { VerificationError, type DnsAnswer, type DnsSnapshot } from './types';

const typeCodes = { TXT: 16, MX: 15, CNAME: 5 } as const;
const normalize = (name: string) => name.toLowerCase().replace(/\.$/, '');
export function txt(value: string): string {
  if (!value.startsWith('"')) return value;
  const chunks = value.match(/"(?:[^"\\]|\\.)*"/g);
  if (!chunks || chunks.join(' ').replace(/\s/g, '') !== value.replace(/\s/g, '')) throw new VerificationError('dns-txt-malformed');
  try { return chunks.map(chunk => JSON.parse(chunk) as string).join(''); }
  catch { throw new VerificationError('dns-txt-malformed'); }
}
export function tags(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of value.split(';').map(value => value.trim()).filter(Boolean)) {
    const match = /^([a-z][a-z0-9]*)\s*=\s*([^;]*)$/i.exec(part);
    if (!match || Object.hasOwn(result, match[1].toLowerCase())) throw new VerificationError('dns-tags-malformed');
    result[match[1].toLowerCase()] = match[2].trim();
  }
  return result;
}
export function validSpf(value: string): boolean {
  const terms = value.trim().split(/\s+/);
  if (terms.shift()?.toLowerCase() !== 'v=spf1' || !terms.length) return false;
  const modifiers = new Set<string>();
  return terms.every(term => {
    const modifier = /^([a-z][a-z0-9_.-]*)=(\S+)$/i.exec(term);
    if (modifier) { if (modifiers.has(modifier[1])) return false; modifiers.add(modifier[1]); return true; }
    return /^[+?~-]?(?:all|(?:include|exists):[^\s:]+|(?:a|mx)(?::[^\s/]+)?(?:\/\d{1,3})?(?:\/\/\d{1,3})?|ip4:[0-9.]+(?:\/\d{1,2})?|ip6:[0-9a-f:]+(?:\/\d{1,3})?)$/i.test(term);
  });
}
export function createDnsInspection(now: number, transport: typeof fetch = fetch) {
  const snapshots = new Map<string, Promise<DnsSnapshot>>();
  const evidence: Array<{ name: string; type: string; values: string[] }> = [];
  let expiresAt = now + 300_000;
  async function resolve(name: string, type: keyof typeof typeCodes, ancestors = new Set<string>()): Promise<string[]> {
    if (ancestors.has(normalize(name)) || ancestors.size >= 8) throw new VerificationError('dns-alias-loop');
    const ancestry = new Set(ancestors).add(normalize(name));
    const key = `${normalize(name)}:${type}`;
    let request = snapshots.get(key);
    if (!request) {
      request = (async () => {
        const response = await transport(`https://cloudflare-dns.com/dns-query?${new URLSearchParams({ name, type })}`, {
          headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new VerificationError('dns-unavailable', 'unknown');
        const data = await response.json() as { Status?: number; Answer?: DnsAnswer[]; Authority?: DnsAnswer[]; TC?: boolean };
        if (![0, 3].includes(data.Status!) || data.TC) throw new VerificationError('dns-unavailable', 'unknown');
        const answers = data.Answer ?? [];
        const authority = data.Authority ?? [];
        if (!Array.isArray(answers) || !Array.isArray(authority)) throw new VerificationError('dns-malformed', 'unknown');
        for (const row of [...answers, ...authority]) {
          if (typeof row.name !== 'string' || typeof row.data !== 'string' || !Number.isInteger(row.type) || !Number.isFinite(row.TTL) || row.TTL <= 0) throw new VerificationError('dns-malformed', 'unknown');
        }
        const ttl = Math.min(300, ...[...answers, ...authority].map(row => row.type === 6 ? Math.min(row.TTL, Number(row.data.trim().split(/\s+/).at(-1))) : row.TTL));
        if (!answers.length && !authority.some(row => row.type === 6) || !Number.isFinite(ttl) || ttl <= 0) throw new VerificationError('dns-ttl-unknown', 'unknown');
        return { answers, expiresAt: now + ttl * 1000 };
      })();
      snapshots.set(key, request);
    }
    const snapshot = await request;
    expiresAt = Math.min(expiresAt, snapshot.expiresAt);
    let target = normalize(name);
    const seen = new Set<string>();
    while (true) {
      if (seen.has(target) || seen.size >= 8) throw new VerificationError('dns-alias-loop');
      seen.add(target);
      const aliases = snapshot.answers.filter(row => normalize(row.name) === target && row.type === 5);
      if (aliases.length > 1) throw new VerificationError('dns-alias-ambiguous');
      if (!aliases.length || type === 'CNAME') break;
      evidence.push({ name: target, type: 'CNAME', values: [normalize(aliases[0].data)] });
      target = normalize(aliases[0].data);
    }
    let values = snapshot.answers.filter(row => normalize(row.name) === target && row.type === typeCodes[type]).map(row => type === 'TXT' ? txt(row.data) : row.data);
    if (!values.length && target !== normalize(name)) values = await resolve(target, type, ancestry);
    values.sort();
    evidence.push({ name: normalize(name), type, values });
    return values;
  }
  return { resolve, snapshot: () => ({ evidence: [...evidence].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), expiresAt }) };
}
export type DnsInspection = ReturnType<typeof createDnsInspection>;
