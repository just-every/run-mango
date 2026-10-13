# Install and deploy

There are two ways to run Mango. Run it on your computer to look around and write drafts. Deploy it to your own Cloudflare account to send real mail. Nothing here installs or deploys on your behalf: every command runs from a checkout of the Mango repository, with your credentials.

## Run it on your computer

You need Node 22.20.0 and pnpm 10.12.4. Run these from the project root, with your own email address:

```bash
node scripts/rer.mjs install
node scripts/rer.mjs setup --owner-email you@example.com
node scripts/rer.mjs dev
```

`install` installs Mango's dependencies. `setup` builds Mango, applies the database migrations to a local database, creates you as the first owner with no sample contacts or campaigns, and writes fresh local secrets to `.dev.vars` with private permissions. It then exits with no server running. Running it again keeps your owner, your data and your secrets. Pass `--port PORT` or `--host HOST` to use another loopback address than the default, 127.0.0.1:15660. Never commit or share `.dev.vars`.

`dev` starts Mango and prints `RER_READY` with the address of the development outbox, `/__dev/outbox`, once it is ready. Open the outbox, read the newest sign-in message, follow its link and press **Confirm**. The first time, the link opens **Set up your sender identity**: save your business details there to enter the app. You can change them later in Settings. Local mail never leaves your computer and no mail provider is configured locally, so a local copy cannot send a real newsletter. Stop the server with Ctrl-C.

To run Mango's own checks, install the headless browser its tests use with `pnpm exec playwright install chromium`, stop the server, then run `node scripts/rer.mjs verify`. `node scripts/rer.mjs describe` lists every command and its flags.

## Deploy to your Cloudflare account

You need a Cloudflare account, its account ID, an API token scoped for the work, and an account with SendGrid or Resend.

First, set `storeTimezone`, `organizationName` and `landingSummary` in `src/ext/config.ts`. Schedules use `storeTimezone`; the default is Australia/Brisbane.

Next, put the inputs listed in `.env.example` into the environment of the shell that runs the commands. The file lists the names with empty values. `node scripts/rer.mjs doctor` reports which inputs are missing or invalid, without contacting any provider or printing values.

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
export MANGO_DEPLOY_ENV=production
export MANGO_PUBLIC_BASE_URL=https://<your-worker>.workers.dev
export MANGO_APP_VERSION=0.1.0
export MANGO_ALLOWED_LINK_HOSTS=example.com
export MANGO_TEST_EMAIL_ALLOWLIST=you@example.com
export OWNER_EMAIL=you@example.com
export SESSION_SECRET=...        # 32+ random characters
export CONTACT_HASH_SALT=...     # keep the same value for the life of the install
export SETUP_TOKEN=...           # 32+ random characters
export MAIL_PROVIDER=sendgrid    # or resend
export MAIL_PROVIDER_API_KEY=...
export MAIL_AUTH_FROM=news@example.com
export MAIL_WEBHOOK_SECRET=...
export MAIL_WEBHOOK_ID=...
export MAIL_SENDER_NAME="Example News"
export MAIL_REPLY_TO=hello@example.com
export MAIL_PHYSICAL_ADDRESS="1 Example Street, Brisbane QLD 4000, Australia"
export MANGO_RECONCILIATION_INTERVAL_MINUTES=15
export MANGO_UNRESOLVED_OUTCOME_HOURS=1
export MANGO_EMAIL_HANDOFFS_PER_MINUTE=3000
export MANGO_DELIVERABILITY_WINDOW_DAYS=30
```

The last four numbers are the limits `seed.json` declares; it labels them estimates that have not been load-tested. `MANGO_PUBLIC_BASE_URL` must be HTTPS. For SendGrid, `MAIL_WEBHOOK_SECRET` is the base64 public verification key of its signed event webhook. For Resend it is the Svix signing secret.

### Keep secrets secret

Generate `SESSION_SECRET`, `SETUP_TOKEN` and `CONTACT_HASH_SALT` yourself, for example with `openssl rand -hex 32`, and keep them independent. Supply them, your Cloudflare token and your mail keys privately; Mango never reads Wrangler credential files, and your Cloudflare token is used only by the commands on your machine. Keep all of it out of version control, and load it from a protected runner or secret manager rather than typing secrets into a shell that records history.

### Check, then deploy

```bash
node scripts/rer.mjs deploy --environment production --dry-run
node scripts/rer.mjs deploy --environment production
```

- `--dry-run` checks your inputs and builds locally without any provider request.
- `deploy` finds or creates the Worker, D1 database, R2 bucket and Queue for the environment (`mango-production`, `mango-production-db`, `mango-production-assets-bucket` and `mango-production-mango-jobs`), applies the remote migrations, uploads the Worker and its assets, then reads back the bindings and checks the deployment's health after a real database ping. A five-minute scheduled job is part of the Worker.

`deploy` records which resources it owns in `.rer/deploy/<environment>.json`. Back that file up: a later deploy needs it, and a same-named resource it does not own is refused rather than taken over.

### Create the first owner

With `SETUP_TOKEN` still set, send one request from your computer. The `Origin` header must be exactly your public origin, with no trailing slash or path.

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$MANGO_PUBLIC_BASE_URL/auth/bootstrap" \
  -H "Origin: $MANGO_PUBLIC_BASE_URL" -H 'Content-Type: application/json' \
  -d '{"token":"<your SETUP_TOKEN>","displayName":"Owner","returnTo":"/setup"}'
```

