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

## CONT-014

Original evidence: `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts`

## CONT-015

Original evidence: `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` · `src/core/features/lifecycle/email-consent-scope.ts`

## CONT-017

Original evidence: `tests/audience-controls/contact-history.spec.ts` — “[CONT-008] [CONT-017] a contact profile combines identities, properties, segments and original source, consent, suppression, eligibility, delivery and operator facts with masked role views”: identities and merges, per-channel consent/topic evidence, properties and rule-derived segment membership; form, order, conversion, click, SMS-reply and consent facts in original time/source order; Analyst and Support masking, axe, overflow and hydration at 1440/390.

## CONT-018

Original evidence: `tests/shopify/connection.spec.ts`

## CONT-019

Original evidence: `src/core/features/sms/signup.ts` · `tests/audience-import/signup.spec.ts`

## CONT-021

Original evidence: `src/core/features/audience/erasure` · `tests/audience-import/erasure.spec.ts`

## CONT-022

Original evidence: `src/core/features/audience/ui/contact-merge.tsx`

## CONT-024

Original evidence: `tests/move-in/archive.journeys.ts` account-export registration via `tests/move-in/incumbent-journey.ts` (Verify move-in): attestation, restrictive states, native export/restore, revocation and retained audit fact; campaign review records eligible contacts relying on that evidence at 1440/390. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) proves populated native restoration.  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) extends the source attestation to the three CSV source presets and both API edge exports.

## CONT-025

Original evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/opt-in-journey.ts` — hosted default and single capture, accepted-only capacity, protected resubscription, Admin/Author/Manager/Support permissions, future-only mode changes, activity and Settings at 1440/390; `tests/go-live/sync-integrations.journeys.ts` — API capture fixed double mode, one confirmation and replay; `tests/portability.spec.ts` — native policy restore.

## CONT-026

Original evidence: `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/manual-entry-journey.ts` — Author hand entry, permission method/time/wording and properties, default confirmation, operator-recorded single mode, exact-message signed SMS YES replies, restriction reasons, Support/Analyst 403 and 1440/390 form/evidence/absent controls; `tests/portability.spec.ts` — operator evidence restore; the same hand-entry journey proves evidence, profile and SMS-sidecar erasure

## CONT-027

Original evidence: `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts`

## FORM-001

Original evidence: `src/core/features/audience/signup-routes.ts` · `tests/audience-import/signup.spec.ts`

## FORM-007

Original evidence: `src/core/features/audience/signup-security.ts` · `tests/audience-import/signup.spec.ts`

## FORM-008

Original evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-capacity-journey.ts` — 600 hosted captures on 200 networks, 100-request minute bursts, 200 bot attempts, duplicate claim, shared network, unchallenged isolation, Owner/Admin settings and 1440/390; `tests/audience-import/signup-security.spec.ts`; `tests/audience-import/signup-reservation-clock.spec.ts` — actual D1 admission interval across minute rollover — global last slot, IP grouping and token replay/expiry; `tests/audience-import/signup-reservation-clock.spec.ts` — database admission clock; `tests/portability.spec.ts` — populated upgrade and capacity restore.

## FORM-009

Original evidence: `tests/go-live/shared-kiosk.journeys.ts` · `src/core/features/audience/signup-routes.ts` · `src/core/features/audience/ui/kiosk-signup-page.tsx` · `migrations/core/0075_kiosk_forms.sql`

## FORM-010

Original evidence: `tests/go-live/shared-kiosk.journeys.ts` — shared kiosk / refusal screens at 1440 and 390; `tests/go-live/signup-refusal-screens.ts`; `tests/audience-import/signup-security.spec.ts` — “security: durable global allowance advances monotonically, reserves its last slot atomically and survives restart”; `tests/audience-import/signup-reservation-clock.spec.ts` — D1 clock; `tests/go-live/resubscribe.journeys.ts` — fourth destination request; `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/activity-log.ts` — hourly summary.

## SEG-001

Original evidence: `tests/audience-controls/segments.spec.ts` — “AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable”, via `tests/audience-controls/segment-journey.ts`: nested all/any builder, every summary condition, live estimate, exact per-contact review and approved membership at count/value/time/state boundaries; properties, tags, consent/topics, ZIP/distance, RFM and bought products through review; builder and review at 1440/390 with overflow and accessibility assertions. Collections and categories bought: `tests/audience-controls/segment-catalog.ts` (same case) syncs a Shopify catalog through the sync door (collection IDs drained across pages, taxonomy categories, uncategorized products recorded as null); before the catalog is recorded both conditions report unavailable with no count; the builder at 1440/390 nests US state with an any-group of bought collection and bought category, its plain-text summary names both and its live estimate equals review; review intersects each condition with every contact (bought from the collection on its second page, only from another collection, in the category, only in other categories, in the category only in a future order, no purchase), and after Shopify removes a product from the collection its earlier buyer leaves on recount; review at 1440/390 with overflow and accessibility assertions. `tests/audience-controls/segment-fixture.ts` supplies contacts through scoped integration and products and purchases through Shopify sync; no direct rows. `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/cross-channel-attribution.ts`) selects a contact by a human email or SMS click in the last 7 days through the campaign-authoring audience door and no longer once those clicks are older.

## SEG-003

Original evidence: `tests/campaign-results/results.journeys.ts`, `tests/campaign-results/retention-journey.ts`

## FLOW-001

Original evidence: `tests/go-live/roles.journeys.ts` via `tests/campaign-authoring/flow-journey.ts` (Verify go-live 6/9): three-message welcome graph with split, unreachable-node validation and repair, keyboard pan/zoom, saved revision reload and 1440/390 accessibility/overflow/hydration; all node-kind explanations, named loop/unended-path validation and delay-cycle acceptance; Author saves, Analyst reads, Support named 403. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) exports/restores the draft revision with prior data.

