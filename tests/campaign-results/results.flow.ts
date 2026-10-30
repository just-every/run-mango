const width = 1440;
import {proveOverview} from './overview-journey';
import { exerciseRetention } from './retention-journey';
import { exerciseCampaignReports } from './reporting-journey';
import { localSessionCookieName } from '../support/local-session';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, contract, runtime } from './runtime-fixture';
import { fixedNow,states } from './fixtures';
import { openPage, reloadPage } from '../support/navigation';
async function seed(request:any,action:string) {const response=await request.post(`${runtime.url}/_results/${action}`,{headers:{'X-Test-Token':runtime.token}});expect(response.status()).toBe(200);return response.json();}
async function login(page:any,request:any) {const {token}=await seed(request,'open');await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:token,domain:'127.0.0.1',path:'/'}]);await page.clock.install({time:fixedNow});}
// WCAG 2.x contrast of an element's text on its own background, from computed styles.
async function textContrast(element:any) {
  const [fg,bg]=await element.evaluate((el:Element)=>{const s=getComputedStyle(el);return [s.color,s.backgroundColor];});
  const luminance=(value:string)=>{const [r,g,b]=value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;});return 0.2126*r+0.7152*g+0.0722*b;};
  const [a,b]=[luminance(fg),luminance(bg)].sort((x,y)=>y-x);return (a+0.05)/(b+0.05);
}
// Check the settled page: a fresh-data reload briefly replaces the document between rendered states.
async function accessible(page:any,width:number) {await page.waitForLoadState('networkidle');await expect(page.locator('main').first()).toBeVisible();await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);}
function expectedLocalClock(value:string,timeZone:string) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit',timeZone}).formatToParts(new Date(value)).map(({type,value})=>[type,value]));
  return `${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}
 {



}




export const walk1 = async({page,request})=>{
    await seed(request,'outcomes');await login(page,request);await page.setViewportSize({width,height:900});
    const raw=await seed(request,'counts');
    for(const [id,state] of [['scheduled','Scheduled'],['sending','Sending'],['mixed','Sent'],['missed','Missed'],['partial','Sent'],['cancelled','Cancelled'],['failed','Failed'],['failed-before','Failed'],['closed-partial','Sent'],['closed-fence','Sending'],['dst','Scheduled']]) {
      await openPage(page,`${runtime.url}/app/campaigns/${id}/scheduled`);
      await expect(page.getByRole('heading',{name:`Campaign ${id}`,exact:true})).toBeVisible();
      const response=await page.request.get(`${runtime.url}/api/campaigns/${id}`);expect(response.ok()).toBe(true);const detail=await response.json();
      expect(detail.results.asOf).toBe(fixedNow.toISOString());
      await expect(page.locator('.step-results > li')).toHaveCount(detail.steps.length);
      expect(await page.locator('.step-results > li').evaluateAll((rows:HTMLElement[])=>rows.map(row=>row.dataset.stepId))).toEqual(detail.steps.map((step:any)=>step.id));
      await expect(page.locator('.step-result-state').first()).toHaveText(state);
      expect(detail.revision.audienceRule).not.toBe('Old misleading note');
      for(const step of detail.steps) {
        const row=page.locator(`[data-step-id="${step.id}"]`);
        const channelName=({email:'Email',sms:'SMS'} as Record<string,string>)[step.channel];
        await expect(row.locator('h3')).toHaveText(`Step ${step.sequence} · ${channelName}`);
        await expect(row.locator('time').first()).toContainText(expectedLocalClock(step.scheduledAt,'Australia/Brisbane'));
        const expected=raw.filter((entry:any)=>entry.campaign_id===id&&entry.revision_id===`${id}-revision`&&entry.step_id===step.id);
        await expect(row.locator('.disposition-counts > div')).toHaveCount(expected.length);
        for(const bucket of expected) {
          const bucketRow=row.locator(`[data-disposition="${bucket.disposition}"]${bucket.reason?`[data-skip-reason="${bucket.reason}"]`:':not([data-skip-reason])'}`);
          await expect(bucketRow.locator('dd')).toHaveText(String(bucket.count));
        }
      }
      await expect(page.getByRole('button',{name:'Cancel campaign',exact:true})).toHaveCount(['scheduled','sending','dst'].includes(id)?1:0);
      if(id==='scheduled') await expect(page.locator('.step-results').getByText(/Dispatches in/)).toHaveCount(3);
      if(id==='mixed') {await expect(page.getByText('Handed off',{exact:true})).toBeVisible();await expect(page.getByText('Accepted',{exact:true})).toBeVisible();await expect(page.getByText('Delivered',{exact:true})).toBeVisible();}
      if(id==='missed') {await expect(page.locator('.overall-result')).toContainText('1 message was not sent');await expect(page.locator('.step-results')).toContainText('Send window closed at');await expect(page.locator('.step-results')).toContainText('Queued records remain unsent');}
      if(id==='failed-before') {await expect(page.locator('.step-result-state')).toHaveText(['Failed','Sent','Sending']);await expect(page.locator('[data-step-id="failed-before-step-1"]')).toContainText('The email adapter is unavailable.');}
      if(id==='closed-partial') {await expect(page.locator('.overall-result')).toContainText('5 messages unsent');expect(detail.results.steps[0].expiredQueuedCount).toBe(4);expect(detail.results.steps[0].inFlightCount).toBe(0);}
      if(id==='closed-fence') {await expect(page.locator('.step-results')).toContainText('1 queued messages are with the provider');await expect(page.locator('.step-results')).not.toContainText('Queued records remain unsent');expect(detail.results.steps[0].inFlightCount).toBe(1);expect(detail.results.steps[0].expiredQueuedCount).toBe(0);await expect(page.locator('.overall-result')).not.toContainText('unsent');}
      if(id==='scheduled') {await expect(page.locator('.action-notice[role="status"]')).toHaveText('Campaign approved and scheduled.');await expect(page.locator('#audience-snapshot-title')).toContainText('Saved');}
      await expect(page.getByLabel('Saved audience rule',{exact:true})).toHaveText(detail.revision.audienceRule);
      if(id==='partial') await expect(page.getByText('Skipped — send window closed',{exact:true})).toBeVisible();
      if(id==='cancelled') await expect(page.getByText('Waiting for confirmation',{exact:true})).toBeVisible();
      if(id==='failed') await expect(page.locator('.step-results')).toContainText('The email adapter is unavailable.');
      if(id==='dst') {await expect(page.locator('.step-results')).toContainText('10:00 am');}
      await accessible(page,width);
    }
    expect(await seed(request,'counts')).toEqual(raw);
    await openPage(page,`${runtime.url}/app/campaigns/unapproved/scheduled`);
    await expect(page.getByText('This revision has not been approved. Its draft steps are not scheduled to send.')).toBeVisible();
    await expect(page.locator('.step-results')).toHaveCount(0);await expect(page.getByRole('link',{name:'Review and approve this draft'})).toHaveAttribute('href','/app/campaigns/unapproved/review');
    const draft=await (await page.request.get(`${runtime.url}/api/campaigns/unapproved`)).json();expect(draft.results).toBeUndefined();
    await expect(page.getByLabel('Saved audience rule',{exact:true})).toHaveText(draft.revision.audienceRule);await accessible(page,width);
    for(const id of ['mixed','cancelled','failed']) for(const suffix of ['', '/review']) {await openPage(page,`${runtime.url}/app/campaigns/${id}${suffix}`);await expect(page.getByRole('link',{name:'View schedule and results'})).toHaveAttribute('href',`/app/campaigns/${id}/scheduled`);}
    await exerciseCampaignReports(page,request,runtime,width,test.info());
    await exerciseRetention(page,request,runtime,width,test.info());
  };
export const walk4 = async({page,request})=>{
  await seed(request,'outcomes');await login(page,request);await openPage(page,`${runtime.url}/app/campaigns/sending/scheduled`);
  const trigger=page.getByRole('button',{name:'Cancel campaign',exact:true});await trigger.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('alertdialog');await expect(dialog).toBeVisible();
   {await page.setViewportSize({width,height:900});await page.screenshot({path:test.info().outputPath(`cancel-dialog-${width}.png`),fullPage:true});}
  for(let i=0;i<5;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);}
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
  await trigger.click();await page.getByRole('button',{name:'Confirm cancellation',exact:true}).click();await expect(page.locator('.action-notice[role="status"]')).toContainText('Campaign cancelled');await expect(trigger).toHaveCount(0);
  const detail=await (await page.request.get(`${runtime.url}/api/campaigns/sending`)).json();expect(detail.campaign.state).toBe('cancelled');expect(detail.results.steps[0].counts).toContainEqual({disposition:'skipped',reason:'campaign-cancelled',count:1});expect(detail.results.steps[0].counts).toContainEqual({disposition:'accepted',reason:null,count:1});expect(detail.results.steps[0].counts).toContainEqual({disposition:'handoff-unknown',reason:null,count:1});
};
