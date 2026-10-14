# Mango operations

Use Node **22.20.0** and pnpm **10.12.4**. All application lifecycle commands use the installed `@runeditrun/rer` package pinned exactly to **0.2.2**; `pnpm exec rer` selects that checkout's CLI, and package scripts invoke the same `rer` command; start with [Run it locally](AGENTS.md#run-it-locally). `describe --json` reports verbs/flags, `check --profile first-party` validates structure without configuration, and `doctor` diagnoses tools and missing inputs without provider requests or private values.

The newsletter profile needs email only. Commerce, SMS, AI and design generation are optional: leave each disabled group absent; partial enabled groups fail with missing names. `verify` runs contract/source checks, operations tests, typecheck, production build and local browser journeys. Run affected tests while editing; CI is the complete wall. Local success does not prove hosted operation or delivery.

## Source provenance

`edition.json`, `base-copies.json` and `sources.lock.json` identify maintained Base source and the selected immutable revision. `pnpm run source:check` verifies integrity; `pnpm run source:lock` refreshes it after intentional source changes. Mango owns its adapter and contact-authority recovery. The CLI package pin and copied runtime source revision are separate: upgrading the installed CLI does not replace the retained Base auth/mail source under `src/vendor/base`. Only `/auth/setup-complete` imports operator-auth from the installed package for its local completion handshake; ordinary email access continues through the retained runtime source. The shared rer deploy kit is the only deployment implementation. Selected runtime copies remain byte-exact; local guides and reduced environment/diagnostic helpers are adaptations. Base owns its omitted standalone tests and fixtures.

## Authentication

Base operator-auth owns native sessions, one-use confirmed magic links, operator authority versions and last-active-operator protection. Every operator has equal product powers. Setup declares optional `oidc-provider@1` with cardinality 1 through `IDENTITY_PROVIDER`, registering `/auth/oidc/auth/callback` and `/auth/oidc/auth/logout`; leaving it empty retains email-link sign-in. `/auth/setup-complete` delegates only the local completion handshake to the pinned Base package, which requires the local CLI proof and an active owner; production cannot use it. Migration 0043 adds Base authentication settings without rewriting existing operator/session tables. Local setup claims one first owner, requests ordinary transactional mail in `/__dev/outbox`, and stops its temporary application. Repeat setup preserves private bytes and the existing owner/data. Dev prints readiness only after health and outbox checks pass. `rer preview` serves a fixed build of the local worker (`.seed/preview`) over the same local state and sign-in as dev; Mango's production entry never serves the development outbox, so preview cannot serve the built server folder. Preview runs no schedules, and `build` leaves the local `wrangler.toml` in place so dev works afterwards.

`/signin` accepts an HTML POST before hydration. Link GET/HEAD renders a confirmation form without consuming it; the affirmative POST creates the native cookie. Private documents, APIs and Start server functions validate the session independently. Local outbox routes are restricted to the configured loopback origin, never exposed on a deployment. Viewing messages only reads storage; expired captures are removed on a subsequent capture. No email provider is required locally. Messages and token-bearing links must never appear in command logs.

Apply migrations in filename order. Preserve attribution profiles, invitation cancellation records, Base triggers, bootstrap admission and operator-version history. Cancelling an invitation invalidates its links and leaves durable inactive admission state; reactivation cannot revive it. Settings distinguishes pending and active operators and reloads after removal conflicts.

Hosted configuration uses canonical `OWNER_EMAIL`, `SESSION_SECRET`, `SETUP_TOKEN` and HTTPS origin. A separately selected compatibility binding profile uses `INITIAL_OPERATOR_EMAILS`, `SESSION_SIGNING_KEY` and `AUTH_SETUP_TOKEN`; conflicting authorities are refused. Keep independent random keys and exact private backups. Owner admission is an explicit authenticated operation, never inferred from a push or command name.

## Mail and sender authority

