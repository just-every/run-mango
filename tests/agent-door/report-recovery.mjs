import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mailAllowance} from './native-http.mjs';

/** Persisted interruption fixtures, driven back through the native Cron door. */
export async function proveReportRecovery({app,cookie,owner,call}) {
 const db=await app.database('DB');
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
 await mailAllowance();await app.scheduled();
 const recovered=await db.prepare('SELECT state,provider_message_id FROM insight_report_deliveries WHERE id=?').bind(recoverable).first();
 assert.equal(recovered.state,'accepted');assert.ok(recovered.provider_message_id);
 await app.scheduled();
 assert.deepEqual(await db.prepare('SELECT state,provider_message_id FROM insight_report_deliveries WHERE id=?').bind(recoverable).first(),recovered,'A recovered delivery is not handed off again');
 const interrupted=await prepared();
 // After the provider boundary the saved state cannot prove whether it sent.
 await db.prepare("UPDATE insight_report_deliveries SET state='sending',claim_token=?,updated_at=? WHERE id=?").bind(randomUUID(),Date.now()-3600000,interrupted).run();
 await app.scheduled();await app.scheduled();
 assert.deepEqual(await db.prepare('SELECT state,reason,provider_message_id FROM insight_report_deliveries WHERE id=?').bind(interrupted).first(),{state:'uncertain',reason:'handoff-unconfirmed',provider_message_id:null});
 const inventory=await (await app.call('/api/settings/reports',{cookie})).json();
 assert.ok(inventory.deliveries.some(row=>row.deliveryIds.includes(interrupted)&&row.state==='uncertain'&&row.reason==='handoff-unconfirmed'),'An interrupted handoff stays visible for operator review');
 assert.equal((await db.prepare("SELECT count(*) count FROM lifecycle_audit_entries WHERE action='report-delivery.uncertain' AND entity_id=(SELECT schedule_id FROM insight_report_deliveries WHERE id=?)").bind(interrupted).first()).count,1);
 console.log('PASS report recovery: expired pre-send claim delivered once; interrupted send retained for review');
}
