import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID,webcrypto} from 'node:crypto';
import operations from '../src/core/features/agent-door/operations.ts';
import {runtime,setup} from './base-runtime.mjs';
import {signJws,accessToken,autonomousPolicy,policyEnvelope,seconds} from '../src/vendor/base/agent-door/conformance/crypto.mjs';

test('Mango shared door: signed native owner, durable Business people, native draft custody, policy, replay and role narrowing',async()=>{
 const origin='https://mango.example.test',issuer='https://business.example.test',installationId=randomUUID(),kid=randomUUID(),sub=randomUUID();
 const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const publicKeys={[kid]:{...await webcrypto.subtle.exportKey('jwk',pair.publicKey),kid,alg:'ES256',use:'sig'}};
 const c={origin,signer:{privateKey:pair.privateKey,kid,issuer,installationId},person:{sub,email:'owner@example.test'},
  agentId:randomUUID(),business:'mango-business',consent:randomUUID(),surface:{specialist:'marketer',tools:operations.map(o=>({scope:o.name}))},
  resourceScopes:['mango.resources.read','mango.witness.read','events:read'],seq:0,revision:0};
 // Trust requires the same public ring as ordinary production settings.
 const trust=JSON.stringify({v:1,issuer,audience:origin,subject:installationId,keys:publicKeys});
 const app=await runtime(undefined,false,{
  RER_OWNER_CLAIM_ISSUER:issuer,RER_MANAGEMENT_ORIGIN:issuer,RER_INSTALLATION_ID:installationId,
  RER_OWNER_CLAIM_INSTALLATION_ID:installationId,RER_OWNER_CLAIM_APP_ORIGIN:origin,
  RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify(publicKeys),RER_BUSINESS_TRUST:trust,
 });
 let sequence=0;
 async function mcp(method,params={},overrides={},version='2026-07-28'){
  const token=await accessToken(c,overrides),name=params.name??params.uri;
  const response=await app.call('/mcp',{method:'POST',headers:{Authorization:'Bearer '+token,
   'MCP-Protocol-Version':version,'Mcp-Method':method,...(name?{'Mcp-Name':name}:{})},
   body:{jsonrpc:'2.0',id:++sequence,method,params:{...params,_meta:{"io.modelcontextprotocol/protocolVersion":version}}}});
  return {response,message:await response.json()};
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
   assert.equal(listed.message.result.tools.length,operations.length+8);
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
  assert.ok(resource.message.result.contents[0].text.includes(ids.revisionId),JSON.stringify(resource.message));
  const audit=await app.db.prepare("SELECT actor_type,actor_id,detail_json FROM lifecycle_audit_entries WHERE action='mango.campaigns.create'").first();
  assert.equal(audit.actor_type,'agent');assert.equal(audit.actor_id,c.agentId);assert.ok(audit.detail_json.includes('Morgan Owner'));
  const blockedPolicy={...autonomousPolicy(),rules:[{id:'block',class:'*',do:'blocked'}]};
  assert.equal((await adopt(blockedPolicy)).response.status,200);
  const blocked=await call('mango.campaigns.create',{idempotency_key:'blocked'});
  assert.equal(blocked.message.result._meta['com.runeditrun/error'].code,'policy_blocked');
  assert.equal((await app.db.prepare('SELECT count(*) count FROM campaigns').first()).count,1);
  assert.equal((await adopt(autonomousPolicy(),{paused:true})).response.status,200);
  const paused=await call('mango.campaigns.create',{idempotency_key:'paused'});
  assert.equal(paused.message.result._meta['com.runeditrun/error'].code,'agents_paused');
  assert.equal((await app.call('/api/campaigns',{cookie})).status,200);
  assert.equal((await adopt(autonomousPolicy())).response.status,200);
  const memberSub=randomUUID();
  const team=await settings(2,[{id:memberSub,email:'teammate@example.test',name:'Casey Marketer',role:'member',invite:1}]);
  assert.equal(team.status,200,await team.clone().text());
  const invited=await app.call('/auth/confirm',{method:'POST',body:{token:await app.token()}});
  assert.equal(invited.status,303,await invited.clone().text());
  const memberCookie=invited.headers.get('set-cookie').split(';')[0];
  const member=(await (await app.call('/api/operator',{cookie:memberCookie})).json()).operator;
  const narrowing=await app.call('/api/operators/'+member.id+'/role',{method:'PUT',cookie,body:{role:'support',unmaskedContacts:false}});
  assert.equal(narrowing.status,200,await narrowing.clone().text());
  const denied=await call('mango.campaigns.create',{idempotency_key:'member-draft'},{sub:memberSub,email:c.person.email,act:{sub:randomUUID(),name:'Casey assistant',specialist:'marketer'}});
  assert.ok(denied.message.result,JSON.stringify(denied.message));
  assert.equal(denied.message.result._meta['com.runeditrun/error'].code,'role_forbidden',JSON.stringify(denied.message));
  assert.equal((await app.db.prepare('SELECT count(*) count FROM campaigns').first()).count,1);
  assert.equal(owner.role,'owner');
 }finally{await app.close();}
});
