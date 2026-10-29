import assert from 'node:assert/strict';

/** Requests only the disposable installation. Diagnostics never include bodies. */
export function nativeHttp({request, origin, cookie}) {
 return async function json(path, body, method = body === undefined ? 'GET' : 'POST', extra = {}) {
  const response = await request(new URL(path, origin), {method,
   headers: {Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', ...extra},
   ...(body === undefined ? {} : {body: JSON.stringify(body)})});
  const failure=response.ok?null:await response.clone().json().catch(()=>null);
  const reasons=['provider-rejected','verification-unavailable','dns-malformed','dns-ttl-unknown','domain-missing','domain-records-missing','domain-unverified','provider-pacing','authentication-failed','domain-sending-disabled'];
  const reason=reasons.find(value=>failure?.reason===value||failure?.detail?.includes(value));
  assert.ok(response.ok, `Native fixture ${method} ${path.split('?')[0]} returned ${response.status}${reason?' ('+reason+')':''}`);
  return response.json();
 };
}

export async function mailAllowance(){
 const rate=(await import('./mail-rate.mjs')).default();
 await new Promise(resolve=>setTimeout(resolve,Math.ceil(60000/Number(rate))+50));
}