## CONT-018

Onsite storage names: the first-party cookie is `mgo_s`; the tracked destination parameter is `mgo_c`. Shopify signed login identity is `logged_in_customer_id`. Shopify permission checks are `analyticsProcessingAllowed`, `marketingAllowed` and `saleOfDataAllowed`; WordPress uses WP Consent API `statistics`/`marketing`; the snippet consumes the banner consent call. The token uses a CSPRNG, base64url encoding and SHA-256-only persisted digest. The Shopify app proxy binds its signed `shop`; plugin and Stall bind their signed connection, and the snippet binds requesting Origin. A storefront-login/form identification replaces click identity. Active-on-site ends after 30 minutes idle. The outbound queue and Shopify observation-log retention are 30 days; identified Mango onsite event retention is 90 days. Tracking carrier requests never carry credentials to the Mango deployment.

## CONT-024

Incumbent fields preserved as supplied: Mailchimp `OPTIN_TIME`, `OPTIN_IP`, `CONFIRM_TIME`, `CONFIRM_IP`, `LAST_CHANGED`; Shopify `emailMarketingConsent`/`smsMarketingConsent`, `single_opt_in`, `confirmed_opt_in`, `unknown`, or legacy `accepts_marketing` and `accepts_marketing_updated_at`; Klaviyo consent, method and timestamp, and corresponding fields of other incumbents. Evidence time chooses confirmation, opt-in, last-change, then explicitly supplied export creation time with `time-unknown`. Source identifiers include audience/account IDs, archive SHA-256 or Shopify shop ID. Incumbent-held evidence is distinct from Mango-captured evidence. SMS requires the source collection point, consent time and CONT-019 disclosure; Shopify `consentCollectedFrom`, Klaviyo SMS method/time and Mailchimp SMS source/time are examples.

## FORM-007

Public signup protocol retains the 8192-byte body limit; invalid sender name/from/reply-to/physical address is rejected before any allowance or claim. Atomic durable counters use full IPv4, IPv4-mapped IPv6 equivalence and IPv6 /64 grouping including textual/interface forms; missing/invalid edge IP fails closed and counters persist across restart and clamp at ceiling. Turnstile requires both `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`; one-sided configuration rejects startup. Siteverify must return success for action `newsletter-signup` and configured public hostname. A token is at most 2048 characters; verification is bounded to five seconds. Missing/malformed/rejected/unavailable verification fails closed before storage. Tokens are single-use with five-minute lifetime.

## CONT-014

Original acceptance evidence: Scoped integration coverage: `tests/go-live/sync-integrations.journeys.ts`. Current scope and remaining work: The scoped API persists contact fields with contact identity and consent source. Typed property definitions, UI editing, date/money semantics, segments and personalization remain unimplemented.

## CONT-015

Original acceptance evidence: Evidence: `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` · `src/core/features/lifecycle/email-consent-scope.ts` · `tests/campaign-authoring/import-category.spec.ts`. Current scope and remaining work: Scoped subscriber sync stores deduplicated tags without granting consent, and maintains saved integration lists. Topic preference-center acceptance and general tag-driven segmentation remain unmet.

## CONT-017

Original acceptance evidence: `tests/audience-controls/contact-history.spec.ts` — “[CONT-008] [CONT-017] a contact profile combines identities, properties, segments and original source, consent, suppression, eligibility, delivery and operator facts with masked role views” proves email/phone and merged identities, channel/topic consent evidence, persisted properties/tags and saved-rule segment membership, and a source-ordered timeline with form capture, orders, conversions, clicks, SMS replies, consent changes and operator actions. The native page and API exercise both masked roles (Analyst and Support), 1440/390, no horizontal overflow, serious axe finding or hydration error. Gap: ct’s 22 October 17:12Z ruling assigns flow enrollments/current node to FLOW-002 and predictions to SEG-004, but the clause text still carries both. Default ADOPTED: row stays PARTIAL pending ct’s text carve; both panels remain visible with honest unavailable statements. Topic evidence reads the current channel ledger; independent topic withdrawal awaits CONT-015/016.

## CONT-018

Original acceptance evidence: Evidence: `tests/shopify/connection.spec.ts`. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing. Gap: Default in force (owner direction 19 Oct 2026), written into the clause: site tracking off per site until an Owner or Admin turns it on (Manager may turn it off; OPER-007); consent only from the store's consent tool (Shopify Customer Privacy API, WP Consent API, Stall, the snippet's consent call), none or no decision = refused; GPC (`Sec-GPC: 1` or `navigator.globalPrivacyControl`), sale-or-share opt-outs and CONT-021 do-not-share always refuse; one cookie `mgo_s` (Secure, SameSite=Lax, Path=/, no Domain, at most 30 days, HttpOnly where server-set, at most 2,048 bytes; no other browser storage); nothing sent to or held by Mango for an unidentified visitor (up to 20 events wait in the cookie until identification); `mgo_c` is 32 random bytes, single-use, host-bound, digest-only, 7 days, never for automated clicks, GPC or tracking off; identified onsite events kept 90 days; erasure under CONT-013. ct approval of the landed default: pending. Built and exercised: Shopify signed pixel ingest and current privacy controls (`tests/shopify/connection.spec.ts`); the separately approved INT-002 plugin semantic stays DONE. Acceptance not yet met: the snippet and Stall surfaces; the shared site switch, click-token journey and exchange on every surface; consent buffering, cookie parity, anonymous-request refusal, 90-day retention, erasure, segment-window and cross-site browser assertions on each surface. The Shopify pixel and WooCommerce plugin have not run this expanded acceptance. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing. ct 23 October 04:38Z: INT-002 stays done on its approved semantic, not evidence for this expanded acceptance. Before other CONT-018 work, implement 90-day onsite retention, withdrawal deletion and explicit HTTPS enforcement.

