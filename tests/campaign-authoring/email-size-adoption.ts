import {expect,type Page,type TestInfo} from '@playwright/test';
import {openPage} from '../support/navigation';

/** Adoption rechecks a saved suggestion after recipient data increases its bound. */
export async function oversizedAdoption(page:Page,baseURL:string,proposalId:string,width:number,info:TestInfo,sql:(command:string)=>Promise<any>) {
  const api=page.request,headers={Origin:baseURL};
  const adopted=await api.post(`${baseURL}/api/proposals/${proposalId}/adopt`,{headers,data:{}});
  expect(adopted.status()).toBe(200);
  const {campaignId}=await adopted.json();
  const read=async()=>(await api.get(`${baseURL}/api/campaigns/${campaignId}`)).json();
  const before=await read();
  const content='<p>'+'{{displayName | fallback: friend}} '.repeat(1000)+'</p>';
  const saved=await api.patch(`${baseURL}/api/campaign-revisions/${before.revision.id}`,{headers,data:{emailBody:content}});
  expect(saved.status(),await saved.text()).toBe(200);
  const original=await read();
  const names=await sql('SELECT id,display_name FROM contacts');
  // Arrange the later contact-profile state; adoption itself uses the authenticated public door.
  const longName='A very long garden reader name & family '.repeat(4);
  await sql(`UPDATE contacts SET display_name='${longName}' WHERE email='subscribed@example.test'`);
  try {
    const refused=await api.post(`${baseURL}/api/proposals/${proposalId}/adopt`,{headers,data:{}});
    expect(refused.status()).toBe(400);
    const error=await refused.json();
    expect(error).toMatchObject({error:'email_too_large',size:{exceedsLimit:true}});
    expect(error.size.htmlBytes).toBeGreaterThan(error.size.limitBytes);
    expect(error.detail).toContain('Largest blocks:');
    expect((await read()).revision).toEqual(original.revision);
    await openPage(page,baseURL+'/app');
    await page.locator(`[data-proposal-id="${proposalId}"]`).click();
    await page.getByRole('button',{name:'Use this',exact:true}).click();
    const alert=page.getByRole('alert').filter({hasText:'Email is too large.'});
    await expect(alert).toContainText(error.detail);
    await alert.screenshot({path:info.outputPath(`proposal-adoption-refused-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await read()).revision).toEqual(original.revision);
  } finally {
    for(const row of names)await sql(`UPDATE contacts SET display_name=${row.display_name===null?'NULL':`'${row.display_name.replaceAll("'","''")}'`} WHERE id='${row.id}'`);
  }
}

/** The store record remains the source when its derived newsletter is refused. */
export async function oversizedSignalStarter(page:Page,baseURL:string,width:number,info:TestInfo,sql:(command:string)=>Promise<any>) {
  const [source]=await sql("SELECT id,payload FROM source_records WHERE source_type='product' LIMIT 1");
  const title='🌱'.repeat(28160),payload=JSON.stringify({...JSON.parse(source.payload),title});
  const quote=(value:string)=>`'${value.replaceAll("'","''")}'`;
  const campaigns=async()=>(await (await page.request.get(baseURL+'/api/campaigns')).json()).campaigns;
  const before=await campaigns();
  // Build the synthetic field inside D1: its bound value exceeds the SQL
  // statement-length limit while remaining a legitimate source-record value.
  await sql(`UPDATE source_records SET payload=json_set(payload,'$.title',replace(hex(zeroblob(${Array.from(title).length})),'00','🌱')) WHERE id=${quote(source.id)}`);
  try {
    const result=await page.request.post(baseURL+'/api/campaigns',{headers:{Origin:baseURL},data:{starterSourceId:source.id}});
    expect(result.status()).toBe(400);
    const refused=await result.json();
    expect(refused).toMatchObject({error:'email_too_large',size:{exceedsLimit:true}});
    expect(refused.size.htmlBytes).toBeGreaterThan(refused.size.limitBytes);
    expect(refused.size.largestBlocks[0].bytes).toBeGreaterThan(refused.size.limitBytes);
    await openPage(page,baseURL+'/app/campaigns');
    await page.getByRole('button',{name:'New campaign',exact:true}).click();
    await page.getByRole('button',{name:/^Product newsletter:/}).click();
    const alert=page.getByRole('alert').filter({hasText:'Email is too large.'});
    await expect(alert).toContainText(refused.detail);
    await alert.screenshot({path:info.outputPath(`store-starter-refused-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await sql(`SELECT payload FROM source_records WHERE id=${quote(source.id)}`)).toEqual([{payload}]);
    expect(await campaigns()).toEqual(before);
  } finally {await sql(`UPDATE source_records SET payload=${quote(source.payload)} WHERE id=${quote(source.id)}`);}
}
