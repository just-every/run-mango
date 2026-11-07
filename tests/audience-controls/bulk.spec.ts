import {expect,test} from '@playwright/test';
import {runtime} from './runtime';

type H=Awaited<ReturnType<typeof runtime>>;
const at=Date.now()-86_400_000;
const id=(n:number)=>`synthetic-mango-bulk-${n}`;

/** 5,200 contacts: 0..4999 subscribed (the 5,000-contact selection), 5000..5199 not subscribed.
 * 0..99 hold confirmed consent for "offers", 100..149 for "news"; 0..19 also hold a phone. */
async function seed(h:H) {
  const db=h.f.db;
  const numbers='WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<5199)';
  await db.batch([
    db.prepare(`${numbers} INSERT INTO contacts(id,email,display_name,email_status,sms_status,email_status_at,sms_status_at,last_activity_at,created_at,updated_at)
      SELECT 'synthetic-mango-bulk-'||i,'synthetic-mango-bulk-'||i||'@example.test','Bulk '||i,CASE WHEN i<5000 THEN 'subscribed' ELSE 'non-subscribed' END,'non-subscribed',?,?,?,?,? FROM n`).bind(at,at,at,at,at),
    db.prepare(`${numbers} INSERT INTO contact_email_addresses(id,contact_id,email,channel_status,channel_status_at,created_at,updated_at)
      SELECT 'synthetic-mango-bulk-'||i||'-email','synthetic-mango-bulk-'||i,'synthetic-mango-bulk-'||i||'@example.test',CASE WHEN i<5000 THEN 'subscribed' ELSE 'non-subscribed' END,?,?,? FROM n`).bind(at,at,at),
    db.prepare(`${numbers} INSERT INTO contact_phones(id,contact_id,phone_e164,channel_status,channel_status_at,identity_status,created_at,updated_at)
      SELECT 'synthetic-mango-bulk-'||i||'-sms','synthetic-mango-bulk-'||i,'+1555550'||printf('%04d',i),'non-subscribed',?,'active',?,? FROM n WHERE i<20`).bind(at,at,at),
    db.prepare(`${numbers} INSERT INTO consent_evidence(id,contact_id,channel,destination,brand_or_legal_sender,message_category,frequency_disclosure,destination_jurisdiction,capture_method,capture_source,consent_text,consent_version,occurred_at,confirmation_required,confirmed_at,created_at,updated_at)
      SELECT 'synthetic-mango-bulk-'||i||'-consent','synthetic-mango-bulk-'||i,'email','synthetic-mango-bulk-'||i||'@example.test','Mango',CASE WHEN i<100 THEN 'offers' ELSE 'news' END,'Weekly','US','recorded','synthetic-mango','Weekly mail','v1',?,1,?,?,? FROM n WHERE i<150`).bind(at,at,at,at),
  ]);
}
const ids=(result:{contacts:{id:string}[]})=>result.contacts.map(contact=>contact.id).sort();
const expected=(...numbers:number[])=>numbers.map(id).sort();

/** Run a durable job to its end through the public resume door, checking progress never goes backwards. */
async function finish(h:H,receipt:any,limit=200) {
  let last=receipt.processed;
  for(let step=0;receipt.state==='running'&&step<limit;step++){
    const response=await h.call(`/api/audience/bulk/${receipt.id}/resume`,{},'POST');
    expect([200,202],await response.clone().text()).toContain(response.status);
    receipt=(await response.json() as any).receipt;
    expect(receipt.processed).toBeGreaterThanOrEqual(last);last=receipt.processed;
  }
  expect(receipt.state).toBe('complete');
  return receipt;
}
const bulk=async(h:H,body:unknown)=>{const response=await h.call('/api/audience/bulk',body,'POST');return {status:response.status,body:await response.json() as any};};
const search=(h:H,query:string)=>h.json(`/api/audience/search?${query}`);
const asRole=async(h:H,role:string|null)=>{
  const owner=(await h.f.db.prepare('SELECT id FROM oa_operators LIMIT 1').first<{id:string}>())!.id;
  // This disposable installation has one operator: lift the last-owner guard so it can act in another role.
  await h.f.db.batch(['operator_role_initial_owner','operator_role_final_owner'].map(name=>h.f.db.prepare(`DROP TRIGGER IF EXISTS ${name}`)));
  if(role===null)await h.f.db.prepare('DELETE FROM operator_product_roles WHERE operator_id=?').bind(owner).run();
  else await h.f.db.prepare('INSERT INTO operator_product_roles(operator_id,role,unmasked_contacts,updated_by,updated_at) VALUES(?,?,0,?,?) ON CONFLICT(operator_id) DO UPDATE SET role=excluded.role').bind(owner,role,owner,Date.now()).run();
};

