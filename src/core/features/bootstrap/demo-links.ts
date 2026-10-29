const hostedDemo = new URL('https://demo.run-mango.com');

/** Letters may only carry HTTPS links, so a plain-HTTP local demo points at the hosted demo, whose pages answer. */
const linkBase = (origin: URL) => origin.protocol === 'https:' ? origin : hostedDemo;

/** Host names the sample letters link to; the demo allows exactly these. */
export const demoLinkHosts = (origin: URL) => [...new Set([origin.hostname, linkBase(origin).hostname])];

/** Sample letters link to the demo's own public pages. */
export function demoLetterLinks(origin: URL) {
  return [
    { label: 'Read past letters', destinationUrl: new URL('/archive', linkBase(origin)).href },
    { label: 'Subscribe to the newsletter', destinationUrl: new URL('/subscribe', linkBase(origin)).href },
  ];
}