## CONT-019

Original acceptance evidence: Evidence: `src/core/features/sms/signup.ts` · `tests/audience-import/signup.spec.ts`.

## CONT-021

Original acceptance evidence: Evidence: `src/core/features/audience/erasure` · `tests/audience-import/erasure.spec.ts`.

## CONT-022

Original acceptance evidence: Evidence: `src/core/features/audience/ui/contact-merge.tsx`.

## CONT-024

Original acceptance evidence: Evidence: `tests/move-in/archive.journeys.ts` account-export registration via `tests/move-in/incumbent-journey.ts` (Verify move-in): attestation, restrictive states, native export/restore, revocation and retained audit fact; campaign review records eligible contacts relying on that evidence at 1440/390. Current sandbox-safe account-export journey passed locally in 4.1 minutes. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) proves populated native restoration. An attestation with one statement answered "not sure" subscribes no row of that move-in. A `postmaster@` row and a row whose country is outside the attested jurisdiction import non-subscribed with their named reasons. The DATA-001 export carries the attestation record with its operator, time, wording hash and answers, and each incumbent-held contact names that record. Erasing one such contact leaves the attestation record in place. Gap: Mailchimp archive source attestation and incumbent-held email evidence are exercised through the public preview, apply, campaign-review, native export/restore, revocation and erasure doors at 1440/390. Store connections (INT-001 to INT-006), five-year expiry and positive SMS evidence (A2P hold) remain unproved. A source without a row time requires an explicitly supplied export creation time. No real provider call or consent was used.

## CONT-025

Original acceptance evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/opt-in-journey.ts` proves default double and single hosted captures with full evidence, no single-mode confirmation or destination reservation, one accepted capacity charge, confirmed-only public resubscription, future-only Owner/Admin mode changes with activity, denied Author/Manager/Support changes and Settings at 1440/390. `tests/go-live/sync-integrations.journeys.ts` proves the API capture path uses fixed double mode and one replay-safe confirmation. `tests/portability.spec.ts` covers policy restore. Default ADOPTED: Owner/Admin authority governs manual entry too. Store/move-in mode enforcement and the Shopify acceptance sentences, popup/landing sources, Zapier/Crank, SMS mode editing and ct approval remain open. No real provider call or consent was used.

## CONT-026

Original acceptance evidence: `tests/go-live/sync-integrations.journeys.ts` through `manual-entry-journey.ts` exercises Author entry, default email confirmation, operator-recorded single opt-in with named operator, properties, per-channel consent records, SMS pending until an exact-message authenticated YES reply, replay safety, protected destination refusal, Support/Analyst 403 and form/evidence screens at 1440/390. `tests/portability.spec.ts` covers the operator evidence round-trip; the hand-entry journey covers evidence, profile and SMS-sidecar removal. Gap: topic-specific permission, legacy email API attestation enforcement, the signed-out 403 wording (Base retains 401) and ct approval of Owner/Admin manual-mode authority. Named CONT-009 amendment: a signed provider reply POST confirms hand-entered SMS; no URL can confirm it. No real provider call or consent was used.

## FORM-001

Original acceptance evidence: `tests/audience-import/signup.spec.ts` (public signup stays pending until the single-use confirmation; embed origins enforced). Evidence: `src/core/features/audience/signup-routes.ts` · `tests/audience-import/signup.spec.ts`.

## FORM-007

Original acceptance evidence: `tests/audience-import/signup.spec.ts` security cases (allowances, Turnstile fail-closed, status-free acknowledgment). Evidence: `src/core/features/audience/signup-security.ts` · `tests/audience-import/signup.spec.ts`.

## FORM-008

Original acceptance evidence: Evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-capacity-journey.ts` exercises 600 captures across 200 networks, full 100-request minute bursts, 200 bot attempts without accepted charge, one reservation for concurrent duplicates, 30/120 on the same network, separate unchallenged flood and challenged capacity, Owner-only next-window changes, floor/ceiling refusals, challenge permissions and Settings at 1440/390. `tests/audience-import/signup-security.spec.ts` and `tests/audience-import/signup-reservation-clock.spec.ts` preserve restart, address grouping, database clock, one-use/expired challenge and last-slot concurrency. `tests/portability.spec.ts` preserves populated settings through upgrade and restores capacity revisions without resuming sends; the existing erased-optout case removes linked refused-network state. Gap/default ADOPTED: hosted form substitutes for the absent popup carrier; FORM-002 to FORM-004, FORM-005's report wording, CONT-025 single opt-in and ct approval of the landed capacity default remain pending. No real provider call or consent was used. The existing `tests/audience-import/signup-reservation-clock.spec.ts` measures the actual D1 admission interval for the new minute partition; destination-dependent daily refusals retain their status-free 202 acknowledgement.

## FORM-009

Original acceptance evidence: Evidence: `tests/go-live/shared-kiosk.journeys.ts` · `src/core/features/audience/signup-routes.ts` · `src/core/features/audience/ui/kiosk-signup-page.tsx` · `migrations/core/0075_kiosk_forms.sql`. The native journey exercises server-owned marking and the device label, 300 accepted signups from one network, a fresh mandatory challenge for each person, a blank reset within two seconds, no visitor cookies/storage, operator attribution and confirmed kiosk-source reporting in Insights. Turnstile provisioning and ordinary-form intake remain FORM-008 obligations; the hosted/kiosk resubscribe path is exercised separately under CONT-027.

