# Connect another application

An integration credential lets an application such as Coffer keep contacts and email preferences in step with Mango. Open **Settings → Integration credentials**, give the connection a name and select its scopes. Only the owner can create or revoke it. Copy the credential when it appears: Mango shows it once and stores only its hash. Keep it in the other application's private settings, never in browser code or a repository.

| Scope | Access |
| --- | --- |
| `contacts:read` | Read contacts, fields, tags and integration lists. |
| `contacts:write` | Upsert contacts into its lists and suppress email. |
| `events:read` | Read unsubscribe, bounce, complaint and suppression changes. |
| `campaigns:send` | Dispatch a due campaign already approved by a person for the credential's exact saved segment. |

A credential grants no operator sign-in, campaign editing or approval. Every request is recorded in **Settings → Integration activity**, including refused requests. Revocation stops the next request. Create a replacement and update the client before revoking an old credential when rotating access.

## Send a contact to Mango

Run these commands on the client server. Set `MANGO_URL` to your installation and `MANGO_TOKEN` to its scoped credential in your private shell environment. Every request uses HTTPS outside local development.

```sh
curl --fail-with-body "$MANGO_URL/api/integrations/v1/contacts" \
  -X PUT -H "Authorization: Bearer $MANGO_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"email":"donor@example.test","displayName":"Alex River","segmentName":"Coffer donors","fields":{"cofferDonorId":"donor-42","lifetimeGifts":125},"tags":["donor"],"subscribe":true,"consent":{"source":"Coffer signup form","evidence":"I agree to receive the monthly fundraising newsletter from River Garden.","brandOrLegalSender":"River Garden","messageCategory":"fundraising","frequencyDisclosure":"Monthly","destinationJurisdiction":"US","consentVersion":"signup-v1","occurredAt":"2026-10-01T12:00:00Z"}}'
```

Use evidence the person actually gave, covering this sender, category and frequency. `subscribe: true` requires every consent field. A donor's gift alone is not email permission. Omit `subscribe` to sync a contact without subscribing them. Existing unsubscribes and suppressions always win; this API cannot remove them or resubscribe a person.

Email is normalized and identifies one contact. Repeating the request updates that contact rather than adding another. Fields and tags belong to the profile; they grant no consent. `segmentName` creates or reuses an integration's saved list. Lists remain available when you rotate a credential. The response includes `contact.segmentIds`. Later requests can use `segmentId` instead of `segmentName`; choose exactly one. The write scope can update integration lists, but cannot rewrite an operator's dynamic segment.

```sh
curl --fail-with-body "$MANGO_URL/api/integrations/v1/segments" \
  -H "Authorization: Bearer $MANGO_TOKEN"
curl --fail-with-body "$MANGO_URL/api/integrations/v1/contacts?email=donor%40example.test" \
  -H "Authorization: Bearer $MANGO_TOKEN"
```

## Stop email in both applications

When someone chooses no email in Coffer, record that refusal there first, then suppress the destination in Mango. Keep the same idempotency key when retrying the same refusal after a network failure. Suppressions work even before the contact arrives and block every marketing send through Mango's existing eligibility checks.

```sh
curl --fail-with-body "$MANGO_URL/api/integrations/v1/suppressions" \
  -X POST -H "Authorization: Bearer $MANGO_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"email":"donor@example.test","reason":"Email consent withdrawn in Coffer","idempotencyKey":"coffer:donor-42:consent-8","occurredAt":"2026-10-17T10:00:00Z"}'
```

To bring Mango refusals back, read the change feed. Start with cursor `0` and retain the returned `nextCursor` only after applying every event in that page.

```sh
curl --fail-with-body "$MANGO_URL/api/integrations/v1/events?cursor=0&limit=50" \
  -H "Authorization: Bearer $MANGO_TOKEN"
```

Each event has a stable `id`, increasing `sequence`, `type` (`unsubscribe`, `bounce`, `complaint` or `suppression`), `channel`, `email`, `contactId`, `cause` and `occurredAt` in milliseconds since the Unix epoch. An empty page keeps the cursor. Deduplicate by event ID, record no-email against the matching donor, and save the page cursor in the same durable client operation where possible. Re-reading a cursor gives the same events, so interruption is safe. Events erased with a contact disappear; sequence gaps are normal. An unmatched provider event can have no readable email, to preserve Mango's erasure protection; skip it when no destination is available. Email bounces are delivered as facts, including soft bounces: the client can conservatively mark no-email or use the cause to apply its own policy. Mango's own suppression policy still governs its sends.

