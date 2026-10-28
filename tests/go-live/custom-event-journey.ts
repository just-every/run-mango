import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';
import type {Installation} from './harness';
import {json} from './harness';

export async function proveCustomEvents(site:Installation,cookie:string,contactId:string,segmentId:string,page:Page,info:TestInfo) {
  const key=await json(await site.call('/api/settings/integrations',{method:'POST',cookie,body:{name:'Website event relay',scopes:['contacts:read','events:write']}}),201);
  const specification=await json(await site.call('/api/integrations/v1/openapi.json'),200);
  expect(specification.paths['/events'].post['x-required-scope']).toBe('events:write');
  // Execute the delivered client against the real HTTP API; it adds no browser
  // storage or automatic observation. This fixture holds a synthetic key server-side.
  const response=await site.call('/api/integrations/v1/client.mjs');expect(response.status).toBe(200);
  const {createMangoClient}=await import('data:text/javascript;base64,'+Buffer.from(await response.text()).toString('base64'));
  const client=createMangoClient({baseUrl:site.runtime.url+'/api/integrations/v1',token:key.token});
  const event={name:'sample.requested',contactId,idempotencyKey:'website:sample:one',occurredAt:new Date(Date.now()-1000).toISOString(),properties:{sample:'linen',quantity:2}};
  const [first,second]=await Promise.all([client.track(event),client.track({...event,properties:{quantity:2,sample:'linen'}})]);
  expect(first.id).toBe(second.id);expect([first.status,second.status].sort()).toEqual(['recorded','replayed']);
  await expect(client.track({...event,properties:{quantity:3}})).rejects.toMatchObject({message:'idempotency_conflict',status:409});
  expect(await site.rows(`SELECT count(*) n FROM source_records WHERE id='${first.id}'`)).toEqual([{n:1}]);
  const detail=await json(await site.call(`/api/contacts/${contactId}`,{cookie}),200);
  expect(detail.timeline.filter((row:any)=>row.kind==='sample.requested')).toEqual([expect.objectContaining({source:`integration:${key.credential.id} · custom-event`,occurredAt:event.occurredAt})]);
  const profiles=await client.profiles({email:'alex@example.test'});expect(profiles.contacts[0].segmentIds).toContain(segmentId);
  expect((await client.memberships(contactId)).segments).toContainEqual(expect.objectContaining({id:segmentId,state:'member'}));
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/hydration|hydrated.*match/i.test(m.text()))errors.push(m.text());});
  await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  for(const width of [1440]) {
    await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/audience/'+contactId);
    await expect(page.getByText('sample.requested · recorded',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
    await page.screenshot({path:info.outputPath('custom-event-'+width+'.png'),fullPage:true});
  }
  expect(errors).toEqual([]);
  const before=await site.count('contacts');
  await expect(client.track({...event,contactId:'unknown-contact',idempotencyKey:'website:unknown:one'})).rejects.toMatchObject({message:'contact_not_found',status:404});
  expect(await site.count('contacts')).toBe(before);
  // Exhaust this key's own public read allowance; no database counter is edited.
  const requests=await Promise.all(Array.from({length:65},()=>site.call('/api/integrations/v1/segments',{headers:{Authorization:`Bearer ${key.token}`}})));
  const limited=requests.filter(r=>r.status===429);expect(limited.length).toBeGreaterThan(0);expect(requests.every(r=>[200,429].includes(r.status))).toBe(true);
  expect(await limited[0].json()).toEqual({error:'rate_limited'});expect(Number(limited[0].headers.get('Retry-After'))).toBeGreaterThan(0);
  const other=await json(await site.call('/api/settings/integrations',{method:'POST',cookie,body:{name:'Independent reader',scopes:['contacts:read']}}),201);
  expect((await site.call('/api/integrations/v1/segments',{headers:{Authorization:`Bearer ${other.token}`}})).status).toBe(200);
}
