# Mango demo

Run `rer setup --owner-email owner@example.test` once, then `rer demo`. Open
`RER_OPEN` to enter a fresh Mango, signed in with sample contacts, editable
newsletter drafts, saved segments, a signup form and labelled sent sample
history. `src/demo.ts` reuses `sample-data/initial.json`. History is invented
example data. The nav and title say **Mango Demo**; local dev says **Mango Dev**.
There is no bar or outbox. Sign-in is one click and mail is silently suppressed.

`rer demo --stop` or Ctrl-C deletes `.rer/demo/` state. A second run is fresh;
ordinary `.wrangler/state` and private settings are retained. Base's `withDemo`
is the first Worker import; Vite passes demo vars, uses `RER_STATE_DIR`, and
places `demoSockets()` first. Upstream module origins are in `edition.json`.

Public internet reads run for real. Newsletter links point at the demo's own public pages; signup
Turnstile verification declares its POST as a public read using `fetchDemoRead`.
Email, SMS and third-party account operations complete with demo-only provider
success responses. Base mocks email HTTP; Mango uses `demoEffect` for SMS and
provider-specific verification, Shopify, AI and design results. Design results
reuse a local sample newsletter. No provider credentials are read, payloads
captured, or messages sent. Production uses the real providers and checks.

Hosted visitors (rer 0.2.37's native Worker host) each get their own Worker
Loader isolate: `DB` is a SQLite facet in the visitor's Durable Object,
`ASSETS_BUCKET` objects live in that visitor's own storage, `MANGO_JOBS`
batches are durable queue records delivered by alarm with ack and retry, and
the every-minute cron runs by alarm. Static files are served at the edge.
Turnstile, a random demo cookie, per-IP limits and capacity limits admit a
visitor; signup forms also require that cookie. A copy ends after 60 minutes or
15 idle minutes, or on sign-out, and its storage is erased. Campaign sends,
test sends and webhooks stay mocked by the demo guard.

The `Run demo` workflow is Base's `export/run-demo.yml` (recorded in
`base-copies.json`) and reads the `run-demo` environment: the variable
`CLOUDFLARE_ACCOUNT_ID` and the secrets `CLOUDFLARE_API_TOKEN`,
`TURNSTILE_SECRET_KEY` and `RER_DEMO_MEASUREMENT_TOKEN`, with the variable
`TURNSTILE_SITE_KEY`. `test_only` deploys `demo.test.run-mango.com` with
Cloudflare's published Turnstile test keys, and its starts need the private
measurement token (`rer_demo_measure` cookie). Production uses the real widget
keys. `test_only` plus `remove` removes the test host and reads back its
absence. Never automate real Turnstile. `rer deploy --demo` builds the
ordinary production Worker (it generates `wrangler.production.toml` from
`deploy/wrangler.template.toml`) and `--dry-run` writes `.rer/demo-host/`
without provider requests. Local `rer demo` keeps the owner's normal local
configuration.
