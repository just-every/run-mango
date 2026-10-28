import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

/** Normal rer verify hook: paid network responses only; all native custody is real. */
export default async function({tool,request,origin,cookie}){
 async function call(name,args={},readOnly=false){
  const answer=await tool(name,{...args,...(readOnly?{}:{idempotency_key:randomUUID()})});
  assert.equal(answer.status,200);assert.equal(answer.result?.isError,false,name);
  return answer;
 }
 const draft=(await call('mango.campaigns.create')).result.structuredContent;
 const started=(await call('mango.designs.start',{id:draft.campaignId,brief:'An orchard letter {{first_name|friend}} {{unsubscribe_url}}',candidates:2})).result.structuredContent;
 await call('mango.designs.advance',{kind:'design.draft',jobId:started.job.id});
 const chosen=await call('mango.designs.choose',{id:started.job.id,slot:'a'});
 assert.deepEqual(chosen.decision.classes.map(item=>item.class),['external']);
 await call('mango.designs.advance',{kind:'design.layout',jobId:started.job.id});
 const ready=(await call('mango.designs.read',{id:draft.campaignId},true)).result.structuredContent;
 assert.equal(ready.job.state,'ready');assert.match(ready.job.layerDocSha256,/^[a-f0-9]{64}$/);
 const headers={Cookie:cookie,Origin:origin};
 const artifact=await request(new URL('/api/design-jobs/'+started.job.id+'/layerdoc',origin),{headers});
 assert.equal(artifact.status,200);const bytes=await artifact.text();assert.equal(JSON.parse(bytes).version,'2');
 const reopened=await request(new URL('/api/design-jobs/'+started.job.id+'/layerdoc',origin),{headers});assert.equal(await reopened.text(),bytes);
 const campaign=await request(new URL('/api/campaigns/'+draft.campaignId,origin),{headers});assert.equal((await campaign.json()).revision.state,'draft');
}
