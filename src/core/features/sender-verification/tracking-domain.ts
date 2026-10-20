import type {Platform} from '@/core/shared/platform';
import {createDnsInspection} from './dns';
import {domainName} from './identity';
export async function inspectTrackingDomain(host: string, target: string, transport: typeof fetch = fetch) {
  host = domainName(host); target = domainName(target);
  if (host === target || /^(?:localhost|.*\.localhost|.*\.local|.*\.internal)$/.test(host) || /^[0-9.]+$/.test(host)) throw new Error('invalid_tracking_host');
  let cname = false, https = false;
  try {
    const values = await createDnsInspection(Date.now(), transport).resolve(host, 'CNAME');
    cname = values.length === 1 && values[0].toLowerCase().replace(/\.$/, '') === target;
    // HTTPS uses the platform's normal certificate verification. Redirects and errors cannot pass.
    if (cname) https = (await transport('https://' + host + '/', {method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(10000)})).ok;
  } catch { /* A failed check never authorizes a rewrite. */ }
  return {host, target, cname, https, passed: cname && https, checkedAt: Date.now()};
}
export async function trackingDomainStatus(platform: Pick<Platform, 'database' | 'config'>) {
  const row = await platform.database.$client.prepare('SELECT host FROM tracking_domain WHERE id=1').first<{host: string}>();
  return row ? inspectTrackingDomain(row.host, platform.config.publicBaseUrl.hostname) : null;
}
