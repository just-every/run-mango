import { expect, type Page, type TestInfo } from '@playwright/test';
import { openPage, hydrated } from '../support/navigation';

/** One reuse journey, shared by the existing desktop/mobile authoring case. */
export async function exerciseCampaignReuse(page:Page, sourceId:string, baseURL:string, width:number, info:TestInfo, sql:(command:string)=>Promise<unknown>) {
  const read=async(id:string)=>(await page.request.get(`${baseURL}/api/campaigns/${id}`)).json();
  const original=await read(sourceId);
  await openPage(page,`${baseURL}/app/campaigns/${sourceId}`);
  await page.getByText('Save as a template',{exact:true}).click();
  await page.getByLabel('Template name',{exact:true}).fill(`Garden letter ${width}`);
  await page.getByRole('button',{name:'Save template',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Template saved.'})).toBeVisible();
  const library=await (await page.request.get(`${baseURL}/api/campaign-templates`)).json();
  const template=library.templates.find((item:any)=>item.name===`Garden letter ${width}`);
  expect(template.kind).toBe('saved');
  await page.getByRole('button',{name:'Duplicate',exact:true}).click();
  await expect(page.getByRole('heading',{name:`Copy of ${original.revision.name}`,exact:true})).toBeVisible();await hydrated(page);
  const copyId=new URL(page.url()).pathname.split('/')[3],copy=await read(copyId);
  expect(copy.campaign.state).toBe('draft');expect(copy.revision.state).toBe('draft');
  expect(copy.revision.emailBody).toBe(original.revision.emailBody);
  expect(copy.revision.inclusionRuleJson).toBe(original.revision.inclusionRuleJson);
  expect(copy.revision.fromEmail).toBe(original.revision.fromEmail);
  expect(copy.revision.trackingEnabled).toBe(original.revision.trackingEnabled);
  const emailCampaigns=await (await page.request.get(`${baseURL}/api/campaigns?channel=email`)).json();
  expect(emailCampaigns.campaigns.map((row:any)=>row.id)).toContain(copyId);
  expect(copy.revision.approvedAt).toBeNull();expect(copy.audience).toBeUndefined();expect(copy.results).toBeUndefined();expect(copy.steps).toEqual([]);
  expect(copy.revision.stepSettings).toEqual(original.steps.map(({channel,timezone,whyThisTime}:any)=>({channel,timezone,whyThisTime})));
  await expect(page.getByLabel('Local send date and time',{exact:true})).toHaveValue('');
  await page.getByLabel('Email subject',{exact:true}).fill('A new week in the garden');
  await page.getByLabel('Local send date and time',{exact:true}).fill('2031-05-07T10:00');
  await page.getByRole('button',{name:'Save full draft',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
  await page.getByRole('button',{name:'Approve & schedule',exact:true}).click();
  await page.getByRole('alertdialog').getByRole('button',{name:'Approve & schedule'}).click();
  await expect(page.getByRole('status').filter({hasText:'exact saved revision is approved'})).toBeVisible();
  expect((await read(copyId)).revision.emailSubject).toBe('A new week in the garden');
  expect((await read(sourceId)).revision).toEqual(original.revision);expect((await read(sourceId)).results.steps).toEqual(original.results.steps);
  await openPage(page,`${baseURL}/app/campaigns`);await page.getByRole('button',{name:'New campaign',exact:true}).click();
  await page.getByRole('button',{name:`Use Garden letter ${width}`,exact:true}).click();
  await expect(page.getByRole('heading',{name:`Garden letter ${width}`,exact:true})).toBeVisible();await hydrated(page);
  const fromId=new URL(page.url()).pathname.split('/')[3],from=await read(fromId);
  expect(from.revision.emailBody).toBe(original.revision.emailBody);expect(from.steps).toEqual([]);
  await page.getByLabel('Email subject',{exact:true}).fill('A better template subject');
  await page.getByLabel('Local send date and time',{exact:true}).fill('2031-06-07T10:00');
  await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
  await page.getByText('Save as a template',{exact:true}).click();
  await page.getByLabel('Template name',{exact:true}).fill(`Garden letter ${width}`);
  await page.getByLabel('Save to template',{exact:true}).selectOption(template.id);
  await page.getByRole('button',{name:'Update template',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Template saved.'})).toBeVisible();
  const next=await page.request.post(`${baseURL}/api/campaign-templates/${template.id}/start`);expect(next.status()).toBe(201);
  const nextId=(await next.json()).campaignId;expect((await read(nextId)).revision.emailSubject).toBe('A better template subject');
  expect((await read(sourceId)).revision).toEqual(original.revision);expect((await read(copyId)).revision.emailSubject).toBe('A new week in the garden');
  // Arrange historical campaign states in the test database. Every copy still enters through the private API.
  for(const sourceState of ['completed','cancelled','dispatching','paused','failed']) {
    await sql(`UPDATE campaigns SET state='${sourceState}' WHERE id='${sourceId}'`);
    const duplicated=await page.request.post(`${baseURL}/api/campaigns/${sourceId}/duplicate`);expect(duplicated.status()).toBe(201);
    const historicalCopy=await read((await duplicated.json()).campaignId);
    expect(historicalCopy.revision.emailBody).toBe(original.revision.emailBody);
    expect(historicalCopy.revision.approvedAt).toBeNull();expect(historicalCopy.steps).toEqual([]);expect(historicalCopy.results).toBeUndefined();
    expect((await read(sourceId)).revision).toEqual(original.revision);
  }
  await sql(`UPDATE campaigns SET state='${original.campaign.state}' WHERE id='${sourceId}'`);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`reuse-template-${width}.png`),fullPage:true});
}
