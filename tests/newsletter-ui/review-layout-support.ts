import {
  expect,
  type APIRequestContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

import { normalizeAuthoredContent } from "../../src/core/features/campaigns/authoring-content";
import { summarizeAudienceRules } from "../../src/core/features/campaigns/audience-summary";
import type { CampaignDetail } from "../../src/core/app/client/lib/types";
import { toDraftComposition } from "../../src/core/features/campaigns/ui/draft-composition";

export const campaignId = "campaign_ui_composition_fixture_v4";
export const longName = "N".repeat(160);
export const longSubject = "S".repeat(250);
export const longLinkLabel = "L".repeat(160);
export const longLinkDestination = `https://store.example.test/${"d".repeat(220)}`;
export const longBodyText = "B".repeat(1400);
export const longBody = `<p>${longBodyText}</p><p><a href="${longLinkDestination}">${longLinkLabel}</a></p>`;

export async function readCampaign(
  request: APIRequestContext,
  cookie: string,
): Promise<CampaignDetail> {
  const response = await request.get(
    `/api/campaigns/${encodeURIComponent(campaignId)}`,
    {
      headers: { Cookie: cookie },
    },
  );
  expect(response.ok(), `campaign read returned ${response.status()}`).toBe(
    true,
  );
  return response.json();
}

async function setEmailBody(page: Page, value: string) {
  const htmlMode = page.getByRole("button", { name: "HTML mode", exact: true });
  if ((await htmlMode.getAttribute("aria-pressed")) !== "true")
    await htmlMode.click();
  await page
    .getByRole("textbox", { name: "Email body", exact: true })
    .fill(value);
}

export async function openTestSendPanel(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
  const disclosure = page.getByRole("button", {
    name: "Send a test",
    exact: true,
  });
  const expanded = await disclosure.getAttribute("aria-expanded");
  expect(["true", "false"]).toContain(expanded);
  if (expanded === "false") await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
}

export async function fillLongComposition(page: Page) {
  await page.getByLabel("Campaign name", { exact: true }).fill(longName);
  await page.getByLabel("Email subject", { exact: true }).fill(longSubject);
  const firstLinkLabel = page.getByLabel("Link 1 label", { exact: true });
  if ((await firstLinkLabel.count()) === 0) {
    await page
      .getByRole("button", { name: "Add destination link", exact: true })
      .click();
  }
  await firstLinkLabel.fill(longLinkLabel);
  await page
    .getByLabel("Link 1 destination", { exact: true })
    .fill(longLinkDestination);
  await setEmailBody(page, longBody);
}

export async function assertUnsavedActions(page: Page) {
  await openTestSendPanel(page);
  await expect(page.locator(".unsaved-notice")).toContainText(
    "Unsaved changes. Save before approving.",
  );
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Discard changes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve & schedule", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Send test", exact: true }),
  ).toBeDisabled();
}

export async function saveChanges(
  page: Page,
  testInfo: TestInfo,
  expectedBodyText = longBodyText,
) {
  const freshReview = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      new URL(response.url()).pathname.startsWith('/api/campaign-revisions/') &&
      new URL(response.url()).searchParams.get('review') === 'true',
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await freshReview).ok()).toBe(true);
  await expect(page.locator(".action-notice")).toContainText(
    /Draft saved\.|Full draft saved\./,
  );
  await expect(
    page.getByRole("button", { name: "Approve & schedule", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#approval-blocked-reason")).toBeVisible();
  await openTestSendPanel(page);
  await expect(
    page.getByRole("button", { name: "Send test", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Discard changes", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Saved revision content", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('iframe[title="Saved email preview"]'),
  ).toHaveAttribute("sandbox", "");
  if (expectedBodyText) {
    await expect(
      page.frameLocator('iframe[title="Saved email preview"]').locator("body"),
    ).toContainText(expectedBodyText.slice(0, 80));
  }
  await testInfo.attach("review-layout-fresh-review", {
    body: JSON.stringify({
      url: page.url(),
      freshReviewResponse: true,
      approveEnabled: true,
      testEnabled: true,
      iframeSandbox: "",
    }),
    contentType: "application/json",
  });
}

export async function restoreOriginalComposition(
  request: APIRequestContext,
  cookie: string,
  original: CampaignDetail,
) {
  const revision = original.revision!;
  const composition = toDraftComposition(
    revision,
    original.links,
    original.steps,
  );
  const expected = normalizeAuthoredContent(composition);
  const response = await request.patch(
    `/api/campaign-revisions/${revision.id}`,
    {
      headers: { Cookie: cookie },
      data: composition,
    },
  );
  expect(response.ok(), `fixture restore returned ${response.status()}`).toBe(
    true,
  );
  const restored = await readCampaign(request, cookie);
  expect(restored.revision).toMatchObject({
    inclusionRuleJson: expected.inclusionRuleJson,
    exclusionRulesJson: expected.exclusionRulesJson,
    messageCategory: expected.messageCategory,
    name: expected.name,
    audienceRule: summarizeAudienceRules(expected.inclusionRuleJson, expected.exclusionRulesJson),
    emailSubject: expected.emailSubject,
    emailBody: expected.emailBody,
    emailText: expected.emailText,
    preheader: expected.preheader,
    physicalAddress: expected.physicalAddress,
    smsBody: expected.smsBody,
    senderName: expected.senderName,
    fromEmail: expected.fromEmail,
    replyToEmail: expected.replyToEmail,
    smsSender: expected.smsSender,
  });
  expect(
    restored.links.map(({ label, destinationUrl }) => ({
      label,
      destinationUrl,
    })),
  ).toEqual(expected.links);
  expect(
    restored.steps.map(
      ({ channel, timezone, scheduledAt, sendByAt, whyThisTime }) => ({
        channel,
        timezone,
        scheduledAt,
        sendByAt,
        whyThisTime,
      }),
    ),
  ).toEqual(expected.steps);
}
