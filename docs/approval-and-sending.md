# Approval and sending

Nothing leaves Mango until an operator approves a specific saved revision. This page covers scheduling, the approval checks, approval itself, what locks afterward, and cancellation.

## Schedule the send

In the draft editor, **Selected channel steps** holds the schedule. Choose **Add email step**. Each step has:

- **IANA time zone**, which starts as your store time zone (`storeTimezone` in `src/ext/config.ts`, Australia/Brisbane by default);
- **Local send date and time**, with a read-only **Resolved UTC send instant**;
- **Local send-by date and time**, which defaults to 23:59 on the chosen day, with its own resolved UTC instant;
- **Why this time**, a short required note.

A local time that does not exist, or occurs twice, because of a daylight saving change is rejected until you pick another. Messages not handed to your provider by the send-by deadline are skipped and shown as "send window closed". Once Cloudflare activates the schedule, Mango looks for due steps every five minutes, so do not expect sends to begin to the second. First activation usually takes up to an hour. The schedule and results page shows whether a tick has actually run; approval and a configured schedule are not evidence of a send.

## Read the approval checks

Save the draft, then read the **Approval checks** panel. Blocking items come first, each with a "Next step". Approval is blocked while any of these is unresolved:

- the name, subject, message body, preheader, sender name, From, reply-to or postal address is missing;
- the message lacks a visible unsubscribe link or the postal address, or its HTML links, plain-text links and saved links differ;
- the HTML uses a disallowed tag, attribute or inline style, hides text with its styling or colours, or a personalization token has no fallback;
- a link is not HTTPS, its host is not in the allowed link hosts in Settings, or it does not resolve (the default allowed host is your app’s own host);
- a step has no valid time zone, send time or later deadline;
- the audience conditions are invalid or no contact is eligible;
- an eligible contact's recorded consent is for a different sender name or message category;
- the draft's sender details differ from Settings, or the mail provider is not configured;
- sender authentication is not proven ("Verify your sender", "Verify email authentication");
- the sending domain has at least 1,000 delivered messages in the reporting window and complaints are 0.3% or more, or hard bounces 5% or more.

### Verify your sender

Approval needs evidence that your sender works. In **Settings**, once **Provider domain** and **DNS records** pass, press **Send the check to** *your sign-in address*. Mango sends one email from your From address through your provider. Open it; if it reached your inbox (not spam), follow its link and press **Yes, it reached my inbox**. That is all: no command line is needed.

The confirmation lasts 30 days, or until the provider's domain records or your DNS change, and Mango checks the provider and public DNS (SPF, DKIM, DMARC and alignment with the From domain) again at approval and at every handoff. If the evidence is not passing when a message is due, the message waits and is retried on your reconciliation interval until its deadline. **Settings** shows each check and when it expires.

An installation can instead trust a receipt connector that reports the receiving mailbox's own authentication results; [Install and deploy](./install.md#optional-a-trusted-receipt-connector) describes it.

## Approve

With passing checks and no unsaved edits, press **Approve & schedule**. The page confirms "The exact saved revision is approved and scheduled." If checks fail you see "Campaign unchanged" and the blockers. Approval applies to that saved revision only, freezes the recipient list at that moment (a contact who starts matching later is not added), and is repeat-safe: approving twice creates one schedule. Before each message goes out, Mango rechecks that the contact is still subscribed, not suppressed and outside the 24-hour frequency window.

## Edits require re-approval

While a campaign is a draft, every save discards the previous checks, so you always approve what you last saved. After approval the revision is locked: a scheduled campaign shows previews but no editor. To change it, cancel it if sends can still be stopped, and write a new campaign. If you change your sender identity in Settings after approving, the approved content no longer matches and its queued emails are held. No screen releases them; only the API route `POST /api/campaigns/:id/reapprove` does.

## Cancel queued sends

Open **View schedule and results**. While some recipients have not yet been handed to your provider, a **Cancel remaining sends** panel appears. **Cancel campaign**, then **Confirm cancellation**, stops every queued recipient. Messages already handed to a provider cannot be recalled, and handoffs with an unknown outcome stay visible. When nothing can be stopped, the panel is replaced by a note saying so.

> **Tip:** Use **Send a test** on the draft first. It goes only to addresses on your test allowlist and is marked as a test.

Provider pacing is shared durably by the configured provider account across campaigns,
confirmation messages, tests, operator notices and sign-in mail. SMS consumes the actual
GSM-7 or UTF-16 segment count. Carrier limits are the provider's documented policy for
all permitted destinations; Mango never infers a carrier from a phone prefix.

`MANGO_DELIVERY_POLICY_JSON` supplies provider evidence keyed by `resend`, `sendgrid`
or `mobile-message`. Each entry requires `account`, an HTTPS provider `evidence` URL,
and `credentialDigest` (SHA-256 of the configured API credential, computed privately).
Optional `providerPerMinute` restricts the installation's existing limit further. SMS
also requires `carrierPerMinute` and `carrierScope` naming the applicable provider policy.
Changing credentials invalidates their evidence until the account binding is renewed.

For Resend, supply `lookupWindowMs`, `scopes: ["full_access"]`, the configured `webhookId`
and `lookupHistorySince` as an ISO timestamp covering this installation's retained event
history. Resend's published standard account retention is 30 days, distinct from its
24-hour idempotency keys; Enterprise retention needs the actual account evidence.
Mobile Message documents 24-hour idempotency but no minimum numeric retained lookup
window. SMS approval therefore remains blocked until account-bound provider evidence
supplies `lookupWindowMs`; dashboard request-log retention is not sufficient evidence.
Never substitute an observed old message for a minimum retention guarantee.

An outage uses a bounded authenticated read: SendGrid scopes, Resend usage (full-access
key), or Mobile Message account balance. The probe sends no recipient message. Recovery
clears only reachability; account compliance, sender verification, source freshness,
consent and deadlines still apply. Outage notices are fenced per active operator; an
uncertain notification acceptance remains visible and is never automatically resent.
