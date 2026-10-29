import type { AppConfig } from '@/core/shared/platform';

/** A demo sends nothing, so its letters may link to its own pages at the origin it is served from: plain HTTP for
 * `rer demo` on a computer. Undefined outside a demo, where every link stays HTTPS (MSG-006). */
export const demoLinkOrigin = (config: Pick<AppConfig, 'demo' | 'publicBaseUrl'>) => config.demo ? config.publicBaseUrl.origin : undefined;

/** Sample letters link to the demo's own public pages. */
export function demoLetterLinks(origin: URL) {
  return [
    { label: 'Read past letters', destinationUrl: new URL('/archive', origin).href },
    { label: 'Subscribe to the newsletter', destinationUrl: new URL('/subscribe', origin).href },
  ];
}