Select `MAIL_PROVIDER` in `deploy.json` `vars` (`sendgrid` in this checkout, or `resend`). `MAIL_PROVIDER_API_KEY` supplies that provider's key. `MAIL_WEBHOOK_SECRET` is SendGrid's base64 SPKI ECDSA public verification key when using SendGrid; for Resend it is the existing Svix signing secret. `MAIL_WEBHOOK_ID` identifies the configured event webhook. Transactional auth uses Base mail directly. SendGrid newsletter submission also uses Base mail; its delivery correlation metadata is **not** deduplication.

For a separately authorized installation, configure SendGrid's signed event webhook at `https://<deployment>/webhooks/mail/sendgrid`. Incoming original bytes are verified by Base before normalization; supported facts persist through Mango's existing inbox, destination suppression and conflict/replay safeguards before success. Submissions, processed events and delivered events remain distinct. SendGrid uses the approved single-attempt policy; uncertain handoffs require operator review and never automatically retry. Sender authority requires provider/DNS verification and the approved trusted receiver's original evidence. Configure the account-level webhook setting separately and verify live events before relying on delivery evidence. Sender lease, consent, saved revision and approval checks are unchanged. Resend keeps its existing marketing transport/reconciliation contract; it does not inherit claims from Base transactional mail.

Receiver material must come from an authenticated original-message mailbox connector. Excerpts, provider domain state and DNS alone cannot manufacture receiver authentication proof. Configure both `MAILBOX_RECEIPT_URL` and `MAILBOX_RECEIPT_RECIPIENT` (the deploy kit stores both as Worker secrets) to select the authenticated production receiver connector and its diagnostic recipient. One-sided configuration rejects deployment before the build and also rejects Worker startup. Leave both unset to keep the receiver off. Set `MANGO_TEST_EMAIL_ALLOWLIST` to a comma-separated list containing the receiver address and every permitted QA destination; with no explicit allowlist the owner address is the only test destination. The installation trusts this public HTTPS endpoint to provide authoritative original-message receipt evidence; neither value has an owner-specific default.

## Deployment

`pnpm exec rer deploy --environment production --dry-run` validates/builds locally without provider requests. The pinned rer 0.2.1 deploy command provisions the Worker; it does **not** admit the first owner. The following recipe supplies the actual deploy inputs and then explicitly claims that owner through Base's native bootstrap.

1. Create a private deployment input file once, from the repository root:

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

2. Edit `.rer/hosted.env` privately. Choose `MANGO_DEPLOY_ENV` for this installation (the generated value is `production`). Fill the account ID, scoped API token, owner email, SendGrid API key, verified sign-in sender (`MAIL_AUTH_FROM`), signed-webhook verification material (`MAIL_WEBHOOK_SECRET` and `MAIL_WEBHOOK_ID`), and comma-separated allowed link hostnames (`MANGO_ALLOWED_LINK_HOSTS`). Keep the generated authority values. Values are shell single-quoted: escape an embedded apostrophe as `'\''`. Never print this file or commit it. Sender display name, reply-to and postal address are saved in the app's sender setup after sign-in.

   Receiver verification is optional. Leave its two lines empty to keep it off, or fill **both** `MAILBOX_RECEIPT_URL` and `MAILBOX_RECEIPT_RECIPIENT` (its diagnostic mailbox). The URL must have the form `https://<public-receiver-host>/receipts?token=<private capability>`, using the trusted connector's public DNS hostname, the exact `/receipts` path and exactly one query parameter named `token`. Replace both placeholders with the connector's actual settings; this template is not a usable endpoint. Use its nonempty private capability (at most 4096 decoded characters), URL-encoding the value so reserved characters cannot introduce extra parameters. Do not include a custom port, URL user information, a fragment or whitespace. IP addresses and local/private hostnames are unsupported. The connector must implement the supported Cloudflare Email Routing receipt semantics; a generic mailbox API URL is not sufficient. Keep the entire token-bearing URL private in this file; the deploy kit stores both receiver settings as Worker secrets. Never paste the URL into logs, screenshots, client configuration or shared reports.

   Fill `MANGO_TEST_EMAIL_ALLOWLIST` with the comma-separated receiver and QA addresses. This allowlist may also be configured without a receiver; it never grants sign-in access. The receiver alone cannot verify provider/DNS authority, and absent receiver evidence prevents sender approval. Optional design generation uses the pair described below.

