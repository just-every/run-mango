import { expect, test } from '@playwright/test';
import { localBootstrapToken } from './local-bootstrap.js';
import { readCampaign, restoreOriginalComposition } from './newsletter-ui/review-layout-support';
import { withApprovedSchedule } from './campaign-authoring/approved-schedule';

async function signInAsLocalOperator(page, request) {
  const response = await request.post('/api/_local/bootstrap', {
    headers: { 'X-Mango-Local-Bootstrap-Token': await localBootstrapToken() },
    data: { testSession: true },
  });
  await expect(response).toBeOK();
  const { session } = await response.json();
  await page.context().addCookies([
    { name: 'operator_session_local', value: session.token, domain: '127.0.0.1', path: '/' },
  ]);
}

test('operator campaign surfaces retain server proposal order, saved composition, counts, blockers, and schedule time', async ({ page, request }) => {
  test.setTimeout(120000);
  await signInAsLocalOperator(page, request);
  const session = (await page.context().cookies()).find(cookie => cookie.name === 'operator_session_local');
  expect(session?.value).toBeTruthy();
  const cookie = `operator_session_local=${session.value}`;
  const original = await readCampaign(request, cookie);
  try {

  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Decision Desk' })).toBeVisible();
  const serverOrder = await page.evaluate(async () => {
    const response = await fetch('/api/decision-desk');
    const data = await response.json();
    return data.proposals.map((entry) => entry.proposal.id);
  });
  await expect(page.locator('[data-proposal-id]')).toHaveCount(serverOrder.length);
  expect(await page.locator('[data-proposal-id]').evaluateAll((items) => items.map((item) => item.dataset.proposalId))).toEqual(serverOrder);
  await page.locator('[data-proposal-id="proposal_snapshot_only_v4"]').click();
  await expect(page.getByRole('heading', { name: 'Standalone audience snapshot' })).toBeVisible();
  await expect(page.getByRole('button', {name:'Use this', exact:true})).toBeVisible();
  const recipientCounts = page.getByLabel('Saved channel step counts');
  await expect(recipientCounts.getByText('2', { exact: true })).toBeVisible();
  await expect(recipientCounts.getByText('1', { exact: true })).toBeVisible();

  await page.goto('/app/campaigns');
  await expect(page.getByRole('heading', { name: 'Campaigns' })).toBeVisible();
  await expect(page.locator('a[href="/app/campaigns/campaign_table_runner_draft_v4/review"]')).toBeVisible();

  await page.goto('/app/campaigns/campaign_table_runner_draft_v4/review');
  await expect(page.getByRole('heading', { name: 'Linen table runner follow-up' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Approval checks', exact: true })).toBeVisible();
  await expect(page.getByLabel('Status: Blocking').first()).toBeVisible();
  const testDisclosure = page.getByRole('button', { name: 'Send a test', exact: true });
  await testDisclosure.click();
  await expect(testDisclosure).toHaveAttribute('aria-expanded', 'true');
  await page.getByLabel('Test destination').fill('not-allowlisted@example.test');
  await page.getByRole('button', { name: 'Send test' }).click();
  await expect(page.getByRole('alert').filter({hasText:'Campaign unchanged. Resolve the blockers below and try again.'})).toBeVisible();

  await page.goto('/app/campaigns/campaign_ui_composition_fixture_v4/review');
  await page.getByLabel('Campaign name').fill('UI saved CAMP-002 composition');
  await expect(page.getByRole('button', {name: 'Approve & schedule', exact: true})).toHaveCount(0);
  await page.getByRole('link', {name: '← Back to campaigns', exact: true}).click();
  await expect(page.getByRole('alertdialog')).toContainText('Leave without saving?');
  await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
  await expect(page.getByLabel('Campaign name')).toHaveValue('UI saved CAMP-002 composition');
  await page.getByLabel('Include 1 field').selectOption('contact:email');
  await page.getByLabel('Include 1 comparison').selectOption('contains');
  await page.getByLabel('Include 1 value').fill('browser-round-trip@example.test');
  await expect(page.getByLabel('Audience summary', {exact:true})).toContainText('browser-round-trip@example.test');
  await page.getByLabel('Email subject').fill('Browser-saved subject');
  await page.getByRole('button', {name:'HTML mode', exact:true}).click();
  await page.getByLabel('Email body').fill('Browser-saved email body.');
  await expect(page.getByLabel('Plain-text email')).not.toBeEditable();
  await expect(page.getByLabel('Plain-text email')).toHaveValue('Browser-saved email body.');
  await page.getByLabel(/SMS message/).fill('Browser-saved SMS. Reply STOP to unsubscribe.');
  await page.getByLabel('Sender name').fill('Mango UI');
  await page.getByLabel('From email').fill('ui-offers@example.test');
  await page.getByLabel('Reply-to email').fill('ui-care@example.test');
  await page.getByLabel('SMS sender').fill('MangoUI');
  const links = page.getByRole('group', { name: 'Saved links', exact: true });
  for (let remaining = await links.getByRole('button', { name: /^Remove link/ }).count(); remaining > 0; remaining--) await links.getByRole('button', { name: /^Remove link/ }).first().click();
  await expect(page.getByLabel('Link 1 label')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add destination link', exact: true }).click();
  await expect(page.getByLabel('Link 1 label')).toBeVisible();
  await page.getByLabel('Link 1 label').fill('UI link');
  await page.getByLabel('Link 1 destination').fill('https://store.example.test/ui-link');
  await page.getByLabel('IANA time zone').first().fill('America/New_York');
  await page.getByLabel('Local send date and time').first().fill('2031-03-10T10:00');
  await expect(page.getByLabel('Resolved UTC send instant').first()).not.toBeEditable();
  await expect(page.getByLabel('Resolved UTC send instant').first()).toHaveValue('2031-03-10T14:00:00.000Z');
  await page.getByLabel('Local send-by date and time').first().fill('2031-03-10T18:00');
  await expect(page.getByLabel('Resolved UTC send-by instant').first()).not.toBeEditable();
  await expect(page.getByLabel('Resolved UTC send-by instant').first()).toHaveValue('2031-03-10T22:00:00.000Z');
  await page.getByLabel('Why this time').first().fill('The operator selected this resolved instant in the browser.');
  await page.getByRole('button', { name: 'Save full draft' }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved.');
  await page.reload();
  await expect(page.getByLabel('Campaign name')).toHaveValue('UI saved CAMP-002 composition');
  await expect(page.getByLabel('Audience summary', {exact:true})).toContainText('browser-round-trip@example.test');
  await expect(page.getByLabel('Reply-to email')).toHaveValue('ui-care@example.test');
  await expect(page.getByLabel('SMS sender')).toHaveValue('MangoUI');
  await expect(page.getByLabel('Link 1 destination')).toHaveValue('https://store.example.test/ui-link');
  await expect(page.getByText('Browser-saved subject', { exact: true })).toBeVisible();

  const schedule = await (await page.request.get('/api/campaigns/campaign_sample_scheduled_v4')).json();
  await withApprovedSchedule(page, schedule.steps, async url => {
    await page.goto(url);
    const stepResults = page.getByRole('region', { name: 'Every scheduled step' });
    await expect(stepResults.locator('li')).toHaveCount(schedule.steps.length);
    await expect(stepResults).toContainText('Australia/Brisbane');
    await expect(stepResults).toContainText('Resolved UTC:');
    await expect(stepResults).toContainText(/Dispatches in/);
  });
  } finally {
    await restoreOriginalComposition(request, cookie, original);
  }
});
