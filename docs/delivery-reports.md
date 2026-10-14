# Delivery reports

Mango reports only what it recorded or what your mail provider confirmed. It shows no forecasts and no estimated results. A message handed to your provider is not the same as a message delivered, and the reports keep the two apart.

## The campaign list

**Campaigns** lists every saved campaign with its name, channel, a plain-language summary of its audience, and a status. Each row ends with either "Next:" and the next scheduled time, or its last outcome and when it happened, shown in your store time zone. The **State** filter offers All states, Draft, Scheduled, Sending, Paused, Completed, Cancelled and Failed, each with a count. The **Channel** filter does the same for channels. The filters are kept in the page address, so you can bookmark a filtered view.

## A campaign's schedule and results

Open an approved campaign and choose **View schedule and results**. The page refreshes itself every 20 seconds and shows:

- a one-line summary, such as how many steps have been sent, and any step that missed its window;
- the saved audience snapshot: candidates, excluded contacts and eligible contacts, and how many eligible contacts use fallback text;
- **Every scheduled step**, each with its local send time and zone, the resolved UTC time, its state, the time remaining, and when its send window closes.

A step's state is Scheduled, Sending, Sent, Cancelled, Failed, Missed, Paused or Completed. "Sent" means handed to the provider; the page says "Only the Delivered count confirms delivery." "Missed" means the send window closed before dispatch began.

The sending schedule panel shows when the Worker last actually ran, or that no tick has been observed. Before the first tick, sending starts once Cloudflare activates the schedule, usually within an hour. A tick that becomes overdue, a failed tick and a tick blocked by restore or contact erasure are shown separately. Completion means the scheduler finished its checks; it does not confirm provider acceptance or delivery. Send windows still expire while waiting for activation.

Under each step is a list of recipient outcomes, each with a count:

- **Queued**, **Handed off**, **Accepted**, **Delivered**, **Bounced** and **Failed**;
- **Waiting for confirmation**, for handoffs whose outcome is not yet known;
- **Skipped**, followed by the reason, such as "unsubscribed, suppressed or without confirmed consent", "frequency protection", "no recent activity", "send window closed" or "campaign cancelled";
- separate lines for **Complaints** and **Suppressions**, and each distinct failure with its message and code.

The counts are kept separate. Mango never adds them into a single success figure.

## Uncertain handoffs

If your provider is SendGrid and a handoff times out or the response is unclear, Mango does not guess and does not retry automatically. The campaign page lists those messages under "Uncertain · operator review required" with the address, the provider message ID when there is one, and the detail. Review receiver mail, provider message IDs and signed events yourself before deciding what to do.

## Where provider facts come from

Mango records delivery facts from your provider's signed webhooks and, where available, from provider lookups. For SendGrid, point its signed event webhook at `https://<your-deployment>/webhooks/mail/sendgrid`, and set `MAIL_WEBHOOK_SECRET` and `MAIL_WEBHOOK_ID`. Mango verifies the signature before it reads an event. It uses these SendGrid events: processed (accepted), delivered, bounce, spam report (complaint), dropped (suppression), and unsubscribe or group unsubscribe (the recipient opted out through SendGrid). Open, click and deferred events are ignored, so a deferred message keeps waiting for a later event.

- **Delivered** is recorded only when a provider event says so.
- A hard bounce, complaint or provider suppression suppresses that address, even if Mango cannot match the event to one of its own messages. A suppressed address is excluded from every later campaign.
- An unsubscribe through SendGrid sets the address to unsubscribed, as Mango's own unsubscribe link does.
- A soft bounce is recorded on the contact and counted. Three soft bounces in a row suppress the address; a delivery to one of Mango's own messages resets the count.
- A handoff that was waiting for confirmation is settled by a signed acceptance, delivery or bounce event that names it.
- A replayed or reordered event does not change the outcome. A newer provider fact is never overwritten by an older one.

## What is not covered

Signed events have been replayed locally with a locally generated key, through the public webhook, but no live provider has delivered events to Mango yet. Confirm your own events arrive before relying on delivery counts. **Insights** lists, for each campaign, how many recipients the provider accepted and how many each kind of provider event reported, one row per outcome. Open tracking is off, and neither page shows open, click or revenue figures.

> **Tip:** After your first real send, compare the **Delivered** count with your provider's own dashboard. If they disagree, check that the webhook is configured and that its signing key matches `MAIL_WEBHOOK_SECRET`.

## Signed event forwarding and receipt evidence

An existing signed SendGrid Event Webhook receiver may forward the original complete request to `/webhooks/mail/sendgrid`. Mango independently verifies the original bytes, signature and timestamp against the configured hook public key, and applies the same replay and recipient-correlation checks as a direct request. Its five-minute freshness window still applies. The relay must retain the exact body and original signature headers; parsing and re-encoding, batch filtering or splitting breaks the signature. Reliable forwarding needs durable acknowledgement handling at the receiver. [Install and deploy](./install.md#use-an-existing-signed-event-receiver) describes the configuration and account-scope requirements.

Unmatched signed complaints, hard bounces and suppression events still block the named address. Sharing an account-wide hook therefore requires an intentionally trusted event scope; it is not automatic isolation between applications. Retransmitting the same valid event does not create duplicate delivery facts. Local signed-request checks establish this behavior, while live signed ingestion and normal cron delivery remain separate acceptance work.

SendGrid can also sign Inbound Parse requests. Those signatures authenticate received-email payloads; they do not prove delivery to another original recipient or an outgoing bounce or complaint. Mango has no Parse intake or production reply inbox, and Parse payloads cannot be posted to the outgoing event route. A future Parse receiver would store separately labelled receipt/reply evidence and need a specific trust contract before it could support sender readiness. The existing Cloudflare receipt connector does not accept Parse output as-is.