It works once, on an empty installation, and creates the owner named by `OWNER_EMAIL`. Expect `303`. Then open `/signin` in a browser and request a link as usual. If the sender identity from your `MAIL_SENDER_NAME`, `MAIL_AUTH_FROM`, `MAIL_REPLY_TO` and `MAIL_PHYSICAL_ADDRESS` inputs is incomplete, signing in opens **Set up your sender identity** first.

## Before you send

Local checks and a deploy do not prove that mail works. Continue with [Team and settings](./team-and-settings.md) and [Approval and sending](./approval-and-sending.md).

> **Tip:** Want sample data? `pnpm run review:synthetic` starts a separate, isolated synthetic workspace on port 15662. Open the link written to `.seed/review-access`. It never sends anything.

## Use an existing signed event receiver

For SendGrid delivery reports, use the provider's signed Event Webhook directly at `/webhooks/mail/sendgrid`, or have an existing signed receiver forward the whole request there. Transparent forwarding can reuse an existing hook without another webhook slot. First establish that the receiver permits forwarding, receives the required event types and has an appropriate account scope; Mango cannot discover these permissions for you.

Configure `MAIL_WEBHOOK_SECRET` with that Event Webhook's real public verification key. The path and `MAIL_WEBHOOK_ID` do not authenticate SendGrid events. Forward the original body bytes and both `X-Twilio-Email-Event-Webhook-Signature` and `X-Twilio-Email-Event-Webhook-Timestamp` headers unchanged. Do not parse and re-encode JSON, split or filter batches, replace timestamps, or sign with a relay key. Mango verifies the exact bytes before decoding the event JSON. The original timestamp must still be within five minutes; delayed forwarding does not relax that check. A `204` acknowledges completed ingestion in Mango; reliable forwarding and acknowledgement handling remain the receiver's responsibility.

A whole batch may include other applications' addresses. Mango retains unmatched facts and applies valid address-level complaints, suppressions and hard bounces even without a matching Mango send. Choose a trusted event/account scope deliberately. Filtering the batch at the relay invalidates its signature. An unsigned or OAuth-only existing hook does not satisfy this verifier. See [SendGrid Event Webhook security](https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook-security-features) and [Delivery reports](./delivery-reports.md).

Signed Inbound Parse authenticates received email, not outgoing delivery events. Mango has no Inbound Parse intake or reply inbox. Do not forward multipart Parse messages to the outgoing event URL or turn them into fabricated delivery facts. A separate receipt/reply integration would need its own public key, unchanged multipart body and boundary, replay handling and receiver trust design. See [SendGrid Parse security](https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/securing-your-parse-webhooks).

This forwarding design is locally signature-tested. Existing receiver access, live signed event ingestion and normal cron delivery remain unproven. The reviewed hosted installation required adjustments and manual Queue dispatch, and its account had both Event Webhook slots occupied. No live account configuration is changed by these instructions.
