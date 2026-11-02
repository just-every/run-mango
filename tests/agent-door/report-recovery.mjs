import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mailAllowance} from './native-http.mjs';

/** Persisted interruption fixtures, driven back through the native Cron door. */
export async function proveReportRecovery({app,cookie,owner,call}) {
 const db=await app.database('DB'),started=Date.now();
 const reportMessages=()=>app.mail.read({limit:20,after:started}).filter(message=>message.subject.startsWith('Mango scheduled report:')).length;
 async function prepared(){
  const answer=await call('mango.reports.schedule',{reportId:'builtin-costs',cadence:'weekly',recipients:[owner.id],idempotency_key:randomUUID()});
  assert.equal(answer.message.result.isError,false);
  const id=answer.message.result.structuredContent.id;
  assert.equal((await app.call('/agents/api/pause',{method:'POST',cookie,body:{paused:true}})).status,200);
  try{
   await db.prepare('UPDATE insight_report_schedules SET next_at=? WHERE id=?').bind(Date.now()-60000,id).run();
   await app.scheduled();
  }finally{assert.equal((await app.call('/agents/api/pause',{method:'POST',cookie,body:{paused:false}})).status,200);}
  const delivery=await db.prepare('SELECT id,state FROM insight_report_deliveries WHERE schedule_id=?').bind(id).first();
  assert.equal(delivery.state,'prepared');return delivery.id;
 }
 const recoverable=await prepared();
 // The worker died after its native claim, before invoking the provider.
 await db.prepare("UPDATE insight_report_deliveries SET state='claimed',claim_token=?,updated_at=? WHERE id=?").bind(randomUUID(),Date.now()-3600000,recoverable).run();
 const pacing=await db.prepare('SELECT MAX(next_at) due FROM provider_pacing').first();
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(pacing.due??0)-Date.now())+50));
 await mailAllowance();await app.scheduled();
 let recovered;
 for(let attempt=0;attempt<3;attempt++){
  recovered=await db.prepare('SELECT state,provider_message_id,reason,next_at FROM insight_report_deliveries WHERE id=?').bind(recoverable).first();
  if(recovered.state!=='deferred')break;
  assert.equal(recovered.reason,'provider-pacing','Only a definite native provider deferral can retry');
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,recovered.next_at-Date.now())+50));
  await app.scheduled();
 }
 assert.equal(recovered.state,'accepted',JSON.stringify(recovered));assert.ok(recovered.provider_message_id);assert.equal(reportMessages(),1,'Recovering an unsent claim makes one provider submission');
 await app.scheduled();
 assert.deepEqual(await db.prepare('SELECT state,provider_message_id,reason,next_at FROM insight_report_deliveries WHERE id=?').bind(recoverable).first(),recovered,'A recovered delivery is not handed off again');
 const interrupted=await prepared();
 // After the provider boundary the saved state cannot prove whether it sent.
 await db.prepare("UPDATE insight_report_deliveries SET state='sending',claim_token=?,updated_at=? WHERE id=?").bind(randomUUID(),Date.now()-3600000,interrupted).run();
 await app.scheduled();await app.scheduled();
 assert.deepEqual(await db.prepare('SELECT state,reason,provider_message_id FROM insight_report_deliveries WHERE id=?').bind(interrupted).first(),{state:'uncertain',reason:'handoff-unconfirmed',provider_message_id:null});
 const inventory=await (await app.call('/api/settings/reports',{cookie})).json();
 assert.ok(inventory.deliveries.some(row=>row.deliveryIds.includes(interrupted)&&row.state==='uncertain'&&row.reason==='handoff-unconfirmed'),'An interrupted handoff stays visible for operator review');
 assert.equal((await db.prepare("SELECT count(*) count FROM lifecycle_audit_entries WHERE action='report-delivery.uncertain' AND entity_id=(SELECT schedule_id FROM insight_report_deliveries WHERE id=?)").bind(interrupted).first()).count,1);
 assert.equal(reportMessages(),1,'Interrupted or completed handoffs are never submitted again');
 console.log('PASS report recovery: expired pre-send claim delivered once; interrupted send retained for review');
}

/** Independent disposable installation so Cron recovery cannot change the
 * commerce evidence belonging to the marketing policy journey. */
export async function proveIsolatedDoorRecovery({bindings,context}) {
 const {agentRuntime}=await import('../../operations/agent-runtime.mjs');
 const {signJws,policyEnvelope,autonomousPolicy,accessToken,seconds}=await import('../../src/vendor/base/agent-door/conformance/crypto.mjs');
 const {default:nativeJourney}=await import('./native-journey.mjs');
 const app=await agentRuntime(bindings),c={...context,seq:0,revision:0,agentId:randomUUID()};
 try{
  const {issuer,installationId,kid,privateKey}=c.signer,now=seconds(),origin=c.origin;
  const claim=await signJws(privateKey,kid,'rer-owner-claim+jwt',{v:1,iss:issuer,aud:origin,installationId,email:c.person.email,iat:now,exp:now+300,jti:randomUUID()});
  const claimed=await app.call('/auth/owner-claim',{method:'POST',body:{token:claim,displayName:'Recovery Owner'}});
  assert.equal(claimed.status,303);
  const cookie=claimed.headers.get('set-cookie').split(';')[0];
  const owner=(await (await app.call('/api/operator',{cookie})).json()).operator;
  assert.equal((await app.call('/api/settings/sender',{method:'PUT',cookie,body:{displayName:'Recovery newsletter',fromEmail:c.person.email,replyToEmail:c.person.email,physicalAddress:'24 Orchard Lane, Test City'}})).status,200);
  const settings=await signJws(privateKey,kid,'rer-business-settings+jwt',{v:1,iss:issuer,aud:origin,sub:installationId,business:c.business,email:c.person.email,jti:randomUUID(),iat:now,exp:now+300,rev:1,owner_id:c.person.sub,values:{},logo:null,team:null});
  assert.equal((await app.call('/api/rer/business-settings',{method:'POST',body:{settings}})).status,200);
  const envelope=await policyEnvelope(c,autonomousPolicy());
  assert.equal((await app.call('/api/rer/agent-policy',{method:'POST',body:{policy:envelope.policy}})).status,200);
  c.seq=envelope.payload.seq;c.revision=envelope.payload.revision;
  let sequence=0;
  async function call(name,args){
   const response=await app.call('/mcp',{method:'POST',headers:{Authorization:'Bearer '+await accessToken(c),'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/call','Mcp-Name':name},body:{jsonrpc:'2.0',id:++sequence,method:'tools/call',params:{name,arguments:args,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}}});
   return {response,message:await response.json()};
  }
  await nativeJourney({request:app.request,origin,cookie,queues:app.queues,tool:async(name,args)=>{
   const answer=await call(name,args);return {status:answer.response.status,result:answer.message.result,decision:answer.message.result?._meta?.['com.runeditrun/decision']};
  }});
  await proveReportRecovery({app,cookie,owner,call});
 }finally{await app.close();}
}
