// Only the external verification endpoint is doubled. The production signup
// route still enforces missing tokens, server-secret use, action and hostname.
let installed = false;
export function installSignupChallengeEdge() {
  if (installed) return;
  installed = true;
  const transport = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== 'https://challenges.cloudflare.com') return transport(input, init);
    const request = new Request(input, init);
    if (url.pathname !== '/turnstile/v0/siteverify' || request.method !== 'POST') throw new Error('Unexpected challenge request.');
    const form = new URLSearchParams(await request.text());
    if (form.get('secret') !== 'fixture-server-secret' || !form.get('remoteip')) throw new Error('Missing verification authority or IP.');
    return Response.json({success:/^browser-valid-token-[\w-]+$/.test(form.get('response')??''),challenge_ts:new Date().toISOString(),action:'newsletter-signup',hostname:'127.0.0.1'});
  };
}