## FORM-010

Original acceptance evidence: Evidence: `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-refusal-screens.ts` (1440/390, overflow and axe), `tests/audience-import/signup-security.spec.ts` (durable global last slot), `tests/audience-import/signup-reservation-clock.spec.ts` (database clock), `tests/go-live/resubscribe.journeys.ts` (destination daily allowance), `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/activity-log.ts` (one summary per closed hour). Gap/default ADOPTED: counts are on Settings; FORM-005's form report remains unbuilt and no clause sentence is changed. Network-edge fixtures only; no real provider call or consent was used.

## SEG-001

Original acceptance evidence: Evidence: `tests/audience-controls/segments.spec.ts` — “AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable”, with `tests/audience-controls/segment-journey.ts`, `tests/audience-controls/segment-catalog.ts` and `tests/audience-controls/segment-fixture.ts`; `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/cross-channel-attribution.ts`) for human email and SMS clicks in the last N days. Proven: a saved nested all/any segment with Placed Order count, a same-event value/currency filter and US state returns exactly the matching contacts in review, including count, value, time-window and state boundary cases. The builder live estimate and plain-text summary name every condition; review recomputes membership and approval freezes the same exact IDs. Recorded properties, tags, consent/topics, bought products, ZIP/distance and RFM also pass through review. Collections and categories bought: Shopify product sync records each product's collection IDs (every page drained) and taxonomy category (null when uncategorized); before the catalog is recorded both conditions are unavailable rather than empty; a builder segment nesting US state with an any-group of bought collection and bought category shows both in its summary and a live estimate equal to review, and review selects exactly the contacts who bought from the collection or in the category (not those who bought only from another collection, only in other categories, only in a future order, or nothing); when Shopify removes a product from the collection, recount drops its earlier buyer. Builder and review are exercised at 1440 and 390 with no overflow or accessibility violations (sandboxed authored email preview is asserted directly). Contacts use the integration door; products and orders use the Shopify sync door; no direct rows. Inherited: campaign/link/flow activity by SEG-006, predictions by SEG-004, and products, collections and categories viewed by CONT-018. Collection and category membership is the synced catalog's current placement; ZIP distance uses Census ZIP-area representative points.

## SEG-003

Original acceptance evidence: Evidence: `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/retention-journey.ts`.

## FLOW-001

Original acceptance evidence: Evidence: `tests/go-live/roles.journeys.ts` via `tests/campaign-authoring/flow-journey.ts` (Verify go-live 6/9): three-message welcome graph with split, unreachable-node validation and repair, keyboard pan/zoom, saved revision reload and 1440/390 accessibility/overflow/hydration; all node-kind explanations, named loop/unended-path validation and delay-cycle acceptance; Author saves, Analyst reads, Support named 403. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) exports/restores the draft revision with prior data. Gap: Draft revisions only. Trigger enrolment, including the INT-004 renewal reminder (FLOW-002), and activation (FLOW-008) remain unbuilt. All node kinds have plain explanations; unavailable transports/actions are identified. No flow is enrolled, activated or sent.

## CONT-027

Recipient reconfirmation uses an affirmative POST with `confirm=true` from the emailed form; GET and HEAD are read-only. The link is single-use and expires after 30 days. For a recreated erased contact, expiry removes the request and recreated contact while leaving the surviving restriction. A provider hand-off already authorized and in flight cannot be recalled by a later database transition; before the authoritative hand-off check, a suppression or later opt-out prevents it.

## BUILD-010

*Mobile-only settings.* Hide on mobile, hide on desktop, mobile content orientation and per-block or per-section mobile font size, line height, padding and alignment are written into one generated responsive block. This is a single `<style>` element in the document `<head>`, of at most 8,192 bytes, holding only `@media only screen and (max-width: 480px)` rules over a closed vocabulary of Mango class names (hide, show, stack, order, font size, line height, padding, alignment), plus, for hide on desktop only, `@media only screen and (min-width: 481px)` rules that hide, so a desktop-hidden block stays visible wherever the block is not applied. Its declarations come from the allowed-property list, plus `display: none` for hiding and `display: block` with `width: 100%` for stacking, each written with `!important`, which only this generated block may carry, so it overrides the inline styles it refines; for the chosen mobile content orientation the builder writes the columns in their stacking order and the generated rules restore the desktop order.

## BUILD-010

*Authors cannot write it.* Saving regenerates the block from the per-block settings. Any `<style>` element, class or at-rule that is not byte-identical to the regenerated block is refused, so MSG-009's authored grammar and the 13 October policy are unchanged for everything an author writes.

## BUILD-010

*Conservative default (Gmail CSS support, caniemail `<style>`/media-query data; owner rule of 19 October 2026):* the block is generated, never merged with authored text, and its absence never loses content. Hide on mobile is applied only by the block, so a client without it shows the block. Hide on desktop is applied only by the min-width rule, so Outlook desktop and style-stripping clients show it, and preview says so. No MSO conditional comment, `mso-*` property, attribute selector, ID selector or `@import` is ever generated. A block over 8,192 bytes is refused at save with its size named.

## BUILD-010

*Security consequences:* the responsive block is Mango's own output from a closed vocabulary, never authored text. It adds no remote load, no tracking channel and no selector an author controls. Hiding is limited to whole blocks that remain visible and checked at the other width and in plain text. This is the one named amendment of the MSG-009 and MSG-012 policy by a target clause, and it ships only with its adversarial cases in an executed spec that consumes `tests/support/adversarial-email.mjs` (see Evidence).

## SMS-008

