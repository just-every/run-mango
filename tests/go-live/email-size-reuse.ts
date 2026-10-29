import {expect,type Page,type TestInfo} from '@playwright/test';
import {json,type Installation} from './harness';
import {openCampaignStarters,openPage} from '../support/navigation';

/** All existing reuse writes share the sent-size refusal and leave snapshots intact. */
export async function oversizedReuse(site:Installation,cookie:string,page:Page,info:TestInfo,campaign:{campaignId:string;revisionId:string},templateId:string) {
  const before=await site.count('campaigns');
  const source=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
  const templates=await site.rows('SELECT * FROM campaign_templates ORDER BY id');
  const savedTemplate=templates.find(row=>row.id===templateId)!;
  const followups=await site.count('campaign_followups');
  const inputs=[
    [`/api/campaigns/${campaign.campaignId}/duplicate`,{}],
    [`/api/campaigns/${campaign.campaignId}/edit-schedule`,{}],
    ['/api/campaign-templates',{revisionId:campaign.revisionId,name:'Refused garden template'}],
    ['/api/campaign-templates',{revisionId:campaign.revisionId,name:'Refused replacement',templateId,updatedAt:savedTemplate.updated_at}],
    [`/api/campaign-templates/${templateId}/start`,{}],
    [`/api/campaigns/${campaign.campaignId}/followup`,{subject:'Garden follow-up',delayHours:1,metric:'click'}],
  ] as const;
  for(const [path,body] of inputs) {
    const refused=await json(await site.call(path,{method:'POST',cookie,body}),400);
    expect(refused).toMatchObject({error:'email_too_large',size:{exceedsLimit:true}});
    expect(refused.size.htmlBytes).toBeGreaterThan(refused.size.limitBytes);
    expect(refused.detail).toContain(String(refused.size.htmlBytes));
    expect(refused.detail).toContain(String(refused.size.limitBytes));
    expect(refused.size.largestBlocks).toHaveLength(3);
    expect(refused.size.largestBlocks[0].bytes).toBeGreaterThan(refused.size.limitBytes);
    for(const block of refused.size.largestBlocks)expect(refused.detail).toContain(`${block.location}: ${block.bytes} bytes`);
  }
  for(const width of [1440]) {
    await page.setViewportSize({width,height:1000});
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}`);
    await page.getByRole('button',{name:'Duplicate',exact:true}).click();
    await expect(page.getByRole('alert').filter({hasText:'Email is too large.'})).toBeVisible();
    await page.getByText('Save as a template',{exact:true}).click();
    await page.getByLabel('Template name',{exact:true}).fill('Refused garden template');
    await page.getByRole('button',{name:'Save template',exact:true}).click();
    await expect(page.getByRole('alert').filter({hasText:'Email is too large.'})).toHaveCount(2);
    await expect(page.getByLabel('Template name',{exact:true})).toHaveValue('Refused garden template');
    await page.getByRole('button',{name:'Create a new campaign from this revision',exact:true}).click();
    await expect(page.getByRole('alert').filter({hasText:'Email is too large.'})).toHaveCount(3);
    for(const [index,alert] of (await page.getByRole('alert').filter({hasText:'Email is too large.'}).all()).entries()) {
      await expect(alert).toContainText('Largest blocks:');
      await alert.screenshot({path:info.outputPath(`reuse-refused-${index}-${width}.png`)});
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
    await page.getByText('Follow up with non-engaged readers',{exact:true}).click();
    await page.getByLabel('New follow-up subject',{exact:true}).fill('Garden follow-up');
    await page.getByLabel('Follow-up delay hours',{exact:true}).fill('1');
    // Observe the refusing write itself before asserting its rendered diagnostic.
    // A slow response must not spend the alert assertion's rendering budget.
    const [response]=await Promise.all([
      page.waitForResponse(response=>response.url()===`${site.runtime.url}/api/campaigns/${campaign.campaignId}/followup`&&response.request().method()==='POST'),
      page.getByRole('button',{name:'Create follow-up draft',exact:true}).click(),
    ]);
    expect(response.request().postDataJSON()).toEqual({subject:'Garden follow-up',delayHours:1,metric:'click'});
    expect(response.status()).toBe(400);
    const refused=await response.json();
    expect(refused).toMatchObject({error:'email_too_large',size:{exceedsLimit:true}});
    expect(refused.size.htmlBytes).toBeGreaterThan(refused.size.limitBytes);
    expect(refused.size.largestBlocks).toHaveLength(3);
    await info.attach(`followup-response-${width}`,{body:JSON.stringify({status:response.status(),...refused}),contentType:'application/json'});
    await expect(page.getByRole('alert').filter({hasText:'Email is too large.'})).toHaveCount(1);
    await expect(page.getByRole('alert').filter({hasText:'Email is too large.'})).toHaveText(refused.detail);
    await expect(page.getByLabel('Follow-up delay hours',{exact:true})).toHaveValue('1');
    await expect(page.getByLabel('New follow-up subject',{exact:true})).toHaveValue('Garden follow-up');
    for(const [index,alert] of (await page.getByRole('alert').filter({hasText:'Email is too large.'}).all()).entries()) {
      await expect(alert).toContainText('Largest blocks:');
      await alert.screenshot({path:info.outputPath(`followup-refused-${index}-${width}.png`)});
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await openPage(page,`${site.runtime.url}/app/campaigns`);
    await openCampaignStarters(page);
    await page.getByRole('button',{name:'Use Large garden letter',exact:true}).click();
    const alert=page.getByRole('alert').filter({hasText:'Email is too large.'});
    await expect(alert).toContainText('Largest blocks:');
    await alert.screenshot({path:info.outputPath(`template-start-refused-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  expect(await site.count('campaigns')).toBe(before);
  expect(await site.count('campaign_followups')).toBe(followups);
  expect(await site.rows('SELECT * FROM campaign_templates ORDER BY id')).toEqual(templates);
  expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200)).revision).toEqual(source.revision);
}