This feed includes confirmed unsubscribe clicks, mailbox one-click unsubscribes and verified provider events. It is a pull API; Mango does not offer outbound signed webhooks here. Poll it before preparing an audience and before sending from the client. Do not reflect an imported refusal into an endless new refusal event.

## Dispatch an approved segment campaign

First a Mango operator saves the campaign against the integration's segment, reviews its exact content and approves its schedule. Then a credential with `campaigns:send` can request dispatch of a due step:

```sh
curl --fail-with-body "$MANGO_URL/api/integrations/v1/campaigns/CAMPAIGN_ID/send" \
  -X POST -H "Authorization: Bearer $MANGO_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"revisionId":"APPROVED_REVISION_ID","segmentId":"SEGMENT_ID"}'
```

This preserves approval, the frozen audience, schedule, provider readiness and last-moment suppression checks. It cannot approve, change a revision, bring a schedule forward or send to an arbitrary address. A request accepted for queueing is not a delivery receipt. See [Approval and sending](approval-and-sending.md).

## Errors and hosting

Missing or revoked credentials return `401`; missing scopes return `403`; invalid input returns `400`; a conflict with approval, consent or a segment returns `409`. Rate-limited requests return `429` with `Retry-After`. Wait before retrying. Do not retry a send with a changed campaign revision to bypass an approval conflict.

On RER Managed, outbound provider calls for seed integrations are **not available yet**. Subscriber writes and the inbound change feed need no outbound provider request. Self-hosted installations can use the scoped API with their configured sending connection. A connection cannot grant access to the hosting account or its operator session.

## Stripe

An Owner connects Stripe in Settings with a restricted key granting read access to customers, charges and PaymentIntents (and, for a paid tier, write access to Checkout Sessions and read access to Prices and Subscriptions), and the webhook signing secret. Mango shows test/live mode, the key’s last four characters and the connecting operator/time. Only Owners can connect, replace or disconnect. Both secrets are encrypted under the installation signing key, never returned by the API and excluded from account exports. Restore requires reconnecting Stripe in the destination. Keep the installation signing key safe.

Configure Stripe to send customer, payment-intent, charge, Checkout session, invoice, subscription and refund events to `/webhooks/commerce/stripe` on your Mango origin. Match test/live mode to the key. Mango verifies Stripe-Signature over the exact request bytes with a five-minute tolerance before reading the event, refuses mode mismatches and imports allowlisted facts through `commerce.store.v1`. Event identity is Stripe’s event id; a replay adds no event. Customers resolve by their Stripe customer’s email, without granting marketing consent. A cancellation still applies by subscription id when Stripe has deleted the customer; Mango retains the existing contact association where available and never invents an address or consent. When a verified event needs a Stripe read during a Stripe outage, Mango answers with a retryable failure and records one failed operation carrying Stripe’s error on the Store page; Stripe’s retry after recovery imports it once.

The connection declares customer, payment, checkout-session, subscription and refund sources. Timelines include subscription.started, subscription.renewed, subscription.past_due and subscription.canceled facts; invoice.payment_failed is recorded as a payment failure, and past_due is recorded only from Stripe’s subscription status. Payment Links use the same Checkout event format. These are positive observations, not an exhaustive store snapshot or proof that an absent event did not occur. FLOW-001/FLOW-002 inherit enrolment on Stripe subscription events for renewal reminders; flows remain unimplemented. INT-004 remains partial pending the real-provider proof described in ACCEPTANCE.md.

### Paid tier

