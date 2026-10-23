import {Hono} from 'hono';
import type {Platform} from '@/core/shared/platform';
import type {AuthVariables} from '@/core/features/auth/routes';
import {configuredLinkHosts,linkHostsSchema} from './link-hosts-validation';
import {senderWriteAuthority,senderWriteGuard,SenderAuthorityChanged} from './sender-authority';
import {effectiveRole} from '@/core/features/auth/product-roles';
import {derivedHostSources,originalLinkHosts,refreshHostSources,type HostSource} from './link-host-sources';
const roleGuard=`EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=? AND n.status='active' AND ${effectiveRole} IN ('owner','admin','manager'))`;
export async function linkHostState(platform:Pick<Platform,'database'|'config'|'commerce'>){
 const original=originalLinkHosts(platform),db=platform.database.$client;
 const row=await db.prepare('SELECT hosts,auto_sources FROM link_host_settings WHERE id=1').first<{hosts:string;auto_sources:number}>();
 const derived:HostSource[]=!row||row.auto_sources?await derivedHostSources(platform):[];
 const excluded=new Set((await db.prepare('SELECT host FROM link_host_exclusions').all<{host:string}>()).results.map(row=>row.host));
 const operator=row?configuredLinkHosts(row.hosts,platform.config.publicBaseUrl):original;
 const hosts=[...new Set([...operator,...derived.map(row=>row.host)])].filter(host=>!excluded.has(host));
 platform.config.allowedLinkHosts.splice(0,platform.config.allowedLinkHosts.length,...hosts);
 return {hosts,derived,operator,autoSources:row?.auto_sources??1,operatorSource:row?'Operator entry':'Deployment configuration'};
}
export async function loadLinkHosts(platform:Pick<Platform,'database'|'config'|'commerce'>){return (await linkHostState(platform)).hosts;}
export async function persistLinkHostSources(platform:Pick<Platform,'database'|'config'|'commerce'>){
 const state=await linkHostState(platform);
 await refreshHostSources(platform,state.derived.filter(row=>state.hosts.includes(row.host)));
}
export function createLinkHostRoutes(platform:Platform){
 const routes=new Hono<{Variables:AuthVariables}>(),db=platform.database.$client;
 // Connection changes share the authenticated request's erasure write fence.
 routes.use('/settings/woocommerce',async(c,next)=>{
  await next();
  if(c.res.ok && ['PUT','DELETE'].includes(c.req.method))await persistLinkHostSources(platform);
 });
 const status=async()=>{
  const state=await linkHostState(platform),audit=(await db.prepare(`SELECT json_extract(a.detail_json,'$.host') host,'allowed in review' source,a.entity_id campaignId,a.actor_id operatorId,p.display_name operatorName,a.occurred_at occurredAt FROM lifecycle_audit_entries a LEFT JOIN operators p ON p.id=a.actor_id WHERE a.action='link-host.allowed' ORDER BY a.occurred_at DESC,a.id DESC`).all()).results;
  return {hosts:state.hosts,defaultHost:platform.config.publicBaseUrl.hostname,sources:[...state.derived.filter(row=>state.hosts.includes(row.host)).map(row=>({host:row.host,source:row.source})),...state.operator.filter(host=>state.hosts.includes(host)&&!state.derived.some(row=>row.host===host)).map(host=>({host,source:state.operatorSource})),...audit.filter(row=>state.hosts.includes(String(row.host)))]};
 };
 routes.get('/settings/link-hosts',async c=>{c.header('Cache-Control','no-store');return c.json(await status());});
 routes.put('/settings/link-hosts',async c=>{
  c.header('Cache-Control','no-store');const body=await c.req.json().catch(()=>null),parsed=linkHostsSchema.safeParse(body?.hosts);
  if(!parsed.success||Object.keys(body).some(key=>key!=='hosts'))return c.json({error:'invalid_link_hosts'},400);
  try{
   const authority=await senderWriteAuthority(platform,c.req.raw,c.get('operator').id),now=Date.now(),state=await linkHostState(platform);
   const wanted=parsed.data.length?parsed.data:[platform.config.publicBaseUrl.hostname],guard=[authority.sessionId,authority.operatorId,authority.version,now,authority.operatorId];
   const permitted=`${senderWriteGuard} AND ${roleGuard}`,statements:D1PreparedStatement[]=[];
   for(const host of new Set([...state.hosts,...state.derived.map(row=>row.host)]))if(!wanted.includes(host))statements.push(db.prepare(`INSERT INTO link_host_exclusions(host,removed_by,removed_at) SELECT ?,?,? WHERE ${permitted} ON CONFLICT(host) DO NOTHING`).bind(host,authority.operatorId,now,...guard));
   for(const host of wanted)statements.push(db.prepare(`DELETE FROM link_host_exclusions WHERE host=? AND ${permitted}`).bind(host,...guard));
   for(const [hosts,action]of [[state.hosts.filter(host=>!wanted.includes(host)),'link-host.removed'],[wanted.filter(host=>!state.hosts.includes(host)),'link-host.added']] as const)for(const host of hosts){const operation=crypto.randomUUID();statements.push(db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at) SELECT ?,?,'link-host',?,?,'operator',?,json_object('host',?),?,? WHERE ${permitted}`).bind(operation,operation,host,action,authority.operatorId,host,now,now,...guard));}
   const explicit=wanted.filter(host=>!state.autoSources||!state.derived.some(row=>row.host===host));
   statements.push(db.prepare(`INSERT INTO link_host_settings(id,hosts,auto_sources,updated_at,operator_id) SELECT 1,?,?,?,? WHERE ${permitted} ON CONFLICT(id) DO UPDATE SET hosts=excluded.hosts,auto_sources=excluded.auto_sources,updated_at=excluded.updated_at,operator_id=excluded.operator_id`).bind(explicit.join(','),state.autoSources,now,authority.operatorId,...guard),db.prepare(`SELECT 1 authorized WHERE ${permitted}`).bind(...guard));
   const result=await db.batch(statements);if(!result.at(-1)!.results.length)throw new SenderAuthorityChanged();
   await persistLinkHostSources(platform);
  }catch(error){return c.json({error:error instanceof SenderAuthorityChanged?'authority_changed':'link_hosts_save_failed'},error instanceof SenderAuthorityChanged?403:500);}
  return c.json(await status());
 });return routes;
}
