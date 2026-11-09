import {consumeLifecycleQueue,type LifecycleQueueBatch} from '../../src/core/features/lifecycle';
import {expect,test} from '@playwright/test';
import {parseCsv} from '../../src/core/features/audience/csv';
import {bulkFixture,bulkPerson,seedBulkPeople} from './bulk-fixture';

type Receipt={id:string;action:string;state:string;total:number;processed:number;succeeded:number;refused:number;
  refusals:Array<{contactId:string|null;displayName:string|null;reason:string}>};

/** One CONT-022 journey, composed into the existing audience acceptance test. */
export async function bulkRouteJourney() {
  const h=await bulkFixture(),people=Array.from({length:6},(_,index)=>bulkPerson(index));
  try {
    const search=async(field:string,value:string,extra:Record<string,string>={})=>
      h.json(`/api/audience/search?${new URLSearchParams({field,value,...extra})}`);
    const selected=async(field:string,value:string,ids:string[],extra:Record<string,string>={})=>{
      const result=await search(field,value,extra);expect(result.total).toBe(ids.length);
      expect(result.contacts.map((contact:any)=>contact.id).sort()).toEqual([...ids].sort());return result;
    };
    const start=async(body:unknown)=>(await h.json('/api/audience/bulk',body)).job as Receipt;
    const resume=async(job:Receipt)=>(await h.json(`/api/audience/bulk/${job.id}/resume`,{})).job as Receipt;
    async function finish(job:Receipt,maxRounds=600) {
      for(let round=0;job.state!=='complete'&&round<maxRounds;round++) {
        const before=job;job=await resume(job);
        expect(job.state).not.toBe('failed');expect(job.processed).toBeGreaterThanOrEqual(before.processed);
        expect(job.processed-before.processed).toBeLessThanOrEqual(50);
        expect(job.processed).toBe(job.succeeded+job.refused);expect(job.total).toBe(before.total);
      }
      expect(job.state,'Bulk continuation must reach a durable terminal receipt').toBe('complete');
      expect(job.processed).toBe(job.total);return job;
    }
    const run=async(body:unknown)=>finish(await start(body));
    const profile=async(id:string)=>(await h.json(`/api/contacts/${id}`)).profile;
    async function csv(path:string) {
      const response=await h.call(path);expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
      expect(response.headers.get('cache-control')).toBe('no-store');return response.text();
    }

    await test.step('Bulk selection uses native identity, property, tag, segment and consent facts',async()=>{
      await seedBulkPeople(h.f.db,0,6);
      const at=Date.now()-60000;
      await h.f.db.batch(people.slice(0,2).map(person=>h.f.db.prepare(`INSERT INTO contact_history
        (id,contact_id,kind,detail,occurred_at,created_at,updated_at) VALUES(?,?,'incumbent-profile',?,?,?,?)`)
        .bind(`${person.id}-imported`,person.id,JSON.stringify({fields:{bulk_rank:3},tags:['market-import'],topics:[]}),at,at,at)));
      await h.json('/api/settings/properties',{key:'bulk_rank',label:'Market loyalty rank',type:'number'});
      await h.json(`/api/contacts/${people[0].id}/properties`,{fields:{bulk_rank:42}},'PUT');
      // An older integration snapshot cannot overrule the typed native journal.
      await h.f.db.prepare('UPDATE integration_contact_profiles SET fields_json=? WHERE contact_id=?')
        .bind(JSON.stringify({bulk_rank:11}),people[0].id).run();
      expect((await profile(people[0].id)).properties.bulk_rank).toBe(42);
      await selected('email',people[0].email.toUpperCase(),[people[0].id]);
      await selected('phone',people[0].phone.replace('+1','+1 ').replace(/(\d{3})(\d{4})$/,'$1-$2'),[people[0].id]);
      await selected('name',people[4].name.toUpperCase(),[people[4].id]);
      await selected('property','42',[people[0].id],{property:'bulk_rank'});
      await selected('property','42.0',[people[0].id],{property:'bulk_rank'});
      await selected('property','11',[],{property:'bulk_rank'});
      await selected('tag','market-import',people.slice(0,2).map(person=>person.id));
      await selected('consent','pending',[people[1].id],{channel:'email'});
      await selected('consent','non-subscribed',[people[2].id,people[5].id],{channel:'sms'});
      const {segment}=await h.json('/api/audience/segments',{name:'Loyal market members',
        inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'property',property:'bulk_rank',comparator:'eq',value:42}]}),exclusionRulesJson:'[]'});
      await selected('segment',segment.id,[people[0].id]);
      const options=await h.json('/api/audience/bulk-options');
      expect(options.segments).toContainEqual({id:segment.id,name:segment.name});
      expect(options.properties).toContainEqual(expect.objectContaining({key:'bulk_rank',type:'number'}));
      for(const channel of ['email','sms'])expect(options.topics).toContainEqual({id:'offers',name:'offers',channel});
      expect((await h.call('/api/audience/search?field=unknown')).status).toBe(400);
      expect((await h.call('/api/audience/bulk',{contactIds:[people[0].id],search:{field:'name',value:'Market'},action:'export'})).status).toBe(400);

      const untag=await run({search:{field:'tag',value:'market-import'},action:'untag',value:'market-import'});
      expect(untag).toMatchObject({total:2,succeeded:2,refused:0});
      await selected('tag','market-import',[]);
      await run({contactIds:[people[0].id],action:'tag',value:'market-import'});
      await selected('tag','market-import',[people[0].id]);
      expect((await profile(people[1].id)).tags).not.toContain('market-import');
    });

    await test.step('Queued erasure refuses an initiating Owner reassigned to Analyst without deleting contact data',async()=>{
      const custodianId='synthetic-mango-bulk-custodian',custodian=await h.analyst(custodianId);
      await h.json(`/api/operators/${custodianId}/role`,{role:'owner'},'PUT');
      const before=await h.json(`/api/contacts/${people[4].id}`);
      const pending=await start({contactIds:[people[4].id],action:'erase'});
      const command=h.f.jobs.findLast((value:any)=>value.kind==='contact.bulk'&&value.payload.id===pending.id);
      expect(command).toBeTruthy();
      await h.json(`/api/operators/${h.ownerId}/role`,{role:'analyst'},'PUT');
      expect((await h.json('/api/operator')).operator.role).toBe('analyst');
      expect((await h.call(`/api/audience/bulk/${pending.id}/resume`,{})).status).toBe(403);
      let acknowledged=false,retried=false;
      await consumeLifecycleQueue({messages:[{body:command,ack(){acknowledged=true;},retry(){retried=true;}}]} as unknown as LifecycleQueueBatch,h.f.services.lifecycleRuntime);
      expect(acknowledged).toBe(false);expect(retried).toBe(true);
      const receiptResponse=await h.call(`/api/audience/bulk/${pending.id}`,undefined,'GET',custodian);
      expect(receiptResponse.status).toBe(200);
      const failed=(await receiptResponse.json() as any).job;
      expect(failed).toMatchObject({state:'failed',total:1,processed:0,succeeded:0,refused:0});
      const contactResponse=await h.call(`/api/contacts/${people[4].id}`,undefined,'GET',custodian);
      expect(contactResponse.status).toBe(200);expect(await contactResponse.json()).toEqual(before);
      // Replaying the queued command cannot revive the failed destructive work.
      await consumeLifecycleQueue({messages:[{body:command,ack(){},retry(){}}]} as unknown as LifecycleQueueBatch,h.f.services.lifecycleRuntime);
      expect(await (await h.call(`/api/contacts/${people[4].id}`,undefined,'GET',custodian)).json()).toEqual(before);
      expect((await h.call(`/api/operators/${h.ownerId}/role`,{role:'owner'},'PUT',custodian)).status).toBe(200);
      console.log('PROBE CONT-022 authority: native Owner queues erasure, becomes Analyst through role route, Queue delivery and replay -> failed zero-progress receipt; contact profile unchanged');
    });

    await test.step('Topic membership requires the selected address, channel and covering confirmed category',async()=>{
      const ids=people.map(person=>person.id);
      for(const channel of ['email','sms']) {
        const eligible=channel==='email'?[people[0]]:people.slice(0,2);
        const job=await run({contactIds:ids,action:'topic',value:'offers',channel});
        expect(job).toMatchObject({total:6,succeeded:eligible.length,refused:6-eligible.length});
        expect(job.refusals).toEqual(people.filter(person=>!eligible.includes(person)).map(person=>({
          contactId:person.id,displayName:person.name,reason:'missing-covering-consent',
        })));
        const memberships=(await h.f.db.prepare('SELECT contact_id,channel,topic,evidence_id FROM contact_topic_memberships WHERE channel=? ORDER BY contact_id')
          .bind(channel).all()).results;
        expect(memberships).toEqual(eligible.map(person=>({contact_id:person.id,channel,topic:'offers',evidence_id:`${person.id}-${channel}-consent`})));
      }
      const newsletter=await run({contactIds:[people[4].id],action:'topic',value:'newsletter',channel:'email'});
      expect(newsletter).toMatchObject({total:1,succeeded:1,refused:0});
      expect((await h.json(`/api/contacts/${people[1].id}`)).contact.emailStatus).toBe('pending');
    });

    await test.step('Narrow export and suppression preserve channel boundaries; erasure scrubs old receipts',async()=>{
      const exported=await run({contactIds:[people[0].id,people[4].id,people[0].id],action:'export'});
      expect(exported).toMatchObject({total:2,succeeded:2,refused:0});
      const exportPath=`/api/audience/bulk/${exported.id}/export`;
      const before=parseCsv(await csv(exportPath));
      expect(before.map(row=>row['contact id'])).toEqual([people[0].id,people[4].id]);
      expect(before[0].name).toBe(people[0].name);expect(before[0]['email address']).toBe(people[0].email);
      const email=await run({contactIds:[people[0].id],action:'suppress',channel:'email'});
      expect(email).toMatchObject({succeeded:1,refused:0});
      const afterEmail=await h.json(`/api/contacts/${people[0].id}`);
      expect(afterEmail.contact).toMatchObject({emailStatus:'suppressed',smsStatus:'subscribed'});
      expect(afterEmail.suppressions).toContainEqual(expect.objectContaining({channel:'email',cause:'owner-block'}));
      const sms=await run({contactIds:[people[0].id,people[5].id],action:'suppress',channel:'sms'});
      expect(sms).toMatchObject({succeeded:1,refused:1,refusals:[{contactId:people[5].id,displayName:people[5].name,reason:'missing-channel-address'}]});
      expect((await h.json(`/api/contacts/${people[0].id}`)).contact).toMatchObject({emailStatus:'suppressed',smsStatus:'suppressed'});
      expect((await run({contactIds:[people[0].id],action:'topic',value:'offers',channel:'email'})).refused).toBe(1);
      expect((await h.json(`/api/contacts/${people[4].id}`)).contact.emailStatus).toBe('subscribed');
      let erasing=await start({contactIds:[people[0].id],action:'erase'});
      erasing=await resume(erasing);
      expect(erasing.state).toBe('running');
      expect((await h.call(exportPath)).status).toBe(503);
      expect((await h.call('/api/audience/bulk',{contactIds:[people[4].id],action:'export'})).status).toBe(503);
      const erased=await finish(erasing,2000);
      expect(erased).toMatchObject({total:1,processed:1,succeeded:1,refused:0});
      expect((await h.call(`/api/contacts/${people[0].id}`)).status).toBe(404);
      const oldReceipt=await h.json(`/api/audience/bulk/${sms.id}`),erasureReceipt=await h.json(`/api/audience/bulk/${erased.id}`);
      const exportedAfter=await csv(exportPath),archive=await csv('/api/audience/export');
      expect(parseCsv(exportedAfter).map(row=>row['contact id'])).toEqual([people[4].id]);
      for(const identity of Object.values(people[0]))for(const output of [JSON.stringify(oldReceipt),JSON.stringify(erasureReceipt),exportedAfter,archive])expect(output).not.toContain(identity);
      const restrictions=parseCsv(archive).map(row=>JSON.parse(row.ledger_json)).flatMap(ledger=>ledger.opt_outs?.contact_suppressions??[]);
      expect(restrictions.map(row=>({channel:row.channel,cause:row.cause,contactId:row.contact_id})).sort((a,b)=>a.channel.localeCompare(b.channel)))
        .toEqual([{channel:'email',cause:'owner-block',contactId:null},{channel:'sms',cause:'owner-block',contactId:null}]);
      expect(restrictions.every(row=>row.provider_event_id.startsWith('integration:'))).toBe(true);
      const replayed=await run({contactIds:[people[0].id],action:'tag',value:'erasure-replay'});
      expect(replayed).toMatchObject({total:1,succeeded:0,refused:1});
      expect((await h.call(`/api/contacts/${people[0].id}`)).status).toBe(404);
    });

    await test.step('A 5,000-contact frozen job survives app recreation and replays without widening selection',async()=>{
      // The erased member is gone: five existing examples plus 4,995 new contacts.
      await seedBulkPeople(h.f.db,6,5001);
      const result=await search('name','Market member');expect(result.total).toBe(5000);
      expect(result.contacts.length).toBeLessThan(result.total);
      let job=await start({search:{field:'name',value:'Market member'},action:'tag',value:'autumn-market'});
      expect(job).toMatchObject({total:5000,processed:0,succeeded:0,refused:0});
      expect((await h.call(`/api/audience/bulk/${job.id}/export`)).status).toBe(409);
      const command=h.f.jobs.findLast((value:any)=>value.kind==='contact.bulk'&&value.payload.id===job.id);
      expect(command).toBeTruthy();let acknowledged=false,retried=false;
      await consumeLifecycleQueue({messages:[{body:command,ack(){acknowledged=true;},retry(){retried=true;}}]} as unknown as LifecycleQueueBatch,h.f.services.lifecycleRuntime);
      expect(acknowledged).toBe(true);expect(retried).toBe(false);
      job=(await h.json(`/api/audience/bulk/${job.id}`)).job;expect(job.processed).toBeGreaterThan(0);expect(job.processed).toBeLessThan(job.total);
      h.restart();expect((await h.json(`/api/audience/bulk/${job.id}`)).job).toEqual(job);
      // A newly matching person is outside the selection already frozen by the command.
      await seedBulkPeople(h.f.db,5001,5002);
      job=await finish(job);
      expect(job).toMatchObject({total:5000,processed:5000,succeeded:5000,refused:0,refusals:[]});
      for(const index of [1,2500,5000])expect((await profile(bulkPerson(index).id)).tags).toContain('autumn-market');
      expect((await profile(bulkPerson(5001).id)).tags).not.toContain('autumn-market');
      expect((await h.f.db.prepare("SELECT count(*) n FROM contact_tag_overrides WHERE tag=? AND present=1").bind('autumn-market').first<{n:number}>())!.n).toBe(5000);
      expect(await resume(job)).toEqual(job);h.restart();expect((await h.json(`/api/audience/bulk/${job.id}`)).job).toEqual(job);
    });

    await test.step('Private bulk work rejects anonymous, analyst and revoked initiating authority',async()=>{
      const analyst=await h.analyst(),body={contactIds:[people[4].id],action:'tag',value:'revoked-action'};
      const pending=await start(body);
      for(const [as,status]of [[null,401],[analyst,403]] as const)for(const [path,payload,method]of [
        ['/api/audience/search?field=name&value=Market',undefined,'GET'],['/api/audience/bulk-options',undefined,'GET'],
        ['/api/audience/bulk',body,'POST'],[`/api/audience/bulk/${pending.id}`,undefined,'GET'],
        [`/api/audience/bulk/${pending.id}/resume`,{},'POST'],[`/api/audience/bulk/${pending.id}/export`,undefined,'GET'],
      ] as const)expect((await h.call(path,payload,method,as)).status).toBe(status);
      expect((await h.json(`/api/audience/bulk/${pending.id}`)).job).toEqual(pending);
      await h.f.db.prepare('UPDATE oa_sessions SET revoked_at=?').bind(Date.now()).run();
      expect((await h.call(`/api/audience/bulk/${pending.id}/resume`,{})).status).toBe(401);
      await h.renewOwner();
      const refused=await h.call(`/api/audience/bulk/${pending.id}/resume`,{});expect(refused.status).toBe(409);
      const failed=(await refused.json() as any).job;
      expect(failed).toMatchObject({state:'failed',total:1,processed:0,succeeded:0,refused:0});
      expect((await profile(people[4].id)).tags).not.toContain(body.value);
      expect((await h.json(`/api/audience/bulk/${pending.id}`)).job).toEqual(failed);
    });
    console.log('PROBE CONT-022 1: authenticated search for email, formatted phone, name, latest typed property, imported tag, saved segment and consent states -> expected contact identities');
    console.log('PROBE CONT-022 2: selected tag, untag, CSV export, email and SMS suppression, native erasure and topic additions -> saved changes; topic receipt names every refusal; erased identities absent from old receipts and exports');
    console.log('PROBE CONT-022 3: create and resume a frozen 5000-contact job, recreate app mid-job and replay terminal command -> monotonic progress and durable 5000-success receipt');
    console.log('PROBE CONT-022 4: property 42 selects one person; 5000-contact tag job completes; topic additions refuse mismatched, missing, unconfirmed and restricted evidence by name');
  } finally {await h.dispose();}
}