An Owner names a paid topic, the free topic and an active recurring Stripe price; Stripe Tax is always on. With an Owner-saved paid tier, readers open `/subscribe?paid=1` to review its recurring price, Stripe Tax notice and newsletter consent, then continue to Stripe-hosted Checkout. The page calls `/paid/checkout`, which creates a subscription-mode Stripe Checkout session with automatic tax and immediate-confirmation card payments on your own Stripe account and returns its URL. Mango never sees card data and never holds funds; it stores Stripe ids, subscription states and the tax Stripe reports. Every verified subscription-affecting notification triggers a fresh subscription read: active or trialing joins the paid topic; past_due, unpaid, paused, incomplete, incomplete_expired and canceled leave. A later active or trialing read rejoins. Event delivery order and its created second do not order membership; equally fresh conflicting reads leave the paid topic. A failed read removes paid eligibility, advances the delivery fence and records a retryable failed operation; a successful fresh read on retry can restore membership. Cancellation changes only paid membership, so a canceled reader with confirmed consent can still receive free issues. Payment never creates or widens consent, and unsubscribes and suppression still win. An approved paid-only send rechecks current membership and fences a paid-state change immediately before hand-off. The Settings count uses the same selected-address confirmed-consent and suppression checks as delivery. PUB-002 remains partial: the restricted-key Stripe sandbox proof and Nectar connection are outstanding.

Checkout returns to `/subscribe?paid=1&returned=1`, which explains payment confirmation and the next newsletter. Mango has no card or payment-method fields. The unchecked newsletter-consent choice is separate from payment: its explicit submission records CONT-003 evidence labelled `paid-checkout` and uses the existing confirmation service once per payer address per Checkout session. A subscribed, confirmed address needs no second confirmation. A payer who never confirms receives no paid or free newsletter beyond that one confirmation; unsubscribed addresses remain unsubscribed until their own confirmation, and suppression always wins. A signed payment notification never creates or widens consent. These conservative PUB-005 defaults were approved by ct on 23 October 2026 at 04:38Z. The existing public erasure job removes the payer address and consent evidence under the audit-fact rule.

## WooCommerce

In Settings, connect the store’s public HTTPS URL (including its WordPress subdirectory, if any) and a WooCommerce REST API consumer key and secret with **Read** permission. Choose a separate, strong webhook secret used exclusively for this store’s Mango connection and confirm that custody in Settings. Credentials stay encrypted in the installation database and do not leave in data exports; reconnect on a restored installation. Only the Owner can connect, replace or disconnect.

In WooCommerce → Settings → Advanced → Webhooks, create active `customer.created`, `customer.updated`, `product.created`, `product.updated`, `order.created` and `order.updated` webhooks. Use the delivery URL displayed in Mango Settings, the exclusive secret, and REST API v3. Mango verifies the exact signed body, store URL and delivery identity, then reads the current object from that connected store. Order updates also refresh refunds. A repeated delivery updates the same source records; conflicting signed bytes under the same delivery identity are refused. No order key, payment/recovery URL, billing address, IP address or arbitrary metadata is imported.

Open Store and sync Customers, Products, Orders and Refunds. Each source retains its last completed sync and shows a failed operation if the provider refuses a page. Retry resumes its saved cursor. Source identifiers include the store identity; source creation and update times remain separate. A new connection requires fresh syncs. Disconnect cancels pending WooCommerce syncs and retains imported records. This connection uses Mango’s existing single-store snapshot authority; disconnect an installation-configured Shopify store before connecting WooCommerce.

WooCommerce orders and refunds use the same financial projection as the existing store adapter. Refunds include merchant-recorded manual refunds; the source record separately retains whether the payment gateway API performed the refund. Install the [Mango WordPress plugin](https://github.com/just-every/run-mango/tree/main/extensions/mango-woocommerce) for onsite observations, checkout detection and the native signup form shortcode. Its [installation guide](https://github.com/just-every/run-mango/blob/main/extensions/mango-woocommerce/INSTALL.md) explains explicit store-owner enablement, consent-manager wiring, GPC, the 30-day first-party cookie and WordPress outbox retention. Tracking is off initially and identifies only signed-in store customers. Enable the verified plugin connection in Mango, then sync Cart and Browsing Event in Store. Save and explicitly activate a checkout flow revision in Settings: an eligible abandoned-checkout observation tags the contact once and exits without sending a message. A store customer remains non-subscribed unless Mango already holds their consent, and existing opt-outs and suppression remain unchanged.
