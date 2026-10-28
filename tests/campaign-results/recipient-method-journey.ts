import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {json,type Installation} from '../go-live/harness';
import type {providerEdge,EdgeSend} from '../go-live/edge';
import {parseCsv} from '../../src/core/features/audience/csv';
import {openPage} from '../support/navigation';

/** Real delivered unsubscribe links and signed SMS replies, followed by native erasure. */
export async function recipientMethodJourney(site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,cookie:string,sent:EdgeSend[],page:Page,info:TestInfo){
 const captures:Array<{campaignId:string;revisionId:string;recipientStepId:string;contactId:string;method:string;at:string}>=[];
 const read=async(campaignId:string,revisionId:string)=>json(await site.call(`/api/campaigns/${campaignId}/recipients?revisionId=${revisionId}&outcome=unsubscribed`,{cookie}),200);
 for(const [index,method] of ['link','one-click'].entries()){
  const message=sent[index],html=String(message.body.content.find((part:any)=>part.type==='text/html').value);
  const visible=/href="([^"]+\/unsubscribe\/(?!one-click)[^"]+)"/.exec(html)![1];
  const header=/<([^>]+)>/.exec(message.body.headers['List-Unsubscribe'])![1];
  const [{id:recipientStepId,campaign_id:campaignId,revision_id:revisionId,contact_id:contactId}]=await site.rows(`SELECT id,campaign_id,revision_id,contact_id FROM recipient_steps WHERE provider_message_id='${message.messageId}'`);
  expect((await site.call(new URL(visible).pathname)).status).toBe(200);
  expect((await read(campaignId,revisionId)).rows.some((row:any)=>row.recipientStepId===recipientStepId)).toBe(false);
  const path=new URL(method==='link'?visible:header).pathname,raw=method==='link'?'confirm=true':'List-Unsubscribe=One-Click';
  expect((await site.call(path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},raw})).status).toBe(200);
  const row=(await read(campaignId,revisionId)).rows.find((row:any)=>row.recipientStepId===recipientStepId);expect(row.unsubscribeMethod).toBe(method);expect(row.unsubscribedAt).toBeTruthy();
  await site.control('/_golive/clock',{advanceMs:1000});
  expect((await site.call(new URL(header).pathname,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},raw:'List-Unsubscribe=One-Click'})).status).toBe(200);
  expect((await read(campaignId,revisionId)).rows.find((row:any)=>row.recipientStepId===recipientStepId)).toMatchObject({unsubscribeMethod:method,unsubscribedAt:row.unsubscribedAt});
  captures.push({campaignId,revisionId,recipientStepId,contactId,method,at:row.unsubscribedAt});
 }
 const marketing=edge.sms.sends.findLast(send=>send.body.ignore_unsubscribes===false)!;
 const [{id:recipientStepId,campaign_id:campaignId,revision_id:revisionId,contact_id:contactId}]=await site.rows(`SELECT id,campaign_id,revision_id,contact_id FROM recipient_steps WHERE provider_message_id='${marketing.messageId}'`);
 const clock=await site.control('/_golive/clock');
 const payload={type:'inbound',to:marketing.body.messages[0].sender,sender:marketing.body.messages[0].to,message:'STOP',received_at:new Date(clock.now).toISOString().slice(0,19).replace('T',' '),original_message_id:marketing.messageId,original_custom_ref:marketing.body.messages[0].custom_ref};
 const signed=edge.sms.signed(payload,clock.now);
 for(let repeat=0;repeat<2;repeat++)expect((await site.call('/webhooks/sms/mobile-message',{method:'POST',headers:signed.headers,raw:signed.body})).status).toBe(204);
 const reply=(await read(campaignId,revisionId)).rows.find((row:any)=>row.recipientStepId===recipientStepId);expect(reply).toMatchObject({unsubscribeMethod:'reply',unsubscribedAt:new Date(Date.parse(payload.received_at.replace(' ','T')+'Z')).toISOString()});
 captures.push({campaignId,revisionId,recipientStepId,contactId,method:'reply',at:reply.unsubscribedAt});
 for(const capture of captures){
  const csv=parseCsv(await(await site.call(`/api/campaigns/${capture.campaignId}/recipients?revisionId=${capture.revisionId}&outcome=unsubscribed&format=csv`,{cookie})).text());
  expect(csv.find(row=>row['recipient-step id']===capture.recipientStepId)).toMatchObject({'unsubscribe method':capture.method,'message unsubscribe at':capture.at});
 }
 await page.context().clearCookies();await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
 for(const capture of [captures[0],captures[2]])for(const width of [1440]){
  await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+`/app/campaigns/${capture.campaignId}/scheduled`);
  await expect(page.getByLabel('Recipient outcome',{exact:true})).toBeVisible();await page.getByLabel('Recipient outcome',{exact:true}).selectOption('unsubscribed');const table=page.getByRole('table',{name:'Recipient outcomes'});
  for(const expected of captures.filter(row=>row.campaignId===capture.campaignId))await expect(table).toContainText(expected.method);
  await table.scrollIntoViewIfNeeded();await table.screenshot({path:info.outputPath(`unsubscribe-${capture.method==='reply'?'reply':'methods'}-${width}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).exclude('iframe').analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 }
 for(const capture of captures){
  const before=await read(capture.campaignId,capture.revisionId);
  let response=await site.call('/api/contacts/'+capture.contactId,{method:'DELETE',cookie}),body=await response.json();
  for(let turn=0;response.status===202&&turn<400;turn++){response=await site.call('/api/audience/erasures/'+body.receipt.reference+'/resume',{method:'POST',cookie,body:{}});body=await response.json();}expect(response.status,JSON.stringify(body)).toBe(200);
  const after=await read(capture.campaignId,capture.revisionId);expect(after.total).toBe(before.total);
  expect(after.rows.find((row:any)=>row.recipientStepId===capture.recipientStepId)).toMatchObject({contactId:null,destination:null,unsubscribeMethod:capture.method,unsubscribedAt:capture.at});
  const performance=await json(await site.call('/api/insights/campaign-performance',{cookie}),200);
  expect(performance.rows.filter((row:any)=>row.campaignId===capture.campaignId).reduce((n:number,row:any)=>n+row.unsubscribes,0)).toBe(after.total);
 }
 for(const width of [1440]){
  await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+`/app/campaigns/${captures[0].campaignId}/scheduled`);
  await expect(page.getByLabel('Recipient outcome',{exact:true})).toBeVisible();await page.getByLabel('Recipient outcome',{exact:true}).selectOption('unsubscribed');const table=page.getByRole('table',{name:'Recipient outcomes'});await expect(table).toContainText('Erased contact');await expect(table).toContainText('Anonymous');await expect(table).toContainText('one-click');await expect(table).toContainText('link');
  await table.scrollIntoViewIfNeeded();await table.screenshot({path:info.outputPath(`unsubscribe-anonymous-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 }
}
