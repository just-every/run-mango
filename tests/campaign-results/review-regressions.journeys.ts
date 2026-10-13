import { expect } from '@playwright/test';
import { test, contract, runtime } from './runtime-fixture';
import { fixedNow } from './fixtures';

async function open(page:any) {
  const headers = {'X-Test-Token':runtime.token};
  expect((await page.request.post(`${runtime.url}/_results/outcomes`,{headers})).status()).toBe(200);
  const response = await page.request.post(`${runtime.url}/_results/open`,{headers});
  expect(response.status()).toBe(200);
  const {token} = await response.json();
  await page.context().addCookies([{name:'operator_session_local',value:token,domain:'127.0.0.1',path:'/'}]);
  await page.clock.install({time:fixedNow});
}
contract('RESULT-001', 'scheduled and missed steps use the store zone when saved step zones differ', async ({page}) => {
  await open(page);
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    await page.goto(`${runtime.url}/app/campaigns/dst/scheduled`);
    const row = page.locator('[data-step-id="dst-step-1"]');
    await expect(row.locator('time').first()).toContainText('10:00 am AEST');
    await expect(row).toContainText('Australia/Brisbane');
    await expect(row).toContainText('Resolved UTC:');
    await expect(row).toContainText('12:00 am UTC');
    await expect(row.locator('time').nth(1)).toContainText('9:00 pm AEST');
    await expect(row).toContainText('Resolved UTC deadline:');
    await expect(row).toContainText('11:00 am UTC');
  }
  await runtime.sql("UPDATE campaign_steps SET timezone='Australia/Sydney' WHERE revision_id='missed-revision'");
  await page.goto(`${runtime.url}/app/campaigns/missed/scheduled`);
  await expect(page.locator('.overall-result')).toContainText('1:00 pm AEST');
  await expect(page.locator('.step-results time').nth(1)).toContainText('1:00 pm AEST');
});
contract('RESULT-001', 'pending step timing includes due and overdue open windows and excludes completed or closed steps', async ({page}) => {
  await open(page);
  const deadline = Date.parse('2031-10-05T11:00:00Z');
  await runtime.sql(`UPDATE campaign_steps SET send_by_at=${deadline} WHERE revision_id='missed-revision'; UPDATE recipient_steps SET send_by_at=${deadline} WHERE campaign_id='missed';`);
  for (const instant of ['2031-10-05T04:00:00Z','2031-10-05T03:00:00Z','2031-10-05T02:00:00Z']) {
    await runtime.sql(`UPDATE campaign_steps SET scheduled_at=${Date.parse(instant)} WHERE revision_id='missed-revision'`);
    const response = await page.request.get(`${runtime.url}/api/campaigns`);
    expect(response.status()).toBe(200);
    const row = (await response.json()).campaigns.find((row:any) => row.id==='missed');
    expect(row.nextScheduledAt).toBe(new Date(instant).toISOString());
    expect(row.lastOutcome).toBeNull();
  }
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    await page.goto(`${runtime.url}/app/campaigns`);
    await expect(page.locator('.campaign-row').filter({hasText:'Campaign missed'}).locator('small')).toContainText('Next:');
    await expect(page.locator('.campaign-row').filter({hasText:'Campaign missed'}).locator('small')).toContainText('12:00 pm AEST');
  }
  await runtime.sql("INSERT INTO step_dispatches(step_id,revision_id,state,started_at,completed_at,created_at,updated_at) VALUES('missed-step-1','missed-revision','completed',1,2,1,2); UPDATE recipient_steps SET transport_disposition='accepted' WHERE campaign_id='missed'");
  let row = (await (await page.request.get(`${runtime.url}/api/campaigns`)).json()).campaigns.find((row:any) => row.id==='missed');
  expect(row.nextScheduledAt).toBeNull();
  expect(row.lastOutcome).toBe('accepted');
  await runtime.sql(`DELETE FROM step_dispatches WHERE step_id='missed-step-1'; UPDATE campaign_steps SET send_by_at=${+fixedNow} WHERE revision_id='missed-revision'`);
  row = (await (await page.request.get(`${runtime.url}/api/campaigns`)).json()).campaigns.find((row:any) => row.id==='missed');
  expect(row.nextScheduledAt).toBeNull();
});
