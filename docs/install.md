# Install and deploy

There are two ways to run Mango. Run it on your computer to look around and write drafts. Deploy it to your own Cloudflare account to send real mail. Nothing here installs or deploys on your behalf: every command runs from a checkout of the Mango repository, with your credentials.

## Run it on your computer

First install **Node 22 or later**: rer runs on it, and the installer stops with `node is required` without it. Get it from [nodejs.org](https://nodejs.org/en/download) (or `brew install node` on a Mac, or a version manager such as nvm). Then install `rer` once per computer with `npm install -g @runeditrun/rer` (or `curl -fsSL https://runeditrun.com/install.sh | sh`). In this checkout it selects pinned rer **0.2.22**, which acquires and uses Node **22.20.0** and pnpm **10.12.4** for this project and installs the locked dependencies; you do not install pnpm yourself. Run from the project root and supply your own owner email. `rer dev` alone also works in a fresh clone: it installs, sets up a local owner and picks a free port for you.

```bash
rer install
rer setup --owner-email you@example.com
rer dev
```

`install` installs Mango's dependencies. `setup` builds Mango, applies the database migrations to a local database, creates you as the first owner with no sample contacts or campaigns, and writes fresh local secrets to `.dev.vars` with private permissions. It then exits with no server running. Running it again keeps your existing owner and private settings, but rer 0.2.22 repeats the build and migrations, starts a temporary application and completes local owner setup without requesting a sign-in email. Authentication records, SQLite runtime files, generated build outputs, command receipts and redacted logs can change. Production builds use a separate generated Worker configuration from local dev, preview and migrations. Unchanged configuration and private settings are preserved when building or repeating a deploy dry-run, while build outputs, receipts and logs may be regenerated. Setup is not a read-only check. Opening dev’s automatic sign-in creates real authentication records. Local development uses native identity admission, sends no sign-in email and exposes no captured-mail inbox or outbox page. Dev picks a free loopback port; use the address in its printed `RER_OPEN` link. Pass `--port PORT` or `--host HOST` to select a loopback origin explicitly. Never commit or share `.dev.vars`.

`dev` starts Mango in the background and prints `RER_READY`, `RER_SIGNED_IN` and a private `RER_OPEN` link. Open that link on this computer to enter as the owner. The checkout's dev key stays in its fragment; keep the link private. Sign-in is one click and authentication mail is silently suppressed, with no outbox or injected bar. The nav and title read Mango Dev. On first use, save your business details in **Set up your sender identity** to enter the app; edit them later in Settings. Stop with `rer dev --stop`. To try sample contacts, drafts and sent history in isolated state, use `rer demo`; it shows Mango Demo, allows real public reads and mocks third-party effects. `rer demo --stop` deletes that sample workspace.


Node may print `ExperimentalWarning: SQLite is an experimental feature and might change at any time` when rer loads Node’s built-in SQLite API for local tooling. This warning alone is not a command failure; check the command result and, for dev, wait for `RER_READY`.

To run Mango's own checks, install the headless browser its tests use with `pnpm exec playwright install chromium`, stop the server, then run `rer verify`. `rer describe` lists every command and its flags.

## Deploy to your Cloudflare account

You need a Cloudflare account, its account ID, an API token scoped for the work, and an account with SendGrid or Resend.

First, set `storeTimezone`, `organizationName` and `landingSummary` in `src/ext/config.ts`. Schedules use `storeTimezone`; the default is Australia/Brisbane. Commit that configuration edit locally before running either deploy command; no push is needed:

```sh
git add src/ext/config.ts
git commit -m "Configure Mango installation"
```

Deploy refuses uncommitted tracked changes. Commit any other intentional source or `deploy.json` edits too; keep private input files untracked.

Create `.rer/hosted.env` once from the repository root. This refuses to overwrite an existing file and gives it private permissions:

```sh
node --input-type=module <<'NODE'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
mkdirSync('.rer', { recursive: true, mode: 0o700 });
const values = { MANGO_DEPLOY_ENV: 'production', ...Object.fromEntries(['SESSION_SECRET', 'SETUP_TOKEN', 'CONTACT_HASH_SALT'].map(name => [name, randomBytes(32).toString('hex')])) };
const deployment = JSON.parse(readFileSync('deploy.json', 'utf8'));
for (const name of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', ...deployment.secrets.map(input => input.environment)]) values[name] ??= '';
// Deployment and sender verification read product settings directly from deployment.vars.
writeFileSync('.rer/hosted.env', Object.entries(values).map(([name, value]) => `${name}='${value}'`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
NODE
```

Fill it privately with your account credentials, owner email and mail settings; choose `MANGO_DEPLOY_ENV` for this installation. Link hosts default to your app’s own host; change them later in Mango Settings, or optionally initialize them with `MANGO_ALLOWED_LINK_HOSTS`. Keep the independent generated session, setup and contact keys with your backups. Mango never reads Wrangler credential files.

Product settings, including `MAIL_PROVIDER`, app version, timing and rate limits, live in `deploy.json` `vars`. Change those settings there and deploy the change.

Managed hosting includes sign-in and subscription-confirmation mail without a provider account or your own mail key. RER supplies the transactional relay connection during Configure. For newsletters, separately configure your own SendGrid or Resend connection with `MARKETING_MAIL_PROVIDER` and private `MARKETING_MAIL_API_KEY`. With SendGrid, `MARKETING_MAIL_WEBHOOK_SECRET` is optional; with Resend, both `MARKETING_MAIL_WEBHOOK_SECRET` and `MARKETING_MAIL_WEBHOOK_ID` are required. The saved verified business sender, reply-to and unsubscribe requirements still apply. Without the marketing connection newsletter approval stays blocked; the RER relay remains responsible for sign-in and subscription confirmations.

For Free and Assisted hosting, SendGrid needs only its API key (`MAIL_PROVIDER_API_KEY`) and a verified sign-in sender (`MAIL_AUTH_FROM`). Configure uses the shared names `MAIL_API_KEY` and `MAIL_FROM`; existing deployments can keep the legacy names in the recipe above. Leave `MAIL_WEBHOOK_SECRET` and `MAIL_WEBHOOK_ID` empty if you have no signed Event Webhook: Mango deploys and sends, and each send shows **Accepted** (SendGrid took it). To see **Delivered**, bounces and complaints, add a webhook later; see [Add a SendGrid event webhook](#add-a-sendgrid-event-webhook). Resend needs both: `MAIL_WEBHOOK_SECRET` is its Svix signing secret and `MAIL_WEBHOOK_ID` its webhook ID.

### Check, then deploy

From the repository root, with your configuration edits committed:

```bash
set -a
. ./.rer/hosted.env
set +a
rer deploy --environment "$MANGO_DEPLOY_ENV" --dry-run
rer deploy --environment "$MANGO_DEPLOY_ENV"
```

- `--dry-run` validates the local declaration and build without a provider request. It does not prove account permissions, hosted provisioning, owner claim, token retirement or mail delivery.
- `deploy` finds or creates the Worker, D1 database, R2 bucket and Queue for the selected environment, applies remote migrations, uploads the Worker and its assets, then verifies bindings and health after a real database ping. A scheduled job that runs every minute is part of the Worker. Cloudflare can take a while to start a new Worker's first scheduled run, so Mango also queues each approved letter for its exact send time (up to 12 hours ahead); it leaves on time either way.
- `deploy` automatically claims the first owner through native bootstrap, then removes the one-time setup token from the Worker. Repeat deployment keeps the existing owner. No separate claim command is required.

`deploy` records owned resources and the canonical HTTPS origin in `.rer/deploy/<environment>.json`. Back that file up with the matching private inputs: later deployment needs it, and same-named unowned resources are refused. No manually guessed origin is needed. Open the deployed site, request an email sign-in link as `OWNER_EMAIL`, confirm it and save your business sender details in **Set up your sender identity**.

### Update the same installation

Keep your private inputs, deployment receipt and data backups. Load `.rer/hosted.env` as above, then run:

```bash
git pull --ff-only
rer install
rer build
rer deploy --environment "$MANGO_DEPLOY_ENV"
```

After upgrading from 0.1.0, run `rer build` before making a fresh export. Add each website that embeds your signup form under Audience → Allowed embed origins: migration 0057 blocks existing iframes until allowed.

Use the same environment as the first deployment. rer installs updated locked dependencies and preserves the existing owner. Check health and email sign-in afterwards.

### Remove a deployment

To delete a deployment and everything rer created for it (the Worker, D1 database, R2 bucket and Queue), load `.rer/hosted.env` as above and run:

```bash
rer deploy --environment "$MANGO_DEPLOY_ENV" --remove --yes
```

rer reads back that each resource is gone and touches nothing else in your account. Export your data first if you want to keep it; removal deletes it.

### If sign-in email does not arrive

Check the deployment’s mail connection in Configure. For Managed hosting, sign-in uses the RER transactional relay; your separate newsletter provider does not replace it. For Free and Assisted hosting, check the configured provider credential, verified sign-in sender and provider errors. Correct the connection, deploy the changes if needed, then request a fresh email from `/signin`. Local access uses `rer dev` and its private `RER_OPEN` development entry without email.

### Verify your sender

Approval needs evidence that your sender works. After you sign in and save your sender identity, open **Settings**:

1. **Provider domain** and **DNS records** must pass: finish domain authentication with your mail provider (SPF and DKIM records) and publish a DMARC record for the From domain, for example `_dmarc` TXT `v=DMARC1; p=none`.
2. Press **Send the check to** *your sign-in address*. Mango sends one email from your From address through the provider to the address you sign in with.
3. Open that email. If it is in your inbox (not spam), follow its link and press **Yes, it reached my inbox**.

Settings then shows the sender as confirmed, and campaigns can be approved. The confirmation lasts 30 days, or until the provider or DNS records change; Mango still checks the provider and DNS fresh at every approval and every send. No command-line step is needed.

#### Optional: a trusted receipt connector

Instead of confirming from your inbox, an installation can trust a receipt connector that reads the receiving mailbox's own SPF, DKIM and DMARC results. If you configure the trusted receiver, supply both its authenticated URL and diagnostic recipient privately in `.rer/hosted.env`, and include that recipient in `MANGO_TEST_EMAIL_ALLOWLIST`. The URL must use the trusted connector's public DNS host in the form `https://<public-receiver-host>/receipts?token=<private capability>`, with no other query parameters, port, fragment or user information. URL-encode the nonempty capability and keep the entire URL private. The connector must implement the Cloudflare Email Routing receipt semantics described in the repository's `OPERATIONS.md`; a generic mailbox API is insufficient. After completing sender setup, the same loaded `.rer/hosted.env` supports:

```bash
node scripts/sender-verification.mjs inspect
```

The runner reads `deploy.json` variables and the selected deployment's validated origin and owned D1 target. Missing inputs name themselves before any remote requests. A conflicting shell origin is refused. `inspect` checks authority without sending mail; run `node scripts/sender-verification.mjs prepare` to approve the diagnostic body shown in `scripts/sender-verification-entry.ts`, then use its returned ID with `node scripts/sender-verification.mjs send <id>` and `node scripts/sender-verification.mjs observe <id>`. Inspect again before approving a campaign. Provider/DNS checks alone do not grant sender authority.

### Optional: email design with 12ui

**Design with 12ui** in the email editor uses your own [12ui](https://12ui.com) account. It stays off, and Mango never contacts 12ui, until you give Mango two settings together: your 12ui API key and the address of 12ui's service. Supplying only one stops Mango from starting, with a message naming the other.

- On your computer, add both lines to `.dev.vars`, stop with `rer dev --stop`, then start `rer dev` again:

  ```bash
  DESIGN_PROVIDER_API_KEY=<your 12ui API key>
  DESIGN_PROVIDER_ORIGIN=https://12ui.com
  ```

- On a deployment, set both in the environment of the deploy; `deploy.json` declares them as optional secrets, so the deploy uploads them only when they are set, and later deploys keep them. Type the key at a hidden prompt rather than on the command line, so it stays out of your shell history:

  ```bash
  read -rs -p '12ui API key: ' DESIGN_PROVIDER_API_KEY && export DESIGN_PROVIDER_API_KEY
  DESIGN_PROVIDER_ORIGIN=https://12ui.com rer deploy --environment production
  ```

  Storing them with `npx wrangler secret put DESIGN_PROVIDER_API_KEY --name mango-production`, which also asks for the value at a prompt (and the origin the same way), works too.

Every operator can then spend from your 12ui account; Mango shows an estimate before each paid step and records each request with the campaign's costs. See [Write your first newsletter](./first-newsletter.md#design-with-12ui) for how it works and what is sent to 12ui.

## Before you send

Local checks and a deploy do not prove that mail works. Continue with [Team and settings](./team-and-settings.md) and [Approval and sending](./approval-and-sending.md).

> **Tip:** Want sample data? `pnpm run review:synthetic` starts a separate, isolated synthetic workspace on port 15662. Open the link written to `.seed/review-access`. It never sends anything.

## Add a SendGrid event webhook

Delivery status reads **Accepted** until SendGrid's signed Event Webhook reports back. To add one:

1. In SendGrid, open **Settings → Mail Settings → Event Webhooks**, create a webhook with the URL `https://<your-deployment>/webhooks/mail/sendgrid`, select the delivery, bounce, dropped, deferred, spam report and unsubscribe events, and turn on **Signed Event Webhook**.
2. Copy its **verification key** (the public key) into `MAIL_WEBHOOK_SECRET` in `.rer/hosted.env`, or `MARKETING_MAIL_WEBHOOK_SECRET` for the separate Managed newsletter connection.
3. Load `.rer/hosted.env` and set the secret on the running Worker without a rebuild:

```bash
rer deploy --environment "$MANGO_DEPLOY_ENV" --set-secret MAIL_WEBHOOK_SECRET
```

For the separate Managed marketing connection, set `MARKETING_MAIL_WEBHOOK_SECRET` in that command instead. New sends then show **Delivered**, bounced and complained separately. A SendGrid account has a limited number of webhooks; if they are all in use, see the next section to reuse one.

## Use an existing signed event receiver

For SendGrid delivery reports, use the provider's signed Event Webhook directly at `/webhooks/mail/sendgrid`, or have an existing signed receiver forward the whole request there. Transparent forwarding can reuse an existing hook without another webhook slot. First establish that the receiver permits forwarding, receives the required event types and has an appropriate account scope; Mango cannot discover these permissions for you.

Configure `MAIL_WEBHOOK_SECRET` (or `MARKETING_MAIL_WEBHOOK_SECRET` for the separate Managed marketing connection) with that Event Webhook’s real public verification key. The path and `MAIL_WEBHOOK_ID` do not authenticate SendGrid events. Forward the original body bytes and both `X-Twilio-Email-Event-Webhook-Signature` and `X-Twilio-Email-Event-Webhook-Timestamp` headers unchanged. Do not parse and re-encode JSON, split or filter batches, replace timestamps, or sign with a relay key. Mango verifies the exact bytes before decoding the event JSON. The original timestamp must still be within five minutes; delayed forwarding does not relax that check. A `204` acknowledges completed ingestion in Mango; reliable forwarding and acknowledgement handling remain the receiver's responsibility.

A whole batch may include other applications' addresses. Mango retains unmatched facts and applies valid address-level complaints, suppressions and hard bounces even without a matching Mango send. Choose a trusted event/account scope deliberately. Filtering the batch at the relay invalidates its signature. An unsigned or OAuth-only existing hook does not satisfy this verifier. See [SendGrid Event Webhook security](https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook-security-features) and [Delivery reports](./delivery-reports.md).

Signed Inbound Parse authenticates received email, not outgoing delivery events. Mango has no Inbound Parse intake or reply inbox. Do not forward multipart Parse messages to the outgoing event URL or turn them into fabricated delivery facts. A separate receipt/reply integration would need its own public key, unchanged multipart body and boundary, replay handling and receiver trust design. See [SendGrid Parse security](https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/securing-your-parse-webhooks).

This forwarding design is locally signature-tested. Existing receiver access, live signed event ingestion and normal cron delivery remain unproven. The reviewed hosted installation required adjustments and manual Queue dispatch, and its account had both Event Webhook slots occupied. No live account configuration is changed by these instructions.
