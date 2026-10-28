import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {sqlStatements} from '../operations/sql-statements.mjs';
import {createApp} from '../src/core/app/app';
import {createFixturePlatform} from './support/local-platform';
import {nativeToolSpecs} from '../src/core/features/agent-door/catalogue';
import {autonomousPolicy,heldPolicy,policyEnvelope,signJws} from '../src/vendor/base/agent-door/conformance/crypto.mjs';

const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');

test('Mango agent door: signed native owner, durable Business person, policy-decided draft and sponsor revocation',async()=>{
 const worker=new Miniflare({workers:[{config:{name:'mango-agent-native',type:'worker',compatibilityDate:'2026-09-08',
  manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:'export default {fetch(){return new Response("unused binding host")}}'}}},
  env:{DB:{type:'d1',id:crypto.randomUUID()}}}}]});
 try{
  const db=await worker.getD1Database('DB');
  for(const file of(await readdir('migrations/core')).filter(name=>name.endsWith('.sql')).sort())
   await db.batch(sqlStatements(await readFile(`migrations/core/${file}`,'utf8')).map(sql=>db.prepare(sql)));
  const origin='http://127.0.0.1:8787',issuer='https://business.example.invalid',installationId=crypto.randomUUID(),sub=crypto.randomUUID();
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const kid=crypto.randomUUID(),key=await crypto.subtle.exportKey('jwk',pair.publicKey),publicKeys={[kid]:key};
  const bindings={DB:db,LOCAL_BOOTSTRAP_TOKEN:'synthetic-task-native-agent-secret',MANGO_PUBLIC_BASE_URL:origin,
   RER_OWNER_CLAIM_ISSUER:issuer,RER_MANAGEMENT_ORIGIN:issuer,RER_INSTALLATION_ID:installationId,RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify(publicKeys),
   RER_BUSINESS_TRUST:JSON.stringify({v:1,issuer,audience:origin,subject:installationId,email:'owner@example.test',keys:publicKeys})} as never;
  const platform=createFixturePlatform(bindings,'synthetic-task-native-agent-secret');
  platform.config.authSetupToken='synthetic-native-claim-setup-at-least-thirty-two-bytes';
  platform.config.initialOperatorEmails=['owner@example.test'];platform.config.publicBaseUrl=new URL(origin);
  const app=createApp(bindings,platform);
  const request=(path:string,init:RequestInit={})=>app.fetch(new Request(origin+path,{...init,headers:{Origin:origin,Host:new URL(origin).host,...Object.fromEntries(new Headers(init.headers))}}));
  const now=Math.floor(Date.now()/1000);
  const claim=await signJws(pair.privateKey,kid,'rer-owner-claim+jwt',{v:1,iss:issuer,aud:origin,installationId,email:'owner@example.test',jti:crypto.randomUUID(),iat:now,exp:now+300});
  const claimed=await request('/auth/owner-claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:claim,displayName:'Jordan Orchard',returnTo:'/app'})});
  expect(claimed.status).toBe(303);const cookie=claimed.headers.get('Set-Cookie')!.split(';')[0];
  const operator=await app.mangoServices.authService.authenticate(new Request(origin+'/api/operator',{headers:{Host:new URL(origin).host,Cookie:cookie}}));
  expect(operator).toBeTruthy();
  const settings=await signJws(pair.privateKey,kid,'rer-business-settings+jwt',{v:1,iss:issuer,aud:origin,sub:installationId,business:'orchard',email:'owner@example.test',jti:crypto.randomUUID(),iat:now,exp:now+3600,rev:1,values:{display_name:'Orchard Studio'},logo:null,team:[],owner_id:sub});
  const adopted=await request('/api/rer/business-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings})});
  expect(adopted.status).toBe(200);
  const scopes=[...new Set([...nativeToolSpecs.map(tool=>tool.scope),'events:read'])];
  const signer={issuer,installationId,kid,privateKey:pair.privateKey,publicKeys};
  const token=await signJws(pair.privateKey,kid,'at+jwt',{iss:issuer,aud:origin+'/mcp',sub,email:'owner@example.test',act:{sub:'orchard-marketer',name:'Rowan',specialist:'marketer'},client_id:'orchard-client',business:'orchard',scope:scopes.join(' '),consent:'orchard-consent',iat:now,exp:now+300,jti:crypto.randomUUID()});
  let sequence=0;
  async function mcp(method:string,params:unknown,access=token){
   const response=await request('/mcp',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json','MCP-Protocol-Version':'2026-07-28','Mcp-Method':method,'Mcp-Name':(params as {name?:string}).name??''},body:JSON.stringify({jsonrpc:'2.0',id:++sequence,method,params:{...(params as Record<string,unknown>),_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}})});
   return {status:response.status,body:await response.json() as any};
  }
  const call=(name:string,args:unknown)=>mcp('tools/call',{name,arguments:args});
  const unset=await call('mango.campaigns.create',{mode:'blank',idempotency_key:'unset-draft'});
  expect(unset.body.result._meta['com.runeditrun/error'].code).toBe('policy_unset');
  expect((await db.prepare('SELECT count(*) AS n FROM campaigns').first()).n).toBe(0);
  async function policy(document:unknown,seq:number,revoked?:{agents?:string[];consents?:string[]}){
   const signed=await policyEnvelope({signer,origin,business:'orchard',revision:seq-1,seq:seq-1},document,{revoked});
   const response=await request('/api/rer/agent-policy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({policy:signed.policy})});
   expect(response.status).toBe(200);const ack=await response.json() as any;expect(Object.keys(ack).sort()).toEqual(['adopted','door']);
  }
  await policy(autonomousPolicy(),1);
  const initial=await mcp('tools/list',{});expect(initial.status).toBe(200);
  expect(initial.body.result.tools.map((tool:any)=>tool.name)).toEqual([...nativeToolSpecs.map(tool=>tool.name),'mango.events.list'].sort());

  const first=await call('mango.campaigns.create',{mode:'blank',idempotency_key:'one-draft'});
  expect(first.body.result.isError).not.toBe(true);
  const repeated=await call('mango.campaigns.create',{mode:'blank',idempotency_key:'one-draft'});
  expect(repeated.body.result.structuredContent).toEqual(first.body.result.structuredContent);
  expect((await db.prepare('SELECT count(*) AS n FROM campaigns').first()).n).toBe(1);
  const conflict=await call('mango.campaigns.create',{composition:{name:'Different'},idempotency_key:'one-draft'});
  expect(conflict.body.result._meta['com.runeditrun/error'].code).toBe('idempotency_conflict');
  const external=await call('mango.campaigns.authorize',{id:first.body.result.structuredContent.campaignId,revisionId:first.body.result.structuredContent.revisionId,idempotency_key:'unready-newsletter'});
  expect(external.body.result.isError).toBe(true);
  expect((await db.prepare('SELECT count(*) AS n FROM recipient_steps').first()).n).toBe(0);
  const activity=await db.prepare("SELECT actor_type,actor_id,detail_json FROM lifecycle_audit_entries WHERE action='mango.campaigns.create'").first();
  expect(activity.actor_type).toBe('agent');expect(activity.actor_id).toBe('orchard-marketer');expect(JSON.parse(activity.detail_json).preparedBy.label).toBe('Rowan for Jordan Orchard');
  await policy(heldPolicy(),2);
  const pending=await call('mango.campaigns.create',{mode:'blank',idempotency_key:'held-draft'});
  expect(pending.body.result.structuredContent).toBeTruthy();
  // Current native authority is re-read, including retained-key retries.
  await policy(autonomousPolicy(),3,{agents:['orchard-marketer'],consents:[]});
  expect((await call('mango.campaigns.create',{mode:'blank',idempotency_key:'one-draft'})).status).toBe(401);
 }finally{await worker.dispose();}
});
