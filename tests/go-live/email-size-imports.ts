import {expect, type Page, type TestInfo} from '@playwright/test';
import {createHash} from 'node:crypto';
import {zip} from '../move-in/archive';
import {postArchive,drive} from '../move-in/support';
import {json,type Installation} from './harness';
import {openPage} from '../support/navigation';

/** Existing archive/conversion doors keep refused source and never gain send authority. */
export async function oversizedImports(site:Installation,cookie:string,page:Page,info:TestInfo,oversized:string) {
  const source=`<!doctype html><html><head><title>Oversized garden template</title></head><body>${oversized}</body></html>`;
  const bytes=zip([
    {name:'templates/oversized.html',data:source},
    {name:'templates/small.html',data:'<p>A small garden letter.</p>'},
    {name:'emails.csv',data:'Title,Subject,Campaign ID\nOversized garden history,Garden history,oversized-history'},
    {name:'campaigns_content/oversized-history.html',data:source},
  ]);
  const before=await site.count('campaigns');
  const preview=await postArchive(site,cookie,'/api/audience/archive-preview',bytes);
  expect(preview.status,JSON.stringify(preview.body)).toBe(200);
  expect(await site.count('campaigns')).toBe(before);
  const applied=await postArchive(site,cookie,'/api/audience/archives',bytes,preview.body.fingerprint);
  expect(applied.status,JSON.stringify(applied.body)).toBe(200);
  const id=applied.body.archive.id;
  await drive(site,cookie,id,'continue');
  const detail=await json(await site.call(`/api/audience/archives/${id}`,{cookie}),200);
  const held=detail.content.find((row:any)=>row.source_path==='templates/oversized.html');
  expect(held).toMatchObject({state:'held',campaign_id:null});
  expect(held.outcome).toContain('Email is too large.');
  expect(held.outcome).toContain('Largest blocks:');
  expect(held.outcome).toContain('bytes');
  expect(await site.count('campaigns')).toBe(before+1);
  const history=detail.content.find((row:any)=>row.kind==='history');
  const original=await json(await site.call(`/api/imported-history/${history.id}`,{cookie}),200);
  expect(original.record.html).toContain(oversized);
  const refused=await json(await site.call(`/api/imported-history/${history.id}/copy`,{method:'POST',cookie}),400);
  expect(refused).toMatchObject({error:'email_too_large',size:{exceedsLimit:true}});
  expect(refused.size.htmlBytes).toBeGreaterThan(refused.size.limitBytes);
  expect(refused.detail).toContain('Largest blocks:');
  expect((await json(await site.call(`/api/imported-history/${history.id}`,{cookie}),200)).record).toEqual(original.record);
  const chunks=await site.rows(`SELECT base64 FROM move_in_archive_chunks WHERE archive_id='${id}' ORDER BY ordinal`);
  const retained=Buffer.from(chunks.map(row=>row.base64).join(''),'base64');
  expect(createHash('sha256').update(retained).digest('hex')).toBe(createHash('sha256').update(bytes).digest('hex'));
  const report=await (await site.call(`/api/audience/archives/${id}/report`,{cookie})).text();
  expect(report).toContain(held.outcome.replaceAll('|','\\|').replace(/\s+/g,' ').trim());
  expect(report).toContain('held');
  expect(report).toContain('Held conversions');
  // Replay does not retry a held conversion or create another small draft.
  await drive(site,cookie,id,'continue');
  expect(await site.count('campaigns')).toBe(before+1);
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await openPage(page,`${site.runtime.url}/app/audience/import`);
    await page.getByRole('button',{name:'Show imported history and drafts',exact:true}).click();
    const region=page.getByRole('region',{name:'Imported history and drafts from account-export.zip'});
    await expect(region).toContainText(held.outcome);
    await region.getByRole('button',{name:'Copy into a new draft',exact:true}).click();
    await expect(region.getByRole('alert')).toContainText(refused.detail);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await region.screenshot({path:info.outputPath(`oversized-import-${width}.png`)});
  }
  expect(await site.count('campaigns')).toBe(before+1);
  const small=detail.content.find((row:any)=>row.source_path==='templates/small.html');
  const smallDetail=await json(await site.call(`/api/campaigns/${small.campaign_id}`,{cookie}),200);
  expect(smallDetail.revision).toMatchObject({state:'draft',approvedAt:null,emailBody:expect.stringContaining('A small garden letter.')});
  await drive(site,cookie,id,'undo');
  const undone=await json(await site.call(`/api/audience/archives/${id}`,{cookie}),200);
  expect(undone.content.every((row:any)=>row.state==='removed')).toBe(true);
  expect(await site.count('campaigns')).toBe(before);
}
