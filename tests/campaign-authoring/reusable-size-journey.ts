import {expect,type APIRequestContext} from '@playwright/test';

/** The reusable source and its linked draft stay intact when the sent bound is refused. */
export async function reusableSizeJourney(request:APIRequestContext,origin:string,headers:Record<string,string>,draft:{campaignId:string;revisionId:string}){
  const created=await request.post(origin+'/api/reusable-email-blocks',{headers,data:{name:'synthetic-mango-170',block:{html:'<p>synthetic-mango-170 footer</p>'}}});
  expect(created.status()).toBe(201);const source=await created.json();
  const placed=await request.post(`${origin}/api/reusable-email-blocks/${source.id}/place`,{headers,data:{version:source.version,target:{kind:'campaign',id:draft.revisionId}}});expect(placed.status()).toBe(200);
  const read=async()=>{const response=await request.get(`${origin}/api/campaigns/${draft.campaignId}`,{headers});expect(response.status()).toBe(200);return (await response.json()).revision;};
  const before=await read();
  const refused=await request.patch(`${origin}/api/reusable-email-blocks/${source.id}`,{headers,data:{version:source.version,name:source.name,block:{html:'<p>'+'🌱'.repeat(28160)+'</p>'}}});
  expect(refused.status()).toBe(400);const error=await refused.json();
  expect(error).toMatchObject({error:'email_too_large',size:{exceedsLimit:true}});
  expect(error.size.htmlBytes).toBeGreaterThan(error.size.limitBytes);
  expect(error.detail).toContain(`${error.size.htmlBytes} bytes`);expect(error.detail).toContain(`${error.size.limitBytes} bytes`);
  expect(error.size.largestBlocks.length).toBeGreaterThan(0);expect(error.size.largestBlocks.length).toBeLessThanOrEqual(3);
  for(const block of error.size.largestBlocks)expect(error.detail).toContain(`${block.location}: ${block.bytes} bytes`);
  expect(await read()).toEqual(before);
  const library=await request.get(origin+'/api/reusable-email-blocks',{headers});expect(library.status()).toBe(200);
  expect((await library.json()).blocks.find((block:any)=>block.id===source.id)).toEqual(source);
  const revised=await request.patch(`${origin}/api/reusable-email-blocks/${source.id}`,{headers,data:{version:source.version,name:source.name,block:{html:'<p>synthetic-mango-170 revised footer</p>'}}});
  expect(revised.status()).toBe(200);expect((await revised.json()).version).toBe(source.version+1);
  expect((await read()).emailBody).toContain('synthetic-mango-170 revised footer');
}
