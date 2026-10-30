import {saveWork} from '../agent-door/custody';
import {Hono} from 'hono';
import {z} from 'zod';
import type {Database} from '@/core/platform/db/client';
import type {AuthVariables} from '@/core/features/auth/routes';
import {readJson} from '@/core/api/input';
import {recordActivity} from '@/core/features/auth/activity-record';
import {reportDefinition,reportTitle,builtInReports,savedReportPeriod,nextReportTime,reportSchedulePeriod} from './saved-report-model';
import {findSavedReport,readSavedReport} from './saved-report-read';
import {reportAuthority,reportOperators} from './report-authority';
export function savedReportRoutes(database:Database) {
  const routes=new Hono<{Variables:AuthVariables}>(),db=database.$client;
  routes.use('/settings/reports*',async(context,next)=>{context.header('Cache-Control','no-store');const operator=context.get('operator');if(!operator||!['owner','admin'].includes(operator.role))return context.json({error:'owner_or_admin_required'},403);await next();});
  routes.get('/settings/reports',async context=>{
    const saved=(await db.prepare('SELECT id,metric,dimension FROM insight_saved_reports ORDER BY created_at,id').all<{id:string;metric:any;dimension:any}>()).results;
    const schedules=(await db.prepare('SELECT id,report_id reportId,cadence,recipients_json recipients,next_at nextAt,enabled,authority_binding binding,created_by creator FROM insight_report_schedules ORDER BY next_at,id').all<any>()).results;
    for(const schedule of schedules){schedule.active=Boolean(schedule.enabled&&(await reportAuthority(database,schedule.creator))?.binding===schedule.binding);schedule.recipients=JSON.parse(schedule.recipients);delete schedule.binding;delete schedule.creator;}
    const operators=(await db.prepare(`SELECT n.id,n.email ${reportOperators} WHERE n.status='active' ORDER BY n.email`).all<{id:string;email:string}>()).results;
    const deliveries=(await db.prepare('SELECT schedule_id scheduleId,due_at dueAt,state,reason,count(*) count,json_group_array(id) deliveryIds FROM insight_report_deliveries GROUP BY schedule_id,due_at,state,reason ORDER BY due_at DESC LIMIT 100').all()).results;
    for(const delivery of deliveries)delivery.deliveryIds=JSON.parse(String(delivery.deliveryIds));
    return context.json({reports:[...builtInReports,...saved].map(report=>({...report,title:reportTitle(report)})),operators,schedules,deliveries});
  });
  routes.post('/settings/reports',async context=>{
    const parsed=await readJson(context,reportDefinition);if('error'in parsed)return parsed.error;
    const actor=context.get('operator'),authority=await reportAuthority(database,actor.id);if(!authority)return context.json({error:'authority_changed'},403);
    const id=crypto.randomUUID(),now=Date.now();
    const inserted=await db.prepare(`INSERT INTO insight_saved_reports(id,metric,dimension,created_by,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 ${reportOperators} WHERE n.id=? AND n.status='active' AND n.version=? AND n.created_at=? AND COALESCE(r.role,CASE WHEN n.role='member' THEN 'author' WHEN n.id=(SELECT owner_id FROM operator_role_settings WHERE singleton=1) THEN 'owner' ELSE 'admin' END) IN ('owner','admin'))`).bind(id,parsed.data.metric,parsed.data.dimension,actor.id,now,actor.id,authority.operator.version,authority.operator.created_at).run();
    if(!inserted.meta.changes)return context.json({error:'authority_changed'},403);
    await recordActivity(db,{key:`saved-report:${id}`,action:'report.saved',entityType:'report',entityId:id,actorId:actor.id,detail:parsed.data});return context.json({id,...parsed.data,title:reportTitle(parsed.data)},201);
  });
  routes.get('/settings/reports/:id/read',async context=>{
    const definition=await findSavedReport(database,context.req.param('id'));if(!definition)return context.json({error:'report_not_found'},404);
    let period;try{period=savedReportPeriod(context.req.query());}catch{return context.json({error:'invalid_report_period'},400);}
    return context.json({report:await readSavedReport(database,definition,period)});
  });
  routes.post('/settings/reports/schedules',async context=>{
    const parsed=await readJson(context,z.object({reportId:z.string().min(1).max(80),cadence:z.enum(['weekly','monthly']),recipients:z.array(z.string().min(1).max(100)).min(1).max(20).refine(ids=>new Set(ids).size===ids.length)}).strict());if('error'in parsed)return parsed.error;
    const actor=context.get('operator'),authority=await reportAuthority(database,actor.id);if(!authority)return context.json({error:'authority_changed'},403);
    if(!await findSavedReport(database,parsed.data.reportId))return context.json({error:'report_not_found'},404);
    const active=(await db.prepare("SELECT id FROM oa_operators WHERE status='active' AND id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(parsed.data.recipients)).all()).results;
    if(active.length!==parsed.data.recipients.length)return context.json({error:'existing_operators_only'},400);
    const id=crypto.randomUUID(),now=Date.now(),nextAt=nextReportTime(parsed.data.cadence,now);
    await db.prepare('INSERT INTO insight_report_schedules(id,report_id,cadence,recipients_json,next_at,enabled,authority_binding,created_by,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?,?)').bind(id,parsed.data.reportId,parsed.data.cadence,JSON.stringify(parsed.data.recipients),nextAt,authority.binding,actor.id,now,now).run();
    await saveWork(db,'report',id,'mango.reports.dispatch',{});
    await recordActivity(db,{key:`report-schedule:${id}`,action:'report.scheduled',entityType:'report-schedule',entityId:id,actorId:actor.id,detail:{cadence:parsed.data.cadence,reportId:parsed.data.reportId,recipientCount:active.length}});
    return context.json({id,nextAt,period:reportSchedulePeriod(parsed.data.cadence,nextAt)},201);
  });
  routes.patch('/settings/reports/schedules/:id',async context=>{
    const parsed=await readJson(context,z.object({enabled:z.boolean()}).strict());if('error'in parsed)return parsed.error;
    const actor=context.get('operator'),authority=await reportAuthority(database,actor.id);if(!authority)return context.json({error:'authority_changed'},403);
    const prior=await db.prepare('SELECT cadence FROM insight_report_schedules WHERE id=?').bind(context.req.param('id')).first<{cadence:'weekly'|'monthly'}>();if(!prior)return context.json({error:'schedule_not_found'},404);
    const now=Date.now();await db.prepare('UPDATE insight_report_schedules SET enabled=?,authority_binding=?,created_by=?,next_at=?,updated_at=? WHERE id=?').bind(parsed.data.enabled?1:0,authority.binding,actor.id,nextReportTime(prior.cadence,now),now,context.req.param('id')).run();
    await recordActivity(db,{key:crypto.randomUUID(),action:parsed.data.enabled?'report-schedule.enabled':'report-schedule.paused',entityType:'report-schedule',entityId:context.req.param('id'),actorId:actor.id});return context.json({status:'saved'});
  });
  return routes;
}