3. From a committed checkout, load those inputs, deploy and claim:

```sh
set -a
. ./.rer/hosted.env
set +a
pnpm exec rer deploy --environment "$MANGO_DEPLOY_ENV"
pnpm run hosted claim --environment "$MANGO_DEPLOY_ENV"
```

The claim command reads the successful receipt in `.rer/deploy/<environment>.json`, validates its project/environment and workers.dev origin, and posts the private setup token to `/auth/bootstrap` without following redirects or printing the token, cookie or response. It creates one native owner; a repeat keeps the existing owner. Open the deployed origin, request an email sign-in link for `OWNER_EMAIL`, confirm it, and complete sender setup. Keep the setup token private with the matching session and contact authority backup.

The kit uploads only the inputs in `deploy.json`: required secrets are needed on first deploy and inherited afterwards. Receiver and QA inputs, like design inputs, are optional secrets uploaded when supplied; the kit preserves existing Worker secrets on later uploads even when their shell inputs are absent. `.rer/declarations/` contains names only. To change an existing secret deliberately, replace that Worker secret using your authorized Cloudflare administration; rer deploy keeps existing values. Product settings (provider, app version, timing and rate limits) are defined once in `deploy.json` `vars`, consumed by both deployment and the sender-verification runner; change them there and deploy before verification. Shell values do not override those declared settings. `MANGO_PUBLIC_BASE_URL` comes from the successful deployment receipt, after its project, environment, Worker, owned D1 and canonical HTTPS workers.dev origin have been checked. The runner refuses a conflicting shell origin. Keep the receipt and private inputs for the same installation together.

For an update, preserve private inputs, the deploy receipt and your data backups, then run:

```sh
git pull --ff-only
pnpm install --frozen-lockfile
set -a
. ./.rer/hosted.env
set +a
pnpm exec rer deploy --environment "$MANGO_DEPLOY_ENV"
```

Choose the same `--environment` as the first deployment. Verify existing and fresh email sign-in and the Worker health after deployment. The owner claim need not be repeated. Mango never reads Wrangler credential files.

Names derive from project and environment: `mango-production`, `mango-production-db`, `mango-production-assets-bucket` and `mango-production-mango-jobs`. The kit derives the workers.dev origin from the authenticated account, owns resources and migrations, uploads Worker/assets and verifies bindings plus source/version health after a real D1 ping.

Restore mode on a deployment: set `"MANGO_RESTORE_MODE": "1"` in `deploy.json` `vars` and deploy; product routes, the queue consumer and cron then pause (503 `restore_in_progress`) while sign-in, `/health` and the authenticated transfer routes stay open. Set it back to `"0"` and deploy again after the restore. A hosted restore itself is not yet proven.

Back up `.rer/deploy/<environment>.json`; repeat deployment requires matching ownership state. Same-named unowned resources are refused. Resolve uncertain resource ownership with the Base deploy-kit recovery guide (`modules/deploy-kit/README.md` in the installed `@runeditrun/rer` package), preserving source and data. CI verifies application changes. The Run site workflow automatically publishes marketing pages and documentation; application deployment remains explicit.

## Authored newsletter draft API

An authenticated same-origin POST `/api/campaigns` accepts `{ "composition": <draft fields> }`. Required fields are name, email subject/body/text, sender name/from/reply-to/address, message category, audience description, structured inclusion rule and one or more timezone-resolved steps. Links and exclusions are optional. All content, steps and the operator attribution are inserted atomically in draft state; this request cannot approve, schedule or send.

