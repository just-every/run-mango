# Install and deploy

There are two ways to run Mango. Run it on your computer to look around and write drafts. Deploy it to your own Cloudflare account to send real mail. Nothing here installs or deploys on your behalf: every command runs from a checkout of the Mango repository, with your credentials.

## Run it on your computer

You need Node 22.20.0 and pnpm 10.12.4. Install `rer` once per computer with `npm install -g @runeditrun/rer` (or `curl -fsSL https://runeditrun.com/install.sh | sh`); in this checkout it runs the rer version `package.json` pins. Run these from the project root, with your own email address:

```bash
rer install
rer setup --owner-email you@example.com
rer dev
```

`install` installs Mango's dependencies. `setup` builds Mango, applies the database migrations to a local database, creates you as the first owner with no sample contacts or campaigns, and writes fresh local secrets to `.dev.vars` with private permissions. It then exits with no server running. Running it again keeps your owner, your data and your secrets. Pass `--port PORT` or `--host HOST` to use another loopback address than the default, 127.0.0.1:15660. Never commit or share `.dev.vars`.

`dev` starts Mango and prints `RER_READY` with the address of the development outbox, `/__dev/outbox`, once it is ready. Open the outbox, read the newest sign-in message, follow its link and press **Confirm**. The first time, the link opens **Set up your sender identity**: save your business details there to enter the app. You can change them later in Settings. Local mail never leaves your computer and no mail provider is configured locally, so a local copy cannot send a real newsletter. Stop the server with Ctrl-C.

To run Mango's own checks, install the headless browser its tests use with `pnpm exec playwright install chromium`, stop the server, then run `rer verify`. `rer describe` lists every command and its flags.

## Deploy to your Cloudflare account

You need a Cloudflare account, its account ID, an API token scoped for the work, and an account with SendGrid or Resend.

First, set `storeTimezone`, `organizationName` and `landingSummary` in `src/ext/config.ts`. Schedules use `storeTimezone`; the default is Australia/Brisbane.

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

Fill it privately with your account credentials, owner email, mail settings and allowed link hosts; choose `MANGO_DEPLOY_ENV` for this installation. Keep the independent generated session, setup and contact keys with your backups. Mango never reads Wrangler credential files.

Product settings, including `MAIL_PROVIDER`, app version, timing and rate limits, live in `deploy.json` `vars`. Both deployment and sender verification read that definition. Change those settings there and deploy the change; shell overrides do not change the sender runner's declared settings. For SendGrid, `MAIL_WEBHOOK_SECRET` is the base64 public verification key of its signed event webhook. For Resend it is the Svix signing secret.

### Check, then deploy

From the repository root:

```bash
set -a
. ./.rer/hosted.env
set +a
rer deploy --environment "$MANGO_DEPLOY_ENV" --dry-run
rer deploy --environment "$MANGO_DEPLOY_ENV"
pnpm run hosted claim --environment "$MANGO_DEPLOY_ENV"
```

- `--dry-run` checks your inputs and builds locally without any provider request.
- `deploy` finds or creates the Worker, D1 database, R2 bucket and Queue for the selected environment, applies remote migrations, uploads the Worker and its assets, then verifies bindings and health after a real database ping. A five-minute scheduled job is part of the Worker.
- `hosted claim` validates the successful receipt and claims the first owner through Base's native bootstrap without printing credentials. A repeat keeps the existing owner.

`deploy` records owned resources and the canonical HTTPS origin in `.rer/deploy/<environment>.json`. Back that file up with the matching private inputs: later deployment needs it, and same-named unowned resources are refused. No manually guessed origin is needed. Open the deployed site, request an email sign-in link as `OWNER_EMAIL`, confirm it and save your business sender details in **Set up your sender identity**.

### Verify your sender

If you configure the trusted receiver, supply both its authenticated URL and diagnostic recipient privately in `.rer/hosted.env`, and include that recipient in `MANGO_TEST_EMAIL_ALLOWLIST`. The URL must use the trusted connector's public DNS host in the form `https://<public-receiver-host>/receipts?token=<private capability>`, with no other query parameters, port, fragment or user information. URL-encode the nonempty capability and keep the entire URL private. The connector must implement the Cloudflare Email Routing receipt semantics described in the repository's `OPERATIONS.md`; a generic mailbox API is insufficient. After completing sender setup, the same loaded `.rer/hosted.env` supports:

```bash
node scripts/sender-verification.mjs inspect
```

The runner reads `deploy.json` variables and the selected deployment's validated origin and owned D1 target. Missing inputs name themselves before any remote requests. A conflicting shell origin is refused. `inspect` checks authority without sending mail; run `node scripts/sender-verification.mjs prepare` to approve the diagnostic body shown in `scripts/sender-verification-entry.ts`, then use its returned ID with `node scripts/sender-verification.mjs send <id>` and `node scripts/sender-verification.mjs observe <id>`. Inspect again before approving a campaign. Provider/DNS checks alone do not grant sender authority.

### Optional: email design with 12ui

**Design with 12ui** in the email editor uses your own [12ui](https://12ui.com) account. It stays off, and Mango never contacts 12ui, until you give Mango two settings together: your 12ui API key and the address of 12ui's service. Supplying only one stops Mango from starting, with a message naming the other.

- On your computer, add both lines to `.dev.vars` and restart `rer dev`:

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

## Use an existing signed event receiver

For SendGrid delivery reports, use the provider's signed Event Webhook directly at `/webhooks/mail/sendgrid`, or have an existing signed receiver forward the whole request there. Transparent forwarding can reuse an existing hook without another webhook slot. First establish that the receiver permits forwarding, receives the required event types and has an appropriate account scope; Mango cannot discover these permissions for you.

Configure `MAIL_WEBHOOK_SECRET` with that Event Webhook's real public verification key. The path and `MAIL_WEBHOOK_ID` do not authenticate SendGrid events. Forward the original body bytes and both `X-Twilio-Email-Event-Webhook-Signature` and `X-Twilio-Email-Event-Webhook-Timestamp` headers unchanged. Do not parse and re-encode JSON, split or filter batches, replace timestamps, or sign with a relay key. Mango verifies the exact bytes before decoding the event JSON. The original timestamp must still be within five minutes; delayed forwarding does not relax that check. A `204` acknowledges completed ingestion in Mango; reliable forwarding and acknowledgement handling remain the receiver's responsibility.

A whole batch may include other applications' addresses. Mango retains unmatched facts and applies valid address-level complaints, suppressions and hard bounces even without a matching Mango send. Choose a trusted event/account scope deliberately. Filtering the batch at the relay invalidates its signature. An unsigned or OAuth-only existing hook does not satisfy this verifier. See [SendGrid Event Webhook security](https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook-security-features) and [Delivery reports](./delivery-reports.md).

Signed Inbound Parse authenticates received email, not outgoing delivery events. Mango has no Inbound Parse intake or reply inbox. Do not forward multipart Parse messages to the outgoing event URL or turn them into fabricated delivery facts. A separate receipt/reply integration would need its own public key, unchanged multipart body and boundary, replay handling and receiver trust design. See [SendGrid Parse security](https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/securing-your-parse-webhooks).

This forwarding design is locally signature-tested. Existing receiver access, live signed event ingestion and normal cron delivery remain unproven. The reviewed hosted installation required adjustments and manual Queue dispatch, and its account had both Event Webhook slots occupied. No live account configuration is changed by these instructions.
