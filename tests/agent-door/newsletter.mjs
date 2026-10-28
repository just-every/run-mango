import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

/** Specialist proof through production HTTP/MCP, without database access. */
export default async function newsletter({request,origin,email,cookie,mail,tool}){
 const person=async(path,method='GET',body)=>{
  const response=await request(new URL(path,origin).href,{method,headers:{Origin:origin,Cookie:cookie,'CF-Connecting-IP':'192.0.2.41','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.ok(response.ok,`${method} ${path} must complete through native admission`);
  return response.json();
 };
 const call=async(name,args={})=>{
  const response=await tool('mango.'+name,{...args,idempotency_key:args.idempotency_key??randomUUID()});
  assert.equal(response.status,200);assert.ok(response.result&&!response.result.isError&&!response.message?.error,`${name} must complete`);
  assert.notEqual(response.result.resultType,'input_required');
  return response.result.structuredContent;
 };
 await call('store.read');await call('sender.read');await call('audience.read');
 const {identity}=await person('/api/settings/sender');
 await person('/api/settings/sender/confirmation','POST',{});
 const captured=await mail.read({limit:20});
 const confirmation=captured.flatMap(message=>[...String(message.text??'').matchAll(/https:\/\/[^\s<>]+\/sender-check\/[^\s<>]+/g)].map(match=>match[0])).at(-1);
 assert.ok(confirmation,'Sender proof must come from the actual captured owner mail');
 const confirm=await request(confirmation,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'});assert.ok(confirm.ok);
 // These are explicit fixture-person consent decisions through the native UI
 // API. The agent never supplies a confirmation or changes the capture mode.
 await person('/api/settings/opt-in/manual','PUT',{mode:'single'});
 const contacts=[];
 for(const [address,name]of [[email,'Orchard owner'],['optout-'+randomUUID()+'@example.test','Orchard reader']]){
  const result=await person('/api/contacts/consent','POST',{contact:{email:address,displayName:name},channel:'email',brandOrLegalSender:identity.displayName,messageCategory:'offers',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'written',captureSource:'Disposable verifier fixture',consentText:'Please send the Orchard weekly newsletter.',consentVersion:'v1',occurredAt:new Date(Date.now()-1000).toISOString(),permissionMethod:'written',affirmed:true});
  contacts.push(result.contact.id);
 }
 const created=await call('campaigns.create',{mode:'blank'}),key=randomUUID();
 await call('campaigns.update',{id:created.revisionId,name:'Orchard weekly harvest',emailSubject:'This week at the orchard',preheader:'The weekly harvest is ready',emailBody:'<p>Our harvest is ready.</p><p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>',emailText:'Our harvest is ready. {{physical_address}} Unsubscribe: {{unsubscribe_url}}',senderName:identity.displayName,fromEmail:identity.fromEmail,replyToEmail:identity.replyToEmail,physicalAddress:identity.physicalAddress,messageCategory:'offers',inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'id',comparator:'in',value:contacts}]}),exclusionRulesJson:'[]',steps:[{channel:'email',timezone:'UTC',scheduledAt:new Date(Date.now()-1000).toISOString(),sendByAt:new Date(Date.now()+3600000).toISOString(),whyThisTime:'Disposable native newsletter proof'}]});
 const checked=await call('campaigns.checks_refresh',{id:created.campaignId,revisionId:created.revisionId});assert.deepEqual(checked.blockers,[]);
 const authorized=await call('campaigns.authorize',{id:created.campaignId,revisionId:created.revisionId,idempotency_key:key});
 assert.deepEqual(await call('campaigns.authorize',{id:created.campaignId,revisionId:created.revisionId,idempotency_key:key}),authorized);
 await person('/api/contacts/'+contacts[1]+'/opt-out','POST',{channel:'email'});
 const current=await call('campaigns.read',{id:created.campaignId});
 await call('delivery.prepare',{id:current.steps[0].id,revisionId:created.revisionId});
 const frozen=await call('delivery.read',{id:created.campaignId});
 for(const recipient of frozen.recipients){const args={id:recipient.id,idempotency_key:randomUUID()};const sent=await call('delivery.dispatch',args);assert.deepEqual(await call('delivery.dispatch',args),sent);}
 const delivered=await call('delivery.read',{id:created.campaignId});
 assert.equal(delivered.recipients.find(row=>row.contact_id===contacts[1])?.transport_disposition,'skipped');
 const actual=delivered.recipients.find(row=>row.contact_id===contacts[0]);assert.equal(actual?.attempt_count,1);
 const messages=await mail.read({limit:20});assert.ok(messages.some(message=>message.subject==='This week at the orchard'&&/Prepared by .+ for .+/.test(message.text)));
 await call('reports.results',{id:created.campaignId});
 // A separate paid draft artifact retains native provider and R2 custody.
 const designDraft=await call('campaigns.create',{mode:'blank'});
 const started=await call('designs.start',{id:designDraft.campaignId,brief:'Orchard harvest newsletter {{contact.email}} {{unsubscribe_url}}',candidates:2});
 await call('designs.advance',{id:started.job.id,phase:'draft'});
 const choices=await call('designs.read',{id:started.job.id});assert.equal(choices.job.state,'choosing');
 await call('designs.choose',{id:started.job.id,slot:'a'});
 await call('designs.advance',{id:started.job.id,phase:'layout'});
 const retained=await call('designs.read',{id:started.job.id});assert.equal(retained.job.state,'ready');assert.match(retained.job.layerdoc_sha256,/^[a-f0-9]{64}$/);
 const artifact=await person('/api/design-jobs/'+started.job.id+'/layerdoc');assert.equal(artifact.version,'2');assert.ok(artifact.layers.length);
 const inert=await call('campaigns.read',{id:designDraft.campaignId});assert.equal(inert.campaign.state,'draft');assert.equal(inert.revision.state,'draft');
}