*Connect:* in Settings → SMS an Owner (OPER-004) pastes the Twilio Account SID and Auth Token (the Auth Token is what Twilio signs its webhooks with, so it is needed even when an API key sends). Mango reads the account back, names a suspended or trial account, and stores the credentials as a server secret exactly as DELIV-008 stores a mail key, with no deployment input, `hosted.env` edit or redeploy.

## SMS-008

*Developer route:* the deployment-input route stays, labeled and never offered first, as in DELIV-008.

## SMS-008

*Acceptance:* against a Twilio edge, an Owner on a fresh installation with no SMS deployment input connects by pasting the Account SID and Auth Token, with no redeploy. The edge records the Messaging Service Mango created with its callback and inbound URLs, and an existing service at the edge is unchanged. Before the test text's signed callback, SMS approval names `sms-events-missing`; after it, the step passes. An inbound STOP signed by the edge opts the number out (CONT-007). A rotated Auth Token at the edge raises the Home alert and blocks SMS approval. An Admin calling the connect route is refused with 403.

## DELIV-008

Mango reads the key's permissions and names any that are missing before anything else happens. For SendGrid (`GET /v3/scopes`): `mail.send`; domain authentication read and create (`whitelabel.*`); the event webhook settings and test scopes (`user.webhooks.event.*`); and email Activity read where the account has it (SEND-008). For Resend: a full-access key, which webhook and domain management need; a sending-only key is named as missing that permission.

## DELIV-008

Mango starts using the connection on the next request, with no redeploy. No `MAIL_*` or `MARKETING_MAIL_*` deployment input, `.rer/hosted.env` edit, `rer deploy` or `--set-secret` is needed.

## DELIV-008

creates its own event webhook at the provider, at this deployment's canonical HTTPS origin. For SendGrid: `POST /v3/user/webhooks/event/settings` to `/webhooks/mail/sendgrid`, subscribed to delivered, bounce, dropped, deferred, spam report and unsubscribe (and group unsubscribe), named as Mango's. For Resend: `POST /webhooks` to `/webhooks/mail/resend`, subscribed to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained` and `email.failed`, plus Resend's suppression event where it offers one.

## DELIV-008

turns on signing (SendGrid's signed event webhook toggle for that webhook), reads back the verification public key (SendGrid) or stores the returned `signing_secret` and webhook ID (Resend), as the same server secret.

## DELIV-008

*Domain setup reads from the provider:* DELIV-002's records come from the connected account. If the account has no domain authentication for the From domain, Mango creates it through the provider's API (SendGrid `POST /v3/whitelabel/domains` with automated security; Resend `POST /domains`), shows the exact records to add, asks the provider to validate them, and rechecks until they pass.

## DELIV-008

*Developer route:* the deployment-input route (`MAIL_PROVIDER` with `MAIL_PROVIDER_API_KEY` and `MAIL_WEBHOOK_SECRET`, or `MARKETING_MAIL_*` on Managed, and the hand-built webhook in `docs/install.md`) stays for owners who manage configuration in their deployment. It is labeled the developer route, never offered first, read only while no Settings connection exists, and Settings shows which route is in use; every check above except Mango's webhook creation applies to it.

## DELIV-008

*Connect:* on a fresh Managed installation with no `MARKETING_MAIL_*` input, and on a fresh Free installation with no `MAIL_PROVIDER_API_KEY` or `MAIL_WEBHOOK_SECRET` input, an Owner connects the SendGrid edge by pasting a key in Settings, with no redeploy. No route, page, log line or export contains the key afterwards. On the Free installation, an invited operator's sign-in email then arrives through the edge.

## DELIV-008

*Resend:* the same connect, wiring, completion and bounce journey against the Resend edge stores the returned `signing_secret`.

## INT-015

the read scopes today's adapter checks (`read_customers`, `read_products`, `read_inventory`, `read_locations`, `read_orders`, `read_all_orders`, `read_returns`, `read_pixels`, `read_customer_events`)

## INT-015

`write_pixels`, to activate the pixel

## INT-015

`write_customers`, for consent write-back (INT-001) through Shopify's email and SMS marketing-consent updates (CONT-025)

## INT-015

`write_discounts` and `read_discounts`, for unique codes (BUILD-007)

## INT-015

`read_themes`, to verify the theme app embed

## INT-015

*Per-installation webhook address:* each subscription Mango creates delivers to `https://<connector>/shopify/w/<routing token>`. The token is 32 random bytes issued for one shop and one installation at connection, compared in constant time. Only that shop's own Admin token, held by that installation, registered it.

## INT-015

*Signature and shop check:* the connector verifies Shopify's HMAC with the app secret on every delivery. It routes app-level deliveries (the mandatory privacy topics) only by the `shop_domain` and `shop_id` inside the signed body. It routes app-proxy requests only by the signed `shop` query parameter, and passes on Shopify's signed `logged_in_customer_id` (CONT-018).

## INT-015

*Forwarding and read-back:* the connector forwards each verified delivery to the installation within 5 seconds, signed with that installation's own forwarding key (HMAC-SHA256 over the body, shop, topic, Shopify webhook ID and time). The installation refuses anything unsigned, stale or replayed (SEND-005). As today, customer, product and order notifications are re-read through the Admin API with the shop's own token before they change a source record, so a delivered body is never authoritative on its own.

## INT-015

The shop's Admin access token comes from the OAuth code exchange (and any refresh Shopify requires) at the connector. It is handed to the installation over TLS in a response bound to the signed state, and the connector keeps no copy. The installation stores it as a server secret, never sent to a browser, logged or exported.

## INT-015

