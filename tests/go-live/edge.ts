import {providerBehavior} from './provider-behavior';
import {smsProviderEdge} from './sms-provider-edge';
import {resendProviderEdge} from './resend-provider-edge';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

// Test-only network edge. The go-live Worker forwards every request Mango makes
// to api.sendgrid.com and cloudflare-dns.com here; anything else it refuses.
// It answers like SendGrid's v3 API and a DNS-over-HTTPS resolver for a sending
// domain authenticated with SendGrid (SPF via the mail CNAME, two DKIM CNAMEs,
// a DMARC record). Each mail send is recorded exactly as Mango serialized it.
export type EdgeSend = { to: string; messageId: string; outcome: 'accepted' | 'lost'; body: Record<string, any>; at:number };
type Answer = { type: number; data: string };

const quoted = (value: string) => (value.match(/.{1,255}/g) ?? []).map(part => JSON.stringify(part)).join(' ');
const dkimKey = () => generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

export async function providerEdge(options:{commerce?:(request:Record<string,unknown>)=>unknown; links?:Record<string,{status?:number;location?:string}>; woo?:(url:URL,request:IncomingMessage,response:ServerResponse)=>Promise<boolean>}={}) {
  const behavior=providerBehavior();
  const sms=smsProviderEdge();
  const keys = [dkimKey(), dkimKey()];
  const resend=resendProviderEdge(keys[0]);
  const sends: EdgeSend[] = [], relaySends: {body: Record<string, any>; authorization: string}[] = [], unexpected: string[] = [], lost = new Set<string>();
  const domainSetup = {exists: true, creates: 0, dnsPass: true, trackingCname: true, trackingHttps: true};
  // Stripe test-mode shapes for the paid tier: prices, Checkout sessions, subscriptions and customers.
  const stripe = {outage: false, sessions: [] as {authorization: string; form: URLSearchParams}[],
    subscriptions: {} as Record<string, {status: string; customer: string; metadata: Record<string, string>}>, customers: {} as Record<string, {email: string; name: string}>};
  const domain = { id: 123, user_id: 99, domain: 'example.test', valid: true, automatic_security: true, custom_spf: false, dns: {
    mail_cname: { valid: true, type: 'cname', host: 'em123.example.test', data: 'u99.wl.sendgrid.net' },
    dkim1: { valid: true, type: 'cname', host: 's1._domainkey.example.test', data: 's1.domainkey.u99.wl.sendgrid.net' },
    dkim2: { valid: true, type: 'cname', host: 's2._domainkey.example.test', data: 's2.domainkey.u99.wl.sendgrid.net' } } };
  const zone: Record<string, Answer[]> = {
    'mango-test.myshopify.com': [{type:1,data:'203.0.113.10'}],
    'shop.example.test':[{type:1,data:'203.0.113.10'}],
    'send.example.test':[{type:16,data:quoted('v=spf1 ip4:192.0.2.1 -all')}],
    'resend._domainkey.example.test':[{type:16,data:quoted(`v=DKIM1; k=rsa; p=${keys[0]}`)}],
    'em123.example.test': [{ type: 5, data: 'u99.wl.sendgrid.net.' }],
    'u99.wl.sendgrid.net': [{ type: 16, data: quoted('v=spf1 ip4:192.0.2.1 -all') }],
    's1._domainkey.example.test': [{ type: 5, data: 's1.domainkey.u99.wl.sendgrid.net.' }],
    's2._domainkey.example.test': [{ type: 5, data: 's2.domainkey.u99.wl.sendgrid.net.' }],
    's1.domainkey.u99.wl.sendgrid.net': [{ type: 16, data: quoted(`v=DKIM1; k=rsa; p=${keys[0]}`) }],
    's2.domainkey.u99.wl.sendgrid.net': [{ type: 16, data: quoted(`v=DKIM1; k=rsa; p=${keys[1]}`) }],
    '_dmarc.example.test': [{ type: 16, data: quoted('v=DMARC1; p=quarantine; psd=n') }],
  };
  for (const address of Object.keys(options.links ?? {})) zone[new URL(address).hostname] = [{type:1,data:'203.0.113.10'}];
  const codes: Record<string, number> = { CNAME: 5, TXT: 16, MX: 15, A:1, AAAA:28 };
  function resolve(name: string, type: string) {
    const answers: Array<Answer & { name: string; TTL: number }> = [];
    let target = name.toLowerCase().replace(/\.$/, '');
    for (let hops = 0; hops < 8; hops++) {
      const records = zone[target] ?? [];
      const alias = records.find(row => row.type === 5);
      if (alias && type !== 'CNAME') { answers.push({ name: target, TTL: 300, ...alias }); target = alias.data.replace(/\.$/, ''); continue; }
      answers.push(...records.filter(row => row.type === codes[type]).map(row => ({ name: target, TTL: 300, ...row })));
      break;
    }
    return answers.length ? { Status: 0, Answer: answers }
      : { Status: 3, Authority: [{ name: 'example.test', type: 6, TTL: 300, data: 'ns.example.test host.example.test 1 300 300 300 300' }] };
  }
  const body = async (request: IncomingMessage) => { const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(chunk); return Buffer.concat(chunks).toString('utf8'); };
  const json = (response: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}) => {
    response.writeHead(status, { 'Content-Type': 'application/json', ...headers }); response.end(JSON.stringify(value));
  };
  const server = createServer(async (request, response) => {
    const original = new URL(String(request.headers['x-edge-original-url']));
    if (original.hostname === 'relay.example.test' && original.pathname === '/mail' && request.method === 'POST') {
      relaySends.push({body: JSON.parse(await body(request)), authorization: String(request.headers.authorization)});
      response.writeHead(202); response.end(); return;
    }
    behavior.requests.push({method:request.method??'',path:original.pathname,at:Date.now()});
    if(await options.woo?.(original,request,response))return;
    if(await sms.handle(original,request,response))return;
    if(await resend.handle(original,request,response))return;
    const linked = options.links?.[original.href];
    if(linked && request.method==='HEAD') {response.writeHead(linked.status ?? (linked.location ? 302 : 200), linked.location ? {Location:linked.location} : {});response.end();return;}
    if(original.hostname==='shop.example.test'&&request.method==='HEAD'){response.writeHead(200);response.end();return;}
    if(original.hostname==='mango-test.myshopify.com' && options.commerce) {
      if(original.pathname.startsWith('/products/')) {response.writeHead(200,{'Content-Type':'text/html'});return response.end('<p>Product</p>');}
      return json(response,200,options.commerce(JSON.parse(await body(request))));
    }
    if (original.hostname === 'links.example.test' && request.method === 'HEAD') {response.writeHead(domainSetup.trackingHttps ? 200 : 503); response.end(); return;}
    if (original.hostname === 'cloudflare-dns.com' && original.searchParams.get('name') === 'links.example.test') return json(response, 200, {Status:0, Answer:[{name:'links.example.test', type:5, TTL:300, data:domainSetup.trackingCname ? 'mango.example.test.' : 'other.example.test.'}]});
    if (original.hostname === 'cloudflare-dns.com' && !domainSetup.dnsPass && original.searchParams.get('name') === 's1._domainkey.example.test') return json(response, 200, {Status:3, Authority:[{name:'example.test',type:6,TTL:300,data:'ns.example.test host.example.test 1 300 300 300 300'}]});
    if (original.hostname === 'cloudflare-dns.com') return json(response, 200, resolve(original.searchParams.get('name') ?? '', original.searchParams.get('type') ?? ''));
    if (original.hostname === 'api.stripe.com' && stripe.outage) return json(response, 503, {error: {message: 'Synthetic Stripe outage with private detail'}});
    if (original.hostname === 'api.stripe.com' && original.pathname === '/v1/prices/price_synthetic' && request.method === 'GET') return json(response, 200, {id: 'price_synthetic', type: 'recurring', active: true});
    if (original.hostname === 'api.stripe.com' && original.pathname === '/v1/checkout/sessions' && request.method === 'POST') {
      stripe.sessions.push({authorization: String(request.headers.authorization), form: new URLSearchParams(await body(request))});
      return json(response, 200, {id: `cs_synthetic_${stripe.sessions.length}`, url: `https://checkout.stripe.com/c/pay/cs_synthetic_${stripe.sessions.length}`});
    }
    const stripeObject = /^\/v1\/(subscriptions|customers)\/([A-Za-z0-9_]+)$/.exec(original.pathname);
    const known = stripeObject && (stripeObject[1] === 'subscriptions' ? stripe.subscriptions : stripe.customers)[stripeObject[2]];
    if (original.hostname === 'api.stripe.com' && known && request.method === 'GET') return json(response, 200, {id: stripeObject![2], ...known});
    if (original.hostname === 'api.stripe.com' && original.pathname === '/v1/charges/ch_fixture' && request.method === 'GET') return json(response, 200, {id:'ch_fixture', customer:'cus_fixture'});
    if (original.hostname === 'api.stripe.com' && original.pathname === '/v1/customers/cus_fixture' && request.method === 'GET') return json(response, 200, {id:'cus_fixture', email:'stripe-reader@example.test', name:'Taylor Orchard'});
    if (original.hostname === 'api.stripe.com' && original.pathname === '/v1/customers' && request.method === 'GET') return json(response, 200, {data: []});
    if (original.hostname === 'api.sendgrid.com') {
      if (original.pathname === '/v3/scopes' && request.method === 'GET') return json(response,behavior.healthStatus(),behavior.healthStatus()===200?{scopes:['mail.send']}:{errors:[{message:'Provider unavailable'}]});
      if (original.pathname === '/v3/whitelabel/domains' && request.method === 'GET') return json(response, 200, original.searchParams.get('offset') === '0' && domainSetup.exists ? [domain] : []);
      if (original.pathname === '/v3/whitelabel/domains' && request.method === 'POST') {const input = JSON.parse(await body(request)); if (input.domain !== 'example.test' || input.automatic_security !== true) return json(response,400,{}); domainSetup.creates++; domain.id=124; domainSetup.exists=true; return json(response,201,domain);}
      if (/^\/v3\/whitelabel\/domains\/\d+\/validate$/.test(original.pathname) && request.method === 'POST') return json(response,200,{valid:true});
      if (original.pathname === '/v3/whitelabel/domains/123' && request.method === 'GET') return json(response, 200, domain);
      // The Email Activity API is a paid add-on; this account does not have it.
      if (original.pathname.startsWith('/v3/messages')) return json(response, 403, { errors: [{ message: 'access forbidden' }] });
      if (original.pathname === '/v3/mail/send' && request.method === 'POST') {
        const sent = JSON.parse(await body(request)), to = String(sent.personalizations?.[0]?.to?.[0]?.email ?? '');
        const refusal=behavior.nextRefusal(to);
        behavior.attempts.push({to,status:refusal?.status??202,at:Date.now()});
        if(refusal)return json(response,refusal.status,{errors:[{message:'Synthetic provider rejection with private detail'}]},refusal.retryAfter===undefined?{}:{'Retry-After':String(refusal.retryAfter)});
        const messageId = randomBytes(11).toString('base64url');
        // SendGrid accepted it either way; a lost response leaves Mango uncertain.
        sends.push({ at:Date.now(),to, messageId, outcome: lost.has(to) ? 'lost' : 'accepted', body: sent });
        await behavior.responseDelay(Boolean(sent.headers?.['List-Unsubscribe']));
        if (lost.has(to)) return response.destroy();
        response.writeHead(202, { 'X-Message-Id': messageId }); return response.end();
      }
    }
    unexpected.push(`${request.method} ${original.href}`);
    json(response, 599, { error: 'unexpected edge request' });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Edge server has no port.');
  return { origin: `http://127.0.0.1:${address.port}`, dkimKey: keys[0], sends, relaySends, unexpected,behavior,sms,resend,domainSetup,stripe,
    loseResponseFor: (address: string) => lost.add(address),
    close: () => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }) };
}
