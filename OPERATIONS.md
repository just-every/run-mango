# Mango operations

Use Node **22.20.0** and pnpm **10.12.4**. All application lifecycle commands use `node scripts/rer.mjs`; start with [Run it locally](AGENTS.md#run-it-locally). `describe --json` reports verbs/flags, `check --profile first-party` validates structure without configuration, and `doctor` diagnoses tools and missing inputs without provider requests or private values.

The newsletter profile needs email only. Commerce, SMS and AI are optional: leave each disabled group absent; partial enabled groups fail with missing names. `verify` runs contract/source checks, operations tests, typecheck, production build and local browser journeys. Run affected tests while editing; CI is the complete wall. Local success does not prove hosted operation or delivery.

## Source provenance

`edition.json`, `base-copies.json` and `sources.lock.json` identify maintained Base source and the selected immutable revision. `pnpm run source:check` verifies integrity; `pnpm run source:lock` refreshes it after intentional source changes. Mango owns its adapter and contact-authority recovery. The shared rer deploy kit is the only deployment implementation. Selected runtime copies remain byte-exact; local guides and reduced environment/diagnostic helpers are adaptations. Base owns its omitted standalone tests and fixtures.

## Authentication

Base operator-auth owns native sessions, one-use confirmed magic links, operator authority versions and last-active-operator protection. Every operator has equal product powers. Local setup claims one first owner, requests ordinary transactional mail in `/__dev/outbox`, and stops its temporary application. Repeat setup preserves private bytes and the existing owner/data. Dev prints readiness only after health and outbox checks pass. `node scripts/rer.mjs preview` serves a fixed build of the local worker (`.seed/preview`) over the same local state and sign-in as dev; Mango's production entry never serves the development outbox, so preview cannot serve the built server folder. Preview runs no schedules, and `build` leaves the local `wrangler.toml` in place so dev works afterwards.

`/signin` accepts an HTML POST before hydration. Link GET/HEAD renders a confirmation form without consuming it; the affirmative POST creates the native cookie. Private documents, APIs and Start server functions validate the session independently. Local outbox routes are restricted to the configured loopback origin, never exposed on a deployment. Viewing messages only reads storage; expired captures are removed on a subsequent capture. No email provider is required locally. Messages and token-bearing links must never appear in command logs.

Apply migrations in filename order. Preserve attribution profiles, invitation cancellation records, Base triggers, bootstrap admission and operator-version history. Cancelling an invitation invalidates its links and leaves durable inactive admission state; reactivation cannot revive it. Settings distinguishes pending and active operators and reloads after removal conflicts.

Hosted configuration uses canonical `OWNER_EMAIL`, `SESSION_SECRET`, `SETUP_TOKEN` and HTTPS origin. A separately selected compatibility binding profile uses `INITIAL_OPERATOR_EMAILS`, `SESSION_SIGNING_KEY` and `AUTH_SETUP_TOKEN`; conflicting authorities are refused. Keep independent random keys and exact private backups. Owner admission is an explicit authenticated operation, never inferred from a push or command name.

## Mail and sender authority

Set `MAIL_PROVIDER=sendgrid` or `resend` (omitted selects the existing Resend installation). `MAIL_PROVIDER_API_KEY` supplies that provider's key. `MAIL_WEBHOOK_SECRET` is SendGrid's base64 SPKI ECDSA public verification key when using SendGrid; for Resend it is the existing Svix signing secret. `MAIL_WEBHOOK_ID` identifies the configured event webhook. Transactional auth uses Base mail directly. SendGrid newsletter submission also uses Base mail; its delivery correlation metadata is **not** deduplication.

For a separately authorized installation, configure SendGrid's signed event webhook at `https://<deployment>/webhooks/mail/sendgrid`. Incoming original bytes are verified by Base before normalization; supported facts persist through Mango's existing inbox, destination suppression and conflict/replay safeguards before success. Submissions, processed events and delivered events remain distinct. SendGrid uses the approved single-attempt policy; uncertain handoffs require operator review and never automatically retry. Sender authority requires provider/DNS verification and the approved trusted receiver's original evidence. Configure the account-level webhook setting separately and verify live events before relying on delivery evidence. Sender lease, consent, saved revision and approval checks are unchanged. Resend keeps its existing marketing transport/reconciliation contract; it does not inherit claims from Base transactional mail.

Receiver material must come from an authenticated original-message mailbox connector. Excerpts, provider domain state and DNS alone cannot manufacture receiver authentication proof. Configure both secret `MAILBOX_RECEIPT_URL` and variable `MAILBOX_RECEIPT_RECIPIENT` to select the authenticated production receiver connector and its diagnostic recipient. One-sided configuration rejects startup. The installation trusts this public HTTPS endpoint to provide authoritative original-message receipt evidence; neither value has an owner-specific default.

## Deployment

`node scripts/rer.mjs deploy --environment production --dry-run` validates/builds locally without provider requests. A separately authorized `deploy --environment production` uses `deploy.json` and Base's owner-account kit. The kit uploads only what `deploy.json` declares: its `secrets` (owner email, session and setup keys, contact hash salt, mail key, sender address, webhook material and allowed link hosts) are read from environment variables of the same names on the first deploy and kept unchanged afterwards, its `vars` are the product settings shown there, and `MANGO_PUBLIC_BASE_URL` is the deployed origin. Change a setting by editing `vars` and deploying again. Supply explicit account/token and runtime configuration privately. The environment flag chooses the installation; default is production. Mango never reads Wrangler credential files.

Names derive from project and environment: `mango-production`, `mango-production-db`, `mango-production-assets-bucket` and `mango-production-mango-jobs`. The kit derives the workers.dev origin from the authenticated account, owns resources and migrations, uploads Worker/assets and verifies bindings plus source/version health after a real D1 ping.

Restore mode on a deployment: set `"MANGO_RESTORE_MODE": "1"` in `deploy.json` `vars` and deploy; product routes, the queue consumer and cron then pause (503 `restore_in_progress`) while sign-in, `/health` and the authenticated transfer routes stay open. Set it back to `"0"` and deploy again after the restore. A hosted restore itself is not yet proven.

Back up `.rer/deploy/<environment>.json`; repeat deployment requires matching ownership state. Same-named unowned resources are refused. Resolve uncertain resource ownership with the [Base deploy-kit recovery guide](scripts/base-cli/modules/deploy-kit/README.md), preserving source and data. CI verifies main pushes; it does not deploy.

## Authored newsletter draft API

An authenticated same-origin POST `/api/campaigns` accepts `{ "composition": <draft fields> }`. Required fields are name, email subject/body/text, sender name/from/reply-to/address, message category, audience description, structured inclusion rule and one or more timezone-resolved steps. Links and exclusions are optional. All content, steps and the operator attribution are inserted atomically in draft state; this request cannot approve, schedule or send.

A mail-only inclusion rule may use `{ "version": 1, "operator": "all", "predicates": [{ "sourceType": "contact", "field": "emailStatus", "comparator": "eq", "value": "subscribed" }] }`. Contact fields are limited to id, email, displayName, emailStatus and smsStatus. These are recorded contact data, not commerce facts. Derived source requirements omit contact fields but continue to require every commerce predicate's real source. Consent, dormancy, suppression, frequency, frozen-candidate and dispatch checks still apply. Source requirements are derived by the server, not trusted from request JSON.

The response supplies `campaignId` and `revisionId`. Read `/api/campaigns/:id`, save with PATCH `/api/campaign-revisions/:revisionId`, recompute via POST `/api/campaigns/:id/checks` with `{revisionId}`, and approve via POST `/api/campaigns/:id/approve` with `{revisionId,idempotencyKey}`. Approval remains fail-closed on missing sender/provider evidence.

For receiver qualification, set optional secret `MAILBOX_RECEIPT_URL` to the installation's authenticated receipt endpoint and `MAILBOX_RECEIPT_RECIPIENT` to its diagnostic recipient. The URL is stored as a Worker secret and never emitted in configuration or client assets. The protected sender-verification runner is documented in `src/core/features/sender-verification/README.md`. SendGrid uses single-attempt handoff with operator-reviewed uncertainty.

## Public signup protection

Optional Turnstile requires public variable `TURNSTILE_SITE_KEY` and secret `TURNSTILE_SECRET_KEY` together. Configure the widget for the hostname of `MANGO_PUBLIC_BASE_URL`. The form uses action `newsletter-signup`; Siteverify must affirm both action and hostname within five seconds, or signup rejects before storage. Without either key the form has no challenge. With only one key startup fails.

All installations require a complete saved sender identity before capture. Signup uses the trusted `CF-Connecting-IP` header, rejects invalid addresses and groups IPv6 by /64 (including equivalent spellings), with IPv4-mapped addresses sharing IPv4 allowances. Persistent atomic limits are five attempts per network per UTC hour, three reservations per destination per UTC day and fifty reservations globally per UTC hour. Failed or duplicate concurrent reservations may consume capacity; restart cannot reset it. Confirmation GET/HEAD only render the affirmative POST form. Public signup never mails or changes a subscribed, opted-out, suppressed or erased opted-out destination. Explicit reconsent requires a separately recorded authorized ledger flow.

## Local state and credential recovery

Durable local D1/R2 state is `.wrangler/state`; private `.dev.vars` records local format 2 with `OWNER_EMAIL`, `AUTH_ORIGIN`, `SESSION_SECRET`, `SETUP_TOKEN`, `CONTACT_HASH_SALT` and `MANGO_LOCAL_HASH_AUTHORITY=contact-salt-v1`. CLI state is `.rer/local`; installer work is `.seed/installer`. Keep the exact database/assets and matching settings together in private backup; credentials are 0600. Stop every local writer before recovery, build, transfer or reset.

An ambiguous database at `src/core/app/client/.wrangler/state` is refused without modification. If canonical state is absent, make `.wrangler` and explicitly move the verified matching database there. If both exist, preserve both and identify the matching backup before choosing; never combine or discard them by name.

`pnpm run auth:rotate -- --force --owner-email EMAIL --port PORT` is explicit credential recovery, separate from setup. It preserves verified contact authority while rotating login/setup credentials, invalidates prior sessions, and requires a fresh outbox sign-in. Setup never converts unknown settings or guesses authority. For unversioned settings proven to use the session key for contact hashes, add `--legacy-session-authority`; for settings proven to use the independent salt, add `--legacy-contact-authority`. These mutually exclusive options require `--force`. Preserve the original backup. If the effective key is uncertain, restore a known matching backup; hashes cannot reconstruct it. Missing/unknown authority fails closed; adding a version marker is not recovery.

## Input inventory and operations checks

`.env.example` lists every setup/deploy input, with values deliberately empty. Set real deployment values in your protected runner. `node scripts/rer.mjs doctor` prints JSON on stdout, plain guidance on stderr, and reports missing/invalid inputs. Missing inputs are expected on a fresh checkout. Read this guide and populate the inputs below, build without credentials, then use `node scripts/rer.mjs deploy --environment production` when authorized. `node scripts/rer.mjs describe --json` describes commands; OPERATIONS.json inventories production inputs and declared loops. A passing local-input check does not verify credentials, deployed resources, DNS or delivery.

Cloudflare deployment inputs: obtain `CLOUDFLARE_ACCOUNT_ID` from your target account and an appropriately scoped `CLOUDFLARE_API_TOKEN` from its token settings. Choose `MANGO_DEPLOY_ENV` for the intended installation. Only deploy changes hosted resources.

Runtime and mail inputs: generate independent `SESSION_SECRET`, `SETUP_TOKEN` and `CONTACT_HASH_SALT` (at least 32 random bytes for the first two); set `OWNER_EMAIL` to the owner address. Set the public HTTPS origin/version and allowed link hosts, test destinations, timing and rate limits using the names in `.env.example`. Configure the sender display name, from address, reply-to and physical postal address. For SendGrid use `MAIL_PROVIDER=sendgrid`, the provider API credential as `MAIL_PROVIDER_API_KEY`, and your configured webhook verification material as `MAIL_WEBHOOK_SECRET`/`MAIL_WEBHOOK_ID`. If hosted sign-in mail fails, check these mail inputs and the provider sender verification, then request a new link after correcting them. No development outbox is exposed on a deployed install.

Commerce, SMS and AI remain optional: configure every key in the corresponding `optionalModules` group together, or leave that group empty. The mailbox receipt URL/recipient and Turnstile site/secret keys are optional pairs; each pair must be configured together. The receipt connector is needed for marketing sender approval, not transactional sign-in. Input source descriptions name locations, never credential values.

## Test artifacts

`MANGO_TEST_WORK_DIR` is a test-only absolute path to a work directory outside the checkout. Set it before verification, captures and checks of nested source or release clones; without it, the harness uses the checkout's parent. Playwright and native captures write under its `evidence/` directory, separated by checkout identity and suite. Capture-directory overrides must stay inside that evidence directory. Runtime copies, private logs and temporary databases stay under its `tmp/`; fresh-copy journeys inherit the same root. Set `TMPDIR` to that `tmp/` directory for Node and tool-created temporary files. Keep evidence until reviewed; runtime cleanup removes disposable checkouts and database state. Browser traces are disabled because they can record native session cookies and sign-in links. Authentication assertions compare counts or booleans so failure diagnostics do not print mail bodies or credentials.

## Declared mail loop

OPERATIONS v2 declares the maintained SendGrid newsletter path explicitly. Supply `MAIL_PROVIDER=sendgrid`, the runtime `MAIL_PROVIDER_API_KEY`, and `SENDGRID_API_KEY` for Base's declarative mail-loop inspection. Both key names identify the same account credential; the second is used only by the shared inspector. For example, assign it privately with `export SENDGRID_API_KEY="$MAIL_PROVIDER_API_KEY"`; this prints neither value.

Resend remains supported by the runtime. To select it, explicitly change the transactional-mail loop's provider to `resend` in OPERATIONS.json, replace its environmentSources key with RESEND_API_KEY, set MAIL_PROVIDER=resend and supply RESEND_API_KEY from the same credential as MAIL_PROVIDER_API_KEY. Refresh the source lock with `pnpm run source:lock` after changing the descriptor. An inconsistent declaration fails inspection; no provider is selected automatically. Local installation uses the development outbox and needs neither hosted provider key.

## Complete data export and restore

With dev stopped, `node scripts/rer.mjs export --output exports/mango.jsonl` creates a new private archive. It contains every product D1 table and original R2 asset with metadata: contacts, consent, surviving opt-outs, source records, campaigns/revisions, approvals, outcomes, settings, audit and import history. Attribution profiles carry no login authority. Auth sessions/tokens, owner-claim admission, outbox, transfer bookkeeping, secrets/provider credentials and queue transport envelopes are excluded. Remote CLI targets are unsupported and fail visibly.

Back up matching private settings separately, including contact and signing authority. The archive binds restoration to their fingerprint and cannot recover them. Copy the archive and private settings into a new empty local destination with no writer running, then run `node scripts/rer.mjs import --input exports/mango.jsonl --yes`. The shared CLI locks state, applies migrations and validates/stages data before atomic restoration; wrong schema, integrity, key fingerprint or nonempty destinations are refused. Re-export to a new filename and compare content before ordinary setup and fresh sign-in. Reconfigure provider inputs separately; never rotate authority during restore.

The authenticated transfer API enforces maintenance: product reads/writes and scheduled work stop, queue jobs retry, and only health/auth/transfer remain available. Erasure retires current snapshots and records tombstones preventing restoration of erased contacts into the same installation. Offline backups remain subject to owner retention/privacy policy.

`node scripts/rer.mjs reset --non-interactive` prints the local removal inventory and refuses deletion. Review it, then use `reset --yes` for explicit destruction of local data, owners, settings, outbox and command/installer state. It refuses active operations, preserves source/dependencies, exports and deploy receipts, and permits fresh empty setup. Export first if retaining data.

## Managed delivery and editor

`scripts/delivery/base/packaging.json` selects `rer-setup.json`. The maintained producer generates rer-project.json and its managed workflow. After `node scripts/rer.mjs build`, `pnpm run artifact:delivery` emits actual Worker modules/assets and migrations under ignored delivery-artifact without provider calls.

Signed `/auth/owner-claim` admission binds trusted issuer/key, management origin, installation, configured app origin and owner email. Ordinary Base auth owns the one-time transaction and native session. Existing claimed installations cannot create another first owner. Only an active native owner receives an editor grant for the exact management origin/installation; anonymous visitors receive no widget. Logout, session loss or expiry revokes it. Route leaves apply compiled visual edits after hydration.

Managed delivery uses the pinned trusted workflow's project build profile. Hosted admission and publication require separate authorization and verification; local verification is not hosted acceptance. Migrations 0028–0030 contain owner-claim and import staging/custody schemas. Apply in filename order with matching D1/R2/settings backups; preserve custody tables while imports are active. Rollback restores matching source/data together.

## Verification cost and release capacity

See [VERIFYING.md](VERIFYING.md) for routine verification, timing artifacts and the capacity profile enforced by `rer release`. `pnpm verify:release` runs both profiles before preparing a release.