test('[CONT-022] find contacts by every fact, then tag, untag, export, suppress, add to a topic and erase selections with durable receipts',async()=>{
  test.setTimeout(600_000);
  const h=await runtime();
  try {
    await h.f.prove();
    await seed(h);

    await test.step('search: property value, email, phone, name, segment, consent state and combined filters',async()=>{
      await h.json('/api/settings/properties',{key:'plan',label:'Plan',type:'text',options:[]});
      await h.json('/api/settings/properties',{key:'spend',label:'Spend',type:'money',options:[]});
      for(const [n,fields] of [[3,{plan:'gold'}],[7,{plan:'gold',spend:'$12.50'}],[9,{plan:'silver',spend:'12.50'}],[11,{plan:'gold'}],[13,{plan:'Gold'}]] as const)
        await h.json(`/api/contacts/${id(n)}/properties`,{fields},'PUT');
      expect(ids(await search(h,'propertyKey=plan&propertyValue=gold'))).toEqual(expected(3,7,11));
      expect(ids(await search(h,'propertyKey=spend&propertyValue=%2412.50'))).toEqual(expected(7,9));
      expect((await search(h,'propertyKey=plan&propertyValue=gold')).total).toBe(3);
      expect(ids(await search(h,'email=bulk-4999@'))).toEqual(expected(4999));
      expect(ids(await search(h,'phone=%2B15555500'))).toHaveLength(20);
      expect(ids(await search(h,'name=bulk%204998'))).toEqual(expected(4998));
      const segment=await h.json('/api/audience/segments',{name:'Hand picked',inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'id',comparator:'in',value:[id(3),id(9)]}]}),exclusionRulesJson:'[]'});
      const segmentId=segment.segment.id;
      expect(ids(await search(h,`segmentId=${segmentId}`))).toEqual(expected(3,9));
      expect(ids(await search(h,`segmentId=${segmentId}&propertyKey=plan&propertyValue=gold`))).toEqual(expected(3));
      expect((await search(h,'consentChannel=email&consentState=non-subscribed')).total).toBe(200);
      expect((await h.call('/api/audience/search?propertyKey=nothing&propertyValue=x')).status).toBe(400);
    });

    await test.step('a masked role finds people only by a complete address, number or consent state',async()=>{
      await asRole(h,'support');
      try {
        expect((await h.call('/api/audience/search?tag=winter')).status).toBe(403);
        expect((await h.call('/api/audience/search?propertyKey=plan&propertyValue=gold')).status).toBe(403);
        expect(ids(await search(h,'email=bulk-4999@'))).toEqual([]);
        expect(ids(await search(h,`email=${id(4999)}%40example.test`))).toEqual(expected(4999));
        expect((await bulk(h,{action:'tag',params:{tag:'nope'},selection:{contactIds:[id(1)]}})).status).toBe(403);
      } finally {await asRole(h,null);}
    });

    await test.step('tag 5,000 contacts as a durable job with progress and a receipt, and tag a small selection in the request',async()=>{
      const started=await bulk(h,{action:'tag',params:{tag:'winter'},selection:{search:{consent:{channel:'email',state:'subscribed'}}}});
      expect(started.status).toBe(202);
      expect(started.body.receipt).toMatchObject({action:'tag',state:'running',total:5000,processed:0});
      const receipt=await finish(h,started.body.receipt);
      expect(receipt).toMatchObject({total:5000,processed:5000,succeeded:5000,refused:0});
      expect((await search(h,'tag=winter')).total).toBe(5000);
      expect(ids(await search(h,`email=${id(5100)}%40example.test&tag=winter`))).toEqual([]);
      expect(JSON.parse((await h.f.db.prepare("SELECT tags_json AS t FROM integration_contact_profiles WHERE contact_id=?").bind(id(2500)).first<{t:string}>())!.t)).toEqual(['winter']);
      const again=await finish(h,(await bulk(h,{action:'tag',params:{tag:'WINTER'},selection:{contactIds:[id(1),id(2)]}})).body.receipt);
      expect(again.succeeded).toBe(2);
      expect(JSON.parse((await h.f.db.prepare("SELECT tags_json AS t FROM integration_contact_profiles WHERE contact_id=?").bind(id(1)).first<{t:string}>())!.t)).toEqual(['winter']);
      const small=await bulk(h,{action:'tag',params:{tag:'vip'},selection:{contactIds:[id(3),id(7)]}});
      expect(small.status).toBe(200);expect(small.body.receipt).toMatchObject({state:'complete',total:2,succeeded:2});
      expect(ids(await search(h,'tag=vip'))).toEqual(expected(3,7));
      expect((await h.json(`/api/audience/bulk/${started.body.receipt.id}`)).receipt).toMatchObject({state:'complete',total:5000,succeeded:5000});
    });

    await test.step('untag removes the tag and says plainly when an imported tag cannot be removed',async()=>{
      await h.f.db.prepare("INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) VALUES(?,?,'incumbent-profile',?,?,?,?)")
        .bind('synthetic-mango-bulk-legacy',id(5),JSON.stringify({fields:{},topics:[],tags:['legacy']}),at,at,at).run();
      const removed=await bulk(h,{action:'untag',params:{tag:'winter'},selection:{contactIds:[id(3),id(7)]}});
      expect(removed.body.receipt).toMatchObject({state:'complete',succeeded:2});
      expect((await search(h,'tag=winter')).total).toBe(4998);
      const imported=await bulk(h,{action:'untag',params:{tag:'legacy'},selection:{contactIds:[id(5)]}});
      expect(imported.body.receipt).toMatchObject({state:'complete',succeeded:0,refused:1});
      expect(imported.body.receipt.refusedContacts[0]).toMatchObject({contactId:id(5),reason:'imported_tag_kept'});
    });

    await test.step('add to a topic only with covering consent, and name every refused contact',async()=>{
      await h.f.db.prepare("UPDATE contacts SET email_status='unsubscribed' WHERE id=?").bind(id(95)).run();
      await h.f.db.prepare("UPDATE contact_email_addresses SET channel_status='unsubscribed' WHERE contact_id=?").bind(id(95)).run();
      const selection=Array.from({length:30},(_,index)=>id(90+index));
      const started=await bulk(h,{action:'add-to-topic',params:{topic:'offers'},selection:{contactIds:selection}});
      expect(started.status).toBe(202);
      const receipt=await finish(h,started.body.receipt);
      expect(receipt).toMatchObject({total:30,succeeded:9,refused:21});
      const refused=[...receipt.refusedContacts.map((row:any)=>row.contactId)].sort();
      expect(refused).toEqual([id(95),...Array.from({length:20},(_,index)=>id(100+index))].sort());
      expect(receipt.refusedContacts.find((row:any)=>row.contactId===id(100))).toMatchObject({name:'Bulk 100',reason:'no_covering_consent'});
      const members=(await h.f.db.prepare('SELECT contact_id AS id,evidence_id AS evidence FROM contact_topic_memberships WHERE topic=? ORDER BY contact_id').bind('offers').all<{id:string;evidence:string}>()).results;
      expect(members.map(row=>row.id)).toEqual([...selection.filter(contact=>!refused.includes(contact))].sort());
      expect(members.every(row=>row.evidence===`${row.id}-consent`)).toBe(true);
      const paged=await h.json(`/api/audience/bulk/${receipt.id}?refusedLimit=5`);
      expect(paged.receipt.refusedContacts).toHaveLength(5);expect(paged.receipt.refusedNext).not.toBeNull();
      expect((await h.f.db.prepare("SELECT COUNT(*) AS n FROM contact_topic_memberships WHERE contact_id=? AND topic='news'").bind(id(120)).first<{n:number}>())!.n).toBe(0);
    });

    await test.step('export gives the finished selection as a CSV for roles that may export',async()=>{
      const exported=await bulk(h,{action:'export',selection:{contactIds:[id(3),id(7),id(11)]}});
      expect(exported.status).toBe(200);expect(exported.body.receipt).toMatchObject({state:'complete',succeeded:3});
      const csv=await (await h.call(`/api/audience/bulk/${exported.body.receipt.id}/export`)).text();
      for(const n of [3,7,11])expect(csv).toContain(id(n));
      expect(csv).not.toContain(id(4));
      await asRole(h,'manager');
      try {
        expect((await h.call(`/api/audience/bulk/${exported.body.receipt.id}/export`)).status).toBe(403);
        expect((await bulk(h,{action:'export',selection:{contactIds:[id(3)]}})).status).toBe(403);
        expect((await bulk(h,{action:'erase',selection:{contactIds:[id(3)]},confirmTotal:1})).status).toBe(403);
      } finally {await asRole(h,null);}
    });

    await test.step('suppress keeps the opt-out custody and needs the operator to confirm the count',async()=>{
      expect((await bulk(h,{action:'suppress',selection:{contactIds:[id(20),id(21)]}})).status).toBe(400);
      expect((await bulk(h,{action:'suppress',selection:{contactIds:[id(20),id(21)]},confirmTotal:3})).body.error).toBe('selection_changed');
      const started=await bulk(h,{action:'suppress',selection:{contactIds:[id(0),id(21),'synthetic-mango-bulk-missing']},confirmTotal:3});
      const receipt=await finish(h,started.body.receipt);
      expect(receipt).toMatchObject({total:3,succeeded:2,refused:1});
      expect(receipt.refusedContacts[0]).toMatchObject({contactId:'synthetic-mango-bulk-missing',reason:'contact_missing'});
      expect(ids(await search(h,'consentChannel=email&consentState=suppressed'))).toEqual(expected(0,21));
      expect((await h.f.db.prepare("SELECT COUNT(*) AS n FROM surviving_opt_outs WHERE channel='email' AND reason='suppressed'").first<{n:number}>())!.n).toBe(2);
      const replay=await finish(h,(await h.json(`/api/audience/bulk/${receipt.id}`)).receipt);
      expect(replay.succeeded).toBe(2);
      expect((await h.f.db.prepare("SELECT COUNT(*) AS n FROM contact_suppressions WHERE channel='email'").first<{n:number}>())!.n).toBe(2);
    });

    await test.step('erase runs CONT-013 for every selected contact and leaves a receipt without them',async()=>{
      expect((await bulk(h,{action:'erase',selection:{contactIds:[id(90),id(91)]}})).status).toBe(400);
      const started=await bulk(h,{action:'erase',selection:{contactIds:[id(90),id(91),id(21)]},confirmTotal:3});
      expect(started.status).toBe(202);
      const receipt=await finish(h,started.body.receipt,2000);
      expect(receipt).toMatchObject({total:3,succeeded:3,refused:0,state:'complete'});
      for(const n of [90,91,21])expect((await h.call(`/api/contacts/${id(n)}`)).status).toBe(404);
      expect((await h.call(`/api/contacts/${id(93)}`)).status).toBe(200);
      const left=(await h.f.db.prepare("SELECT (SELECT COUNT(*) FROM contact_topic_memberships WHERE contact_id IN (?,?,?)) AS topics,(SELECT COUNT(*) FROM contact_bulk_items WHERE contact_id IN (?,?,?)) AS items").bind(id(90),id(91),id(21),id(90),id(91),id(21)).first<{topics:number;items:number}>())!;
      expect(left).toEqual({topics:0,items:0});
      // CONT-013: the suppressed address keeps its opt-out; subscribed addresses leave no tombstone.
      expect((await h.f.db.prepare("SELECT COUNT(*) AS n FROM surviving_opt_outs WHERE channel='email' AND reason IN ('erasure-opt-out','suppressed')").first<{n:number}>())!.n).toBe(3);
      const replay=await h.call(`/api/audience/bulk/${receipt.id}/resume`,{},'POST');
      expect(((await replay.json()) as any).receipt).toMatchObject({succeeded:3,state:'complete'});
    });
  } finally {await h.dispose();}
});
