# Going live

Before the first real send to a real list, a sender needs a few things in place. Some of them Mango checks for you, some it builds into every campaign, and some only you can supply. This page lists each one and says which is which.

**Settings → Sender identity → Before the first real send** shows the same list for your installation. Mango marks an item **Observed** only when it saw the evidence itself: from your mail provider, from public DNS, or from a receiving mailbox. **Checked in DNS** means Mango read the records in public DNS rather than a receiving mailbox's own results. Saving a setting never counts. **Not observed** means the evidence is missing, stale or failed. **Unavailable** means Mango could not check, for example in local development, where no mail provider is configured.

## What you need, and who checks it

| Item | Who supplies it | What Mango does |
| --- | --- | --- |
| A sending domain verified with your mail provider | You, in your SendGrid or Resend account | Asks the provider whether the From domain is verified for this account. |
| SPF and DKIM records, and a DMARC record | You, in your domain's DNS | Reads the records your provider lists, and the domain's DMARC record, in public DNS. |
| A test message that reached a real inbox | You press **Send the check** in Settings, then **Yes, it reached my inbox** in the email it sends to your sign-in address | Sends one test message from your From address through your provider and records your confirmation. An optional receipt connector (`MAILBOX_RECEIPT_URL` and `MAILBOX_RECEIPT_RECIPIENT`) can report it instead. |
| SPF, DKIM and DMARC passing, aligned with the From domain | Follows from the items above | Checks in public DNS, at every approval and send, that SPF and DKIM match your provider and a DMARC record exists and aligns with the From domain. With a receipt connector it reads the receiving mailbox's own results instead. Approval stays blocked until all pass. |
| A verified sender | You save the business name, From address on the verified domain, reply-to and postal address in Settings | Uses exactly this identity in every campaign. Changing it invalidates earlier sender evidence. |
| One-click unsubscribe | Built in | Adds `List-Unsubscribe` and `List-Unsubscribe-Post` to every campaign email. A one-click request unsubscribes the contact before Mango answers. Whether your provider's DKIM signature covers these two headers is not observed. |
| A visible unsubscribe link and your postal address | Built in; you save the address | Approval blocks a campaign without both. |
| A sending jurisdiction | You decide | Mango does not record which country's rules apply to your list. See below. |

Run the sender check from **Settings** on your deployment: no command line is needed. [Install and deploy](./install.md#verify-your-sender) walks through it.

Text messages, AI writing and a store connection are optional modules, off unless you configure them; a newsletter needs none of them. [Install and deploy](./install.md) and the repository's `OPERATIONS.md` describe their settings.

## What Gmail requires

Google's [Email sender guidelines](https://support.google.com/mail/answer/81126) state, as read on 12 October 2026:

- **All senders:** set up SPF or DKIM; have valid forward and reverse DNS (PTR) records for sending domains or IPs; use TLS; keep the spam rate reported in Postmaster Tools below 0.3%.
- **Senders of more than 5,000 messages a day to Gmail accounts:** set up SPF and DKIM, and DMARC (a policy of `none` is allowed); the From domain must align with the SPF or DKIM domain; keep the spam rate below 0.30%; marketing and subscribed messages must support one-click unsubscribe and include a clearly visible unsubscribe link in the message body.
- The page also recommends keeping the spam rate below 0.10%, and requires a DKIM key of at least 1024 bits for personal Gmail accounts.

Mango's checks cover SPF, DKIM, DMARC and alignment as above, and every campaign carries one-click and visible unsubscribe. Mango does not check TLS or PTR records, which belong to your provider's sending servers, and cannot see your spam rate; check it in Google Postmaster Tools.

## Your sending jurisdiction

Different countries set different rules for marketing email. Mango does not decide which apply to you, and this page is not legal advice. Until you name your jurisdiction, treat Mango's own rules as the floor:

- send only to contacts with a recorded confirmation: they confirmed through Mango's emailed link, or were imported with their original opt-in and confirmation times;
- every campaign carries your postal address, a visible unsubscribe link and one-click unsubscribe;
- an unsubscribe takes effect before Mango acknowledges it, and nothing in Mango reverses it without new confirmed consent.

Name the jurisdiction, and check its rules, before your first real send.

## What has been proven, and what has not

Mango's local checks send an approved campaign through its real SendGrid adapter, with only the provider's network replaced, and replay signed SendGrid events signed with a locally generated key through the public webhook. They also unsubscribe a contact the way a mail client does, and restore a used installation into an empty one. These checks run on one computer. No live provider has accepted Mango's webhook yet, and restoring a hosted installation has not been tested. Confirm both on your own accounts before relying on them; [Delivery reports](./delivery-reports.md) and [Backup and export](./backup-and-export.md) describe how.

## Domain setup

With SendGrid connected in the installation configuration, save your From address under Settings. An Owner can choose **Create domain authentication** when that account has none for the exact From domain. Mango lists the returned SPF/return-path CNAME and both DKIM selector CNAMEs, checks each in public DNS and shows Pass or Fail with the exact record to add. Repeating Create reuses the same authentication. **Validate domain at SendGrid** asks the connected account to validate it; **Check public DNS** refreshes Mango’s independent check. Neither action changes existing DNS or provider event webhooks. An Owner setup/validation action retires the previous inbox observation; send and confirm a new inbox check before sending campaigns.

Copy the returned CNAME names and values to your DNS provider. The mail CNAME supplies SendGrid’s SPF and branded return-path; do not invent an additional SPF TXT record. DMARC belongs to you: the guide recommends `v=DMARC1; p=none;` at `_dmarc.<From domain>` for monitoring, checks a single valid policy, and preserves an existing quarantine/reject policy. SendGrid does not return a DMARC record, so the guide labels this recommendation separately from account-specific provider records. These configuration checks do not supply the receiver evidence needed to send.

For branded links, provision a hostname, CNAME it to the Mango installation’s public hostname, route it to the same Worker and provision a valid HTTPS certificate. Save it in **Tracking hostname**. Mango checks the exact public CNAME and HTTPS certificate/response before each tracked-link rendering; only two passes permit the host rewrite. A missing or failed check leaves the ordinary installation host in use and the guide reports the failure. Saving an empty hostname removes the setting. DNS alone does not create a Worker route or certificate.

The branded hostname exposes only public GET/HEAD `/l/<token>` redirects and a cookie-free HEAD `/` HTTPS probe; app, sign-in and private APIs remain on the installation origin. Tokens, approved destinations, contact links, consent precedence, scanner exclusion and click counting keep their existing rules. No new sending permission follows from a tracking host.

BIMI needs enforced DMARC (`p=quarantine` or `p=reject`, full enforcement including `pct=100` where used), aligned mail, a compliant publicly served SVG logo and the certificate required by participating receivers. A monitoring `p=none` policy is insufficient. BIMI never guarantees inbox placement. Resend retains its existing verification path; this setup panel currently operates on SendGrid.
