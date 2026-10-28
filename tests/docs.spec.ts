import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { contract } from './contract.js';
import { expectDocumentToFit, expectNoSeriousAxeViolations } from './newsletter-ui/browser-checks';

// DOCS-001: the public documentation, through the real runtime. The pages are the ones docs/site.json lists, in its order.
type Entry = { slug: string; label: string; hidden?: boolean };
const manifest = JSON.parse(readFileSync(new URL('../docs/site.json', import.meta.url), 'utf8')) as { sections: { pages: Entry[] }[] };
const pages = manifest.sections.flatMap(section => section.pages).filter(page => !page.hidden);
const path = (slug: string) => (slug ? `/docs/${slug}` : '/docs');

async function visit(page: Page, route: string, baseURL: string) {
  const origin = new URL(baseURL).origin;
  const foreign: string[] = [];
  page.on('request', request => { if (!request.url().startsWith('data:') && new URL(request.url()).origin !== origin) foreign.push(request.url()); });
  const response = await page.goto(route, { waitUntil: 'networkidle' });
  return { response: response!, foreign };
}

test.describe('public documentation', () => {
  test.describe.configure({ timeout: 180000 });
  contract('DOCS-001', 'every manifest page renders with one h1, section navigation, previous and next, and no cookie or foreign request', async ({ page, request, context, baseURL }) => {
    expect(pages.length).toBeGreaterThan(1);
    for (const [index, entry] of pages.entries()) {
      const raw = await request.get(path(entry.slug));
      expect(raw.status(), path(entry.slug)).toBe(200);
      expect(raw.headers()['content-type']).toContain('text/html');
      expect(raw.headers()['set-cookie']).toBeUndefined();

      const { response, foreign } = await visit(page, path(entry.slug), baseURL!);
      expect(response.status()).toBe(200);
      expect(response.headers()['set-cookie']).toBeUndefined();
      expect(foreign).toEqual([]);
      await expect(page.locator('h1')).toHaveCount(1);
      // The sidebar lists every page in manifest order and marks exactly the current one.
      const sidebar = page.getByRole('navigation', { name: 'Documentation' }).first();
      await expect(sidebar.getByRole('link')).toHaveText(pages.map(p => p.label));
      await expect(sidebar.locator('[aria-current="page"]')).toHaveText(entry.label);
      // The shared header marks Docs, and nothing else, as the current section.
      const current = page.getByRole('banner').locator('[aria-current]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute('href', '/docs');
      // Previous and next follow manifest order; the ends have one neighbour.
      const pager = page.getByRole('navigation', { name: 'Previous and next pages' });
      await expect(pager.locator('[rel="prev"]')).toHaveCount(index === 0 ? 0 : 1);
      await expect(pager.locator('[rel="next"]')).toHaveCount(index === pages.length - 1 ? 0 : 1);
      if (index > 0) await expect(pager.locator('[rel="prev"]')).toHaveAttribute('href', path(pages[index - 1].slug));
      if (index < pages.length - 1) await expect(pager.locator('[rel="next"]')).toHaveAttribute('href', path(pages[index + 1].slug));
    }
    expect(await context.cookies()).toEqual([]);
  });

  contract('DOCS-001', 'lists the page sections under On this page and links the header to the app', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/docs');
    const headings = await page.locator('.docs-prose h2').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
    await expect(page.getByRole('navigation', { name: 'On this page' }).getByRole('link')).toHaveText(headings);
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/signin');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Mango', exact: true })).toHaveAttribute('href', '/');
    // Client-side navigation after hydration: following a sidebar link does not reload the document.
    await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
    const origin = await page.evaluate(() => performance.timeOrigin);
    await page.getByRole('navigation', { name: 'Documentation' }).getByRole('link', { name: pages[1].label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path(pages[1].slug)}$`));
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  });

  contract('DOCS-001', 'the docs home answers at /docs and /docs/; unknown, miscased, nested and index slugs are a 404 in the shared frame', async ({ request, page }) => {
    expect((await request.get('/docs')).status()).toBe(200);
    // The router normalises the trailing slash, so /docs/ may answer through a redirect; the home is what a client lands on.
    const trailing = await request.get('/docs/');
    expect(trailing.status()).toBe(200);
    expect(new URL(trailing.url()).pathname).toBe('/docs');
    expect(await trailing.text()).toContain('<h1');
    const real = pages.find(entry => entry.slug.includes('-'))?.slug ?? pages[1].slug;
    for (const missing of ['no-such-page', real.toUpperCase(), `${real}/extra`, 'index', '__proto__', 'constructor']) {
      const response = await request.get(`/docs/${missing}`);
      expect(response.status(), `/docs/${missing}`).toBe(404);
      expect(response.headers()['set-cookie']).toBeUndefined();
      expect(await response.text()).not.toContain('mango-docs');
    }
    // The 404 keeps the shared header and footer and offers the way back to the docs home and the landing.
    for (const missing of ['/docs/no-such-page', `/docs/${real}/extra`]) {
      expect((await page.goto(missing))!.status(), missing).toBe(404);
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main a[href="/docs"]')).toHaveCount(1);
      await expect(page.locator('main a[href="/"]')).toHaveCount(1);
    }
  });

  contract('DOCS-001', 'the docs fit the screen at desktop and phone widths and the phone shows a Contents disclosure', async ({ page }) => {
    for (const [width, route] of [[1440, '/docs'], [390, '/docs'], [390, path(pages[1].slug)], [1440, '/docs/moving-in'], [390, '/docs/moving-in']] as const) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      await expectDocumentToFit(page, width);
      await expectNoSeriousAxeViolations(page, `docs-${width}-${route.replace(/\W+/g, '-')}`);
      if(route==='/docs/moving-in'){expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);await page.screenshot({path:test.info().outputPath(`moving-in-${width}.png`),fullPage:true});}
      const contents = page.locator('summary', { hasText: 'Contents' });
      if (width === 390) {
        await expect(contents).toBeVisible();
        await contents.click();
        await expect(page.locator('details[open] [aria-current="page"]')).toHaveCount(1);
      } else await expect(contents).toBeHidden();
    }
  });

  contract('DOCS-001', 'documentation is public while the operator app still requires a session', async ({ request }) => {
    const app = await request.get('/app', { maxRedirects: 0 });
    expect(app.status()).toBe(303);
    expect(app.headers().location).toBe('/signin?reason=session-required');
    const home = await request.get('/docs', { headers: { cookie: 'operator_session_local=not-a-real-session' } });
    expect(home.status()).toBe(200);
    expect(home.headers()['set-cookie']).toBeUndefined();
  });
});
