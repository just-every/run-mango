import {capturePropertyScreen} from './custom-property-proof';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {openPage} from '../support/navigation';
import {json,draftCampaign,approve,dispatch,type Installation} from './harness';
import type {providerEdge} from './edge';
export async function provePropertyRulesAndPreview(site:Installation,cookie:string,page:Page,info:TestInfo,edge:Awaited<ReturnType<typeof providerEdge>>,fixture:{contacts:any[];emails:string[];dateKey:string;moneyKey:string}) {
  const {contacts,emails,dateKey,moneyKey}=fixture;
  await page.setViewportSize({width:1440,height:1000});await openPage(page,site.runtime.url+'/app/audience');
  await page.getByRole('button',{name:'Create segment',exact:true}).click();await page.getByLabel('Segment name',{exact:true}).fill('synthetic-mango-1407 date segment');
  await page.getByLabel('Include 1 field',{exact:true}).selectOption('contact:property');await page.getByLabel('Include 1 property name',{exact:true}).fill(dateKey);await page.getByLabel('Include 1 comparison',{exact:true}).selectOption('on');await page.getByLabel('Include 1 value',{exact:true}).fill('2026-04-15');
  await capturePropertyScreen(page,info,'date-segment',page.getByRole('region',{name:'Saved segments',exact:true}));
  await page.getByRole('button',{name:'Save segment',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Segment saved.'})).toBeVisible();
  const segment=(await json(await site.call('/api/audience/segments',{cookie}),200)).segments.find((s:any)=>s.name==='synthetic-mango-1407 date segment');
  for(const contact of contacts){const detail=await json(await site.call('/api/contacts/'+contact.id,{cookie}),200);expect(detail.profile.segments).toContainEqual({id:segment.id,name:segment.name,state:'member'});}
  const rows=await site.rows("SELECT id FROM contacts WHERE email='synthetic-mango-1403@example.test'");const excluded=await json(await site.call('/api/contacts/'+rows[0].id,{cookie}),200);expect(excluded.profile.segments.some((s:any)=>s.id===segment.id)).toBe(false);
  await site.control('/_golive/sender-evidence');
  const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000);
  const campaign=await draftCampaign(site,cookie,'synthetic-mango-1408',emails,due);
  await json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie,body:{inclusionRuleJson:segment.inclusionRuleJson,emailSubject:'Your budget',emailBody:`<p>Budget {{${moneyKey} | fallback: "No budget"}}; date {{${dateKey} | fallback: "No date"}}.</p>`}}),200);
  const review=await json(await site.call('/api/campaigns/'+campaign.campaignId+'/checks',{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
  expect(review.candidateCount).toBe(contacts.length);expect(review.eligibleCount).toBe(contacts.length);expect(review.channelCounts).toEqual([{channel:'email',eligibleContactCount:contacts.length,fallbackContactCount:1,recipientStepCount:contacts.length}]);
  await openPage(page,site.runtime.url+'/app/campaigns/'+campaign.campaignId+'/review');
  await page.getByText('Preview as a contact',{exact:true}).click();await page.getByLabel('Contact email or phone',{exact:true}).fill(emails[0]);await page.getByRole('button',{name:'Find preview contact',exact:true}).click();await page.getByLabel('Preview contact',{exact:true}).selectOption(contacts[0].id);
  await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('Budget $2,345.67; date 2026-04-15.');
  await capturePropertyScreen(page,info,'money-preview',page.locator('.message-preview--email'));
  await page.getByLabel('Contact email or phone',{exact:true}).fill(emails[1]);await page.getByRole('button',{name:'Find preview contact',exact:true}).click();await page.getByLabel('Preview contact',{exact:true}).selectOption(contacts[1].id);
  await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('Budget No budget; date 2026-04-15.');
  await json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie,body:{emailBody:`<p>{{${moneyKey}}}</p>`}}),200);
  const invalid=await json(await site.call('/api/campaigns/'+campaign.campaignId+'/checks',{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);expect(invalid.checks.some((c:any)=>c.kind==='message.personalisation'&&c.blocking)).toBe(true);
  await json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie,body:{emailBody:`<p>Budget {{${moneyKey} | fallback: "No budget"}}; date {{${dateKey} | fallback: "No date"}}.</p>`}}),200);
  await approve(site,cookie,campaign);await site.control('/_golive/clock',{advanceMs:3600001,hold:false});const sent=await dispatch(site,campaign.campaignId,due);expect(sent.every(row=>row.transport_disposition==='accepted')).toBe(true);
  for(const [email,value] of [[emails[0],'$2,345.67'],[emails[1],'No budget']]){const message=edge.sends.findLast(send=>send.to===email&&send.body.headers?.['List-Unsubscribe'])!;expect(message.body.content.find((c:any)=>c.type==='text/html').value).toContain('Budget '+value);}
}
