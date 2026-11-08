# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: presend-checks.journeys.ts >> [BUILD-008][BUILD-012][RESULT-001] preview a saved newsletter, resolve pre-send blockers and refuse unsafe handoff expansion
- Location: tests/go-live/presend-checks.journeys.ts:5:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Draft saved. Preview and checks are up to date.', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Draft saved. Preview and checks are up to date.', { exact: true }) with timeout 5000ms
  - waiting for getByText('Draft saved. Preview and checks are up to date.', { exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - link "Mango":
    - /url: /app
  - navigation "Operator navigation":
    - link "Decision Desk":
      - /url: /app
    - link "Campaigns":
      - /url: /app/campaigns
    - link "Audience":
      - /url: /app/audience
    - link "Flows":
      - /url: /app/flows
    - link "Insights":
      - /url: /app/insights
    - link "Activity":
      - /url: /app/settings/activity
    - link "Settings":
      - /url: /app/settings
    - text: Owner /
    - button "Sign out"
- main:
  - link "← Back to campaigns":
    - /url: /app/campaigns
  - paragraph: Review campaign
  - heading "Summer garden journal" [level=1]
  - paragraph: Revision 1 · Draft
  - button "Duplicate" [disabled]
  - button "Saving…" [disabled]
  - region "Campaign attribution":
    - paragraph: Campaign created by Owner on 8 Nov 2026, 4:44 pm.
  - status:
    - text: Unsaved changes. Save before approving.
    - button "Discard changes" [disabled]
  - region "Saved revision needs reloading":
    - paragraph: Saved revision needs reloading
    - paragraph: The displayed saved preview and checks are out of date. Approval and test sends are unavailable until the saved revision is reloaded.
    - paragraph: Your edits are still here. Save them, or discard them before reloading the saved revision.
    - button "Reload saved revision" [disabled]
  - region "Approval checks":
    - paragraph: Saved revision
    - heading "Approval checks" [level=2]:
      - button "Approval checks" [expanded]
    - paragraph: Approval will check this saved revision and current consent.
  - paragraph:
    - strong: "Saved audience:"
    - text: "Contacts matching any of these conditions: Email address is \"summer-reader@example.test\". No additional exclusions."
  - button "Save as a template"
  - form "Edit draft":
    - heading "Edit draft" [level=2]
    - paragraph: Preview updates when you save.
    - group:
      - text: Campaign name (required for approval)
      - textbox "Campaign name" [disabled]: Summer garden journal
      - text: Audience
      - paragraph: "Contacts matching any of these conditions: Email address is \"summer-reader@example.test\". No additional exclusions."
      - text: Consent message category (required for approval)
      - textbox "Consent message category" [disabled]: newsletter
      - text: Email subject (required for approval)
      - textbox "Email subject" [disabled]: "Summer garden journal: what is growing this month"
      - text: Email preheader (required for approval)
      - textbox "Email preheader" [disabled]: Seeds, beds and a spring market
      - text: Physical postal address (required for approval)
      - textbox "Physical postal address" [disabled]: 12 Market Lane, Brisbane QLD 4000, Australia
      - group "Email body (required for approval)":
        - text: Email body (required for approval)
        - button "Rich text" [disabled]
        - button "HTML mode" [disabled] [pressed]
        - button "Block builder" [disabled]
        - button "Import 12ui design" [disabled]
        - paragraph:
          - text: "Optional:"
          - link "12ui":
            - /url: https://12ui.com
          - text: is a separate AI design tool;
          - link "make a design image and LayerDoc layout file":
            - /url: /docs/first-newsletter#import-a-12ui-design
          - text: with your own account, then import them here.
        - button "Insert image" [disabled]
        - text: HTML email body
        - textbox "Email body" [disabled]: "<h1>Summer garden journal</h1><p>Hello {{displayName | fallback: Garden friend}}</p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p>Garden notes: herbs, seedlings and the summer market. </p><p><a href=\"https://shop.example.test/market\">Market details</a></p><p>{{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} </p>"
        - paragraph:
          - text: Personalise with
          - code: "{{displayName | fallback: Garden friend}}"
          - text: . Every token needs fallback text; other property names use their saved fallback.
        - group: Add a link to the message
        - paragraph: Unsubscribe and your postal address are added automatically when saved. Plain text is generated with the same destination links.
        - text: Plain-text email
        - textbox "Plain-text email" [disabled]: "Summer garden journal Hello {{displayName | fallback: Garden friend}} Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Market details (https://shop.example.test/market) {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}} {{displayName | fallback: friend}}"
      - status "Email sent size": Measuring email size…
      - text: Sender name (required for approval)
      - textbox "Sender name" [disabled]: Mango Garden
      - text: From email (required for approval)
      - textbox "From email" [disabled]: news@example.test
      - text: Reply-to email (required for approval)
      - textbox "Reply-to email" [disabled]: reply@example.test
      - checkbox "Track link clicks" [checked] [disabled]
      - text: Track link clicks
      - group "Start from a saved segment":
        - text: Start from a saved segment Saved segment
        - combobox "Saved segment" [disabled]:
          - option "Choose a segment" [disabled] [selected]
        - button "Copy segment into draft" [disabled]
        - paragraph: This replaces the draft's audience conditions. Later segment changes do not change saved or approved revisions.
      - group "Who should receive this?":
        - text: Who should receive this?
        - paragraph: Consent, suppression and frequency protections always apply. These controls change the actual audience.
        - group "Included contacts":
          - text: Included contacts Match conditions
          - combobox "Match conditions" [disabled]:
            - option "All conditions" [disabled]
            - option "Any condition" [disabled] [selected]
          - text: Include 1 field
          - combobox "Include 1 field" [disabled]:
            - option "Contact ID" [disabled]
            - option "Email subscription status" [disabled]
            - option "SMS subscription status" [disabled]
            - option "Contact name" [disabled]
            - option "Email address" [disabled] [selected]
            - option "Contact property" [disabled]
            - option "Tags" [disabled]
            - option "Confirmed channel consent" [disabled]
            - option "Confirmed topic consent" [disabled]
            - option "US state" [disabled]
            - option "US ZIP code" [disabled]
            - option "Distance in miles from ZIP (Census area points)" [disabled]
            - option "Human click" [disabled]
            - option "Paid topic member" [disabled]
            - option "RFM lifecycle stage" [disabled]
            - option "RFM days since last order" [disabled]
            - option "RFM recency score" [disabled]
            - option "RFM order frequency" [disabled]
            - option "RFM frequency score" [disabled]
            - option "RFM monetary score" [disabled]
            - option "RFM monetary value (minor currency units)" [disabled]
            - option "Placed Order count" [disabled]
            - option "Bought product ID" [disabled]
            - option "Bought collection ID" [disabled]
            - option "Bought category" [disabled]
            - option "Purchased product ID" [disabled]
            - option "Order total" [disabled]
            - option "Cart product ID" [disabled]
            - option "Viewed product ID" [disabled]
          - text: Include 1 comparison
          - combobox "Include 1 comparison" [disabled]:
            - option "is" [disabled] [selected]
            - option "is not" [disabled]
            - option "contains" [disabled]
            - option "is greater than" [disabled]
            - option "is at least" [disabled]
            - option "is less than" [disabled]
            - option "is at most" [disabled]
            - option "is one of" [disabled]
          - text: Include 1 value
          - textbox "Include 1 value" [disabled]: summer-reader@example.test
          - button "Add inclusion condition" [disabled]
          - button "Add Include group" [disabled]
        - button "Add exclusion" [disabled]
        - paragraph: "Contacts matching any of these conditions: Email address is \"summer-reader@example.test\". No additional exclusions."
        - paragraph: 1 candidate · 1 eligible contact · 0 excluded contacts
        - paragraph: "Email: 1 eligible contact · 1 message across 1 step"
        - paragraph: Based on current eligibility. Every step rechecks consent, frequency and store evidence before sending. A contact can have more than one exclusion reason.
      - group "Saved links":
        - text: Saved links Link 1 label (required)
        - textbox "Link 1 label" [disabled]: Market details
        - text: Link 1 destination (required)
        - textbox "Link 1 destination" [disabled]: https://shop.example.test/market
        - button "Remove link 1" [disabled]
        - button "Add destination link" [disabled]
      - group "Selected channel steps (required for approval)":
        - text: Selected channel steps (required for approval)
        - paragraph: Step 1
        - text: Channel
        - combobox "Channel" [disabled]:
          - option "Email" [disabled] [selected]
        - text: Time zone
        - combobox "Time zone" [disabled]:
          - option "Africa/Abidjan" [disabled]
          - option "Africa/Accra" [disabled]
          - option "Africa/Addis Ababa" [disabled]
          - option "Africa/Algiers" [disabled]
          - option "Africa/Asmera" [disabled]
          - option "Africa/Bamako" [disabled]
          - option "Africa/Bangui" [disabled]
          - option "Africa/Banjul" [disabled]
          - option "Africa/Bissau" [disabled]
          - option "Africa/Blantyre" [disabled]
          - option "Africa/Brazzaville" [disabled]
          - option "Africa/Bujumbura" [disabled]
          - option "Africa/Cairo" [disabled]
          - option "Africa/Casablanca" [disabled]
          - option "Africa/Ceuta" [disabled]
          - option "Africa/Conakry" [disabled]
          - option "Africa/Dakar" [disabled]
          - option "Africa/Dar es Salaam" [disabled]
          - option "Africa/Djibouti" [disabled]
          - option "Africa/Douala" [disabled]
          - option "Africa/El Aaiun" [disabled]
          - option "Africa/Freetown" [disabled]
          - option "Africa/Gaborone" [disabled]
          - option "Africa/Harare" [disabled]
          - option "Africa/Johannesburg" [disabled]
          - option "Africa/Juba" [disabled]
          - option "Africa/Kampala" [disabled]
          - option "Africa/Khartoum" [disabled]
          - option "Africa/Kigali" [disabled]
          - option "Africa/Kinshasa" [disabled]
          - option "Africa/Lagos" [disabled]
          - option "Africa/Libreville" [disabled]
          - option "Africa/Lome" [disabled]
          - option "Africa/Luanda" [disabled]
          - option "Africa/Lubumbashi" [disabled]
          - option "Africa/Lusaka" [disabled]
          - option "Africa/Malabo" [disabled]
          - option "Africa/Maputo" [disabled]
          - option "Africa/Maseru" [disabled]
          - option "Africa/Mbabane" [disabled]
          - option "Africa/Mogadishu" [disabled]
          - option "Africa/Monrovia" [disabled]
          - option "Africa/Nairobi" [disabled]
          - option "Africa/Ndjamena" [disabled]
          - option "Africa/Niamey" [disabled]
          - option "Africa/Nouakchott" [disabled]
          - option "Africa/Ouagadougou" [disabled]
          - option "Africa/Porto-Novo" [disabled]
          - option "Africa/Sao Tome" [disabled]
          - option "Africa/Tripoli" [disabled]
          - option "Africa/Tunis" [disabled]
          - option "Africa/Windhoek" [disabled]
          - option "America/Adak" [disabled]
          - option "America/Anchorage" [disabled]
          - option "America/Anguilla" [disabled]
          - option "America/Antigua" [disabled]
          - option "America/Araguaina" [disabled]
          - option "America/Argentina/La Rioja" [disabled]
          - option "America/Argentina/Rio Gallegos" [disabled]
          - option "America/Argentina/Salta" [disabled]
          - option "America/Argentina/San Juan" [disabled]
          - option "America/Argentina/San Luis" [disabled]
          - option "America/Argentina/Tucuman" [disabled]
          - option "America/Argentina/Ushuaia" [disabled]
          - option "America/Aruba" [disabled]
          - option "America/Asuncion" [disabled]
          - option "America/Bahia" [disabled]
          - option "America/Bahia Banderas" [disabled]
          - option "America/Barbados" [disabled]
          - option "America/Belem" [disabled]
          - option "America/Belize" [disabled]
          - option "America/Blanc-Sablon" [disabled]
          - option "America/Boa Vista" [disabled]
          - option "America/Bogota" [disabled]
          - option "America/Boise" [disabled]
          - option "America/Buenos Aires" [disabled]
          - option "America/Cambridge Bay" [disabled]
          - option "America/Campo Grande" [disabled]
          - option "America/Cancun" [disabled]
          - option "America/Caracas" [disabled]
          - option "America/Catamarca" [disabled]
          - option "America/Cayenne" [disabled]
          - option "America/Cayman" [disabled]
          - option "America/Chicago" [disabled]
          - option "America/Chihuahua" [disabled]
          - option "America/Ciudad Juarez" [disabled]
          - option "America/Coral Harbour" [disabled]
          - option "America/Cordoba" [disabled]
          - option "America/Costa Rica" [disabled]
          - option "America/Coyhaique" [disabled]
          - option "America/Creston" [disabled]
          - option "America/Cuiaba" [disabled]
          - option "America/Curacao" [disabled]
          - option "America/Danmarkshavn" [disabled]
          - option "America/Dawson" [disabled]
          - option "America/Dawson Creek" [disabled]
          - option "America/Denver" [disabled]
          - option "America/Detroit" [disabled]
          - option "America/Dominica" [disabled]
          - option "America/Edmonton" [disabled]
          - option "America/Eirunepe" [disabled]
          - option "America/El Salvador" [disabled]
          - option "America/Fort Nelson" [disabled]
          - option "America/Fortaleza" [disabled]
          - option "America/Glace Bay" [disabled]
          - option "America/Godthab" [disabled]
          - option "America/Goose Bay" [disabled]
          - option "America/Grand Turk" [disabled]
          - option "America/Grenada" [disabled]
          - option "America/Guadeloupe" [disabled]
          - option "America/Guatemala" [disabled]
          - option "America/Guayaquil" [disabled]
          - option "America/Guyana" [disabled]
          - option "America/Halifax" [disabled]
          - option "America/Havana" [disabled]
          - option "America/Hermosillo" [disabled]
          - option "America/Indiana/Knox" [disabled]
          - option "America/Indiana/Marengo" [disabled]
          - option "America/Indiana/Petersburg" [disabled]
          - option "America/Indiana/Tell City" [disabled]
          - option "America/Indiana/Vevay" [disabled]
          - option "America/Indiana/Vincennes" [disabled]
          - option "America/Indiana/Winamac" [disabled]
          - option "America/Indianapolis" [disabled]
          - option "America/Inuvik" [disabled]
          - option "America/Iqaluit" [disabled]
          - option "America/Jamaica" [disabled]
          - option "America/Jujuy" [disabled]
          - option "America/Juneau" [disabled]
          - option "America/Kentucky/Monticello" [disabled]
          - option "America/Kralendijk" [disabled]
          - option "America/La Paz" [disabled]
          - option "America/Lima" [disabled]
          - option "America/Los Angeles" [disabled]
          - option "America/Louisville" [disabled]
          - option "America/Lower Princes" [disabled]
          - option "America/Maceio" [disabled]
          - option "America/Managua" [disabled]
          - option "America/Manaus" [disabled]
          - option "America/Marigot" [disabled]
          - option "America/Martinique" [disabled]
          - option "America/Matamoros" [disabled]
          - option "America/Mazatlan" [disabled]
          - option "America/Mendoza" [disabled]
          - option "America/Menominee" [disabled]
          - option "America/Merida" [disabled]
          - option "America/Metlakatla" [disabled]
          - option "America/Mexico City" [disabled]
          - option "America/Miquelon" [disabled]
          - option "America/Moncton" [disabled]
          - option "America/Monterrey" [disabled]
          - option "America/Montevideo" [disabled]
          - option "America/Montserrat" [disabled]
          - option "America/Nassau" [disabled]
          - option "America/New York" [disabled]
          - option "America/Nome" [disabled]
          - option "America/Noronha" [disabled]
          - option "America/North Dakota/Beulah" [disabled]
          - option "America/North Dakota/Center" [disabled]
          - option "America/North Dakota/New Salem" [disabled]
          - option "America/Ojinaga" [disabled]
          - option "America/Panama" [disabled]
          - option "America/Paramaribo" [disabled]
          - option "America/Phoenix" [disabled]
          - option "America/Port-au-Prince" [disabled]
          - option "America/Port of Spain" [disabled]
          - option "America/Porto Velho" [disabled]
          - option "America/Puerto Rico" [disabled]
          - option "America/Punta Arenas" [disabled]
          - option "America/Rankin Inlet" [disabled]
          - option "America/Recife" [disabled]
          - option "America/Regina" [disabled]
          - option "America/Resolute" [disabled]
          - option "America/Rio Branco" [disabled]
          - option "America/Santarem" [disabled]
          - option "America/Santiago" [disabled]
          - option "America/Santo Domingo" [disabled]
          - option "America/Sao Paulo" [disabled]
          - option "America/Scoresbysund" [disabled]
          - option "America/Sitka" [disabled]
          - option "America/St Barthelemy" [disabled]
          - option "America/St Johns" [disabled]
          - option "America/St Kitts" [disabled]
          - option "America/St Lucia" [disabled]
          - option "America/St Thomas" [disabled]
          - option "America/St Vincent" [disabled]
          - option "America/Swift Current" [disabled]
          - option "America/Tegucigalpa" [disabled]
          - option "America/Thule" [disabled]
          - option "America/Tijuana" [disabled]
          - option "America/Toronto" [disabled]
          - option "America/Tortola" [disabled]
          - option "America/Vancouver" [disabled]
          - option "America/Whitehorse" [disabled]
          - option "America/Winnipeg" [disabled]
          - option "America/Yakutat" [disabled]
          - option "Antarctica/Casey" [disabled]
          - option "Antarctica/Davis" [disabled]
          - option "Antarctica/DumontDUrville" [disabled]
          - option "Antarctica/Macquarie" [disabled]
          - option "Antarctica/Mawson" [disabled]
          - option "Antarctica/McMurdo" [disabled]
          - option "Antarctica/Palmer" [disabled]
          - option "Antarctica/Rothera" [disabled]
          - option "Antarctica/Syowa" [disabled]
          - option "Antarctica/Troll" [disabled]
          - option "Antarctica/Vostok" [disabled]
          - option "Arctic/Longyearbyen" [disabled]
          - option "Asia/Aden" [disabled]
          - option "Asia/Almaty" [disabled]
          - option "Asia/Amman" [disabled]
          - option "Asia/Anadyr" [disabled]
          - option "Asia/Aqtau" [disabled]
          - option "Asia/Aqtobe" [disabled]
          - option "Asia/Ashgabat" [disabled]
          - option "Asia/Atyrau" [disabled]
          - option "Asia/Baghdad" [disabled]
          - option "Asia/Bahrain" [disabled]
          - option "Asia/Baku" [disabled]
          - option "Asia/Bangkok" [disabled]
          - option "Asia/Barnaul" [disabled]
          - option "Asia/Beirut" [disabled]
          - option "Asia/Bishkek" [disabled]
          - option "Asia/Brunei" [disabled]
          - option "Asia/Calcutta" [disabled]
          - option "Asia/Chita" [disabled]
          - option "Asia/Colombo" [disabled]
          - option "Asia/Damascus" [disabled]
          - option "Asia/Dhaka" [disabled]
          - option "Asia/Dili" [disabled]
          - option "Asia/Dubai" [disabled]
          - option "Asia/Dushanbe" [disabled]
          - option "Asia/Famagusta" [disabled]
          - option "Asia/Gaza" [disabled]
          - option "Asia/Hebron" [disabled]
          - option "Asia/Hong Kong" [disabled]
          - option "Asia/Hovd" [disabled]
          - option "Asia/Irkutsk" [disabled]
          - option "Asia/Jakarta" [disabled]
          - option "Asia/Jayapura" [disabled]
          - option "Asia/Jerusalem" [disabled]
          - option "Asia/Kabul" [disabled]
          - option "Asia/Kamchatka" [disabled]
          - option "Asia/Karachi" [disabled]
          - option "Asia/Katmandu" [disabled]
          - option "Asia/Khandyga" [disabled]
          - option "Asia/Krasnoyarsk" [disabled]
          - option "Asia/Kuala Lumpur" [disabled]
          - option "Asia/Kuching" [disabled]
          - option "Asia/Kuwait" [disabled]
          - option "Asia/Macau" [disabled]
          - option "Asia/Magadan" [disabled]
          - option "Asia/Makassar" [disabled]
          - option "Asia/Manila" [disabled]
          - option "Asia/Muscat" [disabled]
          - option "Asia/Nicosia" [disabled]
          - option "Asia/Novokuznetsk" [disabled]
          - option "Asia/Novosibirsk" [disabled]
          - option "Asia/Omsk" [disabled]
          - option "Asia/Oral" [disabled]
          - option "Asia/Phnom Penh" [disabled]
          - option "Asia/Pontianak" [disabled]
          - option "Asia/Pyongyang" [disabled]
          - option "Asia/Qatar" [disabled]
          - option "Asia/Qostanay" [disabled]
          - option "Asia/Qyzylorda" [disabled]
          - option "Asia/Rangoon" [disabled]
          - option "Asia/Riyadh" [disabled]
          - option "Asia/Saigon" [disabled]
          - option "Asia/Sakhalin" [disabled]
          - option "Asia/Samarkand" [disabled]
          - option "Asia/Seoul" [disabled]
          - option "Asia/Shanghai" [disabled]
          - option "Asia/Singapore" [disabled]
          - option "Asia/Srednekolymsk" [disabled]
          - option "Asia/Taipei" [disabled]
          - option "Asia/Tashkent" [disabled]
          - option "Asia/Tbilisi" [disabled]
          - option "Asia/Tehran" [disabled]
          - option "Asia/Thimphu" [disabled]
          - option "Asia/Tokyo" [disabled]
          - option "Asia/Tomsk" [disabled]
          - option "Asia/Ulaanbaatar" [disabled]
          - option "Asia/Urumqi" [disabled]
          - option "Asia/Ust-Nera" [disabled]
          - option "Asia/Vientiane" [disabled]
          - option "Asia/Vladivostok" [disabled]
          - option "Asia/Yakutsk" [disabled]
          - option "Asia/Yekaterinburg" [disabled]
          - option "Asia/Yerevan" [disabled]
          - option "Atlantic/Azores" [disabled]
          - option "Atlantic/Bermuda" [disabled]
          - option "Atlantic/Canary" [disabled]
          - option "Atlantic/Cape Verde" [disabled]
          - option "Atlantic/Faeroe" [disabled]
          - option "Atlantic/Madeira" [disabled]
          - option "Atlantic/Reykjavik" [disabled]
          - option "Atlantic/South Georgia" [disabled]
          - option "Atlantic/St Helena" [disabled]
          - option "Atlantic/Stanley" [disabled]
          - option "Australia/Adelaide" [disabled]
          - option "Australia/Brisbane" [disabled] [selected]
          - option "Australia/Broken Hill" [disabled]
          - option "Australia/Darwin" [disabled]
          - option "Australia/Eucla" [disabled]
          - option "Australia/Hobart" [disabled]
          - option "Australia/Lindeman" [disabled]
          - option "Australia/Lord Howe" [disabled]
          - option "Australia/Melbourne" [disabled]
          - option "Australia/Perth" [disabled]
          - option "Australia/Sydney" [disabled]
          - option "Europe/Amsterdam" [disabled]
          - option "Europe/Andorra" [disabled]
          - option "Europe/Astrakhan" [disabled]
          - option "Europe/Athens" [disabled]
          - option "Europe/Belgrade" [disabled]
          - option "Europe/Berlin" [disabled]
          - option "Europe/Bratislava" [disabled]
          - option "Europe/Brussels" [disabled]
          - option "Europe/Bucharest" [disabled]
          - option "Europe/Budapest" [disabled]
          - option "Europe/Busingen" [disabled]
          - option "Europe/Chisinau" [disabled]
          - option "Europe/Copenhagen" [disabled]
          - option "Europe/Dublin" [disabled]
          - option "Europe/Gibraltar" [disabled]
          - option "Europe/Guernsey" [disabled]
          - option "Europe/Helsinki" [disabled]
          - option "Europe/Isle of Man" [disabled]
          - option "Europe/Istanbul" [disabled]
          - option "Europe/Jersey" [disabled]
          - option "Europe/Kaliningrad" [disabled]
          - option "Europe/Kiev" [disabled]
          - option "Europe/Kirov" [disabled]
          - option "Europe/Lisbon" [disabled]
          - option "Europe/Ljubljana" [disabled]
          - option "Europe/London" [disabled]
          - option "Europe/Luxembourg" [disabled]
          - option "Europe/Madrid" [disabled]
          - option "Europe/Malta" [disabled]
          - option "Europe/Mariehamn" [disabled]
          - option "Europe/Minsk" [disabled]
          - option "Europe/Monaco" [disabled]
          - option "Europe/Moscow" [disabled]
          - option "Europe/Oslo" [disabled]
          - option "Europe/Paris" [disabled]
          - option "Europe/Podgorica" [disabled]
          - option "Europe/Prague" [disabled]
          - option "Europe/Riga" [disabled]
          - option "Europe/Rome" [disabled]
          - option "Europe/Samara" [disabled]
          - option "Europe/San Marino" [disabled]
          - option "Europe/Sarajevo" [disabled]
          - option "Europe/Saratov" [disabled]
          - option "Europe/Simferopol" [disabled]
          - option "Europe/Skopje" [disabled]
          - option "Europe/Sofia" [disabled]
          - option "Europe/Stockholm" [disabled]
          - option "Europe/Tallinn" [disabled]
          - option "Europe/Tirane" [disabled]
          - option "Europe/Ulyanovsk" [disabled]
          - option "Europe/Vaduz" [disabled]
          - option "Europe/Vatican" [disabled]
          - option "Europe/Vienna" [disabled]
          - option "Europe/Vilnius" [disabled]
          - option "Europe/Volgograd" [disabled]
          - option "Europe/Warsaw" [disabled]
          - option "Europe/Zagreb" [disabled]
          - option "Europe/Zurich" [disabled]
          - option "Indian/Antananarivo" [disabled]
          - option "Indian/Chagos" [disabled]
          - option "Indian/Christmas" [disabled]
          - option "Indian/Cocos" [disabled]
          - option "Indian/Comoro" [disabled]
          - option "Indian/Kerguelen" [disabled]
          - option "Indian/Mahe" [disabled]
          - option "Indian/Maldives" [disabled]
          - option "Indian/Mauritius" [disabled]
          - option "Indian/Mayotte" [disabled]
          - option "Indian/Reunion" [disabled]
          - option "Pacific/Apia" [disabled]
          - option "Pacific/Auckland" [disabled]
          - option "Pacific/Bougainville" [disabled]
          - option "Pacific/Chatham" [disabled]
          - option "Pacific/Easter" [disabled]
          - option "Pacific/Efate" [disabled]
          - option "Pacific/Enderbury" [disabled]
          - option "Pacific/Fakaofo" [disabled]
          - option "Pacific/Fiji" [disabled]
          - option "Pacific/Funafuti" [disabled]
          - option "Pacific/Galapagos" [disabled]
          - option "Pacific/Gambier" [disabled]
          - option "Pacific/Guadalcanal" [disabled]
          - option "Pacific/Guam" [disabled]
          - option "Pacific/Honolulu" [disabled]
          - option "Pacific/Kiritimati" [disabled]
          - option "Pacific/Kosrae" [disabled]
          - option "Pacific/Kwajalein" [disabled]
          - option "Pacific/Majuro" [disabled]
          - option "Pacific/Marquesas" [disabled]
          - option "Pacific/Midway" [disabled]
          - option "Pacific/Nauru" [disabled]
          - option "Pacific/Niue" [disabled]
          - option "Pacific/Norfolk" [disabled]
          - option "Pacific/Noumea" [disabled]
          - option "Pacific/Pago Pago" [disabled]
          - option "Pacific/Palau" [disabled]
          - option "Pacific/Pitcairn" [disabled]
          - option "Pacific/Ponape" [disabled]
          - option "Pacific/Port Moresby" [disabled]
          - option "Pacific/Rarotonga" [disabled]
          - option "Pacific/Saipan" [disabled]
          - option "Pacific/Tahiti" [disabled]
          - option "Pacific/Tarawa" [disabled]
          - option "Pacific/Tongatapu" [disabled]
          - option "Pacific/Truk" [disabled]
          - option "Pacific/Wake" [disabled]
          - option "Pacific/Wallis" [disabled]
        - text: Local send date and time (required)
        - textbox "Local send date and time" [disabled]: 2026-11-09T03:44
        - text: Local send-by date and time (required)
        - textbox "Local send-by date and time" [disabled]: 2026-11-09T05:44
        - text: Why this time (required)
        - textbox "Why this time" [disabled]: Owner chose this time
        - button "Remove step 1" [disabled]
        - button "Add email step" [disabled]
    - button "Save full draft" [disabled]
  - paragraph: Previews
  - heading "Saved revision content" [level=2]
  - region "Saved revision previews":
    - article:
      - paragraph: Email · saved revision
      - paragraph: Mango Garden
      - 'heading "Summer garden journal: what is growing this month" [level=3]'
      - paragraph: "Preheader: Seeds, beds and a spring market"
      - paragraph: "Example: Alex Example; missing personalisation values use their saved fallback. Links are inactive. Unsubscribe uses an example URL."
      - group: Preview as a contact
      - group "Email preview width":
        - button "Desktop email" [pressed]
        - button "Mobile email"
      - group "Email preview appearance":
        - button "Light mode" [pressed]
        - button "Dark approximation"
      - iframe
      - text: From news@example.test · Reply-to reply@example.test
    - paragraph: Text messages are disabled for this email-only campaign.
    - article:
      - paragraph: Plain text · saved revision
      - paragraph: "Summer garden journal Hello Alex Example Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Garden notes: herbs, seedlings and the summer market. Market details (https://shop.example.test/market?utm_source=mango&utm_medium=email&utm_campaign=summer-garden-journal&utm_content=01M6Y0QTX986Y2BM08407XF23X) Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example Alex Example 12 Market Lane, Brisbane QLD 4000, Australia Unsubscribe (https://preview.invalid/unsubscribe/example)"
    - article:
      - paragraph: Links · saved revision
      - list:
        - listitem:
          - strong: Market details
          - text: https://shop.example.test/market
  - button "Send a test"
  - group "Inactivity for this campaign":
    - text: Inactivity for this campaign
    - paragraph: Dormant means no activity for 365 days.
    - checkbox "Exclude dormant contacts" [checked] [disabled]
    - text: Exclude dormant contacts
    - button "Include open-only contacts" [disabled]
  - region "No saved audience snapshot":
    - paragraph: Audience snapshot
    - heading "No saved audience snapshot" [level=2]
    - paragraph: "Contacts matching any of these conditions: Email address is \"summer-reader@example.test\". No additional exclusions."
    - paragraph: No audience or message counts were saved for this draft.
  - region "Resolved delivery plan":
    - paragraph: Channel & timing
    - heading "Resolved delivery plan" [level=2]
    - strong: Email
    - time: 8 Nov 2026, 5:44 pm
    - text: Send by 8 Nov 2026, 7:44 pm
    - paragraph: Owner chose this time
- contentinfo:
  - text: Times shown in
  - combobox "Times shown in":
    - option "UTC" [selected]
    - option "Africa/Abidjan"
    - option "Africa/Accra"
    - option "Africa/Addis Ababa"
    - option "Africa/Algiers"
    - option "Africa/Asmera"
    - option "Africa/Bamako"
    - option "Africa/Bangui"
    - option "Africa/Banjul"
    - option "Africa/Bissau"
    - option "Africa/Blantyre"
    - option "Africa/Brazzaville"
    - option "Africa/Bujumbura"
    - option "Africa/Cairo"
    - option "Africa/Casablanca"
    - option "Africa/Ceuta"
    - option "Africa/Conakry"
    - option "Africa/Dakar"
    - option "Africa/Dar es Salaam"
    - option "Africa/Djibouti"
    - option "Africa/Douala"
    - option "Africa/El Aaiun"
    - option "Africa/Freetown"
    - option "Africa/Gaborone"
    - option "Africa/Harare"
    - option "Africa/Johannesburg"
    - option "Africa/Juba"
    - option "Africa/Kampala"
    - option "Africa/Khartoum"
    - option "Africa/Kigali"
    - option "Africa/Kinshasa"
    - option "Africa/Lagos"
    - option "Africa/Libreville"
    - option "Africa/Lome"
    - option "Africa/Luanda"
    - option "Africa/Lubumbashi"
    - option "Africa/Lusaka"
    - option "Africa/Malabo"
    - option "Africa/Maputo"
    - option "Africa/Maseru"
    - option "Africa/Mbabane"
    - option "Africa/Mogadishu"
    - option "Africa/Monrovia"
    - option "Africa/Nairobi"
    - option "Africa/Ndjamena"
    - option "Africa/Niamey"
    - option "Africa/Nouakchott"
    - option "Africa/Ouagadougou"
    - option "Africa/Porto-Novo"
    - option "Africa/Sao Tome"
    - option "Africa/Tripoli"
    - option "Africa/Tunis"
    - option "Africa/Windhoek"
    - option "America/Adak"
    - option "America/Anchorage"
    - option "America/Anguilla"
    - option "America/Antigua"
    - option "America/Araguaina"
    - option "America/Argentina/La Rioja"
    - option "America/Argentina/Rio Gallegos"
    - option "America/Argentina/Salta"
    - option "America/Argentina/San Juan"
    - option "America/Argentina/San Luis"
    - option "America/Argentina/Tucuman"
    - option "America/Argentina/Ushuaia"
    - option "America/Aruba"
    - option "America/Asuncion"
    - option "America/Bahia"
    - option "America/Bahia Banderas"
    - option "America/Barbados"
    - option "America/Belem"
    - option "America/Belize"
    - option "America/Blanc-Sablon"
    - option "America/Boa Vista"
    - option "America/Bogota"
    - option "America/Boise"
    - option "America/Buenos Aires"
    - option "America/Cambridge Bay"
    - option "America/Campo Grande"
    - option "America/Cancun"
    - option "America/Caracas"
    - option "America/Catamarca"
    - option "America/Cayenne"
    - option "America/Cayman"
    - option "America/Chicago"
    - option "America/Chihuahua"
    - option "America/Ciudad Juarez"
    - option "America/Coral Harbour"
    - option "America/Cordoba"
    - option "America/Costa Rica"
    - option "America/Coyhaique"
    - option "America/Creston"
    - option "America/Cuiaba"
    - option "America/Curacao"
    - option "America/Danmarkshavn"
    - option "America/Dawson"
    - option "America/Dawson Creek"
    - option "America/Denver"
    - option "America/Detroit"
    - option "America/Dominica"
    - option "America/Edmonton"
    - option "America/Eirunepe"
    - option "America/El Salvador"
    - option "America/Fort Nelson"
    - option "America/Fortaleza"
    - option "America/Glace Bay"
    - option "America/Godthab"
    - option "America/Goose Bay"
    - option "America/Grand Turk"
    - option "America/Grenada"
    - option "America/Guadeloupe"
    - option "America/Guatemala"
    - option "America/Guayaquil"
    - option "America/Guyana"
    - option "America/Halifax"
    - option "America/Havana"
    - option "America/Hermosillo"
    - option "America/Indiana/Knox"
    - option "America/Indiana/Marengo"
    - option "America/Indiana/Petersburg"
    - option "America/Indiana/Tell City"
    - option "America/Indiana/Vevay"
    - option "America/Indiana/Vincennes"
    - option "America/Indiana/Winamac"
    - option "America/Indianapolis"
    - option "America/Inuvik"
    - option "America/Iqaluit"
    - option "America/Jamaica"
    - option "America/Jujuy"
    - option "America/Juneau"
    - option "America/Kentucky/Monticello"
    - option "America/Kralendijk"
    - option "America/La Paz"
    - option "America/Lima"
    - option "America/Los Angeles"
    - option "America/Louisville"
    - option "America/Lower Princes"
    - option "America/Maceio"
    - option "America/Managua"
    - option "America/Manaus"
    - option "America/Marigot"
    - option "America/Martinique"
    - option "America/Matamoros"
    - option "America/Mazatlan"
    - option "America/Mendoza"
    - option "America/Menominee"
    - option "America/Merida"
    - option "America/Metlakatla"
    - option "America/Mexico City"
    - option "America/Miquelon"
    - option "America/Moncton"
    - option "America/Monterrey"
    - option "America/Montevideo"
    - option "America/Montserrat"
    - option "America/Nassau"
    - option "America/New York"
    - option "America/Nome"
    - option "America/Noronha"
    - option "America/North Dakota/Beulah"
    - option "America/North Dakota/Center"
    - option "America/North Dakota/New Salem"
    - option "America/Ojinaga"
    - option "America/Panama"
    - option "America/Paramaribo"
    - option "America/Phoenix"
    - option "America/Port-au-Prince"
    - option "America/Port of Spain"
    - option "America/Porto Velho"
    - option "America/Puerto Rico"
    - option "America/Punta Arenas"
    - option "America/Rankin Inlet"
    - option "America/Recife"
    - option "America/Regina"
    - option "America/Resolute"
    - option "America/Rio Branco"
    - option "America/Santarem"
    - option "America/Santiago"
    - option "America/Santo Domingo"
    - option "America/Sao Paulo"
    - option "America/Scoresbysund"
    - option "America/Sitka"
    - option "America/St Barthelemy"
    - option "America/St Johns"
    - option "America/St Kitts"
    - option "America/St Lucia"
    - option "America/St Thomas"
    - option "America/St Vincent"
    - option "America/Swift Current"
    - option "America/Tegucigalpa"
    - option "America/Thule"
    - option "America/Tijuana"
    - option "America/Toronto"
    - option "America/Tortola"
    - option "America/Vancouver"
    - option "America/Whitehorse"
    - option "America/Winnipeg"
    - option "America/Yakutat"
    - option "Antarctica/Casey"
    - option "Antarctica/Davis"
    - option "Antarctica/DumontDUrville"
    - option "Antarctica/Macquarie"
    - option "Antarctica/Mawson"
    - option "Antarctica/McMurdo"
    - option "Antarctica/Palmer"
    - option "Antarctica/Rothera"
    - option "Antarctica/Syowa"
    - option "Antarctica/Troll"
    - option "Antarctica/Vostok"
    - option "Arctic/Longyearbyen"
    - option "Asia/Aden"
    - option "Asia/Almaty"
    - option "Asia/Amman"
    - option "Asia/Anadyr"
    - option "Asia/Aqtau"
    - option "Asia/Aqtobe"
    - option "Asia/Ashgabat"
    - option "Asia/Atyrau"
    - option "Asia/Baghdad"
    - option "Asia/Bahrain"
    - option "Asia/Baku"
    - option "Asia/Bangkok"
    - option "Asia/Barnaul"
    - option "Asia/Beirut"
    - option "Asia/Bishkek"
    - option "Asia/Brunei"
    - option "Asia/Calcutta"
    - option "Asia/Chita"
    - option "Asia/Colombo"
    - option "Asia/Damascus"
    - option "Asia/Dhaka"
    - option "Asia/Dili"
    - option "Asia/Dubai"
    - option "Asia/Dushanbe"
    - option "Asia/Famagusta"
    - option "Asia/Gaza"
    - option "Asia/Hebron"
    - option "Asia/Hong Kong"
    - option "Asia/Hovd"
    - option "Asia/Irkutsk"
    - option "Asia/Jakarta"
    - option "Asia/Jayapura"
    - option "Asia/Jerusalem"
    - option "Asia/Kabul"
    - option "Asia/Kamchatka"
    - option "Asia/Karachi"
    - option "Asia/Katmandu"
    - option "Asia/Khandyga"
    - option "Asia/Krasnoyarsk"
    - option "Asia/Kuala Lumpur"
    - option "Asia/Kuching"
    - option "Asia/Kuwait"
    - option "Asia/Macau"
    - option "Asia/Magadan"
    - option "Asia/Makassar"
    - option "Asia/Manila"
    - option "Asia/Muscat"
    - option "Asia/Nicosia"
    - option "Asia/Novokuznetsk"
    - option "Asia/Novosibirsk"
    - option "Asia/Omsk"
    - option "Asia/Oral"
    - option "Asia/Phnom Penh"
    - option "Asia/Pontianak"
    - option "Asia/Pyongyang"
    - option "Asia/Qatar"
    - option "Asia/Qostanay"
    - option "Asia/Qyzylorda"
    - option "Asia/Rangoon"
    - option "Asia/Riyadh"
    - option "Asia/Saigon"
    - option "Asia/Sakhalin"
    - option "Asia/Samarkand"
    - option "Asia/Seoul"
    - option "Asia/Shanghai"
    - option "Asia/Singapore"
    - option "Asia/Srednekolymsk"
    - option "Asia/Taipei"
    - option "Asia/Tashkent"
    - option "Asia/Tbilisi"
    - option "Asia/Tehran"
    - option "Asia/Thimphu"
    - option "Asia/Tokyo"
    - option "Asia/Tomsk"
    - option "Asia/Ulaanbaatar"
    - option "Asia/Urumqi"
    - option "Asia/Ust-Nera"
    - option "Asia/Vientiane"
    - option "Asia/Vladivostok"
    - option "Asia/Yakutsk"
    - option "Asia/Yekaterinburg"
    - option "Asia/Yerevan"
    - option "Atlantic/Azores"
    - option "Atlantic/Bermuda"
    - option "Atlantic/Canary"
    - option "Atlantic/Cape Verde"
    - option "Atlantic/Faeroe"
    - option "Atlantic/Madeira"
    - option "Atlantic/Reykjavik"
    - option "Atlantic/South Georgia"
    - option "Atlantic/St Helena"
    - option "Atlantic/Stanley"
    - option "Australia/Adelaide"
    - option "Australia/Brisbane"
    - option "Australia/Broken Hill"
    - option "Australia/Darwin"
    - option "Australia/Eucla"
    - option "Australia/Hobart"
    - option "Australia/Lindeman"
    - option "Australia/Lord Howe"
    - option "Australia/Melbourne"
    - option "Australia/Perth"
    - option "Australia/Sydney"
    - option "Europe/Amsterdam"
    - option "Europe/Andorra"
    - option "Europe/Astrakhan"
    - option "Europe/Athens"
    - option "Europe/Belgrade"
    - option "Europe/Berlin"
    - option "Europe/Bratislava"
    - option "Europe/Brussels"
    - option "Europe/Bucharest"
    - option "Europe/Budapest"
    - option "Europe/Busingen"
    - option "Europe/Chisinau"
    - option "Europe/Copenhagen"
    - option "Europe/Dublin"
    - option "Europe/Gibraltar"
    - option "Europe/Guernsey"
    - option "Europe/Helsinki"
    - option "Europe/Isle of Man"
    - option "Europe/Istanbul"
    - option "Europe/Jersey"
    - option "Europe/Kaliningrad"
    - option "Europe/Kiev"
    - option "Europe/Kirov"
    - option "Europe/Lisbon"
    - option "Europe/Ljubljana"
    - option "Europe/London"
    - option "Europe/Luxembourg"
    - option "Europe/Madrid"
    - option "Europe/Malta"
    - option "Europe/Mariehamn"
    - option "Europe/Minsk"
    - option "Europe/Monaco"
    - option "Europe/Moscow"
    - option "Europe/Oslo"
    - option "Europe/Paris"
    - option "Europe/Podgorica"
    - option "Europe/Prague"
    - option "Europe/Riga"
    - option "Europe/Rome"
    - option "Europe/Samara"
    - option "Europe/San Marino"
    - option "Europe/Sarajevo"
    - option "Europe/Saratov"
    - option "Europe/Simferopol"
    - option "Europe/Skopje"
    - option "Europe/Sofia"
    - option "Europe/Stockholm"
    - option "Europe/Tallinn"
    - option "Europe/Tirane"
    - option "Europe/Ulyanovsk"
    - option "Europe/Vaduz"
    - option "Europe/Vatican"
    - option "Europe/Vienna"
    - option "Europe/Vilnius"
    - option "Europe/Volgograd"
    - option "Europe/Warsaw"
    - option "Europe/Zagreb"
    - option "Europe/Zurich"
    - option "Indian/Antananarivo"
    - option "Indian/Chagos"
    - option "Indian/Christmas"
    - option "Indian/Cocos"
    - option "Indian/Comoro"
    - option "Indian/Kerguelen"
    - option "Indian/Mahe"
    - option "Indian/Maldives"
    - option "Indian/Mauritius"
    - option "Indian/Mayotte"
    - option "Indian/Reunion"
    - option "Pacific/Apia"
    - option "Pacific/Auckland"
    - option "Pacific/Bougainville"
    - option "Pacific/Chatham"
    - option "Pacific/Easter"
    - option "Pacific/Efate"
    - option "Pacific/Enderbury"
    - option "Pacific/Fakaofo"
    - option "Pacific/Fiji"
    - option "Pacific/Funafuti"
    - option "Pacific/Galapagos"
    - option "Pacific/Gambier"
    - option "Pacific/Guadalcanal"
    - option "Pacific/Guam"
    - option "Pacific/Honolulu"
    - option "Pacific/Kiritimati"
    - option "Pacific/Kosrae"
    - option "Pacific/Kwajalein"
    - option "Pacific/Majuro"
    - option "Pacific/Marquesas"
    - option "Pacific/Midway"
    - option "Pacific/Nauru"
    - option "Pacific/Niue"
    - option "Pacific/Norfolk"
    - option "Pacific/Noumea"
    - option "Pacific/Pago Pago"
    - option "Pacific/Palau"
    - option "Pacific/Pitcairn"
    - option "Pacific/Ponape"
    - option "Pacific/Port Moresby"
    - option "Pacific/Rarotonga"
    - option "Pacific/Saipan"
    - option "Pacific/Tahiti"
    - option "Pacific/Tarawa"
    - option "Pacific/Tongatapu"
    - option "Pacific/Truk"
    - option "Pacific/Wake"
    - option "Pacific/Wallis"
```

# Test source

```ts
  1   | const width = 1440;
  2   | import {oversizedReuse} from './email-size-reuse';
  3   | import {oversizedImports} from './email-size-imports';
  4   | import {expect} from '@playwright/test';
  5   | import {contract} from '../contract.js';
  6   | import {providerEdge} from './edge';
  7   | import {eventSigner} from './sendgrid-events';
  8   | import {installation,json,sender,confirmedContact,draftCampaign,approve,dispatch} from './harness';
  9   | import {openPage,reloadPage} from '../support/navigation';
  10  | 
  11  | 
  12  | 
  13  | export const walk0 = async({page},info)=>{
  14  |   const edge=await providerEdge(),site=await installation(edge,eventSigner());
  15  |   try {
  16  |     const cookie=await site.open();
  17  |     await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
  18  |     await site.control('/_golive/sender-evidence');
  19  |     await json(await site.call('/api/settings/link-hosts',{method:'PUT',cookie,body:{hosts:'shop.example.test'}}),200);
  20  |     const email='summer-reader@example.test',name='Iris & Renée <Garden>';
  21  |     await confirmedContact(site,edge,cookie,email,name);
  22  |     await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  23  |     await oversizedImports(site,cookie,page,info,'<p>'+ '🌱'.repeat(28160)+'</p>');
  24  |     const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000);
  25  |     const campaign=await draftCampaign(site,cookie,'Summer garden journal',[email],due);
  26  |     const patch=(body:unknown)=>site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body});
  27  |     const body='<h1>Summer garden journal</h1><p>Hello {{displayName | fallback: Garden friend}}</p>'+('<p>Garden notes: herbs, seedlings and the summer market. </p>'.repeat(500))+'<p><a href="https://shop.example.test/market">Market details</a></p>'+ '<p>'+'{{displayName | fallback: friend}} '.repeat(800)+'</p>';
  28  |     await json(await patch({emailBody:body,trackingEnabled:true}),200);
  29  |     const detail=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
  30  |     expect(detail.revision.emailBody.length).toBeGreaterThan(20000);
  31  |     const template=await json(await site.call('/api/campaign-templates',{method:'POST',cookie,body:{revisionId:campaign.revisionId,name:'Large garden letter'}}),201);
  32  |     for(const path of [`/api/campaign-templates/${template.id}/start`,`/api/campaigns/${campaign.campaignId}/duplicate`]) {
  33  |       const copy=await json(await site.call(path,{method:'POST',cookie,body:{}}),201);
  34  |       expect((await json(await site.call(`/api/campaigns/${copy.campaignId}`,{cookie}),200)).revision).toMatchObject({emailBody:detail.revision.emailBody,state:'draft',approvedAt:null});
  35  |     }
  36  |     const plainMeasured=await json(await site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{emailText:'🌱'.repeat(28160)}}),200);
  37  |     expect(plainMeasured.exceedsLimit).toBe(true);
  38  |     expect(plainMeasured.textBytes).toBeGreaterThan(plainMeasured.limitBytes);
  39  |     expect(plainMeasured.htmlBytes).toBeLessThanOrEqual(plainMeasured.limitBytes);
  40  |     expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200)).revision).toEqual(detail.revision);
  41  |     const measured=await json(await site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{emailBody:body,preheader:detail.revision.preheader,physicalAddress:sender.physicalAddress,trackingEnabled:true}}),200);
  42  |     expect(measured.exceedsLimit).toBe(false);
  43  |     expect(measured.largestBlocks.length).toBeGreaterThan(0);
  44  |     await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  45  |      {
  46  |       await page.setViewportSize({width,height:1000});
  47  |       // The debounced meter is asynchronous even after document hydration.
  48  |       const report=page.waitForResponse(response=>response.url()===`${site.runtime.url}/api/campaign-authoring/email-size`&&response.request().method()==='POST');
  49  |       await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
  50  |       await page.getByRole('button',{name:'HTML mode',exact:true}).click();
  51  |       await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveValue(body);
  52  |       const measuredResponse=await report;
  53  |       await info.attach(`meter-response-${width}`,{body:JSON.stringify({status:measuredResponse.status(),matchesSavedBody:measuredResponse.request().postDataJSON().emailBody===detail.revision.emailBody,requestBodyCharacters:measuredResponse.request().postDataJSON().emailBody?.length}),contentType:'application/json'});
  54  |       expect(measuredResponse.request().postDataJSON().emailBody).toBe(detail.revision.emailBody);
  55  |       expect(measuredResponse.status()).toBe(200);
  56  |       expect(await measuredResponse.json()).toMatchObject({exceedsLimit:false});
  57  |       await expect(page.getByRole('status',{name:'Email sent size'})).toContainText('Email size');
  58  |       await page.locator('.editor-panel').screenshot({path:info.outputPath(`large-email-${width}.png`)});
  59  |       await page.getByRole('status',{name:'Email sent size'}).screenshot({path:info.outputPath(`email-size-meter-${width}.png`)});
  60  |       expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  61  |     }
  62  |     const oversized='<h1>Summer garden journal</h1><p>'+'🌱'.repeat(28160)+'</p>';
  63  |     const refused=await json(await patch({emailBody:oversized}),400);
  64  |     expect(refused).toMatchObject({error:'email_too_large',size:{exceedsLimit:true}});
  65  |     expect(refused.detail).toContain('Largest blocks');
  66  |     expect(refused.size.htmlBytes).toBeGreaterThan(refused.size.limitBytes);
  67  |     expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200)).revision.emailBody).toBe(detail.revision.emailBody);
  68  |      {
  69  |       await page.setViewportSize({width,height:1000});
  70  |       await page.getByRole('textbox',{name:'Email body',exact:true}).fill(oversized);
  71  |       await page.getByRole('button',{name:'Save full draft',exact:true}).click();
  72  |       await expect(page.getByText(/Email is too large\./).first()).toBeVisible();
  73  |       await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveValue(oversized);
  74  |       await page.locator('.editor-panel').screenshot({path:info.outputPath(`email-refused-${width}.png`)});
  75  |     }
  76  |     await page.getByRole('textbox',{name:'Email body',exact:true}).fill(body);
  77  |     await page.getByRole('button',{name:'Save full draft',exact:true}).click();
