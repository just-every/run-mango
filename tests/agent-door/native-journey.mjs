import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

/** Normal rer verify hook: paid network responses only; all native custody is real. */
export default async function({tool,request,origin,cookie,queues}){
 queues.hold();
 try{
 async function call(name,args={},readOnly=false){
  const answer=await tool(name,{...args,...(readOnly?{}:{idempotency_key:args.idempotency_key??randomUUID()})});
  assert.equal(answer.status,200);assert.equal(answer.result?.isError,false,name);
  return answer;
 }
 const createKey=randomUUID();
 const draft=(await call('mango.campaigns.create',{idempotency_key:createKey})).result.structuredContent;
 const beforeReplay=(await call('mango.witness.read',{},true)).result.structuredContent;
 assert.deepEqual((await call('mango.campaigns.create',{idempotency_key:createKey})).result.structuredContent,draft);
 assert.deepEqual((await call('mango.witness.read',{},true)).result.structuredContent,beforeReplay);
 const read=await call('mango.campaigns.read',{id:draft.campaignId},true);
 const audit=await request(new URL('/agents/api/audit',origin),{headers:{Cookie:cookie}});
 assert.equal(audit.status,200);
 const target=(await audit.json()).rows.find(row=>row.id===read.decision.id);
 assert.deepEqual(target.resource,{kind:'campaigns',id:draft.campaignId});
 const pause=async paused=>{
  const response=await request(new URL('/agents/api/pause',origin),{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({paused})});
  assert.equal(response.status,200);await response.body?.cancel();
 };
 await pause(true);
 try{
  const refused=await tool('mango.campaigns.create',{idempotency_key:createKey});
  assert.equal(refused.result?._meta?.['com.runeditrun/error']?.code,'agents_paused');
  assert.equal(refused.result?.structuredContent,undefined);
 }finally{await pause(false);}
 assert.deepEqual((await call('mango.witness.read',{},true)).result.structuredContent,beforeReplay);
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
 }finally{queues.release();}
}

