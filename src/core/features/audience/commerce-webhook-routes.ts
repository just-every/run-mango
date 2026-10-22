import {Hono} from 'hono';
import type {CommerceStore,VerifiedCommerceWebhook} from '@/core/shared/platform';
import {commerceProjection} from '@/core/features/store/commerce-projection';
import type {createAudienceService} from './service';
import {CommerceWebhookUnreadable} from '@/core/features/store/webhook-unreadable';
import type {createSyncRunRepository} from '@/core/features/store/sync-run-repository';

export type FailedOperations=Pick<ReturnType<typeof createSyncRunRepository>,'recordFailedOperation'|'recoverDeliveries'>;
export function createCommerceWebhookRoutes(service:ReturnType<typeof createAudienceService>,commerce:CommerceStore,operations:FailedOperations){
  const routes=new Hono();
  async function ingest(verified:VerifiedCommerceWebhook){
    const records=verified.records??[verified];
    await service.ingestCommerceWebhook({provider:'shopify',completion:'delta',adapterCompleted:false,
      sourceTypes:[...new Set(records.map(record=>commerceProjection(record).sourceType))],records:records.map(commerceProjection),receipt:verified.receipt});
    for(const record of records)if(record.sourceType==='cart'&&record.payload.observation==='online-store-cart-webhook'&&commerce.recordObservation){
      await commerce.recordObservation(record,verified.providerEventId!,verified.receipt!.digest);
    }
  }
  routes.post('/webhooks/commerce/shopify',async context=>{
    let verified;
    try{verified=await commerce.verifyWebhook(context.req.raw);}catch(error){
      // Only a verified delivery the adapter could not read is recorded, once.
      if(error instanceof CommerceWebhookUnreadable)await operations.recordFailedOperation({operation:'webhook',provider:'shopify',sourceType:error.sourceType,deliveryKey:error.deliveryKey,error:error.message,now:new Date()});
      return context.json({error:'invalid_webhook'},401);
    }
    try{await ingest(verified);}catch{return context.json({error:'commerce_ingestion_failed'},422);}
    if(verified.receipt)await operations.recoverDeliveries(verified.receipt.ids,new Date());
    return context.body(null,204);
  });
  routes.post('/webhooks/commerce/shopify/observations',async context=>{
    const origin=context.req.header('origin');
    if(origin){context.header('Access-Control-Allow-Origin',origin);context.header('Access-Control-Allow-Credentials','true');context.header('Vary','Origin');}
    if(!commerce.collectObservation)return context.json({error:'observation_channel_unavailable'},409);
    try{await ingest(await commerce.collectObservation(context.req.raw));}
    catch{return context.json({error:'observation_rejected'},422);}
    return context.body(null,204);
  });
  return routes;
}
