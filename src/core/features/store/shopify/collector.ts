import {readWebhookBytes} from '@/core/platform/adapters/webhook-body';
import {z} from 'zod';
import type {Database} from '@/core/platform/db/client';
import type {VerifiedCommerceWebhook} from '@/core/shared/platform';
import {hmacSha256Hex,timingSafeEqual} from '@/core/platform/crypto';
import {sha256} from '@/core/shared/ids';
import {gid} from '@/core/platform/adapters/shopify/values';
import type {createCommerceEventLog} from './event-log';

const line = z.object({productId:z.string().min(1),variantId:z.string().min(1),quantity:z.number().int().positive()}).strict();
const bodySchema = z.object({version:z.literal(1),channel:z.string().min(1).max(200),id:z.string().min(1).max(200),
  name:z.enum(['product_viewed','cart_viewed','product_added_to_cart','privacy_revoked']),timestamp:z.string().datetime(),
  privacy:z.object({analytics:z.boolean(),marketing:z.boolean(),saleOfData:z.boolean()}).strict(),
  lines:z.array(line).max(250)}).strict();
export function createShopifyCollector(options:{database:Database; shop:string; secret:string; channel:string; proxyPath:string; log:ReturnType<typeof createCommerceEventLog>}) {
  const db=options.database.$client;
  return async(request:Request):Promise<VerifiedCommerceWebhook>=>{
    if(new URL(request.url).protocol!=='https:' || (request.headers.has('Origin') && new URL(request.headers.get('Origin')!).protocol!=='https:'))throw new Error('Onsite observations require HTTPS.');
    if(request.method!=='POST')throw new Error('Collector requires POST.');
    const rawBody=new TextDecoder('utf-8',{fatal:true}).decode(await readWebhookBytes(request,65536));
    const url=new URL(request.url), query=url.searchParams;
    const one=(key:string)=>{const values=query.getAll(key);if(values.length!==1)throw new Error('Missing or repeated signed context.');return values[0];};
    const signature=one('signature'),timestamp=Number(one('timestamp'));
    if(!Number.isSafeInteger(timestamp)||Math.abs(Date.now()-timestamp*1000)>300000)throw new Error('Expired app proxy context.');
    if(one('shop')!==options.shop||one('path_prefix')!==options.proxyPath)throw new Error('Wrong app proxy tenant or path.');
    const keys=[...new Set(query.keys())].filter(key=>key!=='signature');
    const canonical=keys.map(key=>`${key}=${query.getAll(key).join(',')}`).sort().join('');
    if(!timingSafeEqual(signature,await hmacSha256Hex(options.secret,canonical)))throw new Error('Invalid app proxy signature.');
    const bodyDigest=await sha256(rawBody);
    if(!timingSafeEqual(one('body_digest'),bodyDigest))throw new Error('Signed proxy body digest mismatch.');
    const body=bodySchema.parse(JSON.parse(rawBody));
    if(one('event_id')!==body.id||body.channel!==options.channel)throw new Error('Observation identity mismatch.');
    const occurredAt=new Date(body.timestamp);
    if(occurredAt.getTime()>Date.now()+300000||occurredAt.getTime()<Date.now()-86400000)throw new Error('Observation occurrence outside accepted window.');
    const revoked = body.name==='privacy_revoked';
    if (!revoked && (!body.privacy.analytics || !body.privacy.marketing || !body.privacy.saleOfData)) throw new Error('Observation purposes are not permitted.');
    if (revoked && body.lines.length) throw new Error('Privacy control cannot contain product facts.');
    if(!revoked&&body.name!=='cart_viewed'&&body.lines.length!==1)throw new Error('Product observation requires exactly one line.');
    await options.log.health();
    const freshness = (await db.prepare("SELECT source_type,last_successful_at,last_error FROM source_syncs WHERE source_type IN ('product','variant')").all<{source_type:string;last_successful_at:number|null;last_error:string|null}>()).results;
    if (!revoked && (freshness.length!==2 || freshness.some(row=>!row.last_successful_at || row.last_successful_at<Date.now()-86400000 || row.last_error))) throw new Error('Observation catalog sources are not fresh.');
    const lines=[];
    for(const item of body.lines){
      const productId=gid('Product',item.productId),variantId=gid('ProductVariant',item.variantId);
      const variant=await db.prepare(`SELECT payload FROM source_records WHERE provider='shopify' AND source_type='variant' AND provider_source_id=? AND snapshot_run_id=(SELECT run_id FROM commerce_source_coverage WHERE source_type='variant' AND exhaustive=1)`).bind(variantId).first<{payload:string}>();
      const product=await db.prepare(`SELECT id FROM source_records WHERE provider='shopify' AND source_type='product' AND provider_source_id=? AND snapshot_run_id=(SELECT run_id FROM commerce_source_coverage WHERE source_type='product' AND exhaustive=1)`).bind(productId).first();
      if(!variant||!product||JSON.parse(variant.payload).productId!==productId)throw new Error('Observation catalog relationship is unverified. Sync products and variants.');
      lines.push({productId,variantId,quantity:item.quantity});
    }
    const customerId=one('logged_in_customer_id');
    const digest=await sha256(`${options.shop}\n${customerId}\n${rawBody}`);
    const mapped=customerId?await db.prepare(`SELECT contact_id FROM source_records WHERE provider='shopify' AND source_type='customer' AND provider_source_id=?`).bind(gid('Customer',customerId)).first<{contact_id:string|null}>():null;
    if (!revoked && mapped?.contact_id) {
      const control=await db.prepare('SELECT revoked_at FROM commerce_privacy_controls WHERE contact_id=?').bind(mapped.contact_id).first<{revoked_at:number}>();
      if(control && occurredAt.getTime()<=control.revoked_at)throw new Error('Observation predates privacy withdrawal.');
    }
    const sourceType=body.name==='product_viewed'||revoked?'browsing-event':'cart';
    const record={sourceType,sourceId:`shopify-observation:${body.id}`,occurredAt,updatedAt:occurredAt,contactId:mapped?.contact_id??undefined,
      payload:{schema:'shopify-commerce-v1',observation:body.name,observationKind:body.name==='product_added_to_cart'?'line':'snapshot',lines,privacy:body.privacy,identity: mapped?.contact_id?'shopify-signed-logged-in-customer':'unlinked',exhaustive:false}};
    // No caller customer ID, email, client ID, URL, price or token is retained.
    // Even signed proxy requests are browser observations, never financial facts.
    await options.log.append(record,body.id,digest);
    return {...record,rawBody:'',receivedAt:new Date(),records:[record],receipt:{ids:[`pixel:${options.channel}:${body.id}`],digest}};
  };
}
