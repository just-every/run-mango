import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID,webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import operations from '../src/core/features/agent-door/operations.ts';
import {runtime,setup} from './base-runtime.mjs';
import {signJws,accessToken,autonomousPolicy,policyEnvelope,seconds} from '../src/vendor/base/agent-door/conformance/crypto.mjs';
import {validateAgentSurface} from '../src/vendor/base/agent-door/conformance/surface.mjs';
import prepareNativePhase from '../tests/agent-door/fixtures.mjs';
import {beforeStep,afterStep} from '../tests/agent-door/native-journey.mjs';
import {agentRuntime} from './agent-runtime.mjs';

test('Mango shared door: signed native owner, durable Business people, native draft custody, policy, replay and role narrowing',async()=>{
 const editor=await runtime(undefined,false,{RER_MANAGEMENT_ORIGIN:'https://editor.example.test',RER_INSTALLATION_ID:'native-editor'});
 try{
  assert.equal((await editor.call('/api/operator')).status,401,'Editor metadata alone permits native startup without granting a session');
  const mcp=await editor.call('/mcp',{method:'POST',headers:{'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/list'},body:{jsonrpc:'2.0',id:1,method:'tools/list',params:{_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}}});
  assert.equal(mcp.status,401,'An unpaired editor installation grants no agent credential');
 }finally{await editor.close();}
 const partial=await runtime(undefined,false,{RER_OWNER_CLAIM_ISSUER:'https://business.example.test',RER_INSTALLATION_ID:'native-editor'});
 try{assert.equal((await partial.call('/api/operator')).status,500,'Explicit partial owner-claim trust remains inadmissible');}
 finally{await partial.close();}
 const origin='https://rer-hosted-check.invalid',issuer='https://business.example.test',installationId=randomUUID(),kid=randomUUID(),sub=randomUUID();
 const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const publicKeys={[kid]:{...await webcrypto.subtle.exportKey('jwk',pair.publicKey),kid,alg:'ES256',use:'sig'}};
 const c={origin,signer:{privateKey:pair.privateKey,kid,issuer,installationId},person:{sub,email:'owner@example.test'},
  agentId:randomUUID(),business:'mango-business',consent:randomUUID(),surface:JSON.parse(await readFile('agent-surface.json','utf8')),
  resourceScopes:['mango.resources.read','mango.witness.read','events:read'],seq:0,revision:0};
 // Trust requires the same public ring as ordinary production settings.
 const trust=JSON.stringify({v:1,issuer,audience:origin,subject:installationId,keys:publicKeys});
 const app=await agentRuntime({
  RER_OWNER_CLAIM_ISSUER:issuer,RER_MANAGEMENT_ORIGIN:issuer,RER_INSTALLATION_ID:installationId,
  RER_OWNER_CLAIM_INSTALLATION_ID:installationId,RER_OWNER_CLAIM_APP_ORIGIN:origin,
  RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify(publicKeys),RER_BUSINESS_TRUST:trust,
 });
 let sequence=0;
 async function mailBudget(){
  const budget=await app.db.prepare('SELECT MAX(next_at) next FROM provider_pacing').first();
  if(Number(budget?.next)>Date.now())await new Promise(resolve=>setTimeout(resolve,Number(budget.next)-Date.now()+1));
 }
 async function mcp(method,params={},overrides={},version='2026-07-28'){
  const token=await accessToken(c,overrides),name=params.name??params.uri;
  const response=await app.call('/mcp',{method:'POST',headers:{Authorization:'Bearer '+token,
   'MCP-Protocol-Version':version,'Mcp-Method':method,...(name?{'Mcp-Name':name}:{})},
   body:{jsonrpc:'2.0',id:++sequence,method,params:{...params,_meta:{"io.modelcontextprotocol/protocolVersion":version}}}});
  return {response,message:await response.json().catch(()=>null)};
 }
 const call=(name,args,overrides={})=>mcp('tools/call',{name,arguments:args},overrides);
 async function adopt(document,extra={}){
  const envelope=await policyEnvelope(c,document,extra),response=await app.call('/api/rer/agent-policy',{method:'POST',body:{policy:envelope.policy}});
  if(response.ok){c.seq=envelope.payload.seq;c.revision=envelope.payload.revision;}
  return {response,value:await response.json()};
 }
 async function settings(rev,team=null){
  const now=seconds(),document={v:1,iss:issuer,aud:origin,sub:installationId,business:c.business,email:c.person.email,
   jti:randomUUID(),iat:now,exp:now+300,rev,owner_id:sub,values:{},logo:null,team};
  return app.call('/api/rer/business-settings',{method:'POST',body:{settings:await signJws(pair.privateKey,kid,'rer-business-settings+jwt',document)}});
 }
 try{
  assert.equal((await app.call('/auth/owner-claim',{method:'POST',body:{token:setup}})).status,403);
  const now=seconds(),claim=await signJws(pair.privateKey,kid,'rer-owner-claim+jwt',{
   v:1,iss:issuer,aud:origin,installationId,email:c.person.email,iat:now,exp:now+300,jti:randomUUID()});
  const claimed=await app.call('/auth/owner-claim',{method:'POST',body:{token:claim,displayName:'Morgan Owner'}});
  assert.equal(claimed.status,303,await claimed.clone().text());
  const cookie=claimed.headers.get('set-cookie').split(';')[0];
  const owner=(await (await app.call('/api/operator',{cookie})).json()).operator;
  const synced=await settings(1);assert.equal(synced.status,200,await synced.clone().text());
  const missing=await call('mango.campaigns.create',{idempotency_key:'unset'});
  assert.ok(missing.message.result,JSON.stringify(missing.message));
  assert.equal(missing.message.result._meta['com.runeditrun/error'].code,'policy_unset');
  assert.equal((await app.db.prepare('SELECT count(*) count FROM campaigns').first()).count,0);
  const adopted=await adopt(autonomousPolicy());assert.equal(adopted.response.status,200);
  assert.deepEqual(Object.keys(adopted.value).sort(),['adopted','door']);
  for(const version of ['2026-07-28','2025-11-25']){
   const listed=await mcp('tools/list',{}, {},version);
   assert.equal(listed.response.status,200);
   assert.equal(listed.message.result.tools.length,operations.length+12);
  }
  const tokenEmail=await call('mango.campaigns.create',{idempotency_key:'foreign'},{sub:'unmapped-person',email:c.person.email});
  assert.equal(tokenEmail.response.status,401);
  const wrongAudience=await call('mango.campaigns.list',{}, {aud:'https://other.example.test/mcp'});
  assert.equal(wrongAudience.response.status,401);
  const created=await call('mango.campaigns.create',{idempotency_key:'draft-one'});
  assert.equal(created.response.status,200,JSON.stringify(created.message));
  assert.equal(created.message.result.isError,false,JSON.stringify(created.message));
  const ids=created.message.result.structuredContent;
  assert.ok(ids.campaignId);
  const replay=await call('mango.campaigns.create',{idempotency_key:'draft-one'});
  assert.deepEqual(replay.message.result.structuredContent,ids);
  assert.equal((await app.db.prepare('SELECT count(*) count FROM campaigns').first()).count,1);
  const changed=await call('mango.campaigns.create',{idempotency_key:'draft-one',composition:{name:'Changed'}});
  assert.equal(changed.message.result._meta['com.runeditrun/error'].code,'idempotency_conflict');
  const native=await app.call('/api/campaigns/'+ids.campaignId,{cookie});
  assert.equal(native.status,200);
  const revision=(await native.json()).revision;assert.equal(revision.state,'draft');
  assert.equal((await app.db.prepare('SELECT actor_type,actor_id FROM campaign_state_transitions WHERE campaign_id=?').bind(ids.campaignId).first()).actor_type,'agent');
  const resource=await mcp('resources/read',{uri:'mango://campaigns/'+ids.campaignId});
  assert.equal(resource.message.error.data.code,'capability_not_declared');
  assert.equal(resource.message.error.data.capability,'resources');
  assert.equal(resource.message.result,undefined);
  for(const [uri,code] of [['mango://campaigns/absent','capability_not_declared'],['mango://unregistered/absent','capability_not_declared']]){
   const refused=await mcp('resources/read',{uri});
   assert.equal(refused.message.error.data.code,code);assert.equal(refused.message.result,undefined);
  }
  const audit=await app.db.prepare("SELECT actor_type,actor_id,detail_json FROM lifecycle_audit_entries WHERE action='mango.campaigns.create'").first();
  assert.equal(audit.actor_type,'agent');assert.equal(audit.actor_id,c.agentId);assert.ok(audit.detail_json.includes('Morgan Owner'));
  // Exercise the declared native draft/segment journey before company-policy negatives.
  await mailBudget();
  assert.equal((await app.call('/auth/step-up',{method:'POST',cookie,body:{action:'credentials:mint'}})).status,202);
  assert.equal((await app.call('/auth/confirm',{method:'POST',cookie,body:{token:await app.token()}})).status,303);
  const fixtureRequest=app.request;
  await app.prepareOwner(cookie);
  const firstPhase=await prepareNativePhase({request:fixtureRequest,origin,cookie,phase:'autonomous',fixtures:app.fixtures,mail:app.mail});
  const phase=await prepareNativePhase({request:fixtureRequest,origin,cookie,phase:'held',fixtures:app.fixtures,mail:app.mail});
  assert.notEqual(firstPhase.values.contact.id,phase.values.contact.id,'Policy phases receive fresh native contacts');
  assert.notEqual(firstPhase.clients.reader.clientId,phase.clients.reader.clientId,'Policy phases receive distinct live native clients');
  const journey=JSON.parse(await readFile('tests/agent-door/journey.json','utf8'));
  const outputs=new Map();
  function resolve(value){
   if(Array.isArray(value))return value.map(resolve);
   if(value&&typeof value==='object'){
    if(value.$from){let found=outputs.get(value.$from);for(const part of value.pointer.split('/').slice(1))found=found?.[part];return found;}
    if(value.$fixture){let found=phase.values[value.$fixture];for(const part of value.pointer.split('/').slice(1))found=found?.[part];return found;}
    return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,resolve(item)]));
   }
   return value;
  }
  for(const step of journey.filter(step=>step.tool!=='mango.events.list')){
   const args=resolve(step.args),definition=c.surface.tools.find(operation=>operation.name===step.tool);
   const inputs={...args,...(definition&&!definition.readOnly?{idempotency_key:'native-journey:'+step.id}:{})};
   await beforeStep({step});
   let response;
   if(step.client){
    const client=phase.clients[step.client];
    const answer=await app.call('/mcp',{method:'POST',headers:{Authorization:'Bearer '+client.token,
     'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/call','Mcp-Name':step.tool},
     body:{jsonrpc:'2.0',id:++sequence,method:'tools/call',params:{name:step.tool,arguments:inputs,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}}});
    response={response:answer,message:await answer.json()};
    const decision=response.message.result?._meta?.['com.runeditrun/decision'];
    const nativeAudit=await app.db.prepare('SELECT row FROM agent_door_audit WHERE id=?').bind(decision?.id).first();
    assert.equal(JSON.parse(nativeAudit.row).agent.id,client.agent.id,'Native client retains its sender identity');
   }else response=await call(step.tool,inputs);
   assert.equal(response.response.status,200,step.id+': MCP HTTP '+response.response.status);
   assert.equal(response.message?.result?.isError,false,step.id+': '+JSON.stringify(response.message));
   if(step.target){
    const audit=await (await app.call('/agents/api/audit',{cookie})).json();
    const decision=response.message.result._meta['com.runeditrun/decision'];
    assert.deepEqual(audit.rows.find(row=>row.id===decision.id)?.resource,resolve(step.target),step.id+' native target');
   }
   outputs.set(step.id,response.message.result.structuredContent);
   await afterStep({request:fixtureRequest,origin,cookie,mail:app.mail,step,args,result:response.message.result.structuredContent});
   console.log('PASS native journey '+step.id);
   if(step.id==='native-campaign-reauthorize'){
    const reapproval=await app.db.prepare("SELECT actor_type,actor_id,detail_json FROM lifecycle_audit_entries WHERE entity_id=? AND action='sender-reapproved' ORDER BY occurred_at DESC LIMIT 1").bind(args.revisionId).first();
    assert.equal(reapproval.actor_type,'agent');assert.equal(reapproval.actor_id,c.agentId);
    assert.equal(JSON.parse(reapproval.detail_json).preparedBy.sponsor.id,owner.id);
    const frozen=await app.db.prepare('SELECT approved_by_operator_id,authorized_by_agent_id,agent_sponsor_id FROM campaign_revisions WHERE id=?').bind(args.revisionId).first();
    assert.equal(frozen.approved_by_operator_id,null);assert.equal(frozen.authorized_by_agent_id,c.agentId);assert.equal(frozen.agent_sponsor_id,owner.id);
   }
  }
  const surface=JSON.parse(await readFile('agent-surface.json','utf8'));
  const declaration=validateAgentSurface(surface,{contract:await readFile('CONTRACT.md','utf8')});
  assert.deepEqual(declaration.points.filter(point=>!point.ok&&point.id.includes('.clause.')),[], 'The landed contract resolves every declared tool and inherited Base clause');
  for(const name of ['mango.access.update','mango.connections.update','mango.signup.update']){
   assert.equal(surface.tools.find(tool=>tool.name===name).sponsorEscalation,false);
   assert.equal(declaration.points.find(point=>point.id==='BASE-AGENT-005.surface.'+name+'.coverage')?.ok,true);
  }
  let nativeCount=(await app.db.prepare('SELECT count(*) count FROM campaigns').first()).count;
  const blockedPolicy={...autonomousPolicy(),rules:[{id:'block',class:'*',do:'blocked'}]};
  assert.equal((await adopt(blockedPolicy)).response.status,200);
  const blocked=await call('mango.campaigns.create',{idempotency_key:'blocked'});
  assert.equal(blocked.message.result._meta['com.runeditrun/error'].code,'policy_blocked');
  const blockedReplay=await call('mango.campaigns.create',{idempotency_key:'draft-one'});
  assert.equal(blockedReplay.message.result._meta['com.runeditrun/error'].code,'policy_blocked');
  assert.equal(blockedReplay.message.result.structuredContent,undefined);
  assert.equal((await app.db.prepare('SELECT count(*) count FROM campaigns').first()).count,nativeCount);
  assert.equal((await adopt(autonomousPolicy(),{paused:true})).response.status,200);
  const paused=await call('mango.campaigns.create',{idempotency_key:'paused'});
  assert.equal(paused.message.result._meta['com.runeditrun/error'].code,'agents_paused');
  const pausedReplay=await call('mango.campaigns.create',{idempotency_key:'draft-one'});
  assert.equal(pausedReplay.message.result._meta['com.runeditrun/error'].code,'agents_paused');
  assert.equal(pausedReplay.message.result.structuredContent,undefined);
  assert.equal((await app.call('/api/campaigns',{cookie})).status,200);
  assert.equal((await adopt(autonomousPolicy())).response.status,200);
  const memberSub=randomUUID();
  await mailBudget();
  const team=await settings(2,[{id:memberSub,email:'teammate@example.test',name:'Casey Marketer',role:'member',invite:1}]);
  assert.equal(team.status,200,await team.clone().text());
  const invited=await app.call('/auth/confirm',{method:'POST',body:{token:await app.token()}});
  assert.equal(invited.status,303,await invited.clone().text());
  let memberCookie=invited.headers.get('set-cookie').split(';')[0];
  const member=(await (await app.call('/api/operator',{cookie:memberCookie})).json()).operator;
  const mapped=await settings(3,[{id:memberSub,email:'teammate@example.test',name:'Casey Marketer',role:'member',invite:1}]);
  assert.equal(mapped.status,200,await mapped.clone().text());
  const memberAgent={sub:randomUUID(),name:'Casey assistant',specialist:'marketer'};
  const memberDraft=await call('mango.campaigns.create',{idempotency_key:'member-before-narrowing'},{sub:memberSub,act:memberAgent});
  assert.equal(memberDraft.message.result?.isError,false,JSON.stringify(memberDraft.message));
  nativeCount=(await app.db.prepare('SELECT count(*) count FROM campaigns').first()).count;
  const narrowing=await call('mango.access.update',{id:member.id,role:'support',unmaskedContacts:false,idempotency_key:'narrow-teammate'});
  assert.equal(narrowing.message.result.isError,false,JSON.stringify(narrowing.message));
  assert.equal((await app.db.prepare('SELECT role FROM operator_product_roles WHERE operator_id=?').bind(member.id).first()).role,'support');
  const narrowedReplay=await call('mango.campaigns.create',{idempotency_key:'member-before-narrowing'},{sub:memberSub,act:memberAgent});
  assert.equal(narrowedReplay.message.result._meta['com.runeditrun/error'].code,'role_forbidden');
  assert.equal(narrowedReplay.message.result.structuredContent,undefined);
  for(const id of [ids.campaignId,'absent']){
   const hidden=await mcp('resources/read',{uri:'mango://campaigns/'+id},{sub:memberSub,act:memberAgent});
   assert.equal(hidden.message.error.data.code,'capability_not_declared');assert.equal(hidden.message.result,undefined);
  }
  const renamed=await app.call('/auth/email',{method:'POST',cookie:memberCookie,body:{email:'casey-renamed@example.test'}});
  assert.equal(renamed.status,200,await renamed.clone().text());
  await mailBudget();
  assert.equal((await app.call('/auth/step-up',{method:'POST',cookie,body:{action:'credentials:mint'}})).status,202);
  assert.equal((await app.call('/auth/confirm',{method:'POST',cookie,body:{token:await app.token()}})).status,303);
  await mailBudget();
  const replacementInvite=await app.call('/api/operators',{method:'POST',cookie,body:{email:'teammate@example.test'}});
  assert.equal(replacementInvite.status,201,await replacementInvite.clone().text());
  const replacementConfirmed=await app.call('/auth/confirm',{method:'POST',body:{token:await app.token()}});
  assert.equal(replacementConfirmed.status,303,await replacementConfirmed.clone().text());
  const replacementCookie=replacementConfirmed.headers.get('set-cookie').split(';')[0];
  const replacement=(await (await app.call('/api/operator',{cookie:replacementCookie})).json()).operator;
  assert.notEqual(replacement.id,member.id);
  const promotedRoster=await settings(4,[{id:memberSub,email:'teammate@example.test',name:'Casey Marketer',role:'admin',invite:1}]);
  assert.equal(promotedRoster.status,200,await promotedRoster.clone().text());
  assert.equal((await app.db.prepare('SELECT role FROM oa_operators WHERE id=?').bind(member.id).first()).role,'admin');
  assert.equal((await app.db.prepare('SELECT operator_id FROM bs_team WHERE business_id=?').bind(memberSub).first()).operator_id,member.id);
  assert.equal((await app.db.prepare('SELECT email FROM oa_operators WHERE id=?').bind(member.id).first()).email,'casey-renamed@example.test');
  assert.equal((await app.db.prepare('SELECT role FROM operator_product_roles WHERE operator_id=?').bind(member.id).first()).role,'support','Business policy editor does not override a narrower native product role');
  const witness=await call('mango.witness.read',{});
  assert.equal(witness.message.result.isError,false,JSON.stringify(witness.message));
  assert.ok(witness.message.result.structuredContent.objects.campaign_revisions);
  assert.ok(witness.message.result.structuredContent.objects.campaign_revision_candidates,'Frozen audience custody belongs in the witness');
  const denied=await call('mango.campaigns.create',{idempotency_key:'member-draft'},{sub:memberSub,email:c.person.email,act:{sub:randomUUID(),name:'Casey assistant',specialist:'marketer'}});
  assert.ok(denied.message.result,JSON.stringify(denied.message));
  assert.equal(denied.message.result._meta['com.runeditrun/error'].code,'role_forbidden',JSON.stringify(denied.message));
  assert.equal((await app.db.prepare('SELECT count(*) count FROM campaigns').first()).count,nativeCount);
  assert.equal((await adopt({...autonomousPolicy(),rules:[{id:'hold',class:'*',do:'approval',approver:['sponsor'],wait:'PT1H'}]})).response.status,200);
  const heldReplay=await call('mango.campaigns.create',{idempotency_key:'draft-one'});
  assert.equal(heldReplay.message.result._meta['com.runeditrun/error'].code,'approval_required');
  assert.equal(heldReplay.message.result.structuredContent,undefined);
  const heldCount=(await app.db.prepare('SELECT count(*) count FROM agent_door_approvals').first()).count;
  const forbiddenHeld=await call('mango.campaigns.create',{idempotency_key:'no-unauthorized-approval'},{sub:memberSub,act:{sub:randomUUID(),name:'Casey assistant',specialist:'marketer'}});
  assert.equal(forbiddenHeld.message.result._meta['com.runeditrun/error'].code,'role_forbidden');
  assert.equal((await app.db.prepare('SELECT count(*) count FROM agent_door_approvals').first()).count,heldCount);
  assert.equal((await adopt(autonomousPolicy())).response.status,200);
  const keyResponse=await app.call('/api/settings/integrations',{method:'POST',cookie,body:{name:'Scoped orchard reader',scopes:['contacts:read']}});
  assert.equal(keyResponse.status,201,await keyResponse.clone().text());
  const key=await keyResponse.json(),keyHeaders={Authorization:'Bearer '+key.token};
  const clientRead=await app.call('/api/integrations/v1/contacts',{headers:keyHeaders});
  assert.equal(clientRead.status,200,await clientRead.clone().text());
  assert.ok(await app.db.prepare("SELECT 1 FROM agent_door_audit WHERE agent=? AND json_extract(row,'$.tool')='mango.integrations.contacts'").bind('integration:'+key.credential.id).first());
  assert.equal((await app.call('/api/integrations/v1/events',{headers:keyHeaders})).status,403,'A read credential keeps its original contacts-only scope');
  assert.equal((await adopt(blockedPolicy)).response.status,200);
  const clientBlocked=await app.call('/api/integrations/v1/contacts',{headers:keyHeaders});
  assert.equal(clientBlocked.status,409);assert.equal((await clientBlocked.json()).error,'policy_blocked');
  assert.equal((await adopt(autonomousPolicy(),{paused:true})).response.status,200);
  const clientPaused=await app.call('/api/integrations/v1/contacts',{headers:keyHeaders});
  assert.equal((await clientPaused.json()).error,'agents_paused');
  assert.equal((await app.call('/api/settings/integrations/'+key.credential.id,{method:'DELETE',cookie})).status,200);
  assert.equal((await app.call('/api/integrations/v1/contacts',{headers:keyHeaders})).status,401);
  assert.equal((await adopt(autonomousPolicy())).response.status,200);
  assert.equal((await app.call('/api/settings/opt-in/hosted',{method:'PUT',cookie,body:{mode:'single'}})).status,200);
  const disclosure=await (await app.call('/subscribe/info')).json();
  const signup=await app.call('/subscribe',{method:'POST',body:{email:'protected@example.test',displayName:'Protected reader',consent:true,disclosure:disclosure.disclosure}});
  assert.equal(signup.status,202,await signup.clone().text());
  const protectedContact=await app.db.prepare("SELECT id FROM contacts WHERE email='protected@example.test'").first();assert.ok(protectedContact);
  assert.equal((await app.call('/api/operators/'+member.id+'/role',{method:'PUT',cookie,body:{role:'analyst',unmaskedContacts:true}})).status,200);
  const analyst={sub:memberSub,act:{sub:randomUUID(),name:'Evidence assistant',specialist:'marketer'}};
  const protectedRead=await call('mango.contacts.read',{id:protectedContact.id},analyst);
  assert.equal(protectedRead.message.result.isError,false,JSON.stringify(protectedRead.message));
  assert.deepEqual(protectedRead.message.result._meta['com.runeditrun/decision'].classes.map(item=>item.class),['sensitive']);
  assert.equal(protectedRead.message.result.structuredContent.consent[0].captureIp,'192.0.2.1');
  assert.equal((await adopt({...autonomousPolicy(),rules:[{id:'all',class:'*',do:'autonomous'},{id:'no-protected-reads',class:'sensitive',do:'blocked'}]})).response.status,200);
  const protectedBlocked=await call('mango.contacts.read',{id:protectedContact.id},analyst);
  assert.equal(protectedBlocked.message.result._meta['com.runeditrun/error'].code,'policy_blocked');
  assert.equal((await adopt(autonomousPolicy())).response.status,200);
  assert.equal((await app.call('/api/settings/opt-in/manual',{method:'PUT',cookie,body:{mode:'single'}})).status,200);
  const consentArgs={channel:'email',brandOrLegalSender:'Example',messageCategory:'newsletter',frequencyDisclosure:'Monthly',destinationJurisdiction:'AU',captureMethod:'operator-entry',captureSource:'Claimed verbal permission',consentText:'Send me the newsletter.',consentVersion:'v1',contact:{email:'unproven@example.test'},occurredAt:new Date().toISOString(),permissionMethod:'written',affirmed:true,idempotency_key:'no-person-attestation'};
  const fabricated=await call('mango.contacts.consent',consentArgs);
  assert.equal(fabricated.message.result._meta['com.runeditrun/error'].code,'native_consent_proof_required');
  assert.equal(await app.db.prepare("SELECT id FROM contacts WHERE email='unproven@example.test'").first(),null);
  assert.equal((await app.call('/api/settings/opt-in/manual',{method:'PUT',cookie,body:{mode:'double'}})).status,200);
  await mailBudget();
  const recorded=await call('mango.contacts.consent',{...consentArgs,contact:{email:'awaiting-permission@example.test'},idempotency_key:'recipient-must-confirm'});
  assert.equal(recorded.message.result.isError,false,JSON.stringify(recorded.message));
  assert.equal(recorded.message.result.structuredContent.confirmationRequired,true);
  assert.equal(recorded.message.result.structuredContent.contact.emailStatus,'pending');
  assert.ok(recorded.message.result.structuredContent.evidence.captureSource.startsWith('Agent door conformance for Morgan Owner|'));
  assert.equal((await app.call('/api/operators/'+member.id+'/role',{method:'PUT',cookie,body:{role:'admin',unmaskedContacts:false}})).status,200);
  await mailBudget();
  assert.equal((await app.call('/auth/magic-link',{method:'POST',body:{email:'casey-renamed@example.test'}})).status,202);
  const renewed=await app.call('/auth/confirm',{method:'POST',body:{token:await app.token()}});assert.equal(renewed.status,303);
  memberCookie=renewed.headers.get('set-cookie').split(';')[0];
  const sponsoredKeyResponse=await app.call('/api/settings/integrations',{method:'POST',cookie:memberCookie,body:{name:'Casey scoped reader',scopes:['contacts:read']}});
  assert.equal(sponsoredKeyResponse.status,201);const sponsoredKey=await sponsoredKeyResponse.json();
  assert.equal((await app.call('/api/operators/'+member.id,{method:'DELETE',cookie})).status,204);
  assert.equal((await app.call('/api/integrations/v1/contacts',{headers:{Authorization:'Bearer '+sponsoredKey.token}})).status,401);
  const inactive=await call('mango.campaigns.list',{},analyst);assert.equal(inactive.response.status,401);
  assert.equal(owner.role,'owner');
 }finally{await app.close();}
});
