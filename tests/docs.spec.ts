import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';

// DOCS-001: the public documentation, through the real runtime. The pages are the ones docs/site.json lists, in its order.
type Entry = { slug: string; label: string; hidden?: boolean };
const manifest = JSON.parse(readFileSync(new URL('../docs/site.json', import.meta.url), 'utf8')) as { sections: { pages: Entry[] }[] };
const pages = manifest.sections.flatMap(section => section.pages).filter(page => !page.hidden);
const route = (slug: string) => (slug ? `/docs/${slug}` : '/docs');

test('[DOCS-001][HOME-001] visitors browse public documentation, navigate after hydration and find a real 404 while the app requires sign-in',async({page,request,context,baseURL})=>{
  await page.setViewportSize({width:1440,height:1000});
  for(const entry of pages) {
    const response=await request.get(route(entry.slug));
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    expect(response.headers()['set-cookie']).toBeUndefined();
    expect(await response.text()).toContain('<h1');
  }
  const foreign:string[]=[];
  page.on('request',request=>{if(new URL(request.url()).origin!==new URL(baseURL!).origin&&!request.url().startsWith('data:'))foreign.push(request.url());});
  await page.goto('/docs');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.waitForFunction(()=>document.documentElement.dataset.mangoHydrated==='true');
  const origin=await page.evaluate(()=>performance.timeOrigin);
  await page.getByRole('navigation',{name:'Documentation'}).first().getByRole('link',{name:pages[1].label,exact:true}).click();
  await expect(page).toHaveURL(new RegExp(route(pages[1].slug)+'$'));
  expect(await page.evaluate(()=>performance.timeOrigin)).toBe(origin);
  await expect(page.locator('h1')).toHaveCount(1);
  expect(foreign).toEqual([]);
  for(const missing of ['/docs/no-such-page','/docs/'+pages[1].slug+'/extra']) {
    expect((await page.goto(missing))!.status()).toBe(404);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.locator('main a[href="/docs"]')).toHaveCount(1);
  }
  expect((await request.get('/app',{maxRedirects:0})).status()).toBe(303);
  expect(await context.cookies()).toEqual([]);
});
