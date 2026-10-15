import {Hono} from 'hono';
import {z} from 'zod';
import type {CommerceStore} from '@/core/shared/platform';
import {commerceSourceTypes,type createStoreService} from './service';

export function createStoreRoutes(service:ReturnType<typeof createStoreService>,commerce?:CommerceStore){
  const routes=new Hono();
  routes.get('/store',async context=>{
    const status=await service.status(), capability=commerce?.capabilities();
    // A fresh configured installation must expose its first sync action before
    // any Cron run. These rows describe an unverified source, never a success.
    const sourceSyncs=[...status.sourceSyncs,...commerceSourceTypes.filter(type=>!status.sourceSyncs.some(row=>row.sourceType===type)).map(sourceType=>({id:`source_${sourceType}`,sourceType,lastSuccessfulAt:null,lastError:null,createdAt:null,updatedAt:null}))];
    const sourceCapabilities=commerceSourceTypes.map(sourceType=>({sourceType,available:capability?.sourceTypes.includes(sourceType)??false,detail:capability?.detail??'No commerce connection is configured.'}));
    return context.json({...status,sourceSyncs,sourceCapabilities});
  });
  // Mounted under native operator authentication with the other /api routes.
  routes.get('/store/observations',async context=>{
    const parsed=z.object({sourceType:z.enum(['cart','browsing-event']),cursor:z.string().min(1).max(4096).optional()}).strict().safeParse(context.req.query());
    if(!parsed.success)return context.json({error:'invalid_observation_range'},400);
    if(!commerce)return context.json({error:'source_unavailable'},409);
    try{return context.json(await commerce.synchronize(parsed.data.sourceType,parsed.data.cursor));}
    catch(error){return context.json({error:'observation_range_unavailable',detail:error instanceof Error?error.message:'Observation range unavailable.'},409);}
  });
  return routes;
}
