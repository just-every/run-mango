import {Hono} from 'hono';
import {z} from 'zod';
import type {Platform} from '@/core/shared/platform';
import type {AuthVariables} from '@/core/features/auth/routes';
import {sendingConnectionService} from './connection-service';
import {SendingConnectionError} from './sendgrid-account';

export function sendingConnectionRoutes(platform:Platform) {
  const routes=new Hono<{Variables:AuthVariables}>(),service=sendingConnectionService(platform);
  const failure=(context:any,error:unknown)=>context.json({error:'sending_connection_refused',detail:error instanceof SendingConnectionError?error.reason:'The sending connection could not complete.',
    missing:error instanceof SendingConnectionError?error.missing:[]},422);
  routes.get('/settings/sending',async context=>context.json(await service.status()));
  routes.post('/settings/sending/review',async context=>{
    const body=z.object({apiKey:z.string().trim().min(1).max(4096)}).strict().safeParse(await context.req.json().catch(()=>null));
    if(!body.success)return context.json({error:'invalid_sending_key'},400);
    try {return context.json(await service.prepare(body.data.apiKey,context.get('operator').id));}catch(error){return failure(context,error);}
  });
  routes.post('/settings/sending/connect',async context=>{
    const body=z.object({proposalId:z.string().uuid()}).strict().safeParse(await context.req.json().catch(()=>null));
    if(!body.success)return context.json({error:'invalid_connection_review'},400);
    try {return context.json(await service.connect(body.data.proposalId,context.get('operator')));}catch(error){return failure(context,error);}
  });
  routes.delete('/settings/sending',async context=>{
    try{return context.json(await service.disconnect(context.get('operator').id));}catch(error){return failure(context,error);}
  });
  return routes;
}
