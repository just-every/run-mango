import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {recipients} from './recipient-fixtures.mjs';
import {publicKey} from './sending-key.mjs';
import {nativeHttp,mailAllowance} from './native-http.mjs';
let smsSequence=0;

/** Fresh native intake and scoped API clients for each conformance phase.
 * Only public production doors prepare data; no database rows or authority are
 * fabricated. Source intake retains its separate contacts:write credential.
 */
export default async function({request,origin,cookie,phase,fixtures,mail,database,queues,now}) {
 queues.release();
 const headers={Origin:origin,Cookie:cookie,'Content-Type':'application/json'};
 async function credential(name,scopes) {
  const response=await request(new URL('/api/settings/integrations',origin),{
   method:'POST',headers,body:JSON.stringify({name,scopes}),
  });
  assert.equal(response.status,201,'Native phase credential creation');
  return response.json();
 }
 const http=nativeHttp({request,origin,cookie});
 // Drain work released from the preceding phase before replacing its sender.
 // The new phase then holds only its own due campaign.
 if(phase!=='initial'){
  const db=await database('DB');
  for(let count=0;count<240;count++){
   const active=await db.prepare("SELECT 1 FROM campaigns c JOIN campaign_steps s ON s.revision_id=c.active_revision_id WHERE c.state IN ('scheduled','dispatching') AND s.scheduled_at<=? AND s.send_by_at>? LIMIT 1").bind(Date.now(),Date.now()).first();
   if(!active)break;
   if(count===239)throw Error('Prior native dispatch did not drain before replacing sender settings');
   await new Promise(resolve=>setTimeout(resolve,250));
  }
 }
 const suffix=randomUUID();
 const intake=await credential('Orchard intake '+suffix,['contacts:write']);
 const sender=await credential('Orchard sender '+suffix,['contacts:write','campaigns:send']);
 const reader=await credential('Orchard reader '+suffix,['contacts:read','events:read']);
 const imported=await request(new URL('/api/integrations/v1/contacts',origin),{
  method:'PUT',headers:{Origin:origin,Authorization:'Bearer '+intake.token,'Content-Type':'application/json'},
  body:JSON.stringify({email:'orchard-'+suffix+'@example.test',displayName:'Orchard reader',segmentName:'Orchard phase '+suffix}),
 });
 assert.equal(imported.status,200,'Native source intake creates the phase contact');
 const {contact}=await imported.json();
 assert.equal(contact.emailStatus,'non-subscribed','Source intake never invents recipient permission');
 const values={contact:{id:contact.id},phase:{name:phase}};
 // The unanswered round needs clients only: no native effects need policy yet.
 if(phase!=='initial'){
  fixtures.set('https://api.sendgrid.com',{publicKey});
  await http('/api/settings/sending',undefined,'DELETE');
  async function sourceContact(label){
   return (await http('/api/integrations/v1/contacts',{email:label+'-'+suffix+'@example.test',displayName:'Orchard '+label,segmentName:'Orchard '+label+' '+suffix},'PUT',
    {Authorization:'Bearer '+intake.token})).contact;
  }
  values.erase=await sourceContact('erase');
  values.merge=await sourceContact('merge');
  values.survivor=await sourceContact('survivor');
  const operators=await http('/api/operators');
  const reviewer=operators.operators.find(person=>person.email==='synthetic-mango-reviewer@example.test');
  assert.ok(reviewer,'Native invited reviewer is available');
  await http('/api/operators/'+reviewer.id+'/role',{role:'admin',unmaskedContacts:false},'PUT');
  values.teammate={id:reviewer.id};
  const owner=(await http('/api/operator')).operator;
  values.owner={id:owner.id,email:owner.email};
  values.consent={contact:{email:'consent-'+suffix+'@example.test'},channel:'email',brandOrLegalSender:'Orchard newsletter',
   messageCategory:'newsletter',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'written',
   captureSource:'Disposable recipient sign-up sheet',consentText:'Please send me the weekly orchard newsletter.',
   consentVersion:'v1',occurredAt:new Date().toISOString(),permissionMethod:'written',affirmed:true};
  // Prepare a real public capture with protected network evidence. This does
  // not turn a source record into permission: the recipient is still pending.
  values.protected=await sourceContact('protected');
  const description=await http('/subscribe/info');
  await http('/subscribe',{email:values.protected.email,consent:true,disclosure:description.disclosure},'POST',{'CF-Connecting-IP':'192.0.2.44'});
  const captured=await http('/api/contacts/'+values.protected.id);
  assert.ok(captured.consent.some(item=>item.captureIp==='192.0.2.44'),'Public capture retains actual network evidence');
  await mailAllowance();
  await http('/api/settings/sender/confirmation',{});
  const senderLink=mail.read().flatMap(message=>message.text.match(/https:\/\/[^\s<>]+/g)??[]).map(value=>new URL(value))
   .findLast(url=>url.origin===origin&&url.pathname.startsWith('/sender-check/'));
  assert.ok(senderLink,'Native sender probe reaches the owner');
  const senderConfirmed=await request(senderLink,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'});
  assert.equal(senderConfirmed.status,200);await senderConfirmed.body?.cancel();
  values.connection=await http('/api/settings/sending/review',{apiKey:randomUUID()});
  const sms=await http('/api/contacts/consent',{...values.consent,contact:{email:'sms-'+suffix+'@example.test',phone:'+614'+String(10000000+(++smsSequence))},
   channel:'sms',smsProgram:'News',expressWrittenConsent:true,timeZone:'Australia/Brisbane',
   locationSource:'Recipient supplied address',locationRecordedAt:new Date(Date.now()-60000).toISOString()});
  const messages=(await http('/api/audience/sms-services')).messages;
  const message=messages.find(message=>message.contact_id===sms.contact.id);
  assert.ok(message,'Native SMS capture retains the actual confirmation');
  assert.equal(message.state,'queued');assert.equal(message.reason,'sms-quiet-window');
  values.sms={id:message.id};
  const recipient=await recipients(http,suffix,values.consent);
  const identity=(await http('/api/settings/sender')).identity;
  fixtures.set('https://api.openai.com',{email:recipient.marketing,sender:identity});
  const body='<p>Fresh orchard news for the coming week.</p><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>';
  values.composition={name:'Orchard newsletter',emailSubject:'Fresh orchard news',preheader:'News from our orchard',emailBody:body,
   emailText:'Fresh orchard news. {{physical_address}} Unsubscribe: {{unsubscribe_url}}',senderName:identity.displayName,fromEmail:identity.fromEmail,
   replyToEmail:identity.replyToEmail,physicalAddress:identity.physicalAddress,messageCategory:'newsletter',
   inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'email',comparator:'eq',value:recipient.marketing}]}),
   exclusionRulesJson:'[]',steps:[{channel:'email',timezone:'Etc/UTC',scheduledAt:new Date(Date.now()+86400000).toISOString(),sendByAt:new Date(Date.now()+90000000).toISOString(),whyThisTime:'The owner chose tomorrow for the disposable journey'}]};
  const issued=await http('/api/campaigns',{});
  const due={...values.composition,inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'email',comparator:'eq',value:recipient.publication}]}),name:'Native delivered publication fixture',steps:[{channel:'email',timezone:'Etc/UTC',
   scheduledAt:new Date(Date.now()-1000).toISOString(),sendByAt:new Date(Date.now()+3600000).toISOString(),whyThisTime:'A disposable due delivery'}]};
  await http('/api/campaign-revisions/'+issued.revisionId,due,'PATCH');
  await mailAllowance();
  await http('/api/campaigns/'+issued.campaignId+'/approve',{revisionId:issued.revisionId,idempotencyKey:randomUUID()});
  let delivered;
  for(let count=0;count<240;count++){
   delivered=await http('/api/campaigns/'+issued.campaignId);
   if(delivered.campaign.state==='completed')break;
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.equal(delivered.campaign.state,'completed','The actual native queue completes a provider handoff');
  values.delivered=issued;
  const db=await database('DB');
  await db.prepare('UPDATE recipient_steps SET handed_off_at=?,provider_accepted_at=?,handoff_started_at=? WHERE campaign_id=?')
   .bind(now-7200000,now-7200000,now-7200000,issued.campaignId).run();
  const intakeRecipient=await http('/api/integrations/v1/contacts',{email:recipient.dispatch,segmentName:'Orchard dispatch '+suffix},'PUT',{Authorization:'Bearer '+sender.token});
  const segmentId=intakeRecipient.contact.segmentIds.at(-1);
  const segment=await db.prepare('SELECT inclusion_rule_json,exclusion_rules_json FROM audience_segments WHERE id=?').bind(segmentId).first();
  const dispatch=await http('/api/campaigns',{});
  await http('/api/campaign-revisions/'+dispatch.revisionId,{...values.composition,name:'Native dispatched orchard letter',
   inclusionRuleJson:segment.inclusion_rule_json,exclusionRulesJson:segment.exclusion_rules_json,
   steps:[{channel:'email',timezone:'Etc/UTC',scheduledAt:new Date(Date.now()-1000).toISOString(),sendByAt:new Date(Date.now()+3600000).toISOString(),whyThisTime:'A disposable due native dispatch'}]},'PATCH');
  queues.hold();
  await http('/api/campaigns/'+dispatch.campaignId+'/approve',{revisionId:dispatch.revisionId,idempotencyKey:randomUUID()});
  const step=await db.prepare('SELECT id FROM campaign_steps WHERE revision_id=?').bind(dispatch.revisionId).first();
  values.dispatch={...dispatch,segmentId,stepId:step.id,channel:'email'};
  fixtures.set('https://woo.example.test',{email:recipient.marketing});
  const signingSecret=randomUUID();
  await http('/api/settings/woocommerce',{url:'https://woo.example.test/',key:randomUUID(),secret:randomUUID(),signingSecret,exclusiveSecret:true,pluginEnabled:true},'PUT');
  const connection=await http('/api/settings/woocommerce');
  values.commerce={provider:'woocommerce:'+connection.connection.id};
  const event={version:1,id:randomUUID(),kind:'abandoned_checkout',occurredAt:new Date(Date.now()+30000).toISOString(),
   customerId:'11',checkoutId:randomUUID(),checkoutStartedAt:new Date(Date.now()-3600000).toISOString(),products:['21'],
   consent:{analytics:true,marketing:true},gpc:false};
  const raw=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000));
  const observed=await request(new URL(connection.webhookUrl+'/plugin'),{method:'POST',headers:{'Content-Type':'application/json',
   'X-Mango-Timestamp':timestamp,'X-Mango-Signature':createHmac('sha256',signingSecret).update('mango-plugin-v1\n'+timestamp+'.'+raw).digest('base64')},body:raw});
  assert.equal(observed.status,204,'Native signed checkout intake');await observed.body?.cancel();
  values.checkout={eventId:event.id};
  // Reset through the native settings door so the journey changes all three
  // declared classes in each independent policy phase.
  await http('/api/audience/signup',{settings:undefined,frequencyDisclosure:'Weekly',embedOrigins:['https://orchard.example.test'],challengeEnabled:false,kioskEnabled:false,kioskDeviceLabel:''},'PUT');
 }
 return {values,clients:{sender:{token:sender.token,clientId:sender.credential.id,agent:{id:'integration:'+sender.credential.id,name:sender.credential.name,specialist:'marketer'}},reader:{token:reader.token,clientId:reader.credential.id,
  agent:{id:'integration:'+reader.credential.id,name:reader.credential.name,specialist:'marketer'}}}};
}
