import {expect,type Browser,type TestInfo} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation,json,sender} from './harness';
import {openPage} from '../support/navigation';

/** Settings invites and removes an operator; without fresh email proof it asks for a confirmation link bound to this session. */
export async function operatorSettingsJourney(browser:Browser,info:TestInfo) {
  const edge=await providerEdge(),site=await installation(edge,eventSigner(),{managed:'none'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  context.setDefaultTimeout(20000);
  const invitee='newhire@example.test';
  try {
    const owner=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie:owner,body:sender}),200);
    // The runtime stands in for the public HTTPS origin.
    await context.setExtraHTTPHeaders({Cookie:owner});
    await openPage(page,site.runtime.url+'/app/settings');
    const settings=page.locator('.settings-operators');
    const entry=settings.getByLabel('Operator email',{exact:true});
    await entry.fill(invitee);
    await settings.getByRole('button',{name:'Add operator',exact:true}).click();
    await expect(settings.getByRole('alert')).toContainText('Confirm your email again before inviting an operator.');
    await expect(settings.getByText(invitee,{exact:true})).toHaveCount(0);
    const mails=edge.relaySends.length;
    await settings.getByRole('button',{name:'Email a confirmation link',exact:true}).click();
    await expect(settings.locator('.action-notice')).toContainText('Open your confirmation message in this browser and press Confirm.');
    await expect.poll(()=>edge.relaySends.length).toBe(mails+1);
    const message=edge.relaySends.at(-1)!;
    expect(message.body.to).toBe('owner@example.test');
    const link=site.local(/https:\/\/\S+\/auth\/confirm\S*/.exec(message.body.text)![0]);
    // Reading the link, by page or by request, proves nothing.
    expect((await fetch(link,{method:'HEAD',headers:{Cookie:owner}})).status).toBe(200);
    const reading=await context.newPage();
    await reading.goto(link);
    await expect(reading.getByRole('button',{name:/confirm/i})).toBeVisible();
    await reading.close();
    await settings.getByRole('button',{name:'Add operator',exact:true}).click();
    await expect(settings.getByRole('alert')).toContainText('Confirm your email again before inviting an operator.');
    // Only the affirmative submission supplies proof.
    const confirming=await context.newPage();
    await confirming.goto(link);
    const submitted=confirming.waitForResponse(response=>new URL(response.url()).pathname==='/auth/confirm'&&response.request().method()==='POST');
    await confirming.getByRole('button',{name:/confirm/i}).click();
    expect((await submitted).status()).toBe(303);
    await confirming.close();
    await openPage(page,site.runtime.url+'/app/settings');
    // Mail handoffs are paced: the invitation waits for the confirmation message's slot.
    await expect.poll(async()=>Date.now()>=Number((await site.rows('SELECT next_at FROM provider_pacing'))[0].next_at)).toBe(true);
    await settings.getByLabel('Operator email',{exact:true}).fill(invitee);
    await settings.getByRole('button',{name:'Add operator',exact:true}).click();
    await expect(settings.locator('.action-notice')).toContainText(`Access added for ${invitee}.`);
    const row=settings.getByRole('listitem').filter({hasText:invitee});
    await expect(row).toContainText('Invitation pending');
    await page.screenshot({path:info.outputPath('operator-management-1440.png'),fullPage:true});
    await page.setViewportSize({width:390,height:900});
    await expect(row.getByRole('button',{name:`Remove ${invitee}`,exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({path:info.outputPath('operator-management-390.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    await row.getByRole('button',{name:`Remove ${invitee}`,exact:true}).click();
    await page.getByRole('button',{name:'Confirm removal',exact:true}).click();
    await expect(settings.locator('.action-notice')).toContainText(`Invitation cancelled for ${invitee}.`);
    await expect(settings.getByText(invitee,{exact:true})).toHaveCount(0);
  } finally {await context.close();await site.runtime.close();await edge.close();}
}
