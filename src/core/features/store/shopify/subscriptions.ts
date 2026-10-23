import type {createShopifyAdmin} from '@/core/platform/adapters/shopify/admin';
import {connection,object,text} from '@/core/platform/adapters/shopify/values';
export const installationTopics=['CUSTOMERS_CREATE','CUSTOMERS_UPDATE','PRODUCTS_CREATE','PRODUCTS_UPDATE','INVENTORY_LEVELS_UPDATE','INVENTORY_ITEMS_UPDATE','ORDERS_CREATE','ORDERS_UPDATED','ORDERS_PAID','ORDERS_CANCELLED','REFUNDS_CREATE','FULFILLMENTS_CREATE','FULFILLMENTS_UPDATE','CHECKOUTS_CREATE','CHECKOUTS_UPDATE','CARTS_CREATE','CARTS_UPDATE','APP_UNINSTALLED','APP_SCOPES_UPDATE'] as const;
export async function reconcileSubscriptions(admin:ReturnType<typeof createShopifyAdmin>,url:string,topics:readonly string[]=installationTopics,progress?:()=>Promise<void>) {
  const found=new Map<string,{id:string;topic:string;recreated:boolean}>();let cursor:string|undefined;const seen=new Set<string>();
  do {
    const result=await admin.query('query MangoSubscriptions($cursor:String){webhookSubscriptions(first:100,after:$cursor){nodes{id topic uri filter includeFields format apiVersion{handle}}pageInfo{hasNextPage endCursor}}}',{cursor:cursor??null},progress);
    const page=connection(result.webhookSubscriptions,'webhook subscriptions');
    for(const node of page.nodes)if(node.uri===url&&node.filter===null&&Array.isArray(node.includeFields)&&node.includeFields.length===0&&node.format==='JSON'&&object(node.apiVersion).handle==='2026-07') {
      const topic=text(node.topic,'webhook topic');found.set(topic,{id:typeof node.id==='string'?node.id:'',topic,recreated:false});
    }
    cursor=page.cursor;if(cursor&&seen.has(cursor))throw new Error('Shopify subscription pagination repeated.');if(cursor)seen.add(cursor);
  }while(cursor);
  for(const topic of topics)if(!found.has(topic)) {
    const data=await admin.query('mutation MangoCreateSubscription($topic:WebhookSubscriptionTopic!,$subscription:WebhookSubscriptionInput!){webhookSubscriptionCreate(topic:$topic,webhookSubscription:$subscription){webhookSubscription{id topic uri}userErrors{field message}}}',{topic,subscription:{uri:url,format:'JSON'}},progress);
    const result=object(data.webhookSubscriptionCreate);
    if(!Array.isArray(result.userErrors)||result.userErrors.length)throw new Error(`Shopify refused the ${topic} webhook subscription.`);
    const created=object(result.webhookSubscription);
    if(created.topic!==topic||created.uri!==url)throw new Error(`Shopify did not confirm the ${topic} webhook subscription.`);
    found.set(topic,{id:text(created.id,'webhook ID'),topic,recreated:true});
  }
  return topics.map(topic=>found.get(topic)!);
}
