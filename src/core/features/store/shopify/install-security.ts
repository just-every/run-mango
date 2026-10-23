import {hmacSha256Hex,timingSafeEqual} from '@/core/platform/crypto';
export const shopDomain=/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
export const installationScopes=['read_customers','read_products','read_inventory','read_locations','read_orders','read_all_orders','read_returns','read_pixels','read_customer_events','write_pixels','write_app_proxy'] as const;

/** Shopify's OAuth callback grammar differs from its app-proxy signature. */
export async function verifyInstallQuery(query: URLSearchParams, secret: string) {
  for(const key of query.keys())if(query.getAll(key).length!==1)throw new Error('Duplicate OAuth callback parameter.');
  const shop=query.get('shop')??'',signature=query.get('hmac')??'';
  if(!shopDomain.test(shop))throw new Error('The shop must be its canonical myshopify.com domain.');
  if(!/^[a-f0-9]{64}$/.test(signature))throw new Error('Shopify callback HMAC is invalid.');
  const message=[...query].filter(([key])=>key!=='hmac').sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,value])=>`${key}=${value}`).join('&');
  if(!timingSafeEqual(signature,await hmacSha256Hex(secret,message)))throw new Error('Shopify callback HMAC is invalid.');
  const code=query.get('code')??'',state=query.get('state')??'';
  if(!code||code.length>2048||!state||state.length>4096)throw new Error('Shopify callback is incomplete.');
  return {shop,code,state};
}
