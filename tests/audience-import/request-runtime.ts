import {expect} from '@playwright/test';
import {createApp} from '../../src/core/app/app';
import {createProductionPlatform} from '../../src/core/platform/runtime';
import type {native} from './native';
import type {Platform} from '../../src/core/shared/platform';

/** Real auth, middleware and routes against the native D1 fixture. The caller's
 * meter wraps the binding before platform construction, counting every query. */
export async function authenticatedRequests(f:Awaited<ReturnType<typeof native>>['f'],db:D1Database,mailer?:Platform['mailer']){
 const token='audience-scale-test-bootstrap-more-than-thirty-two-bytes';
 const bindings={...f.bindings,DB:db,AUTH_SETUP_TOKEN:token};
 const platform=createProductionPlatform(bindings);
 // Optional real adapter with the fixture's authenticated receiver/network edge.
 if(mailer)platform.mailer=mailer;
 const app=createApp(bindings,platform);
 let cookie='';
 /** form: a browser form post, as a person's confirmation link or one-click unsubscribe sends it. */
 async function call(path:string,body?:unknown,form?:string){
  const response=await app.fetch(new Request(`https://mango.example.test${path}`,{
   method:body===undefined&&form===undefined?'GET':'POST',headers:{Host:'mango.example.test',Origin:'https://mango.example.test','CF-Connecting-IP':'192.0.2.1',Cookie:cookie,'Content-Type':form===undefined?'application/json':'application/x-www-form-urlencoded'},
   ...(form!==undefined?{body:form}:body===undefined?{}:{body:JSON.stringify(body)}),
  }),bindings);
  return response;
 }
 const bootstrap=await call('/auth/bootstrap',{token,displayName:'Scale operator'});
 expect(bootstrap.status).toBe(303);cookie=bootstrap.headers.get('set-cookie')!.split(';')[0];
 const operator=await f.db.prepare('SELECT id FROM oa_operators').first<{id:string}>();
 return {principalId:operator!.id,response:call,form:(path:string,form:string)=>call(path,undefined,form),async json(path:string,body?:unknown){
  const response=await call(path,body);const result=await response.json();expect(response.status,JSON.stringify(result)).toBe(200);return result as any;
 },async text(path:string){const response=await call(path);expect(response.status).toBe(200);return response.text();}};
}
