import {expect, test} from '@playwright/test';
import {stepDeadlineDispatchJourney} from './step-deadline-dispatch-journey';
import {authoringRuntime} from './browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';
import {openPage, reloadPage} from '../support/navigation';

// Independent calendar expectations: New York is UTC minus five in January,
// changes from minus five to minus four on March 14, and back on November 7.
// Start before each transition so adding a fixed duration cannot supply the end.
const days = [
  {local:'2032-01-15T00:30', scheduled:'2032-01-15T05:30:00.000Z', deadline:'2032-01-16T04:59:00.000Z', overrideLocal:'2032-01-15T18:45', override:'2032-01-15T23:45:00.000Z'},
  {local:'2032-03-14T00:30', scheduled:'2032-03-14T05:30:00.000Z', deadline:'2032-03-15T03:59:00.000Z', overrideLocal:'2032-03-14T18:45', override:'2032-03-14T22:45:00.000Z'},
  {local:'2032-11-07T00:30', scheduled:'2032-11-07T04:30:00.000Z', deadline:'2032-11-08T04:59:00.000Z', overrideLocal:'2032-11-07T18:45', override:'2032-11-07T23:45:00.000Z'},
];

test('[CAMP-010] native deadline defaults and expired dispatch stay safe through authoring, Cron and Queue', async ({browser, request}, info) => {
  test.setTimeout(240000);
  const runtime = await authoringRuntime({suite:'step-deadline'});
  const context = await browser.newContext({viewport:{width:1440,height:1000}, timezoneId:'Asia/Tokyo'});
  try {
    const opened = await request.post(runtime.url+'/_authoring/open', {headers:{'X-Test-Token':runtime.token}});
    expect(opened.status(), await opened.text()).toBe(200);
    const token = (await opened.json()).token;
    const headers = {Cookie:`${localSessionCookieName(runtime.url)}=${token}`, Origin:runtime.url};
    await context.addCookies([{name:localSessionCookieName(runtime.url), value:token, url:runtime.url}]);
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const created = await request.post(runtime.url+'/api/campaigns', {headers, data:{}});
    expect(created.status(), await created.text()).toBe(201);
    const {campaignId, revisionId} = await created.json();
    const expected = days.map((day, index) => ({sequence:index+1, channel:'email', timezone:'America/New_York', scheduledAt:day.scheduled, sendByAt:day.deadline}));
    const steps = days.map(day => ({channel:'email', timezone:'America/New_York', localScheduledAt:day.local, whyThisTime:'Selected by the operator.'}));
    // Neither sendByAt nor localSendByAt is sent. In particular the editor has
    // not filled either value before this native save reaches the schema.
    const saved = await request.patch(`${runtime.url}/api/campaign-revisions/${revisionId}`, {headers, data:{name:'synthetic-mango-493', steps}});
    expect(saved.status(), await saved.text()).toBe(200);
    expect((await saved.json()).composition.steps).toMatchObject(expected);

    const read = async () => {
      for (const suffix of ['', '/review']) {
        const response = await request.get(`${runtime.url}/api/campaigns/${campaignId}${suffix}`, {headers});
        expect(response.status(), await response.text()).toBe(200);
        const detail = await response.json();
        expect(detail.campaign).toMatchObject({state:'draft', activeRevisionId:revisionId});
        expect(detail.revision).toMatchObject({id:revisionId, state:'draft'});
        expect(detail.steps).toHaveLength(days.length);
        expect(detail.steps).toMatchObject(expected);
      }
    };
    const persisted = async () => runtime.sql(`SELECT sequence,channel,timezone,scheduled_at,send_by_at FROM campaign_steps WHERE revision_id='${revisionId}' ORDER BY sequence`);
    const expectedRows = days.map((day,index) => ({sequence:index+1, channel:'email', timezone:'America/New_York', scheduled_at:Date.parse(day.scheduled), send_by_at:Date.parse(day.deadline)}));
    const noAuthority = async () => {
      const response = await request.get(runtime.url+'/_authoring/state', {headers:{'X-Test-Token':runtime.token}});
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({jobs:[], recipients:[], approvals:[]});
    };
    await read();
    expect(await persisted()).toEqual(expectedRows);
    await noAuthority();
    const controls = async () => {
      await expect(page.getByRole('combobox', {name:'Time zone', exact:true})).toHaveCount(days.length);
      for (const [index, day] of days.entries()) {
        await expect(page.getByRole('combobox', {name:'Time zone', exact:true}).nth(index)).toHaveValue('America/New_York');
        await expect(page.getByLabel('Local send date and time', {exact:true}).nth(index)).toHaveValue(day.local);
        await expect(page.getByLabel('Local send-by date and time', {exact:true}).nth(index)).toHaveValue(day.local.slice(0,10)+'T23:59');
      }
    };
    const url = `${runtime.url}/app/campaigns/${campaignId}/review`;
    await openPage(page, url);
    await controls();
    await reloadPage(page);
    await controls();
    await page.goto(runtime.url+'/app/campaigns');
    await openPage(page, url);
    await controls();
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({fullPage:true, path:info.outputPath('step-deadline-1440.png')});
    // Assertions run at 1440. The phone capture reopens the same saved screen,
    // without granting approval or submitting the editor's explicit deadlines.
    await page.setViewportSize({width:390,height:844});
    await reloadPage(page);
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({fullPage:true, path:info.outputPath('step-deadline-390.png')});
    await read();
    expect(await persisted()).toEqual(expectedRows);
    await noAuthority();
    // Complete-create and PATCH use the same public composition contract.
    // A UTC-only client has an unambiguous instant, while its deadline still
    // belongs to the selected zone's calendar day rather than the browser day.
    const base = (await (await request.get(`${runtime.url}/api/campaigns/${campaignId}`, {headers})).json()).revision;
    for (const mode of ['local', 'instant'] as const) {
      const selected = (['email', 'sms'] as const).flatMap(channel => days.map(day => ({
        channel, timezone:'America/New_York', whyThisTime:'Selected by the operator.',
        ...(mode === 'local' ? {localScheduledAt:day.local} : {scheduledAt:day.scheduled}),
      })));
      const matrixExpected = (['email', 'sms'] as const).flatMap(channel => days.map(day => ({
        channel, timezone:'America/New_York', scheduledAt:day.scheduled, sendByAt:day.deadline,
      }))).map((step, index) => ({...step, sequence:index+1}));
      const complete = await request.post(runtime.url+'/api/campaigns', {headers, data:{composition:{
        name:'synthetic-mango-500', emailSubject:'Synthetic deadline letter',
        smsBody:'Synthetic garden news.', emailBody:'<p>Synthetic garden news.</p><p>{{physical_address}} {{unsubscribe_url}}</p>', emailText:'Synthetic garden news. {{physical_address}} {{unsubscribe_url}}',
        senderName:'Synthetic garden', fromEmail:['synthetic-mango-500','example.test'].join('@'), replyToEmail:['synthetic-mango-501','example.test'].join('@'),
        physicalAddress:'1 Synthetic Street', messageCategory:'newsletter',
        inclusionRuleJson:base.inclusionRuleJson, steps:selected,
      }}});
      expect(complete.status(), mode+': '+await complete.text()).toBe(201);
      const draft = await complete.json();
      const checkMatrix = async () => {
        for (const suffix of ['', '/review']) {
          const response = await request.get(`${runtime.url}/api/campaigns/${draft.campaignId}${suffix}`, {headers});
          expect(response.status(), await response.text()).toBe(200);
          const value = await response.json();
          expect(value.campaign).toMatchObject({state:'draft', activeRevisionId:draft.revisionId});
          expect(value.revision).toMatchObject({state:'draft'});
          expect(value.steps).toHaveLength(matrixExpected.length);
          expect(value.steps).toMatchObject(matrixExpected);
        }
        expect(await runtime.sql(`SELECT sequence,channel,timezone,scheduled_at,send_by_at FROM campaign_steps WHERE revision_id='${draft.revisionId}' ORDER BY sequence`)).toEqual(
          matrixExpected.map(step => ({sequence:step.sequence, channel:step.channel, timezone:step.timezone,
            scheduled_at:Date.parse(step.scheduledAt), send_by_at:Date.parse(step.sendByAt)})));
        await noAuthority();
      };
      await checkMatrix();
      const patched = await request.patch(`${runtime.url}/api/campaign-revisions/${draft.revisionId}`, {headers, data:{steps:selected}});
      expect(patched.status(), await patched.text()).toBe(200);
      await checkMatrix();
      const explicit = selected.map((step, index) => ({...step, ...(mode==='local'
        ? {localSendByAt:days[index%days.length].overrideLocal}
        : {sendByAt:days[index%days.length].override})}));
      const override = await request.patch(`${runtime.url}/api/campaign-revisions/${draft.revisionId}`, {headers,data:{steps:explicit}});
      expect(override.status(), await override.text()).toBe(200);
      matrixExpected.forEach((step,index)=>{step.sendByAt=days[index%days.length].override;});
      await checkMatrix();
      const agreeing = explicit.map((step,index)=>({...step,localScheduledAt:days[index%days.length].local,
        scheduledAt:days[index%days.length].scheduled,localSendByAt:days[index%days.length].overrideLocal,
        sendByAt:days[index%days.length].override}));
      const agreed = await request.patch(`${runtime.url}/api/campaign-revisions/${draft.revisionId}`, {headers,data:{steps:agreeing}});
      expect(agreed.status(),await agreed.text()).toBe(200);
      await checkMatrix();
      // An explicit UTC instant must still agree when a local value is supplied.
      for (const field of ['scheduledAt', 'sendByAt'] as const) {
        const mismatched = explicit.map((step,index)=>({...step,localScheduledAt:days[index%days.length].local,
          localSendByAt:days[index%days.length].overrideLocal,[field]:'2032-01-01T00:00:00.000Z'}));
        const refused = await request.patch(`${runtime.url}/api/campaign-revisions/${draft.revisionId}`, {headers,data:{steps:mismatched}});
        expect(refused.status()).toBe(400);
        expect(await refused.text()).toContain('Local time and resolved UTC instant disagree.');
        await checkMatrix();
      }
      if (mode==='instant') {
        await page.setViewportSize({width:1440,height:1000});
        await openPage(page,`${runtime.url}/app/campaigns/${draft.campaignId}/review`);
        const save = async (scheduledAt:string) => {
          await expect(page.getByText('Unsaved changes. Save before approving.',{exact:true})).toBeVisible();
          const response = page.waitForResponse(value=>new URL(value.url()).pathname==='/api/campaign-revisions/'+draft.revisionId&&value.request().method()==='PATCH',{timeout:30000});
          await page.getByRole('button',{name:'Save full draft',exact:true}).click();
          const savedResponse = await response;
          expect(savedResponse.request().postDataJSON().steps[0].scheduledAt).toBe(scheduledAt);
          expect(savedResponse.status(),await savedResponse.text()).toBe(200);
          await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
          await reloadPage(page);
        };
        await page.getByLabel('Local send date and time',{exact:true}).first().fill('2032-01-15T01:30');
        await expect(page.getByLabel('Local send-by date and time',{exact:true}).first()).toHaveValue(days[0].overrideLocal);
        await save('2032-01-15T06:30:00.000Z');
        matrixExpected[0].scheduledAt='2032-01-15T06:30:00.000Z';
        await checkMatrix();
        await page.getByLabel('Local send-by date and time',{exact:true}).first().fill('2032-01-15T23:59');
        await page.getByLabel('Local send date and time',{exact:true}).first().fill('2032-01-16T12:15');
        await expect(page.getByLabel('Local send-by date and time',{exact:true}).first()).toHaveValue('2032-01-16T23:59');
        await save('2032-01-16T17:15:00.000Z');
        matrixExpected[0].scheduledAt='2032-01-16T17:15:00.000Z';
        matrixExpected[0].sendByAt='2032-01-17T04:59:00.000Z';
        await checkMatrix();
        await expect(page.getByLabel('Local send-by date and time',{exact:true}).first()).toHaveValue('2032-01-16T23:59');
      }
      console.log('Native deadline matrix passed: '+mode);
    }
    console.log('PROBE CAMP-010 acceptance-1 additional doors: complete-create and PATCH, email and SMS, local and UTC-only inputs -> independently specified ordinary and DST local-day-end deadlines; no approval, recipients or dispatch jobs.');
    console.log('PROBE CAMP-010 acceptance-1: authenticated native PATCH with local times and IANA zone, both send-by fields omitted -> ordinary and both DST day-end instants persisted; reopened controls; draft with no approval, recipients or dispatch jobs.');
    await stepDeadlineDispatchJourney(browser, info);
  } finally {
    await context.close();
    await runtime.close();
  }
});