A mail-only inclusion rule may use `{ "version": 1, "operator": "all", "predicates": [{ "sourceType": "contact", "field": "emailStatus", "comparator": "eq", "value": "subscribed" }] }`. Contact fields are limited to id, email, displayName, emailStatus and smsStatus. These are recorded contact data, not commerce facts. Derived source requirements omit contact fields but continue to require every commerce predicate's real source. Consent, dormancy, suppression, frequency, frozen-candidate and dispatch checks still apply. Source requirements are derived by the server, not trusted from request JSON.

The response supplies `campaignId` and `revisionId`. Read `/api/campaigns/:id`, save with PATCH `/api/campaign-revisions/:revisionId`, recompute via POST `/api/campaigns/:id/checks` with `{revisionId}`, and approve via POST `/api/campaigns/:id/approve` with `{revisionId,idempotencyKey}`. Approval remains fail-closed on missing sender/provider evidence.

Campaign images (CAMP-012): an authenticated same-origin POST `/api/campaign-assets` takes one JPEG, PNG, GIF or WebP file as the single `file` part of a `multipart/form-data` body. The type is read from the file's own header (the declared type and name are ignored) and a truncated file is refused; byte and pixel limits are `maxCampaignAssetBytes` and `maxCampaignAssetPixelsPerSide` in `seed.json`. The file is stored once in `ASSETS_BUCKET` under `campaign-assets/<sha256>` with a `campaign_assets` record that cannot be changed or deleted (contact erasure can still remove bytes that hold an erased contact's identifier; `/media/` then answers 410); a repeat upload answers 200 with the existing image, a new one 201, and both give its public `url`. GET/HEAD `/media/<sha256>` (also with the stored type's extension, `/media/<sha256>.png`) is a declared public path: no session or cookie, exact type, `nosniff`, immutable cache, and `mediaRequestsPerMinutePerAsset` per image (429 above it). It records nothing about requesters. In HTML mode the email editor's **Insert image** uploads through the same route. Approval verifies these images in D1 and R2 rather than fetching the deployment's own hostname. Every image fetch from an inbox is a Worker request and one D1 row write, which counts toward the Free plan's daily quotas.

Design import (DESIGN-004): in a draft's email editor, **Import 12ui design** takes a LayerDoc version 2 file and the PNG candidate it was converted from, both made with the owner's own `12ui` CLI (`12ui draft …`, then `12ui convert <candidate.png> --engine api --output layerdoc --model fast`). The browser crops the photos, uploads them through `/api/campaign-assets` and builds the body as an unsaved edit; saving, preview and approval are unchanged. Import itself uses no 12ui key and makes no request to 12ui; only the optional design generation below does, with its own declared external. On a local review copy the origin is `http:`: an imported email saves and previews with its styling and, on request, its own images, but approval and test sends refuse its `http:` images until the deployment has an HTTPS public base URL. See docs/first-newsletter.md.

Design generation (DESIGN-001 to DESIGN-003) is optional and off by default. To let operators press **Design with 12ui** in a draft's email editor, set both `DESIGN_PROVIDER_API_KEY` (the owner's own 12ui API key, a secret) and `DESIGN_PROVIDER_ORIGIN` (`https://12ui.com`); one without the other fails startup, and an origin that is not a bare HTTPS origin is refused. With both absent Mango constructs no design adapter and never contacts 12ui. On a hosted deployment set both as environment inputs when you run `deploy`: `deploy.json` declares them as optional secrets (`"optional": true`), which `deploy` uploads only when their inputs are set, on the first deploy or a later one, and keeps afterwards (Mango resolves `deploy.json` into `.rer/declarations/` for the deploy kit, with the optional secrets you set); `rer verify` checks the build without them. Setting them with `wrangler secret put` also works. On a copy running on your computer, add both lines to `.dev.vars` and restart dev; that copy may also name a loopback `http://127.0.0.1:<port>` origin for a stand-in service. A run spends from the owner's 12ui account (about $0.03 per candidate and $0.05 per layout at 12ui's list prices, free within its daily allowance) and writes `external_cost_facts` rows with provider `12ui`. Runs live in `design_jobs` and `design_candidates` (migration 0040; migration 0041 adds why and until when a run waits on 12ui) and in R2 under `design-jobs/<run>/`; they are exported like everything else. The queue command kinds are `design.draft` and `design.layout`, and the `*/5` cron fails runs past their 15-minute deadline. A 429 with `Retry-After` makes a run wait (the editor shows the time until Mango asks again); a 429 without one, a 402, a refused key or three failed passes fail it at once with Mango's reason, and every request to 12ui has a time limit, so a silent 12ui fails a run within minutes. Downloads from 12ui are read with a size limit and follow a redirect only on the configured origin, so the key never goes to another host. What is sent to 12ui and its sub-processors is declared in `seed.json → externals → design-provider` and CONTRACT.md.

