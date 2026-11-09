import type {IncomingMessage, ServerResponse} from 'node:http';
export const mailchimpHost = 'us21.api.mailchimp.com';
export const mailchimpKey = 'synthetic-mango-300-us21';
export const mailchimpList = 'a1b2c3d4';

/** Mailchimp Marketing API shapes for the parallel run: the audience, its webhook and member status writes. */
export function mailchimpEdge(members: string[]) {
  const status = new Map(members.map(email => [email, 'subscribed'])), webhooks = new Map<string, string>();
  const writes: Array<{email: string; status: string; ok: boolean}> = [], unauthorized: string[] = [];
  // Mailchimp calls the webhook address before it registers it; a refusal there fails the registration.
  const state = {failWrites: 0, down: false, validate: undefined as undefined | ((url: string) => Promise<number>)};
  const send = (response: ServerResponse, code: number, value?: unknown) => {
    response.writeHead(code, {'Content-Type': 'application/json'}); response.end(value === undefined ? undefined : JSON.stringify(value));
  };
  return {status, webhooks, writes, unauthorized, state, async handle(url: URL, request: IncomingMessage, response: ServerResponse) {
    if (url.hostname !== mailchimpHost) return false;
    if (request.headers.authorization !== 'Basic ' + Buffer.from('mango:' + mailchimpKey).toString('base64')) { unauthorized.push(url.pathname); send(response, 401, {status: 401}); return true; }
    const base = `/3.0/lists/${mailchimpList}`;
    let body = ''; for await (const chunk of request) body += chunk;
    if (url.pathname === base && request.method === 'GET') { send(response, 200, {id: mailchimpList, name: 'Garden audience'}); return true; }
    if (url.pathname === base + '/webhooks' && request.method === 'POST') {
      const callback = JSON.parse(body).url;
      if (state.validate && await state.validate(callback) !== 200) { send(response, 400, {status: 400, detail: 'The URL could not be validated.'}); return true; }
      const id = 'hook' + (webhooks.size + 1); webhooks.set(id, callback); send(response, 200, {id}); return true;
    }
    const hook = new RegExp(`^${base}/webhooks/([^/]+)$`).exec(url.pathname);
    if (hook && request.method === 'DELETE') { send(response, webhooks.delete(hook[1]) ? 204 : 404); return true; }
    const member = new RegExp(`^${base}/members/([^/]+)$`).exec(url.pathname);
    if (member && request.method === 'PATCH') {
      const email = decodeURIComponent(member[1]), next = JSON.parse(body).status;
      if (state.down || state.failWrites > 0) { state.failWrites = Math.max(0, state.failWrites - 1); writes.push({email, status: next, ok: false}); send(response, 503, {status: 503}); return true; }
      if (!status.has(email)) { send(response, 404, {status: 404}); return true; }
      status.set(email, next); writes.push({email, status: next, ok: true}); send(response, 200, {email_address: email, status: next}); return true;
    }
    send(response, 404, {status: 404}); return true;
  }};
}
