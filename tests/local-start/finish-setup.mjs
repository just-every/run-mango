export async function finishSetup(page) {
  await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
  await page.getByLabel('Business display name', {exact: true}).fill('Mango Test Newsletter');
  await page.getByLabel('From email', {exact: true}).fill('newsletter@example.test');
  await page.getByLabel('Reply-to email', {exact: true}).fill('reply@example.test');
  await page.getByLabel('Physical postal address', {exact: true}).fill('123 Test Street, Brisbane QLD 4000, Australia');
  await page.getByRole('button', {name: 'Save sender details', exact: true}).click();
  await page.waitForURL(url => url.pathname === '/app');
}
