import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {sqlStatements} from '../operations/sql-statements.mjs';
import {createApp} from '../src/core/app/app';
import {composeFixture} from './sender-verification/test-runtime';
import {nativeToolSpecs} from '../src/core/features/agent-door/catalogue';
import {autonomousPolicy,heldPolicy,policyEnvelope,signJws} from '../src/vendor/base/agent-door/conformance/crypto.mjs';

const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');

test('Mango agent door: signed native owner, durable Business person, policy-decided draft and sponsor revocation',async()=>{
 const worker=new Miniflare({workers:[{config:{name:'mango-agent-native',type:'worker',compatibilityDate:'2026-09-08',
  manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:'export default {fetch(){return new Response("unused binding host")}}'}}},
  env:{DB:{type:'d1',id:crypto.randomUUID()}}}}]});
 let fixture:ReturnType<typeof composeFixture>|undefined;
 try{
  const db=await worker.getD1Database('DB');
  const migrations=await Promise.all((await readdir('migrations/core')).filter(name=>name.endsWith('.sql')).sort().map(file=>readFile(`migrations/core/${file}`,'utf8')));
  const statements=migrations.flatMap(source=>sqlStatements(source));
  for(let offset=0;offset<statements.length;offset+=50)await db.batch(statements.slice(offset,offset+50).map(sql=>db.prepare(sql)));
  const origin='https://mango.example.test',issuer='https://business.example.invalid',installationId=crypto.randomUUID(),sub=crypto.randomUUID(),memberSub=crypto.randomUUID();
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const kid=crypto.randomUUID(),key=await crypto.subtle.exportKey('jwk',pair.publicKey),publicKeys={[kid]:key};
  fixture=composeFixture(db,false);
  const bindings={...fixture.bindings,DB:db,LOCAL_BOOTSTRAP_TOKEN:'synthetic-task-native-agent-secret',MANGO_PUBLIC_BASE_URL:origin,
   RER_OWNER_CLAIM_ISSUER:issuer,RER_MANAGEMENT_ORIGIN:issuer,RER_INSTALLATION_ID:installationId,RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify(publicKeys),
   RER_BUSINESS_TRUST:JSON.stringify({v:1,issuer,audience:origin,subject:installationId,email:'owner@example.test',keys:publicKeys})} as never;
  const platform=fixture.platform;
  platform.config.authSetupToken='synthetic-native-claim-setup-at-least-thirty-two-bytes';
  platform.config.initialOperatorEmails=['owner@example.test'];platform.config.publicBaseUrl=new URL(origin);
  const app=createApp(bindings,platform);
  const request=(path:string,init:RequestInit={})=>app.fetch(new Request(origin+path,{...init,headers:{Origin:origin,Host:new URL(origin).host,'CF-Connecting-IP':'192.0.2.31',...Object.fromEntries(new Headers(init.headers))}}));
  const now=Math.floor(Date.now()/1000);
  const claim=await signJws(pair.privateKey,kid,'rer-owner-claim+jwt',{v:1,iss:issuer,aud:origin,installationId,email:'owner@example.test',jti:crypto.randomUUID(),iat:now,exp:now+300});
  const claimed=await request('/auth/owner-claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:claim,displayName:'Jordan Orchard',returnTo:'/app'})});
  expect(claimed.status,claimed.status===303?'':await claimed.clone().text()).toBe(303);const cookie=claimed.headers.get('Set-Cookie')!.split(';')[0];
  const operator=await app.mangoServices.authService.authenticate(new Request(origin+'/api/operator',{headers:{Host:new URL(origin).host,Cookie:cookie}}));
  expect(operator).toBeTruthy();
  const settings=await signJws(pair.privateKey,kid,'rer-business-settings+jwt',{v:1,iss:issuer,aud:origin,sub:installationId,business:'orchard',email:'owner@example.test',jti:crypto.randomUUID(),iat:now,exp:now+3600,rev:1,values:{display_name:'Orchard Studio'},logo:null,team:[{id:memberSub,email:'casey@example.test',name:'Casey Grove',role:'admin',invite:1}],owner_id:sub});
  const adopted=await request('/api/rer/business-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings})});
  expect(adopted.status).toBe(200);
  const invitation=fixture.outbound.find(item=>JSON.stringify(item.to).includes('casey@example.test'));
  const invitationLink=JSON.stringify(invitation).match(/https:[^\s"<>\\]+\/auth\/confirm\?token=[^\s"<>\\]+/);
  expect(invitationLink,'Signed team settings must issue the ordinary native invitation').toBeTruthy();
  const inviteToken=new URL(invitationLink![0]).searchParams.get('token');
  const joined=await request('/auth/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:inviteToken})});
  expect(joined.status,String((await joined.clone().json().catch(()=>({}))).error??'native invitation confirmation')).toBe(303);
  const memberCookie=joined.headers.get('Set-Cookie')!.split(';')[0];
  const teammate=await app.mangoServices.authService.authenticate(new Request(origin+'/api/operator',{headers:{Host:new URL(origin).host,'CF-Connecting-IP':'192.0.2.31',Cookie:memberCookie}}));
  expect(teammate?.displayName).toBe('Casey Grove');expect(teammate?.id).not.toBe(operator!.id);expect(teammate?.role).toBe('admin');
  expect((await db.prepare('SELECT operator_id FROM bs_team WHERE business_id=?').bind(memberSub).first()).operator_id).toBe(teammate!.id);
  const scopes=[...new Set([...nativeToolSpecs.map(tool=>tool.scope),'events:read'])];
  const signer={issuer,installationId,kid,privateKey:pair.privateKey,publicKeys};
  const claims={iss:issuer,aud:origin+'/mcp',sub,email:'owner@example.test',act:{sub:'orchard-marketer',name:'Rowan',specialist:'marketer'},client_id:'orchard-client',business:'orchard',scope:scopes.join(' '),consent:'orchard-consent',iat:now,exp:now+300,jti:crypto.randomUUID()};
  const token=await signJws(pair.privateKey,kid,'at+jwt',claims);
  let sequence=0;
  async function mcp(method:string,params:unknown,access=token,version='2026-07-28'){
   const response=await request('/mcp',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json','MCP-Protocol-Version':version,'Mcp-Method':method,'Mcp-Name':(params as {name?:string}).name??''},body:JSON.stringify({jsonrpc:'2.0',id:++sequence,method,params:{...(params as Record<string,unknown>),_meta:{'io.modelcontextprotocol/protocolVersion':version}}})});
   return {status:response.status,body:await response.json() as any};
  }
  const call=(name:string,args:unknown)=>mcp('tools/call',{name,arguments:args});
  for(const version of ['2026-07-28','2025-11-25']){
   expect((await mcp('initialize',{protocolVersion:version,capabilities:{},clientInfo:{name:'Orchard client',version:'1'}},token,version)).body.result.protocolVersion).toBe(version);
   expect((await mcp('server/discover',{},token,version)).body.result.supportedVersions).toContain(version);
  }
  const metadata=await request('/.well-known/oauth-protected-resource/mcp');expect(metadata.status).toBe(200);expect((await metadata.json() as any).resource).toBe(origin+'/mcp');
  for(const overrides of [{aud:'https://another.invalid/mcp'},{sub:crypto.randomUUID()}]){
   const invalid=await signJws(pair.privateKey,kid,'at+jwt',{...claims,...overrides});
   expect((await mcp('tools/call',{name:'mango.campaigns.create',arguments:{mode:'blank',idempotency_key:'unmapped'}},invalid)).status).toBe(401);
  }
  const unset=await call('mango.campaigns.create',{mode:'blank',idempotency_key:'unset-draft'});
  expect(unset.body.result._meta['com.runeditrun/error'].code).toBe('policy_unset');
  expect((await db.prepare('SELECT count(*) AS n FROM campaigns').first()).n).toBe(0);
  async function policy(document:unknown,seq:number,revoked?:{agents?:string[];consents?:string[]}){
   const signed=await policyEnvelope({signer,origin,business:'orchard',revision:seq-1,seq:seq-1},document,{revoked});
   const response=await request('/api/rer/agent-policy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({policy:signed.policy})});
   expect(response.status).toBe(200);const ack=await response.json() as any;expect(Object.keys(ack).sort()).toEqual(['adopted','door']);
  }
  await policy(autonomousPolicy(),1);
  const memberToken=await signJws(pair.privateKey,kid,'at+jwt',{...claims,sub:memberSub,email:'owner@example.test',act:{sub:'casey-marketer',name:'Finch',specialist:'marketer'}});
  const memberRead=await mcp('tools/call',{name:'mango.campaigns.list',arguments:{}},memberToken);
  expect(memberRead.status).toBe(200);expect(memberRead.body.result.isError).not.toBe(true);
  const selfWiden=await mcp('tools/call',{name:'mango.access.update',arguments:{id:teammate!.id,role:'owner',unmaskedContacts:true,idempotency_key:'casey-self-widen'}},memberToken);
  expect(selfWiden.body.result._meta['com.runeditrun/error'].code).toBe('self_escalation');
  expect((await app.mangoServices.authService.operatorById(teammate!.id))?.role).toBe('admin');
  const narrowed=await call('mango.access.update',{id:teammate!.id,role:'author',unmaskedContacts:false,idempotency_key:'casey-narrow'});
  expect(narrowed.body.result.isError,JSON.stringify(narrowed.body.result._meta)).not.toBe(true);
  expect(narrowed.body.result._meta['com.runeditrun/decision'].classes).toContainEqual(expect.objectContaining({class:'access',facts:expect.objectContaining({direction:'narrows'})}));
  expect((await mcp('tools/call',{name:'mango.reports.read',arguments:{}},memberToken)).status).toBe(403);
  const initial=await mcp('tools/list',{});expect(initial.status).toBe(200);
  expect(initial.body.result.tools.map((tool:any)=>tool.name)).toEqual([...nativeToolSpecs.map(tool=>tool.name),'mango.events.list'].sort());

  const first=await call('mango.campaigns.create',{mode:'blank',idempotency_key:'one-draft'});
  expect(first.body.result.isError).not.toBe(true);
  const repeated=await call('mango.campaigns.create',{mode:'blank',idempotency_key:'one-draft'});
  expect(repeated.body.result.structuredContent).toEqual(first.body.result.structuredContent);
  expect((await db.prepare('SELECT count(*) AS n FROM campaigns').first()).n).toBe(1);
  const conflict=await call('mango.campaigns.create',{composition:{name:'Different'},idempotency_key:'one-draft'});
  expect(conflict.body.result._meta['com.runeditrun/error'].code).toBe('idempotency_conflict');
  const stale=await call('mango.campaigns.update',{id:first.body.result.structuredContent.revisionId,name:'Stale change',expected_revision:'an-older-native-revision',idempotency_key:'stale-draft'});
  expect(stale.body.result._meta['com.runeditrun/error'].code).toBe('revision_conflict');
  const external=await call('mango.campaigns.authorize',{id:first.body.result.structuredContent.campaignId,revisionId:first.body.result.structuredContent.revisionId,idempotency_key:'unready-newsletter'});
  expect(external.body.result.isError).toBe(true);
  expect((await db.prepare('SELECT count(*) AS n FROM recipient_steps').first()).n).toBe(0);
  const activity=await db.prepare("SELECT actor_type,actor_id,detail_json FROM lifecycle_audit_entries WHERE action='mango.campaigns.create'").first();
  expect(activity.actor_type).toBe('agent');expect(activity.actor_id).toBe('orchard-marketer');expect(JSON.parse(activity.detail_json).preparedBy.label).toBe('Rowan for Jordan Orchard');
  // The sender verifier and mailer are production services. Only DNS, Resend
  // and the authenticated receiver are the existing paid/network test edges.
  await fixture.prove();
  const people=[];
  for(const name of ['Avery','Sage']){
   const email=name.toLowerCase()+'@example.test';
   const captured=await request('/api/contacts/consent',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({contact:{email,displayName:name},channel:'email',brandOrLegalSender:'Mango',messageCategory:'offers',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'written',captureSource:'Native specialist fixture',consentText:'I request the Orchard weekly newsletter.',consentVersion:'v1',occurredAt:new Date(Date.now()-1000).toISOString(),permissionMethod:'written',affirmed:true})});
   expect(captured.status).toBe(201);
   const capturedBody=await captured.json() as any;people.push(capturedBody.contact.id);
   const message=fixture.outbound.findLast(item=>JSON.stringify(item.to).includes(email));
   const match=JSON.stringify(message).match(/https:[^\s"<>\\]+\/consent\/confirm\/[^\s"<>\\]+/);
   expect(match,'Native confirmation mail must contain its real public confirmation link').toBeTruthy();
   const confirmation=new URL(match![0]);
   expect((await request(confirmation.pathname+confirmation.search,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:true})})).status).toBe(200);
  }
  const campaign=first.body.result.structuredContent;
  const saved=await call('mango.campaigns.update',{id:campaign.revisionId,name:'Orchard weekly harvest',emailSubject:'This week at the orchard',preheader:'The weekly harvest is ready',emailBody:'<p>Our weekly harvest is ready.</p><p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>',emailText:'Our weekly harvest is ready. {{physical_address}} Unsubscribe: {{unsubscribe_url}}',senderName:'Mango',fromEmail:'offers@example.test',replyToEmail:'reply@example.test',physicalAddress:'1 Test Street',messageCategory:'offers',inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'}]}),exclusionRulesJson:'[]',steps:[{channel:'email',timezone:'UTC',scheduledAt:new Date(Date.now()-1000).toISOString(),sendByAt:new Date(Date.now()+3600000).toISOString(),whyThisTime:'Send this test newsletter now'}],idempotency_key:'newsletter-save'});
  expect(saved.body.result.isError,JSON.stringify(saved.body.result._meta)).not.toBe(true);
  const checked=await call('mango.campaigns.checks_refresh',{id:campaign.campaignId,revisionId:campaign.revisionId,idempotency_key:'newsletter-check'});
  expect(checked.body.result.isError,JSON.stringify(checked.body.result._meta)).not.toBe(true);
  expect(checked.body.result.structuredContent.blockers).toEqual([]);
  const authorized=await call('mango.campaigns.authorize',{id:campaign.campaignId,revisionId:campaign.revisionId,idempotency_key:'newsletter-authorize'});
  expect(authorized.body.result.isError,JSON.stringify(authorized.body.result._meta)).not.toBe(true);
  expect((await call('mango.campaigns.authorize',{id:campaign.campaignId,revisionId:campaign.revisionId,idempotency_key:'newsletter-authorize'})).body.result.structuredContent).toEqual(authorized.body.result.structuredContent);
  expect((await request('/api/contacts/'+people[0]+'/opt-out',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({channel:'email'})})).ok).toBe(true);
  const step=await db.prepare('SELECT id FROM campaign_steps WHERE revision_id=?').bind(campaign.revisionId).first();
  expect((await call('mango.delivery.prepare',{id:step.id,revisionId:campaign.revisionId,idempotency_key:'newsletter-begin'})).body.result.isError).not.toBe(true);
  const recipients=(await db.prepare('SELECT id,contact_id FROM recipient_steps WHERE campaign_id=?').bind(campaign.campaignId).all()).results;
  const beforeDelivery=fixture.outbound.length;
  for(const recipient of recipients){
   const sent=await call('mango.delivery.dispatch',{id:recipient.id,idempotency_key:'newsletter-delivery-'+recipient.id});
   expect(sent.body.result,JSON.stringify(sent.body)).toBeTruthy();
   expect(sent.body.result.isError,JSON.stringify(sent.body.result._meta)).not.toBe(true);
   expect((await call('mango.delivery.dispatch',{id:recipient.id,idempotency_key:'newsletter-delivery-'+recipient.id})).body.result.structuredContent).toEqual(sent.body.result.structuredContent);
  }
  expect(fixture.outbound.length-beforeDelivery).toBe(1);
  expect(JSON.stringify(fixture.outbound.at(-1))).toContain('Rowan for Jordan Orchard');
  const recipientTruth=(await db.prepare('SELECT contact_id,transport_disposition,skip_reason,attempt_count FROM recipient_steps WHERE campaign_id=?').bind(campaign.campaignId).all()).results;
  expect(recipientTruth.find(row=>row.contact_id===people[0])?.transport_disposition).toBe('skipped');
  expect(recipientTruth.find(row=>row.contact_id===people[1])?.attempt_count).toBe(1);
  await policy(heldPolicy(),2);
  const pending=await call('mango.campaigns.create',{mode:'blank',idempotency_key:'held-draft'});
  expect(pending.body.result.structuredContent).toBeTruthy();
  const reviewed=await call('mango.campaigns.update',{id:pending.body.result.structuredContent.revisionId,name:'A reviewable private draft',idempotency_key:'reviewed-edit'});
  expect(reviewed.body.result.isError).not.toBe(true);
  const review=reviewed.body.result._meta['com.runeditrun/review'];expect(review.id).toBeTruthy();
  const undone=await request('/agents/api/reviews/'+review.id+'/undo',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{}'});
  expect(undone.status,await undone.clone().text()).toBe(200);
  expect((await db.prepare('SELECT name FROM campaign_revisions WHERE id=?').bind(pending.body.result.structuredContent.revisionId).first()).name).toBe('Untitled campaign');
  const undoActor=await db.prepare("SELECT actor_type,actor_id,detail_json FROM lifecycle_audit_entries WHERE action='campaign.draft.undo'").first();
  expect(undoActor.actor_type).toBe('operator');expect(undoActor.actor_id).toBe(operator!.id);expect(JSON.parse(undoActor.detail_json).preparedBy).toBeUndefined();
  // Current native authority is re-read, including retained-key retries.
  await policy(autonomousPolicy(),3,{agents:['orchard-marketer'],consents:[]});
  expect((await call('mango.campaigns.create',{mode:'blank',idempotency_key:'one-draft'})).status).toBe(401);
 }finally{await fixture?.dispose();await worker.dispose();}
});
