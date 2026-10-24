import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPage,reloadPage} from '../support/navigation';
export async function flowJourney(page:Page,info:TestInfo,url:string,width:number){
  console.log(`Flow proof ${width}: open`);
  await openPage(page,url+'/app/flows');
  await expect(page.getByRole('heading',{name:'Flows',exact:true})).toBeVisible();
  await page.getByLabel('Flow name',{exact:true}).fill('synthetic-mango-101');
  const add=async(kind:string,name:string)=>{await page.getByRole('combobox',{name:'Node kind',exact:true}).selectOption(kind);await page.getByRole('button',{name:'Add node',exact:true}).click();await page.getByLabel('Node name',{exact:true}).fill(name);};
  console.log(`Flow proof ${width}: build`);
  await add('email','Welcome email 1');await add('condition','Welcome split');await add('email','Welcome email 2');await add('email','Welcome email 3');await add('exit','Welcome exit');
  await page.getByRole('button',{name:'Save draft revision',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Welcome email 1: unreachable node');
  console.log(`Flow proof ${width}: connect`);
  const connect=async(name:string,targets:string[])=>{await page.getByRole('button',{name,exact:true}).click();for(const target of targets)await page.getByRole('group',{name:'Continue to',exact:true}).getByRole('checkbox',{name:target,exact:true}).check();};
  await connect('Subscription confirmed',['Welcome email 1']);await connect('Welcome email 1',['Welcome split']);await connect('Welcome split',['Welcome email 2','Welcome email 3']);await connect('Welcome email 2',['Welcome exit']);await connect('Welcome email 3',['Welcome exit']);
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();await expect(page.getByText('125%',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  const canvas=page.getByRole('region',{name:'Flow canvas',exact:true});await canvas.focus();await page.keyboard.press('ArrowRight');expect(await canvas.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Save draft revision',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Draft revision saved. Nothing enrolled or sent.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
  expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
  await page.screenshot({path:info.outputPath(`flow-draft-${width}.png`),fullPage:true});
  console.log(`Flow proof ${width}: saved, inspect reload`);
  await reloadPage(page);await page.getByRole('combobox',{name:'Saved revision',exact:true}).selectOption({label:await page.getByRole('combobox',{name:'Saved revision',exact:true}).locator('option').nth(1).textContent() as string});
  await expect(page.getByLabel('Flow name',{exact:true})).toHaveValue('synthetic-mango-101');await expect(page.getByRole('button',{name:'Welcome email 3',exact:true})).toBeVisible();
}
