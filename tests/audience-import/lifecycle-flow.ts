import { expect } from '@playwright/test';
import { native } from './native';
import { meter } from './d1-meter';
import { authenticatedRequests } from './request-runtime';
import { parseCsv } from '../../src/core/features/audience/csv';
import { ownedTables } from '../../src/core/features/audience/import-target';

// Both profiles exercise the same public HTTP lifecycle and safety assertions.
// Routine crosses several batches; release retains the full capacity workload.
export async function importLifecycle(count: number) {
 const h=await native();try{
  const measured=meter(h.f.db);
  const http=await authenticatedRequests(h.f,measured.db);
  h.context.storage.database=measured.db;h.context.authorization.principalId=http.principalId;
  let peak=0,calls=0;const started=performance.now();
  const operations:Record<string,{calls:number;peak:number;maxBindings:number;maxSqlBytes:number;totalMs:number;maxMs:number}>={};
  async function invocation<T>(name:string,action:()=>Promise<T>){
   measured.reset();const before=performance.now();let result:T;
   try{result=await action();}catch(error){console.log('D1 scale failed invocation',JSON.stringify({name,elapsedMs:performance.now()-before,...measured.stats()}));throw error;}
   const stats=measured.stats(),elapsedMs=performance.now()-before;peak=Math.max(peak,stats.count);calls++;
   const prior=operations[name]??{calls:0,peak:0,maxBindings:0,maxSqlBytes:0,totalMs:0,maxMs:0};
   operations[name]={calls:prior.calls+1,peak:Math.max(prior.peak,stats.count),maxBindings:Math.max(prior.maxBindings,stats.maxBindings),maxSqlBytes:Math.max(prior.maxSqlBytes,stats.maxSqlBytes),totalMs:prior.totalMs+elapsedMs,maxMs:Math.max(prior.maxMs,elapsedMs)};
   console.log('D1 scale invocation',JSON.stringify({name,call:prior.calls+1,elapsedMs,...stats}));
   expect(stats.count).toBeLessThanOrEqual(1000);expect(stats.maxBindings).toBeLessThanOrEqual(100);expect(stats.maxSqlBytes).toBeLessThanOrEqual(100000);return result;
  }
  const csv='Email Address,Email Marketing Status\n'+Array.from({length:count},(_,i)=>`lifecycle${i}@example.test,${i%2?'unsubscribed':'cleaned'}`).join('\n');
  const input={files:[{name:'lifecycle-scale.csv',preset:'csv-unsubscribed',csv}]};
  const preview=await invocation('preview',()=>http.json('/api/audience/import-preview',input));
  expect(preview.counts).toMatchObject({created:count,rejected:0,unsubscribed:Math.floor(count/2),suppressed:Math.ceil(count/2)});
  let {job}=await invocation('create',()=>http.json('/api/audience/imports',{fingerprint:preview.fingerprint}));
  expect(job.state).toBe('applying');
  expect(job.total).toBe(count);expect(job.checkpoint).toBeGreaterThan(0);expect(job.checkpoint).toBeLessThan(count);expect(job.fence).toBeGreaterThan(0);
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:job.checkpoint});
  // Every call must make progress; at least one row per call bounds completion
  // without coupling the journey to an internal batch size.
  const maxPhaseCalls=count;let forwardCalls=0;
  while(['queued','applying'].includes(job.state)){
   expect(++forwardCalls).toBeLessThanOrEqual(maxPhaseCalls);const prior=job;
   ({job}=await invocation('resume',()=>http.json(`/api/audience/imports/${job.id}/resume`,{})));
   expect(job.id).toBe(prior.id);expect(job.checkpoint).toBeGreaterThan(prior.checkpoint);expect(job.checkpoint).toBeLessThanOrEqual(count);expect(job.fence).toBeGreaterThan(prior.fence);
   expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:job.checkpoint});
  }
  expect(forwardCalls).toBeGreaterThan(0);expect(job.checkpoint).toBe(count);
  expect(job.state).toBe('completed');expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:count});
  expect(await h.f.db.prepare("SELECT count(*) AS count FROM contacts WHERE email_status='suppressed'").first()).toEqual({count:Math.ceil(count/2)});
  expect(await h.f.db.prepare("SELECT count(*) AS count FROM contacts WHERE email_status='unsubscribed'").first()).toEqual({count:Math.floor(count/2)});
  const exported=await invocation('export',()=>http.text('/api/audience/export'));const rows=parseCsv(exported);expect(rows).toHaveLength(count);
  expect(rows.map(row=>({email:row.email,status:row.email_status})).sort((a,b)=>a.email.localeCompare(b.email)))
   .toEqual(Array.from({length:count},(_,i)=>({email:`lifecycle${i}@example.test`,status:i%2?'unsubscribed':'suppressed'})).sort((a,b)=>a.email.localeCompare(b.email)));
  expect(rows.every(row=>JSON.parse(row.ledger_json).tables.contacts[0].email_status===row.email_status)).toBeTruthy();
  expect(rows.filter(row=>row.email_status==='suppressed')).toHaveLength(Math.ceil(count/2));expect(rows.filter(row=>row.email_status==='unsubscribed')).toHaveLength(Math.floor(count/2));
  const repeated=await invocation('repeat-preview',()=>http.json('/api/audience/import-preview',input));expect(repeated.fingerprint).toBe(preview.fingerprint);
  expect((await invocation('repeat-create',()=>http.json('/api/audience/imports',{fingerprint:preview.fingerprint}))).job.id).toBe(job.id);
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:count});
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM ik_provenance').first()).toEqual({count:count});
  expect(await invocation('repeat-export',()=>http.text('/api/audience/export'))).toBe(exported);
  const completedFence=job.fence;
  const restrictions=Object.fromEntries(await Promise.all(['surviving_opt_outs','contact_suppressions'].map(async table=>[table,await h.f.db.prepare(`SELECT count(*) AS count FROM ${table}`).first()])));
  ({job}=await invocation('undo',()=>http.json(`/api/audience/imports/${job.id}/undo`,{})));
  expect(job.fence).toBeGreaterThan(completedFence);
  let remaining=Number((await h.f.db.prepare('SELECT count(*) AS count FROM ik_provenance WHERE reversed=0').first<{count:number}>())!.count);
  expect(job.state).toBe('undoing');expect(remaining).toBeGreaterThan(0);expect(remaining).toBeLessThan(count);let reverseCalls=0;
  while(job.state==='undoing'){
   expect(++reverseCalls).toBeLessThanOrEqual(maxPhaseCalls);const prior=job;
   ({job}=await invocation('undo-resume',()=>http.json(`/api/audience/imports/${job.id}/resume`,{})));
   expect(job.id).toBe(prior.id);expect(job.fence).toBeGreaterThan(prior.fence);
   const next=Number((await h.f.db.prepare('SELECT count(*) AS count FROM ik_provenance WHERE reversed=0').first<{count:number}>())!.count);
   expect(next).toBeLessThan(remaining);remaining=next;
  }
  expect(reverseCalls).toBeGreaterThan(0);expect(job.state).toBe('undone');
  // Every contact is gone; the opt-outs and suppressions the import applied stay.
  for(const table of [...ownedTables,'mango_import_revisions'])if(!['surviving_opt_outs','contact_suppressions'].includes(table))expect(await h.f.db.prepare(`SELECT count(*) AS count FROM ${table}`).first()).toEqual({count:0});
  for(const table of ['surviving_opt_outs','contact_suppressions'])expect(await h.f.db.prepare(`SELECT count(*) AS count FROM ${table}`).first()).toEqual(restrictions[table]);
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM ik_provenance WHERE reversed=0').first()).toEqual({count:0});
  console.log('D1 scale lifecycle invocations',JSON.stringify({calls,peak,elapsedMs:performance.now()-started,forwardCalls,reverseCalls,operations}));
 }finally{await h.close();}
}
