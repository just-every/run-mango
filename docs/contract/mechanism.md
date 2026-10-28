# Mango mechanism and evidence records

This document holds implementation details and original evidence descriptions relocated from the contract. It does not add acceptance proof.

## HOME-001

The installed Lobby and setup-state routes use Base’s shared Lobby. Original routing and identity details: An installed Mango answers its sessionless root (`/`) with Base's shared Lobby (`src/base/lobby.ts`, edition identity in `src/identity.ts`): Mango's mark and name, one line about this newsletter, and one action, “Finish setup” (`/setup`) until the owner has saved the sender identity at first-run setup and “Sign in” (`/signin`) after; `GET /setup/state` answers exactly `{"state":"unclaimed"}` or `{"state":"claimed"}` from the same reading (owner decision, 12 October 2026).

## HOME-002

 is the run site's homepage (`run-mango.com`, built by `rer build --site` from `src/site/pages.tsx`), where the primary action reads “Run Mango” and opens the Run page (`/run`) and no link reaches sign-in; everything else about it is unchanged. The landing is a static page for Mango's default newsletter profile, drawn in one hand-illustrated style. Its header carries Mango's mark and name with links to How it works, Docs (`/docs`) and, on an installed Mango's docs pages, the page's only link named “Sign in” (`/signin`). Its hero headline is the page's only top-level heading; directly under the lead, one line reads “100% free, open source alternative to Mailchimp and Klaviyo” with the two product names in bold and the wording unchanged (the same sentence, as plain text, ends the page's meta description, and `seed.json` `replaces` names both products), naming what Mango replaces without comparing against it; the hero offers “Start your newsletter” (`/docs/install`) and “Read the docs” (`/docs`). Sections then cover how a letter leaves Mango (collect, write, approve, schedule, deliver), consent, approval of the exact letter, scheduling, delivery reports and ownership, followed by a closing call to action; the footer repeats the section links, Docs and (on an installed Mango) operator sign-in and shows the configured deployment owner's name and one-line description. It may show the static credit `Powered by Mango · runeditrun.com` only when the owner enables it in configuration. It describes only capabilities the newsletter profile ships and contains no vendor pricing, testimonials, customer logos, ratings, metrics, cross-store claims, third-party brand logos or telemetry; sample addresses, names, counts and dates inside its drawings are pictures, never records. It reads no operator, contact or campaign record and no session, sets no cookies, is written once by the site build, serves every font, style, icon and image from the site's own origin (its drawings are inline), keeps its own fixed light palette in a dark-themed browser, and stays fully readable without scripts and with reduced motion.

## DOCS-001

The public paths `/docs` and `/docs/<slug>` serve Mango's first-party operator documentation: the Markdown files that `docs/site.json` lists as published, in the sections and order it gives, which is the only navigation, with the first page as the docs home at `/docs` (and `/docs/`). The Markdown is rendered to HTML at build time: a Vite plugin renders each page to static HTML when Vite loads it, in a build and in development, and never in the Worker or the browser. The emitted Worker and client bundles contain no Markdown or syntax-highlighting code, and each page is its own lazily loaded chunk that the Worker renders per request. A page has its title as its one top-level heading, a section sidebar listing the pages in manifest order with the current one marked, an on-this-page list of its sections, previous and next links, and a "Contents" disclosure for narrow screens, inside the public landing's shared header (with Docs marked as the current section) and footer, in the landing's palette, faces and paper drawings. Every Markdown file at the repository root, under `docs/` and as a top-level `<directory>/README.md` is either published or listed in the manifest as not published with a reason, and an unlisted file, a broken link or anchor, a link to a page the site does not publish, raw HTML, an image outside `docs/media/` or an absolute build-machine path fails verification or the build. The pages link to no source repository and offer no edit link. Published pages describe the default newsletter profile and contain no maintainer-only material. The documentation reads no workspace record, session or database row, sets no cookie, runs no analytics or tracking and loads only same-origin resources. An unknown, miscased or nested slug, and `/docs/index`, answer `404` with a short not-found page in the same shared header and footer that links back to `/docs` and `/`; a request for another host is answered as it is for every other path.

## OPER-001

Setup completes through the existing sender-settings authority; valid existing environment identity also counts. This is a navigation gate, not a provider-readiness claim.

## OPER-002

*Policy: `operator.management.v1`; default: any operator may invite with fresh email proof or remove.* Confirmation GET and HEAD remain read-only; affirmative POST supplies the proof.

## OPER-004

An owner assigns each operator one role: *Owner* (everything, including billing-bearing provider connections, operator management and installation erasure), *Admin* (everything except removing the owner and connecting, replacing or disconnecting a billing-bearing provider connection: the sending provider under DELIV-008 and Twilio under SMS-008), *Manager* (approve campaigns, activate and pause flows, manage segments, forms and integrations), *Author* (create and edit drafts, templates, forms and draft flows; request approval; never approve, activate or send), *Analyst* (read reports, campaigns and flows; contact details shown with email and phone masked unless granted) and *Support* (look up a contact, view their history, record an opt-out or erasure request; never subscribe anyone). These six product roles are separate from Base's unchanged owner/admin/member authentication roles. The last product Owner is always protected from removal or demotion. On restore, product authority belongs to the destination installation; source role assignments confer no authority there. CSV export remains Owner/Admin only. Every server function and API route enforces the role; a hidden button is never the control. Role changes take effect on the next request and are audited.

## OPER-005

*Policy: `approval.separation.v1`; default: off.* Existing refusal code: `separation-required`.

## OPER-006

Named providers remain Okta, Microsoft Entra ID, Google Workspace, JumpCloud and sibling Auth; standards are SAML 2.0, OpenID Connect and SCIM 2.0. Pending invitations and sessions revoke within 60 seconds. Real named-vendor tenant receipts belong in the Field proof register, not the standards-fixture acceptance.

## OPER-007

Operators with Owner or Admin role can view, filter (by operator, agent, action, object and date) and export as CSV every operator and agent action: drafts saved, approvals, activations, pauses, imports, exports, erasures, integration changes, role changes, consent edits, signup allowance and kiosk-form changes (FORM-008, FORM-009) and hourly signup refusal summaries (FORM-010). Entries are append-only and survive operator removal with attribution intact; erased contacts appear anonymized (CONT-013).

## STORE-001

Commerce connections use the `commerce.store.v1` extension. INT-001 through INT-007 own individual source doors; INT-015 owns the Shopify merchant installation.

## STORE-004

Failed webhook and generation operations share the failed-sync operation record (`source_sync_runs`, operation `webhook` or `generation`); a webhook keeps its existing HTTP answer so the provider retries it.

## STORE-005

A source type is stale when its last successful sync completed more than 24 hours ago or a sync has failed since it.

## STORE-007

The ingestion-latency bar is 60 seconds from acknowledgment to readable source record.

## CONT-001

Phone numbers are stored in E.164 form.

## CONT-002

Channel states: pending = consent captured and confirmation outstanding; subscribed = eligible consent; non-subscribed = no consent evidence; unsubscribed = opted out; suppressed = blocked by CONT-006 or CONT-013.

## CONT-006

*Policy: `contact.soft-bounce.v1`; default: suppress after three consecutive soft bounces.*

 local authority clarification (CONT-004/006, OPER-001):** Refreshing local session/setup credentials while retaining D1 preserves the effective contact hash authority, including suppression and surviving opt-out records without contact rows. New local installations record a versioned independent contact salt in `.dev.vars`; missing, empty, unknown-version or unversioned authority fails closed. Explicit conversion of a verified legacy session-key installation retains its original effective session authority before rotating authentication credentials. An upgrade must never select a previously unused secret merely because it exists.

## CONT-007

STOP, STOPALL, END, QUIT, CANCEL, UNSUBSCRIBE, OPTOUT and REVOKE are the opt-out family; HELP and INFO request help; START and UNSTOP begin fresh consent. Mobile Message has existing proof; Twilio remains owed by SMS-001.

## CONT-009

Confirmation links expire 30 days after issue. *Policy: `contact.opt-in.v1`; default: confirmation is required on both channels for Mango’s own forms, popups, landing pages and API captures; CONT-025 states each source’s default.* Public confirmation is POST-only.

## CONT-013

Local restrictions use one-way destination hashes keyed with the installation secret. All Base erasure timing, dependent-record deletion, completion and audit-anonymization guarantees remain inherited.

## CONT-029

`audience_portable_hashes` maps the local hash to unsalted SHA-256 of `mango-audience-export-v1:` followed by the destination. This encoding allows dictionary comparisons and stable matching across installations and exports; treat it as sensitive personal data.

## CONT-030

Restore uses source-wide epoch floors. Nonempty legacy row journals are refused before staging. Upgrade 0044 retires legacy journals and transfers after advancing every known source floor; offline copies without current authority cannot reveal later erasure.

## HOME-002

- **HOME-001 policy:** `BASE-PUBLIC-001` to `BASE-PUBLIC-003` govern the landing as an anonymous surface and are neither satisfied nor waived by it. The root and the favicon files claim no rate limiter, so `BASE-ACCESS-003`'s rate-limit sentence is neither claimed nor waived for them. The landing is the deployment's own fixed page, not a page builder for buyers. It links only to its own sections, `/run`, `/docs` and, while the credit is on, the credit, and it does not advertise optional commerce, SMS or AI, per-reader send times or provider-neutral delivery. Its fonts are self-hosted Newsreader and Outfit under the SIL Open Font License, static files from `public/fonts` served at `/fonts/` and declared in `deploy.publicPaths`, so the server-rendered message pages load the same faces; the favicons are static files from `public/`, also declared there. Its drawings are inline and contain no raster or embedded image. Its motion is CSS-only, plays once, runs only without a reduced-motion preference, moves only drawings and never hides content.

## DOCS-001

- **DOCS-001 policy:** `/docs` and `/docs/` are declared in `seed.json → deploy.publicPaths`, which `BASE-ACCESS-003` keeps as the only sessionless paths; `BASE-PUBLIC-001..003` govern these anonymous pages and are neither satisfied nor waived by them. Start renders each page per request from its prebuilt chunk; no Hono route, operator gate or Worker event handler serves them. The slug is looked up as an own property of the manifest's page table, so `__proto__`, `constructor` and every other unlisted segment is a `404`. Markdown is rendered with raw HTML disabled, a link-scheme allowlist and images restricted to `docs/media/`. No rate limiter is claimed for these paths, as for Mango's other public documents (`/`, `/signin`).

## CONT-028

- **CONT-005/009 concurrency:** Public eligibility, contact/profile changes, consent evidence, capture IP, history and pending status commit in one guarded D1 transaction. A destination barred by current consent, suppression or identity guards at that transaction causes no new consent writes. Under the approved CONT-027 rule, a surviving erasure hash with an unsubscribe or erasure reason may recreate an unsubscribed profile holding only new request evidence and send its confirmation email within the shared UTC-day allowance; only the person's own affirmative POST can subscribe it, with no history restored. A surviving suppression hash permits neither consent nor confirmation mail. Confirmation message preparation completes before a database-authoritative handoff check, and the adapter is invoked immediately after that check. Suppression, an opt-out later than the request evidence or confirmation committed before the check prevents handoff. A provider handoff already authorized and concurrently in progress cannot be recalled by a later database transition.

## CONT-009

- **CONT-009 policy:** Opening a confirmation link by GET or HEAD only previews an affirmative POST form. It never writes consent, consumes a token or changes status: mailbox scanners and link prefetchers cannot provide consent. Only a POST with explicit `confirm=true` may confirm. The original 30-day expiry, single-use token, active identity, later opt-out and suppression guards remain mandatory.

## CONT-005

- **CONT-005 public capture policy, as amended by CONT-027 (owner decision, 19 Oct 2026):** Public signup returns the same generic acknowledgment whether or not an address is suppressed. An already subscribed address receives no mail or new consent and is never downgraded. A previously unsubscribed person, including an address with a surviving unsubscribe or erasure hash, may supply new logged post-opt-out request evidence and receive a confirmation email sent to that address, at most three confirmations per destination address per UTC calendar day across public signup surfaces. Only that person's own affirmative POST from the confirmation email resubscribes them; submission, GET and HEAD do not. An exhausted allowance returns the same generic acknowledgment and sends no further confirmation. Nothing bypasses suppression: bounces, complaints, provider or operator suppressions and legal holds remain suppressed, including their surviving hashes, and receive no confirmation mail. Other explicit logged post-opt-out evidence through the ledger remains subject to confirmation and suppression resolution. The CONT-027 Status row records implementation of this approved rule.

## CONT-009

- **CONT-026 / CONT-009:** the former confirmation policy admitted only a URL POST with explicit `confirm=true`. For operator-recorded SMS permission, the confirmation text now asks for YES; only the authenticated Mobile Message callback POST carrying that exact reply and the original confirmation's provider identity confirms the number. A URL cannot confirm that operator-recorded SMS evidence. Email and hosted-SMS URL confirmation retain their explicit POST rule. This target amendment's conflict with CONT-009's retained link wording is named in its Gap pending ct's text ruling; no clause sentence is narrowed.