### Sender verification

For receiver qualification, configure both receiver secrets using the exact token-bearing URL format in the [deployment recipe](#deployment) and the connector's diagnostic recipient. After deployment, owner sign-in and sender setup, load the same private inputs from the repository root:

```sh
set -a
. ./.rer/hosted.env
set +a
node scripts/sender-verification.mjs inspect
```

The runner loads product variables from `deploy.json` and the canonical origin and owned D1 target from `.rer/deploy/$MANGO_DEPLOY_ENV.json`; no extra runtime defaults or manually guessed origin are needed. Missing or invalid configuration is reported by input name before provider, DNS, receiver or D1 requests. Keep these local secrets synchronized with the deployed Worker; local parsing cannot verify that remote credentials match.

`inspect` reports current authority; it does not send diagnostic mail. To authorize the diagnostic body shown in `scripts/sender-verification-entry.ts`, run `node scripts/sender-verification.mjs prepare`, then use its returned ID with `node scripts/sender-verification.mjs send <id>` and `node scripts/sender-verification.mjs observe <id>`, and inspect again before approval. The URL is stored as a Worker secret and never emitted in configuration or client assets. The protected runner's evidence requirements are documented in `src/core/features/sender-verification/README.md`. SendGrid uses single-attempt handoff with operator-reviewed uncertainty.

## Public signup protection

Optional Turnstile requires public variable `TURNSTILE_SITE_KEY` and secret `TURNSTILE_SECRET_KEY` together. Configure the widget for the hostname of `MANGO_PUBLIC_BASE_URL`. The form uses action `newsletter-signup`; Siteverify must affirm both action and hostname within five seconds, or signup rejects before storage. Without either key the form has no challenge. With only one key startup fails.

All installations require a complete saved sender identity before capture. Signup uses the trusted `CF-Connecting-IP` header, rejects invalid addresses and groups IPv6 by /64 (including equivalent spellings), with IPv4-mapped addresses sharing IPv4 allowances. Persistent atomic limits are five attempts per network per UTC hour, three reservations per destination per UTC day and fifty reservations globally per UTC hour. Failed or duplicate concurrent reservations may consume capacity; restart cannot reset it. Confirmation GET/HEAD only render the affirmative POST form. Public signup never mails or changes a subscribed, opted-out, suppressed or erased opted-out destination. Explicit reconsent requires a separately recorded authorized ledger flow.

## Local state and credential recovery

Durable local D1/R2 state is `.wrangler/state`; private `.dev.vars` records local format 2 with `OWNER_EMAIL`, `AUTH_ORIGIN`, `SESSION_SECRET`, `SETUP_TOKEN`, `CONTACT_HASH_SALT` and `MANGO_LOCAL_HASH_AUTHORITY=contact-salt-v1`. CLI state is `.rer/local`; installer work is `.seed/installer`. Keep the exact database/assets and matching settings together in private backup; credentials are 0600. Stop every local writer before recovery, build, transfer or reset.

An ambiguous database at `src/core/app/client/.wrangler/state` is refused without modification. If canonical state is absent, make `.wrangler` and explicitly move the verified matching database there. If both exist, preserve both and identify the matching backup before choosing; never combine or discard them by name.

`pnpm run auth:rotate -- --force --owner-email EMAIL --port PORT` is explicit credential recovery, separate from setup. It preserves verified contact authority while rotating login/setup credentials, invalidates prior sessions, and requires a fresh outbox sign-in. Setup never converts unknown settings or guesses authority. For unversioned settings proven to use the session key for contact hashes, add `--legacy-session-authority`; for settings proven to use the independent salt, add `--legacy-contact-authority`. These mutually exclusive options require `--force`. Preserve the original backup. If the effective key is uncertain, restore a known matching backup; hashes cannot reconstruct it. Missing/unknown authority fails closed; adding a version marker is not recovery.

## Input inventory and operations checks

`.env.example` lists every setup/deploy input, with values deliberately empty. Set real deployment values in your protected runner. `rer doctor` prints JSON on stdout, plain guidance on stderr, and reports missing/invalid inputs. Missing inputs are expected on a fresh checkout. Read this guide and populate the inputs below, build without credentials, then use `rer deploy --environment production` when authorized. `rer describe --json` describes commands; OPERATIONS.json inventories production inputs and declared loops. A passing local-input check does not verify credentials, deployed resources, DNS or delivery.

Cloudflare deployment inputs: obtain `CLOUDFLARE_ACCOUNT_ID` from your target account and an appropriately scoped `CLOUDFLARE_API_TOKEN` from its token settings. Choose `MANGO_DEPLOY_ENV` for the intended installation. Only deploy changes hosted resources.

Runtime and mail inputs: generate independent `SESSION_SECRET`, `SETUP_TOKEN` and `CONTACT_HASH_SALT` (at least 32 random bytes for the first two); set `OWNER_EMAIL` to the owner address. Set allowed link hosts and test destinations in the private inputs; set the provider, app version, timing and rate limits in `deploy.json` `vars`. Deployment and sender verification derive the public HTTPS origin from the selected deployment. Configure the sender display name, from address, reply-to and physical postal address. For SendGrid select `MAIL_PROVIDER=sendgrid` in `deploy.json` `vars`, the provider API credential as `MAIL_PROVIDER_API_KEY`, and your configured webhook verification material as `MAIL_WEBHOOK_SECRET`/`MAIL_WEBHOOK_ID`. If hosted sign-in mail fails, check these mail inputs and the provider sender verification, then request a new link after correcting them. No development outbox is exposed on a deployed install.

Commerce, SMS, AI and design generation remain optional: configure every key in the corresponding `optionalModules` group together, or leave that group empty. The mailbox receipt URL/recipient and Turnstile site/secret keys are optional pairs; each pair must be configured together. The receipt connector is needed for marketing sender approval, not transactional sign-in. Input source descriptions name locations, never credential values.

## Test artifacts

`MANGO_TEST_WORK_DIR` is a test-only absolute path to a work directory outside the checkout. Set it before verification, captures and checks of nested source or release clones; without it, the harness uses the checkout's parent. Playwright and native captures write under its `evidence/` directory, separated by checkout identity and suite. Capture-directory overrides must stay inside that evidence directory. Runtime copies, private logs and temporary databases stay under its `tmp/`; fresh-copy journeys inherit the same root. Set `TMPDIR` to that `tmp/` directory for Node and tool-created temporary files. Keep evidence until reviewed; runtime cleanup removes disposable checkouts and database state. Browser traces are disabled because they can record native session cookies and sign-in links. Authentication assertions compare counts or booleans so failure diagnostics do not print mail bodies or credentials.

## Declared mail loop

OPERATIONS v2 declares the maintained SendGrid newsletter path explicitly. Supply `MAIL_PROVIDER=sendgrid`, the runtime `MAIL_PROVIDER_API_KEY`, and `SENDGRID_API_KEY` for Base's declarative mail-loop inspection. Both key names identify the same account credential; the second is used only by the shared inspector. For example, assign it privately with `export SENDGRID_API_KEY="$MAIL_PROVIDER_API_KEY"`; this prints neither value.

Resend remains supported by the runtime. To select it, explicitly change the transactional-mail loop's provider to `resend` in OPERATIONS.json, replace its environmentSources key with RESEND_API_KEY, set MAIL_PROVIDER=resend and supply RESEND_API_KEY from the same credential as MAIL_PROVIDER_API_KEY. Refresh the source lock with `pnpm run source:lock` after changing the descriptor. An inconsistent declaration fails inspection; no provider is selected automatically. Local installation uses the development outbox and needs neither hosted provider key.

## Complete data export and restore

With dev stopped, `rer export --output exports/mango.jsonl` creates a new private archive. It contains every product D1 table and original R2 asset with metadata: contacts, consent, surviving opt-outs, source records, campaigns/revisions, approvals, outcomes, settings, audit and import history. Attribution profiles carry no login authority. Auth sessions/tokens, owner-claim admission, outbox, transfer bookkeeping, secrets/provider credentials and queue transport envelopes are excluded. Remote CLI targets are unsupported and fail visibly.

Back up matching private settings separately, including contact and signing authority. The archive binds restoration to their fingerprint and cannot recover them. Copy the archive and private settings into a new empty local destination with no writer running, then run `rer import --input exports/mango.jsonl --yes`. The shared CLI locks state, applies migrations and validates/stages data before atomic restoration; wrong schema, integrity, key fingerprint or nonempty destinations are refused. Re-export to a new filename and compare content before ordinary setup and fresh sign-in. Reconfigure provider inputs separately; never rotate authority during restore.

The authenticated transfer API enforces maintenance: product reads/writes and scheduled work stop, queue jobs retry, and only health/auth/transfer remain available. Erasure retires current snapshots and records tombstones preventing restoration of erased contacts into the same installation. Offline backups remain subject to owner retention/privacy policy.

`rer reset --non-interactive` prints the local removal inventory and refuses deletion. Review it, then use `reset --yes` for explicit destruction of local data, owners, settings, outbox and command/installer state. It refuses active operations, preserves source/dependencies, exports and deploy receipts, and permits fresh empty setup. Export first if retaining data.

## Managed delivery and editor

`scripts/delivery/base/packaging.json` selects `rer-setup.json`. The maintained producer generates rer-project.json and its managed workflow. After `rer build`, `pnpm run artifact:delivery` emits actual Worker modules/assets and migrations under ignored delivery-artifact without provider calls.

Signed `/auth/owner-claim` admission binds trusted issuer/key, management origin, installation, configured app origin and owner email. Ordinary Base auth owns the one-time transaction and native session. Existing claimed installations cannot create another first owner. Only an active native owner receives an editor grant for the exact management origin/installation; anonymous visitors receive no widget. Logout, session loss or expiry revokes it. Route leaves apply compiled visual edits after hydration.

Managed delivery uses the pinned trusted workflow's project build profile. Hosted admission and publication require separate authorization and verification; local verification is not hosted acceptance. Migrations 0028–0030 contain owner-claim and import staging/custody schemas. Apply in filename order with matching D1/R2/settings backups; preserve custody tables while imports are active. Rollback restores matching source/data together.

## Verification cost and release capacity

See [VERIFYING.md](VERIFYING.md) for routine verification, timing artifacts and the capacity profile enforced by `rer release`. `pnpm verify:release` runs both profiles before preparing a release.
