import {test,expect} from '@playwright/test';
import {native} from './native';
import {authenticatedRequests} from './request-runtime';
import {parseCsv} from '../../src/core/features/audience/csv';
const ledgers=(csv:string)=>new Map(parseCsv(csv).map(row=>[row.email,row]));

test('CONT-004/010 an import stopped partway is abandoned through its route: what it wrote rolls back, a later opt-out stays, its held contacts are released and the same file imports again',async()=>{
 test.setTimeout(180000);
 const h=await native();try{
  const http=await authenticatedRequests(h.f,h.f.db);
  for(const email of ['kept0@example.test','kept1@example.test'])await h.f.services.audienceService.ensureContact({email,displayName:`Before ${email}`},new Date());
  const before=await http.text('/api/audience/export');
  const csv='Email Address,First Name\n'+Array.from({length:25},(_,i)=>`${i<2?`kept${i}`:`new${i}`}@example.test,Imported ${i}`).join('\n');
  const input={files:[{name:'stopped.csv',preset:'csv-non-subscribed',csv}]};
  const first=await http.json('/api/audience/import-preview',input);
  const {job}=await http.json('/api/audience/imports',{fingerprint:first.fingerprint});
  expect(job.state).toBe('applying');expect(job.checkpoint).toBeGreaterThan(0);expect(job.checkpoint).toBeLessThan(25);
  // While it is stopped, a later unsubscribe list can only opt out a contact it wrote.
  const later=await http.json('/api/audience/import-preview',{files:[{name:'later.csv',preset:'csv-unsubscribed',csv:'Email Address,First Name\nkept0@example.test,Later'}]});
  expect(later.rows[0].warnings).toHaveLength(1);
  expect((await http.json('/api/audience/imports',{fingerprint:later.fingerprint})).job.state).toBe('completed');
  let state=(await http.json(`/api/audience/imports/${job.id}/abandon`,{})).job.state;
  for(let calls=0;state==='rolling_back';calls++){expect(calls).toBeLessThan(25);state=(await http.json(`/api/audience/imports/${job.id}/resume`,{})).job.state;}
  expect(state).toBe('rolled_back');
  // Every contact is back as it was, except that the opt-out stays.
  const prior=ledgers(before),after=ledgers(await http.text('/api/audience/export'));
  expect([...after.keys()].sort()).toEqual([...prior.keys()].sort());
  expect(after.get('kept1@example.test')).toEqual(prior.get('kept1@example.test'));
  expect(after.get('kept0@example.test')).toMatchObject({display_name:'Before kept0@example.test',email_status:'unsubscribed'});
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM surviving_opt_outs').first()).toEqual({count:1});
  const listed=(await http.json('/api/audience/imports')).jobs.find((item:{id:string})=>item.id===job.id);
  expect(listed.abandonedAt).toBeGreaterThan(0);
  expect((await http.response(`/api/audience/imports/${job.id}/abandon`,{})).status).toBe(200);
  const again=await http.json('/api/audience/import-preview',input);
  expect(again.counts).toMatchObject({created:23,updated:2,rejected:0});expect(again.warnings).toEqual([]);
  let next=(await http.json('/api/audience/imports',{fingerprint:again.fingerprint})).job;
  while(next.state==='applying')next=(await http.json(`/api/audience/imports/${next.id}/resume`,{})).job;
  expect(next.state).toBe('completed');expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:25});
 }finally{await h.close();}
});
