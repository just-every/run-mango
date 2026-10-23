import type {Platform} from '@/core/shared/platform';
import {shopDomain} from './install-security';

async function secretKey(secret:string){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode('mango-shopify-install-v1:'+secret)),'AES-GCM',false,['encrypt','decrypt']);}
export async function encryptShopifySecret(value:unknown,key:string){const iv=crypto.getRandomValues(new Uint8Array(12)),bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv},await secretKey(key),new TextEncoder().encode(JSON.stringify(value)));return JSON.stringify([Array.from(iv),Array.from(new Uint8Array(bytes))]);}
export async function readShopifyInstallation(platform:Pick<Platform,'database'|'config'>){
  const row=await platform.database.$client.prepare('SELECT shop,token_cipher,scopes_json,expires_at,channel_id,proxy_path,pixel_id FROM shopify_installation WHERE id=1').first<{shop:string;token_cipher:string;scopes_json:string;expires_at:number|null;channel_id:string;proxy_path:string;pixel_id:string|null}>();
  if(!row)return null;
  if(!shopDomain.test(row.shop))throw new Error('Stored Shopify shop is invalid.');
  const [iv,cipher]=JSON.parse(row.token_cipher);
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(iv)},await secretKey(platform.config.sessionSigningKey),new Uint8Array(cipher));
  return {...row,...JSON.parse(new TextDecoder().decode(bytes)) as {accessToken:string}};
}
