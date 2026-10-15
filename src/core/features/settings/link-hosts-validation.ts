import { z } from 'zod';

const hostname = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

export const linkHostsSchema = z.string().max(25_000).transform(value =>
  [...new Set(value.split(',').map(host => host.trim().toLowerCase()).filter(Boolean))],
).refine(hosts => hosts.every(host => host.length <= 253 && hostname.test(host)),
  'Enter comma-separated host names, such as shop.example.com, without https:// or paths.');

/** Empty configuration follows the app's assigned origin; explicit settings replace it. */
export function configuredLinkHosts(value: string | undefined, origin: URL) {
  const hosts = linkHostsSchema.parse(value ?? '');
  return hosts.length ? hosts : [origin.hostname];
}
