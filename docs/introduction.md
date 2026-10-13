# Introduction

Mango is a self-hosted newsletter desk. You run it yourself: on your own computer to look around, and on your own Cloudflare account to send real mail. A person on your team writes each issue, a person approves one exact saved version of it, and only then does Mango send anything.

Mango 0.1.0 is a newsletter release candidate. This documentation describes what the code does today, including the parts that are not finished (see "What Mango does not claim" below).

## How a newsletter moves through Mango

1. **Collect.** Subscribers arrive through the hosted signup page at `/subscribe`, or through a CSV import. Mango records the consent evidence for each person and never sends to someone who has not confirmed. You can collect subscribers before, after or alongside writing. See [Signup and consent](./signup-and-consent.md) and [Importing contacts](./importing-contacts.md).
2. **Write.** In the app, open Campaigns, choose New campaign, then Blank newsletter. You write a subject, a preheader and the message, and choose who should receive it. Saving a draft never sends anything. See [Write your first newsletter](./first-newsletter.md).
3. **Approve.** You review the saved draft, read the approval checks, and approve it. Approval applies to that exact saved revision. See [Approval and sending](./approval-and-sending.md).
4. **Schedule.** Each send in the draft has a local date and time in your newsletter's time zone and a send-by deadline. The **Approve & schedule** button approves the draft and schedules those sends in one step.
5. **Deliver.** Mango hands each message to your mail provider and reports what the provider confirms back. See [Delivery reports](./delivery-reports.md).

## What approval-first means

- Creating, editing and saving a draft grants no permission to send.
- Approval is tied to one saved revision. After approval that revision is locked; the app has no edit button for a scheduled campaign.
- Approval re-checks everything at that moment: consent, opt-outs, suppressions, links, sender identity and sender authentication.
- Mango checks eligibility again right before each message is handed to your provider, so an unsubscribe that arrives after approval still stops that message.
- Mango does not send on its own initiative. Nothing leaves without an operator approving it.

## What you need

To try it locally you need Node 22.20.0 and pnpm 10.12.4. Local mail stays on your computer, so a local copy can write drafts, import contacts and show the signup page, but it cannot send real newsletters.

To send real newsletters you need:

- a Cloudflare account that you control (Mango creates a Worker, a D1 database, an R2 bucket and a Queue in it);
- an account with a mail provider, SendGrid or Resend, with a sending domain you can verify;
- a physical postal address, which every email carries in its footer;
- a public HTTPS address for the deployment.

Mango also has optional commerce, SMS and AI modules. They are off by default and these docs do not cover them.

## What Mango does not claim

The repository records local tests and some earlier checks on disposable installations. It does not claim production readiness, inbox placement or deliverability, live provider webhook verification, or a complete backup and restore. Where a page in these docs touches one of those limits, it says so plainly.

## Where to go next

Start with [Install and deploy](./install.md). Then [write your first newsletter](./first-newsletter.md), and read [Backup and export](./backup-and-export.md) before you rely on Mango with real subscribers.

> **Tip:** Run Mango locally first. You can write a draft, try the signup page and rehearse a contact import before you touch Cloudflare or a mail provider.
