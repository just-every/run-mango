import { expect, test } from "@playwright/test";
import { authoredBody, managedFooter } from "../../src/core/features/campaigns/authoring-content";

import { signInAsLocalOperator } from "./browser-checks";
import {
  assertUnsavedActions,
  campaignId,
  fillLongComposition,
  longBodyText,
  longLinkDestination,
  longLinkLabel,
  longName,
  longSubject,
  openTestSendPanel,
  readCampaign,
  restoreOriginalComposition,
  saveChanges,
} from "./review-layout-support";
test("campaign review saves and discards long edits without granting unsaved approval", async ({
  page,
  request,
}, testInfo) => {
  await signInAsLocalOperator(page, request);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name.startsWith('operator_session_local_'),
  );
  expect(session?.value).toBeTruthy();
  const cookie = `${session!.name}=${session!.value}`;
  const original = await readCampaign(request, cookie);
  expect(original.campaign.state).toBe("draft");
  expect(original.revision).toBeTruthy();

  const actionRequests: string[] = [];
  page.on("request", (browserRequest) => {
    if (
      browserRequest.method() === "POST" &&
      /\/api\/campaigns\/[^/]+\/(?:approve|test-send)$/.test(
        browserRequest.url(),
      )
    ) {
      actionRequests.push(browserRequest.url());
    }
  });

  await page.goto(`/app/campaigns/${encodeURIComponent(campaignId)}/review`);
  await expect(
    page.getByRole("heading", { name: original.revision!.name, exact: true }),
  ).toBeVisible();
  await openTestSendPanel(page);
  await page
    .getByLabel("Test destination", { exact: true })
    .fill("review-layout@example.test");

  let primaryFailure: unknown;
  try {
    await fillLongComposition(page);
    await assertUnsavedActions(page);
    expect(actionRequests).toEqual([]);

    await page
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(page.getByLabel("Campaign name", { exact: true })).toHaveValue(
      original.revision!.name,
    );
    await expect(page.getByLabel("Email subject", { exact: true })).toHaveValue(
      original.revision!.emailSubject,
    );
    await expect(
      page.getByRole("textbox", { name: "Email body", exact: true }),
    ).toHaveValue(authoredBody(original.revision!.emailBody));
    // Editor content excludes the automatic footer; discard must preserve the
    // complete persisted transport body and its visible compliance preview.
    expect((await readCampaign(request, cookie)).revision!.emailBody).toBe(
      original.revision!.emailBody,
    );
    if (original.revision!.emailBody.includes(managedFooter)) {
      const savedPreview = page.frameLocator('iframe[title="Saved email preview"]');
      expect(original.revision!.physicalAddress).toBeTruthy();
      await expect(savedPreview.locator("body")).toContainText(original.revision!.physicalAddress);
      const unsubscribePreview = savedPreview.locator("a").filter({ hasText: /^Unsubscribe$/ }).last();
      await expect(unsubscribePreview).toBeVisible();
      await expect(unsubscribePreview).not.toHaveAttribute("href");
      await expect(savedPreview.locator("hr").last()).toBeVisible();
    }
    if (original.links[0]) {
      await expect(
        page.getByLabel("Link 1 label", { exact: true }),
      ).toHaveValue(original.links[0].label);
      await expect(
        page.getByLabel("Link 1 destination", { exact: true }),
      ).toHaveValue(original.links[0].destinationUrl);
    } else {
      await expect(
        page.getByLabel("Link 1 label", { exact: true }),
      ).toHaveCount(0);
    }
    await expect(page.locator(".unsaved-notice")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Approve & schedule", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Send test", exact: true }),
    ).toBeEnabled();
    expect(await readCampaign(request, cookie)).toEqual(original);

    await fillLongComposition(page);
    await assertUnsavedActions(page);
    await saveChanges(page, testInfo);
    const saved = await readCampaign(request, cookie);
    expect(saved.revision!.name).toBe(longName);
    expect(saved.revision!.emailSubject).toBe(longSubject);
    expect(saved.revision!.emailBody).toContain(longBodyText);
    expect(saved.links[0]).toMatchObject({
      label: longLinkLabel,
      destinationUrl: longLinkDestination,
    });


    await page
      .getByLabel("Campaign name", { exact: true })
      .fill("Discard this saved-revision edit");
    await assertUnsavedActions(page);
    await page
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(page.getByLabel("Campaign name", { exact: true })).toHaveValue(
      longName,
    );
    expect(await readCampaign(request, cookie)).toEqual(saved);
    expect(actionRequests).toEqual([]);
  } catch (error) {
    primaryFailure = error;
  }

  let cleanupFailure: unknown;
  try {
    const current = await readCampaign(request, cookie);
    if (
      current.revision!.name !== original.revision!.name ||
      current.revision!.emailSubject !== original.revision!.emailSubject ||
      current.revision!.emailBody !== original.revision!.emailBody ||
      JSON.stringify(
        current.links.map(({ label, destinationUrl }) => ({
          label,
          destinationUrl,
        })),
      ) !==
        JSON.stringify(
          original.links.map(({ label, destinationUrl }) => ({
            label,
            destinationUrl,
          })),
        )
    ) {
      await restoreOriginalComposition(request, cookie, original);
    }
  } catch (error) {
    cleanupFailure = error;
  }

  if (primaryFailure !== undefined) {
    if (cleanupFailure !== undefined) {
      await testInfo.attach("review-layout-cleanup-error", {
        body:
          cleanupFailure instanceof Error
            ? (cleanupFailure.stack ?? cleanupFailure.message)
            : String(cleanupFailure),
        contentType: "text/plain",
      });
    }
    throw primaryFailure;
  }
  if (cleanupFailure !== undefined) throw cleanupFailure;
});
