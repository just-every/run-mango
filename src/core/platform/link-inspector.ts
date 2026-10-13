import type { LinkInspection, LinkInspector } from '@/core/shared/platform';

const resolver = 'https://cloudflare-dns.com/dns-query';
const maxRedirects = 3;
const timeoutMs = 5_000;

function privateAddress(value: string) {
  const address = value.toLowerCase();
  if (address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')) return true;
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = parts;
  return first === 0 || first === 10 || first === 127 || first >= 224
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19));
}

function allowed(host: string, hosts: string[]) {
  const normalized = host.toLowerCase();
  return hosts.some((entry) => normalized === entry || normalized.endsWith(`.${entry}`));
}

async function addressesFor(host: string, request: typeof fetch): Promise<string[]> {
  const found = new Set<string>();
  for (const type of ['A', 'AAAA']) {
    const response = await request(`${resolver}?name=${encodeURIComponent(host)}&type=${type}`, {
      headers: { Accept: 'application/dns-json' },
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`DNS resolver returned HTTP ${response.status}.`);
    const body = await response.json() as { Answer?: Array<{ data?: unknown }> };
    for (const answer of body.Answer ?? []) if (typeof answer.data === 'string') found.add(answer.data);
  }
  return [...found];
}

export function createLinkInspector(allowedHosts: string[], request: typeof fetch = fetch): LinkInspector {
  return {
    async inspect(value: string): Promise<LinkInspection> {
      let current: URL;
      try {
        current = new URL(value);
      } catch {
        return { ok: false, detail: 'Link is not an absolute URL.' };
      }
      for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
        if (current.protocol !== 'https:') return { ok: false, detail: 'Link must use HTTPS.' };
        if (!allowed(current.hostname, allowedHosts)) return { ok: false, detail: `Link host ${current.hostname} is not allowed.` };
        if (privateAddress(current.hostname)) return { ok: false, detail: `Link host ${current.hostname} is a private-network address.` };
        try {
          const addresses = await addressesFor(current.hostname, request);
          if (addresses.length === 0) return { ok: false, detail: `Link host ${current.hostname} did not resolve.` };
          if (addresses.some(privateAddress)) return { ok: false, detail: `Link host ${current.hostname} resolves to a private-network address.` };
          const response = await request(current, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('Location');
            if (!location) return { ok: false, detail: 'Link redirect has no Location header.' };
            current = new URL(location, current);
            continue;
          }
          if (!response.ok) return { ok: false, detail: `Link returned HTTP ${response.status}.` };
          return { ok: true, finalUrl: current.toString(), detail: 'Link and every redirect target are reachable and allowed.' };
        } catch {
          return { ok: false, detail: `Link host ${current.hostname} could not be resolved and checked.` };
        }
      }
      return { ok: false, detail: `Link exceeded the ${maxRedirects} redirect limit.` };
    },
  };
}
