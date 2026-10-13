import {test,expect} from '@playwright/test';
import {native,consent,finish} from './native';
test('CONT-004/006/010 sequential cleaned import restricts an imported subscriber, and no undo lifts it',async()=>{
 const h=await native();try{
  const subscribed={files:[{name:'first-subscribed.csv',preset:'csv-subscribed',csv:'Email Address,OPTIN_TIME,CONFIRM_TIME\nsequence@example.test,2026-09-01 10:00:00,2026-09-01 10:05:00'}],consent};
  const first=await h.service.preview(subscribed,h.context);const prior=await h.service.create(first.fingerprint,h.context);await finish(h,prior.id);expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'subscribed'});
  const next=await h.service.preview({files:[{name:'later-cleaned.csv',preset:'csv-cleaned',csv:'Email Address\nsequence@example.test'}]},h.context);expect(next.counts).toMatchObject({created:0,updated:1,suppressed:1});const successor=await h.service.create(next.fingerprint,h.context);await finish(h,successor.id);
  expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'suppressed'});expect(await h.f.db.prepare('SELECT count(*) AS count FROM surviving_opt_outs').first()).toEqual({count:1});
  await expect(h.service.undo(prior.id,h.context)).rejects.toThrow('SUPERSEDED');expect((await h.service.read(prior.id,h.context)).state).toBe('completed');
  // Undoing the cleaned list keeps its suppression; the earlier import then undoes too, removing the contact it created while every restriction stays.
  await h.service.undo(successor.id,h.context);await finish(h,successor.id);expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'suppressed'});
  expect(await h.f.db.prepare('SELECT (SELECT count(*) FROM surviving_opt_outs) AS optOuts,(SELECT count(*) FROM contact_suppressions) AS suppressions').first()).toEqual({optOuts:1,suppressions:1});
  await h.service.undo(prior.id,h.context);expect((await finish(h,prior.id)).state).toBe('undone');expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:0});
  expect(await h.f.db.prepare('SELECT (SELECT count(*) FROM surviving_opt_outs) AS optOuts,(SELECT count(*) FROM contact_suppressions) AS suppressions').first()).toEqual({optOuts:1,suppressions:1});
 }finally{await h.close();}
});
