# Going live

Before the first real send to a real list, a sender needs a few things in place. Some of them Mango checks for you, some it builds into every campaign, and some only you can supply. This page lists each one and says which is which.

**Settings → Sender identity → Before the first real send** shows the same list for your installation. Mango marks an item **Observed** only when it saw the evidence itself: from your mail provider, from public DNS, or from a receiving mailbox. Saving a setting never counts. **Not observed** means the evidence is missing, stale or failed. **Unavailable** means Mango could not check, for example in local development, where no mail provider is configured.

## What you need, and who checks it

| Item | Who supplies it | What Mango does |
| --- | --- | --- |
| A sending domain verified with your mail provider | You, in your SendGrid or Resend account | Asks the provider whether the From domain is verified for this account. |
| SPF and DKIM records, and a DMARC record | You, in your domain's DNS | Reads the records your provider lists, and the domain's DMARC record, in public DNS. |
| A trusted receipt of a test message | You configure a receiving mailbox (`MAILBOX_RECEIPT_URL` and `MAILBOX_RECEIPT_RECIPIENT`) | Sends one test message through your provider and reads that mailbox's report of it. |
| SPF, DKIM and DMARC passing, aligned with the From domain | Follows from the three items above | Reads the receiving mailbox's own authentication results for the test message. Approval stays blocked until all pass. |
| A verified sender | You save the business name, From address on the verified domain, reply-to and postal address in Settings | Uses exactly this identity in every campaign. Changing it invalidates earlier sender evidence. |
| One-click unsubscribe | Built in | Adds `List-Unsubscribe` and `List-Unsubscribe-Post` to every campaign email. A one-click request unsubscribes the contact before Mango answers. Whether your provider's DKIM signature covers these two headers is not observed. |
| A visible unsubscribe link and your postal address | Built in; you save the address | Approval blocks a campaign without both. |
| A sending jurisdiction | You decide | Mango does not record which country's rules apply to your list. See below. |

Run the sender check on your deployment with `node scripts/sender-verification.mjs prepare`, then `send`, `observe` and `inspect`. [Install and deploy](./install.md) lists the settings these commands need.

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
