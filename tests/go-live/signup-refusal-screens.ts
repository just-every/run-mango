import AxeBuilder from '@axe-core/playwright';
import {expect,type Page,type TestInfo} from '@playwright/test';
import type {kioskInstallation} from './kiosk-harness';
import {openPage} from '../support/navigation';

export async function refusalScreens(site:Awaited<ReturnType<typeof kioskInstallation>>,page:Page,operator:Page,info:TestInfo,form:string,ip:string) {
  await page.setExtraHTTPHeaders({'CF-Connecting-IP':ip});
  await operator.context().addCookies([{name:site.cookie.split('=')[0],value:site.cookie.split('=')[1],url:site.runtime.url}]);
  for(const width of [1440]) {
    await page.setViewportSize({width,height:1000});
    await openPage(page,site.runtime.url+'/subscribe');
    const email=page.getByRole('textbox',{name:'Email address'}),name=page.getByRole('textbox',{name:'Name',exact:true});
    await email.click();await email.fill(`synthetic-mango-refused-${width}@example.test`);
    await name.click();await name.fill('Market visitor');
    await page.getByRole('checkbox').check();
    await page.getByRole('button',{name:'Complete verification'}).click();
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/subscribe'&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Request confirmation'}).click();
    const refused=await response;
    expect(refused.status()).toBe(429);expect(Number(refused.headers()['retry-after'])).toBeGreaterThan(0);
    await expect(page.getByRole('alert')).toHaveText('Too many signups right now. Please try again in a few minutes.');
    await expect(email).toHaveValue(`synthetic-mango-refused-${width}@example.test`);await expect(name).toHaveValue('Market visitor');
    await expect(page.getByRole('status')).toHaveCount(0);
    await page.screenshot({path:info.outputPath(`refused-${form}-${width}.png`),fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
    await operator.setViewportSize({width,height:1000});await openPage(operator,site.runtime.url+'/app');
    const alert=operator.getByRole('alert',{name:'Signup rate limit'});
    await expect(alert).toContainText('signups refused by rate limit in the last hour');
    await expect(alert.getByRole('link',{name:'Open form'})).toHaveAttribute('href','/subscribe');
    await expect(alert.getByRole('link',{name:'Signup allowances'})).toHaveAttribute('href','/app/settings#signup-allowances');
    await alert.screenshot({path:info.outputPath(`refusal-home-${form}-${width}.png`)});
    expect(await operator.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await openPage(operator,site.runtime.url+'/app/settings');
    await expect(operator.locator('#signup-refusals')).toContainText(form);
    await operator.locator('#signup-refusals').screenshot({path:info.outputPath(`refusal-report-${form}-${width}.png`)});
  }
}
