## Run it locally

First install **Node 22 or later**: rer runs on it, and the installer stops with `node is required` without it. Get it from [nodejs.org](https://nodejs.org/en/download) (or `brew install node` on a Mac, or a version manager such as nvm). Then install `rer` once per computer with `npm install -g @runeditrun/rer` (or `curl -fsSL https://runeditrun.com/install.sh | sh`). In this checkout it selects pinned rer **0.2.22**, which acquires and uses Node **22.20.0** and pnpm **10.12.4** for this project and installs the locked dependencies; you do not install pnpm yourself. Run from the project root and supply your own owner email. `rer dev` alone also works in a fresh clone: it installs, sets up a local owner and picks a free port for you.

```sh
rer install
rer setup --owner-email owner@example.test
rer dev
```

Wait for `RER_READY` and open the private `RER_OPEN` link on this computer: default `rer dev` prints `RER_SIGNED_IN` and opens as the owner. Keep this key-bearing development entry private; it is distinct from an emailed one-use sign-in link. Local dev signs you in automatically through its private development key; no email is sent and no captured-mail page is exposed. First sign-in opens `/setup` to save your business sender identity. Setup exits with no server running. `rer dev` leaves the server running in the background; use the free port in its printed `RER_OPEN` link and stop it with `rer dev --stop` before verification or data operations.

Node may print `ExperimentalWarning: SQLite is an experimental feature and might change at any time` when rer loads Node’s built-in SQLite API for local tooling. This warning alone is not a command failure; check the command result and, for dev, wait for `RER_READY`.

```sh
rer verify
rer reset --yes
rer export --output exports/mango.jsonl
rer import --input exports/mango.jsonl --yes
rer deploy --environment production --dry-run
rer describe
```

Reset deletes local data and credentials. Export before resetting if you need that data; import requires an empty destination and the matching private settings backup. The commands above are separate operations, not a reset-and-backup sequence. Real deployment uses `rer deploy --environment production` with authorized owner-account credentials. Set `storeTimezone`, `organizationName` and `landingSummary` in `src/ext/config.ts`, then commit that file locally before deploying (`git add src/ext/config.ts` and `git commit -m "Configure Mango installation"`). No push is needed; deploy requires tracked changes to be committed. Pinned rer 0.2.22 automatically claims the first owner and removes the one-time setup token. For an existing installation, preserve private inputs, backups and customizations, then use `git pull --ff-only`, `rer install`, `rer build` and `rer deploy --environment production` with the same environment and loaded private inputs. rer installs locked dependencies and retains the owner; no separate claim is needed. See [OPERATIONS.md](OPERATIONS.md) for recovery and configuration; `describe --json` lists the actual flags, and `check --profile first-party` checks the command contract.

Managed hosting includes sign-in and subscription-confirmation mail: Run Edit Run supplies `MAIL_PROVIDER=rer`, `MAIL_FROM`, `MAIL_RELAY_URL` and a private `MAIL_API_KEY`. Newsletters require a separate owner-supplied SendGrid or Resend connection (`MARKETING_MAIL_PROVIDER`, `MARKETING_MAIL_API_KEY` and provider-specific webhook inputs) and a verified business sender. Missing marketing configuration blocks approval. Free and Assisted hosting retain their own-provider mail; see [Mail and sender authority](OPERATIONS.md#mail-and-sender-authority).

# Working on this edition

This repository contains the editable source of the owner's product. Read `CONTRACT.md`, `BASELINE.md`, `seed.json`, `HANDOVER.md`, actual package
scripts and existing customisations before changing behaviour. Use `README.md`
where present; distinguish product requirements from implemented scope and
verification coverage.
Read `.seed/intent.md` where present and treat its recorded owner requirements as
binding until the owner changes them.

## About this product

The following describes the product requirements; consult its handover for implemented scope.

Mango is an approval-first marketing desk for one ecommerce store. It reads first-party store and audience signals, proposes evidence-backed email and SMS campaigns, shows who is eligible and excluded, and sends only the exact saved revision an operator approves.

Email and SMS consent are independent. Every later campaign step rechecks consent, suppressions, recent purchases, and other configured exclusions before delivery. Forecasts stay visibly separate from observed provider and store outcomes.

## Run the product

Follow this edition's README and actual package scripts for installation, local
startup, verification, provisioning and deployment. Check required accounts,
credentials, bindings and migrations before running a command. Use the configured
health endpoint and real application journeys to establish what works.

Do not infer provisioning from a command named `setup`, deployment from a push,
or previews from a pull request. Those behaviours require actual scripts or
workflows. Missing configuration must remain visible. Never invent working
providers, sample data, mock services or fallback application behaviour.

## Make it fit

The owner may edit all source, including base code, family domain, modules,
schema, application UI, framework, infrastructure, configuration and tests for
new owner requirements. This is a
complete repository; authoring repositories are not runtime services it needs.
Choose the coherent change that minimises total work, cost, elapsed time and
owner attention, including future verification and updates.

Use existing configuration or extension APIs where they help. Core changes are
fully legitimate. Adding or removing capabilities requires handling their data,
dependencies and integrated journeys explicitly. Keep files small, remove dead
code, and preserve server-side authorisation and secret boundaries. Access data
through the product's repository layer and validate inputs at trust boundaries.
Declare new externals and isolate their integration. Preserve applied migration
history while changing core schema through tested forward migrations and recovery.

Record intentional departures in the edition’s existing requirements, divergence
or intent documents (`.seed/intent.md` is optional), with tests for the required behavior. Do not silently weaken a guarantee
or edit its upstream test to hide a regression. Use the edition's implemented
contract override mechanism with appropriate replacement verification. Record
owner-authorized changes to requirements, including any changed security
guarantees; existing authorization is sufficient. If tooling is missing, record the gap and
verify the intended behaviour directly without pretending an override passed.

Preserve owner-local paths such as `src/ext/`, `.seed/`, `migrations/ext/` and
`tests/local/` during updates, alongside customisations elsewhere. These are
conventions, not a general automatic-update guarantee or a limit on source edits.

## Verify and update

Run the edition's documented verification and exercise the affected journeys on
the real local app or a preview. Report uncovered or failing guarantees plainly.
A clean build or passing upstream tests alone does not prove owner intent survived.
No production mocks, hidden failures or semantic fallbacks.

Read the release changes, provenance and recorded intent before updating. Prepare
a candidate away from the live installation. Use update tooling only when the
edition supplies it; choose merge, rebase, reapplication or rewriting as appropriate.
Never regenerate over the owner's fork or discard conflicting work wholesale.
Verify applicable product guarantees, declared overrides and local intent tests
before adoption. Record what changed, what passed and any remaining limitation.

The owner may keep and change the MIT source independently of management services.
Use documented, verified export and restore procedures for data portability;
do not promise a command or recovery capability that has not been implemented.

Roll useful edition mechanisms and regression tests into maintained shared source
when they save work elsewhere. Verify adoption against each edition’s requirements;
a deep local variant can still adopt or adapt later upstream improvements.

The public source is https://github.com/just-every/run-mango (version 0.2.0).
