import {createLinkInspector} from '@/core/platform/link-inspector';
import {readWebhookBytes} from '@/core/platform/adapters/webhook-body';
import type {WooConnection} from './connection';
export function wooApi(connection: WooConnection) {
  const base = new URL(connection.url);
  return async (path: string) => {
    const url = new URL('wp-json/wc/v3/' + path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname + 'wp-json/wc/v3/')) throw new Error('WooCommerce endpoint refused.');
    // No credential is sent to DNS checks or redirect targets. The same public
    // destination policy used by Mango's other store requests applies here.
    const check = await createLinkInspector([base.hostname]).inspect(base.href);
    if (!check.ok) throw new Error('WooCommerce store is not reachable at its public HTTPS URL.');
    let response: Response;
    try {response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(10000), headers: {Authorization: 'Basic ' + btoa(connection.key + ':' + connection.secret), Accept: 'application/json'}});}
    catch {throw new Error('WooCommerce API request failed (no response).');}
    if (!response.ok) throw new Error(`WooCommerce API request failed (${response.status}).`);
    const raw = await readWebhookBytes(new Request('https://response.invalid', {method: 'POST', body: response.body, duplex: 'half'} as RequestInit), 4 * 1024 * 1024);
    const value: unknown = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw));
    return {value, totalPages: response.headers.get('X-WP-TotalPages')};
  };
}
