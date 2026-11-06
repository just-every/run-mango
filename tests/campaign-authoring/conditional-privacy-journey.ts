import {expect} from '@playwright/test';
import {json,type Installation} from '../go-live/harness';
import {eraseHttp} from '../audience-import/erase';

export async function conditionalPrivacyJourney(site:Installation,cookie:string,draft:{campaignId:string;revisionId:string},vipId:string,regularId:string,source:{key:{token:string;credential:{id:string}};event:Record<string,unknown>}) {
  const reader=await site.open(['synthetic-mango-504','example.test'].join('@'),'synthetic-mango-504');
  await json(await site.call('/api/operators/synthetic-mango-504/role',{method:'PUT',cookie,body:{role:'analyst'}}),200);
  const path=`/api/contacts/${vipId}/content-context?revisionId=${draft.revisionId}`;
  expect((await site.call(path,{cookie:reader})).status).toBe(403);
  await json(await site.call('/api/auth/signout',{method:'POST',cookie:reader}),200);
  expect((await site.call(path,{cookie:reader})).status).toBe(401);
  await expect.poll(async()=>(await json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie}),200)).campaign.state).toBe('completed');
  const published=await json(await site.call(`/api/campaigns/${draft.campaignId}/publications`,{method:'POST',cookie,body:{revisionId:draft.revisionId}}),201);
  const publicCopy=await json(await site.call('/archive/data/'+published.id),200);
  for(const privateText of ['VIP early access to the garden','Explore the garden collection','VIP shipping included','Champion garden preview','First season garden notes','Order bonus: seed packet','Browse seed packets'])expect(publicCopy.body).not.toContain(privateText);
  expect(publicCopy.body).not.toContain('data-mango-condition');
  expect((await eraseHttp(site,cookie,vipId)).state).toBe('complete');
  expect((await site.call(path,{cookie})).status).toBe(404);
  const replay=await site.call('/api/integrations/v1/events',{method:'POST',headers:{Authorization:`Bearer ${source.key.token}`},body:source.event});
  expect(replay.status).toBe(404);
  expect((await site.call(`/api/contacts/${vipId}`,{cookie})).status).toBe(404);
  await json(await site.call('/api/settings/integrations/'+source.key.credential.id,{method:'DELETE',cookie}),200);
  const before=await site.count('source_records');
  expect((await site.call('/api/integrations/v1/events',{method:'POST',headers:{Authorization:`Bearer ${source.key.token}`},body:{...source.event,contactId:regularId,idempotencyKey:'synthetic-mango-505'}})).status).toBe(401);
  expect(await site.count('source_records')).toBe(before);
  console.log('Conditional content: masked and revoked sessions refused; public archive omits conditional branches; erased contact and revoked event replay cannot restore facts');
}
