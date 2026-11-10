import {expect,type Page,type TestInfo} from '@playwright/test';

export async function restrictionScreens(page:Page,info:TestInfo,state:string) {
  const panel=page.getByRole('region',{name:'Mailchimp restrictions'});
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});await panel.scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await panel.locator('input,button,p,label').evaluateAll(elements=>elements.every(element=>parseFloat(getComputedStyle(element).fontSize)>=13))).toBe(true);
    await panel.screenshot({path:info.outputPath(`opt-out-${state}-${width}.png`)});
  }
}
