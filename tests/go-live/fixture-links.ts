/** Fixed destination used by the go-live journeys. This is a network-edge
 * fixture, shared by the Worker and HTTP edge; policy stays in the real link
 * inspector. Answer here so a loaded Node edge cannot consume its DNS deadline.
 * All other hosts and operations continue through the configurable HTTP edge. */
export function fixtureLinkResponse(url: URL, method: string): Response | undefined {
  if (url.hostname === 'cloudflare-dns.com' && url.pathname === '/dns-query'
    && url.searchParams.get('name') === 'shop.example.test' && method === 'GET') {
    const type = url.searchParams.get('type');
    if (type === 'A') return Response.json({Status: 0, Answer: [{name: 'shop.example.test', type: 1, TTL: 300, data: '203.0.113.10'}]});
    if (type === 'AAAA') return Response.json({Status: 0, Answer: []});
  }
  if (url.hostname === 'shop.example.test' && method === 'HEAD') return new Response(null, {status: 200});
}
