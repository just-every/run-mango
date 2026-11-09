import {expect,test} from '@playwright/test';
import {bulkFixture,bulkPerson,seedBulkPeople} from './bulk-fixture';
import {consumeLifecycleQueue,type LifecycleQueueBatch} from '../../src/core/features/lifecycle';
test('queued erasure loses effective Owner authority after Analyst reassignment',async()=>{
  test.setTimeout(180000);
  const h=await bulkFixture(),person=bulkPerson(0);
  try {
    await seedBulkPeople(h.f.db,0,1);
    const custodianId='synthetic-mango-bulk-custodian',custodian=await h.analyst(custodianId);
    await h.json(`/api/operators/${custodianId}/role`,{role:'owner'},'PUT');
    const before=await h.json(`/api/contacts/${person.id}`);
    const pending=(await h.json('/api/audience/bulk',{contactIds:[person.id],action:'erase'})).job;
    const command=h.f.jobs.findLast((value:any)=>value.kind==='contact.bulk'&&value.payload.id===pending.id);
    expect(command).toBeTruthy();
    await h.json(`/api/operators/${h.ownerId}/role`,{role:'analyst'},'PUT');
    expect((await h.json('/api/operator')).operator.role).toBe('analyst');
    expect((await h.call(`/api/audience/bulk/${pending.id}/resume`,{})).status).toBe(403);
    let acknowledged=false,retried=false;
    await consumeLifecycleQueue({messages:[{body:command,ack(){acknowledged=true;},retry(){retried=true;}}]} as unknown as LifecycleQueueBatch,h.f.services.lifecycleRuntime);
    const receipt=await (await h.call(`/api/audience/bulk/${pending.id}`,undefined,'GET',custodian)).json() as any;
    console.log('QUEUE_RESULT '+JSON.stringify({acknowledged,retried,job:receipt.job}));
    expect(acknowledged).toBe(false);expect(retried).toBe(true);
    expect(receipt.job).toMatchObject({state:'failed',total:1,processed:0,succeeded:0,refused:0});
    const after=await h.call(`/api/contacts/${person.id}`,undefined,'GET',custodian);
    expect(after.status).toBe(200);expect(await after.json()).toEqual(before);
    await consumeLifecycleQueue({messages:[{body:command,ack(){},retry(){}}]} as unknown as LifecycleQueueBatch,h.f.services.lifecycleRuntime);
    expect(await (await h.call(`/api/contacts/${person.id}`,undefined,'GET',custodian)).json()).toEqual(before);
  } finally {await h.dispose();}
});
