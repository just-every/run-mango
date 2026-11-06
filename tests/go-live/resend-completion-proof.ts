import {expect,test,type Page} from '@playwright/test';
import type {CampaignDetail} from '../../src/core/app/client/lib/types';
import {json,type Installation} from './harness';

/** Reconcile durable completion with the authenticated operator door after reload. */
export async function proveResendCompletion({site,cookie,page,campaign,expected,requests,submissions,stage,completed=false}:{
  site:Installation;cookie:string;page:Page;campaign:{campaignId:string;revisionId:string};
  expected:Array<{destination:string;disposition:string}>;requests:unknown[];submissions:()=>number;stage:string;completed?:boolean;
}) {
  const read=async()=>{
    const detail:CampaignDetail=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
    expect(detail.campaign).toMatchObject({id:campaign.campaignId,activeRevisionId:campaign.revisionId,state:completed?'completed':'dispatching'});
    expect(detail.steps).toHaveLength(1);
    const stepId=detail.steps[0].id;
    expect(await site.rows(`SELECT state,active_revision_id FROM campaigns WHERE id='${campaign.campaignId}'`))
      .toEqual([{state:completed?'completed':'dispatching',active_revision_id:campaign.revisionId}]);
    const dispatches=await site.rows(`SELECT step_id,state,started_at,completed_at FROM step_dispatches WHERE revision_id='${campaign.revisionId}'`);
    expect(dispatches).toHaveLength(1);
    expect(dispatches[0]).toMatchObject({step_id:stepId,state:completed?'completed':'dispatching'});
    expect(dispatches[0].started_at).toBeGreaterThan(0);
    if(completed)expect(dispatches[0].completed_at).toBeGreaterThanOrEqual(dispatches[0].started_at);
    else expect(dispatches[0].completed_at).toBeNull();
    const recipients=await site.rows(`SELECT destination,step_id,transport_disposition,terminal_at,attempt_count,outbound_request_json FROM recipient_steps WHERE revision_id='${campaign.revisionId}' ORDER BY destination`);
    expect(recipients.map(row=>({destination:row.destination,disposition:row.transport_disposition}))).toEqual(expected);
    expect(recipients.map(row=>row.step_id)).toEqual(expected.map(()=>stepId));
    expect(recipients.map(row=>row.attempt_count)).toEqual(expected.map(()=>1));
    expect(recipients.map(row=>row.outbound_request_json)).toEqual(requests);
    for(const row of recipients)if(row.transport_disposition==='handoff-unknown')expect(row.terminal_at).toBeNull();
    const counts=[...new Set(expected.map(row=>row.disposition))].sort().map(disposition=>({disposition,reason:null,count:expected.filter(row=>row.disposition===disposition).length}));
    expect(detail.results!.steps).toHaveLength(1);
    expect(detail.results!.steps[0]).toMatchObject({stepId,state:completed?'Sent':'Sending',
      startedAt:new Date(dispatches[0].started_at).toISOString(),
      completedAt:completed?new Date(dispatches[0].completed_at).toISOString():null,counts});
    expect(submissions()).toBe(2);
    return {stepId,counts};
  };
  const {stepId,counts}=await read();
  await page.context().clearCookies();
  await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  await page.goto(`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
  // Behaviour assertions run at desktop width; both widths retain browser proof.
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.reload();
    await expect(page.getByRole('heading',{name:'Resend reconciliation',exact:true})).toBeVisible();
    await expect(page.locator('.step-result__timing time').first()).not.toHaveText('…');
    if(width===1440) {
      await expect(page.locator('.scheduled-head__state')).toHaveText(`State: ${completed?'Sent':'Sending'}`);
      const step=page.locator(`[data-step-id="${stepId}"]`);
      await expect(step.locator('.step-result-state')).toHaveText(completed?'Sent':'Sending');
      await expect(step.locator('[data-disposition]')).toHaveCount(counts.length);
      for(const bucket of counts)await expect(step.locator(`[data-disposition="${bucket.disposition}"] dd`)).toHaveText(String(bucket.count));
      if(!completed)await expect(page.locator('.overall-result')).toContainText('0 of 1 steps sent.');
    }
    await page.screenshot({path:test.info().outputPath(`resend-completion-${stage}-${width}.png`),fullPage:true});
    await read();
  }
  await page.setViewportSize({width:1440,height:1000});
}
