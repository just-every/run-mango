import type {Platform} from '@/core/shared/platform';
export type HostSource={host:string;source:string;sourceId:string};
const social=['www.instagram.com','www.facebook.com','www.tiktok.com','www.youtube.com','www.linkedin.com','x.com','www.pinterest.com'];
const originals=new WeakMap<object,string[]>();
export function originalLinkHosts(platform:Pick<Platform,'config'>){let saved=originals.get(platform.config);if(!saved){saved=[...platform.config.allowedLinkHosts];originals.set(platform.config,saved);}return saved;}
function urlHost(value:unknown){if(value instanceof URL)value=value.href;if(typeof value!=='string')return;try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.hostname;}catch{}}
export async function derivedHostSources(platform:Pick<Platform,'config'|'database'|'commerce'>){
 const rows:HostSource[]=[{host:platform.config.publicBaseUrl.hostname,source:'Deployment host',sourceId:'deployment'},...social.map(host=>({host,source:'Social defaults',sourceId:'social-defaults'}))];
 const module=platform.config.modules?.commerce;
 if(module?.enabled&&platform.commerce?.capabilities().provider==='shopify'){const host=urlHost(module.config?.storeUrl);if(host)rows.push({host,source:'Configured Shopify connection host',sourceId:'shopify-configuration'});}
 const db=platform.database.$client,woo=await db.prepare('SELECT id,url FROM woocommerce_connection WHERE slot=1').first<{id:string;url:string}>();
 if(woo){const host=urlHost(woo.url);if(host)rows.push({host,source:'WooCommerce storefront',sourceId:'woocommerce:'+woo.id});
  const sourceId='woocommerce:'+woo.id+':catalog',prefix=`woocommerce:${woo.id}:product:`;
  const products=(await db.prepare("SELECT DISTINCT json_extract(payload,'$.url') url FROM source_records WHERE provider=? AND source_type='product' AND substr(provider_source_id,1,length(?))=?").bind('woocommerce:'+woo.id,prefix,prefix).all<{url:string}>()).results;
  const hosts=[...new Set(products.map(product=>urlHost(product.url)).filter((host):host is string=>Boolean(host)))];
  for(const host of hosts)rows.push({host,source:'WooCommerce catalog',sourceId});
 }
 return [...new Map(rows.map(row=>[row.host+'|'+row.sourceId,row])).values()];
}
export async function refreshHostSources(platform:Pick<Platform,'database'>,next:HostSource[]){
 const db=platform.database.$client,previous=(await db.prepare('SELECT host,source_id AS sourceId,source FROM link_host_sources').all<HostSource>()).results,now=Date.now();
 const oldKeys=new Set(previous.map(row=>row.host+'|'+row.sourceId)),newKeys=new Set(next.map(row=>row.host+'|'+row.sourceId));
 const changes=[...previous.filter(row=>!newKeys.has(row.host+'|'+row.sourceId)).map(row=>({...row,added:false})),...next.filter(row=>!oldKeys.has(row.host+'|'+row.sourceId)).map(row=>({...row,added:true}))];
 for(const row of changes){const operation=crypto.randomUUID();await db.batch([
  row.added?db.prepare('INSERT INTO link_host_sources(host,source_id,source,created_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(row.host,row.sourceId,row.source,now):db.prepare('DELETE FROM link_host_sources WHERE host=? AND source_id=?').bind(row.host,row.sourceId),
  db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
   SELECT ?,?,'link-host',?,?,'system','link-host-sources',?,?,? WHERE changes()=1`).bind(operation,operation,row.host,row.added?'link-host.source-added':'link-host.source-removed',JSON.stringify({host:row.host,source:row.source}),now,now)
 ]);}
}
