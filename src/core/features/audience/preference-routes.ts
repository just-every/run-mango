import {Hono} from 'hono';
import {z} from 'zod';
import type {Platform} from '@/core/shared/platform';
import type {createAudienceService} from './service';
import {createPreferenceService} from './preference-service';
import {invalidLink,messagePage,tooManyRequests} from './message-response';
import type {MessageField} from '../site/message-page';
const tokenSchema=z.string().min(16).max(8192);
const yes=z.union([z.literal(true),z.literal('true')]);
const inputSchema=z.object({confirm:yes.optional(),unsubscribeAll:yes.optional(),pauseDays:z.enum(['0','30','60','90']).optional(),displayName:z.string().max(200).refine(value=>!/[\u0000-\u001f\u007f]/.test(value)).optional()}).catchall(z.enum(['keep','withdraw'])).refine(value=>value.confirm!==undefined||value.unsubscribeAll!==undefined);
export function preferencePublicRoutes(platform:Platform,audience:ReturnType<typeof createAudienceService>) {
  const routes=new Hono(),service=createPreferenceService(platform,audience);
  routes.use('*',async(c,next)=>{c.header('Cache-Control','no-store');c.header('Referrer-Policy','no-referrer');await next();});
  routes.get('/preferences/:token',async c=>{
    const parsed=tokenSchema.safeParse(c.req.param('token'));if(!parsed.success)return invalidLink(c);
    const state=await service.resolve(parsed.data);
    if(state.kind==='rate-limited')return tooManyRequests(c);
    if(state.kind!=='ready')return invalidLink(c);
    const fields:MessageField[]=state.topics.map(topic=>({kind:'select',name:'topic:'+topic,label:'Topic: '+topic,value:state.facts.withdrawnTopics.includes(topic)?'withdraw':'keep',disabled:state.facts.withdrawnTopics.includes(topic)||state.contact.emailStatus!=='subscribed',options:[{value:'keep',label:'Keep this subscription'},{value:'withdraw',label:'Unsubscribe from this topic'}]}));
    fields.push({kind:'select',name:'pauseDays',label:'Pause email',value:'0',options:[{value:'0',label:state.facts.pauseUntil?'Keep current pause':'No pause'},...[30,60,90].map(days=>({value:String(days),label:`Pause for ${days} days`,disabled:state.now.getTime()+days*86400000<state.facts.pauseUntil}))]});
    if(state.settings.editableFields.includes('displayName'))fields.push({kind:'text',name:'displayName',label:'Display name',value:state.contact.displayName,maxLength:200});
    return messagePage(c,200,{title:'Email preferences',heading:'Email preferences',text:state.facts.pauseUntil?`Email is paused until ${new Date(state.facts.pauseUntil).toISOString().slice(0,16).replace('T',' ')} UTC. Confirm to change your choices.`:'Choose your topics and pause email. Changes apply only when you confirm.',form:{action:'/preferences/'+encodeURIComponent(parsed.data),button:'Confirm changes',fields,secondaryButton:{name:'unsubscribeAll',value:'true',label:'Unsubscribe from all email'}}});
  });
  routes.post('/preferences/:token',async c=>{
    const token=tokenSchema.safeParse(c.req.param('token'));if(!token.success)return invalidLink(c);
    const raw=(c.req.header('Content-Type')??'').includes('application/json')?await c.req.json().catch(()=>undefined):await c.req.parseBody().catch(()=>undefined);
    const input=inputSchema.safeParse(raw);if(!input.success)return c.json({error:'invalid_preferences'},400);
    const result=await service.save(token.data,input.data);
    if(result.kind==='rate-limited')return tooManyRequests(c);
    if(result.kind==='invalid-input')return c.json({error:'invalid_preferences'},400);
    if(result.kind!=='saved')return invalidLink(c);
    return messagePage(c,200,{title:'Preferences saved',heading:result.unsubscribed?'You are unsubscribed':'Preferences saved',text:result.unsubscribed?'Future marketing email has stopped.':'Your choices have been recorded.'});
  });
  return routes;
}