It is a declared external (`seed.json → externals → shopify-connector`, BASE-DATA-004). This is a named amendment of BASE-DATA-005, as Managed mail is, and of the `extensions/mango-pixel/INSTALL.md` rule that a shared multi-shop app is unsupported (Interpretations). It is built to the conservative default below (*Conservative default*), with no further owner confirmation.

## INT-015

*OAuth as Shopify requires:* the callback is accepted only when the `shop` matches `^[a-z0-9][a-z0-9-]*\.myshopify\.com$`, the query `hmac` verifies with the app secret in constant time, and the `state` is the unexpired single-use one this installation issued. Anything else completes no exchange and names the reason.

## INT-015

*Scopes:* the install asks only for the scopes listed above. A scope a target clause needs but the store has not granted shows as missing and is never assumed.

## INT-015

*Declared:* `seed.json → externals → shopify-connector` names exactly what the connector holds and sees (shop domain, shop ID, installation origin, routing token, forwarding key, delivery counts, forwarded bodies in transit) with the BASE-DATA-004 privacy, cost and secret boundaries.

## BUILD-001 evidence record

`tests/proposals-decision/decision-routes.spec.ts` — existing PROP-004 saved-content registration via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7): native two-column product/button composition, uploaded image, drag and keyboard reorder, duplicate/delete, undo/redo, padding/alignment, byte-identical save/reopen and HTML-mode round trip, sent-size display, decoded uploaded image in the inert Saved Preview, stacked 375px render and approval; editor at 1440/390 with overflow, hydration and serious/critical axe checks. `tests/campaign-authoring/canonical-save.spec.ts` — existing canonical-save-tree registration via `tests/campaign-authoring/block-builder-journey.ts` and `tests/campaign-authoring/full-promotional-email-journey.ts` (Verify main 4/7): native header, hero, button, two text columns, six manually entered products, social links with deployment-owned icons beside grammar-valid text links, managed footer and mobile controls; drag/keyboard reorder, duplicate/delete for both new blocks, including a reorder while the native icon upload is held; byte-identical reopen and HTML-view round trip; 32,117 stored characters and 33,768 shown/provider-edge HTML bytes within the 102,400-byte limit; 1440/390 overflow, hydration and serious/critical axe checks; stacked 375px rendering with every image decoded and a fluid 600px product image.

## BUILD-002 evidence record

`tests/campaign-authoring/browser.spec.ts` · `tests/portability.spec.ts` · `tests/move-in/archive.journeys.ts` (Verify move-in) · `tests/campaign-authoring/design-import.spec.ts` · `tests/campaign-authoring/design-generation.spec.ts` (Verify main 3/7)  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) imports a restricted-conversion Klaviyo template into the library; `tests/portability.spec.ts` preserves it on native restore.  `tests/campaign-authoring/canonical-save.spec.ts` — existing saved-body round-trip registration via `tests/campaign-authoring/flow-template-journey.ts` (Verify main 4/7; 1440/390) starts a Flows email node from a library template, saves its independent copy, edits the library and reloads the byte-identical flow revision.

## BUILD-004 evidence record

`tests/proposals-decision/decision-routes.spec.ts` — existing PROP-004 saved-content registration via `tests/campaign-authoring/block-builder-journey.ts` and `tests/campaign-authoring/reusable-block-journey.ts` (Verify main 6/7; 1440/390): native named reusable footer save/edit, Author mutation refusals, placement in two drafts, a saved template and a FLOW-001 draft email, linked draft-body updates, unchanged approved campaign bytes and a fresh unapproved replacement, stale-version refusal, explicit independent copies and repeated edits reusing the pending replacement. `tests/portability.spec.ts` — DATA-001 complete native records registration (Verify main 5/7) retains prior data and round-trips definitions and placements through native export/restoration.

## BUILD-008 evidence record

`tests/go-live/presend-checks.journeys.ts` · `tests/go-live/email-size.journeys.ts`

## BUILD-009 evidence record

`src/core/features/sms/content.ts` · `src/core/features/sms/review-preview.ts`

## BUILD-010 evidence record

`tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration (Verify main 4/7), via `tests/campaign-authoring/mobile-presentation-journey.ts`: all 138 `tests/support/adversarial-email.mjs` cases, generated/authored CSS and hidden-compliance refusals, exact generated bytes in sent-size accounting, eight stored-body 375/600 standards/quirks renders with/without style, nonblank inert Preview and serious-axe/overflow/hydration proof at 1440/390. `tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration via `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney (Verify main 4/7) edits hide on mobile/desktop, font size, line height, padding and alignment through the native block editor at 1440/390, checks the saved generated body and the resulting 375px computed styles, and audits overflow, hydration and serious axe findings; shell axe runs directly to avoid sandbox child-frame discovery. `tests/campaign-authoring/design-import.spec.ts` exercises the fluid column compiler. `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7) exercises generated column stacking.

## BUILD-011 evidence record

