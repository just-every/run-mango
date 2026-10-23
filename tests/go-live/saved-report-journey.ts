import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openPage} from '../support/navigation';
import {archiveRecords} from '../portability/flows';
import {installation,json,type Installation} from './harness';
import type {providerEdge} from './edge';
import type {eventSigner} from './sendgrid-events';

export async function proveSavedReports(page:Page,site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,signer:ReturnType<typeof eventSigner>,info:TestInfo) {
  let cookie=await site.open();
  const support=await site.open('support@example.test','synthetic-mango-162');
  await json(await site.call('/api/operators/synthetic-mango-162/role',{method:'PUT',cookie,body:{role:'support'}}),200);
  const admin=await site.open('admin@example.test','synthetic-mango-163');
  await json(await site.call('/api/operators/synthetic-mango-163/role',{method:'PUT',cookie,body:{role:'admin'}}),200);
  expect((await site.call('/api/settings/reports',{cookie:support})).status).toBe(403);
  expect((await site.call('/api/settings/reports',{method:'POST',cookie:support,body:{metric:'providerCost',dimension:'provider'}})).status).toBe(403);
  expect((await site.call('/api/settings/reports/schedules',{method:'POST',cookie:support,body:{reportId:'builtin-costs',cadence:'weekly',recipients:['go-live-owner']}})).status).toBe(403);
  await json(await site.call('/api/settings/reports',{method:'POST',cookie:admin,body:{metric:'humanClicks',dimension:'channel'}}),201);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/hydration|hydrated.*match/i.test(message.text()))errors.push(message.text());});
  await page.context().setExtraHTTPHeaders({Cookie:cookie});await page.setViewportSize({width:1440,height:1000});await openPage(page,site.runtime.url+'/app/insights');
  const panel=page.getByRole('region',{name:'Saved reports and email schedules'});
  await expect(panel.getByRole('button',{name:'Save custom report'})).toBeEnabled();
  await panel.getByRole('button',{name:'Save custom report'}).click();await expect(panel.getByRole('status')).toContainText('Custom report saved.');
  let inventory=await json(await site.call('/api/settings/reports',{cookie}),200);
  const saved=inventory.reports.find((report:any)=>report.metric==='providerCost'&&!report.id.startsWith('builtin-'));expect(saved).toBeTruthy();
  await panel.getByRole('combobox',{name:'Saved report',exact:true}).selectOption(saved.id);
  await panel.getByRole('checkbox',{name:'owner@example.test',exact:true}).check();
  await panel.getByRole('button',{name:'Schedule email report'}).click();await expect(panel.getByRole('status')).toContainText('Email schedule saved.');
  inventory=await json(await site.call('/api/settings/reports',{cookie}),200);const schedule=inventory.schedules[0],date=new Date(schedule.nextAt);
  expect(date.getUTCDay()).toBe(1);expect(date.getUTCHours()).toBe(9);expect(date.getUTCMinutes()).toBe(0);
  const end=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()),from=new Date(end-7*86400000).toISOString().slice(0,10),to=new Date(end-86400000).toISOString().slice(0,10),at=end-6*86400000;
  await site.runtime.sql(`INSERT INTO external_cost_facts(id,provider,operation,model_or_channel,billable_units,units_known,unit_kind,reported_cost_micros,currency,outcome,occurred_at,created_at) VALUES ('synthetic-mango-164','synthetic-mango-161','provider-handoff','email',2,1,'messages',10000,'USD','reported',${at},${at}),('synthetic-mango-165','synthetic-mango-161','provider-handoff','email',3,1,'messages',15000,'EUR','reported',${at},${at}),('synthetic-mango-166','synthetic-mango-161','provider-handoff','email',4,1,'messages',NULL,'USD','reported',${at},${at}) RETURNING id`);
  const report=(await json(await site.call(`/api/settings/reports/${saved.id}/read?from=${from}&to=${to}`,{cookie}),200)).report;
  expect(report.rows.filter((row:any)=>row.dimension==='synthetic-mango-161')).toEqual(expect.arrayContaining([expect.objectContaining({currency:'USD',value:'10000',unpricedFacts:1}),expect.objectContaining({currency:'EUR',value:'15000',unpricedFacts:0})]));
  expect(JSON.stringify(report)).not.toContain('gardener@example.test');expect(JSON.stringify(report)).not.toContain('owner@example.test');
  const cost=(await json(await site.call(`/api/insights?from=${from}&to=${to}`,{cookie}),200)).costs.byDay.filter((row:any)=>row.provider==='synthetic-mango-161');
  expect(cost.map((row:any)=>[row.currency,row.reportedCostMicros,row.unpricedFacts]).sort()).toEqual([['EUR',15000,0],['USD',10000,1]]);
  expect((await site.call(`/api/settings/reports/${saved.id}/read?from=2026-01-01&to=2026-03-01`,{cookie})).status).toBe(400);
  expect((await site.call('/api/settings/reports/schedules',{method:'POST',cookie,body:{reportId:saved.id,cadence:'weekly',recipients:['gardener@example.test']}})).status).toBe(400);
  const reportMail=()=>edge.resend.sends.filter(send=>send.body.subject.startsWith('Mango scheduled report:'));
  let clock=await site.control('/_golive/clock');await site.control('/_golive/clock',{advanceMs:schedule.nextAt-clock.now-1,hold:true});
  await site.control('/_golive/cron',{scheduledTime:schedule.nextAt-1});expect(reportMail()).toHaveLength(0);
  await site.control('/_golive/clock',{advanceMs:1,hold:true});
  await Promise.all([site.control('/_golive/cron',{scheduledTime:schedule.nextAt}),site.control('/_golive/cron',{scheduledTime:schedule.nextAt})]);
  expect(reportMail()).toHaveLength(1);expect(reportMail()[0].body.to).toContain('owner@example.test');expect(reportMail()[0].body.text).toContain(JSON.stringify(report,null,2));
  await site.control('/_golive/cron',{scheduledTime:schedule.nextAt});expect(reportMail()).toHaveLength(1);
  expect(await site.rows(`SELECT state,count(*) count FROM insight_report_deliveries WHERE schedule_id='${schedule.id}' GROUP BY state`)).toEqual([{state:'accepted',count:1}]);
  cookie=await site.open();await page.context().setExtraHTTPHeaders({Cookie:cookie});
  const monthly=await json(await site.call('/api/settings/reports/schedules',{method:'POST',cookie:await site.open('admin@example.test','synthetic-mango-163'),body:{reportId:'builtin-performance',cadence:'monthly',recipients:['synthetic-mango-163']}}),201);
  expect(new Date(monthly.nextAt).getUTCDate()).toBe(1);expect(new Date(monthly.nextAt).getUTCHours()).toBe(9);expect(monthly.period.from.endsWith('-01')).toBe(true);
  // Revoked native creator authority refuses delivery, and records its reason.
  await json(await site.call('/api/operators/synthetic-mango-163/role',{method:'PUT',cookie,body:{role:'support'}}),200);
  await site.control('/_golive/clock',{advanceMs:monthly.nextAt-(await site.control('/_golive/clock')).now,hold:true});
  await site.control('/_golive/cron',{scheduledTime:monthly.nextAt});
  expect(await site.rows(`SELECT state,reason FROM insight_report_deliveries WHERE schedule_id='${monthly.id}'`)).toEqual([{state:'refused',reason:'schedule-authority-changed'}]);
  expect(await site.rows("SELECT count(*) count FROM lifecycle_audit_entries WHERE action='report-delivery.refused'")).toEqual([{count:1}]);
  cookie=await site.open();await page.context().setExtraHTTPHeaders({Cookie:cookie});
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/insights');
    await expect(panel.getByRole('button',{name:'Preview last 7 UTC days'})).toBeEnabled();await panel.getByRole('button',{name:'Preview last 7 UTC days'}).click();await expect(panel.getByRole('region',{name:'Saved report preview'})).toBeVisible();
    await expect(panel.getByRole('region',{name:'Report delivery history'})).toContainText('accepted');await expect(panel.getByRole('region',{name:'Report delivery history'})).toContainText('schedule-authority-changed');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
    await page.screenshot({path:info.outputPath(`saved-reports-${width}.png`),fullPage:true});
  }
  expect(errors).toEqual([]);await page.context().setExtraHTTPHeaders({});
  // Contact erasure keeps aggregate snapshots and operator schedules as explicit no-ops.
  const tables=['insight_saved_reports','insight_report_schedules','insight_report_deliveries','sender_renewal_deliveries'],counts=await Promise.all(tables.map(table=>site.count(table)));
  const contact=(await site.rows("SELECT id FROM contacts WHERE email='gardener@example.test'"))[0];
  let {receipt}=await json(await site.call(`/api/contacts/${contact.id}`,{method:'DELETE',cookie}),202);
  while(receipt.state==='pending'){const response=await site.call(`/api/audience/erasures/${receipt.reference}/resume`,{method:'POST',cookie,body:{}});expect([200,202]).toContain(response.status);({receipt}=await response.json());}
  expect(await Promise.all(tables.map(table=>site.count(table)))).toEqual(counts);
  const records=await archiveRecords({call:site.call},cookie),rows=records.filter(record=>record.kind==='part').flatMap(part=>part.items).filter(item=>item.kind==='row');
  for(const table of tables)expect(rows.filter(row=>row.table===table)).toHaveLength(counts[tables.indexOf(table)]);
  const directory=await mkdtemp(join(tmpdir(),'mango-report-restore-'));
  const options={token:site.runtime.token,stateDirectory:join(directory,'state'),managed:'connected' as const,mailProvider:'resend' as const};
  let target=await installation(edge,signer,{...options,restore:true});
  try {
    let targetCookie=await target.open('restored@example.test','synthetic-mango-167');
    const request=(path:string,body:unknown,method='POST')=>target.call('/api/portability/'+path,{cookie:targetCookie,method,body});
    const {id}=await json(await request('imports',{confirmed:true,manifest:records[0]}),201);
    for(const part of records.filter(record=>record.kind==='part'))await json(await request(`imports/${id}/parts/${part.index}`,part,'PUT'),200);
    await json(await request(`imports/${id}/finalize`,{contentHash:records.at(-1).contentHash,archiveHash:records.at(-1).archiveHash,laterJournal:{sourceIdentity:records[0].sourceIdentity,epoch:records[0].epoch,journal:records[0].journal}}),200);
    for(const table of tables)expect(await target.count(table)).toBe(counts[tables.indexOf(table)]);
    const before=edge.resend.sends.length;await target.control('/_golive/cron');expect(edge.resend.sends).toHaveLength(before);
    await target.runtime.close();target=await installation(edge,signer,{...options,restore:false});targetCookie=await target.open('restored@example.test','synthetic-mango-167');
    expect((await json(await target.call('/api/settings/reports',{cookie:targetCookie}),200)).schedules.every((schedule:any)=>!schedule.active)).toBe(true);
    await target.control('/_golive/clock',{advanceMs:90*86400000,hold:true});await target.control('/_golive/cron');expect(edge.resend.sends).toHaveLength(before);
    expect((await json(await target.call('/api/settings/sender/renewal',{cookie:await target.open('restored@example.test','synthetic-mango-167')}),200)).status.requiresConfirmation).toBe(true);
  } finally {await target.runtime.close();await rm(directory,{recursive:true,force:true});}
}
