import {capacityMemory} from './csv-capacity-metrics';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {openPage} from '../support/navigation';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {json} from '../go-live/harness';
import {installation,record} from './support';

const phone=(n:number)=>'+614'+String(n).padStart(8,'0');
/** The same public preparation door runs a bounded sanity case in Verify and
 * the contract's complete review size in a separately recorded scale run. */
export async function csvCapacityJourney(page:Page,info:TestInfo){
  const total=Number(process.env.MANGO_CSV_SCALE_ROWS??5002),started=performance.now(),memory=capacityMemory();
  const edge=await providerEdge(),site=await installation(edge,eventSigner(),{sms:true});
  try{
    const cookie=await site.open(),file='synthetic-mango-capacity.csv';
    const rows=['phone,first name,sms_status'];
    for(let n=1;n<=total;n++){
      rows.push(n===2?'invalid,synthetic-mango-invalid,non-subscribed':n===4?',synthetic-mango-missing,non-subscribed':
        n===total?`${phone(1)},synthetic-mango-restricted,suppressed`:`${phone(n)},,non-subscribed`);
    }
    const input={files:[{name:file,preset:'csv-non-subscribed',csv:rows.join('\n')+'\n'}],consent:{brandOrLegalSender:'',messageCategory:'',frequencyDisclosure:'',destinationJurisdiction:'',consentText:'',consentVersion:''}};
    expect((await site.call('/api/audience/import-preparations',{method:'POST',body:input})).status).toBe(401);
    let preview:any,requests=0;
    do{
      preview=await json(await site.call('/api/audience/import-preparations',{method:'POST',cookie,body:input}),200);
      requests++;
      if(requests%10===0)console.log(`CSV_REVIEW rows=${total} requests=${requests} state=${preview.state} records=${preview.records??total}`);
      expect(await site.count('contacts')).toBe(0);
      if(requests>400)throw new Error('CSV review made no bounded progress.');
    }while(preview.state!=='reviewable');
    expect(requests).toBeGreaterThan(1);
    expect(preview.counts).toMatchObject({input:total,created:total-3,updated:0,rejected:2,suppressed:1});
    expect(preview.counts.input-preview.counts.created-preview.counts.updated-preview.counts.rejected).toBe(1);
    expect((await site.call(`/api/audience/import-preparations/${preview.fingerprint}/rows?offset=${total-25}`)).status).toBe(401);
    const last=await json(await site.call(`/api/audience/import-preparations/${preview.fingerprint}/rows?offset=${total-25}`,{cookie}),200);
    expect(last).toMatchObject({total,offset:total-25});expect(last.rows).toHaveLength(25);
    expect(last.rows.at(-1)).toMatchObject({file,row:total+1,phone:phone(1),smsStatus:'suppressed'});
    const originalChunks=await site.rows(`SELECT ordinal,content FROM audience_import_plan_chunks WHERE fingerprint='${preview.fingerprint}' ORDER BY ordinal`);
    expect(originalChunks.map(row=>row.content).join('')).toBe(input.files[0].csv);
    const repeated=await json(await site.call('/api/audience/import-preparations',{method:'POST',cookie,body:input}),200);
    expect(repeated).toEqual(preview);
    await page.setViewportSize({width:1440,height:1000});
    await page.context().clearCookies();
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await openPage(page,site.runtime.url+'/app/audience/import');
    await page.getByLabel('Choose CSV files').setInputFiles({name:file,mimeType:'text/csv',buffer:Buffer.from(input.files[0].csv)});
    await page.getByLabel('Preset for '+file).selectOption('csv-non-subscribed');
    await page.getByRole('button',{name:'Preview import',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Preview totals',exact:true})).toBeVisible({timeout:180000});
    await expect(page.locator('.audience-import-stats').getByText(new Intl.NumberFormat('en').format(total-3),{exact:true})).toBeVisible();
    await expect(page.locator('.audience-import-pagination')).toContainText(`of ${new Intl.NumberFormat('en').format(total)}`);
    const next=page.waitForResponse(response=>response.url().includes('/rows?offset=25'));
    await page.getByRole('button',{name:'Next rows',exact:true}).click();
    expect((await next).status()).toBe(200);
    await expect(page.getByText('Row 27',{exact:true})).toBeVisible();
    await page.screenshot({path:info.outputPath('csv-capacity-1440.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:info.outputPath('csv-capacity-390.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    expect(await site.count('contacts')).toBe(0);
    let start:any,starts=0;
    do{
      start=await json(await site.call('/api/audience/imports',{method:'POST',cookie,body:{fingerprint:preview.fingerprint}}),200);
      if(++starts>4000)throw new Error('CSV start made no bounded progress.');
    }while(start.preparing);
    expect(start.job).toMatchObject({state:'applying',checkpoint:0,total});
    let job=start.job;
    for(let n=0;n<2;n++)({job}=await json(await site.call(`/api/audience/imports/${job.id}/resume`,{method:'POST',cookie,body:{}}),200));
    expect(job.checkpoint).toBeGreaterThan(0);expect(job.checkpoint).toBeLessThan(total);
    const read=await json(await site.call(`/api/audience/imports/${job.id}`,{cookie}),200);
    expect(read.job).toMatchObject({id:job.id,checkpoint:job.checkpoint,total});
    expect((await site.call(`/api/audience/imports/${job.id}/report`)).status).toBe(401);
    let first='';
    for(let read=0;read<2;read++){
      const response=await site.call(`/api/audience/imports/${job.id}/report`,{cookie});
      expect(response.status).toBe(200);const report=await response.text();
      expect(report).toContain(`| ${total} | ${total-3} | 0 | 2 | 1 |`);
      const outcomes=report.split('\n').filter(line=>line.startsWith(`| ${file} |`));
      expect(outcomes).toHaveLength(total);
      expect(outcomes.filter(line=>line.endsWith('| created |'))).toHaveLength(total-3);
      expect(outcomes.filter(line=>line.endsWith('| rejected |'))).toHaveLength(2);
      expect(outcomes.find(line=>line.startsWith(`| ${file} | 3 |`))).toMatch(/E\.164.*country calling code.*rejected/);
      expect(outcomes.find(line=>line.startsWith(`| ${file} | 5 |`))).toMatch(/email address or E\.164 phone number is required.*rejected/);
      expect(outcomes.find(line=>line.startsWith(`| ${file} | 2 |`))).toContain('| created |');
      expect(outcomes.find(line=>line.startsWith(`| ${file} | ${total+1} |`))).toContain('| skipped |');
      if(read)expect(report).toBe(first);else first=report;
    }
    const repeatedStart=await json(await site.call('/api/audience/imports',{method:'POST',cookie,body:{fingerprint:preview.fingerprint}}),200);
    expect(repeatedStart.job).toMatchObject({id:job.id,checkpoint:job.checkpoint});
    const contacts=await site.rows('SELECT c.email_status AS emailStatus,c.sms_status AS smsStatus,p.phone_e164 AS phone FROM contacts c JOIN contact_phones p ON p.contact_id=c.id');
    expect(contacts.length).toBeGreaterThan(0);
    for(const contact of contacts)expect(contact).toMatchObject({emailStatus:'non-subscribed',smsStatus:contact.phone===phone(1)?'suppressed':'non-subscribed'});
    const restricted=await json(await site.call('/api/contacts/search?address='+encodeURIComponent(phone(1)),{cookie}),200);
    expect(restricted.contacts).toHaveLength(1);
    const detail=await json(await site.call('/api/contacts/'+restricted.contacts[0].id,{cookie}),200);
    expect(detail.contact).toMatchObject({displayName:'synthetic-mango-restricted',emailStatus:'non-subscribed',smsStatus:'suppressed'});
    expect(detail.phones).toMatchObject([{phoneE164:phone(1),channelStatus:'suppressed'}]);expect(detail.consent).toEqual([]);
    for(const table of ['consent_evidence','consent_confirmations','campaigns','campaign_approval_requests','recipient_steps'])expect(await site.count(table),table).toBe(0);
    expect(edge.sends).toEqual([]);expect(edge.sms.sends).toEqual([]);expect(edge.relaySends).toEqual([]);expect(edge.unexpected).toEqual([]);
    expect((await site.control('/_golive/emissions')).filter((entry:any)=>entry.command.kind==='campaign.dispatch')).toEqual([]);
    await record(`csv-capacity-report-${total}.md`,first);
    await record(`csv-capacity-${total}.json`,{rows:total,previewRequests:requests,startRequests:starts,counts:preview.counts,job:read.job,reportReads:2,wallMs:performance.now()-started,...memory.read(),nativeContactsWritten:contacts.length,handoffs:0});
    // Removing one written person withdraws the whole reviewed source, and a replay stays retired.
    const [subject]=await site.rows('SELECT id FROM contacts ORDER BY id LIMIT 1');
    let {receipt}=await json(await site.call(`/api/contacts/${subject.id}`,{method:'DELETE',cookie}),202);
    while(receipt.state==='pending'){const response=await site.call(`/api/audience/erasures/${receipt.reference}/resume`,{method:'POST',cookie});expect([200,202]).toContain(response.status);({receipt}=await response.json());}
    expect(receipt.state).toBe('complete');
    expect(await site.rows(`SELECT ordinal FROM audience_import_plan_chunks WHERE fingerprint='${preview.fingerprint}'`)).toEqual([]);
    const afterErasure=await site.rows('SELECT * FROM contacts ORDER BY id');
    const replay=await json(await site.call('/api/audience/import-preparations',{method:'POST',cookie,body:input}),400);
    expect(replay.detail).toMatch(/erasure retired/);
    expect((await site.call(`/api/audience/imports/${job.id}/report`,{cookie})).status).toBe(409);
    expect((await site.call(`/api/audience/imports/${job.id}/resume`,{method:'POST',cookie,body:{}})).status).toBe(409);
    expect(await site.rows('SELECT * FROM contacts ORDER BY id')).toEqual(afterErasure);
    await record(`csv-capacity-erasure-${total}.json`,{reference:receipt.reference,state:receipt.state,replayStatus:400,reportStatus:409,resumeStatus:409,remainingContacts:afterErasure.length});
  }finally{memory.close();await site.runtime.close();await edge.close();}
}
