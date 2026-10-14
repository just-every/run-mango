import type {Database} from '@/core/platform/db/client';
import type {createShopifyAdmin} from '@/core/platform/adapters/shopify/admin';
import {connection,object,text,list} from '@/core/platform/adapters/shopify/values';
export type ShopifyObservationConfig={channel:string;installationId:string;pixelId:string;proxyPath:string;webhookUrl:string};
export function createShopifyHealth(database:Database,admin:ReturnType<typeof createShopifyAdmin>,shop:string,config:ShopifyObservationConfig){
  return async(progress?:()=>Promise<void>)=>{
    const db=database.$client,now=Date.now();
    try {
      const data=await admin.query(`query MangoConnection { shop { myshopifyDomain } currentAppInstallation { id accessScopes { handle } } webPixel { id settings } }`,{},progress);
      if(object(data.shop).myshopifyDomain!==shop)throw new Error('Shopify token belongs to another shop.');
      const installation=object(data.currentAppInstallation),pixel=object(data.webPixel);
      if(installation.id!==config.installationId||pixel.id!==config.pixelId)throw new Error('Shopify app installation or pixel identity changed.');
      const scopes=new Set(list(installation.accessScopes,'access scopes').map(s=>text(s.handle,'scope')));
      for(const scope of ['read_customers','read_products','read_inventory','read_locations','read_orders','read_all_orders','read_returns','read_pixels','read_customer_events','write_app_proxy'])if(!scopes.has(scope))throw new Error(`Shopify is missing required ${scope} scope.`);
      const settings=object(typeof pixel.settings==='string'?JSON.parse(pixel.settings):pixel.settings);
      if(settings.channel!==config.channel||settings.proxyPath!==config.proxyPath)throw new Error('Installed Shopify pixel settings do not match this collector.');
      const topics=new Set<string>();let cursor:string|undefined;const seen=new Set<string>();
      do{
        const result=await admin.query(`query MangoSubscriptions($cursor:String){webhookSubscriptions(first:100,after:$cursor){nodes{topic uri filter includeFields format apiVersion{handle}}pageInfo{hasNextPage endCursor}}}`,{cursor:cursor??null},progress);
        const page=connection(result.webhookSubscriptions,'webhook subscriptions');
        for(const node of page.nodes)if(node.uri===config.webhookUrl && node.filter===null && Array.isArray(node.includeFields) && node.includeFields.length===0 && node.format==='JSON' && object(node.apiVersion).handle==='2026-07')topics.add(text(node.topic,'webhook topic'));
        cursor=page.cursor;if(cursor&&seen.has(cursor))throw new Error('Shopify subscription pagination repeated.');if(cursor)seen.add(cursor);
      }while(cursor);
      if(!topics.has('CARTS_CREATE')||!topics.has('CARTS_UPDATE'))throw new Error('Both Online Store cart subscriptions must target this Mango deployment.');
      await db.prepare(`INSERT INTO commerce_channels(id,shop,installation_id,pixel_id,coverage_start,retention_start,healthy_at,supported_events,purpose)
        VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET healthy_at=excluded.healthy_at,last_error=NULL
        WHERE shop=excluded.shop AND installation_id=excluded.installation_id AND pixel_id=excluded.pixel_id`).bind(config.channel,shop,config.installationId,config.pixelId,now,now,now,JSON.stringify(['carts/create','carts/update','product_viewed','cart_viewed','product_added_to_cart']),'analytics+marketing+sale-of-data').run();
      const current=await db.prepare('SELECT installation_id,pixel_id,shop FROM commerce_channels WHERE id=?').bind(config.channel).first<{installation_id:string;pixel_id:string;shop:string}>();
      if(current?.installation_id!==config.installationId||current.pixel_id!==config.pixelId||current.shop!==shop)throw new Error('Observation channel identity is immutable. Configure a new channel for a new installation.');
    }catch(error){
      await db.prepare('UPDATE commerce_channels SET last_error=? WHERE id=?').bind(error instanceof Error?error.message:'Shopify health failed.',config.channel).run();throw error;
    }
  };
}