`tests/go-live/multistep.journeys.ts` — [AUD-006] later steps reapply ordinary inclusion, custom exclusions and consent without adding new candidates via `tests/go-live/chosen-catalog-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify go-live 9/9): original synthetic-mango Shopify catalog fixtures prove title/SKU/collection/vendor searches, product and grid selection with a chosen variant, identifier-only HTML round-trip, current values/read time, revision locking, changed price at provider hand-off, unpublished/deleted/out-of-stock hiding, empty hide/skip, unavailable-read skip, visible per-recipient reasons, recovery with a fresh read and campaign counts; picker, previews and outcomes at 1440/390. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/chosen-size-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify local-start 3/3): original synthetic-mango fixtures drive the six-item Shopify picker in a full promotional email above 20,000 stored characters, unchanged reopen and approval; unpublished and out-of-stock selections remain in the save bound, seven-item grids and two-item product layouts are refused, oversize catalog diagnostics name the grid as one block, template/start/duplicate refusals preserve records, browser refusals retain unsaved HTML at 1440/390, restored six-item hand-off bytes equal the shown bound, in-limit tracked title growth sends, and oversized live title growth skips with email-too-large counted on campaign detail. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/catalog-guard-journey.ts` (Verify local-start 3/3): six roles and anonymous have exact search/preview permissions without denied edge reads; an Author places identifiers but cannot approve; non-canonical/overlong state, foreign or malformed gids, mismatched variants, invalid item counts/layouts/providers and extra keys refuse without storing changes, and oversized queries refuse before an edge read; markup and managed-token title payloads stay escaped and opaque, unsafe product URLs and image hosts skip catalog-blocked with campaign counts; template save/start, duplication and follow-up retain identifier-only blocks, measure hidden configured items and read fresh title, price and image values at hand-off.

## BUILD-012 evidence record

`tests/go-live/email-size.journeys.ts` — large newsletters save by transmitted bytes, retain refused edits and recheck expansion at handoff (helpers `tests/go-live/email-size-imports.ts`, `tests/go-live/email-size-reuse.ts`); `tests/campaign-authoring/create-api.spec.ts`; `tests/campaign-authoring/browser.spec.ts` (helper `tests/campaign-authoring/email-size-adoption.ts`); `tests/campaign-authoring/design-import.spec.ts`  · `tests/campaign-authoring/canonical-save.spec.ts` via `tests/campaign-authoring/mobile-presentation-journey.ts` (Verify main 4/7: generated responsive bytes count in sent size) · `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7, existing PROP-004 saved-content registration): native block-editor sent-size display and unchanged approved body at 1440/390; `tests/campaign-authoring/canonical-save.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney (Verify main 4/7) proves saved generated bytes after mobile-control edits at 1440/390 and 375px computed styles. `tests/campaign-authoring/create-api.spec.ts` — existing native create registration via `tests/campaign-authoring/reusable-size-journey.ts` (Verify main 4/7) proves an oversized reusable edit reports measured HTML/text bytes, the derived limit and largest sections, preserves the exact linked draft and saved source version, and permits a later valid edit. `tests/campaign-authoring/canonical-save.spec.ts` — existing saved-body round-trip registration via `tests/campaign-authoring/audience-size-journey.ts` (Verify main 4/7): audience-selected save and live meter at 1440/390, widened-audience refusal with measured bytes, limit and three largest blocks, unchanged saved revision, frozen approval and every provider-edge hand-off within the bound; deployment-wide fallback without a selection. The audience journey also proves refused unsaved HTML and widened rules remain in the editor at 1440/390, the 95 KB advisory is acknowledged against the same eligible email identities as approval, and a valid edit recovers. `tests/campaign-authoring/canonical-save.spec.ts` — existing canonical-save-tree registration via `tests/campaign-authoring/full-promotional-email-journey.ts` (Verify main 4/7): a complete manually populated promotional email stores 32,117 characters; the shown 33,768 HTML bytes equal the provider-edge part, including saved analytics expansion, generated responsive styles, managed footer and open-estimate pixel; plain-text bytes also match. `tests/go-live/email-size.journeys.ts` via `tests/go-live/email-size-reuse.ts` retains every reuse refusal, including a new follow-up whose cohort authority is not yet inserted. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/chosen-size-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify local-start 3/3): original synthetic-mango fixtures drive the six-item Shopify picker in a full promotional email above 20,000 stored characters, unchanged reopen and approval; unpublished and out-of-stock selections remain in the save bound, seven-item grids and two-item product layouts are refused, oversize catalog diagnostics name the grid as one block, template/start/duplicate refusals preserve records, browser refusals retain unsaved HTML at 1440/390, restored six-item hand-off bytes equal the shown bound, in-limit tracked title growth sends, and oversized live title growth skips with email-too-large counted on campaign detail. Under ct's ruling of 25 October 2026 at 23:46Z, the existing local-start chosen catalog registration via `tests/campaign-authoring/catalog-riders-journey.ts` proves that a deleted selection remains stored and visibly removed, while unpublished and out-of-stock selections have distinct states at 1440 and 390 and still count in the save bound. Under the same ct ruling of 25 October 2026 at 23:46Z, that registration proves a catalog_unavailable save refusal names the current product and directs publication or removal before saving again, retains unsaved edits without storing changes at 1440 and 390, and re-measures the item after publication; existing email-too-large hand-off refusal proof remains unchanged.

## SMS-001 evidence record

`src/core/platform/adapters/mobile-message.ts`

## SMS-003 evidence record

`src/core/features/sms/policy.ts`

## SMS-004 evidence record

`src/core/features/sms/inbound.ts`

## DELIV-001 evidence record

`src/core/platform/adapters/sendgrid.ts` · `src/core/platform/adapters/resend.ts` · `tests/go-live/resend-delivery.journeys.ts`

## DELIV-002 evidence record

`src/core/features/sender-verification/domain-setup.ts` · `src/core/features/sender-verification/setup-routes.ts` · `tests/go-live/contact-links.journeys.ts`

## DELIV-003 evidence record

`src/core/features/lifecycle/reputation-guard.ts` · `tests/go-live/delivery.journeys.ts`

## DELIV-005 evidence record

`tests/go-live/mailbox-provider.journeys.ts`

## DELIV-007 evidence record

`tests/sender-verification/worker.spec.ts` — native Worker renewal proof (day 22/23/29/31, last confirmer and all Owners, diagnostic and reminder replay, provider evidence change, populated 0094 upgrade); `tests/go-live/managed-mail.journeys.ts` — managed relay and authenticated connector renewal, Home at 1440/390 with axe, overflow and hydration checks

