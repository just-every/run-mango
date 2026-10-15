# Mango demo

Run `rer setup --owner-email owner@example.test` once, then `rer demo`. Open its
private `RER_OPEN` link. You are signed in to a fresh database with sample
contacts, editable newsletter drafts, saved segments, a configured signup form
and a completed newsletter explicitly labelled sample history. The records come
from `sample-data/initial.json` through `src/demo.ts`; sample history is invented
example data, not a claim of actual delivery.

`rer demo --stop` or Ctrl-C deletes the demo state under `.rer/demo/`. Restarting
starts afresh. Ordinary `.wrangler/state` and private settings are retained.
The slim Demo strip shows captured mail and refused outbound requests.

Both Worker entries import Base's `withDemo` before application code. The copied
module's exact upstream origin is recorded in `edition.json`; its HTTP helper import points to Mango’s operator-auth copy, and the unchanged
CSP helper is retained alongside it. Vite passes demo mode and the isolated
state directory through and installs Base's socket guard.

Demo configuration never reads provider credentials. All campaign email paths,
including test sends, subscription confirmation and notices, use the development
outbox. A capture ends with `demo_mail_captured`, a known refusal, rather than a
claim that a provider accepted or delivered it. Sender verification and campaign
approval remain blocked. Authentication mail also uses the outbox. SMS, Shopify,
OpenAI and the design provider are unconfigured. Global network guards refuse
external requests even if an adapter attempts one. Public signup verification
uses Turnstile test credentials inside the app and its server request is refused;
the hosted front uses separate real Turnstile credentials to admit visitors.

The hosted demo runs a private workerd container per visitor with internet
access disabled and a denying egress Worker. Every app path, including signup
forms, needs that visitor's demo cookie. The host expires a visit after 60
minutes or 15 idle minutes. rer 0.2.15 has a known platform limitation that can
stop idle containers after about three minutes; active visits and starts are
unaffected by that documented limitation.

The manually dispatched `Run demo` workflow reads the `run-demo` environment.
`test_only` deploys a separate host with Cloudflare's published test widget keys;
production uses the environment's real widget keys. `test_only` plus `remove`
removes that test deployment and reads back its absence. No deployment variable
is needed. Never automate the production Turnstile challenge.

For a manual hosted build, run `pnpm config:production` before
`rer deploy --demo` (or its `--dry-run`). The workflow does this preparation
automatically; it creates Mango’s separate production bundler configuration.
