import { expect, test } from '@playwright/test';
import { contract } from './contract.js';
import { productConfig } from '../src/ext/config.ts';

/** Every section, heading and paragraph in the landing's main content is displayed and fully opaque. */
async function expectEverySectionVisible(page) {
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('main section, main h2, main p')]
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.99;
      })
      .map((element) => element.outerHTML.slice(0, 80)),
  );
  expect(hidden).toEqual([]);
  expect(await page.locator('main section').count()).toBeGreaterThan(1);
}

test.describe('public landing', () => {
  contract('HOME-001', 'serves a server-rendered, same-origin, cookie-free landing that reads without scripts or motion', async ({ page, request, browser, baseURL }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    expect(response.headers()['set-cookie']).toBeUndefined();
    const html = await response.text();
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('href="/signin"');
    // The hero says what Mango replaces in one line, the two product names in bold and the words unchanged; the meta
    // description ends with the same sentence as plain text.
    const heroLine = html.match(/<p class="hero-replaces">(.*?)<\/p>/s)?.[1];
    expect(heroLine, 'hero line').toBeTruthy();
    expect(heroLine.replace(/<[^>]+>/g, '')).toBe('100% free, open source alternative to Mailchimp and Klaviyo');
    expect([...heroLine.matchAll(/<(?:strong|b)>([^<]*)<\/(?:strong|b)>/g)].map(([, name]) => name)).toEqual(['Mailchimp', 'Klaviyo']);
    expect(html).toMatch(/<meta name="description" content="[^"<]*100% free, open source alternative to Mailchimp and Klaviyo\."/);    expect(html).toContain('href="/docs"');
    // Every in-page link (the skip link and the section links) lands on an element the server already rendered.
    const anchors = [...new Set([...html.matchAll(/href="#([\w-]+)"/g)].map(([, id]) => id))];
    expect(anchors.length).toBeGreaterThan(1);
    for (const id of anchors) expect(html, id).toMatch(new RegExp(`<(main|section)[^>]* id="${id}"`));

    const origin = new URL(baseURL).origin;
    const foreign = [];
    page.on('request', (sent) => {
      const url = new URL(sent.url());
      if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== origin) foreign.push(sent.url());
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(foreign).toEqual([]);
    expect(await page.context().cookies()).toEqual([]);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/signin');
    const animated = await page.evaluate(() => [...document.querySelectorAll('.mango-site *')].filter((element) => getComputedStyle(element).animationName !== 'none').length);
    expect(animated).toBe(0);
    await expectEverySectionVisible(page);

    // The footer shows the owner identity configured in src/ext/config.ts, and the credit only while it is switched on.
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText(productConfig.organizationName);
    await expect(footer).toContainText(productConfig.landingSummary);
    await expect(footer.locator('a[href="https://runeditrun.com"]')).toHaveCount(productConfig.showPoweredByCredit ? 1 : 0);

    const withoutScripts = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await withoutScripts.newPage();
    await staticPage.goto(`${baseURL}/`, { waitUntil: 'load' });
    await expectEverySectionVisible(staticPage);
    await withoutScripts.close();
  });
});