/** Assert the native effects as well as Base's class, policy and replay checks. */
export async function afterStep({request,origin,cookie,mail,step,args,result,queues,database}){
 const {nativeHttp}=await import('./native-http.mjs');
 const http=nativeHttp({request,origin,cookie});
 switch(step.id){
  case 'native-teammate-narrow': {
   const people=await http('/api/operators');
   assert.equal(people.operators.find(person=>person.id===args.id)?.role,'author');break;
  }
  case 'native-campaign-reauthorize': {
   assert.equal(result.status,'reapproved');
   const campaign=await http('/api/campaigns/'+args.id);
   assert.equal(campaign.revision.id,args.revisionId);assert.equal(campaign.revision.state,'approved');
   assert.equal(campaign.campaign.state,'scheduled');break;
  }
  case 'native-contact-read':assert.equal(result.contact.emailStatus,'non-subscribed');break;
  case 'native-protected-read':assert.ok(result.consent.some(item=>item.captureIp==='192.0.2.44'));break;
  case 'native-contact-consent':assert.equal(result.contact.emailStatus,'pending');assert.equal(result.confirmationRequired,true);break;
  case 'native-contact-optout':assert.equal((await http('/api/contacts/'+args.id)).contact.emailStatus,'unsubscribed');break;
  case 'native-contact-merge':assert.equal(result.contact.id,args.survivorContactId);break;
  case 'native-contact-erasure': {
   let receipt=result.receipt;
   for(let count=0;receipt.state!=='complete'&&count<100;count++)receipt=(await http('/api/audience/erasures/'+receipt.reference+'/resume',{})).receipt;
   assert.equal(receipt.state,'complete','Native erasure completes');
   const erased=await request(new URL('/api/contacts/'+args.id,origin),{headers:{Cookie:cookie}});
   assert.equal(erased.status,404);await erased.body?.cancel();break;
  }
  case 'native-image':assert.ok(result.asset?.id);assert.ok(result.asset.bytes>0);break;
  case 'native-signup-authority': {
   const signup=await http('/api/audience/signup');
   assert.deepEqual(signup.embedOrigins,[]);assert.equal(signup.challengeEnabled,true);break;
  }
  case 'native-enqueue':assert.equal(result.status,'queued');assert.ok(result.steps.length);break;
  case 'native-delivery-dispatch': {
   assert.equal(result.status,'processed');
   const db=await database('DB');
   const receipt=await db.prepare('SELECT provider_message_id,transport_disposition FROM recipient_steps WHERE campaign_id=? AND revision_id=?').bind(args.campaignId,args.revisionId).first();
   assert.ok(receipt?.provider_message_id,'The native dispatch handed off an actual recipient');
   assert.equal(receipt.transport_disposition,'accepted');
   queues.release();break;
  }
  case 'native-followup': {
   assert.equal(result.kind,'draft');assert.equal(result.sourceCampaignId,args.id);
   const draft=await http('/api/campaigns/'+result.campaignId);assert.equal(draft.revision.state,'draft');break;
  }
  case 'native-report-dispatch': {
   assert.equal(result.status,'processed');
   const db=await database('DB');
   const delivery=await db.prepare('SELECT state,provider_message_id FROM insight_report_deliveries WHERE id=?').bind(args.deliveryId).first();
   assert.equal(delivery.state,'accepted');assert.ok(delivery.provider_message_id);break;
  }
  case 'native-report-pause': {
   const reports=await http('/api/settings/reports');
   assert.equal(reports.schedules.find(schedule=>schedule.id===args.id)?.enabled,0);break;
  }
  case 'native-design-candidates': {
   // The worker outcome is wrapped; the mandatory choice next proves the
   // actual candidate is on offer rather than accepting a queued-only result.
   assert.equal(result.status,'processed');break;
  }
  case 'native-store-advance':
  case 'native-observations-advance': {
   let current;
   for(let count=0;count<120;count++){
    const store=await http('/api/store');current=store.syncRuns.find(run=>run.id===args.runId);
    if(current?.state==='completed'||current?.state==='failed')break;
    await new Promise(resolve=>setTimeout(resolve,250));
   }
   assert.equal(current?.state,'completed','Native source sync completes');break;
  }
  case 'native-flow-enroll': {
   const flows=await http('/api/flows');
   assert.equal(flows.flows.find(flow=>flow.id===args.id)?.enrollments,1,'The signed checkout produces one native enrollment');break;
  }
  case 'native-sms-dispatch': {
   assert.equal(result.state,'deferred');
   const {messages}=await http('/api/audience/sms-services'),message=messages.find(message=>message.id===args.id);
   assert.equal(message.state,'queued');assert.equal(message.reason,'sms-quiet-window');assert.equal(message.provider_message_id,null);break;
  }
  case 'native-proposal-adopt':assert.equal(result.kind,'draft');break;
  case 'native-archive-publish': {
   const published=await request(new URL('/archive/'+result.id,origin));assert.equal(published.status,200);await published.body?.cancel();break;
  }
  case 'native-archive-withdraw': {
   const withdrawn=await request(new URL('/archive/'+args.publication,origin));assert.equal(withdrawn.status,404);await withdrawn.body?.cancel();break;
  }
  case 'native-proposal-dismiss':assert.equal(result.kind,'dismissed');break;
  case 'native-design-close':assert.equal(result.job.state,'discarded');break;
  case 'native-sender-check': {
   const link=mail.read().flatMap(message=>message.text.match(/https:\/\/[^\s<>]+/g)??[])
    .map(value=>new URL(value)).findLast(url=>url.origin===origin&&url.pathname.startsWith('/sender-check/'));
   assert.ok(link,'Native sender receipt comes from the accepted owner-mail edge');
   const confirmed=await request(link,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'});
   assert.equal(confirmed.status,200,'The owner confirms the actual sender check');await confirmed.body?.cancel();break;
  }
 }
}

export async function beforeStep({step,outputs,request,origin,cookie,database,scheduled,now}){
 if(step.id==='native-report-ready'){
  const {nativeHttp}=await import('./native-http.mjs');
  const http=nativeHttp({request,origin,cookie}),schedule=outputs['native-report-schedule'];
  const db=await database('DB');
  await http('/agents/api/pause',{paused:true});
  try{
   await db.prepare('UPDATE insight_report_schedules SET next_at=? WHERE id=?').bind(now-60000,schedule.id).run();
   await scheduled({scheduledTime:now});
  }finally{await http('/agents/api/pause',{paused:false});}
  const prepared=await db.prepare('SELECT state FROM insight_report_deliveries WHERE schedule_id=?').bind(schedule.id).first();
  assert.equal(prepared?.state,'prepared','Cron retains a real report for the admitted dispatch');
 }
 if(['mango.sender.verify','mango.contacts.consent','mango.campaigns.test_send','mango.reports.dispatch','mango.delivery.dispatch'].includes(step.tool)){
  const {mailAllowance}=await import('./native-http.mjs');await mailAllowance();
 }
}
