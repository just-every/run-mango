import { expect, test } from '@playwright/test';

import { createLinkInspector } from '../src/core/platform/link-inspector';

function dns(address: string) {
  return new Response(JSON.stringify({ Answer: [{ data: address }] }), { status: 200 });
}

test('link inspection follows only declared public HTTPS redirect targets', async () => {
  const calls: Array<{ url: string; method?: string }> = [];
  const inspect = createLinkInspector(['example.test'], (async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
    if (url.startsWith('https://cloudflare-dns.com/')) return dns('203.0.113.10');
    if (url === 'https://example.test/start') return new Response(null, { status: 302, headers: { Location: '/done' } });
    return new Response(null, { status: 204 });
  }) as typeof fetch);

  await expect(inspect.inspect('https://example.test/start')).resolves.toMatchObject({
    ok: true,
    finalUrl: 'https://example.test/done',
  });
  expect(calls.filter((call) => call.method === 'HEAD')).toHaveLength(2);
});

test('link inspection fails before requesting a private or undeclared destination', async () => {
  const inspect = createLinkInspector(['example.test'], (async () => {
    throw new Error('must not fetch');
  }) as typeof fetch);

  await expect(inspect.inspect('http://example.test')).resolves.toMatchObject({ ok: false });
  await expect(inspect.inspect('https://127.0.0.1/private')).resolves.toMatchObject({ ok: false });
  await expect(inspect.inspect('https://other.test')).resolves.toMatchObject({ ok: false });
});
