/** The Mailchimp Marketing API v3 calls a parallel run makes. The key lives only in this invocation's headers. */
export class IncumbentError extends Error {
  constructor(readonly reason: string, readonly status?: number) { super(reason); }
  /** A refusal the incumbent will repeat; timeouts, 429 and 5xx are worth another attempt. */
  get transient() { return this.status === undefined || this.status === 429 || this.status >= 500; }
}

export function serverPrefix(apiKey: string) {
  const prefix = /-([a-z]{2}\d{1,2})$/.exec(apiKey)?.[1];
  if (!prefix) throw new IncumbentError('A Mailchimp key ends with its data centre, for example -us21.');
  return prefix;
}

export function mailchimp(apiKey: string, prefix = serverPrefix(apiKey)) {
  async function request(path: string, method = 'GET', body?: unknown) {
    let response: Response;
    try {
      response = await fetch(`https://${prefix}.api.mailchimp.com/3.0${path}`, {
        method, redirect: 'manual', signal: AbortSignal.timeout(15000),
        headers: {Authorization: 'Basic ' + btoa('mango:' + apiKey), ...(body === undefined ? {} : {'Content-Type': 'application/json'})},
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
      });
    } catch { throw new IncumbentError('Mailchimp could not be reached.'); }
    if (!response.ok) throw new IncumbentError(response.status === 401 || response.status === 403 ? 'Mailchimp refused this key.' : `Mailchimp request failed (${response.status}).`, response.status);
    if (response.status === 204) return null;
    return await response.json().catch(() => { throw new IncumbentError('Mailchimp returned invalid JSON.'); }) as Record<string, any>;
  }
  const list = (id: string) => `/lists/${encodeURIComponent(id)}`;
  return {
    audience: (listId: string) => request(list(listId)),
    createWebhook: (listId: string, url: string) => request(`${list(listId)}/webhooks`, 'POST', {url,
      events: {subscribe: true, unsubscribe: true, profile: true, cleaned: true, upemail: true, campaign: false}, sources: {user: true, admin: true, api: true}}),
    deleteWebhook: (listId: string, id: string) => request(`${list(listId)}/webhooks/${encodeURIComponent(id)}`, 'DELETE'),
    /** Mailchimp accepts the member's address in place of the subscriber hash. A member the audience does not hold answers 404. */
    unsubscribeMember: (listId: string, email: string) => request(`${list(listId)}/members/${encodeURIComponent(email)}`, 'PATCH', {status: 'unsubscribed'}),
  };
}
