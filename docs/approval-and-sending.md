# Approval and sending

Nothing leaves Mango until an operator approves a specific saved revision. This page covers scheduling, the approval checks, approval itself, what locks afterward, and cancellation.

## Schedule the send

In the draft editor, **Selected channel steps** holds the schedule. Choose **Add email step**. Each step has:

- **IANA time zone**, which starts as your store time zone (`storeTimezone` in `src/ext/config.ts`, Australia/Brisbane by default);
- **Local send date and time**, with a read-only **Resolved UTC send instant**;
- **Local send-by date and time**, which defaults to 23:59 on the chosen day, with its own resolved UTC instant;
- **Why this time**, a short required note.

A local time that does not exist, or occurs twice, because of a daylight saving change is rejected until you pick another. Messages not handed to your provider by the send-by deadline are skipped and shown as "send window closed". Mango looks for due steps every five minutes, so do not expect sends to begin to the second.

## Read the approval checks

Save the draft, then read the **Approval checks** panel. Blocking items come first, each with a "Next step". Approval is blocked while any of these is unresolved:

- the name, subject, message body, preheader, sender name, From, reply-to or postal address is missing;
- the message lacks a visible unsubscribe link or the postal address, or its HTML links, plain-text links and saved links differ;
- the HTML uses a disallowed tag or attribute, or a personalization token has no fallback;
- a link is not HTTPS, its host is not in `MANGO_ALLOWED_LINK_HOSTS`, or it does not resolve;
- a step has no valid time zone, send time or later deadline;
- the audience conditions are invalid or no contact is eligible;
- an eligible contact's recorded consent is for a different sender name or message category;
- the draft's sender details differ from Settings, or the mail provider is not configured;
- sender authentication is not proven ("Verify your sender", "Verify email authentication");
- the sending domain has at least 1,000 delivered messages in the reporting window and complaints are 0.3% or more, or hard bounces 5% or more.

### Verify your sender

SPF, DKIM, DMARC and domain alignment must all pass in a message actually received by a mailbox you control. Mango checks this through a receipt connector that you provide. Set `MAILBOX_RECEIPT_URL` and `MAILBOX_RECEIPT_RECIPIENT` together, and list the recipient in `MANGO_TEST_EMAIL_ALLOWLIST`. Mango supplies no receipt service and no default endpoint, and the connector must follow Cloudflare Email Routing receipt semantics. From the checkout you deployed from, with the same environment variables set and your sender saved in Settings:

```bash
node scripts/sender-verification.mjs prepare
node scripts/sender-verification.mjs send <id>
node scripts/sender-verification.mjs observe <id>
node scripts/sender-verification.mjs inspect
```

Use the `id` that `prepare` prints. The evidence lasts at most 24 hours and is re-checked at approval and at every handoff. If it is not passing when a message is due, the message waits and is retried on your reconciliation interval until its deadline. **Settings** shows each check and when it expires.

## Approve

With passing checks and no unsaved edits, press **Approve & schedule**. The page confirms "The exact saved revision is approved and scheduled." If checks fail you see "Campaign unchanged" and the blockers. Approval applies to that saved revision only, freezes the recipient list at that moment (a contact who starts matching later is not added), and is repeat-safe: approving twice creates one schedule. Before each message goes out, Mango rechecks that the contact is still subscribed, not suppressed and outside the 24-hour frequency window.

## Edits require re-approval

While a campaign is a draft, every save discards the previous checks, so you always approve what you last saved. After approval the revision is locked: a scheduled campaign shows previews but no editor. To change it, cancel it if sends can still be stopped, and write a new campaign. If you change your sender identity in Settings after approving, the approved content no longer matches and its queued emails are held. No screen releases them; only the API route `POST /api/campaigns/:id/reapprove` does.

## Cancel queued sends

Open **View schedule and results**. While some recipients have not yet been handed to your provider, a **Cancel remaining sends** panel appears. **Cancel campaign**, then **Confirm cancellation**, stops every queued recipient. Messages already handed to a provider cannot be recalled, and handoffs with an unknown outcome stay visible. When nothing can be stopped, the panel is replaced by a note saying so.

> **Tip:** Use **Send a test** on the draft first. It goes only to addresses on your test allowlist and is marked as a test.
