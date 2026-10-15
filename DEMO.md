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

Public internet reads run for real. Newsletter links use example.com; signup
Turnstile verification declares its POST as a public read using `fetchDemoRead`.
Email, SMS and third-party account operations complete with demo-only provider
success responses. Base mocks email HTTP; Mango uses `demoEffect` for SMS and
provider-specific verification, Shopify, AI and design results. Design results
reuse a local sample newsletter. No provider credentials are read, payloads
captured, or messages sent. Production uses the real providers and checks.

Hosted visitors receive separate workerd containers with public internet
access, a direct-mail transport denylist, a random demo cookie, Turnstile,
per-IP limits and capacity limits. Signup forms also require that cookie.
The intended lifetime is 60 minutes, or 15 idle minutes.

The manual `Run demo` workflow reads the `run-demo` environment. `test_only`
uses a separate host and Cloudflare's published Turnstile test keys. Production
uses the real widget keys. `test_only` plus `remove` removes the test host and
reads back its absence. No repository deployment variable is required. Never
automate real Turnstile. The workflow generates production configuration and
copies it to `wrangler.toml` in its disposable checkout before packaging; the
container boundary reader needs that root entry. Local `rer demo` retains the
owner's normal local configuration.
