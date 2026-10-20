import { z } from 'zod';

const hostname = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

export const linkHostsSchema = z.string().max(25_000).transform(value =>
  [...new Set(value.split(',').map(host => host.trim().toLowerCase()).filter(Boolean))],
).refine(hosts => hosts.every(host => {
  const domain = host.startsWith('*.') ? host.slice(2) : host;
  return domain.length <= 253 && hostname.test(domain);
}), 'Enter comma-separated host names, such as shop.example.com or *.example.com, without https:// or paths.');

/** Plain entries match exactly; an explicit wildcard covers subdomains only. */
export function allowedLinkHost(host: string, hosts: readonly string[]) {
  const normalized = host.toLowerCase();
  return hosts.some(value => {
    const entry = value.toLowerCase();
    return entry.startsWith('*.')
      ? normalized.endsWith(`.${entry.slice(2)}`)
      : normalized === entry;
  });
}

/** Empty configuration follows the app's assigned origin; explicit settings replace it. */
export function configuredLinkHosts(value: string | undefined, origin: URL) {
  const hosts = linkHostsSchema.parse(value ?? '');
  return hosts.length ? hosts : [origin.hostname];
}
