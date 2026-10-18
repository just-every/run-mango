import {test,expect} from '@playwright/test';
import {kioskInstallation,kioskChallenge} from './kiosk-harness';
import {openPage} from '../support/navigation';

test('[FORM-009] shared kiosk clears every visitor, requires fresh verification and retains device consent source',async({page:operatorPage,browser},info)=>{
  const visitor=await browser.newContext();const page=await visitor.newPage();
  const site=await kioskInstallation();
  const settings={frequencyDisclosure:'Monthly newsletter',embedOrigins:[],kioskEnabled:true,kioskDeviceLabel:'Market tablet'};
  try {
    await operatorPage.context().addCookies([{name:site.cookie.split('=')[0],value:site.cookie.split('=')[1],url:site.runtime.url}]);
    await operatorPage.setViewportSize({width:1440,height:1000});
    await openPage(operatorPage,site.runtime.url+'/app/audience');
    const tools=operatorPage.locator('.audience-signup-tools');
    await tools.getByRole('textbox',{name:'Newsletter frequency',exact:true}).fill(settings.frequencyDisclosure);
    await tools.getByRole('checkbox',{name:'Kiosk or event form'}).check();
    await tools.getByRole('textbox',{name:'Device or event label',exact:true}).fill(settings.kioskDeviceLabel);
    await tools.getByRole('button',{name:'Save signup settings'}).click();
    await expect(tools.getByRole('status')).toContainText('Signup settings saved');
    for(const width of [1440,390]) {
      await operatorPage.setViewportSize({width,height:1000});
      await tools.screenshot({path:info.outputPath(`kiosk-settings-${width}.png`)});
      expect(await operatorPage.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await operatorPage.context().clearCookies();
    // Re-saving unchanged settings creates no second marking action.
    expect((await site.settings(settings)).status).toBe(200);
    const audit=await site.rows("SELECT action,actor_id,detail_json,occurred_at FROM lifecycle_audit_entries WHERE action='signup.kiosk.changed'");
    expect(audit).toEqual([expect.objectContaining({actor_id:'kiosk-owner',occurred_at:expect.any(Number)})]);
    expect(JSON.parse(audit[0].detail_json)).toMatchObject({kioskEnabled:true,deviceLabel:'Market tablet'});
    const description=await (await site.call('/subscribe/info')).json();
    const capture=(email:string,token?:string)=>site.call('/subscribe',{email,consent:true,disclosure:description.disclosure,...(token?{'cf-turnstile-response':token}:{})},{'CF-Connecting-IP':'192.0.2.42'});
    expect((await capture('no-challenge@example.test')).status).toBe(400);
    expect(await site.rows('SELECT id FROM contacts')).toEqual([]);
    await page.setExtraHTTPHeaders({'CF-Connecting-IP':'192.0.2.42'});
    await kioskChallenge(page);
    for(let index=0;index<30;index++) {
      if(index<2)await page.setViewportSize({width:index===0?1440:390,height:1000});
      if(index===0)await openPage(page,site.runtime.url+'/subscribe');
      await expect(page.getByRole('textbox',{name:'Email address'})).toHaveValue('');
      await expect(page.getByRole('textbox',{name:'Name',exact:true})).toHaveValue('');
      await expect(page.getByRole('checkbox',{name:'Consent',exact:true})).not.toBeChecked();
      await expect(page.getByRole('button',{name:'Request confirmation'})).toBeDisabled();
      await page.getByRole('textbox',{name:'Email address'}).click();
      await page.getByRole('textbox',{name:'Email address'}).fill(`visitor-${index}@example.test`);
      await page.getByRole('textbox',{name:'Name',exact:true}).click();
      await page.getByRole('textbox',{name:'Name',exact:true}).fill(`Visitor ${index}`);
      await page.getByRole('checkbox',{name:'Consent',exact:true}).check();
      await page.getByRole('button',{name:'Complete verification'}).click();
      const response=page.waitForResponse(response=>new URL(response.url()).pathname==='/subscribe'&&response.request().method()==='POST');
      await page.getByRole('button',{name:'Request confirmation'}).click();
      expect((await response).status()).toBe(202);
      await expect(page.getByRole('status')).toContainText('Request received');
      if(index<2)await page.screenshot({path:info.outputPath(`kiosk-success-${index===0?1440:390}.png`)});
      await expect(page.getByRole('textbox',{name:'Email address'})).toHaveValue('',{timeout:5000});
      expect(await page.context().cookies()).toEqual([]);
      expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
    }
    // Continue the same shared NAT through the real public HTTP endpoint to
    // exercise the full hourly kiosk capacity, beyond the browser acceptance.
    for(let index=0;index<270;index++)expect((await capture(`event-${index}@example.test`,`kiosk-token-${crypto.randomUUID()}`)).status).toBe(202);
    const messages=await site.control('/_kiosk/messages');
    expect(messages).toHaveLength(300);
    const first=messages.find((message:any)=>message.to==='visitor-0@example.test');
    const confirmation=first.text.match(/https?:\/\/\S+/)[0];
    expect((await fetch(confirmation,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
    const report=await (await fetch(site.runtime.url+'/api/insights/list-growth',{headers:{Cookie:site.cookie}})).json();
    expect(report.rows).toContainEqual(expect.objectContaining({method:'kiosk',source:'Kiosk: Market tablet',kind:'confirmation',consentText:description.consentText}));
    expect(await site.rows("SELECT DISTINCT capture_method,capture_source FROM consent_evidence")).toEqual([{capture_method:'kiosk',capture_source:'Kiosk: Market tablet'}]);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.screenshot({path:info.outputPath(`kiosk-${width}.png`)});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await page.context().addCookies([{name:site.cookie.split('=')[0],value:site.cookie.split('=')[1],url:site.runtime.url}]);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/insights');
      const growth=page.locator('section[aria-labelledby="list-growth-title"]');
      await expect(growth).toContainText('Kiosk: Market tablet');
      await growth.screenshot({path:info.outputPath(`kiosk-growth-${width}.png`)});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await page.context().clearCookies();
    await site.control('/_kiosk/challenge',{connected:false});
    expect((await capture('unconfigured@example.test','kiosk-token-unconfigured')).status).toBe(503);
    expect((await site.rows('SELECT count(*) n FROM consent_evidence'))[0].n).toBe(300);
    await site.control('/_kiosk/challenge',{connected:true});
    await site.settings({...settings,kioskEnabled:false});
    const ordinary=await(await site.call('/subscribe/info')).json();
    for(let index=0;index<5;index++)expect((await site.call('/subscribe',{email:`ordinary-${index}@example.test`,consent:true,disclosure:ordinary.disclosure,'cf-turnstile-response':`kiosk-token-${crypto.randomUUID()}`},{'CF-Connecting-IP':'192.0.2.77'})).status).toBe(202);
    expect((await site.call('/subscribe',{email:'ordinary-over@example.test',consent:true,disclosure:ordinary.disclosure,'cf-turnstile-response':`kiosk-token-${crypto.randomUUID()}`},{'CF-Connecting-IP':'192.0.2.77'})).status).toBe(429);
  } finally {await visitor.close();await site.runtime.close();}
});