> 78  |     await expect(page.getByText('Draft saved. Preview and checks are up to date.',{exact:true})).toBeVisible();
      |                                                                                                  ^ Error: expect(locator).toBeVisible() failed
  79  |     await approve(site,cookie,campaign);
  80  |     await site.control('/_golive/clock',{advanceMs:3600001});
  81  |     const recipients=await dispatch(site,campaign.campaignId,due);
  82  |     expect(recipients[0].transport_disposition).toBe('accepted');
  83  |     const sent=edge.sends.findLast(send=>send.body.headers?.['List-Unsubscribe']);
  84  |     const html=sent!.body.content.find((part:any)=>part.type==='text/html').value;
  85  |     expect(Buffer.byteLength(html)).toBeLessThanOrEqual(measured.htmlBytes);
  86  |     expect(html).toContain('Iris &amp; Renée &lt;Garden&gt;');
  87  |     expect(html).toContain('/l/');
  88  |     expect(html).not.toContain('{{');
  89  |     // A new saved name after approval must not allow an oversized handoff.
  90  |     await site.control('/_golive/clock',{advanceMs:25*3600000});
  91  |     await site.control('/_golive/sender-evidence');
  92  |     const nextClock=await site.control('/_golive/clock'),nextDue=new Date(nextClock.now+3600000);
  93  |     const next=await draftCampaign(site,cookie,'Personal garden journal',[email],nextDue);
  94  |     await json(await site.call(`/api/campaign-revisions/${next.revisionId}`,{method:'PATCH',cookie,body:{emailBody:'<p>'+'{{displayName | fallback: friend}} '.repeat(1000)+'</p>'}}),200);
  95  |     await approve(site,cookie,next);
  96  |     // Fresh affirmative evidence changes the name, then the same reader confirms it.
  97  |     await site.control('/_golive/clock',{advanceMs:10000});
  98  |     await confirmedContact(site,edge,cookie,email,'A very long garden reader name & family '.repeat(4));
  99  |     await site.control('/_golive/clock',{advanceMs:3600001});
  100 |     const skipped=await dispatch(site,next.campaignId,nextDue);
  101 |     expect(skipped[0]).toMatchObject({transport_disposition:'skipped',skip_reason:'email-too-large'});
  102 |     expect(edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe'])).toHaveLength(1);
  103 |     await oversizedReuse(site,cookie,page,info,campaign,template.id);
  104 |   } finally {await page.close();await site.runtime.close();await edge.close();}
  105 | };
  106 | 
```