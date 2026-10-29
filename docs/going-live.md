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

Run the sender check from **Settings** on your deployment: no command line is needed. [Getting started](./getting-started.md#verify-your-sender) walks through it.

Text messages, AI writing and a store connection are optional modules, off unless you configure them; a newsletter needs none of them. To [turn on text messages](#turn-on-text-messages) or a store's [cart and browsing events](#turn-on-cart-and-browsing-events), follow the steps at the end of this page.

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

## Turn on text messages

Mango sends text messages through Mobile Message, to Australian mobile numbers. They run on a deployment; a copy on your computer keeps them off.

1. In Mobile Message, get API credentials and a dedicated two-way number, and add a signed inbound webhook to `https://<your-deployment>/webhooks/sms/mobile-message`.
2. In your Mango checkout, write the six settings to a private file, `.rer/sms.env`:

   ```bash
   SMS_PROVIDER_API_KEY='<API username>:<API password>'
   SMS_WEBHOOK_SECRET='<the webhook signing secret>'
   SMS_CONFIRMATION_SENDER='<the dedicated number, such as +61400000000>'
   SMS_PROGRAMME_POLICY='<your programme, as JSON on one line>'
   MANGO_TEST_SMS_ALLOWLIST='<numbers that may receive test messages, separated by commas>'
   MANGO_SMS_HANDOFFS_PER_MINUTE='<most messages Mango hands to Mobile Message each minute>'
   ```

   The programme names your brand, help contact and sending hours; [SMS signup and compliance](./signup-and-consent.md#sms-signup-and-compliance) lists its fields.
3. Store all six on the deployment at once, then delete the file:

   ```bash
   set -a
   . ./.rer/hosted.env
   set +a
   npx wrangler secret bulk .rer/sms.env --name "mango-$MANGO_DEPLOY_ENV"
   rm .rer/sms.env
   ```

   Later deploys keep them. With only some of the six, Mango stops and names the missing ones.

Audience then offers **Record SMS permission**, and your signup page offers text messages.

## Turn on cart and browsing events

Cart and browsing events come from your Shopify store through the Mango Web Pixel and a signed app proxy, both in a Shopify app made for this one store. Like text messages, they run on a deployment.

1. Give the app these scopes: `read_customers`, `read_products`, `read_inventory`, `read_locations`, `read_orders`, `read_all_orders`, `read_returns`, `read_pixels`, `write_pixels`, `read_customer_events` and `write_app_proxy`.
2. Add the app proxy to the app's `shopify.app.toml`:

   ```toml
   [app_proxy]
   url = "https://<your-deployment>/webhooks/commerce/shopify/observations"
   prefix = "apps"
   subpath = "mango-signals"
   ```

3. Copy `extensions/mango-pixel` from your Mango checkout into the app's Shopify CLI project and release it. Then activate it with the Admin API's `webPixelCreate` and the settings `{"channel":"<a new name for this installation>","proxyPath":"/apps/mango-signals"}`.
4. Subscribe `carts/create` and `carts/update` to `https://<your-deployment>/webhooks/commerce/shopify` with the Admin API's `webhookSubscriptionCreate`: JSON, API version 2026-07, no filter.
5. Write the four pixel settings to a private file, `.rer/shopify.env`:

   ```bash
   COMMERCE_OBSERVATION_CHANNEL='<the channel name from step 3>'
   COMMERCE_APP_INSTALLATION_ID='<the app installation ID, gid://shopify/AppInstallation/…>'
   COMMERCE_PIXEL_ID='<the ID webPixelCreate returned, gid://shopify/WebPixel/…>'
   COMMERCE_PROXY_PATH='/apps/mango-signals'
   ```

   If Store shows no Shopify records yet, connect the store in the same file:

   ```bash
   COMMERCE_STORE_URL='https://<your-store>.myshopify.com'
   COMMERCE_API_TOKEN='<the app Admin API access token>'
   COMMERCE_WEBHOOK_SECRET='<the app client secret>'
   COMMERCE_EXCLUSIVE_SHOP='<your-store>.myshopify.com'
   ```

6. Store the file as in step 3 of [Turn on text messages](#turn-on-text-messages), with `.rer/shopify.env` in place of `.rer/sms.env`.
7. In **Store**, sync customers, products and variants. Each sync also checks the app, the pixel and the cart subscriptions.
