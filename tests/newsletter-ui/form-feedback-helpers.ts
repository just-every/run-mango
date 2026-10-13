import { expect, type Locator, type Page } from '@playwright/test';
export async function expectFieldError(control: Locator, message?: RegExp) {
  await expect(control).toHaveAttribute('aria-invalid','true');
  const described=await control.getAttribute('aria-describedby'); expect(described).toBeTruthy();
  const error=control.page().locator(`[id="${described!.split(' ').at(-1)}"]`); await expect(error).toBeVisible(); if(message) await expect(error).toContainText(message);
}
export async function expectSummary(form: Locator, count: number) {
  const summary=form.locator('.validation-summary'); await expect(summary).toContainText(`${count} ${count===1?'field needs':'fields need'} attention.`); await expect(summary.getByRole('link')).toHaveCount(count);
  for (const link of await summary.getByRole('link').all()) {const href=await link.getAttribute('href'); await link.click(); await expect(form.page().locator(`[id="${href!.slice(1)}"]`)).toBeFocused();}
}
export async function createBlank(page: Page) {
  const result=await page.evaluate(async () => {const r=await fetch('/api/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'blank'})});return {status:r.status,data:await r.json()};});
  expect(result.status).toBeLessThan(300); await page.goto(`/app/campaigns/${result.data.campaignId}/review`); await expect(page.getByRole('heading',{name:'Edit draft'})).toBeVisible(); return result.data.campaignId as string;
}
export async function expectVisibleFocus(page: Page) {
  const controls=page.locator('a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[contenteditable="true"]');
  // Blur can change the summary's link count; hold each actual control instead of moving nth locators.
  for(const control of await controls.elementHandles()) {if(!await control.isVisible() || await control.getAttribute('tabindex')==='-1')continue; await control.focus(); const style=await control.evaluate(el=>{const s=getComputedStyle(el);return {outline:s.outlineStyle,width:parseFloat(s.outlineWidth),color:s.outlineColor,shadow:s.boxShadow};}); expect((style.outline!=='none'&&style.width>=2&&style.color!=='transparent'&&style.color!=='rgba(0, 0, 0, 0)')||style.shadow!=='none',await control.evaluate(el=>el.outerHTML.slice(0,140))).toBe(true);}
}