## DELIV-008 evidence record

`tests/go-live/delivery.journeys.ts` — MSG-011 case calls `tests/go-live/sending-connection-journey.ts` for completed Connect Activity actor/time, named Admin 403 refusals on review/connect/disconnect (also OPER-004), key scopes/account review before create, signed-or-delete failures, existing-hook preservation/reconnect, encrypted key and export secrecy, signed Owner-check delivery gate and Settings Sending at 1440/390 (Verify go-live 2/9); `tests/audience-controls/sendgrid-forwarding.spec.ts` for unsigned/stale/future signatures and replay; `tests/portability.spec.ts` for populated migration, private connection exclusion and restore without resumed sending. `tests/go-live/resend-connection-journey.ts` extends that MSG-011 registration (Verify go-live 2/9): sending-only key refusal before mutation, six-event disclosed webhook creation, encrypted secret/reconnect reuse including recovery after refused configuration confirmation, unrelated-hook preservation, unsigned/stale rejection, named 401/403/deleted-hook approval blocks and Owner/Admin mail notices, with Settings and Home at 1440/390.

## INT-001 evidence record

`src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts`

## INT-002 evidence record

`tests/go-live/woocommerce.journeys.ts` — “[INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery”: Owner connects encrypted REST/signing credentials through Settings; seeded customers, paginated products, orders and refunds sync through Store with original identity/occurrence times and financial projection; the signed order webhook replays once without duplicate facts and rejects conflicting bytes; the installed-plugin edge supplies abandoned checkouts, whose signed event enters only an explicitly activated exact flow revision, adds one contact tag and exits once. Draft, stale, purchased and opted-out cases never enroll; forged, expired, nonconsented and GPC events are refused. `tests/go-live/woocommerce-plugin-journey.ts` runs the shipped browser script against the WordPress network edge for default-deny, explicit consent and GPC withdrawal. Settings/Store are exercised at 1440/390. The real plugin source is `extensions/mango-woocommerce/mango-woocommerce.php` with `extensions/mango-woocommerce/INSTALL.md`; its shortcode uses the existing confirmed signup door proved by `tests/audience-import/signup.spec.ts` — “CONT-003/009 public signup remains pending until single-use expiring confirmation and records source time method IP”. Ct approved the INT-002 semantic on 22 October 2026 at 20:20Z: store-admin enablement is off initially; only signed-in store customers; explicit analytics and marketing consent before the one Secure HttpOnly SameSite=Lax first-party cookie, expiring after 30 days; GPC records no observation and revokes pending eligibility; no cross-site tracking or subscription-consent widening; WordPress observations expire after 30 days. The allowlisted signup iframe uses Mango’s own confirmation. A saved tag-and-exit flow revision must be explicitly activated; it sends no marketing message. CONT-018 and FORM-008 retain their other acceptance obligations and statuses; FLOW clauses retain their graph/message obligations.

## INT-004 evidence record

`src/core/features/store/stripe/` · `tests/go-live/roles.journeys.ts` · `tests/portability.spec.ts`

## INT-007 evidence record

`tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/custom-event-journey.ts`: shipped JavaScript client records one general event on concurrent replay, rejects conflicting content, reads profile and rule-derived segment membership, refuses subscribe without evidence by name and exhausts one key without affecting another; timeline at 1440/390 passes axe, overflow and hydration checks. OpenAPI: `src/core/features/integrations/openapi.ts`; client: `src/core/features/integrations/client-source.ts`. Existing scoped profile/consent/suppression, conversion and refusal-feed journeys remain green.

## INT-011 evidence record

`tests/go-live/sync-integrations.journeys.ts` · `docs/integrations.md`

## INT-013 evidence record

`tests/go-live/contact-links.journeys.ts` via `tests/go-live/domain-journey.ts` — configured UTM redirect on the branded tracking host; `tests/campaign-results/performance.journeys.ts` — INT-013 / REPORT-002 at 1440 via `tests/campaign-results/tracking-journey.ts` and `tests/campaign-results/custom-attribution.ts`: sent UTM destinations, original click identity, author values, managed/contact exclusions, campaign off, Settings at 1440/390 and one idempotent Vane goal on the contact timeline; `tests/portability.spec.ts` — native settings restore.

## INT-014 evidence record

`tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/review-loyalty-journey.ts`; `tests/sender-verification/worker.spec.ts` — populated 0096 upgrade. Owner/Admin inbound Judge.me review, Okendo review/earned-points/tier-entry and Smile customer-profile adapters verify native signatures and use the INT-007 event writer. Existing contacts only; no consent or outbound action. Signed replay, account/timestamp refusal, concurrent unmatched count, encrypted export-excluded secrets, populated receipt restore, erasure/reconnection replay protection and Settings at 1440/390 are exercised.

## INT-015 evidence record

`src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts`

## INT-013 static parameter mechanism

The adopted campaign.analytics.v1 parameter labels are source=mango, medium by channel, campaign name slug and content=message revision. Values are static and bounded and apply to ordinary HTTP/HTTPS links only; author keys win and managed links and contact interpolation are excluded. Labels freeze into new drafts and changes require revision review, leaving approved revisions unchanged. Flow dimensions and the general INT-007 custom-event path remain unfinished.

## Agent evidence and legacy authority history

## Agent evidence and legacy authority history

The pre-rewrite acceptance record at `6d9fc12eeae3b7ae661508996201cb8d008895af` contains these original evidence sentences. They describe their historical scope; they do not prove the new MCP or policy clauses.


