## Run it locally

First install **Node 22 or later**: rer runs on it, and the installer stops with `node is required` without it. Get it from [nodejs.org](https://nodejs.org/en/download) (or `brew install node` on a Mac, or a version manager such as nvm). Then install `rer` once per computer with `npm install -g @runeditrun/rer` (or `curl -fsSL https://runeditrun.com/install.sh | sh`). In this checkout it selects pinned rer **0.2.20**, which acquires and uses Node **22.20.0** and pnpm **10.12.4** for this project and installs the locked dependencies; you do not install pnpm yourself. Run from the project root and supply your own owner email. `rer dev` alone also works in a fresh clone: it installs, sets up a local owner and picks a free port for you.

```sh
rer install
rer setup --owner-email owner@example.test
rer dev
```

Wait for `RER_READY`. `rer dev` opens signed in: it prints `RER_SIGNED_IN` (the owner) and `RER_OPEN`, a link that carries this checkout's private dev key in its fragment. Open `RER_OPEN` in a browser on this computer and you land signed in as the owner; a small dev badge switches to the `teammate` persona (a second operator beside the owner; Mango operators hold equal authority) or signs out. Never share the link: the key is what keeps the outbox and dev sign-in closed to anything that reaches this port through a proxy or tunnel, and `reset` removes the key so every earlier browser session stops working. `--as teammate` (or `--as signed-out`) starts as another persona. `RER_OPEN` is for people at this terminal; scripts use `rer dev --json` or the key header. The sign-in opens `/setup`, where you save your business sender identity before entering `/app`. A configured installation goes straight to the app; sender details remain editable in Settings. Setup exits with no server running. `rer dev` leaves the server running in the background; use the free port in its printed `RER_OPEN` link and stop it with `rer dev --stop` before verification or data operations.

Node may print `ExperimentalWarning: SQLite is an experimental feature and might change at any time` when rer loads Node’s built-in SQLite API for local tooling. This warning alone is not a command failure; check the command result and, for dev, wait for `RER_READY`.

```sh
rer verify
rer reset --yes
rer export --output exports/mango.jsonl
rer import --input exports/mango.jsonl --yes
rer deploy --environment production --dry-run
rer describe
```

Reset deletes local data and credentials. Export before resetting if you need that data; import requires an empty destination and the matching private settings backup. The commands above are separate operations, not a reset-and-backup sequence. Real deployment uses `rer deploy --environment production` with authorized owner-account credentials. Set `storeTimezone`, `organizationName` and `landingSummary` in `src/ext/config.ts`, then commit that file locally before deploying (`git add src/ext/config.ts` and `git commit -m "Configure Mango installation"`). No push is needed; deploy requires tracked changes to be committed. Pinned rer 0.2.20 automatically claims the first owner and removes the one-time setup token. For an existing installation, preserve private inputs, backups and customizations, then use `git pull --ff-only` and `rer deploy --environment production` with the same environment and loaded private inputs. rer installs locked dependencies and retains the owner; no separate claim is needed. See [OPERATIONS.md](OPERATIONS.md) for recovery and configuration; `describe --json` lists the actual flags, and `check --profile first-party` checks the command contract.

# Building Mango

Mango is an approval-first newsletter desk and an editable, self-hostable seed. Read CONTRACT.md, BASELINE.md, seed.json, HANDOVER.md and recorded owner intent before changing behavior. AGENTS.consumer.md provides the distributed owner guide.

## Working rules

- Implement the whole authorized outcome and prove the affected real journeys. Diagnose instructions, context, schema, normalization, models and tooling before declaring capability limits.
- No production mocks or semantic fallbacks. Missing configuration fails visibly; test doubles stay at test network/provider boundaries.
- Remove dead paths; keep small files with clear responsibilities. Parallelize independent work when the task permits it; migrations and ordered writes are sequential.
- Owners may change any source, schema, core, UI, framework or infrastructure. Preserve customizations and applied migrations; never regenerate over owner work. Core/extension directories are conventions, not ownership boundaries.
- Choose coherent integration by merge, reapplication or rewrite, then verify recorded owner requirements. Deep divergence may still adopt shared improvements.
- Keep secrets and server dependencies out of browser bundles and tracked source. No telemetry, phone-home or kill switch.

## Maintained architecture

One TypeScript Cloudflare Worker serves Hono HTTP APIs, public documents and the operator app. A second Worker needs a concrete isolation, security or scaling reason. React with TanStack Start owns document SSR and server functions; TanStack Router supplies routing. Tailwind/shadcn and Drizzle/D1 are the maintained starting stack, adaptable while preserving requirements.

The Worker answers `/` with Base's Lobby (Finish setup, then Sign in) and `/setup/state`; the approved landing is the run site's homepage (`rer build --site`). Start owns `/signin`, `/docs`, `/app` and child React documents; `/app` requires a native session. Preserve request-time public HTML, native session checks inside every private server function, client navigation after hydration and genuine public 404s. Hono retains authoritative API/auth/public responses; Worker Queue/Cron/email and named event exports remain intact. Sessionless routes are declared in seed.json. See RENDERING.md.

D1 owns data, R2 files, Queues jobs, Cron schedules, Workflows retriable orchestration, Durable Objects coordination and KV cache where appropriate. Handlers are stateless; in-memory state is only cache. Prefer web-standard APIs. Platform adapters isolate externals; declare capability, cost, privacy and secret boundaries truthfully.

Inspect actual source and scripts before editing. Keep persistence, policy and routes inspectable; validate at trust boundaries and authorize on the server. Events are facts; jobs are commands. Operations express domain intent. Entities use ULIDs and timestamps; custom fields follow seed.json. Sidecar tables and core columns are both available. Destructive schema work uses expand, migrate, contract and recovery; preserve applied SQL. Queue consumers and webhooks are idempotent and failed jobs remain visible.

## Requirements and verification

Stable clause IDs are never reused; BASE- is reserved for baseline clauses. Deliberate requirement changes name affected IDs, replacement behavior and security consequences, with meaningful verification. Distinguish satisfied, intentionally changed, broken and uncovered requirements. Use the edition's actual manifest/release/contract schemas and implemented helpers; do not assume override or supersession tooling exists.

New Markdown at the repository root, under `docs/` or as a top-level `<directory>/README.md` must be listed in `docs/site.json`, published as a `/docs` page or marked not published with a reason; `rer build` validates the published documentation and its links (DOCS-001).

Keep tests small and observable through routes, commands, transports or built pages. Outside auth, privacy, isolation, secrets, deployment and data-loss flows, use one test per requirement. Replace or delete unwanted behavior tests and report it. Prove one-off fixes in evidence. Never pin hashes, version strings, file/env lists, UI copy or threshold values. Run affected tests and typecheck locally; CI is the full wall.

Verify migrations with prior data and test export/restoration before claiming them. A clean clone, passing Base checks or local runtime does not prove the complete product contract, hosted deployment or provider acceptance. Record gaps and local versus hosted evidence explicitly. Provisioning must preserve existing resources and verify idempotent find/create behavior before being claimed.

Shared source and extension contracts are optional mechanisms, with no quotas or mandatory runtime plugin framework. Owners can change internal APIs and integration together. Version supported public extension contracts and document breaking changes. Promote useful shared mechanisms with meaningful adoption and variation checks. State lint guarantees only when actual lint enforces them.

## Release and updates

Preserve source ownership, customizations, privacy, migration history and recorded owner decisions. RELEASE.json records clause/extension/schema changes and agent update instructions using its real schema. Verify the complete candidate and emitted owner guide, including intentional divergence. Screenshots exclude personal data and third-party artwork. Publishing, tagging and deployment need session authority; work explicitly parked by its owner remains parked. Do not assume a push deploys, a PR creates a preview or a package proves live operation.
