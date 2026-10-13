import type { Platform } from '@/core/shared/platform';

export const signupLimits = { networkPerHour: 5, destinationPerDay: 3, globalPerHour: 50 } as const;

// URL's IPv6 parser canonicalizes valid alternate forms; explicit character and
// IPv4 checks prevent URL syntax, zones, abbreviated IPv4 and hostnames entering keys.
export function signupNetwork(ip: string): string | undefined {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    const bytes = ip.split('.');
    if (bytes.some(part => Number(part) > 255 || String(Number(part)) !== part)) return undefined;
    return bytes.join('.');
  }
  if (!/^[a-fA-F0-9:.]+$/.test(ip) || !ip.includes(':')) return undefined;
  let canonical: string;
  try { canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1); } catch { return undefined; }
  const [left, right] = canonical.split('::');
  const start = left ? left.split(':') : [];
  const end = right ? right.split(':') : [];
  const parts = canonical.includes('::') ? [...start, ...Array(8 - start.length - end.length).fill('0'), ...end] : start;
  if (parts.length !== 8) return undefined;
  const words = parts.map(part => parseInt(part, 16));
  if (words.slice(0,5).every(word=>word===0) && words[5]===0xffff) return [words[6]>>8,words[6]&255,words[7]>>8,words[7]&255].join('.');
  return `${words.slice(0,4).map(word=>word.toString(16)).join(':')}::/64`;
}

const reservationTimeSql = "CAST(strftime('%s','now') AS INTEGER)*1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)";

// Both variants share the monotonic atomic counter. Public requests use the
// database-clock variant so awaited input or challenge work cannot freeze a window.
function allowanceSql(windowSql: string) {
  return `INSERT INTO oa_limits(key,window,count) VALUES(?,${windowSql},1)
    ON CONFLICT(key) DO UPDATE SET window=excluded.window,
      count=CASE WHEN oa_limits.window=excluded.window THEN oa_limits.count+1 ELSE 1 END
    WHERE oa_limits.window<excluded.window OR (oa_limits.window=excluded.window AND oa_limits.count<?)
    RETURNING count, window, ${reservationTimeSql} AS reservedAt`;
}

export async function takeSignupAllowance(db: D1Database, key: string, window: number, limit: number) {
  return Boolean(await db.prepare(allowanceSql('?')).bind(key, window, limit).first());
}

export async function reserveSignupAllowance(db: D1Database, key: string, period: 'hour' | 'day', limit: number) {
  const seconds = period === 'hour' ? 3600 : 86400;
  // SQLite guarantees every 'now' in one step has the same value, including RETURNING.
  return db.prepare(allowanceSql(`CAST(strftime('%s','now') AS INTEGER)/${seconds}`))
    .bind(key, limit).first<{count: number; window: number; reservedAt: number}>();
}

export async function verifySignupChallenge(platform: Platform, token: unknown, ip: string) {
  const config = platform.config.signupTurnstile;
  if (!config) return true;
  if (!config.siteKey || !config.secretKey || typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'},
      body: new URLSearchParams({secret:config.secretKey,response:token,remoteip:ip}).toString(),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return Boolean(result && typeof result === 'object' && 'success' in result && result.success === true
      && 'action' in result && result.action === 'newsletter-signup'
      && 'hostname' in result && result.hostname === platform.config.publicBaseUrl.hostname);
  } catch { return false; }
}
