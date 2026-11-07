import {readFile} from 'node:fs/promises';
import {parseCsv} from '../../src/core/features/audience/csv';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {authoringRuntime} from '../campaign-authoring/browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';
import {openPage,reloadPage} from '../support/navigation';

export async function bulkBrowserJourney(page:Page,info:TestInfo) {
  page.setDefaultTimeout(15000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const runtime=await authoringRuntime({suite:'contact-bulk',fixtureWorker:'tests/audience-controls/bulk-worker.ts',vars:(url:string)=>({MANGO_PUBLIC_BASE_URL:url})});
  try {
    const headers={'X-Test-Token':runtime.token},request=page.context().request;
    const open=await request.post(`${runtime.url}/_authoring/open`,{headers});expect(open.status()).toBe(200);
    await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:(await open.json()).token,url:runtime.url}]);
    const seeded=await request.post(`${runtime.url}/_bulk/seed`,{headers});expect(seeded.status()).toBe(200);
    const {people}=await seeded.json();
    await openPage(page,`${runtime.url}/app/audience`);
    await page.getByText('Search contacts',{exact:true}).click();
    await page.getByRole('combobox',{name:'Search by',exact:true}).selectOption('property');
    await page.getByLabel('Property key',{exact:true}).fill('favourite');
    await page.getByLabel('Search value',{exact:true}).fill('Vegetables');
    await page.getByRole('button',{name:'Find contacts',exact:true}).click();
    const table=page.getByRole('table',{name:'Contacts',exact:true});
    await expect(table.getByRole('link',{name:'Amelia Rivera',exact:true})).toBeVisible();
    await expect(table.getByRole('link',{name:'Bennett Cole',exact:true})).toBeVisible();
    await expect(table.getByRole('link',{name:'Caroline Moore',exact:true})).toHaveCount(0);
    await page.getByLabel('Select all contacts',{exact:true}).check();
    await page.getByRole('combobox',{name:'Bulk action',exact:true}).selectOption('topic');
    await page.getByRole('combobox',{name:'Topic',exact:true}).selectOption('email:harvest-news');
    await page.getByRole('button',{name:'Apply to selection',exact:true}).click();
    const receipt=page.getByRole('region',{name:'Add to topic',exact:true});
    await expect(receipt.getByRole('status')).toContainText('Complete',{timeout:30000});
    await expect(receipt).toContainText('Bennett Cole');
    await expect(receipt.getByText('harvest-news',{exact:true})).toBeVisible();
    await expect(receipt).toContainText('missing-covering-consent');
    await expect(receipt.locator('dd')).toHaveText(['1','1','2']);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>window.scrollTo(0,0));
      const path=info.outputPath(`contact-topic-${width}.png`);await page.screenshot({path,fullPage:true});
      await info.attach(`contact-topic-${width}`,{path,contentType:'image/png'});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await page.setViewportSize({width:1440,height:1000});
    const jobId=new URL(page.url()).searchParams.get('bulk');expect(jobId).toBeTruthy();
    await reloadPage(page);
    await expect(receipt.getByRole('status')).toContainText('Complete');
    await expect(receipt).toContainText('Bennett Cole');
    await expect(receipt.getByText('harvest-news',{exact:true})).toBeVisible();
    await page.getByLabel('Select Amelia Rivera',{exact:true}).check();
    await page.getByRole('combobox',{name:'Bulk action',exact:true}).selectOption('tag');
    await page.getByLabel('Tag',{exact:true}).fill('Harvest members');
    await page.getByRole('button',{name:'Apply to selection',exact:true}).click();
    const tagReceipt=page.getByRole('region',{name:'Add tag',exact:true});
    await expect(tagReceipt.getByRole('status')).toContainText('Complete');
    await expect(tagReceipt.getByText('Harvest members',{exact:true})).toBeVisible();
    const profile=await request.get(`${runtime.url}/api/contacts/${people[0].id}`);
    expect((await profile.json()).profile.tags).toContain('Harvest members');
    await page.getByLabel('Select Amelia Rivera',{exact:true}).check();
    await page.getByRole('combobox',{name:'Bulk action',exact:true}).selectOption('untag');
    await page.getByLabel('Tag',{exact:true}).fill('Harvest members');
    await page.getByRole('button',{name:'Apply to selection',exact:true}).click();
    await expect(page.getByRole('region',{name:'Remove tag',exact:true}).getByRole('status')).toContainText('Complete');
    expect((await (await request.get(`${runtime.url}/api/contacts/${people[0].id}`)).json()).profile.tags).not.toContain('Harvest members');
    await page.getByLabel('Select Amelia Rivera',{exact:true}).check();
    await page.getByLabel('Select Bennett Cole',{exact:true}).check();
    await page.getByRole('combobox',{name:'Bulk action',exact:true}).selectOption('export');
    await page.getByRole('button',{name:'Apply to selection',exact:true}).click();
    const exported=page.getByRole('region',{name:'Export selected contacts',exact:true});
    await expect(exported.getByRole('status')).toContainText('Complete');
    const exportId=new URL(page.url()).searchParams.get('bulk');
    const downloadEvent=page.waitForEvent('download');
    await exported.getByRole('button',{name:'Download selected contacts CSV',exact:true}).click();
    const download=await downloadEvent;
    const rows=parseCsv(await readFile((await download.path())!,'utf8'));
    expect(rows.map(row=>row['contact id']).sort()).toEqual(people.slice(0,2).map((person:any)=>person.id).sort());
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>window.scrollTo(0,0));
      const path=info.outputPath(`contact-export-${width}.png`);await page.screenshot({path,fullPage:true});
      await info.attach(`contact-export-${width}`,{path,contentType:'image/png'});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.getByLabel('Select Amelia Rivera',{exact:true}).check();
    await page.getByRole('combobox',{name:'Bulk action',exact:true}).selectOption('suppress');
    await page.getByRole('button',{name:'Review action',exact:true}).click();
    const dialog=page.getByRole('alertdialog',{name:'Suppress selected contacts?',exact:true});
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
    expect((await (await request.get(`${runtime.url}/api/contacts/${people[0].id}`)).json()).contact.emailStatus).toBe('subscribed');
    await page.getByRole('button',{name:'Review action',exact:true}).click();
    // The ordinary confirmation is the destructive action's public door.
    await dialog.getByRole('button',{name:'Suppress 1 contacts',exact:true}).click();
    const suppressed=page.getByRole('region',{name:'Suppress contacts',exact:true});
    await expect(suppressed.getByRole('status')).toContainText('Complete');
    expect((await (await request.get(`${runtime.url}/api/contacts/${people[0].id}`)).json()).contact.emailStatus).toBe('suppressed');
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>window.scrollTo(0,0));
      await expect(suppressed).toBeVisible();
      const path=info.outputPath(`contact-bulk-${width}.png`);
      await page.screenshot({path,fullPage:true});await info.attach(`contact-bulk-${width}`,{path,contentType:'image/png'});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.getByLabel('Select Amelia Rivera',{exact:true}).check();
    await page.getByRole('combobox',{name:'Bulk action',exact:true}).selectOption('erase');
    await page.getByRole('button',{name:'Review action',exact:true}).click();
    const eraseDialog=page.getByRole('alertdialog',{name:'Erase selected contacts?',exact:true});
    await eraseDialog.getByRole('button',{name:'Cancel',exact:true}).click();
    expect((await request.get(`${runtime.url}/api/contacts/${people[0].id}`)).status()).toBe(200);
    await page.getByRole('button',{name:'Review action',exact:true}).click();
    await eraseDialog.getByRole('button',{name:'Permanently erase 1 contacts',exact:true}).click();
    const erased=page.getByRole('region',{name:'Erase contacts',exact:true});
    await expect(erased.getByRole('status')).toContainText('Complete',{timeout:120000});
    await expect(page.getByRole('table',{name:'Contacts',exact:true}).getByRole('link',{name:'Amelia Rivera',exact:true})).toHaveCount(0);
    expect((await request.get(`${runtime.url}/api/contacts/${people[0].id}`)).status()).toBe(404);
    const afterErasure=await (await request.get(`${runtime.url}/api/audience/bulk/${exportId}/export`)).text();
    expect(afterErasure).not.toContain(people[0].email);expect(afterErasure).not.toContain(people[0].name);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>window.scrollTo(0,0));
      const path=info.outputPath(`contact-erased-${width}.png`);await page.screenshot({path,fullPage:true});
      await info.attach(`contact-erased-${width}`,{path,contentType:'image/png'});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    console.log('PROBE CONT-022 browser: property Vegetables -> Amelia and Bennett; topic receipt names Bennett refused; tag and untag persisted; selection CSV downloaded; suppression and erasure cancel unchanged and confirm applied; old export drops erased contact; receipts survive reload; screens 1440 and 390');
    expect(errors).toEqual([]);
  } catch(error) {
    const path=info.outputPath('contact-bulk-interrupted.png');
    await page.screenshot({path,fullPage:true}).catch(()=>undefined);
    await info.attach('contact-bulk-interrupted',{path,contentType:'image/png'}).catch(()=>undefined);
    if(errors.length)console.log('Browser errors: '+errors.join('; '));
    throw error;
  } finally {await runtime.close();}
}
