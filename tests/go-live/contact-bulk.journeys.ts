import {test,expect} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation,json} from './harness';
import {openPage} from '../support/navigation';

const consent={brandOrLegalSender:'Mango',messageCategory:'offers',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',consentText:'I agree to receive weekly offers.',consentVersion:'v1'};

test('[CONT-022] the Audience screen finds contacts and runs bulk actions with a visible receipt at 1440 and 390',async({page},info)=>{
  const edge=await providerEdge(),site=await installation(edge,eventSigner());
  try {
    const owner=await site.open();
    const post=async(path:string,body:unknown)=>json(await site.call(path,{method:'POST',cookie:owner,body}),200);
    const now=new Date(Date.now()-60000).toISOString(),confirmed=new Date(Date.now()-30000).toISOString();
    const subscribed='Email Address,Email Marketing Status,First Name,OPTIN_TIME,CONFIRM_TIME\n'+[0,1,2,3].map(n=>`bulkscreen-${n}@example.test,subscribed,Screen ${n},${now},${confirmed}`).join('\n');
    const waiting='Email Address\n'+[4,5].map(n=>`bulkscreen-${n}@example.test`).join('\n');
    for(const [name,preset,csv,extra] of [['subscribed.csv','csv-subscribed',subscribed,{consent}],['waiting.csv','csv-non-subscribed',waiting,{}]] as const){
      const preview=await post('/api/audience/import-preview',{files:[{name,preset,csv}],...extra});
      let {job}=await post('/api/audience/imports',{fingerprint:preview.fingerprint});
      for(let step=0;['queued','applying'].includes(job.state)&&step<20;step++)({job}=await post(`/api/audience/imports/${job.id}/resume`,{}));
    }
    page.setDefaultTimeout(20000);
    await page.context().addCookies([{name:owner.split('=')[0],value:owner.split('=')[1],url:site.runtime.url}]);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await openPage(page,`${site.runtime.url}/app/audience`);
      const panel=page.getByRole('region',{name:'Search contacts',exact:true}).or(page.locator('section.contact-search'));
      await panel.getByLabel('Email, phone or name',{exact:true}).fill('bulkscreen');
      await panel.getByRole('button',{name:'Search',exact:true}).click();
      await expect(panel.getByRole('status').first()).toContainText('6 contacts match');
      await panel.getByLabel('Select every contact shown').check();
      if(width===1440) {
        await panel.getByRole('button',{name:'Add to topic',exact:true}).click();
        await page.getByLabel('Topic',{exact:true}).fill('offers');
        await page.getByRole('button',{name:'Add to topic 6 contacts',exact:true}).click();
        const receipt=page.getByRole('region',{name:'Bulk action receipt'});
        await expect(receipt.getByRole('status')).toContainText('6 of 6 contacts handled · 4 done · 2 refused · finished');
        await expect(receipt.getByRole('region',{name:'Refused contacts'})).toContainText('No confirmed consent covers this topic');
        await expect(receipt.getByRole('region',{name:'Refused contacts'})).toContainText('bulkscreen-5');
      } else {
        await panel.getByRole('button',{name:'Add tag',exact:true}).click();
        await page.getByRole('dialog').getByLabel('Tag',{exact:true}).fill('spring');
        await page.getByRole('button',{name:'Add tag 6 contacts',exact:true}).click();
        await expect(page.getByRole('region',{name:'Bulk action receipt'}).getByRole('status')).toContainText('6 of 6 contacts handled · 6 done · 0 refused · finished');
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
        await panel.getByLabel('Tag',{exact:true}).fill('spring');
        await panel.getByRole('button',{name:'Search',exact:true}).click();
        await expect(panel.getByRole('status').first()).toContainText('6 contacts match');
      }
      const small=await page.evaluate(()=>[...document.querySelectorAll('.contact-search button,.contact-search label,.contact-search td,.contact-search th,.bulk-job p')].filter(element=>(element as HTMLElement).offsetParent&&parseFloat(getComputedStyle(element).fontSize)<13).length);
      expect(small).toBe(0);
      await page.locator('section.contact-search').screenshot({path:info.outputPath(`contact-bulk-${width}.png`)});
    }
    expect((await json(await site.call('/api/audience/search?tag=spring',{cookie:owner}),200)).total).toBe(6);
    expect((await site.rows("SELECT COUNT(*) AS n FROM contact_topic_memberships WHERE topic='offers'"))[0].n).toBe(4);
  } finally {await site.runtime.close();await edge.close();}
});
