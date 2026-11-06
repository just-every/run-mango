import {expect,type Page} from '@playwright/test';
import {json,type Installation} from '../go-live/harness';
import {reloadPage} from '../support/navigation';

/** One saved letter exercises the other recorded fact sources through native preview and delivery. */
export async function conditionalSourcesJourney(page:Page,site:Installation,cookie:string,draft:{campaignId:string;revisionId:string},vipId:string,regularId:string) {
  await json(await site.call('/api/settings/properties',{method:'POST',cookie,body:{key:'predicted_stage',label:'Recorded predicted stage',type:'text'}}),201);
  for(const [id,value] of [[vipId,'champion'],[regularId,'new']])await json(await site.call(`/api/contacts/${id}/properties`,{method:'PUT',cookie,body:{fields:{predicted_stage:value}}}),200);
  const key=await json(await site.call('/api/settings/integrations',{method:'POST',cookie,body:{name:'Synthetic garden events',scopes:['events:write']}}),201);
  const at=(await site.control('/_golive/clock')).now;
  const input={name:'garden.requested',contactId:vipId,idempotencyKey:'synthetic-mango-503',occurredAt:new Date(at-1000).toISOString(),properties:{reward:'seeds'}};
  const event=await json(await site.call('/api/integrations/v1/events',{method:'POST',headers:{Authorization:`Bearer ${key.token}`},body:input}),200);
  // Arrange a single-event campaign proposal, as the native proposal producer
  // records it. The event itself entered through the public integration API.
  await site.runtime.sql(`INSERT INTO proposals(id,state,title,summary,evidence,audience_rule,source_data_as_of,send_by_at,trigger_events_json,created_at,updated_at) VALUES ('synthetic-mango-503','proposed','Synthetic garden event','Synthetic garden event','Synthetic event','Named contacts',${at},${at+86400000},'${JSON.stringify([event.id])}',${at},${at})`);
  await site.runtime.sql(`UPDATE campaigns SET proposal_id='synthetic-mango-503' WHERE id='${draft.campaignId}'`);
  const read=async()=>(await json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie}),200)).revision;
  const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const block=(source:string,key:string,value:string|boolean,yes:string,no:string)=>`<div data-mango-condition="${escape(JSON.stringify({source,key,comparator:'eq',value}))}"><div data-mango-branch="match"><p>${yes}</p></div><div data-mango-branch="otherwise">${no?'<p>'+no+'</p>':''}</div></div>`;
  const revision=await read();
  const body=revision.emailBody+block('topic','newsletter',true,'Newsletter growing tips','')+block('predicted-stage','predicted_stage','champion','Champion garden preview','First season garden notes')+block('event','properties.reward','seeds','Order bonus: seed packet','Browse seed packets');
  await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:body}}),200);
  const vip=await json(await site.call(`/api/contacts/${vipId}/content-context?revisionId=${draft.revisionId}`,{cookie}),200);
  expect(vip.contentContext.event.properties.reward).toBe('seeds');
  expect(vip.contentContext.properties.predicted_stage).toBe('champion');
  const regular=await json(await site.call(`/api/contacts/${regularId}/content-context?revisionId=${draft.revisionId}`,{cookie}),200);expect(regular.contentContext.event).toBeUndefined();
  await reloadPage(page);
  const previews=page.getByRole('region',{name:'Saved revision previews',exact:true}),html=page.frameLocator('iframe[title="Saved email preview"]'),plain=previews.locator('.message-preview--plain');
  await previews.getByText('Preview as a contact',{exact:true}).click();await previews.getByLabel('Contact email or phone',{exact:true}).fill('synthetic-mango-50');await previews.getByRole('button',{name:'Find preview contact',exact:true}).click();
  const select=previews.getByRole('combobox',{name:'Preview contact',exact:true});await expect(select.getByRole('option')).toHaveCount(3);
  for(const [id,shown,hidden] of [[vipId,['Champion garden preview','Order bonus: seed packet'],['First season garden notes','Browse seed packets']],[regularId,['First season garden notes','Browse seed packets'],['Champion garden preview','Order bonus: seed packet']]] as const) {
    await select.selectOption(id);
    for(const value of ['Newsletter growing tips',...shown]){await expect(html.getByText(value,{exact:true})).toBeVisible();await expect(plain).toContainText(value);}
    for(const value of hidden){await expect(html.getByText(value,{exact:true})).toHaveCount(0);await expect(plain).not.toContainText(value);}
  }
  // Each branch remains inspectable when the chosen contact would take the other one.
  for(const [index,yes,no] of [[3,'Champion garden preview','First season garden notes'],[4,'Order bonus: seed packet','Browse seed packets']] as const) {
    await previews.getByRole('combobox',{name:'Preview conditional branch',exact:true}).selectOption('match:'+index);await expect(html.getByText(yes,{exact:true})).toBeVisible();await expect(plain).toContainText(yes);await expect(plain).not.toContainText(no);
    await previews.getByRole('combobox',{name:'Preview conditional branch',exact:true}).selectOption('otherwise:'+index);await expect(html.getByText(no,{exact:true})).toBeVisible();await expect(plain).toContainText(no);await expect(plain).not.toContainText(yes);
  }
  await previews.getByRole('combobox',{name:'Preview conditional branch',exact:true}).selectOption('contact');await select.selectOption(vipId);await expect(html.getByText('Champion garden preview',{exact:true})).toBeVisible();
  console.log('Conditional content: recorded topic, prediction property and contact-bound event previews match plain text');
  return {event:input,key};
}
