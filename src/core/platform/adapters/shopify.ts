import {readWebhookBytes} from './webhook-body';
import type {CommerceStore,VerifiedCommerceWebhook} from '@/core/shared/platform';
import type {Database} from '@/core/platform/db/client';
import {hmacSha256Base64,timingSafeEqual} from '@/core/platform/crypto';
import {sha256} from '@/core/shared/ids';
import {createShopifyAdmin} from './shopify/admin';
import {querySpecs,type AdminSource} from './shopify/queries';
import {gid,losslessJson,object,text} from './shopify/values';
import {normalizeAdmin,normalizeCart} from './shopify/normalize';
import {createCommerceEventLog} from '@/core/features/store/shopify/event-log';
import {createShopifyCollector} from '@/core/features/store/shopify/collector';
import {createShopifyHealth,type ShopifyObservationConfig} from '@/core/features/store/shopify/health';
import {CommerceWebhookUnreadable} from '@/core/features/store/webhook-unreadable';

const topics:Record<string,AdminSource|'cart'>={
  'customers/create':'customer','customers/update':'customer','products/create':'product','products/update':'product',
  'inventory_levels/update':'inventory','inventory_items/update':'inventory','orders/create':'order','orders/updated':'order','orders/paid':'order','orders/cancelled':'order','refunds/create':'refund','carts/create':'cart','carts/update':'cart',
};
export function createShopifyAdapter(options:{storeUrl:URL;accessToken:string;webhookSecret:string;exclusiveShop?:string;database?:Database;observations?:ShopifyObservationConfig}):CommerceStore{
  const shop=options.storeUrl.hostname;
  if(options.storeUrl.protocol!=='https:'||!/^[-a-z0-9]+\.myshopify\.com$/.test(shop)||options.storeUrl.username||options.storeUrl.password)throw new Error('Shopify connection requires its canonical HTTPS myshopify domain.');
  const admin=createShopifyAdmin(options);
  const log=options.database&&options.observations?createCommerceEventLog(options.database,options.observations.channel):undefined;
  const health=options.database&&options.observations?createShopifyHealth(options.database,admin,shop,options.observations):undefined;
  const collector=log&&options.database&&options.observations?createShopifyCollector({database:options.database,shop,secret:options.webhookSecret,channel:options.observations.channel,proxyPath:options.observations.proxyPath,log}):undefined;
  let checked = false;
  async function verifyAccess(progress?:()=>Promise<void>) {
    if (checked) return;
    const data = await admin.query('query MangoAccess { shop { myshopifyDomain } currentAppInstallation { id accessScopes { handle } } }',{},progress);
    if (object(data.shop).myshopifyDomain !== shop) throw new Error('Shopify token belongs to another shop.');
    const scopes = object(data.currentAppInstallation).accessScopes;
    if (!Array.isArray(scopes)) throw new Error('Shopify access scopes are unavailable.');
    const granted = new Set(scopes.map(scope => object(scope).handle));
    for (const required of ['read_customers','read_products','read_inventory','read_locations','read_orders','read_all_orders','read_returns']) {
      if (!granted.has(required)) throw new Error(`Shopify is missing required ${required} scope; full history is unavailable.`);
    }
    checked = true;
  }
  return {
    capabilities(){return {provider:'shopify',sourceTypes:[...Object.keys(querySpecs),...(log?['cart','browsing-event']:[])],detail:log?'Shopify store records, with cart and browsing events.':'Shopify store records. Cart and browsing events are off.'};},
    async refreshHealth(progress){await verifyAccess(progress);if(health)await health(progress);},
    collectObservation:collector,
    recordObservation:log?async(record,eventId,digest)=>log.append(record,eventId,digest):undefined,
    async verifyWebhook(request):Promise<VerifiedCommerceWebhook>{
      // Shopify signs the body, not shop/topic headers. A shared multi-shop app
      // secret is explicitly unsupported at this one-store webhook boundary.
      if(options.exclusiveShop!==shop)throw new Error('Webhook ingestion requires credentials exclusive to this configured shop.');
      const signature=request.headers.get('X-Shopify-Hmac-Sha256'),topic=request.headers.get('X-Shopify-Topic');
      if(request.headers.get('X-Shopify-Shop-Domain')!==shop||!signature||!topic||!Object.hasOwn(topics,topic))throw new Error('Shopify webhook tenant/topic is not configured.');
      const rawBody=new TextDecoder('utf-8',{fatal:true}).decode(await readWebhookBytes(request,1048576));
      if(!timingSafeEqual(signature,await hmacSha256Base64(options.webhookSecret,rawBody)))throw new Error('Shopify webhook signature is invalid.');
      const delivery=text(request.headers.get('X-Shopify-Webhook-Id'),'delivery ID');
      const event=text(request.headers.get('X-Shopify-Event-Id'),'event ID');
      const payload=object(losslessJson(rawBody));const type=topics[topic];
      let records;
      if(type==='cart')records=[await normalizeCart(payload)];
      else{
        const kind=querySpecs[type].kind;
        const id=type==='refund'?gid('Order',payload.order_id):type==='inventory'?gid('InventoryItem',payload.inventory_item_id??payload.id):gid(kind,payload.admin_graphql_api_id??payload.id);
        try{await verifyAccess();records=normalizeAdmin(type,await admin.node(type,id));}
        catch(error){throw new CommerceWebhookUnreadable(error instanceof Error?error.message:'Shopify Admin read failed.',`shopify:delivery:${delivery}`,type);}
        if(type==='refund')records=records.filter(record=>record.sourceId===gid('Refund',payload.admin_graphql_api_id??payload.id));
        if(!records.length)throw new Error('Shopify webhook record could not be reconciled.');
      }
      const digest=await sha256(`${shop}\n${topic}\n${rawBody}`);
      return {...records[0],records,rawBody:'',receivedAt:new Date(),providerEventId:event,
        receipt:{ids:[`shopify:delivery:${delivery}`,`shopify:event:${topic}:${event}`],digest}};
    },
    async readCatalog(items){
      await verifyAccess();
      const records=[];
      for(const [type,ids] of [['product',[...new Set(items.map(item=>item.productId))]],['variant',[...new Set(items.map(item=>item.variantId))]]] as const){
        for(const id of ids){const node=await admin.catalogNode(type,id);if(node)records.push(...normalizeAdmin(type,node));}
      }
      return records;
    },
    async synchronize(type,cursor,progress){
      if(type==='cart'||type==='browsing-event'){
        if(!log)throw new Error('Shopify observation channel is not configured.');
        return log.read(type,cursor);
      }
      if(!Object.hasOwn(querySpecs,type))throw new Error(`Shopify does not supply ${type}.`);
      await verifyAccess(progress);
      const page=await admin.page(type as AdminSource,cursor,progress);
      return {records:page.nodes.flatMap(node=>normalizeAdmin(type as AdminSource,node)),nextCursor:page.nextCursor,coverage:{mode:'snapshot',exhaustive:true,complete:page.nextCursor===undefined}};
    },
  };
}
