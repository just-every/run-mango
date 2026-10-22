import {z} from 'zod';
import type {Platform} from '@/core/shared/platform';
import {createWooCommerceAdapter} from './adapter';

export const connectionSchema = z.object({
  url: z.string().url().max(2048).transform(value => {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port || !/^[a-z0-9.-]+$/i.test(url.hostname)
      || !url.hostname.includes('.') || /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname) || /^[\d.]+$/.test(url.hostname)) throw new Error('Use a public HTTPS store URL.');
    url.pathname = url.pathname.replace(/\/+$/, '') + '/'; return url.href;
  }),
  key: z.string().min(16).max(512), secret: z.string().min(16).max(512), signingSecret: z.string().min(16).max(512),
  exclusiveSecret: z.literal(true),
}).strict();
export type WooConnection = {id: string; url: string; key: string; secret: string; signingSecret: string; generation: string};
type Stored = {id: string; url: string; credentials: string; generation: string};
async function encryptionKey(secret: string) {
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mango-woocommerce-v1:' + secret)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptCredentials(value: Pick<WooConnection, 'key'|'secret'|'signingSecret'>, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await encryptionKey(secret), new TextEncoder().encode(JSON.stringify(value)));
  return JSON.stringify([Array.from(iv), Array.from(new Uint8Array(cipher))]);
}
export async function readWooConnection(platform: Pick<Platform, 'database'|'config'>): Promise<WooConnection | null> {
  const row = await platform.database.$client.prepare('SELECT id,url,credentials,generation FROM woocommerce_connection WHERE slot=1').first<Stored>();
  if (!row) return null;
  const [iv, cipher] = JSON.parse(row.credentials);
  const value = await crypto.subtle.decrypt({name: 'AES-GCM', iv: new Uint8Array(iv)}, await encryptionKey(platform.config.sessionSigningKey), new Uint8Array(cipher));
  return {...JSON.parse(new TextDecoder().decode(value)), id: row.id, url: row.url, generation: row.generation};
}
export async function loadWooCommerce(platform: Platform) {
  const connection = await readWooConnection(platform);
  if (!connection) return;
  // The existing snapshot freshness model has one store authority per source.
  // Never silently replace an installation-configured commerce adapter.
  if (platform.commerce && !platform.commerce.capabilities().provider?.startsWith('woocommerce:')) throw new Error('Conflicting commerce connections.');
  platform.commerce = createWooCommerceAdapter(connection);
}
