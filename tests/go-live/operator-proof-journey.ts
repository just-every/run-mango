import {expect} from '@playwright/test';
import type {invitationRuntime} from '../../operations/fixtures/invitation-runtime.mjs';

type Site=Awaited<ReturnType<typeof invitationRuntime>>;

/** A session without fresh email proof cannot invite; a confirmation link bound to that session, submitted affirmatively, permits the retry. */
export async function operatorProofJourney(site:Site,stale:string,owner:string) {
  const email='proof@example.test',invite=(cookie:string)=>site.call('/api/operators',{method:'POST',cookie,body:{email}});
  const listed=async()=>(await (await site.call('/api/operators',{cookie:owner})).json()).operators.map((row:any)=>row.email);
  const refused=await invite(stale);
  expect(refused.status).toBe(403);
  expect(await refused.json()).toEqual({error:'step_up_required'});
  expect(await listed()).not.toContain(email);
  expect((await site.call('/auth/step-up',{method:'POST',body:{action:'owner:transfer',returnTo:'/app/settings'}})).status).toBe(401);
  expect((await site.call('/auth/step-up',{method:'POST',cookie:stale,body:{action:'owner:transfer',returnTo:'/app/settings'}})).status).toBe(202);
  const token=await site.token();
  for(const method of ['GET','HEAD']) {
    const preview=await site.call(`/auth/confirm?token=${token}`,{method});
    expect(preview.status).toBe(200);
    expect(preview.headers.has('set-cookie')).toBe(false);
    expect((await invite(stale)).status).toBe(403);
  }
  // The link completes only in the session that asked for it.
  const elsewhere=await site.call('/auth/confirm',{method:'POST',cookie:owner,body:{token}});
  expect(elsewhere.status).toBe(400);
  expect((await site.call('/auth/confirm',{method:'POST',body:{token}})).status).toBe(400);
  expect((await invite(stale)).status).toBe(403);
  const confirmed=await site.call('/auth/confirm',{method:'POST',cookie:stale,body:{token}});
  expect(confirmed.status).toBe(303);
  expect(confirmed.headers.has('set-cookie')).toBe(false);
  const retried=await invite(stale);
  expect(retried.status).toBe(201);
  expect(await listed()).toContain(email);
  expect((await site.call('/auth/confirm',{method:'POST',cookie:stale,body:{token}})).status).toBe(400);
  expect((await site.call(`/api/operators/${(await retried.json()).operator.id}`,{method:'DELETE',cookie:owner})).status).toBe(204);
}
