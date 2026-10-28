<!-- Generated from CONTRACT.md by contract-docs. Edit CONTRACT.md, then regenerate. -->

# Accept a CONTRACT.md — Mango installation

The primary journey: Exercise the capabilities and acceptance journeys below.

## Progress

| Tier | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Core | 71 | 119 | 82 | 272 |
| Agent surface | 0 | 0 | 9 | 9 |
| Later | 0 | 0 | 0 | 0 |
| Full target | 71 | 119 | 91 | 281 |

Judged from the code and tests at commit `144c1db1d10d6578a3f6c4134a7d5cea655542bc` (25 October 2026). The sd-mango-c31 candidate carries the reusable-block changes and repairs the native round-trip timing. BUILD-012 retains partial with measured reusable-source refusals. BUILD-004 is proposed partial, uncounted pending exact-SHA verification and landing; its live-flow and template-copy gaps remain stated below. The sd-mango-c26b candidate adds inert FLOW-001 draft revisions, CONT-024 source attestation and review reliance counts, and partial MOVE-002/003/005 import paths; the scoped evidence and gaps below describe the candidate, pending exact-SHA branch Verify and Mac publication/landing checks. PUB-005 moved to done with its hosted paid signup page, Worker Checkout and payer-consent journey. INT-002 moved to done with its Owner connection, store sync, signed replay and activated plugin checkout-flow journey; DELIV-002 and PUB-002 remain partial. SEG-001, STORE-004 and PUB-002 were reviewed at `4c4749cf2b4fb6584483bd1fc95f7af964b12335`: SEG-001 moved to done with its collection and category purchase conditions, STORE-004 moved to done with failed webhook and generation operations carrying the adapter's error, and PUB-002 moved to partial with its paid tier proved at the Stripe network edge (sandbox proof pending); REPORT-003 was reviewed at `2ecfa8e031c3a91bfc04bfd1bef2a26bb5d15bea` (22 October 2026); other rows retain their prior review boundaries. MOVE-009, CONT-012 and AUD-008 were reviewed against the candidate source based on `b40be01dcfcf8d793a92780252859eeccdaeb754` on 21 October 2026; their evidence and gaps below supersede only those earlier status entries. Published clause wording and the issued v0.4.0 release envelope are unchanged. MOVE-009 moved to done at d21d9e2b; its unproved remainder became MOVE-015 (missing), 22 October 2026. The sd-mango-c28 candidate adds hosting hygiene, consent-neutral source draft outlines, immutable flow template copies, Resend Settings connection monitoring and native block/mobile authoring; scoped evidence below remains subject to exact-SHA Verify and Mac publication/landing checks. The sd-mango-c32 candidate adds audience-specific name bounds, native social links and a manual six-item product grid, and the provider-edge promotional-email journey. BUILD-001 and BUILD-012 remain partial and UNCOUNTED pending exact-SHA verification and Mac publication/landing checks. The sd-mango-c37 continuation proposes conservative incumbent conversion and identifier-only Shopify catalog authoring with fresh hand-off reads; MOVE-011 remains partial and BUILD-011 is proposed partial, both UNCOUNTED pending exact-SHA Verify and Mac publication/landing checks. sd-mango-c38 proposes MOVE-014 missing to partial for inspected image import and live incumbent-host diagnostics; its cutover, flow and other-host gaps remain, and this proposal is UNCOUNTED until ct reads the landing line. sd-mango-c39 extends BUILD-011 and BUILD-012 evidence for configured chosen-item size bounds, the Shopify six-item promotion, catalog authorization and adversarial payloads, and identifier-only template/start/duplicate/follow-up doors, with both clauses remaining partial and UNCOUNTED pending exact-SHA Verify and Mac publication/landing checks. This round records and proves ct's two BUILD-012 catalog save riders and STORE-001 source identity, connection and occurrence time across the built connections without changing clause statuses or counts. Field proof register: 5 rows; 0 passed, 0 failed, 5 not run.

## Core

### Home

#### HOME-001 — Installation Lobby

Core · published · **partial** · Cites BASE-PUBLIC-001, BASE-ACCESS-003

**Requirement.** The installation’s public Lobby identifies Mango and directs a stranger to sender setup before claim and sign-in afterwards.

**Acceptance.**
1. Mango’s mark, name and one newsletter description identify the installation.
2. Before sender setup, the only action finishes setup; after saved setup, it signs in.
3. The setup-state reading agrees with the Lobby before and after claim.

**Evidence.** `tests/local-start/local.journey.ts` · `src/site/pages.tsx`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Mango’s mark, name and one newsletter description identify the installation.; The Lobby has only one action.

#### HOME-002 — Newsletter landing

Core · published · **partial** · From HOME-001 · Cites BASE-PUBLIC-001, BASE-DATA-005, BASE-PUBLIC-003, BASE-ACCESS-003

**Requirement.** The run site’s static newsletter landing uses one hand-illustrated style to explain the shipped newsletter journey. The [landing specification](docs/contract/mechanism.md) keeps its exact wording and destinations.

**Acceptance.**
1. The primary action opens the Run page; the run-site landing has no sign-in link.
2. The header, hero and footer have the specified Mango identity, section links, documentation links, exact alternative sentence, hero actions and deployment-owner description; the fixed page is not a page builder.
3. The hero is the only top-level heading; the alternative sentence also ends the metadata description and names both replacement products.
4. The sections explain collection, writing, exact-letter approval, scheduling, delivery reporting and ownership, followed by a closing action.
5. The optional product credit appears only when the owner enables it; illustrative addresses, names, counts and dates are never records.
6. Only capabilities shipped by the newsletter profile are described; vendor pricing, testimonials, customer logos, ratings, metrics, cross-store claims and third-party brand logos are absent. Optional commerce, SMS, AI, per-reader send times and provider-neutral delivery are not advertised; links go only to the specified destinations.
7. The static landing reads no operator, contact, campaign or session data and is written once by the site build.
8. The fixed light palette remains readable in a dark-themed browser, without scripts and with reduced motion. Its licensed, self-hosted faces and inline drawings follow the landing specification; motion is CSS-only, plays once only without reduced-motion preference, moves only drawings and never hides content.

**Evidence.** `tests/local-start/local.journey.ts` · `src/site/pages.tsx`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: The primary action opens the Run page; the run-site landing has no sign-in link.; The hero is the only top-level heading; the alternative sentence also ends the metadata description and names both replacement products.; The sections explain collection, writing, exact-letter approval, scheduling, delivery reporting and ownership, followed by a closing action.; The optional product credit appears only when the owner enables it; illustrative addresses, names, counts and dates are never records.; The static landing reads no operator, contact, campaign or session data and is written once by the site build.; Header Mango identity and links; Hero identity and exact alternative sentence; Hero actions and destinations; Footer deployment-owner name and description; Fixed page rather than a buyer page builder; No vendor pricing; No testimonials; No customer logos; No ratings; No metrics; No cross-store claims; No third-party brand logos; No optional commerce, SMS or AI advertising; No per-reader-send-time or provider-neutral-delivery advertising; Only specified link destinations; Fixed light palette in a dark-themed browser; Readable without scripts; Readable with reduced motion; Licensed self-hosted faces; Inline drawings without raster or embedded images; CSS-only once-only drawing motion; No motion for reduced preference; Motion never hides content.

#### DOCS-001 — Public documentation

Core · published · **partial** · Cites BASE-DOCS-001, BASE-PUBLIC-001, BASE-ACCESS-003

**Requirement.** Mango’s public operator documentation follows its declared publication manifest and the landing’s shared frame. The [documentation specification](docs/contract/mechanism.md) records compilation and routing details.

**Acceptance.**
1. Every published page is reachable from the docs home in manifest section and page order, with only that navigation.
2. Each page has one top-level title, the current page marked in the sidebar, links to its sections and adjacent pages, and a phone Contents disclosure.
3. The shared header marks Docs current and offers the sole Sign in link; the shared footer and landing palette, faces and drawings frame every page.
4. Every root, docs and top-level readme Markdown file is published or explicitly excluded with a reason; undeclared files, broken links or anchors, links to unpublished pages, raw HTML, forbidden images and absolute build-machine paths fail validation.
5. Published pages describe the default newsletter profile, expose no maintainer material and have no source-repository or edit link.
6. No documentation request reads workspace, session or database records.
7. Unknown, miscased, nested and reserved slugs show a not-found page in the shared frame with links to the docs home and landing; other hosts follow the installation’s ordinary host rule.
8. Documentation is compiled before serving; Worker and browser outputs contain no Markdown or highlighter code, and individual page chunks are loaded lazily.

**Evidence.** `tests/docs.spec.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Sole Sign in link; Shared footer, palette, faces and drawings; Every root, docs and top-level readme Markdown file is published or explicitly excluded with a reason; undeclared files, broken links or anchors, links to unpublished pages, raw HTML, forbidden images and absolute build-machine paths fail validation.; Published pages describe the default newsletter profile, expose no maintainer material and have no source-repository or edit link.; No documentation request reads workspace, session or database records.; Other-host behavior; Documentation is compiled before serving; Worker and browser outputs contain no Markdown or highlighter code, and individual page chunks are loaded lazily..

### Operators

#### OPER-001 — Operators and the default role

Core · published · **partial** · Cites BASE-ACCESS-002, BASE-ROLE-001

**Requirement.** Before individual roles are assigned, an operator has the product’s Admin capabilities. First-run sender setup gates operator documents until the business sender identity is valid.

**Acceptance.**
1. Before role assignment, an operator can see and act on proposals, campaigns, flows, contacts and settings as Admin.
2. Both server navigation and client navigation keep operator documents at sender setup until valid identity is saved.
3. Valid identity already configured for the installation also completes setup.
4. Authenticated configuration APIs remain usable during setup, and completing setup does not claim provider readiness.

**Evidence.** `tests/local-start/local.journey.ts` · `tests/production-entry.spec.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Before role assignment, an operator can see and act on proposals, campaigns, flows, contacts and settings as Admin.; Valid identity already configured for the installation also completes setup.; Authenticated configuration APIs remain usable during setup, and completing setup does not claim provider readiness..

#### OPER-002 — Management

Core · published · **partial** · Cites BASE-ACCESS-004, BASE-SIGNIN-001

**Requirement.** Operators manage invitations and removals in Settings, with fresh, session-bound email proof before an invitation grants access. The [management policy](docs/contract/mechanism.md) records its extension and default.

**Acceptance.**
1. Settings can invite an operator and remove an operator.
2. A session without fresh email proof cannot grant another operator access.
3. Settings can request a confirmation link bound to the current session; completing it permits an invitation retry.
4. Reading or inspecting the confirmation link has no effect; only its affirmative submission supplies proof.
5. Only the operator established at setup may remove that operator.

**Evidence.** `tests/settings-sender/routes.spec.ts` · `src/core/features/auth/service.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Settings can invite an operator and remove an operator.; A session without fresh email proof cannot grant another operator access.; Settings can request a confirmation link bound to the current session; completing it permits an invitation retry.; Reading or inspecting the confirmation link has no effect; only its affirmative submission supplies proof.; Only the operator established at setup may remove that operator..

#### OPER-003 — Removal does not rewrite history

Core · published · **partial** · Cites BASE-ACCESS-002, BASE-AUDIT-001

**Requirement.** Removing an operator preserves Mango’s authorship and decision history.

**Acceptance.**
1. Every proposal remains attributed to the removed operator.
2. Campaign approvals, revisions, approval requests, transitions and audit entries retain the removed author’s and approver’s identity.
3. Review, campaign detail and activity expose that retained attribution at desktop and phone widths.

**Evidence.** `tests/go-live/roles.journeys.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Every proposal remains attributed to the removed operator..

### Store signals

#### STORE-001 — Store and event connections

Core · published · **partial**

**Requirement.** The owner connects the declared commerce and event sources from Settings without developer work. Each connection retains source identity, connection and occurrence time and combines one contact’s facts across connections.

**Acceptance.**
1. Shopify, WooCommerce, BigCommerce, Stripe, Square, Stall and the events API import every source type they declare: customers, products, variants, inventory, orders, refunds, carts, checkouts, subscriptions and browsing events.
2. Each connection is made from Settings by the owner without developer steps, including the merchant-installed Shopify connection.
3. Every imported fact retains its source identifier, connection and occurrence time.
4. A person present in two connections remains one contact carrying both sources’ records.
5. Each connection declares which source types it supplies under STORE-006.

**Evidence.** `src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts` — signed carts preserve string identity, multiple lines and ordering; conflicting delivery, tenant and topics cannot mutate source facts, via `tests/store/source-export-proof.ts`, `tests/go-live/built-source-journey.ts`, `tests/go-live/store-source-journey.ts` and `tests/go-live/source-runtime.mjs`, proves every declared Shopify snapshot and observation type, every declared WooCommerce type with the plugin enabled and every declared Stripe event type through their network edges and the owner export, retaining source identifiers, connections and edge occurrence times; one address has one contact carrying both WooCommerce and Stripe customer records and the Stripe events. WooCommerce's existing Owner Settings proof is `tests/go-live/woocommerce.journeys.ts` — [INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery. Stripe's existing Owner Settings proof is `tests/go-live/roles.journeys.ts` — [PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history, via `tests/go-live/stripe-journey.ts`.
**Gap.** Gap: BigCommerce (INT-003), Square (INT-005) and Stall (INT-006) remain unbuilt; Shopify's Owner Settings connection without a developer step remains unproved under INT-015.

#### STORE-002 — Source identity

Core · published · **partial** · Cites BASE-OPS-003

**Requirement.** Repeated source deliveries preserve one commerce fact per source identity while refreshing its contents.

**Acceptance.**
1. A replayed webhook or repeated scheduled sync updates the existing customer, order, cart, refund or browsing-event source record without creating a duplicate.

**Evidence.** `tests/shopify/connection.spec.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Customer and refund replay update existing contents without duplicates.

#### STORE-003 — Freshness

Core · published · **done** · Cites BASE-OPS-004

**Requirement.** The Decision Desk explains freshness for each source type, retaining the last completed sync alongside later failure until completed recovery.

**Acceptance.**
1. Each source type displays its last successful completion time and any later sync failure.
2. A failed source retains its previous completion time while unaffected sources retain their own state.
3. A source with no completed sync shows no successful sync.
4. Completed recovery clears the error and advances the successful-completion time.
5. Desktop and phone Decision Desk views show the source, safe failure cause and retained completion time without provider-private diagnostics.

**Evidence.** `tests/go-live/source-freshness.journeys.ts` · `src/core/features/campaigns/ui/source-freshness.tsx`
**Gap.** None.

#### STORE-004 — Source failure

Core · published · **done** · Cites BASE-OPS-004

**Requirement.** Commerce outages do not destroy saved marketing work or cause a campaign to send. Ingestion and generation retain inspectable failed operations carrying the source’s safe error.

**Acceptance.**
1. An ingestion or proposal-generation failure records one failed operation carrying the adapter error; a forged delivery records no operation, replay adds none and recovery completes the operation.
2. Provider diagnostics, secrets, tokens and record payloads remain absent from failed-operation text.
3. Saved drafts remain editable, recorded delivery outcomes and history remain readable, and a scheduled campaign causes no new mail handoff during the outage.
4. The Store view shows generation and webhook failures at desktop and phone widths.
5. Webhook failure responses remain retryable under their provider’s protocol.

**Evidence.** `tests/go-live/source-freshness.journeys.ts` — “[STORE-003] [STORE-004] Decision Desk retains each completed sync through a later failed page and recovery”: a failed product sync records its failed operation carrying the adapter error and recovers through Store/Decision Desk at 1440/390; proposal generation refused by the failed source records one failed generation operation carrying the adapter's last error, with no proposal, cost or send; during a Shopify Admin API outage a correctly signed webhook keeps its 401 answer and records exactly one failed webhook operation carrying the adapter error per delivery (a replay adds none, a forged delivery records nothing), and Shopify's retry after recovery ingests the record once and completes the operation; failed-operation text carries no upstream diagnostic, secret, token or record payload; the Store page lists the failed generation and webhook operations at 1440 and 390 with no overflow or accessibility violations; saved draft edits, readable recorded outcomes/history and zero new mail handoffs with a scheduled campaign. `tests/go-live/roles.journeys.ts` — “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history” (via `tests/go-live/stripe-journey.ts`): during a Stripe API outage a correctly signed Stripe event that needs a Stripe read keeps its 422 answer and records exactly one failed webhook operation carrying the adapter error (a replay adds none, a forged event records nothing), and Stripe's retry after recovery ingests it once and completes the operation. `tests/shopify/connection.spec.ts` — “[STORE-004] native authenticated sync imports complete Shopify records and retains original purchase time through nested-page failures and retry” proves failed operation diagnostics and retry. `tests/go-live/stale-sources.journeys.ts` — “[STORE-005] [STORE-006][AUD-003] sources recover only after completed sync and review counts commerce and dormancy exclusions” retains the stored-source gate.
**Gap.** None.

#### STORE-005 — Stale sources block approval

Core · published · **done**

**Requirement.** Mango withholds approval when inclusion or exclusion rules depend on stale source facts. The [freshness window](docs/contract/mechanism.md) defines aged and failed sources.

**Acceptance.**
1. Aged and failed source data block both inclusion-dependent and exclusion-dependent saved campaigns, while review names the source and safe cause.
2. Blocked reviews keep audience counts unavailable and create no approval authority or recipient steps.
3. At desktop and phone widths the review labels stale data and prevents approval.
4. After a completed sync and explicit recheck, the same saved revision can pass its ordinary approval checks.

**Evidence.** `tests/go-live/stale-sources.journeys.ts` · `src/core/features/lifecycle/evaluate-approval.ts`
**Gap.** None.

#### STORE-006 — Declared adapter capability

Core · published · **partial**

**Requirement.** Mango refuses to turn unsupported source requirements into an apparently empty or partial audience.

**Acceptance.**
1. Each commerce connection declares its supplied source types; uninstalled cart and browsing observations remain unavailable.
2. A rule, exclusion or proposal requiring an unsupplied source is labeled unavailable and cannot be approved.
3. Inclusion and exclusion reviews name the missing source, keep counts unknown and save no approval authority, snapshot or recipients.
4. The AI proposal-generation door names the missing source and saves neither campaign nor partial audience.

**Evidence.** `tests/go-live/stale-sources.journeys.ts` · `src/core/features/audience/source-coverage.ts` · `src/core/features/campaigns/authoring-service.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Source capability declared unavailable; Unsupported requirement refused; Reviews name missing source and leave no snapshots; Generation source refusal without campaign or audience. Assertions for the unsupported-source journey are in tests/go-live/declared-capability.ts outside the old Evidence set.

#### STORE-007 — Ingestion latency

Core · published · **partial**

**Requirement.** An accepted commerce webhook becomes readable source activity in the operator app within the documented ingestion-latency limit at declared capacity.

**Acceptance.**
1. Measure from webhook acknowledgement to app readability at the declared limits and meet the ingestion-latency bar.

**Evidence.** `src/core/features/audience/commerce-webhook-routes.ts`
**Gap.** acceptance not yet met: A webhook source record is readable within 60 seconds of acknowledgment, measured at the stated limits.

### Contacts and consent

#### CONT-001 — Contact identity

Core · published · **partial**

**Requirement.** Canonical email and phone identities identify one Mango contact.

**Acceptance.**
1. Email comparison ignores case and surrounding whitespace.
2. Phone identities use the documented international canonical form.
3. Each canonical email or phone identity belongs to at most one contact on capture and import.

**Evidence.** `tests/move-in/archive.journeys.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Case and whitespace canonicalization; Phone canonicalization; Phone identity uniqueness on capture and import.

#### CONT-002 — Channel status

Core · published · **partial**

**Requirement.** Consent and eligibility are independent for email and SMS on every contact.

**Acceptance.**
1. Each channel independently represents pending, subscribed, non-subscribed, unsubscribed and suppressed as defined in the [channel-state specification](docs/contract/mechanism.md).
2. Only subscribed channels are eligible for a marketing send.
3. Store activity or consent on one channel never changes the other channel’s state.

**Evidence.** `tests/move-in/held.journeys.ts` · `tests/move-in/archive.journeys.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Independent pending and SMS states; Cross-channel independence under store activity and consent.

#### CONT-003 — Consent evidence

Core · published · **partial**

**Requirement.** A subscription is bound to its recorded recipient, sender, channel and disclosure scope. Missing or obsolete consent cannot silently subscribe a contact.

**Acceptance.**
1. Capture and import retain channel, brand or legal sender, applicable SMS sender or program, subject or category, frequency, jurisdiction, capture method, source, occurrence time, consent text and version, and confirmation evidence.
2. Consent is used only for the recorded scope and current recipient.
3. Missing evidence creates a non-subscribed contact, except for the incumbent-held evidence CONT-024 defines.
4. A reassigned phone or one no longer belonging to the recipient becomes non-subscribed until fresh evidence is captured.
5. A stale or missing rendered disclosure cannot create consent evidence.

**Evidence.** `tests/audience-import/signup.spec.ts` · `tests/campaign-authoring/import-category.spec.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Recipient scope maintained; Missing evidence creates a non-subscribed contact, except for the incumbent-held evidence CONT-024 defines.; A reassigned phone or one no longer belonging to the recipient becomes non-subscribed until fresh evidence is captured.; Retained channel on capture and import; Retained brand or legal sender on capture and import; Retained SMS sender or program on capture and import; Retained message subject or category on capture and import; Retained frequency disclosure on capture and import; Retained destination jurisdiction on capture and import; Retained consent text on capture and import; Retained consent version on capture and import; Retained confirmation evidence on capture and import.

#### CONT-004 — Opt-out precedence

Core · published · **partial**

**Requirement.** An opt-out wins over every later marketing input and reaches pending marketing work before acknowledgment.

**Acceptance.**
1. Email unsubscribe, one-click unsubscribe and SMS opt-out set that channel unsubscribed before acknowledgement and exclude every draft, scheduled campaign and queued recipient step.
2. Imports, syncs, store events, merges and operator edits never reverse the opt-out.
3. During a parallel run, incumbent opt-outs and suppressions apply the same precedence, and Mango writes its own restrictions back to the incumbent.

**Evidence.** `tests/go-live/go-live.journeys.ts` · `tests/provider-suppression-ingress.spec.ts` · `tests/move-in/held.journeys.ts` · `tests/go-live/sync-integrations.journeys.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Sync, store events, merge and operator edits retain the restriction; Parallel-run incumbent writeback.

#### CONT-005 — Resubscription

Core · published · **partial**

**Requirement.** A restricted channel returns to subscribed only through fresh recipient consent and the required confirmation. Suppression additionally needs its cause resolved.

**Acceptance.**
1. Fresh affirmative evidence is later than the opt-out and is confirmed under CONT-009 before resubscription.
2. An operator edit alone never resubscribes an unsubscribed or suppressed channel.
3. A suppression cause must be resolved before that channel becomes subscribed.
4. A recipient’s own public-form resubscribe follows CONT-027.
5. Public capture follows CONT-027’s protected-destination acknowledgement, confirmation allowance, suppression and never-downgrade rules; guarded capture follows CONT-028.
6. During parallel run, a confirmed resubscribe writes subscribed state back where the incumbent API allows; otherwise the cutover report lists it.

**Evidence.** `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/opt-out-reasons.journeys.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Fresh affirmative evidence is later than the opt-out and is confirmed under CONT-009 before resubscription.; An operator edit alone never resubscribes an unsubscribed or suppressed channel.; A recipient’s own public-form resubscribe follows CONT-027.; During parallel run, a confirmed resubscribe writes subscribed state back where the incumbent API allows; otherwise the cutover report lists it..

#### CONT-006 — Email suppression

Core · published · **partial** · Cites BASE-OPS-003, BASE-MAIL-001

**Requirement.** Mango’s email suppression gate applies provider restrictions before the next campaign handoff and retains the documented soft-bounce policy.

**Acceptance.**
1. A hard bounce, complaint or provider suppression suppresses the address before the next campaign handoff.
2. Soft bounces are recorded and visible, and apply the documented consecutive-bounce suppression rule.
3. A later provider-confirmed delivery resets the consecutive-soft-bounce count.
4. The connected sending provider’s signed delivery webhook supplies these facts, and incomplete webhook setup blocks approval.
5. Refreshing local authentication/setup credentials preserves existing contact-hash restrictions, including restrictions without a remaining contact row.
6. Legacy local authority conversion preserves the original verified contact authority before credential rotation; unknown or missing authority refuses work rather than selecting an unused secret.

**Evidence.** `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/go-live/sync-integrations.journeys.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Soft-bounce recorded and visible; Consecutive soft-bounce policy suppresses; Confirmed delivery resets consecutive soft-bounce count; Incomplete provider webhook setup blocks approval; Refreshing local authentication/setup credentials preserves existing contact-hash restrictions, including restrictions without a remaining contact row.; Legacy local authority conversion preserves the original verified contact authority before credential rotation; unknown or missing authority refuses work rather than selecting an unused secret.. Soft-bounce progression and reset assertions are in tests/go-live/opt-out-reasons.journeys.ts outside the old Evidence set.

#### CONT-007 — SMS compliance replies

Core · published · **partial** · Cites BASE-OPS-003

**Requirement.** Signed SMS replies apply the sender, program and destination-jurisdiction semantics declared by the SMS adapter.

**Acceptance.**
1. Every documented STOP synonym opts out before acknowledgment; HELP and INFO request help.
2. START and UNSTOP begin fresh consent under CONT-005 without subscribing by themselves.
3. Each reply is recorded once, and Mango sends the configured compliance response only when the provider has not already sent it.

**Evidence.** `src/core/features/sms/inbound.ts` · `tests/audience-import/signup.spec.ts`
**Gap.** acceptance not yet met: Signed SMS replies: STOP family opts out before acknowledgment, HELP and START never subscribe; proved on the Mobile Message adapter, Twilio pending (SMS-001).

#### CONT-008 — Contact history

Core · published · **partial**

**Requirement.** A contact’s timeline brings marketing and source facts together in original occurrence order, preserving their sources while keeping other contacts and private payloads out.

**Acceptance.**
1. The timeline combines source activity, consent changes, suppressions, eligibility decisions, channel handoffs and deliveries, and operator actions.
2. Each fact uses its original occurrence time and source, including confirmation, approved eligibility and dispatch exclusions.
3. Older events remain reachable at desktop and phone widths.
4. Unrelated contacts and private source, provider and audit payloads remain absent.

**Evidence.** `tests/audience-controls/contact-history.spec.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Every other event retains its source.

#### CONT-009 — Confirmation

Core · published · **partial** · Cites BASE-MAIL-001

**Requirement.** The configured opt-in mode controls whether captured consent waits for a recipient confirmation or subscribes directly; CONT-025 owns source defaults and configuration authority.

**Acceptance.**
1. When confirmation is required, capture creates pending consent and one confirmation message on that channel.
2. An affirmative use of the opaque per-contact confirmation link subscribes the channel and records the confirming request’s time.
3. A pending channel receives no marketing send.
4. A confirmation link is single-use and stops working after the documented lifetime.
5. When confirmation is not required, recorded consent under CONT-003 subscribes the channel directly.
6. Opening or inspecting a confirmation link previews a form without changing consent, consuming its token or changing channel state; only its explicit affirmative submission confirms.
7. Active-identity, later-opt-out and suppression guards remain mandatory; operator-recorded SMS uses its separately authenticated exact-message reply under CONT-026 rather than a URL confirmation.

**Evidence.** `tests/go-live/go-live.journeys.ts` · `tests/audience-import/signup.spec.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Confirming request time read back; Pending channel cannot receive marketing; When confirmation is not required, recorded consent under CONT-003 subscribes the channel directly.; Reading and HEAD do not consume confirmation token; Suppression guard cannot be bypassed; Inactive identity cannot be confirmed; Operator-recorded SMS exact authenticated reply.

#### CONT-028 — Guarded consent capture

Core · published · **partial** · From CONT-005, CONT-009

**Requirement.** Public consent capture and confirmation handoff preserve current recipient authority even when requests race. The [capture transaction specification](docs/contract/mechanism.md) records the guarded transaction and provider boundary.

**Acceptance.**
1. Public eligibility, profile changes, consent evidence, capture metadata, history and pending status commit together, or a currently barred destination gains none of the new consent records.
2. A surviving unsubscribe or erasure restriction may recreate an unsubscribed profile containing only new post-opt-out request evidence, without restoring history; confirmation mail stays within CONT-027’s shared allowance.
3. A surviving suppression restriction permits neither consent writes nor confirmation mail.
4. Confirmation preparation finishes before the authoritative handoff check; suppression, a later opt-out or an already committed confirmation prevents handoff when present at that check.
5. The adapter is invoked immediately after the authoritative check; a provider handoff already authorized and in progress cannot be recalled by a later transition.

**Evidence.** `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/opt-out-reasons.journeys.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Public eligibility, profile changes, consent evidence, capture metadata, history and pending status commit together, or a currently barred destination gains none of the new consent records.; A surviving unsubscribe or erasure restriction may recreate an unsubscribed profile containing only new post-opt-out request evidence, without restoring history; confirmation mail stays within CONT-027’s shared allowance.; Surviving suppression blocks fresh capture eligibility; Confirmation preparation finishes before the authoritative handoff check; suppression, a later opt-out or an already committed confirmation prevents handoff when present at that check.; The adapter is invoked immediately after the authoritative check; a provider handoff already authorized and in progress cannot be recalled by a later transition..

#### CONT-010 — Import

Core · published · **partial** · Cites BASE-INPUT-001

**Requirement.** An operator reviews and imports CSV contact rows independently, preserving canonical identities, consent and restrictions. CONT-024 owns named-source attestation and SCALE-001 owns the review-size floor.

**Acceptance.**
1. Rows carry email or phone identity and may carry consent evidence under CONT-003; each row is validated independently.
2. A matching canonical identity updates one contact, and rerunning the same file changes nothing further.
3. The report reconciles created, updated and rejected counts and names a reason for each rejected row.
4. Import never subscribes an identity restricted by CONT-004.
5. A named incumbent export may use incumbent-held consent only under the owner’s once-per-source attestation; an unnamed file remains under the per-row consent rule.
6. Import undo preserves restrictions and the reviewed capacity meets SCALE-001.

**Evidence.** `tests/audience-import/routes.spec.ts` · `tests/move-in/archive.journeys.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Phone-only CSV validated; Each rejected row reason read back; Unnamed-file per-row rule; Full review capacity.

#### CONT-011 — Merge

Core · published · **partial**

**Requirement.** Merging contacts preserves their combined marketing history and chooses the most restrictive channel state.

**Acceptance.**
1. The survivor keeps the union of source activity, consent, campaign history and suppressions.
2. For each channel, suppression wins over unsubscribe, non-subscription, pending and subscription, in that order.
3. A merge never resubscribes a restricted channel.

**Evidence.** `tests/audience-controls/merge.spec.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Every channel preserves the restrictive order.

#### CONT-012 — Dormancy without deletion

Core · published · **partial** · Cites BASE-DATA-002

**Requirement.** Dormancy is an audience label and exclusion based on original meaningful activity times. Imported-history gaps and open-only histories are explicit labels, never hidden assumptions.

**Acceptance.**
1. No click, order or consent change in the dormancy window makes a contact dormant and excluded under AUD-003 and AUD-008.
2. Imported clicks, orders and consent changes use the incumbent’s original occurrence times; opens never qualify as meaningful activity.
3. A move-in contact with no engagement history is no-history rather than dormant, and its dormancy window begins at move-in completion.
4. An otherwise dormant contact with only imported opens inside the window is labeled open-only.
5. Inactivity never unsubscribes or suppresses a contact; clearing a dormant list is an operator action.

**Evidence.** `tests/move-in/archive.journeys.ts` · `tests/go-live/stale-sources.journeys.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Imported order and consent changes retain original times for dormancy.

#### CONT-013 — Erasure and surviving opt-out

Core · published · **partial** · Cites BASE-DATA-003, BASE-INPUT-001

**Requirement.** Contact erasure follows Base except for surviving unsubscribe and suppression restrictions. **Supersedes BASE-DATA-003 only for this opt-out dependency, including its retained portable mapping and exported hashes.** Other personal-data entities retain Base’s guarantees; CONT-029 owns portability and CONT-030 owns restore refusal.

**Acceptance.**
1. Every known restricted channel identity, including opted-out aliases, retains its destination hash, channel, reason and occurrence time after erasure.
2. The retained local hash is one-way and installation-keyed; no readable destination remains.
3. For a subscribed identity with no surviving restriction, erasure removes all mapping aliases and leaves no address-derived row tombstone.
4. An import, sync or capture matching a retained local or portable identity preserves its restriction; an erasure opt-out means unsubscribed.
5. Only the recipient’s own confirmed public-form resubscribe can clear an unsubscribe or erasure restriction under CONT-027; it cannot clear suppression.

**Evidence.** `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: All listed hash/channel/reason/time fields and opted-out aliases retained; Installation-keyed one-way destination hash; Subscribed identity has no row tombstone; An import, sync or capture matching a retained local or portable identity preserves its restriction; an erasure opt-out means unsubscribed.; Only the recipient’s own confirmed public-form resubscribe can clear an unsubscribe or erasure restriction under CONT-027; it cannot clear suppression..

#### CONT-029 — Portable surviving restrictions

Core · published · **partial** · From CONT-013 · Cites BASE-DATA-003, BASE-DATA-004

**Requirement.** Portable audience restrictions remain effective after erasure and transfer. Their stable address-derived mappings are sensitive personal data, never anonymous.

**Acceptance.**
1. The local-to-portable restriction mapping survives erasure and is included in complete local archives.
2. Audience CSV exports carry surviving restrictions by their portable hash after erasure.
3. No retained mapping or export contains a readable destination.
4. Documentation explains that a mapping or export holder can test guessed destinations or an address dictionary without the installation secret and can match stable hashes across installations and exports.
5. The retained mappings and exports are handled as sensitive personal data.

**Evidence.** `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Local-to-portable mapping retained specifically; Audience CSV exports carry surviving restrictions by their portable hash after erasure.; Documentation explains that a mapping or export holder can test guessed destinations or an address dictionary without the installation secret and can match stable hashes across installations and exports.; The retained mappings and exports are handled as sensitive personal data..

#### CONT-030 — Erasure-safe restore authority

Core · published · **partial** · From CONT-013 · Cites BASE-DATA-003, BASE-DATA-001

**Requirement.** Restore refuses stale archive authority rather than reviving erased contacts. The [erasure-authority specification](docs/contract/mechanism.md) records epoch floors and legacy migration behavior.

**Acceptance.**
1. Any archive older than known local or supplied current matching authority is refused in full, even where its unaffected data predates erasure.
2. Nonempty legacy row journals are refused before staging.
3. Upgrade retires legacy journals and transfers only after advancing every known source floor.
4. An offline copy without current authority makes no claim to detect later erasure.

**Evidence.** `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts`
**Gap.** Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Nonempty legacy row journals are refused before staging.; Upgrade retires legacy journals and transfers only after advancing every known source floor.; An offline copy without current authority makes no claim to detect later erasure..

### Proposals

#### PROP-001 — Decision Desk

Core · published · **done**

**Requirement.** The Decision Desk lists proposals in the *proposed* state ordered by the proposal policy, highest-ranked first. *Policy: `proposal.selection.v1`; default: rank by expected revenue where this deployment has enough of its own attribution history (RESULT-003) to estimate it, then by the earliest send-by instant; proposals with neither rank last.*

**Acceptance.**
1. (done).
2. Decision Desk orders proposed suggestions by revenue then deadline.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

**Evidence.** `tests/proposals-decision/decision-routes.spec.ts`
**Gap.** None.

#### PROP-002 — Evidence

Core · published · **done**

**Requirement.** A proposal names its triggering source events, lookback window, inclusion rule, exclusion rule, source-data as-of time, send-by instant, proposed channels and step instants, and the method behind every forecast or confidence label.

**Acceptance.**
1. (done).
2. Proposal detail shows observed values, event IDs, lookback, rules, as-of and methods.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

**Evidence.** `tests/proposals-decision/decision-routes.spec.ts`
**Gap.** None.

#### PROP-003 — Counts

Core · published · **done**

**Requirement.** A proposal distinguishes candidates, excluded contacts, eligible contacts, and per-channel recipient-steps. No count is labeled recipients until exclusions have been applied.

**Acceptance.**
1. (done).
2. Counts apply real consent exclusions.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

**Evidence.** `tests/proposals-decision/decision-routes.spec.ts`
**Gap.** None.

#### PROP-004 — Content

Core · published · **done**

**Requirement.** A proposal contains an editable campaign name, email subject and body, SMS body when SMS is proposed, sender identity, destination links, and a preview for every selected channel.

**Acceptance.**
1. (done).
2. Generated content and sender are previewable and editable as a saved draft.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

**Evidence.** `tests/proposals-decision/decision-routes.spec.ts`
**Gap.** None.

#### PROP-005 — Owner control

Core · published · **done**

**Requirement.** A generated proposal is a draft and cannot schedule or send anything until an operator explicitly approves a particular saved revision.

**Acceptance.**
1. (done).
2. A proposal schedules nothing until a saved revision is approved.
3. Evidence: `src/core/features/campaigns/adopt-proposal.ts` · `tests/proposals-decision/decision-routes.spec.ts`.

**Evidence.** `src/core/features/campaigns/adopt-proposal.ts` · `tests/proposals-decision/decision-routes.spec.ts`
**Gap.** None.

#### PROP-006 — Grounded generation

Core · published · **done**

**Requirement.** AI-generated audience explanations, timing claims, and forecasts use only this deployment's imported store data and configured knowledge, supplied to `ai.provider.v1`. A generation containing a claim not derivable from that evidence is rejected and the proposal is marked failed per PROP-007; no generic marketing copy is substituted.

**Acceptance.**
1. (done).
2. Fabricated claims are rejected even with valid citations.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

**Evidence.** `tests/proposals-decision/decision-routes.spec.ts`
**Gap.** None.

#### PROP-007 — Generation failure

Core · published · **done**

**Requirement.** If the configured AI adapter returns invalid output or does not complete within 60 seconds, the proposal is marked failed carrying the provider error, no semantic fallback is created, and existing proposals and campaigns are unaffected.

**Acceptance.**
1. (done).
2. Provider rejection yields a failed proposal with no substitute.
3. Evidence: `tests/proposals-decision/proposal-states.spec.ts`.

**Evidence.** `tests/proposals-decision/proposal-states.spec.ts`
**Gap.** None.

#### PROP-008 — Forecast provenance

Core · published · **done**

**Requirement.** Every revenue, recovery-rate, or confidence figure names the deployment's own campaigns and store events it was computed from and the number of them. Mango never presents a benchmark drawn from other stores, and where its own history is too thin to compute a figure it says so instead of showing a range.

**Acceptance.**
1. (done).
2. Forecasts use only owned mature history and refuse thin history.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

**Evidence.** `tests/proposals-decision/decision-routes.spec.ts`
**Gap.** None.

#### PROP-009 — Proposal states

Core · published · **done**

**Requirement.** A proposal is *proposed*, *approved* (an operator approved a revision and a campaign exists), *dismissed* (an operator rejected it, with the reason recorded), *expired* (its send-by instant passed), or *failed* (PROP-007). Only a proposed proposal can be approved or dismissed, and every transition records its actor and time.

**Acceptance.**
1. (done).
2. Decisions record actor and time once.
3. Evidence: `tests/proposals-decision/proposal-states.spec.ts`.

**Evidence.** `tests/proposals-decision/proposal-states.spec.ts`
**Gap.** None.

### Audiences

#### AUD-001 — Review snapshot

Core · published · **done**

**Requirement.** Campaign review shows the audience rule and as-of time, candidate count, each exclusion reason with its count, eligible contact count, and the recipient-step count per channel.

**Acceptance.**
1. (done).
2. Review snapshot counts per exclusion reason.
3. Evidence: `tests/audience-controls/segments.spec.ts`.

**Evidence.** `tests/audience-controls/segments.spec.ts`
**Gap.** None.

#### AUD-002 — Consent and suppression

Core · published · **done**

**Requirement.** Contacts whose state on a channel is pending, non-subscribed, unsubscribed, or suppressed are excluded from that channel regardless of segment membership or an operator-authored inclusion rule.

**Acceptance.**
1. (done).
2. Non-subscribed states are excluded regardless of rule.
3. Evidence: `src/core/features/audience/eligibility.ts` · `tests/go-live/delivery.journeys.ts`.

**Evidence.** `src/core/features/audience/eligibility.ts` · `tests/go-live/delivery.journeys.ts`
**Gap.** None.

#### AUD-003 — Commerce and dormancy exclusions

Core · published · **done**

**Requirement.** Contacts excluded by the audience policy are listed in review with their reason and count. *Policy: `audience.exclusions.v1`; default: exclude a contact from a product campaign for seven days after purchasing that product, while a refund or return of it is unresolved, and while the contact is dormant under a twelve-month dormancy window (CONT-012).* AUD-008 states which inactivity rule governs a send, what counts for migrated contacts and how an operator turns the dormancy exclusion off for one campaign.

**Acceptance.**
1. (done).
2. One Shopify-backed product review lists recent-product-purchase (seven days), unresolved-refund, unresolved-return and dormant (twelve months), each with its count, at 1440/390.
3. Resolved commerce and eleven-month activity stay eligible; thirteen-month activity is dormant.
4. AUD-008 states how an operator turns the dormancy exclusion off for one campaign and retains that switch.
5. Evidence: `tests/go-live/stale-sources.journeys.ts`.

**Evidence.** `tests/go-live/stale-sources.journeys.ts`
**Gap.** One Shopify-backed product review lists recent-product-purchase (seven days), unresolved-refund, unresolved-return and dormant (twelve months), each with its count, at 1440/390. Resolved commerce and eleven-month activity stay eligible; thirteen-month activity is dormant. AUD-008 states how an operator turns the dormancy exclusion off for one campaign and retains that switch.

#### AUD-004 — Frequency protection

Core · published · **done**

**Requirement.** A contact inside the channel's frequency window is excluded from that step and recorded with the reason `frequency-window`, never silently deferred to a later time. *Policy: `audience.frequency.v1`; default: 24 hours since the contact's last marketing email and 72 hours since their last marketing SMS.* AUD-009 states how these windows combine with FLOW-014 caps and how an operator overrides them for one campaign, with the override recorded.

**Acceptance.**
1. (done).
2. Frequency-window exclusions recorded, never deferred.
3. Evidence: `src/core/features/audience/eligibility.ts` · `tests/go-live/open-estimates.journeys.ts`.

**Evidence.** `src/core/features/audience/eligibility.ts` · `tests/go-live/open-estimates.journeys.ts`
**Gap.** None.

#### AUD-005 — Dispatch recheck

Core · published · **done**

**Requirement.** Eligibility is recalculated when a step's dispatch begins and again immediately before each provider hand-off, so a purchase, refund, opt-out, bounce, complaint, consent change, merge, or frequency-window change after approval prevents that delivery and is recorded as the exclusion reason. Every source type used by the audience must still satisfy STORE-005; if refresh fails or the source becomes stale, the affected channel pauses before any further hand-off and resumes only after a successful refresh.

**Acceptance.**
1. (done).
2. Eligibility rechecked at dispatch and before each hand-off.
3. Evidence: `tests/audience-controls/merge.spec.ts` · `tests/go-live/delivery.journeys.ts`.

**Evidence.** `tests/audience-controls/merge.spec.ts` · `tests/go-live/delivery.journeys.ts`
**Gap.** None.

#### AUD-006 — Multi-step exit

Core · published · **done**

**Requirement.** Each later step re-applies its audience and exclusion rules; a contact who converts or becomes ineligible after an earlier step receives no later step.

**Acceptance.**
1. (done).
2. Each later step re-applies its audience and exclusion rules; a contact who converts or becomes ineligible after an earlier step receives no later step.
3. The two-step journey changes inclusion, a custom exclusion and consent after the first send, verifies named skip reasons at the second step, sends only to the still-eligible control, and keeps newly matching contacts outside the frozen audience.
4. Evidence: `tests/go-live/multistep.journeys.ts`.

**Evidence.** `tests/go-live/multistep.journeys.ts`
**Gap.** None.

#### AUD-007 — Frozen candidate set

Core · published · **done**

**Requirement.** Approval freezes the candidate set resolved at that instant. A contact who first matches the inclusion rule after approval is never added to the approved campaign, and each contact yields at most one recipient-step per channel per step even when they match the rule more than once. Exclusions still apply at dispatch (AUD-005).

**Acceptance.**
1. (done).
2. Approval freezes the candidate set.
3. Evidence: `tests/audience-controls/segments.spec.ts`.

**Evidence.** `tests/audience-controls/segments.spec.ts`
**Gap.** None.

### Campaigns

#### CAMP-001 — States

Core · published · **done**

**Requirement.** A campaign is *draft* (editable, nothing scheduled), *scheduled* (an approved revision with a future step instant), *dispatching* (a step has begun handing off), *paused* (dispatch stopped by SEND-009), *completed* (SEND-007), *canceled* (CAMP-009), or *failed* (its first step could not begin before its deadline because a required adapter or sender registration was unavailable). Every transition records its actor or the feature that acted, and its time; an invalid transition is rejected.

**Acceptance.**
1. (done).
2. Campaign state transitions with actor and time.
3. Evidence: `tests/campaign-results/results.journeys.ts`.

**Evidence.** `tests/campaign-results/results.journeys.ts`
**Gap.** None.

#### CAMP-002 — Draft editing

Core · published · **done**

**Requirement.** Operators can edit and persist the campaign name, selected channels, audience rule, message content, sender identity, links, and schedule while a campaign is a draft. An email body saves whenever its sent size is within BUILD-012's limit; a larger one is refused with its measured size and the limit named, never truncated.

**Acceptance.**
1. (done).
2. Draft editing persists every field; the body size limit is proved under BUILD-012.
3. Evidence: `tests/campaign-authoring/browser.spec.ts`.

**Evidence.** `tests/campaign-authoring/browser.spec.ts`
**Gap.** None.

#### CAMP-003 — Revision preview

Core · published · **done**

**Requirement.** Desktop, mobile, and plain-text previews render from the saved revision that will be approved, including resolved personalization examples and the compliance footer or SMS opt-out text that will be sent.

**Acceptance.**
1. (done).
2. Previews render from the saved revision.
3. Evidence: `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts`.

**Evidence.** `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts`
**Gap.** None.

#### CAMP-004 — Approval checks

Core · published · **done**

**Requirement.** Approval atomically validates the audience, consent, source freshness (STORE-005, including incumbent sync freshness during a parallel run, MOVE-013), sender registration, email authentication, sending reputation (MSG-011), compliance content, personalization, links (MSG-006, MSG-013 to MSG-015), schedule, and adapter configuration. A sender adapter must provide effective deduplication and provider reconciliation as required by SEND-001 and SEND-008. Any failure leaves the campaign a draft and names every blocking check.

**Acceptance.**
1. (done).
2. Approval names every blocking check.
3. Evidence: `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/create-api.spec.ts`.

**Evidence.** `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/create-api.spec.ts`
**Gap.** None.

#### CAMP-005 — Idempotent approval

Core · published · **done**

**Requirement.** Repeated approval requests carrying the same campaign and revision identifier produce one scheduled campaign and one set of steps and recipient-steps, whatever the number of requests.

**Acceptance.**
1. (done).
2. Repeated approval produces one schedule.
3. Evidence: `tests/campaign-authoring/browser.spec.ts`.

**Evidence.** `tests/campaign-authoring/browser.spec.ts`
**Gap.** None.

#### CAMP-006 — Schedule

Core · published · **done**

**Requirement.** Each step stores an IANA time zone and the resolved UTC instant. A local time that does not exist or is ambiguous under daylight saving is rejected until the operator chooses an unambiguous instant. *Policy: `campaign.send-time.v1`; default: resolve every step against the store time zone and the operator-selected local time.*

**Acceptance.**
1. (done).
2. DST-invalid local times are rejected.
3. Evidence: `tests/campaign-authoring/browser.spec.ts`.

**Evidence.** `tests/campaign-authoring/browser.spec.ts`
**Gap.** None.

#### CAMP-007 — Scheduled edits

Core · published · **done**

**Requirement.** Editing a scheduled campaign creates a new draft revision and leaves the approved revision active until the replacement passes approval. Replacement approval atomically makes the new revision the campaign's only active schedule and cancels every pending recipient-step of the prior revision. Once any step has begun dispatching, edits can only create a new campaign; the original campaign and its later steps remain active until the operator explicitly cancels them.

**Acceptance.**
1. (done).
2. Replacement approval wins a forced D1 ordering without mixing revisions.
3. Evidence: `tests/go-live/delivery.journeys.ts`.

**Evidence.** `tests/go-live/delivery.journeys.ts`
**Gap.** None.

#### CAMP-008 — Test send

Core · published · **done**

**Requirement.** A test sends only to the configured operator test addresses or phone numbers, or to the typed addresses CAMP-019 admits, is visibly marked as a test in its content and in campaign history, and changes no contact activity, reporting, attribution, or frequency protection.

**Acceptance.**
1. (done).
2. Test sends reach only operator addresses and change no reporting.
3. Evidence: `tests/go-live/go-live.journeys.ts`.

**Evidence.** `tests/go-live/go-live.journeys.ts`
**Gap.** None.

#### CAMP-009 — Cancellation

Core · published · **done**

**Requirement.** Canceling a scheduled, dispatching, or paused campaign stops every step and every recipient-step confirmed not handed to a provider within 30 seconds, records provider-confirmed hand-offs separately, and leaves an in-flight request in `handoff-unknown` until SEND-008 reconciles it. It never claims to recall a delivered message. Campaign detail shows the time remaining until the next step dispatches.

**Acceptance.**
1. (done).
2. Cancellation stops unsent recipient-steps within 30 seconds.
3. Evidence: `tests/campaign-results/results.journeys.ts`.

**Evidence.** `tests/campaign-results/results.journeys.ts`
**Gap.** None.

#### CAMP-010 — Step deadline

Core · published · **done**

**Requirement.** Each step carries a send-by instant, defaulting to the end of that step's scheduled local day. Recipient-steps not handed to a provider by then are skipped and recorded as `deadline-passed`; a step whose deadline passes before dispatch begins does not send.

**Acceptance.**
1. (done).
2. Missed deadlines skip with `deadline-passed`.
3. Evidence: `tests/go-live/scheduler.journeys.ts`.

**Evidence.** `tests/go-live/scheduler.journeys.ts`
**Gap.** None.

#### CAMP-011 — Dispatch punctuality

Core · published · **done**

**Requirement.** Dispatch of a scheduled step begins within 60 seconds of its resolved UTC instant, and each step's instant dispatches exactly once even if the scheduler runs twice.

**Acceptance.**
1. (done).
2. Each step dispatches once within 60 seconds.
3. Evidence: `tests/go-live/scheduler.journeys.ts`.

**Evidence.** `tests/go-live/scheduler.journeys.ts`
**Gap.** None.

#### CAMP-012 — Campaign images

Core · published · **done**

**Requirement.** A signed-in operator can upload a JPEG, PNG, GIF or WebP image within the byte and pixel limits in `seed.json`. Its type is read from the file's own header, never from the name or type the client declares, and the file must be complete; anything else is refused and nothing is stored. Each image is stored once under its SHA-256 and is never changed or deleted, so the bytes behind an approved revision cannot change, except that contact erasure (CONT-013) removes the bytes of an image holding an erased contact's identifier; such an image then answers 410 and blocks approval. It is served without a session at `/media/<sha256>` on this deployment with its exact content type, `X-Content-Type-Options: nosniff`, an immutable public cache and no cookie, answers 404 for an unknown name, and is rate-limited per image at the limit in `seed.json`, not per client address, returning 429 without affecting other images. Serving an image records nothing about who requested it. Every image is exported as its original file (DATA-001).

**Acceptance.**
1. (done).
2. Image upload, immutable serving and erasure.
3. Evidence: `tests/campaign-assets.spec.ts` · `tests/campaign-authoring/local-images.spec.ts`.

**Evidence.** `tests/campaign-assets.spec.ts` · `tests/campaign-authoring/local-images.spec.ts`
**Gap.** None.

### Designs

#### DESIGN-001 — Optional design module

Core · published · **done**

**Requirement.** The design module is disabled while both `DESIGN_PROVIDER_API_KEY` and `DESIGN_PROVIDER_ORIGIN` are absent; supplying either requires both, and startup fails naming what is missing. The origin must be an HTTPS origin with no path; only a copy running on a computer may name a loopback `http:` origin. A disabled module constructs no adapter, shows no design-generation control, contacts no design service, and its routes refuse to start a run with `design_unavailable` naming the inputs. An enabled module contacts the design service only with the owner's own key and only because an operator started a design run or chose one of its candidates.

**Acceptance.**
1. (done).
2. Disabled design module offers nothing and refuses runs.
3. Evidence: `tests/campaign-authoring/design-generation.spec.ts`.

**Evidence.** `tests/campaign-authoring/design-generation.spec.ts`
**Gap.** None.

#### DESIGN-002 — Draft-only design generation

Core · published · **done**

**Requirement.** From a draft's email editor an operator can ask the design service for two to four designs from a brief that starts as the draft's name, subject, preheader, sender name and current text and that the operator may edit. An estimate of the spend on the owner's design-service account is shown before each paid step: drawing the candidates and preparing the chosen layout. The run belongs to the draft and continues in the background: candidates appear as they land and the run is shown again after a reload. The operator chooses one with **Use this design** beside its image; Mango fetches its layout and then opens the design import path (DESIGN-004), where the browser builds the email; it opens by itself only as the continuation of that choice while the operator has done nothing else in the page, and otherwise the run shows a notice whose action opens it, so nothing opens over, or takes focus from, an operator who is working: photos hosted as campaign images, the HTTPS button destination the operator enters, the managed footer, and every design line not in the brief highlighted. The result is an unsaved edit of the email body that replaces existing content only after confirmation. The run and its candidates stay on offer until the draft is saved with the design or the operator discards them, so discarding the edit, reloading, a failed layout step or starting another run never loses a design that was paid for, and using the same prepared design again buys nothing. After a failed layout step the run says which step failed and whether the design service's allowance or wallet is the cause, and offers to try the layout again (a new paid layout) or choose a different design; a new run leaves earlier runs' designs reachable under the latest run. While the design service holds a run back, the editor says why and when Mango asks again, until the service answers. A run never saves, approves, schedules or sends; the body reaches the editor already in the canonical form saving stores (CAMP-003 policy), and the operator's Save stores it through the ordinary draft save path, where it passes every approval check like any other draft. A run that fails or outlives its deadline is shown as failed with Mango's own reason and changes nothing in the draft; Mango never substitutes content of its own for a design the service did not deliver.

**Acceptance.**
1. (done).
2. A brief becomes an unsaved body through the import path.
3. Evidence: `tests/campaign-authoring/design-generation.spec.ts`.

**Evidence.** `tests/campaign-authoring/design-generation.spec.ts`
**Gap.** None.

#### DESIGN-003 — Design data and records

Core · published · **done**

**Requirement.** A run sends the design service only Mango's fixed description of an email layout with the operator's brief, every `{{…}}` token removed, and then only the chosen candidate image: never a contact, audience, personalization value or token. Every paid request carries an idempotency key derived from the run, so a retried or replayed request never buys again. Each run records its brief, the service's run and layout identifiers, each candidate's outcome, SHA-256 and size, the chosen candidate, the operator, its times and a safe failure code, and is never deleted; the candidate images and the layout are stored in R2 as authoring evidence and exported with everything else (DATA-001). Each paid request records a cost fact (RESULT-004).

**Acceptance.**
1. (done).
2. A run sends only the brief, never buys twice and records costs.
3. Evidence: `tests/campaign-authoring/design-generation.spec.ts`.

**Evidence.** `tests/campaign-authoring/design-generation.spec.ts`
**Gap.** None.

#### DESIGN-004 — Design import

Core · published · **done**

**Requirement.** An operator editing a draft can import a design made with their own 12ui CLI: a LayerDoc version 2 file and the PNG candidate it was converted from. Mango compiles it in the operator's browser into the same email grammar every authored body uses (MSG-009, MSG-012): the photos become campaign images hosted by this deployment (CAMP-012), the design's button links to an HTTPS destination the operator enters, and its footer becomes the managed unsubscribe link and saved postal address. Layers Mango does not import are listed by their LayerDoc text, and every line of the design that does not appear in the operator's brief is highlighted for review. An unsupported version, a non-HTTPS button destination or a design the grammar cannot hold is refused visibly with the body unchanged; nothing outside the grammar is ever saved. Import only produces an unsaved edit of a draft's email body: it never saves, approves, schedules or sends, and the result passes every approval check and exact-revision approval like any other draft. Import itself makes no request to 12ui; generating designs inside Mango is DESIGN-001 to DESIGN-003.

**Acceptance.**
1. (done).
2. A LayerDoc imports as an unsaved body that passes approval and BUILD-012's measured per-part UTF-8 size check: at most 102,400 bytes for each of the HTML and plain-text parts (`seed.json → limits.maxEmailHtmlBytes`, `src/core/features/campaigns/email-size.ts`), replacing the historical 20,000-character cap of the 13 October 2026 policy.
3. Evidence: `tests/campaign-authoring/design-import.spec.ts`.

**Evidence.** `tests/campaign-authoring/design-import.spec.ts`
**Gap.** None.

### Message safety

#### MSG-001 — Sender identity

Core · published · **partial**

**Requirement.** Every email uses the configured business display name, From address, reply-to address, and physical postal address; every SMS uses a sender registered for the recipient's country.

**Acceptance.**
1. (partial).
2. Email identity is proved; per-country registered SMS senders await SMS-001 and SMS-002.
3. Evidence: `src/core/features/settings/sender-validation.ts` · `tests/settings-sender/routes.spec.ts`.

**Evidence.** `src/core/features/settings/sender-validation.ts` · `tests/settings-sender/routes.spec.ts`
**Gap.** acceptance not yet met: Email identity is proved; per-country registered SMS senders await SMS-001 and SMS-002.

#### MSG-002 — Email authentication

Core · published · **done**

**Requirement.** A marketing email cannot be scheduled unless the mail adapter reports SPF, DKIM, and DMARC passing for the sending domain and the visible From domain aligns with an authenticated domain.

**Acceptance.**
1. (done).
2. SPF, DKIM and DMARC alignment gate scheduling.
3. Evidence: `tests/sender-verification/worker.spec.ts`.

**Evidence.** `tests/sender-verification/worker.spec.ts`
**Gap.** None.

#### MSG-003 — Email unsubscribe

Core · published · **done**

**Requirement.** Every marketing email carries a visible unsubscribe link and an opaque per-recipient HTTPS `List-Unsubscribe` URL with `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; DKIM covers both headers. The one-click URL accepts a context-free HTTPS POST body of `List-Unsubscribe=One-Click`, does not redirect, and applies CONT-004 before returning success. The visible link opens a page that applies CONT-004 on a single confirming action and never on page load, so a mailbox scanner or link prefetcher cannot unsubscribe anyone. Both paths are idempotent under repeats, need no session or cookie, and reveal no contact other than their own.

**Acceptance.**
1. (done).
2. One-click and visible unsubscribe behave as mail clients send them.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/sender-verification/worker.spec.ts`.

**Evidence.** `tests/go-live/go-live.journeys.ts` · `tests/sender-verification/worker.spec.ts`
**Gap.** None.

#### MSG-004 — SMS permission

Core · published · **partial**

**Requirement.** An SMS is eligible only when its phone number is subscribed for the recorded consent scope and the SMS adapter confirms an approved sender for that recipient's country. For every permitted sender and jurisdiction, the adapter must be able to receive and enforce the standard opt-out and help keywords in CONT-007; otherwise SMS is blocked for that recipient.

**Acceptance.**
1. (partial).
2. SMS eligibility needs subscribed scope and an approved sender; US registration pending.
3. Evidence: `src/core/features/sms/transport-guard.ts`.

**Evidence.** `src/core/features/sms/transport-guard.ts`
**Gap.** acceptance not yet met: SMS eligibility needs subscribed scope and an approved sender; US registration pending.

#### MSG-005 — SMS opt-out

Core · published · **done**

**Requirement.** Every marketing SMS carries the configured program identity and `Reply STOP to unsubscribe`, or the jurisdiction's required equivalent, and the configured frequency disclosure where required. An opaque unsubscribe URL may be additional but never replaces reply-based opt-out. Review shows the exact compliance text and resulting segment count.

**Acceptance.**
1. (done).
2. On the Mobile Message edge, review of an SMS step for a confirmed SMS contact shows the rendered example with the configured program identity, `Reply STOP to unsubscribe`, the configured frequency disclosure, the help contact and the exact segment count at 1440 and 390.
3. Evidence: `tests/go-live/content-checks.journeys.ts`, `src/core/features/sms/review-preview.ts`.

**Evidence.** `tests/go-live/content-checks.journeys.ts` · `src/core/features/sms/review-preview.ts` · `src/core/features/sms/content.ts`
**Gap.** On the Mobile Message edge, review of an SMS step for a confirmed SMS contact shows the rendered example with the configured program identity, Reply STOP to unsubscribe, the configured frequency disclosure, the help contact and the exact segment count at 1440 and 390. Mobile Message is the proved adapter; Twilio acceptance stays with SMS-008.

#### MSG-006 — Links

Core · published · **done**

**Requirement.** Scheduling is blocked when a destination link is malformed; uses a scheme other than HTTPS or the contact schemes MSG-013 admits (`http:`, `javascript:`, `data:`, `file:` and every other scheme block); or resolves, on the link itself or on any redirect it follows, to a host outside the allowed link hosts MSG-014 sets out. Image sources must be HTTPS on an allowed host. Review names every blocked link with the scheme or host that blocks it, and offers MSG-015's allow action for each blocked host. Approval (CAMP-004), flow activation (FLOW-008), the link inspector and tracking (RESULT-005) apply this one rule.

**Acceptance.**
1. (done).
2. One draft with a malformed link, `http:`, `javascript:`, `data:` and `file:` links, a redirect to an unlisted host, an `http:` image and an HTTPS image on an unlisted host is blocked at review and approval; every blocked link is named with its scheme, fault or host, only unlisted HTTPS hosts offer Allow this host, and `mailto:`/`tel:` links never need it, at 1440 and 390.
3. FLOW-008 and RESULT-005 inherit the rule.
4. Evidence: `tests/go-live/content-checks.journeys.ts`, `src/core/features/campaigns/link-reasons.ts`.

**Evidence.** `tests/go-live/content-checks.journeys.ts` · `src/core/features/campaigns/link-reasons.ts` · `src/core/features/lifecycle/checks.ts`
**Gap.** One draft carries a malformed link, http:, javascript:, data: and file: links, a link whose redirect lands on an unlisted host, an http: image and an HTTPS image on an unlisted host, with mailto: and tel: contact links beside them. Review and approval block it and name every blocked link with the scheme, fault or host that blocks it; only the unlisted HTTPS hosts (the redirect's and the image's) offer Allow this host, never a scheme, at 1440 and 390. Contact links never need it. FLOW-008 (flow activation) and RESULT-005 (tracking) inherit this one rule in their own text.

#### MSG-007 — Content checks

Core · published · **done**

**Requirement.** Review names blocking and advisory content findings per channel. An operator can acknowledge an advisory finding; the consent, sender registration, opt-out, authentication, link, personalization, and reputation checks are blocking and cannot be overridden.

**Acceptance.**
1. (done).
2. The native Worker/D1 journey shows advisory and blocking findings, acknowledges only the exact saved advisory, retains its actor and time across reload and replay, invalidates it after an edit, refuses safety-check acknowledgments and still blocks approval until the content is corrected.
3. Review is exercised at 1440 and 390 pixels.
4. Evidence: `tests/go-live/content-checks.journeys.ts`.

**Evidence.** `tests/go-live/content-checks.journeys.ts`
**Gap.** None.

#### MSG-008 — Personalization

Core · published · **done**

**Requirement.** Every personalization token carries a fallback value. A bare token is refused by the authoring checks and blocks approval and scheduling even when every current eligible contact resolves it, because the audience can change before send. When a contact has no value for a valid token, its saved fallback is rendered and the count of eligible contacts using a fallback is shown in review.

**Acceptance.**
1. (done).
2. The native Worker/D1 journey refuses tokens without fallbacks even on an audience where every eligible contact resolves the token, counts eligible fallback recipients rather than token occurrences, excludes pending contacts from those counts and preserves the counts on approval.
3. Names render escaped in HTML and unchanged in text; a contact labeled only by their destination uses the saved fallback.
4. Preview supplies an illustrative value only for `displayName`, the name field available to delivery; `first_name`, `name` and other unavailable properties use their saved fallbacks in preview and provider output.
5. Editor, preview and review are exercised at 1440 and 390 pixels, then the provider payloads are checked.
6. Evidence: `tests/go-live/personalisation.journeys.ts`.

**Evidence.** `tests/go-live/personalisation.journeys.ts`
**Gap.** None.

#### MSG-009 — Email body

Core · published · **done**

**Requirement.** Every marketing email is sent as multipart/alternative with an HTML part and a plain-text part carrying the same offer, links, and unsubscribe link, plus the preheader text set on the revision. Operator-authored HTML is saved as the WHATWG HTML parser reads it and transmitted exactly as saved within the allowed tag, attribute, and inline-style set and within the size limit BUILD-012 derives from delivery, which admits no script, form, stylesheet, class, or CSS function. The single exception is the responsive block BUILD-010 generates from builder settings: no author writes it, saving regenerates it, and the checker judges the email with and without it. One checker, reading the stored body with that parser, decides approval, test send, and delivery; the preview renders the HTML sanitized per BASE-INPUT-002 from the same parse and keeps its styles only when that checker passes, and the plain-text part is derived from the same parse.

**Acceptance.**
1. (done).
2. One parser and checker decide approval, test send and delivery; the size limit is proved under BUILD-012.
3. Evidence: `tests/campaign-authoring/canonical-save.spec.ts`.

**Evidence.** `tests/campaign-authoring/canonical-save.spec.ts`
**Gap.** None.

#### MSG-010 — Unsubscribe availability

Core · published · **done**

**Requirement.** The unsubscribe path answers within 2 seconds and is rate-limited per unsubscribe token at the limit in `seed.json`, not per client IP address. The token is the rate-limit key declared for this public path under BASE-ACCESS-003, so mailbox-provider requests for unrelated recipients cannot consume one another's allowance; an exceeded token allowance returns 429 without affecting other tokens.

**Acceptance.**
1. (done).
2. The native Worker journey measures complete confirmation GET and one-click POST responses below 2 seconds, exhausts one token's shared GET/POST allowance from `seed.json`, and receives 429 without affecting another recipient's token from the same client IP.
3. Confirmation and success pages fit 1440 and 390; both opt-outs prevent already-approved deliveries and survive provider reconciliation.
4. This is a local measured path, not a hosted latency measurement.
5. Evidence: `tests/go-live/opt-out-reasons.journeys.ts`.

**Evidence.** `tests/go-live/opt-out-reasons.journeys.ts` · `src/core/features/audience/unsubscribe-routes.ts`
**Gap.** None.

#### MSG-011 — Sending reputation

Core · published · **done**

**Requirement.** Once a sending domain has at least 1,000 marketing deliveries in the reporting window, scheduling a marketing email from it is blocked while provider-reported complaints divided by delivered marketing emails are at or above 0.3%, or hard bounces divided by attempted marketing hand-offs are at or above 5% (RESULT-006). A provider's stricter block applies at any volume. The block names each numerator, denominator, reporting window, and provider rule, cannot be acknowledged away, recomputes when late facts arrive, and clears only when every applicable threshold is below its limit.

**Acceptance.**
1. (done).
2. Complaint and bounce-rate blocks with named figures.
3. Evidence: `tests/go-live/delivery.journeys.ts`.

**Evidence.** `tests/go-live/delivery.journeys.ts`
**Gap.** None.

#### MSG-012 — Hidden or deceptive presentation

Core · published · **done**

**Requirement.** Authored presentation cannot hide or disguise content. Approval, test send, and delivery judge the tree mail clients build from the stored body. Only table cells and the email's outer wrapper paint a background, no element changes its display, and nothing in the grammar can carry text out of the table cell that holds it, so every text run is drawn on the background of its nearest table cell that paints one, or outside any on the wrapper or the white page; they are blocked, with the reason named, when text sits below 3:1 contrast against that background (text on the wrapper also against the white page, since a block does not hold what overflows it) in standards or quirks rendering, when a style hides, clips, fades, shrinks below 10px, moves, overlays, or reverses text, when presentation stands where the grammar does not admit it (a background outside a table cell or the outer wrapper, any display, a width or height that could make a box smaller than its text, a border on an inline element, a rounded painted corner over the text it holds, right-to-left text outside a cell, overlapping styled cells), when styled markup is not written the way HTML parsers build it, or when markup is written in a way mail clients read differently from how it looks. The unsubscribe link and postal address fall under the same rule.

**Acceptance.**
1. (done).
2. Hidden or low-contrast text blocks approval.
3. Evidence: `tests/campaign-authoring/canonical-save.spec.ts`.

**Evidence.** `tests/campaign-authoring/canonical-save.spec.ts`
**Gap.** None.

### Delivery

#### SEND-001 — Provider hand-off

Core · published · **done**

**Requirement.** Email uses `mail.sender.v1` and SMS uses `sms.sender.v1`. Every recipient-step carries a provider-effective idempotency key derived from the campaign, revision, step, and contact. Mango stores the provider message identifier before treating it as handed off. A timeout or lost response becomes `handoff-unknown` and is reconciled by provider lookup before any retry; an adapter whose deduplication retention cannot cover the campaign deadline and reconciliation window cannot pass CAMP-004. A retried job, redelivered queue message, or resumed dispatch therefore never produces a second provider message.

**Acceptance.**
1. (done).
2. Hand-off fencing and idempotency.
3. Evidence: `tests/go-live/managed-mail.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`.

**Evidence.** `tests/go-live/managed-mail.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`
**Gap.** None.

#### SEND-002 — Quiet hours

Core · published · **partial**

**Requirement.** SMS is handed off only inside the recipient-local legal and provider-required windows. The recipient time zone is resolved from recorded location evidence with its source and freshness, never substituted with the store time zone; an unknown or stale zone blocks hand-off; the US area-code evidence SMS-003 defines counts as recorded location evidence. Legal and provider windows are mandatory minima that a policy cannot weaken. *Policy: `sms.quiet-hours.v1`; default: defer until the next allowed instant at or before the step's send-by instant (CAMP-010), otherwise skip and record `quiet-hours-deadline`.*

**Acceptance.**
1. (partial).
2. Recipient-local SMS windows; US defaults in SMS-003.
3. Evidence: `src/core/features/sms/policy.ts`.

**Evidence.** `src/core/features/sms/policy.ts`
**Gap.** acceptance not yet met: Recipient-local SMS windows; US defaults in SMS-003.

#### SEND-003 — Throttling and progress

Core · published · **done**

**Requirement.** Dispatch paces hand-offs to the provider and carrier rate limits in `seed.json`. Campaign status shows the estimated completion instant and updates the handed-off, delivered, skipped, and failed counts within 30 seconds of each change.

**Acceptance.**
1. (done).
2. Paced hand-offs with live progress.
3. Evidence: `tests/go-live/delivery.journeys.ts`.

**Evidence.** `tests/go-live/delivery.journeys.ts`
**Gap.** None.

#### SEND-004 — Transport failure

Core · published · **done**

**Requirement.** A transient provider or network failure on a recipient-step is retried up to 5 times over 1 hour with increasing delay, except that `handoff-unknown` is reconciled rather than retried. A permanent rejection or exhausted retry budget marks that recipient-step failed with the provider's error and campaign detail shows it; a hard rejection, complaint, or provider suppression also updates CONT-006 atomically before another hand-off.

**Acceptance.**
1. (done).
2. Increasing retries within the hour and terminal reasons.
3. Evidence: `tests/go-live/delivery-recovery.journeys.ts` · `tests/go-live/delivery.journeys.ts`.

**Evidence.** `tests/go-live/delivery-recovery.journeys.ts` · `tests/go-live/delivery.journeys.ts`
**Gap.** None.

#### SEND-005 — Provider-event identity

Core · published · **done**

**Requirement.** Every signed provider webhook is stored once as an immutable fact using the strongest identity that adapter declares: provider event identifier where supplied, otherwise provider message identifier, event kind, provider event time or version, and a stable payload digest. Replaying or reordering delivery, bounce, complaint, suppression, and SMS reply facts produces the same derived delivery disposition and contact state, and an older fact never downgrades a later provider disposition.

**Acceptance.**
1. (done).
2. Signed provider facts stored once.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/delivery-recovery.journeys.ts`.

**Evidence.** `tests/go-live/go-live.journeys.ts` · `tests/go-live/delivery-recovery.journeys.ts`
**Gap.** None.

#### SEND-006 — Delivery truth

Core · published · **done**

**Requirement.** A recipient-step has a transport disposition of queued, handoff-unknown, handed-off, accepted, delivered, bounced, skipped, or failed, plus independent complaint and suppression facts. *Delivered* is recorded only from a provider fact asserting delivery; provider acceptance is never reported as delivery. A later complaint remains visible without erasing the earlier delivery fact, and a skipped disposition carries its reason.

**Acceptance.**
1. (done).
2. Delivered only from a provider delivery fact.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/scheduler.journeys.ts`.

**Evidence.** `tests/go-live/go-live.journeys.ts` · `tests/go-live/scheduler.journeys.ts`
**Gap.** None.

#### SEND-007 — Partial completion

Core · published · **done**

**Requirement.** A campaign becomes completed only once every recipient-step has a terminal transport disposition; `handoff-unknown` is not terminal. Its summary keeps delivered, skipped, failed, bounced, complained, and suppressed totals separate and never sums them into a single success figure. Later complaint or suppression facts update the completed campaign's summary and the contact ledger.

**Acceptance.**
1. (done).
2. Completion needs terminal dispositions; totals stay separate.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/campaign-results/results.journeys.ts`.

**Evidence.** `tests/go-live/go-live.journeys.ts` · `tests/campaign-results/results.journeys.ts`
**Gap.** None.

#### SEND-008 — Resumable dispatch and reconciliation

Core · published · **done**

**Requirement.** Dispatch survives worker eviction, redeployment, and restart: it resumes from recipient-steps without a terminal transport disposition, sends nothing twice (SEND-001), and needs no operator action. At the reconciliation interval in `seed.json`, it queries the provider for handoff-unknown and other unresolved messages and imports missed provider facts. After the provider's declared lookup window expires, an unresolved message becomes failed with `outcome-unconfirmed`; it is never counted as delivered or retried blindly. A campaign never remains dispatching with no work or reconciliation in progress.

**Acceptance.**
1. (done).
2. Resumable dispatch and reconciliation.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`.

**Evidence.** `tests/go-live/go-live.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`
**Gap.** None.

#### SEND-009 — Provider outage

Core · published · **done**

**Requirement.** When hand-offs to a provider fail transiently for 5 continuous minutes, or the adapter reports the provider unavailable, the affected campaign channel moves to paused and no recipient hand-offs are attempted on it. The adapter runs a bounded health probe or non-recipient canary at the reconciliation interval in `seed.json`; a successful probe resumes dispatch automatically, subject to CAMP-010 and AUD-005. The pause and provider error are shown on campaign detail, and each operator is emailed once as soon as the mail provider is available.

**Acceptance.**
1. (done).
2. Outage pause and probe-driven resume.
3. Evidence: `src/core/features/lifecycle/provider-outages.ts` · `tests/go-live/delivery-recovery.journeys.ts`.

**Evidence.** `src/core/features/lifecycle/provider-outages.ts` · `tests/go-live/delivery-recovery.journeys.ts`
**Gap.** None.

### Results

#### RESULT-001 — Campaign history

Core · published · **done**

**Requirement.** Operators can list campaigns by state and channel, open the approved revision, and inspect its audience snapshot, delivery timeline, cancellation, and per-channel outcome totals.

**Acceptance.**
1. (done).
2. Campaign history by state and channel.
3. Evidence: `tests/campaign-results/results.journeys.ts`.

**Evidence.** `tests/campaign-results/results.journeys.ts`
**Gap.** None.

#### RESULT-002 — Engagement

Core · published · **done**

**Requirement.** Clicks and store conversions are shown as observed events. Open tracking is off by default; when an operator enables it, opens are labeled privacy-sensitive estimates and never support a confidence, deliverability, or attribution figure.

**Acceptance.**
1. (done).
2. Opens off by default and labeled estimates when enabled.
3. Evidence: `tests/go-live/open-estimates.journeys.ts`.

**Evidence.** `tests/go-live/open-estimates.journeys.ts`
**Gap.** None.

#### RESULT-003 — Attribution

Core · published · **done**

**Requirement.** Revenue attributed to a campaign names the qualifying store event and attribution window, is reported separately from any forecast, and is assigned at most once per order. *Policy: `campaign.attribution.v1`; default: the most recent non-automated tracked click in the seven days before purchase wins; a cancellation or refund subtracts the corresponding attributed amount.*

**Acceptance.**
1. (done).
2. Evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/performance-fixture.ts`: signed Shopify orders, latest qualifying click across two campaigns, webhook replay and later sync without duplicate or moved attribution, expired/scanner-only/no-click exclusions, partial/full refunds and cancellation in USD/JPY, API/CSV/Insights net amounts and the existing campaign-results drill-down naming each Shopify order and seven-day window separately from forecasts; 1440/390 overflow and axe checks).

**Evidence.** `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/performance-fixture.ts`
**Gap.** None.

#### RESULT-004 — Cost

Core · published · **done**

**Requirement.** Each AI call and provider hand-off records the external provider, model or channel, billable units, and reported cost; totals are visible by campaign and by day.

**Acceptance.**
1. (done).
2. Provider and AI costs by campaign and UTC day.
3. Evidence: `tests/campaign-results/costs.journeys.ts`.

**Evidence.** `tests/campaign-results/costs.journeys.ts`
**Gap.** None.

#### RESULT-005 — Link tracking

Core · published · **done**

**Requirement.** A tracked link is rewritten to an opaque per-recipient-step redirect on this deployment that records the request and forwards to the original URL. The redirect sets no cookie, loads nothing, and carries no address, name or contact ID in the destination URL; the only thing it adds is CONT-018's opaque, expiring click token, and only to a connected store's storefront host. Known mailbox security scanners and bot requests are retained as automated events but excluded from engagement and attribution. An operator can disable tracking per campaign, which sends the original URLs and records no clicks. Contact links (`mailto:`, `tel:`, `sms:`; MSG-013) are never rewritten and record no click.

**Acceptance.**
1. (done).
2. Evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/tracking-journey.ts`: actual per-recipient-step links without recipient/campaign/revision identity, exact connected-store redirect with no cookie or body, retained scanner excluded from totals/unique clicks/click map/CSV/attribution, the same delivered link still forwarding exactly with no cookie or body after its click-recording window (30 days after send-by) closes, while recording nothing for a person or a scanner, “mailto:”, “tel:” and “sms:” links in the same tracked message delivered byte for byte with no redirect and zero clicks in the API, CSV and click map, and the operator tracking-off control through delivery and destination request).
3. `tests/go-live/contact-links.journeys.ts` — “[DELIV-002][MSG-013][RESULT-005] contact links survive authoring, exact approval and delivery without tracking” proves the same contact links through the link tool and approval with tracking off.
4. `tests/go-live/open-estimates.journeys.ts` — “[RESULT-002][CONT-013] explicit open estimates are isolated, revocable, replay safe and erased” retains the 13 October policy.
5. CONT-018 owns its unbuilt click token, which this redirect consumes; until it is built these redirects add nothing.

**Evidence.** `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/tracking-journey.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/open-estimates.journeys.ts`
**Gap.** None.

#### RESULT-006 — Deliverability reporting

Core · published · **partial**

**Requirement.** Per sending domain and SMS sender, Mango shows the delivered, bounced, complained, and failed counts and the resulting hard-bounce and spam-complaint rates over the reporting window in `seed.json`, and the rates MSG-011 is currently evaluating.

**Acceptance.**
1. (partial).
2. Per-domain rates shown; SMS sender rates await SMS-001.
3. Evidence: `src/core/features/insights/ui/sender-rates.tsx` · `tests/go-live/delivery.journeys.ts`.

**Evidence.** `src/core/features/insights/ui/sender-rates.tsx` · `tests/go-live/delivery.journeys.ts`
**Gap.** acceptance not yet met: Per-domain rates shown; SMS sender rates await SMS-001.

### Data

#### DATA-001 — Export contents

Core · published · **done**

**Requirement.** The export contains every contact, source record, consent record, suppression and surviving opt-out record (CONT-013), proposal, campaign, revision, audience decision, message, recipient-step outcome, attribution event, setting, and audit entry as JSON, and every uploaded campaign asset as its original file.

**Acceptance.**
1. (done).
2. Complete export and restore into an empty installation.
3. Evidence: `tests/portability.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/local-start/command-data.journey.ts`.

**Evidence.** `tests/portability.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/local-start/command-data.journey.ts`
**Gap.** None.

### Managed installation and editor

#### MGMT-001 — Signed first-owner admission

Core · published · **partial**

**Requirement.** A claim is bound to the trusted management issuer, installation, configured app origin and owner email, expires promptly, and can initialize an installation only once. GET and HEAD never initialize it. Admission uses ordinary Base operator-auth and its native owner session. An existing installation cannot claim another first owner.

**Acceptance.**
1. (partial).
2. Signed first-owner admission once per installation; hosted proof pending.
3. Evidence: `src/core/features/auth/owner-claim.ts`.

**Evidence.** `src/core/features/auth/owner-claim.ts`
**Gap.** acceptance not yet met: Signed first-owner admission once per installation; hosted proof pending.

#### MGMT-002 — Native owner editor

Core · published · **done**

**Requirement.** Only an active native owner receives a short-lived editor grant. The frame loads from the exact configured management origin and trusts messages only from that frame and origin. Anonymous visitors receive no widget. Logout, authorization loss and grant expiry remove it. Compiled visual edits apply after the real route leaf has hydrated. Mango product authority follows OPER-004's six roles (Owner, Admin, Manager, Author, Analyst and Support), separately from Base's unchanged owner/admin/member roles. The last product Owner is always protected, and product authority on restore belongs to the destination installation. CSV export remains Owner/Admin only.

**Acceptance.**
1. (done).
2. The native owner editor mounts for the native owner only.
3. Product authority follows OPER-004's six roles separately from Base's unchanged owner/admin/member roles, with last-product-Owner protection, destination-owned authority on restore and CSV export restricted to Owner/Admin.
4. Evidence: `tests/local-start/editor.journey.ts`.
5. The PUB-001 journey (`tests/campaign-results/archive.journeys.ts`) exercises publication from a completed campaign, neutral anonymous SSR and browser reading, search metadata, RSS, idempotent publication and withdrawal at 1440 and 390.
6. Draft and no-handoff campaigns, anonymous mutations and foreign-origin mutations are refused.
7. The contact erasure cascade includes published reading copies; the existing native erasure journey includes an attributed public copy.
8. This is local Worker/D1 evidence, not hosted or live-provider acceptance. The DELIV-005 journey (`tests/go-live/mailbox-provider.journeys.ts`) sends a native approved campaign through the provider edge, applies cryptographically signed Gmail, Outlook, Yahoo, iCloud and custom-domain outcomes, and verifies each bounce category, overlapping delivery/complaint counts, repeated human clicks, scanner exclusion, replay and the absence of recipient identities in the report. Insights is exercised at 1440 and 390, including the no-events state. The existing Resend reconciliation journey remains green after bounded diagnostic preservation. These are locally signed-edge outcomes, not acceptance from a live provider account. Typed email tests are exercised through the real saved-draft route and provider edge by `tests/go-live/typed-tests.journeys.ts`, including two recipients, opt-out and suppression refusal, competing requests at the daily allowance, recorded destinations, no campaign send authority, and review at 1440 and 390. Typed SMS and the target Manager/Author controls and general activity log remain open.

**Evidence.** `tests/local-start/editor.journey.ts`
**Gap.** None.

### Target: Operators

#### OPER-004 — Roles and permissions

Core · target · **partial** · Cites BASE-ROLE-001, BASE-ACCESS-004, BASE-AUDIT-001

**Requirement.** The owner assigns six Mango product roles, separately from Base authentication roles: Owner handles all product work, billing-bearing connections, operator management and installation erasure; Admin handles everything except removing the owner and changing billing-bearing sending or Twilio connections; Manager approves campaigns, activates and pauses flows and manages segments, forms and integrations; Author edits drafts, templates, forms and draft flows and requests approval, but does not approve, activate or send; Analyst reads reports, campaigns and flows with contact identifiers masked unless granted; Support looks up contacts, reads history and records opt-out or erasure requests, but cannot subscribe anyone.

**Acceptance.**
1. The owner assigns Owner, Admin, Manager, Author, Analyst and Support with every capability and restriction in the product-role matrix.
2. The last product Owner cannot be removed or demoted.
3. Restored product authority belongs to the destination installation; source role assignments grant nothing there.
4. Only Owner and Admin can export audience CSV.
5. Analyst contact details are masked unless granted, and Support can record opt-outs and erasure requests but cannot subscribe a contact.
6. Each matrix-controlled operation is exercised for every role, and visible controls reflect those rights at desktop and phone widths.

**Evidence.** `tests/go-live/roles.journeys.ts` · `src/core/features/auth/permissions.ts` · `src/core/features/auth/product-roles.ts` · `migrations/core/0076_operator_product_roles.sql`  · `tests/go-live/delivery.journeys.ts` via `tests/go-live/sending-connection-journey.ts` (Verify go-live 2/9: SendGrid Owner connection, Admin named 403 on review/connect/disconnect)  · `tests/go-live/roles.journeys.ts` flow-draft Author save, Analyst read and Support named 403 (Verify go-live 6/9; 1440/390) · `tests/go-live/contact-links.journeys.ts` via `tests/go-live/source-api-journey.ts` (Verify go-live 1/9): Manager/Author library snapshots allowed, Analyst/Support refused and anonymous denied; MSG-011 Resend extension (go-live 2/9) limits connection mutation to Owner and health notices to current Owners/Admins.
**Gap.** Six persisted roles, Owner assignment and Analyst unmasking grant, next-request API/server-function enforcement, role-change audits, last-owner protection, Author draft/request/configured-test controls, Manager typed tests and approval, restricted contact views, Support opt-out/request recording and visible controls at 1440/390 are exercised. Gap: full flow activation, billing-bearing provider connect/replace/disconnect and installation-erasure journeys await their owning product implementations; masked CSV export is not implemented (exports remain Owner/Admin only). Authentication role grants stay destination-owned on restore.

#### OPER-005 — Separation of approval

Core · target · **missing** · Cites BASE-AGENT-006, BASE-AGENT-007

**Requirement.** The optional separation-of-approval policy requires another eligible operator to approve a campaign or activate a flow or form last edited by the requester. A binding agent approval or activation carries commitment; company policy decides its disposition.

**Acceptance.**
1. When separation is enabled, the last editor cannot approve or activate their own campaign revision, flow revision or form.
2. A different operator with approval rights can approve or activate that revision.
3. Approval requests notify approvers by email and in the app, linking to the exact revision.

**Evidence.** None.
**Gap.** not implemented

#### OPER-006 — Single sign-on and deprovisioning

Core · target · **missing** · Cites BASE-SIGNIN-001, BASE-ACCESS-002, BASE-AUDIT-001 · Register R-101

**Requirement.** Mango’s identity-provider group mapping assigns its product roles, and deprovisioning keeps marketing attribution intact. The owner retains native email sign-in for recovery.

**Acceptance.**
1. The owner may require standards sign-in and map provider groups to Mango roles.
2. A standards-provider fixture admits an operator with the mapped product role, deprovisions them, refuses their next request and retains their past approval attribution.
3. The owner’s native email recovery path remains available.

**Evidence.** None.
**Gap.** not implemented

#### OPER-007 — Activity log

Core · target · **partial** · Cites BASE-AUDIT-001, BASE-DATA-003, BASE-AGENT-009

**Requirement.** Mango’s activity trail exposes marketing, audience and configuration activity to Owners and Admins. It includes every action named in the [activity inventory](docs/contract/mechanism.md), including restore completion.

**Acceptance.**
1. Owners and Admins can inspect and filter marketing activity by operator, agent, action, object and date, and export the filtered view as CSV.
2. Draft saves, approval requests and approvals, activations, pauses, imports, exports, erasures, integration changes, role changes and consent edits appear once with actor and time.
3. Signup-allowance changes, kiosk-form changes and hourly signup-refusal summaries appear once with actor and time.
4. Completed restore appears with actor and time and remains visible, filterable and exportable.
5. Flow activation, pause and archive and agent actions join the same trail when their owning workflows operate.

**Evidence.** `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/auth/activity.ts` · `src/core/features/auth/activity-query.ts` · `src/core/features/auth/ui/activity-page.tsx` · `src/core/features/auth/activity-record.ts`
**Gap.** Owner and Admin read Activity under Settings (Authors and signed-out requests are refused on both doors): every `lifecycle_audit_entries` row and every integration-audit call, newest first, filtered by operator, agent, action, object and date, with older pages and a CSV of the filtered view that keeps a formula-like cell as text. One journey performs drafts saved, approval requests and approvals, pause, resume and cancel, an import, an audience export, an account export, a consent hand entry, an opt-out, an erasure (anonymised afterwards), signup-allowance and kiosk-form changes, role changes and an hourly signup-refusal summary (counts by form and reason, no addresses), then checks each appears once with actor and time, every filter and the export, at 1440 and 390 with axe. Each action's record is written with the action it records: in its own batch where the action is one (draft save, signup settings), otherwise immediately after it succeeds. FLOW-008 (activation, pause and archive of flows) and AGENT-010 (agent actions and the agent filter's values) inherit the obligation in their text (ct pattern 1). The product has no approval-rejection operation, so none is recorded. Gap: actual restore completion must be recorded with actor and time and visible, filterable and exportable in Activity.

### Target: Contacts and consent

#### CONT-014 — Custom properties

Core · target · **partial**

**Requirement.** Operators define and maintain typed contact properties whose provenance remains visible without changing consent.

**Acceptance.**
1. Text, number, USD money, date, boolean and list properties fit the declared property-count limit.
2. Imports, forms, integrations, the events API, flow actions and operator edits set properties; history records each source and time.
3. Properties are usable in segments, personalization, conditional content and flow splits, and changing one leaves consent unchanged.
4. An operator defines date and money properties, imports both, changes one through the API, and sees a date-based segment and a personalized money preview with each source in history.

**Evidence.** `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts`
**Gap.** The scoped API persists contact fields with contact identity and consent source. Typed property definitions, UI editing, date/money semantics, segments and personalization remain unimplemented.

#### CONT-015 — Topics and tags

Core · target · **partial**

**Requirement.** Topic permissions remain distinct from channel permission and from free-form tags.

**Acceptance.**
1. A contact may subscribe to Promotions while declining Newsletter within recorded channel consent scope.
2. Operators, imports, forms, flows and the API apply tags without creating consent or changing eligibility.
3. Campaigns and flows name their sending topic; eligibility checks both that topic and its channel, and unsubscribe-all remains available.
4. After a preference-center topic withdrawal, the next campaign excludes that topic while another permitted topic still reaches the contact.

**Evidence.** `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` · `src/core/features/lifecycle/email-consent-scope.ts`
**Gap.** Scoped subscriber sync stores deduplicated tags without granting consent, and maintains saved integration lists. Topic preference-center acceptance and general tag-driven segmentation remain unmet.

#### CONT-016 — Preference center

Core · target · **missing** · Cites BASE-PUBLIC-001

**Requirement.** A recipient uses the preference link in a marketing message without signing in to control only their own preferences.

**Acceptance.**
1. An opaque recipient-bound link offers topics, operator-offered frequency, pauses of 30, 60 or 90 days, chosen profile fields and unsubscribe-all.
2. Only an explicit confirming action changes preferences and records consent evidence; loading the page, including a scanner fetch, changes nothing.
3. The page reveals no other contact.
4. After a topic change and 30-day pause confirmed from a sent-message link, following campaigns record topic-unsubscribed and paused-by-recipient exclusions.

**Evidence.** None.
**Gap.** not implemented

#### CONT-017 — Contact profile and event timeline

Core · target · **partial** · Cites BASE-ROLE-001

**Requirement.** A contact profile brings identities, channel permission, properties, segments and a time-ordered history together. FLOW-002 owns the current flow-enrollment panel, and SEG-004 owns predictions, following ct’s recorded routing.

**Acceptance.**
1. The profile shows identities, per-channel consent and topics with their evidence, properties and segment membership.
2. Events, messages, clicks, conversions, form submissions, SMS replies, consent changes and operator or agent actions appear in original time and source order.
3. A contact who submits a form, places an order, enters a flow and clicks a message shows the profile facts in order at 1440 and 390.
4. Analyst and Support see the contact-specific masked profile at both widths.

**Evidence.** `tests/audience-controls/contact-history.spec.ts` — “[CONT-008] [CONT-017] a contact profile combines identities, properties, segments and original source, consent, suppression, eligibility, delivery and operator facts with masked role views”: identities and merges, per-channel consent/topic evidence, properties and rule-derived segment membership; form, order, conversion, click, SMS-reply and consent facts in original time/source order; Analyst and Support masking, axe, overflow and hydration at 1440/390.
**Gap.** Identities, channel/topic evidence, properties, segment membership, original-time events and masked Analyst/Support views are exercised. Apply the recorded routing of enrollment/current-node display to FLOW-002 and predictions to SEG-004; independent topic withdrawal remains CONT-015/016. No unavailable panel establishes completion.

#### CONT-018 — Onsite behavior

Core · target · **partial** · Cites BASE-PUBLIC-001, BASE-PUBLIC-002

**Requirement.** Identified onsite behavior is recorded consistently by the first-party snippet, Shopify pixel, WooCommerce plugin and Stall integration. A site uses exactly one carrier; store record synchronization remains STORE-001 rather than onsite tracking. These are product privacy rules, without a claim of legal compliance.

**Acceptance.**
1. Each carrier records Viewed Product, Added to Cart, Started Checkout and Active on Site for an identified visitor, preserving products, variants, quantities, time, carrier and identification method.
2. Only the visitor’s own form submission, store-passed login identity or Mango tracked-link click identifies them; a store login or form submission replaces prior click identification.
3. No fingerprint, IP address, user agent or device characteristic links anonymous browsing to a contact.
4. The tracked-link storefront journey records two views and a cart event on the correct timeline and labels click identity honestly.
5. The same journeys apply to all four carriers; one carrier’s result does not establish another’s.

**Evidence.** `tests/shopify/connection.spec.ts`
**Gap.** Default in force (owner direction 19 Oct 2026), written into the clause: site tracking off per site until an Owner or Admin turns it on (Manager may turn it off; OPER-007); consent only from the store's consent tool (Shopify Customer Privacy API, WP Consent API, Stall, the snippet's consent call), none or no decision = refused; GPC (`Sec-GPC: 1` or `navigator.globalPrivacyControl`), sale-or-share opt-outs and CONT-021 do-not-share always refuse; one cookie `mgo_s` (Secure, SameSite=Lax, Path=/, no Domain, at most 30 days, HttpOnly where server-set, at most 2,048 bytes; no other browser storage); nothing sent to or held by Mango for an unidentified visitor (up to 20 events wait in the cookie until identification); `mgo_c` is 32 random bytes, single-use, host-bound, digest-only, 7 days, never for automated clicks, GPC or tracking off; identified onsite events kept 90 days; erasure under CONT-013. ct approval of the landed default: pending. Built and exercised: Shopify signed pixel ingest and current privacy controls (`tests/shopify/connection.spec.ts`); the separately approved INT-002 plugin semantic stays DONE. Acceptance not yet met: the snippet and Stall surfaces; the shared site switch, click-token journey and exchange on every surface; consent buffering, cookie parity, anonymous-request refusal, 90-day retention, erasure, segment-window and cross-site browser assertions on each surface. The Shopify pixel and WooCommerce plugin have not run this expanded acceptance. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing.

#### CONT-031 — Per-site tracking switch

Core · target · **partial** · From CONT-018 · Cites BASE-ROLE-001, BASE-PUBLIC-002, BASE-AUDIT-001

**Requirement.** Site tracking is off until an authorized operator enables that individual site and is reset off on reconnection.

**Acceptance.**
1. Owner or Admin enables a site in Site tracking; Owner, Admin or Manager can disable it. Settings at 1440 and 390 exposes controls only to the allowed roles.
2. Each switch change records its actor and time in activity. Where the store also has a switch, both must be on.
3. While off, forms remain available, but no behavior is observed, no cookie is set, no event or click token is exchanged or recorded, and tracked redirects add no token.
4. The Shopify pixel subscribes to no event while off; the snippet runs only on an allowed embed origin.
5. Disabling ends identified sessions; re-enabling cannot identify a prior browser without a fresh permitted identification.

**Evidence.** `tests/shopify/connection.spec.ts`
**Gap.** Default in force (owner direction 19 Oct 2026), written into the clause: site tracking off per site until an Owner or Admin turns it on (Manager may turn it off; OPER-007); consent only from the store's consent tool (Shopify Customer Privacy API, WP Consent API, Stall, the snippet's consent call), none or no decision = refused; GPC (`Sec-GPC: 1` or `navigator.globalPrivacyControl`), sale-or-share opt-outs and CONT-021 do-not-share always refuse; one cookie `mgo_s` (Secure, SameSite=Lax, Path=/, no Domain, at most 30 days, HttpOnly where server-set, at most 2,048 bytes; no other browser storage); nothing sent to or held by Mango for an unidentified visitor (up to 20 events wait in the cookie until identification); `mgo_c` is 32 random bytes, single-use, host-bound, digest-only, 7 days, never for automated clicks, GPC or tracking off; identified onsite events kept 90 days; erasure under CONT-013. ct approval of the landed default: pending. Built and exercised: Shopify signed pixel ingest and current privacy controls (`tests/shopify/connection.spec.ts`); the separately approved INT-002 plugin semantic stays DONE. Acceptance not yet met: the snippet and Stall surfaces; the shared site switch, click-token journey and exchange on every surface; consent buffering, cookie parity, anonymous-request refusal, 90-day retention, erasure, segment-window and cross-site browser assertions on each surface. The Shopify pixel and WooCommerce plugin have not run this expanded acceptance. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing.

#### CONT-032 — Onsite consent and opt-out precedence

Core · target · **partial** · From CONT-018 · Cites BASE-PUBLIC-001

**Requirement.** A carrier tracks only while the store’s consent tool permits analytics and marketing and reports no sale-or-sharing opt-out.

**Acceptance.**
1. Shopify uses its Customer Privacy API permissions, WordPress uses statistics and marketing permissions, Stall uses its visitor consent state, and the snippet uses the site-banner consent call.
2. No consent tool or no decision means refusal: nothing is set, held, sent or exchanged.
3. A refusal or withdrawal deletes the tracking cookie and stops recording; an identified visitor’s withdrawal also removes their earlier onsite events from that carrier.
4. Global Privacy Control and a store sale-or-sharing opt-out override an accepted banner on every site and for every visitor.
5. Header-only GPC prevents redirect token creation; browser-only GPC drops a token without exchange. A do-not-share contact records no behavior after store login.
6. Consent given on the landing page may identify the visitor then; before it, the token leaves the address bar and waits only in page memory, and otherwise is dropped.

**Evidence.** `tests/shopify/connection.spec.ts`
**Gap.** Default in force (owner direction 19 Oct 2026), written into the clause: site tracking off per site until an Owner or Admin turns it on (Manager may turn it off; OPER-007); consent only from the store's consent tool (Shopify Customer Privacy API, WP Consent API, Stall, the snippet's consent call), none or no decision = refused; GPC (`Sec-GPC: 1` or `navigator.globalPrivacyControl`), sale-or-share opt-outs and CONT-021 do-not-share always refuse; one cookie `mgo_s` (Secure, SameSite=Lax, Path=/, no Domain, at most 30 days, HttpOnly where server-set, at most 2,048 bytes; no other browser storage); nothing sent to or held by Mango for an unidentified visitor (up to 20 events wait in the cookie until identification); `mgo_c` is 32 random bytes, single-use, host-bound, digest-only, 7 days, never for automated clicks, GPC or tracking off; identified onsite events kept 90 days; erasure under CONT-013. ct approval of the landed default: pending. Built and exercised: Shopify signed pixel ingest and current privacy controls (`tests/shopify/connection.spec.ts`); the separately approved INT-002 plugin semantic stays DONE. Acceptance not yet met: the snippet and Stall surfaces; the shared site switch, click-token journey and exchange on every surface; consent buffering, cookie parity, anonymous-request refusal, 90-day retention, erasure, segment-window and cross-site browser assertions on each surface. The Shopify pixel and WooCommerce plugin have not run this expanded acceptance. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing.

#### CONT-033 — Onsite session storage

Core · target · **partial** · From CONT-018 · Cites BASE-PUBLIC-001

**Requirement.** One host-bound tracking cookie holds a limited session and optional earlier browsing; carrier code stores no other tracking identity.

**Acceptance.**
1. The cookie is Secure, SameSite=Lax, path-rooted, has no Domain attribute and is HttpOnly when a store server sets it; script-only carriers do not claim HttpOnly.
2. Its random 128-bit identifier and optional earlier browsing fit within 2,048 bytes, with no address, name, contact/customer identifier, click token or price.
3. Anonymous expiry is at most 30 days from creation; identified expiry is at most 30 days from the latest permitted identification. Browsing alone never extends it.
4. Identification, including a change of identified contact, rotates the session identifier.
5. No tracking identity enters another cookie, localStorage, sessionStorage or IndexedDB, and non-HTTPS pages receive none. Form display memory contains no identifier and is neither sent nor read as behavior.
6. The browser proof reads cookie attributes and storage after consent, expiry and withdrawal.

**Evidence.** `tests/shopify/connection.spec.ts`
**Gap.** Default in force (owner direction 19 Oct 2026), written into the clause: site tracking off per site until an Owner or Admin turns it on (Manager may turn it off; OPER-007); consent only from the store's consent tool (Shopify Customer Privacy API, WP Consent API, Stall, the snippet's consent call), none or no decision = refused; GPC (`Sec-GPC: 1` or `navigator.globalPrivacyControl`), sale-or-share opt-outs and CONT-021 do-not-share always refuse; one cookie `mgo_s` (Secure, SameSite=Lax, Path=/, no Domain, at most 30 days, HttpOnly where server-set, at most 2,048 bytes; no other browser storage); nothing sent to or held by Mango for an unidentified visitor (up to 20 events wait in the cookie until identification); `mgo_c` is 32 random bytes, single-use, host-bound, digest-only, 7 days, never for automated clicks, GPC or tracking off; identified onsite events kept 90 days; erasure under CONT-013. ct approval of the landed default: pending. Built and exercised: Shopify signed pixel ingest and current privacy controls (`tests/shopify/connection.spec.ts`); the separately approved INT-002 plugin semantic stays DONE. Acceptance not yet met: the snippet and Stall surfaces; the shared site switch, click-token journey and exchange on every surface; consent buffering, cookie parity, anonymous-request refusal, 90-day retention, erasure, segment-window and cross-site browser assertions on each surface. The Shopify pixel and WooCommerce plugin have not run this expanded acceptance. RESULT-005's redirect consumes this clause's click token: it adds `mgo_c` to connected-store destinations once the token is built; until then the redirect adds nothing.

#### CONT-034 — Storefront click identity

Core · target · **missing** · From CONT-018

**Requirement.** A tracked click can identify the recipient at the connected storefront without exposing personal data or granting consent.

**Acceptance.**
1. Only a connected-store destination with site and campaign tracking enabled receives a token; outside hosts, automated clicks, GPC and disabled tracking receive none.
2. Each eligible click mints an unrelated 32-random-byte, 43-character opaque token bound to that recipient-step and storefront host; only its digest is retained for seven days.
3. Exchange is one-time, within seven days, through the destination host’s authenticated carrier and only while consent permits; expired, reused, wrong-host or tracking-off tokens identify nobody.
4. After exchange the token is absent from the address bar; the Shopify theme embed removes it where the pixel sandbox cannot.
5. Identity is labeled click-identified because email can be forwarded, never changes consent, and is replaced by a later form submission or store login.
6. Two clicks yield unrelated tokens; another browser replay, another store and an expired token all fail to identify.

**Evidence.** `tests/shopify/connection.spec.ts`
**Gap.** Shopify pixel ingest and current privacy controls are exercised; the shared click-token redirect, host-bound exchange, one-use/expiry and address-bar journeys across carriers remain unbuilt and unproved.

#### CONT-035 — Earlier browsing stays on the visitor’s device

Core · target · **missing** · From CONT-018

**Requirement.** Consented earlier browsing stays inside the unidentified visitor’s browser and reaches Mango only with permitted identification.

**Acceptance.**
1. The cookie holds only the 20 most recent product views, cart additions and checkout starts within its 30-day session, each with product, variant, quantity and time.
2. Before identification, Mango receives and retains no onsite event, session or identifier; no anonymous visit is counted, profiled, segmented, displayed or shared.
3. A form submission, store login or permitted tracked click links the held browsing to the contact; withdrawal, GPC, refusal or cookie expiry leaves nothing to link.
4. A browser with 25 views holds only the latest 20; network observations, the observations view and the timeline contain nothing for it before identification.

**Evidence.** `tests/shopify/connection.spec.ts`
**Gap.** Shopify signed identified ingest is exercised. Consent buffering, browser-only earlier browsing and absence of anonymous requests/records remain unbuilt and unproved across carriers.

#### CONT-036 — Onsite retention and erasure

Core · target · **missing** · From CONT-018 · Cites BASE-DATA-003

**Requirement.** Identified onsite records have bounded retention and follow the contact’s erasure, while tracking never creates permission or undoes restrictions.

**Acceptance.**
1. Identified events expire 90 days after occurrence and retain no IP address, user agent, referrer, page URL or price.
2. Active on Site occurs once per visit; a visit ends after 30 inactive minutes.
3. Segments, flow triggers and product blocks offer no onsite-history window over 90 days and explain why at 1440 and 390.
4. A carrier’s outbound queue retains an event only until acknowledgment and at most 30 days; the Shopify observation log retains 30 days, and withdrawal records remain until erasure so replays are refused.
5. Contact erasure removes onsite events, identified sessions, withdrawal records and token digests under CONT-013. A browser with an erased session is unidentified until a fresh permitted identification.
6. Onsite tracking never creates a contact, changes consent or topics, reverses an opt-out or removes a surviving restriction.
7. Site tracking settings and the integration guide disclose the cookie, purpose, lifetime, attributes, recorded data, retention periods and honored opt-out signals.

**Evidence.** `tests/shopify/connection.spec.ts`
**Gap.** Shopify signed ingest and present privacy controls exist. Cross-carrier 90-day retention, limited windows, erasure/session/token cleanup and disclosure proof remain unbuilt and unproved.

#### CONT-037 — No cross-site onsite identity

Core · target · **partial** · From CONT-018 · Cites BASE-DATA-004, BASE-PUBLIC-001

**Requirement.** Onsite identity belongs to one storefront, never a cross-site identity or an ad-network feed.

**Acceptance.**
1. A storefront cookie and its identifier are never sent to, shared with or recognized on another site, including another site in the same installation.
2. Mango’s deployment and tracking hosts set no visitor cookie, and snippet calls to the deployment carry no credentials.
3. Onsite event requests go only to the store’s own origin and this deployment; contacts reach ad platforms only through INT-012 under CONT-021.
4. After the storefront journey, the browser has no deployment or tracking-host cookie, and every carrier request has an allowed destination and credential mode.

**Evidence.** `tests/shopify/connection.spec.ts`
**Gap.** Shopify signed ingest and current privacy controls exist. Cross-site cookie, destination, credential and replay assertions across every carrier remain unproved.

#### CONT-019 — US SMS consent capture

Core · target · **partial**

**Requirement.** US SMS capture records express written permission and the recipient’s own confirmation.

**Acceptance.**
1. A blank opt-in box or keyword text-in is accompanied by brand, recurring-automated-marketing, frequency, rates, no-purchase-condition, STOP/HELP and terms/privacy disclosures.
2. Evidence adds the disclosure version, page or keyword, phone, time and capture IP to CONT-003.
3. A form with a pre-checked box or missing disclosure cannot publish.
4. The provider edge sends one confirmation text and only its authenticated confirming reply subscribes the number under the applicable opt-in policy.

**Evidence.** `src/core/features/sms/signup.ts` · `tests/audience-import/signup.spec.ts`
**Gap.** acceptance not yet met: A form with phone capture shows the disclosure, the submission stores every evidence field, the confirmation text is sent once through the provider edge, and only a signed confirming reply subscribes; a pre-checked or missing disclosure blocks the form from publishing.

#### CONT-020 — Engagement-based sunsetting

Core · target · **missing**

**Requirement.** An engagement-based sunsetting label is separate from dormancy and preserves every contact.

**Acceptance.**
1. No click, order, SMS reply or form submission for 180 days labels a contact unengaged; opens do not count.
2. Only campaigns or flow messages that choose engaged-only sending exclude that label; CONT-012 dormancy remains the default exclusion and AUD-008 distinguishes both in review.
3. Unengaged contacts may enter a re-permission flow; suppression occurs only after the operator approves it, records that operator and suppresses exactly the selected contacts without deleting a row.
4. Imported clicks and orders use original times, imported opens count for nothing, and a no-history contact’s 180-day window starts at completed move-in.
5. Review shows the unengaged count and exclusion against imported engagement history.

**Evidence.** None.
**Gap.** not implemented

#### CONT-021 — US privacy requests

Core · target · **partial** · Cites BASE-DATA-003, BASE-AUDIT-001

**Requirement.** Contact privacy requests expose that contact’s own data and exclude requested sharing.

**Acceptance.**
1. Support can record an access request and a do-not-sell-or-share request, with receipt and completion times.
2. Within 45 days, JSON and CSV access exports include profile, consent evidence, events, messages, enrollments and audit references for that contact and no other.
3. Global Privacy Control and a recorded do-not-share request exclude the contact from ad-audience synchronization and every other declared sharing.
4. The next ad-audience sync omits that contact; erasure remains CONT-013.

**Evidence.** `src/core/features/audience/erasure` · `tests/audience-import/erasure.spec.ts`
**Gap.** acceptance not yet met: A Support operator records an access request and a do-not-share request; the export contains every record type for that contact and no other contact; the next ad-audience sync omits the contact.

#### CONT-022 — Contact search and bulk actions

Core · target · **partial** · Cites BASE-OPS-004

**Requirement.** Operators find contacts and apply selected bulk changes with a durable receipt.

**Acceptance.**
1. Search supports email, phone, name, property value, tag, segment and consent state.
2. A selection can be tagged, untagged, exported, suppressed, erased under CONT-013 or added to a topic only with covering consent evidence.
3. Actions over 1,000 contacts run as durable jobs with progress and a receipt.
4. A property search selects the expected people, a 5,000-contact tag job completes, and topic additions name every contact refused for missing evidence.

**Evidence.** `src/core/features/audience/ui/contact-merge.tsx`
**Gap.** acceptance not yet met: A search for a property value returns the matching contacts; a bulk tag of 5,000 contacts completes as a job with a receipt; a bulk "add to topic" refuses contacts without covering evidence and names them.

#### CONT-023 — Custom objects

Core · target · **missing** · Cites BASE-DATA-001, BASE-DATA-003

**Requirement.** Contact-related custom object types make business records usable in targeting and content.

**Acceptance.**
1. Operators define typed object properties and one-to-many or many-to-many relationships to contacts, populated by the events API and integrations.
2. Segments, flow triggers, splits and personalization read related objects, including subscription renewal and plan or pet names.
3. Export includes related objects; erasing their only related contact removes them while an object shared with another contact remains.
4. An API-created subscription triggers a flow 14 days before renewal and personalizes with its plan name.

**Evidence.** None.
**Gap.** not implemented

#### CONT-024 — Incumbent-held consent

Core · target · **partial**

**Requirement.** A source-reported subscriber may enter without Mango reconfirmation only with distinct incumbent-held evidence and the source attestation in CONT-038. This is the named amendment to the earlier archive move-in interpretation.

**Acceptance.**
1. Move-ins from every named incumbent, owner-identified incumbent exports and connected stores accept incumbent-held evidence alongside Mango-captured evidence.
2. Each row retains source/account or audience, source status, native permission times and level, preserving Mailchimp, Shopify, Klaviyo and matching incumbent fields as documented in the consent mechanism.
3. Evidence time prefers confirmation, then opt-in, then last-change; a source with none uses the export’s explicitly supplied creation time, is labeled time-unknown and may remain subscribed.
4. Without source attestation, imported subscribed rows remain non-subscribed with a named reconciliation reason; with it, eligible fixture rows appear in first-campaign review and no Mango confirmation is sent.
5. SMS is subscribed only with per-row consent time, collection point and express-written-permission disclosure; otherwise it stays non-subscribed and an email re-permission flow may invite a text-in.

**Evidence.** `tests/move-in/archive.journeys.ts` account-export registration via `tests/move-in/incumbent-journey.ts` (Verify move-in): attestation, restrictive states, native export/restore, revocation and retained audit fact; campaign review records eligible contacts relying on that evidence at 1440/390. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) proves populated native restoration.  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) extends the source attestation to the three CSV source presets and both API edge exports.
**Gap.** Mailchimp archive and named CSV/API source attestation and incumbent-held email evidence are exercised through the public preview, apply, campaign-review, native export/restore, revocation and erasure doors at 1440/390. Store connections (INT-001 to INT-006), five-year expiry and positive SMS evidence (A2P hold) remain unproved. A source without a row time requires an explicitly supplied export creation time. No real provider call or consent was used.

#### CONT-038 — Source consent attestation

Core · target · **partial** · From CONT-024 · Cites BASE-AUDIT-001, BASE-DATA-001

**Requirement.** An Owner or Admin attests separately to each source’s subscription scope with a versioned, reviewable record.

**Acceptance.**
1. For each audience/account/store, the attestation names brand/legal sender, category, disclosed frequency, destination jurisdiction and consent wording, or explicitly says the source holds unavailable wording; it confirms the list was not purchased, rented or scraped and covers only subscribed rows.
2. Each statement is an unticked control with a not-sure choice, and the operator types the source name. The displayed wording, version and hash are retained; new wording needs a new attestation for later imports or connections.
3. The record includes operator, role, UTC time, session IP and user agent, source identifier, each statement/answer and covered-row count, bound to its archive or connection and recorded in activity.
4. The attestation remains while any contact relies on it and for five years after revocation; contact erasure removes per-row personal data while retaining this record.
5. DATA-001 exports the record, and each relying contact’s evidence names its attestation, including operator, time, wording hash and answers.
6. Mango does not claim to verify another platform’s collected consent; the identified source record and revocable attestation remain visible.

**Evidence.** `tests/move-in/archive.journeys.ts` account-export registration via `tests/move-in/incumbent-journey.ts` (Verify move-in): attestation, restrictive states, native export/restore, revocation and retained audit fact; campaign review records eligible contacts relying on that evidence at 1440/390. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) proves populated native restoration.  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) extends the source attestation to the three CSV source presets and both API edge exports.
**Gap.** Mailchimp archive and named CSV/API attestation, native export/restore and erasure are exercised. Store-connection attestation and five-year retention/expiry remain unproved; no real provider consent was used.

#### CONT-039 — Incumbent evidence restrictions

Core · target · **partial** · From CONT-024

**Requirement.** Source permission never removes a restriction or supplies missing SMS proof.

**Acceptance.**
1. Non-subscribed source states, pending/transactional/unsubscribed/cleaned/complained rows, and existing Mango unsubscribe/suppression/surviving opt-outs keep their restriction; merge retains the most restrictive state.
2. An uncertain attestation or unattested brand, a role mailbox reserved for abuse/postmaster, and a known country outside the attested jurisdiction import non-subscribed with a named reconciliation reason.
3. An SMS row without both source consent time and collection point, or without the attested express-written disclosure, remains non-subscribed.
4. Future unsubscribe, preference-center changes and other opt-outs apply exactly as for Mango-captured consent.
5. The mixed incumbent fixture preserves unsubscribe and cleaned states, rejects uncertain attestations and ineligible mailbox/jurisdiction rows, and subscribes no row without its qualifying evidence.

**Evidence.** `tests/move-in/archive.journeys.ts` account-export registration via `tests/move-in/incumbent-journey.ts` (Verify move-in): attestation, restrictive states, native export/restore, revocation and retained audit fact; campaign review records eligible contacts relying on that evidence at 1440/390. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) proves populated native restoration.  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) extends the source attestation to the three CSV source presets and both API edge exports.
**Gap.** Mailchimp archive and named CSV/API restrictive-state, revocation and campaign review journeys are exercised. Connected-store intake, full cross-incumbent fields and positive SMS evidence remain unproved; no real consent was used.

#### CONT-040 — Incumbent evidence labeling and revocation

Core · target · **partial** · From CONT-024 · Cites BASE-AUDIT-001

**Requirement.** Incumbent-held evidence remains labeled and can be revoked without disturbing independent Mango-captured permission.

**Acceptance.**
1. Contact pages, contact/account/access exports, list-growth-by-source and reconciliation label incumbent-held evidence with its source; it is never presented as Mango-captured evidence.
2. Campaign review counts eligible contacts relying on incumbent-held permission, and reconciliation counts each evidence kind.
3. Revoking an attestation records its operator and returns every channel relying only on it to non-subscribed before the next hand-off.
4. Channels with independent Mango-captured evidence are unaffected by that revocation.
5. The revoke-and-review journey reads the changed subscription state and retained independent evidence.

**Evidence.** `tests/move-in/archive.journeys.ts` account-export registration via `tests/move-in/incumbent-journey.ts` (Verify move-in): attestation, restrictive states, native export/restore, revocation and retained audit fact; campaign review records eligible contacts relying on that evidence at 1440/390. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) proves populated native restoration.  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) extends the source attestation to the three CSV source presets and both API edge exports.
**Gap.** Mailchimp archive and named CSV/API source attestation and incumbent-held email evidence are exercised through the public preview, apply, campaign-review, native export/restore, revocation and erasure doors at 1440/390. Store connections (INT-001 to INT-006), five-year expiry and positive SMS evidence (A2P hold) remain unproved. A source without a row time requires an explicitly supplied export creation time. No real provider call or consent was used.

#### CONT-025 — Opt-in mode per form and source

Core · target · **partial** · Cites BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** Owners and Admins configure capture modes prospectively per source and channel, including manual entry under RL-101. A change never upgrades existing contacts or silently downgrades earlier subscriptions.

**Acceptance.**
1. Opt-in settings list forms, popups, landing pages, API keys, Zapier/Crank, store connections, incumbent move-ins and manual entry, showing each channel’s mode and evidence requirement.
2. Double mode makes a pending contact and sends one confirmation; single mode records complete capture evidence without email confirmation, while SMS retains express-written permission and its carrier confirmation.
3. Store/move-in modes offer incumbent-held, Pending and Non-subscribed; incumbent-held uses CONT-024 only after attestation, otherwise contacts wait non-subscribed and Settings/dashboard show the waiting count.
4. Default own capture and manual entry is double opt-in. Attested store/move-in email defaults to incumbent-held; SMS retains CONT-024’s separate proof rule.
5. A source-reported subscribed Shopify contact with permission time/level is eligible with no Mango email; a Shopify pending state stays non-subscribed until source subscription, and source unsubscribe remains an opt-out.
6. After switching a source to Pending, the next eligible contact receives exactly one confirmation; Non-subscribed keeps source state only. A hosted single-mode capture sends no confirmation while an unchanged default sends one.
7. Each Owner/Admin mode change is recorded, applies only to future captures, and neither upgrades nor downgrades earlier contacts; attestation revocation is the explicit downgrade route.
8. Public resubscription always follows CONT-027, and manual-entry SMS still requires its own authenticated reply under CONT-026 (RL-101).

**Evidence.** `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/opt-in-journey.ts` — hosted default and single capture, accepted-only capacity, protected resubscription, Admin/Author/Manager/Support permissions, future-only mode changes, activity and Settings at 1440/390; `tests/go-live/sync-integrations.journeys.ts` — API capture fixed double mode, one confirmation and replay; `tests/portability.spec.ts` — native policy restore.
**Gap.** Hosted, kiosk and manual email default/single capture, future-only Owner/Admin changes, activity and restoration are exercised. API mode editing, Shopify incumbent-held/Pending/Non-subscribed acceptance, popup/landing carriers, Zapier/Crank and SMS mode editing remain open. RL-101 settles manual-mode authority without changing status; no real provider consent was used.

#### CONT-026 — Contact added by hand

Core · target · **partial** · Cites BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** An Author or higher role records a hand-captured contact’s permission, with prospective mode authority inherited solely from CONT-025 under RL-102.

**Acceptance.**
1. Entry records email, phone, name and properties, and separately for each channel/topic the permission method, time, wording and affirmative operator attestation.
2. Manual entry defaults to pending with one email confirmation; after an Owner/Admin prospective single-mode change, a new email entry is subscribed with operator-recorded evidence naming its operator.
3. That evidence label remains on the contact page, exports and source-growth report.
4. A manual phone entry receives its confirmation text and stays pending until its own authenticated reply; an email/link confirmation cannot substitute.
5. An existing unsubscribe or suppression remains and its reason is shown; each hand entry appears in activity.
6. An authenticated Support attempt to subscribe is refused with 403.

**Evidence.** `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/manual-entry-journey.ts` — Author hand entry, permission method/time/wording and properties, default confirmation, operator-recorded single mode, exact-message signed SMS YES replies, restriction reasons, Support/Analyst 403 and 1440/390 form/evidence/absent controls; `tests/portability.spec.ts` — operator evidence restore; the same hand-entry journey proves evidence, profile and SMS-sidecar erasure
**Gap.** Author entry, permission fields, properties, default confirmation, operator-recorded single mode, authenticated SMS reply and restricted-role views are exercised. Topic-specific permission awaits CONT-015; unauthenticated access follows BASE-ACCESS-002; legacy API evidence may omit new form-attestation fields. RL-102 adopts CONT-025’s Owner/Admin prospective authority; no real provider consent was used.

#### CONT-027 — Resubscribe through a public form

Core · target · **partial**

**Requirement.** A past email unsubscriber may return through new recipient-confirmed consent, with the same public acknowledgment for every address state. This applies to every public form carrier and both single and double capture modes.

**Acceptance.**
1. New affirmative evidence identifies its form, page, consent-text version, capture IP and post-opt-out time, including opt-outs from preferences, incumbent imports or surviving erasure restrictions.
2. An eligible request sends one confirmation within CONT-042’s allowance, but the channel stays unsubscribed, receives no incentive and is excluded from campaigns and flows until the recipient confirms.
3. Only the recipient’s affirmative action from the emailed link confirms; load/scan, a non-affirmative action, replay and a link older than 30 days cannot resubscribe or reverse a later opt-out.
4. Confirmation subscribes only the form’s named topics, preserves other topics, releases an incentive once and emits the distinct resubscribed trigger for flows that explicitly name it.
5. A single-mode form also keeps an earlier unsubscriber unconfirmed until this recipient action.
6. History shows the request, email and confirmation or expiry; form and source-growth reports count resubscriptions separately.

**Evidence.** `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts`
**Gap.** Owner-approved confirmed-only hosted/kiosk resubscription retains the opt-out until recipient POST, records request/handoff/confirmation history, silently caps destination confirmation reservations at three per UTC day and refuses hard-bounce, complaint and owner suppressions. Generic acknowledgments include destination-dependent intake refusals and uncertain/failed delivery without automatic retries. Local browser journeys cover 1440/390 and separate resubscribe growth. Remaining full-clause acceptance: popup/landing and incentive/topic/flow integration, erasure reason preservation and supersession, and expired recreated-contact cleanup; ambiguous legacy erasure-only restrictions remain blocked.

#### CONT-041 — Destination-private resubscription refusals

Core · target · **partial** · From CONT-027 · Cites BASE-ACCESS-003

**Requirement.** Public resubscription cannot disclose a destination’s state or bypass suppression.

**Acceptance.**
1. New, subscribed, unsubscribed, suppressed and allowance-exhausted destinations receive the same generic acknowledgment; an already-subscribed contact receives no mail.
2. Destination-dependent intake, allowance and provider failure preserve that acknowledgment and record an operator-visible refusal; network/challenge admission stays address-independent.
3. This is the named exception to public rate-refusal responses only for destination-dependent confirmation privacy, without granting marketing or incentive authority.
4. Hard-bounce, complaint, provider/operator suppression, legal hold and surviving suppression restrictions send no mail and change no consent or suppression until their cause is resolved through CONT-005.
5. Neither a fresh signup nor a previously issued confirmation bypasses suppression or releases an incentive.
6. An SMS opt-out requires new express-written permission and the confirming reply under CONT-019.

**Evidence.** `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts`
**Gap.** Owner-approved confirmed-only hosted/kiosk resubscription retains the opt-out until recipient POST, records request/handoff/confirmation history, silently caps destination confirmation reservations at three per UTC day and refuses hard-bounce, complaint and owner suppressions. Generic acknowledgments include destination-dependent intake refusals and uncertain/failed delivery without automatic retries. Local browser journeys cover 1440/390 and separate resubscribe growth. Remaining full-clause acceptance: popup/landing and incentive/topic/flow integration, erasure reason preservation and supersession, and expired recreated-contact cleanup; ambiguous legacy erasure-only restrictions remain blocked.

#### CONT-042 — Shared destination confirmation allowance

Core · target · **partial** · From CONT-027

**Requirement.** Confirmation admission bounds mail to one address across every public capture carrier without revealing whether admission succeeded.

**Acceptance.**
1. At most three confirmation reservations and emails per destination per UTC day are shared across public forms and kiosk capture, including requests from different networks.
2. The fourth eligible request sends no confirmation and returns the same acknowledgment; the allowance resets at midnight UTC with confirmation and suppression guards unchanged.
3. An uncertain or failed confirmation hand-off is not retried automatically under the unchanged signup delivery rule.
4. The cross-carrier journey reads the exact email count before and after exhaustion and next-day reset.

**Evidence.** `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts`
**Gap.** Owner-approved confirmed-only hosted/kiosk resubscription retains the opt-out until recipient POST, records request/handoff/confirmation history, silently caps destination confirmation reservations at three per UTC day and refuses hard-bounce, complaint and owner suppressions. Generic acknowledgments include destination-dependent intake refusals and uncertain/failed delivery without automatic retries. Local browser journeys cover 1440/390 and separate resubscribe growth. Remaining full-clause acceptance: popup/landing and incentive/topic/flow integration, erasure reason preservation and supersession, and expired recreated-contact cleanup; ambiguous legacy erasure-only restrictions remain blocked.

#### CONT-043 — Resubscription after erasure

Core · target · **missing** · From CONT-027

**Requirement.** An erased person may give new consent without reviving their former history.

**Acceptance.**
1. An unsubscribe/erasure surviving restriction may start a new request; a suppression surviving restriction remains refused under CONT-041.
2. The request recreates only a new contact and request evidence, then sends confirmation.
3. Confirmed consent creates a new subscribed person with no prior history and marks the retained opt-out as superseded by the new evidence for audit.
4. If no confirmation arrives before expiry, the recreated contact and request are removed and the surviving opt-out is unchanged.
5. The erased-contact journey reads both the newly subscribed empty-history profile and expired-request cleanup.

**Evidence.** `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts`
**Gap.** Hosted/kiosk confirmed resubscription is exercised. Erasure reason preservation, supersession and expired recreated-contact cleanup remain unbuilt/unproved; ambiguous legacy erasure-only restrictions remain refused.

### Target: Audiences

#### AUD-008 — Inactivity rules in review

Core · target · **partial**

**Requirement.** One inactivity rule governs each send, and the operator sees and controls it. By default every campaign step and flow message excludes contacts dormant under CONT-012 (twelve-month window, reason `dormant`). Only a campaign step or flow message that opts in to engaged-only sending also excludes contacts CONT-020 labels unengaged (reason `unengaged`). Review lists the two reasons separately and counts a contact under only one of them (`dormant` when both apply). It also shows how many included contacts are `no-history` (CONT-012) and therefore not excluded, and, within `dormant`, how many are `open-only` (CONT-012), with a one-click action to include just those. An operator with approval rights (OPER-004) can turn the dormancy exclusion off for one campaign in review, as Mailchimp applies no inactivity exclusion unless the sender segments on engagement. An Owner or Admin can also set the installation-wide default (dormancy exclusion on or off, and the window, under `audience.exclusions.v1`), recorded in the activity log, so a sender who never excludes on inactivity does not repeat the step on every send. That choice is part of the approved revision, shows the number of contacts it brings back, is honored by the dispatch recheck (AUD-005) and is recorded with its approver in the activity log (OPER-007). It never affects consent, topic, suppression or opt-out exclusions (AUD-002, CONT-004, CONT-015).

**Acceptance.**
1. a Mailchimp move-in fixture of contacts subscribed two years ago reaches the first campaign's review with no `dormant` exclusion, both for contacts whose `granular_activity` shows a click three months ago and for contacts with no activity rows (counted as `no-history`); a contact whose last imported click is 13 months old is excluded as `dormant`; turning the exclusion off for that campaign includes them, and the approved revision and activity log record the choice and its approver.
2. The review also counts `open-only` contacts within `dormant` and includes them in one action, and an Owner or Admin's installation-wide default is recorded in the activity log.

**Evidence.** `tests/move-in/archive.journeys.ts` · `tests/go-live/roles.journeys.ts`
**Gap.** Review shows dormant/open-only and included no-history counts. An approver can include open-only or disable dormancy for the campaign, with the restored count saved; Owner/Admin defaults under audience.exclusions.v1 copy into new drafts. The immutable approved policy, actor audit and dispatch recheck are exercised. Gap: unengaged (CONT-020), dormant precedence over unengaged, and flow-message inactivity controls remain owed. Existing fieldset, checkbox, numeric input and action patterns suffice; no new design pattern is introduced.

#### AUD-009 — Frequency protection: one policy and a recorded override

Core · target · **partial**

**Requirement.** Campaigns and flows share one frequency policy. Until an operator sets cross-message caps (FLOW-014), AUD-004's default windows apply to every campaign step and flow message. Once caps are set, they replace AUD-004's default windows for campaigns and flows alike, review names the governing rule, and excluded contacts carry `frequency-window` or `frequency-cap` to match. In review, an operator with approval rights (OPER-004) can choose **Ignore frequency protection** for one campaign step, and a flow message can be set the same way in its flow revision, activated under FLOW-008; Klaviyo's Smart Sending can likewise be switched off per message. The choice is part of the approved revision, shows the number of contacts it brings back, is honored by the dispatch recheck (AUD-005) and is recorded with its approver in the activity log (OPER-007). Messages sent under it still count towards later messages' windows and caps. It never overrides consent, topic, suppression or opt-out (AUD-002, CONT-004, CONT-006, CONT-015), SMS quiet hours and state frequency limits (SEND-002, SMS-003), the global holdout (EXP-004) or the SMS spend cap (SMS-006). *Cart and moved-in flows:* campaign sends never block the messages of the abandoned-checkout, abandoned-cart, browse-abandonment, back-in-stock and price-drop library flows (FLOW-012), or of draft flows recreated from Mailchimp journeys and automations (MOVE-008), since Mailchimp does not suppress journeys for campaign sends. Those messages are created with the window set to count only other flow messages, shown in the flow revision and changeable before activation. Every flow's activation shows how many of its sends the governing window would have skipped over the last 30 days of this deployment's own events, and the count it would skip with the setting changed.

**Acceptance.**
1. two campaigns to the same audience are approved four hours apart.
2. With the default, the second excludes everyone the first emailed, with `frequency-window`.
3. With the override recorded at the second's approval, it hands off to them, the override and its approver appear in the activity log, and a contact who unsubscribed between the two sends is still excluded.
4. A contact emailed a campaign in the morning still receives that afternoon's abandoned-cart message from the library flow, and a draft flow made from a Mailchimp journey fixture carries the same setting; its activation shows the 30-day skip count from seeded sends.

**Evidence.** `src/core/features/lifecycle/policies.ts` · `src/core/features/audience/eligibility.ts`
**Gap.** acceptance not yet met: Two campaigns to the same audience are approved four hours apart. With the default, the second excludes everyone the first emailed, with frequency-window. With the override recorded at the second's approval, it hands off to them, the override and its approver appear in the activity log, and a contact who unsubscribed between the two sends is still excluded. A contact emailed a campaign in the morning still receives that afternoon's abandoned-cart message from the library flow, a draft flow made from a Mailchimp journey fixture carries the same setting, and its activation shows the 30-day skip count from seeded sends.

### Target: Campaigns

#### CAMP-013 — Recipient-local send time

Core · target · **missing**

**Requirement.** A campaign step can send at a chosen local time in each recipient's own time zone (for example 10:00 wherever they are), resolved from recorded location evidence with its source and freshness; recipients without a known zone send at that time in the store zone and are counted as such in review. Dispatch starts with the earliest zone, so the campaign is approved at least 26 hours before the earliest local instant or review names the zones that will be missed.

**Acceptance.**
1. a campaign approved for 10:00 recipient-local hands off New York, Chicago and Los Angeles recipients at their own 10:00 in the scheduler journey, and an unknown-zone recipient at 10:00 store time with review showing that count.

**Evidence.** None.
**Gap.** not implemented

#### CAMP-014 — Pause and resume

Core · target · **done**

**Requirement.** An operator can pause a scheduled or dispatching campaign; no further hand-off begins within 30 seconds, recipient-steps already handed off keep their dispositions, and resume continues from the remaining recipient-steps subject to AUD-005 rechecks and the step deadline (CAMP-010). Pause and resume are recorded with their actor.

**Acceptance.**
1. the scheduler journey pauses a two-step campaign mid-dispatch, shows no hand-off during the pause, resumes, and completes with each recipient-step handed off once.

**Evidence.** `tests/go-live/pause.journeys.ts`
**Gap.** None.

#### CAMP-015 — Marketing calendar

Core · target · **missing**

**Requirement.** A month and week calendar shows scheduled and sent campaigns, live flows' expected daily volume and US retail dates (Black Friday, Cyber Monday, Mother's Day, Father's Day, Back to School, Prime Day as the operator configures), with per-day contact pressure so an operator sees when frequency protection (AUD-004) will exclude people. Drag-to-reschedule on a scheduled campaign creates a new draft revision (CAMP-007).

**Acceptance.**
1. the calendar shows a scheduled campaign, a sent campaign and a live flow's estimate on the right days; dragging the scheduled one opens a new draft revision while the approved one stays active.

**Evidence.** None.
**Gap.** not implemented

#### CAMP-016 — Follow-up to non-engaged recipients

Core · target · **done**

**Requirement.** From a sent campaign an operator can create a linked follow-up to recipients who did not click (or, labeled as an estimate under RESULT-002, did not open) after a chosen delay, with a new subject; it is a new campaign that passes its own approval and frequency checks.

**Acceptance.**
1. a follow-up created 48 hours after a send targets exactly the non-clickers minus those excluded at review, and requires its own approval.

**Evidence.** `tests/campaign-results/followup.journeys.ts` · `tests/portability.spec.ts`
**Gap.** None.

#### CAMP-017 — Recurring and RSS-to-email campaigns

Core · target · **missing**

**Requirement.** A campaign can recur (daily, weekly, monthly) or be built from an RSS or Atom feed's new items since the last send. Each instance is a new revision. *Policy: `campaign.recurring.v1`; default: every instance needs approval.* An owner may instead grant standing approval for a recurrence: then each instance sends only if its audience rule and template are unchanged from the approved revision and every approval check (CAMP-004) passes; any failure holds that instance for review.

**Acceptance.**
1. an RSS campaign with two new feed items builds a draft containing both, and under standing approval the next instance sends while a changed template holds it for review.

**Evidence.** None.
**Gap.** not implemented

#### CAMP-018 — Duplicate a campaign

Core · target · **done**

**Requirement.** From a campaign in any state, an operator can choose **Duplicate**. The new draft, named "Copy of" the source, carries the source revision's channels, audience rule, content, sender, preheader, tracking choice and step settings. It copies no schedule, approval, audience snapshot, test or result, and it passes its own approval checks against the settings, consent and audience current at that time.

**Acceptance.**
1. duplicating last week's sent campaign yields a draft with no schedule or approval, whose stored body re-parses to the source revision's bytes and whose audience rule and sender match.
2. Editing and approving the copy leaves the source's approved revision and results unchanged.

**Evidence.** `tests/campaign-authoring/browser.spec.ts`
**Gap.** None.

#### CAMP-019 — Test send to typed addresses

Core · target · **partial**

**Requirement.** Beside the configured test addresses (CAMP-008), an operator whose role may approve (OPER-004) can type up to 5 further email addresses or phone numbers for one test send.
- A typed address that is unsubscribed or suppressed on that channel is refused, with the reason named. An SMS test to a typed number also needs that number's CONT-019 consent.
- All test sends, configured and typed, share the installation-wide daily allowance in `seed.json → limits.maxTestSendsPerDay`, default 100 attempted recipient hand-offs per UTC calendar day. One hand-off to one recipient consumes one unit, including a hand-off whose provider outcome is uncertain; a test to two recipients consumes two units. The allowance resets at 00:00 UTC. Before sending, the owner sees the remaining count. A test send whose recipient count exceeds the remaining allowance is refused in full before any hand-off, with the remaining count named. The owner can change the limit by editing `maxTestSendsPerDay` in the source and rebuilding/redeploying; there is currently no Settings control for it.
- Typed sends are marked as tests like every CAMP-008 send. Each typed address is recorded in campaign history and in the activity log (OPER-007).
- This clause is done only when OPER-004 (Manager/Author assignment), OPER-007 (general activity UI), SMS-001 (typed SMS transport) and CONT-019 (typed SMS consent) are done.
-

**Acceptance.**
1. a Manager types two addresses, and both receive the marked test at the mail edge.
2. A third, unsubscribed address is refused and named.
3. An Author has no typed-address field, and the route refuses it with 403.
4. The activity log lists the typed addresses.
5. Before sending, the owner sees the allowance remaining; a two-recipient test reduces it by two, and a hand-off with an uncertain provider outcome still consumes one unit.
6. With one unit left, a two-recipient test is refused before either hand-off and names the remaining one.
7. Crossing 00:00 UTC restores the configured allowance without carrying the prior day's attempts forward.
8. Configured-address tests and typed-address tests draw from the same count.

**Evidence.** `tests/go-live/typed-tests.journeys.ts` · `src/core/features/lifecycle/test-send-allowance.ts` · `src/core/features/lifecycle/test-destinations.ts`
**Gap.** Up to five typed email recipients receive marked saved-draft tests with opt-out/suppression refusal and destination/actor history. Remaining allowance is visible; whole-request quota admission is atomic and names the remaining count on refusal. Configured and typed attempts share the default 100 attempted hand-offs per UTC day, including uncertain outcomes, with midnight reset exercised. Authors see configured destinations only and typed requests receive 403; assigned Manager typed tests and Author configured tests are exercised by tests/go-live/roles.journeys.ts. Activity lists each typed destination with actor and time, action/object filters and CSV export; contact erasure redacts the destination while retaining the receipt (tests/go-live/typed-tests.journeys.ts, push Verify go-live 8/9, 1440/390). Remaining: typed SMS consent/transport (SMS-001, CONT-019), full role acceptance (OPER-004).

### Target: Message safety

#### MSG-013 — Contact links (mailto:, tel:, sms:)

Core · target · **done**

**Requirement.** Besides HTTPS, a link destination may be one of these:
- `mailto:` with exactly one address that passes CONT-001's address check and, optionally, `subject` and `body` parameters. `cc`, `bcc`, any other parameter and several addresses block.
- `tel:` with one phone number, in E.164 form (`+1…`) or as a 10-digit US number, with visual separators allowed.
- `sms:` with one such number and, optionally, a `body` parameter.
- The builder's link tool (BUILD-001) offers Web, Email, Phone and Text links as first-class kinds and writes these forms; the HTML view accepts them as written.
- A contact link has no host, so it needs no MSG-014 entry. It is never rewritten for tracking and records no click (RESULT-005). The plain-text part shows its address or number. Review lists every contact link with its decoded address or number, subject and body, and MSG-006's malformed-link check applies to each. Image sources stay HTTPS only.
-

**Acceptance.**
1. a draft with `mailto:hello@myshop.example?subject=Order%20question`, `tel:+15555550123` and `sms:+15555550123?body=Hi` approves.
2. Review lists each contact link decoded, and the delivered HTML and plain text carry each one unchanged and unrewritten.
3. `mailto:a@x.example,b@x.example`, `mailto:a@x.example?bcc=c@x.example`, `tel:call-me`, `javascript:alert(1)` and `http://myshop.example` each block approval with the reason named.

**Evidence.** `tests/go-live/contact-links.journeys.ts`
**Gap.** None.

#### MSG-014 — Allowed link and image hosts

Core · target · **partial**

**Requirement.** Settings → Link hosts lists every allowed host with the source it came from. The list starts populated, so a store's normal email needs no settings change:
- *Deployment:* this deployment's own host (its `/media/` images follow the MSG-006 policy).
- *Connected stores:* each connected store's storefront domains (primary and additional) and the hosts its synced catalog uses for product, collection and image URLs. From INT-001 these are, for example, `myshop.com`, `www.myshop.com` and `cdn.shopify.com`; WooCommerce, BigCommerce, Stall and the other store connections (INT-002 to INT-006) contribute theirs the same way. They are refreshed on each catalog sync.
- *Social links:* the web hosts of every network the BUILD-001 social links block offers (for example `www.instagram.com`, `www.facebook.com`, `www.tiktok.com` and `www.youtube.com`). The block's icons are served from the deployment's own media, so they add no image host.
- *Brand kit:* the website and social link hosts named in the brand kit (BUILD-003).
- *Operator entries:* hosts typed in settings, allowed from review (MSG-015) or allowed from a move-in report (MOVE-011).
- *Matching:* each entry is an exact host, unless an operator explicitly enters a subdomain entry such as `*.myshop.com`, which covers every subdomain of `myshop.com` but not `myshop.com` itself. Approval, flow activation, the link inspector and tracking use this one matching rule.
- *Changes:* removing an entry is recorded and keeps it removed, so a later store sync does not re-add a host an operator removed. Disconnecting a source removes its derived entries from later checks. Every change is in the activity log (OPER-007). An allowed host still passes the rest of MSG-006: redirects are followed and checked, and private-network addresses and unreachable links still block.
-

**Acceptance.**
1. on a fresh installation with a connected Shopify edge store, settings lists the deployment host, `myshop.com`, `www.myshop.com`, `cdn.shopify.com` and the social link hosts, each with its source.
2. A campaign with a catalog product block (a `cdn.shopify.com` image and a `myshop.com` link), a social links block and `mailto:` and `tel:` footer links (MSG-013) approves with no settings change.
3. A `shop.myshop.com` link blocks until an operator adds `*.myshop.com`, and then passes.
4. `myshop.com.evil.example` still blocks.
5. A host the operator removed is not restored by the next store sync.

**Evidence.** `tests/go-live/content-checks.journeys.ts` · `tests/go-live/content-hosts.ts` · `tests/portability.spec.ts`
**Gap.** Fresh installations list deployment, conservative social defaults and genuine configured connection hosts with sources. Exact and explicit wildcard matching stays shared; durable operator removals survive catalog sync, review allowances retain source/operator/campaign, and source changes are audited. Existing explicit policies remain explicit. Acceptance remains unmet: Shopify does not store primary/additional storefront or catalog image domains; product/social blocks (BUILD-001), brand kit (BUILD-003), Shopify disconnect and flow activation are absent. The existing store-owned editor help incorrectly describes implicit subdomain matching and is not changed in this writer. Social vocabulary approval is pending.

#### MSG-015 — Allow a blocked host from review

Core · target · **done**

**Requirement.** Campaign review and flow activation list each blocked host with the links that use it.
- An operator whose role may approve (Manager, Admin or Owner; OPER-004) can choose **Allow this host**, or the subdomain entry for its domain, beside it. The host joins MSG-014's list with the source `allowed in review`, the campaign or flow and the operator. The change is recorded in the activity log (OPER-007), and the checks run again at once.
- An Author sees the blocked hosts and can request approval, with the blocked hosts named for the approver, but cannot allow a host.
- Contact links (MSG-013) never need this. A host allowed this way still passes every other MSG-006 inspection.
-

**Acceptance.**
1. a link to an unlisted `partner.example` host blocks approval with the host named.
2. An Author's session shows no allow action, and the route refuses it with 403.
3. A Manager's **Allow this host** clears the block, approval passes, and the activity log records the Manager, the host and the campaign.
4. A MOVE-011 imported Mailchimp template with links to three outside hosts reaches review with those three hosts listed, each with the allow action.

**Evidence.** `tests/go-live/content-checks.journeys.ts`
**Gap.** Review names each blocked host and its links, including redirect hosts. Authors see no allow action and receive 403; a Manager allows a host, the stored list appends it, checks rerun and approval passes. The append-only row names operator, host and campaign through Owner/Admin GET /api/activity, newest first with operator/action/object filters. An imported Mailchimp template lists three outside hosts with allow actions at 1440/390. Exact and explicit wildcard matching agree across approval, inspection and tracking; deceptive suffixes remain blocked. OPER-007 inherits the full cross-product screen, CSV and every action type (ct pattern 2, c4 authorized default).

### Target: Results

#### RESULT-007 — Click map, per-link clicks and clicker lists

Core · target · **partial**

**Requirement.** Each tracked link in a sent campaign or flow message is identified within its revision by position and destination, and every click fact records the link it came from. Campaign and flow-message reports show, per link, total and unique non-automated clicks, plus the automated requests retained but excluded (RESULT-005). They show this as a table and as a click map over the saved revision's preview. Each link opens the list of contacts who clicked it, with first and last click times. An operator whose role permits it (OPER-004; masked for Analyst) can export that list as CSV or start a segment from it (SEG-006). Unique counts count each contact once per link and per campaign. Erased contacts leave only anonymous counts (CONT-013).

**Acceptance.**
1. a seeded send has three links; some recipients click one link twice, and a known scanner requests every link.
2. The report shows each link's total and unique clicks, with the scanner excluded.
3. One link's clicker list equals the seeded clickers and exports as CSV with the same rows, and a segment started from it holds exactly those contacts.

**Evidence.** `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/reporting-journey.ts`
**Gap.** Campaign links show human totals, unique identified clickers, automated requests, a saved-revision click map, matching clicker CSV and exact saved ID cohorts. Gap: repeated positions with one destination share counts; legacy clicks without destination identity remain unassigned; erased click facts are removed rather than retained as anonymous link counts; campaign-wide unique rollups, flow reports and role masking are absent; very large saved cohorts require CSV.

#### RESULT-008 — Recipients per outcome

Core · target · **partial**

**Requirement.** Each sent campaign and flow message lists its recipients by outcome: delivered; bounced, hard or soft, with the provider's reason; complained; unsubscribed from this send, by link, one-click or reply, with the time; skipped, with the SEND-006 reason; and failed, with the provider error. Each list can be filtered, exported as CSV and used to start a segment, under the role and masking rules of RESULT-007. Its counts equal the campaign's totals (SEND-007), and erased contacts leave only anonymous counts (CONT-013).

**Acceptance.**
1. a seeded send has one hard bounce, one complaint, one unsubscribe from the message and one quiet-hours skip.
2. Each contact is listed under its outcome with the reason, the CSV export matches the lists, and every list count equals the campaign summary.

**Evidence.** `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/recipient-method-journey.ts` · `tests/campaign-results/results.journeys.ts` · `tests/portability.spec.ts`
**Gap.** Message-bound link, one-click and signed SMS reply methods are retained with their first recorded time, shown in the recipient list and CSV and preserved as anonymous counts after erasure. Historical methods remain unknown. Flow messages and role masking remain absent; very large saved cohorts require CSV.

### Capacity

#### SCALE-001 — Capacity for the first buyer

Core · target · **partial**

**Requirement.** One installation holds and sends to the whole first buyer the Product statement names, up to 250,000 contacts, and `seed.json → limits` is at least these floors:
- 250,000 contacts (`maxContacts`) and 250,000 eligible contacts per campaign (`maxEligibleContactsPerCampaign`);
- 250,000 rows per contact import review (`maxContactImportRows`), and the move-in sizes in MOVE-012;
- 25,000,000 stored commerce, onsite and imported activity events (`maxStoredCommerceEvents`).
- 102,400 bytes per email HTML part as sent (`maxEmailHtmlBytes`), with the save limit derived from it (BUILD-012), not set below it.
- 1,000 accepted public signups per hour, sustained, and 100 in one minute across the installation (`signupGlobalPerHour`, `signupGlobalPerMinute`). Per network, 30 accepted signups an hour, 120 when each passes the challenge, and 300 for a kiosk form (FORM-008, FORM-009). The confirmation hand-offs they allow fit inside the email hand-off rate.
- Review computes the exact eligible count for a 250,000-contact audience within 60 seconds. A campaign to it hands off completely within the time the email hand-off rate in `seed.json` allows (under 90 minutes at 3,000 per minute), with SEND-003 progress. Segment membership (SEG-002) and flow triggers (FLOW-002) keep their stated times at that size.
- The limits' `status` becomes load-tested, with the recorded run named in the release evidence. These are floors for the first buyer, not a ceiling: a later raise follows the same load-test evidence.
-

**Acceptance.**
1. a generated installation of 250,000 contacts with a year of order and activity events passes the MOVE-012 move-in, an exact review count within 60 seconds, a complete hand-off to the provider edge at the declared rate with no duplicate (SEND-001), and a segment update within SEG-002's time, with wall time and peak memory recorded against `seed.json → limits`.
2. The intake floor is proved by FORM-008's volume journey.

**Evidence.** `seed.json` · `src/core/features/audience/import-limits.ts`
**Gap.** acceptance not yet met: A generated installation of 250,000 contacts with a year of order and activity events passes the MOVE-012 move-in, an exact review count within 60 seconds, a complete hand-off to the provider edge at the declared rate with no duplicate (SEND-001), and a segment update within SEG-002's time, with wall time and peak memory recorded against seed.json → limits; the per-email size floor is proved under BUILD-012, and the intake floor under FORM-008.

### Growth: forms, popups and landing pages

#### FORM-001 — Hosted and embedded signup

Core · target · **partial** · Cites BASE-PUBLIC-002

**Requirement.** Hosted and embeddable signup capture email and optional SMS permission without granting marketing-send authority.

**Acceptance.**
1. A hosted page and an embed collect valid identities with recorded explicit consent and confirmation under CONT-003/005/009.
2. Before confirmation the public signup remains pending; one valid confirmation subscribes it, while replay and expiry cannot subscribe again.
3. An embed accepts only configured allowed origins.
4. No submission by itself authorizes a campaign or flow hand-off.

**Evidence.** `src/core/features/audience/signup-routes.ts` · `tests/audience-import/signup.spec.ts`
**Gap.** The cited signup journey asserts pending consent, one confirmation, replay and expiry. It does not assert an embedded-origin refusal or absence of campaign/flow authority after submission; the old evidence set has no embed-origin journey.

#### FORM-002 — Popups, flyouts and full-page forms

Core · target · **missing** · Cites BASE-ACCESSIBILITY-001, BASE-PUBLIC-002

**Requirement.** Operators build and display branded growth forms through the storefront carrier appropriate to their site.

**Acceptance.**
1. The builder makes popup, corner flyout, banner and full-page forms with teaser, success and error states; rate refusal shows error rather than success and challenge defaults follow FORM-013.
2. Display can depend on time on page, scroll, desktop exit intent, included/excluded URL, UTM source, referrer, cart value, new/returning status and device.
3. After close a form hides for its chosen days; after submit it stays hidden, and identified subscribers of its topic do not see it.
4. Carriers are a script tag, Shopify theme embed enabled from Mango Settings, WooCommerce/WordPress plugin and Stall integration.
5. Forms load asynchronously without layout shift, contain focus while open and close on Escape under the shared accessibility bar.
6. An exit-intent journey displays once, submits, shows success and remains hidden after reload.

**Evidence.** None.
**Gap.** not implemented

#### FORM-003 — Multi-step capture and incentives

Core · target · **missing**

**Requirement.** Multi-step forms collect permission and release a promised incentive only after recipient confirmation.

**Acceptance.**
1. Capture can collect email then phone with CONT-019 disclosure and chosen typed properties or interests mapped to topics.
2. An incentive is a unique discount code or lead-magnet file and is unavailable until the relevant channel confirms, including confirmed resubscription.
3. A fake or unconfirmed address receives no incentive; a repeat recipient receives the same code rather than another.
4. A two-step journey leaves both channels pending, shows/emails the code only after confirmation and issues no second code on repeat.

**Evidence.** None.
**Gap.** not implemented

#### FORM-004 — Landing pages

Core · target · **missing** · Cites BASE-PUBLIC-001

**Requirement.** Branded hosted growth pages support a campaign’s capture task, without becoming a general website builder.

**Acceptance.**
1. Templates cover lead magnets, waitlists, giveaways, event signups and product launches, with title, description and social-share image.
2. Pages publish on the deployment origin or an operator-pointed custom subdomain with automatic TLS.
3. Each page carries its form, privacy-policy link and sender identity; a lead-magnet file becomes available only after confirmation.
4. A waitlist journey on a custom subdomain confirms a visitor and reads the file; the same file is not found before confirmation.

**Evidence.** None.
**Gap.** not implemented

#### FORM-005 — Form performance and tests

Core · target · **missing**

**Requirement.** A form reports its own acquisition funnel and compares deliberate variants without premature winner claims.

**Acceptance.**
1. Views, submissions, confirmation rate, resubscriptions, allowance refusals by reason and later purchasers are available by device, page and source.
2. Copy, incentive and timing variants use a predeclared winner metric under EXP-005.
3. An equal-session two-variant journey reads separate views, submissions and confirmations, and names no winner before the evidence threshold.

**Evidence.** None.
**Gap.** not implemented

#### FORM-006 — Referral program

Core · target · **missing**

**Requirement.** Confirmed referrals can unlock the operator’s chosen milestone reward.

**Acceptance.**
1. Each confirmed subscriber may receive a personal referral link; referred people complete the ordinary capture and confirmation.
2. Milestones support a code, file or manually fulfilled gift with its fulfillment recorded.
3. Self-referrals, disposable domains and unconfirmed referrals do not count.
4. Three qualifying referrals unlock the fixture milestone and send one reward email; an unconfirmed fourth and self-referral add nothing.

**Evidence.** None.
**Gap.** not implemented

#### FORM-007 — Abuse resistance

Core · target · **partial** · Cites BASE-INPUT-001, BASE-ACCESS-003

**Requirement.** Public capture separates abuse admission from subscription authority and preserves address privacy. The detailed edge and challenge protocol is documented in [the consent mechanism](docs/contract/mechanism.md).

**Acceptance.**
1. Invalid sender name, from/reply-to address or physical address is refused before any allowance, signup claim or consent record is stored.
2. The declared body limit, honeypot and configured challenge are checked before capture; a honeypot hit receives the generic acknowledgment without mail.
3. Rate admission uses durable atomic network, destination and global counters at FORM-008/011 levels, persists across restart and stops incrementing at its ceiling.
4. Network identity treats full IPv4 and mapped IPv4 alike and every textual/interface form in an IPv6 /64 as one network; missing or invalid edge IP is refused.
5. Configured challenge verification fails closed on missing, malformed, expired, reused, rejected or unavailable verification, and verifies the expected action and public hostname.
6. An ordinary installation without challenge keys retains all consent, suppression and rate guards; kiosk always requires a fresh challenge.
7. No public response reveals whether an address is already subscribed, unsubscribed or suppressed; FORM-010 owns address-independent rate errors.

**Evidence.** `src/core/features/audience/signup-security.ts` · `tests/audience-import/signup.spec.ts`
**Gap.** The cited signup test asserts body/disclosure rejection, honeypot no-mail, duplicate mail and durable network refusal. It does not assert every sender-before-claim guard, network normalization/restart/counter ceiling, Turnstile action/hostname/reuse/failure mode or status-free acknowledgment for all protected address states; additional challenge tests exist outside the old Evidence cell.

#### FORM-008 — Signup intake capacity

Core · target · **partial**

**Requirement.** Legitimate signup capacity has published accepted-signup floors with isolated bot and carrier budgets under RL-103.

**Acceptance.**
1. Across ordinary carriers, each challenged and unchallenged pool accepts at least 1,000 per UTC hour and 100 per UTC minute; unchallenged traffic cannot consume challenged capacity.
2. Each ordinary network admits at least 30 accepted per hour without a challenge and 120 with a passed challenge, using one accepted counter; refused attempts have a separate allowance of at least 60 per hour.
3. Exhausted refused-attempt admission blocks further unchallenged traffic while a passed challenge can proceed.
4. Kiosk network and installation partitions each admit at least 300 accepted per hour and consume no ordinary pool.
5. The sustained fixture accepts all 600 valid submissions spread across 200 networks and the 100-request minute burst; 200 bot attempts leave the next legitimate signup admitted.
6. The shared-network fixture admits its full 30 and 120 cohorts, and unchallenged-pool exhaustion leaves challenged admission available.

**Evidence.** `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-capacity-journey.ts` — 600 hosted captures on 200 networks, 100-request minute bursts, 200 bot attempts, duplicate claim, shared network, unchallenged isolation, Owner/Admin settings and 1440/390; `tests/audience-import/signup-security.spec.ts`; `tests/audience-import/signup-reservation-clock.spec.ts` — actual D1 admission interval across minute rollover — global last slot, IP grouping and token replay/expiry; `tests/audience-import/signup-reservation-clock.spec.ts` — database admission clock; `tests/portability.spec.ts` — populated upgrade and capacity restore.
**Gap.** Hosted capacity, separate pools, shared network, bot isolation, duplicate claims and settings are exercised. Popup/flyout/full-page/landing carriers remain open; their absence does not waive the published sustained 1,000/hour floor. RL-103 adopts these capacity choices without promoting status.

#### FORM-011 — Accepted-only signup accounting

Core · target · **partial** · From FORM-008

**Requirement.** Signup allowances charge accepted captures rather than bot failures, retain uncertain hand-off reservations and protect each destination.

**Acceptance.**
1. Only a valid, eligible, non-duplicate capture that passes sender, body, challenge, honeypot, field and disclosure checks spends the accepted global allowance.
2. Honeypot, failed/missing/malformed challenge, malformed/oversized body, protected destination and pending duplicate spend none of that pool.
3. A reservation lost to a concurrent duplicate before any hand-off is returned; after a hand-off attempt it remains spent whether the outcome is certain or uncertain.
4. Single and double modes both spend accepted capacity; single-mode capture sends no confirmation and spends no destination confirmation reservation. Repeating a subscribed single-mode address changes nothing.
5. Three confirmation reservations per address per UTC day remain shared under CONT-042, with status-free acknowledgments under CONT-041.
6. The race fixture leaves exactly one reservation spent and reads counters around bot and duplicate traffic.

**Evidence.** `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-capacity-journey.ts` — 600 hosted captures on 200 networks, 100-request minute bursts, 200 bot attempts, duplicate claim, shared network, unchallenged isolation, Owner/Admin settings and 1440/390; `tests/audience-import/signup-security.spec.ts`; `tests/audience-import/signup-reservation-clock.spec.ts` — actual D1 admission interval across minute rollover — global last slot, IP grouping and token replay/expiry; `tests/audience-import/signup-reservation-clock.spec.ts` — database admission clock; `tests/portability.spec.ts` — populated upgrade and capacity restore.
**Gap.** Built: separate challenged/unchallenged 1,000/hour and 100/minute pools, one network accepted count at 30/120, separate 60 refused attempts, destination 3/day, kiosk 300 partitions, atomic accepted-only claims and pre-handoff loser refunds, Owner-only next-window raises with floor/ceiling and activity, per-form challenge default and Owner/Admin toggles, mandatory kiosk verification, five-minute one-use tokens and missing-key Home warning. Defaults ADOPTED per ct's landed text; ct approval of the landed default remains pending. Popup/flyout/full-page/landing carriers (FORM-002 to FORM-004), FORM-005's report surface remain open. Single-opt-in accepted captures are exercised under CONT-025. Hosted form is the existing volume/shared-network door; no clause sentence changed. No real provider call or consent was used.

#### FORM-012 — Owner-controlled signup allowance raises

Core · target · **partial** · From FORM-008 · Cites BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** Owners may raise published signup allowances prospectively within the delivery ceiling, preserving their floors.

**Acceptance.**
1. Each allowance starts at its published floor, including ordinary challenged/unchallenged, network, refused-attempt, destination and separate kiosk partitions.
2. Settings at 1440 and 390 shows every level, its floor and the declared email hand-off ceiling of 3,000 per minute.
3. Only the Owner raises a level; a raise takes effect from the next UTC hour/minute/day window and records one activity entry.
4. An Admin’s raise, a cut below a floor and a raise beyond the delivery ceiling are refused with a named reason.
5. Confirmation hand-offs admitted by raised limits remain inside the declared hand-off rate.

**Evidence.** `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-capacity-journey.ts` — 600 hosted captures on 200 networks, 100-request minute bursts, 200 bot attempts, duplicate claim, shared network, unchallenged isolation, Owner/Admin settings and 1440/390; `tests/audience-import/signup-security.spec.ts`; `tests/audience-import/signup-reservation-clock.spec.ts` — actual D1 admission interval across minute rollover — global last slot, IP grouping and token replay/expiry; `tests/audience-import/signup-reservation-clock.spec.ts` — database admission clock; `tests/portability.spec.ts` — populated upgrade and capacity restore.
**Gap.** Built: separate challenged/unchallenged 1,000/hour and 100/minute pools, one network accepted count at 30/120, separate 60 refused attempts, destination 3/day, kiosk 300 partitions, atomic accepted-only claims and pre-handoff loser refunds, Owner-only next-window raises with floor/ceiling and activity, per-form challenge default and Owner/Admin toggles, mandatory kiosk verification, five-minute one-use tokens and missing-key Home warning. Defaults ADOPTED per ct's landed text; ct approval of the landed default remains pending. Popup/flyout/full-page/landing carriers (FORM-002 to FORM-004), FORM-005's report surface remain open. Single-opt-in accepted captures are exercised under CONT-025. Hosted form is the existing volume/shared-network door; no clause sentence changed. No real provider call or consent was used.

#### FORM-013 — Signup challenge defaults and configuration

Core · target · **partial** · From FORM-008 · Cites BASE-ROLE-001, BASE-AUDIT-001, BASE-SECRET-002

**Requirement.** Growth carriers start with a verified challenge and expose configuration problems before traffic is accepted.

**Acceptance.**
1. New popup, flyout, full-page, landing and kiosk forms have challenge enabled; an installation provisions both keys and Home warns when public forms lack them.
2. Only Owner/Admin can disable a non-kiosk challenge and the change is recorded; Author/Manager cannot disable it, and kiosk cannot disable it at all.
3. Each token is server-verified once within five minutes; a second use is refused.
4. Key configuration is all-or-nothing; the documented challenge protocol bounds token length and verification time and checks action and hostname.
5. The carrier journey reads new-form defaults, allowed/denied toggles, activity and failed token replay.

**Evidence.** `tests/go-live/shared-kiosk.journeys.ts` via `tests/go-live/signup-capacity-journey.ts` — 600 hosted captures on 200 networks, 100-request minute bursts, 200 bot attempts, duplicate claim, shared network, unchallenged isolation, Owner/Admin settings and 1440/390; `tests/audience-import/signup-security.spec.ts`; `tests/audience-import/signup-reservation-clock.spec.ts` — actual D1 admission interval across minute rollover — global last slot, IP grouping and token replay/expiry; `tests/audience-import/signup-reservation-clock.spec.ts` — database admission clock; `tests/portability.spec.ts` — populated upgrade and capacity restore.
**Gap.** Hosted/kiosk challenge defaults, toggles, token replay and missing-key warning are exercised. Popup/flyout/full-page/landing carriers and their provisioning proof remain open; RL-103 preserves all those obligations.

#### FORM-009 — Kiosk and event forms

Core · target · **partial**

**Requirement.** A shared kiosk captures one visitor at a time without carrying identity to the next.

**Acceptance.**
1. A marked kiosk/event form opens full-screen and, after success, resets every field and consent control to blank within five seconds.
2. It never prefills or remembers a previous visitor, sets no identifying cookie or storage and supplies no identity for a later onsite visitor.
3. Every submission requires its own fresh challenge; a missing or unverified challenge makes no contact.
4. At least 300 accepted signups per hour fit one kiosk network under FORM-008, and the 30-browser-signup cohort completes with independent challenges.
5. Consent evidence records kiosk capture and its device label; confirmed-source growth reports show that source separately.
6. Ordinary consent, confirmation and destination allowances still apply, and marking/unmarking a kiosk records its operator and time in activity.

**Evidence.** `tests/go-live/shared-kiosk.journeys.ts` · `src/core/features/audience/signup-routes.ts` · `src/core/features/audience/ui/kiosk-signup-page.tsx` · `migrations/core/0075_kiosk_forms.sql`
**Gap.** The cited kiosk journey asserts blank fields/consent controls, 300 confirmations from one network, no cookies/storage, mandatory challenge/no contact, source report and attributed marking. It does not assert full-screen geometry or prove that kiosk facts cannot identify a later CONT-018 visitor; screenshots and empty browser storage alone do not prove the latter. Original FORM-008 provisioning and ordinary intake obligations stay there.

#### FORM-010 — Refused signups are never silent

Core · target · **partial** · Cites BASE-OPS-004, BASE-AUDIT-001

**Requirement.** A refusal is visible to the affected visitor where privacy permits and to the operator on every promised report surface. RL-104 retains FORM-005’s per-form report, Home alert and hourly activity summary.

**Acceptance.**
1. An address-independent network/global/kiosk refusal returns 429 with remaining-window Retry-After, preserves entries and displays error rather than success or an incentive promise.
2. Destination-dependent confirmation refusal instead uses CONT-041’s identical acknowledgment, sends no extra mail and grants no subscription or incentive authority.
3. FORM-005 reports refusal counts by form, reason (network, destination or global) and hour; Settings may expose immediate counts without replacing that report.
4. A global or network refusal in the past hour raises a Home alert with count and links to the form and allowance setting.
5. Each hour with refusals has one activity summary with counts by form and reason and no addresses.
6. The over-limit and fourth-destination journeys read the appropriate response and report, Home and activity counts for both cases.

**Evidence.** `tests/go-live/shared-kiosk.journeys.ts` — shared kiosk / refusal screens at 1440 and 390; `tests/go-live/signup-refusal-screens.ts`; `tests/audience-import/signup-security.spec.ts` — “security: durable global allowance advances monotonically, reserves its last slot atomically and survives restart”; `tests/audience-import/signup-reservation-clock.spec.ts` — D1 clock; `tests/go-live/resubscribe.journeys.ts` — fourth destination request; `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/activity-log.ts` — hourly summary.
**Gap.** Hosted/kiosk errors, retained entries, generic destination acknowledgment, Home and activity are exercised. FORM-005’s per-form report remains required and unbuilt under RL-104; Settings counts do not replace it. Other growth carriers remain open.

### Segments and predictions

#### SEG-001 — Segment builder

Core · target · **partial**

**Requirement.** Nested segment conditions cover the buyer’s audience facts and show an explained estimate before an exact campaign review.

**Acceptance.**
1. Nested all/any groups combine typed properties, channel/topic consent and tags.
2. Event conditions combine count, time window and event-property filters; geographic conditions cover US state, ZIP and distance from a ZIP.
3. Product, collection and category conditions work for both purchases and views.
4. Email/SMS click engagement and campaign, link and flow activity conditions are available under SEG-006.
5. RFM/lifecycle and prediction conditions are available under SEG-003/004, with unavailable rather than empty results when evidence is unavailable.
6. The builder’s live estimate and plain-text summary name every condition, while campaign review recomputes exact eligible membership.
7. A saved count/value/time/state segment selects exactly the seeded contacts through review, and changing a nested operator or time window changes only the matching cohort.

**Evidence.** `tests/audience-controls/segments.spec.ts` — “AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable”, via `tests/audience-controls/segment-journey.ts`: nested all/any builder, every summary condition, live estimate, exact per-contact review and approved membership at count/value/time/state boundaries; properties, tags, consent/topics, ZIP/distance, RFM and bought products through review; builder and review at 1440/390 with overflow and accessibility assertions. Collections and categories bought: `tests/audience-controls/segment-catalog.ts` (same case) syncs a Shopify catalog through the sync door (collection IDs drained across pages, taxonomy categories, uncategorized products recorded as null); before the catalog is recorded both conditions report unavailable with no count; the builder at 1440/390 nests US state with an any-group of bought collection and bought category, its plain-text summary names both and its live estimate equals review; review intersects each condition with every contact (bought from the collection on its second page, only from another collection, in the category, only in other categories, in the category only in a future order, no purchase), and after Shopify removes a product from the collection its earlier buyer leaves on recount; review at 1440/390 with overflow and accessibility assertions. `tests/audience-controls/segment-fixture.ts` supplies contacts through scoped integration and products and purchases through Shopify sync; no direct rows. `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/cross-channel-attribution.ts`) selects a contact by a human email or SMS click in the last 7 days through the campaign-authoring audience door and no longer once those clicks are older.
**Gap.** Nested property/tag/consent/geographic/order/catalog and human click selection, summaries, live estimate and per-contact exact review are asserted. Cited old evidence does not assert viewed product/collection/category selection, full named campaign/link/flow activity or prediction-based matching; their dependencies being unfinished does not remove them from this clause. RFM and unavailable-catalog cases are asserted; predictive evidence remains SEG-004.

#### SEG-002 — Live membership

Core · target · **missing**

**Requirement.** Live segment changes can drive flows and preserve unavailable-source truth.

**Acceptance.**
1. Qualifying events, property changes and time-window boundaries change membership within five minutes.
2. Joining and leaving are recorded in contact history and emit events usable by FLOW-002.
3. A stale or unavailable source makes its rule unavailable rather than an empty audience.
4. A qualifying order enters a repeat-buyer segment once, emits one entry event and enrolls its listening flow once.

**Evidence.** None.
**Gap.** not implemented

#### SEG-003 — RFM and lifecycle stages

Core · target · **partial**

**Requirement.** Purchase history produces customer-relative RFM scores and a visible lifecycle stage.

**Acceptance.**
1. Recency, frequency and monetary scores use quintiles across this deployment’s customers and each contact’s own orders.
2. Each contact has new, active, at-risk, lapsed or champion stage, with method and thresholds visible.
3. Scores and stages are recomputed daily.
4. On seeded order history, the stage distribution and a contact’s scores match an independent calculation of the documented method.

**Evidence.** `tests/campaign-results/results.journeys.ts`, `tests/campaign-results/retention-journey.ts`
**Gap.** The old retention journey asserts the five-stage distribution, a customer’s order/recency/frequency/monetary scores and displayed method. It does not advance a daily boundary or assert daily recomputation; the fixed fixture also does not independently recalculate every quintile boundary.

#### SEG-004 — Predictions

Core · target · **missing**

**Requirement.** Customer predictions use only this installation’s sufficient purchase history and show their uncertainty; the contact profile owns no duplicate prediction promise.

**Acceptance.**
1. Predictions provide expected next order date, predicted 12-month USD spend, churn risk and average days between orders.
2. Until at least 500 customers with orders and 180 days of orders exist, predictions say not enough history and their segment conditions remain unavailable.
3. Each prediction shows its method, training date and back-tested error on held-out recent orders.
4. Above/below-minimum fixtures read both the contact profile prediction panel and matching segment availability.

**Evidence.** None.
**Gap.** not implemented

#### SEG-005 — Engagement and lead scoring

Core · target · **missing**

**Requirement.** Operator-defined engagement scores use time-aware weighted behavior rather than opens.

**Acceptance.**
1. Weighted rules for clicks, orders, form submissions, replies and visits with decay score people who have not yet purchased.
2. Segments and splits can read the score, and the contact shows its history.
3. Two clicks and a form submission produce the configured score, which decays after the configured period.
4. Imported clicks use their original times for scoring and decay; imported opens change nothing.

**Evidence.** None.
**Gap.** not implemented

#### SEG-006 — Campaign and flow activity conditions

Core · target · **missing**

**Requirement.** Campaign and flow activity conditions retain named message identities and original engagement times.

**Acceptance.**
1. A named campaign supports sent, delivered, clicked, did-not-click and specific-link conditions; opened/not-opened appears only as a labeled estimate with open tracking enabled.
2. Any/all of the latest N sent campaigns support sent, clicked and did-not-click conditions.
3. Flow conditions cover entered, completed, exited-with-reason and current enrollment; flow-message conditions cover received and clicked.
4. Explained click-based engagement levels are often, sometimes, rarely and never, in the manner of Mailchimp rating conditions.
5. A seeded campaign’s received-but-not-clicked cohort and link-2 cohort are exact, and no-clicks across five campaigns selects exactly those contacts.
6. Imported named campaigns and links behave identically at original click times; the Mailchimp granular history fixture matches named clickers and imported opens satisfy no engagement condition.

**Evidence.** None.
**Gap.** not implemented

### Email builder and content

#### BUILD-001 — Drag-and-drop email builder

Core · target · **partial** · Cites BASE-INPUT-002, BASE-INPUT-003, BASE-ACCESSIBILITY-001

**Requirement.** Operators compose email by dragging, reordering, duplicating and deleting text, image, button, one-to-four-column, spacer, divider, social-link, linked video thumbnail, header, footer, product, product-grid, cart-item, coupon and restricted-HTML blocks. Blocks and sections offer padding, alignment, background and the mobile controls in BUILD-010. Undo, redo and keyboard operation preserve the message. Web, Email, Phone and Text links follow MSG-013 and social hosts follow MSG-014. The builder and HTML view share MSG-009 and MSG-012’s grammar and exact-revision approval, with lossless round trips for valid content.

**Acceptance.**
1. Build, save, reopen and approve a two-column product-and-button email; its stored body re-parses to the same bytes under CAMP-003.
2. At phone email width the columns stack under BUILD-010.
3. Build a full promotional email with header, hero image and button, two text columns, six-item product grid, social links, managed footer and mobile settings; it saves, reopens and approves within BUILD-012’s limit.
4. The builder shows sent size throughout composition.
5. Every listed block and setting supports drag, keyboard, duplicate, delete, undo and redo without losing grammar-valid content in an HTML-view round trip.

**Evidence.** `tests/proposals-decision/decision-routes.spec.ts` — existing PROP-004 saved-content registration via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7): native two-column product/button composition, uploaded image, drag and keyboard reorder, duplicate/delete, undo/redo, padding/alignment, byte-identical save/reopen and HTML-mode round trip, sent-size display, decoded uploaded image in the inert Saved Preview, stacked 375px render and approval; editor at 1440/390 with overflow, hydration and serious/critical axe checks. `tests/campaign-authoring/canonical-save.spec.ts` — existing canonical-save-tree registration via `tests/campaign-authoring/block-builder-journey.ts` and `tests/campaign-authoring/full-promotional-email-journey.ts` (Verify main 4/7): native header, hero, button, two text columns, six manually entered products, social links with deployment-owned icons beside grammar-valid text links, managed footer and mobile controls; drag/keyboard reorder, duplicate/delete for both new blocks, including a reorder while the native icon upload is held; byte-identical reopen and HTML-view round trip; 32,117 stored characters and 33,768 shown/provider-edge HTML bytes within the 102,400-byte limit; 1440/390 overflow, hydration and serious/critical axe checks; stacked 375px rendering with every image decoded and a fluid 600px product image.
**Gap.** The editor offers text, image, button, 1–4 columns, spacer, divider, header, footer, product, a six-item manual product grid and a closed-list social links block, with existing per-block and mobile settings through the MSG-009/012 grammar. Gap: video thumbnail, cart items, coupon and restricted HTML blocks remain unbuilt; exhaustive public-door coverage of every block/settings combination and the complete builder acceptance remain unproved.

#### BUILD-002 — Template library

Core · target · **partial** · Cites BASE-DATA-001

**Requirement.** A library of starter templates for each common job (newsletter, promotion, product launch, welcome, abandoned cart, browse abandonment, post-purchase thank-you, review request, win-back, event invitation, re-permission) and the operator's own saved templates; a template starts a draft or a flow message, and later edits to a template never change saved or approved revisions. Imported designs (DESIGN-004), generated designs (DESIGN-002) and migrated templates (MOVE-001 to MOVE-005) land as templates.

**Acceptance.**
1. an operator saves a draft as a template, starts a second campaign from it, edits the template, and the first campaign's approved revision is unchanged.

**Evidence.** `tests/campaign-authoring/browser.spec.ts` · `tests/portability.spec.ts` · `tests/move-in/archive.journeys.ts` (Verify move-in) · `tests/campaign-authoring/design-import.spec.ts` · `tests/campaign-authoring/design-generation.spec.ts` (Verify main 3/7)  `tests/go-live/contact-links.journeys.ts` (Verify go-live 1/9) imports a restricted-conversion Klaviyo template into the library; `tests/portability.spec.ts` preserves it on native restore.  `tests/campaign-authoring/canonical-save.spec.ts` — existing saved-body round-trip registration via `tests/campaign-authoring/flow-template-journey.ts` (Verify main 4/7; 1440/390) starts a Flows email node from a library template, saves its independent copy, edits the library and reloads the byte-identical flow revision.
**Gap.** Starter and saved templates create independent unscheduled campaigns; updating a template preserves existing drafts and approvals. Mailchimp archive templates enter the library, held conversions stay held, and undo removes an untouched template while preserving edits and independent drafts. The first saved DESIGN-004 import or DESIGN-002 application files its own library template. Library proof at 1440/390 is in the archive journey. Gap: executable migrated flows (FLOW-002), full importer coverage and real-provider sandbox proof remain; MOVE-002/003/005 now have the partial import paths recorded in their own rows.  FLOW-001 email nodes now retain independent subject, preheader, HTML and plain-text copies from the library; they remain draft only.

#### BUILD-003 — Brand kit

Core · target · **missing** · Cites BASE-DATA-004

**Requirement.** The brand kit holds logo, colors, fonts (with email-safe fallback stacks), button style, link color, footer and social links. Given the store's website address, Mango can propose a brand kit by fetching that page once on the operator's request and extracting logo, colors and fonts for the operator to accept or edit. New templates, forms and landing pages start from the kit; changing the kit never alters saved or approved revisions. The kit's website and social link hosts join the allowed link hosts (MSG-014).

**Acceptance.**
1. proposing a kit from a test storefront page at the network edge yields its logo and two colors for review, and accepting it styles a new template.

**Evidence.** None.
**Gap.** not implemented

#### BUILD-004 — Reusable blocks

Core · target · **partial** · Cites BASE-AGENT-007

**Requirement.** A saved block (for example a footer, promotion banner or shipping notice) can be placed in many templates, drafts and flow messages. Editing it updates drafts; for approved campaign revisions and live flow revisions it creates new draft revisions that must pass approval or activation (CAMP-007, FLOW-008).

**Acceptance.**
1. editing a reusable footer updates two drafts and creates a new draft revision of one live flow message, while the live revision keeps sending the old footer until activation.

**Evidence.** `tests/proposals-decision/decision-routes.spec.ts` — existing PROP-004 saved-content registration via `tests/campaign-authoring/block-builder-journey.ts` and `tests/campaign-authoring/reusable-block-journey.ts` (Verify main 6/7; 1440/390): native named reusable footer save/edit, Author mutation refusals, placement in two drafts, a saved template and a FLOW-001 draft email, linked draft-body updates, unchanged approved campaign bytes and a fresh unapproved replacement, stale-version refusal, explicit independent copies and repeated edits reusing the pending replacement. `tests/portability.spec.ts` — DATA-001 complete native records registration (Verify main 5/7) retains prior data and round-trips definitions and placements through native export/restoration.
**Gap.** Gap: live flow revisions and activation (FLOW-008 unbuilt) and template-library sync beyond BUILD-002's copy rule.

#### BUILD-005 — Conditional content

Core · target · **missing**

**Requirement.** A block can be shown or hidden by segment, property, topic, predicted stage or the trigger event's properties, with an "otherwise" alternative; the plain-text part follows the same choice. Preview can render as any chosen contact or as each branch.

**Acceptance.**
1. a VIP-only block appears in the preview as a VIP contact and not as another, and both recipients' plain-text parts match their HTML.

**Evidence.** None.
**Gap.** not implemented

#### BUILD-006 — Dynamic product content

Core · target · **missing**

**Requirement.** At hand-off, product blocks render the trigger’s cart or checkout items with image, title, variant, quantity and current price, the viewed product, or connected-catalog recommendations: bestsellers, new arrivals, recently viewed, frequently bought together and purchase-history personalization. Unpublished or out-of-stock items are omitted. An empty result hides the block or skips the message as chosen. MSG-006 and MSG-014 govern links and images, including connected storefront and asset hosts; a disallowed item is omitted and counted with its reason. Operators can also select products under BUILD-011.

**Acceptance.**
1. An abandoned-cart message with two items renders both with current values.
2. Marking one item out of stock before hand-off omits it; personalized grids omit products the recipient already bought.
3. Each recommendation mode reads the connected catalog at hand-off; unpublished items and disallowed image or link hosts are omitted and counted.
4. With no remaining item, the chosen hide-or-skip behavior applies.

**Evidence.** None.
**Gap.** not implemented

#### BUILD-007 — Coupons

Core · target · **missing**

**Requirement.** A message carries a static code or a unique single-use discount or Stripe promotion code created at hand-off through Shopify, WooCommerce, BigCommerce or Stall. The exact revision contains the discount, expiry and usage limit. Failed creation skips the recipient-step with a named reason; no message without its code is sent. Shopify’s installation authority is part of INT-015.

**Acceptance.**
1. An approved flow message obtains a unique Shopify-edge code per recipient with the approved discount, expiry and usage limit.
2. Failed store-side creation records the coupon-unavailable reason and sends nothing for that recipient.
3. No discount is created outside the exact approved revision.

**Evidence.** None.
**Gap.** not implemented

#### BUILD-008 — Previews and pre-send checks

Core · target · **partial**

**Requirement.** Previews show desktop, mobile, dark-mode approximation and plain text as a chosen contact under CAMP-003. Review locates advisory findings for missing image alt text, heading order, link text, likely spam triggers and sent size at or above 90 percent of BUILD-012’s limit, alongside MSG-006 to MSG-012’s blocking checks. A size advisory identifies measured size, limit and the three largest blocks.

**Acceptance.**
1. Desktop, mobile, dark approximation and plain-text previews render the chosen contact and its fallback safely.
2. Missing image alt text, heading order, link text and likely spam wording each produce a located advisory.
3. A 95 KB draft shows a located size advisory with measured size, limit and the three largest blocks.
4. Acknowledging advisories does not bypass a contrast blocker; correcting the blocker and acknowledging the current revision permits approval.
5. A 110 KB body is refused at save under BUILD-012.

**Evidence.** `tests/go-live/presend-checks.journeys.ts` · `tests/go-live/email-size.journeys.ts`
**Gap.** The cited journeys assert safe contact/fallback previews, each located advisory, size detail and largest blocks, contrast refusal, no recipient effect on refusal and oversized save rejection. Gap: after correcting and acknowledging findings, approval is called and returns success but the cited files do not assert the persisted approval state or saved approval record; rendering a preview region is not that assertion.

#### BUILD-009 — SMS and MMS composer

Core · target · **partial**

**Requirement.** The SMS editor counts characters and GSM-7 or UCS-2 segments, estimates per-recipient and total USD cost under SMS-006, uses the branded tracked links in RESULT-005, attaches one carrier-compliant MMS image, applies personalization fallbacks and appends MSG-005’s compliance text.

**Acceptance.**
1. a message with an emoji switches to UCS-2 and shows the new segment count and cost; the preview shows the short link and STOP text that will be sent.

**Evidence.** `src/core/features/sms/content.ts` · `src/core/features/sms/review-preview.ts`
**Gap.** acceptance not yet met: A message with an emoji switches to UCS-2 and shows the new segment count and cost; the preview shows the short link and STOP text that will be sent.

#### BUILD-010 — Mobile layout the checker can prove

Core · target · **partial** · Cites BASE-INPUT-002

**Requirement.** Built email columns remain readable with or without stylesheet support: they appear side by side at desktop email width and stack in their chosen order on a phone. Responsive settings and the checker follow BUILD-014 and BUILD-013; the detailed compiler authority is recorded in [the mobile mechanism](docs/contract/mechanism.md).

**Acceptance.**
1. Build and save two columns with one mobile-hidden block and another block’s mobile font size, then render the stored body at phone and desktop email widths in standards and quirks modes.
2. At phone width the columns stack; at desktop email width they sit side by side.
3. Removing stylesheet support still stacks phone-width columns without losing content.
4. Preview names the mobile settings that depend on stylesheet support.

**Evidence.** `tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration (Verify main 4/7), via `tests/campaign-authoring/mobile-presentation-journey.ts`: all 138 `tests/support/adversarial-email.mjs` cases, generated/authored CSS and hidden-compliance refusals, exact generated bytes in sent-size accounting, eight stored-body 375/600 standards/quirks renders with/without style, nonblank inert Preview and serious-axe/overflow/hydration proof at 1440/390. `tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration via `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney (Verify main 4/7) edits hide on mobile/desktop, font size, line height, padding and alignment through the native block editor at 1440/390, checks the saved generated body and the resulting 375px computed styles, and audits overflow, hydration and serious axe findings; shell axe runs directly to avoid sandbox child-frame discovery. `tests/campaign-authoring/design-import.spec.ts` exercises the fluid column compiler. `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7) exercises generated column stacking.
**Gap.** Per-block controls now use BUILD-001's block model and the existing generated-only style authority. Gap: nested/horizontal orientation and the complete editor acceptance remain unbuilt or unproved. Preview names hide on mobile/desktop, font size, line height, padding and alignment as dependent on the generated block. Conservative generated-only head style, 8192-byte bound and fail-visible desktop hiding defaults ADOPTED. No registration, timeout, shard count or cap was added or raised.

#### BUILD-013 — Mobile and desktop message checks

Core · target · **partial** · From BUILD-010 · Cites BASE-INPUT-002

**Requirement.** The MSG-012 checker evaluates desktop and mobile email trees in standards and quirks rendering. Compliance content remains visible, and a block hidden at one width passes at the other and remains in plain text.

**Acceptance.**
1. The stored body passes all MSG-012 rules in both width trees and rendering modes.
2. Unsubscribe, postal address and compliance text cannot be hidden.
3. Every other hidden block is visible and checked at the other width and retained in plain text.

**Evidence.** `tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration (Verify main 4/7), via `tests/campaign-authoring/mobile-presentation-journey.ts`: all 138 `tests/support/adversarial-email.mjs` cases, generated/authored CSS and hidden-compliance refusals, exact generated bytes in sent-size accounting, eight stored-body 375/600 standards/quirks renders with/without style, nonblank inert Preview and serious-axe/overflow/hydration proof at 1440/390. `tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration via `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney (Verify main 4/7) edits hide on mobile/desktop, font size, line height, padding and alignment through the native block editor at 1440/390, checks the saved generated body and the resulting 375px computed styles, and audits overflow, hydration and serious axe findings; shell axe runs directly to avoid sandbox child-frame discovery. `tests/campaign-authoring/design-import.spec.ts` exercises the fluid column compiler. `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7) exercises generated column stacking.
**Gap.** Per-block controls now use BUILD-001's block model and the existing generated-only style authority. Gap: nested/horizontal orientation and the complete editor acceptance remain unbuilt or unproved. Preview names hide on mobile/desktop, font size, line height, padding and alignment as dependent on the generated block. Conservative generated-only head style, 8192-byte bound and fail-visible desktop hiding defaults ADOPTED. No registration, timeout, shard count or cap was added or raised.

#### BUILD-014 — Generated mobile presentation

Core · target · **partial** · From BUILD-010 · Cites BASE-INPUT-002

**Requirement.** The builder alone generates responsive presentation from the stored block and section controls. Authors cannot supply a competing style block or hidden-content rule. RL-81 records the closed compiler authority and fallback rules; [the mobile mechanism](docs/contract/mechanism.md) specifies it.

**Acceptance.**
1. Mobile and desktop hiding, chosen stacking order, font size, line height, padding and alignment match saved controls.
2. A desktop-hidden block is absent at desktop email width, present at phone width, and present at both when the generated style is removed.
3. A handwritten style block, class or overriding declaration is refused with a named reason.
4. The generated block is placed in the document head and refuses an over-limit configuration with measured size.
5. Generated selectors and declarations introduce no remote load or author-controlled tracking channel.

**Evidence.** `tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration (Verify main 4/7), via `tests/campaign-authoring/mobile-presentation-journey.ts`: all 138 `tests/support/adversarial-email.mjs` cases, generated/authored CSS and hidden-compliance refusals, exact generated bytes in sent-size accounting, eight stored-body 375/600 standards/quirks renders with/without style, nonblank inert Preview and serious-axe/overflow/hydration proof at 1440/390. `tests/campaign-authoring/canonical-save.spec.ts` — existing saving/approval-tree registration via `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney (Verify main 4/7) edits hide on mobile/desktop, font size, line height, padding and alignment through the native block editor at 1440/390, checks the saved generated body and the resulting 375px computed styles, and audits overflow, hydration and serious axe findings; shell axe runs directly to avoid sandbox child-frame discovery. `tests/campaign-authoring/design-import.spec.ts` exercises the fluid column compiler. `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7) exercises generated column stacking.
**Gap.** Per-block controls now use BUILD-001's block model and the existing generated-only style authority. Gap: nested/horizontal orientation and the complete editor acceptance remain unbuilt or unproved. Preview names hide on mobile/desktop, font size, line height, padding and alignment as dependent on the generated block. Conservative generated-only head style, 8192-byte bound and fail-visible desktop hiding defaults ADOPTED. No registration, timeout, shard count or cap was added or raised.

#### BUILD-011 — Chosen catalog products

Core · target · **partial**

**Requirement.** Operators search the connected catalog by title, SKU, collection or vendor and choose products and variants for a product or product-grid block. Choices retain identifiers; image, title, price, compare-at price and URL come fresh from the catalog at hand-off, while review and preview show current values and read time. Unpublished, deleted and out-of-stock items are omitted and counted; empty blocks hide or skip as chosen. RL-84 records the unavailable-read and save-state treatment.

**Acceptance.**
1. Choose two Shopify-edge products, one with a variant, and preview their current image, title, price, compare-at price, URL and read time.
2. When the edge raises a price before hand-off, the delivered email uses the new price.
3. Unpublished, deleted and out-of-stock selections are omitted at hand-off and counted distinctly on campaign detail.
4. An empty result applies the chosen hide-or-skip behavior; an unavailable catalog read skips with a named cause and never sends stale values.
5. Save retains selected identifiers, including selections that become unavailable, and names current publication or removal work without losing unsaved edits.

**Evidence.** `tests/go-live/multistep.journeys.ts` — [AUD-006] later steps reapply ordinary inclusion, custom exclusions and consent without adding new candidates via `tests/go-live/chosen-catalog-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify go-live 9/9): original synthetic-mango Shopify catalog fixtures prove title/SKU/collection/vendor searches, product and grid selection with a chosen variant, identifier-only HTML round-trip, current values/read time, revision locking, changed price at provider hand-off, unpublished/deleted/out-of-stock hiding, empty hide/skip, unavailable-read skip, visible per-recipient reasons, recovery with a fresh read and campaign counts; picker, previews and outcomes at 1440/390. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/chosen-size-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify local-start 3/3): original synthetic-mango fixtures drive the six-item Shopify picker in a full promotional email above 20,000 stored characters, unchanged reopen and approval; unpublished and out-of-stock selections remain in the save bound, seven-item grids and two-item product layouts are refused, oversize catalog diagnostics name the grid as one block, template/start/duplicate refusals preserve records, browser refusals retain unsaved HTML at 1440/390, restored six-item hand-off bytes equal the shown bound, in-limit tracked title growth sends, and oversized live title growth skips with email-too-large counted on campaign detail. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/catalog-guard-journey.ts` (Verify local-start 3/3): six roles and anonymous have exact search/preview permissions without denied edge reads; an Author places identifiers but cannot approve; non-canonical/overlong state, foreign or malformed gids, mismatched variants, invalid item counts/layouts/providers and extra keys refuse without storing changes, and oversized queries refuse before an edge read; markup and managed-token title payloads stay escaped and opaque, unsafe product URLs and image hosts skip catalog-blocked with campaign counts; template save/start, duplication and follow-up retain identifier-only blocks, measure hidden configured items and read fresh title, price and image values at hand-off.
**Gap.** Gap: WooCommerce catalog picking and hand-off are unimplemented. Imported and flow authoring doors remain unproved; native imported history and MOVE-011 conversion do not create catalog choices. Unavailable hand-off reads skip the recipient-step with catalog-unavailable, counted on campaign detail; stale values never send (ct ruling 25 October).

#### BUILD-012 — Email size the builder and imported templates fit in

Core · target · **partial**

**Requirement.** A full promotional email built in Mango or moved from an incumbent saves, approves and sends within one transmitted-byte limit shared by authoring, imports, generation, templates, duplication, follow-ups and flow messages. The bound includes personalization, tracking, compliance content, responsive styles and each configured product maximum; plain text has its own equal byte limit. The builder and HTML view show the bound while editing. Oversize refusal names measured size, limit and three largest blocks and retains unsaved content. Approval, test send and hand-off remeasure; oversize rendered recipients skip with a counted cause rather than clipped content. [The size mechanism](docs/contract/mechanism.md) specifies measurement.

**Acceptance.**
1. The full BUILD-001 promotional email with a six-item Shopify picker grid and mobile controls saves, reopens unchanged and approves above the former character cap while within the byte limit; shown and provider-edge sizes agree.
2. The named Mailchimp three-column blueprint, filled with fixture content and converted through MOVE-011, becomes a template whose draft saves and reaches approval.
3. An oversize save names measured HTML and text bytes, the shared limit and three largest blocks, preserves the saved revision and keeps unsaved editor content.
4. A 95 KB body shows BUILD-008’s advisory.
5. Every listed reuse and generation door applies the same bound, including the configured maximum dynamic or selected products and audience-derived personalization.
6. Approval, test send and hand-off remeasure; a later expansion over the limit sends nothing for that recipient and is counted on campaign or flow detail.

**Evidence.** `tests/go-live/email-size.journeys.ts` — large newsletters save by transmitted bytes, retain refused edits and recheck expansion at handoff (helpers `tests/go-live/email-size-imports.ts`, `tests/go-live/email-size-reuse.ts`); `tests/campaign-authoring/create-api.spec.ts`; `tests/campaign-authoring/browser.spec.ts` (helper `tests/campaign-authoring/email-size-adoption.ts`); `tests/campaign-authoring/design-import.spec.ts`  · `tests/campaign-authoring/canonical-save.spec.ts` via `tests/campaign-authoring/mobile-presentation-journey.ts` (Verify main 4/7: generated responsive bytes count in sent size) · `tests/proposals-decision/decision-routes.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` (Verify main 6/7, existing PROP-004 saved-content registration): native block-editor sent-size display and unchanged approved body at 1440/390; `tests/campaign-authoring/canonical-save.spec.ts` via `tests/campaign-authoring/block-builder-journey.ts` · blockMobileControlsJourney (Verify main 4/7) proves saved generated bytes after mobile-control edits at 1440/390 and 375px computed styles. `tests/campaign-authoring/create-api.spec.ts` — existing native create registration via `tests/campaign-authoring/reusable-size-journey.ts` (Verify main 4/7) proves an oversized reusable edit reports measured HTML/text bytes, the derived limit and largest sections, preserves the exact linked draft and saved source version, and permits a later valid edit. `tests/campaign-authoring/canonical-save.spec.ts` — existing saved-body round-trip registration via `tests/campaign-authoring/audience-size-journey.ts` (Verify main 4/7): audience-selected save and live meter at 1440/390, widened-audience refusal with measured bytes, limit and three largest blocks, unchanged saved revision, frozen approval and every provider-edge hand-off within the bound; deployment-wide fallback without a selection. The audience journey also proves refused unsaved HTML and widened rules remain in the editor at 1440/390, the 95 KB advisory is acknowledged against the same eligible email identities as approval, and a valid edit recovers. `tests/campaign-authoring/canonical-save.spec.ts` — existing canonical-save-tree registration via `tests/campaign-authoring/full-promotional-email-journey.ts` (Verify main 4/7): a complete manually populated promotional email stores 32,117 characters; the shown 33,768 HTML bytes equal the provider-edge part, including saved analytics expansion, generated responsive styles, managed footer and open-estimate pixel; plain-text bytes also match. `tests/go-live/email-size.journeys.ts` via `tests/go-live/email-size-reuse.ts` retains every reuse refusal, including a new follow-up whose cohort authority is not yet inserted. `tests/local-start/signin-hydration.journey.ts` — [OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff, via `tests/campaign-authoring/chosen-size-journey.ts` and `tests/go-live/chosen-catalog-edge.ts` (Verify local-start 3/3): original synthetic-mango fixtures drive the six-item Shopify picker in a full promotional email above 20,000 stored characters, unchanged reopen and approval; unpublished and out-of-stock selections remain in the save bound, seven-item grids and two-item product layouts are refused, oversize catalog diagnostics name the grid as one block, template/start/duplicate refusals preserve records, browser refusals retain unsaved HTML at 1440/390, restored six-item hand-off bytes equal the shown bound, in-limit tracked title growth sends, and oversized live title growth skips with email-too-large counted on campaign detail. Under ct's ruling of 25 October 2026 at 23:46Z, the existing local-start chosen catalog registration via `tests/campaign-authoring/catalog-riders-journey.ts` proves that a deleted selection remains stored and visibly removed, while unpublished and out-of-stock selections have distinct states at 1440 and 390 and still count in the save bound. Under the same ct ruling of 25 October 2026 at 23:46Z, that registration proves a catalog_unavailable save refusal names the current product and directs publication or removal before saving again, retains unsaved edits without storing changes at 1440 and 390, and re-measures the item after publication; existing email-too-large hand-off refusal proof remains unchanged.
**Gap.** Today's draft/create, store-signal starter, template save/replace/start, duplication, replacement-schedule copy, follow-up, imported-history copy and proposal-adoption doors use measured sent-size refusals with the limit and largest available HTML sections, comparing fallback and expanded saved-name renderings. Browser edits, selected design files and saved source snapshots survive refusal at 1440 and 390. Oversized archive template conversions are held with their measured diagnostic and original archive custody; the import continues, reconciliation distinguishes held conversions from created library templates, and undo removes unchanged held copies. In-limit content saves, reopens, approves and reaches the provider edge within its bound; a later oversized hand-off skips with email-too-large. Saved rule and exclusion membership now bounds displayName through the shared audience evaluator; approval measures its frozen email candidates. Separate raw and escaped maxima stay in D1. Only displayName currently supplies recipient values; other valid keys render their authored fallback. An unresolved new follow-up cohort retains the conservative deployment-wide bound until its membership authority exists. Size advisories retain saved audience and analytics context and recheck the eligible email identities used by approval. Gap: configured dynamic product maxima (BUILD-006), flow messages (FLOW-008), and the Mailchimp `base_boxed_3column_query.html` blueprint acceptance through MOVE-011 remain unproved. Mailchimp blueprint is CC BY-SA 3.0; vendoring waits on an owner licence decision. Existing LayerDoc application shares the design-import compiler; no real design or proposal generation/provider acceptance is claimed.

### Automated flows

#### FLOW-001 — Visual flow builder

Core · target · **partial** · Cites BASE-ACCESSIBILITY-001

**Requirement.** A visual canvas builds an explained flow graph before any activation.

**Acceptance.**
1. Nodes cover triggers, fixed/conditional waits, conditional/trigger/random or A/B splits, email/SMS/push, property/tag changes, webhooks, team notifications, CRM tasks and exits.
2. The canvas zooms and pans, supports keyboard operation and explains each node in plain words; phone users can read it and its details.
3. Validation refuses unreachable nodes, loops without delay and paths without an end.
4. At 1440, the operator builds a three-message welcome flow with a split, sees and fixes an unconnected-node error and saves a draft revision; details remain readable at 390.
5. Stripe subscription events support the inherited renewal-reminder journey.

**Evidence.** `tests/go-live/roles.journeys.ts` via `tests/campaign-authoring/flow-journey.ts` (Verify go-live 6/9): three-message welcome graph with split, unreachable-node validation and repair, keyboard pan/zoom, saved revision reload and 1440/390 accessibility/overflow/hydration; all node-kind explanations, named loop/unended-path validation and delay-cycle acceptance; Author saves, Analyst reads, Support named 403. `tests/portability.spec.ts` (Verify main 4/6 for DATA-001; main 5/6 for erasure authority) exports/restores the draft revision with prior data.
**Gap.** Draft revisions only. Trigger enrolment, including the INT-004 renewal reminder (FLOW-002), and activation (FLOW-008) remain unbuilt. All node kinds have plain explanations; unavailable transports/actions are identified. No flow is enrolled, activated or sent.

#### FLOW-002 — Triggers

Core · target · **missing**

**Requirement.** Events, dates and source changes start the flow they match and expose its current enrollment state on the contact profile under ct’s CONT-017 routing.

**Acceptance.**
1. Triggers cover confirmed topic subscription, distinct confirmed resubscription, segment entry, filtered commerce/form/custom events, added tags and incoming SMS keywords.
2. Commerce events include checkout/cart/product views, placed/fulfilled/refunded orders and subscription starts/cancellations, including Stripe renewals.
3. Clicks may match any link, a specific link of a campaign or flow message, or any message; sent-campaign triggers can pair with a did-not-click wait.
4. Date properties support offsets such as birthdays, anniversaries and renewal-minus-seven-days; viewed-product price drops and restock can trigger.
5. Each trigger declares its source capability and cannot activate without it.
6. Every trigger fixture enrolls only matching contacts once; a one-link click trigger excludes another link’s clicker.
7. The contact profile shows each active enrollment with its current node and preserves its occurrence/source ordering.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-003 — Entry filters and re-entry

Core · target · **missing**

**Requirement.** Entry and continuing eligibility govern enrollment and bounded re-entry.

**Acceptance.**
1. Entry filters can inspect post-start purchase, country and segment status; continuing flow filters are checked before each action.
2. A contact who stops matching exits with a filter-exit reason.
3. Re-entry supports once ever, once per chosen days and every occurrence, without simultaneous duplicate enrollment in one revision.
4. Three checkout triggers within an hour under once-per-seven-days leave one enrollment, and a mid-flow purchase exits before the next action.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-004 — Delays and waits

Core · target · **missing**

**Requirement.** Durable waits choose the right instant or event branch across interruptions.

**Acceptance.**
1. Delays support minutes/hours/days, a recipient-local weekday/time and a condition with a timeout path.
2. Timers fire once within 60 seconds of their instant, never early, after restart, redeploy and outage.
3. A controlled-clock five-minute and two-day journey restarts between waits and reads both due firings.
4. An order wait follows its event branch when an order arrives and its timeout branch otherwise.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-005 — Splits

Core · target · **missing**

**Requirement.** Every split records the evaluated facts behind the contact’s branch.

**Acceptance.**
1. Conditional splits read properties, membership, event history, per-channel permission, predictions and engagement.
2. Trigger splits read triggering-event properties such as cart value or product category.
3. Contacts with $80 and $150 carts take their expected branches, and each enrollment shows the evaluated condition and reason.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-006 — Actions

Core · target · **missing** · Cites BASE-OPS-003

**Requirement.** Non-message flow actions update business records while preserving permission boundaries.

**Acceptance.**
1. Actions update a property, add/remove a tag, notify the team by email/Slack, create a connected-CRM task/note and generate a coupon.
2. A topic action requires covering evidence and otherwise records consent-missing; no action subscribes, resubscribes or unsuppresses a person.
3. Signed webhook actions use the same safe delivery behavior as INT-008.
4. Property/tag/webhook actions run once per enrollment after redelivery, and the no-evidence topic fixture records its refusal.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-007 — Exits and goals

Core · target · **missing**

**Requirement.** Goals and explicit exits stop an enrollment with a readable reason.

**Acceptance.**
1. Named goal events mark conversion; unsubscribe, suppression, erasure, higher-priority-flow entry and manual removal also end enrollment.
2. Every exit retains its reason and time, and a converted contact receives no later message from that enrollment.
3. An abandoned-checkout contact who orders after message one receives no second message and is counted converted with the order value.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-008 — Reviewed activation

Core · target · **missing** · Cites BASE-AGENT-006, BASE-AGENT-007, BASE-AUDIT-001

**Requirement.** An exact flow revision is activated with its declared audience, content and limits. An agent’s activation carries live and external classes; the company’s policy determines its disposition under AGENT-010.

**Acceptance.**
1. Revisions have draft, in-review, live, paused and archived states.
2. Activation atomically validates trigger capability, every message’s approval checks, sender, links/allowed-host action, personalization, coupons, frequency, quiet hours and maximum-per-day/per-contact/optional-end limits.
3. The activating actor is recorded; a live revision sends only its own content to people its trigger and filters admit within its limits.
4. Editing creates a new draft; an edited message does not send before the new exact revision is activated.
5. Activation requires an explicit migration choice: in-flight enrollments finish on the earlier revision or move to matching nodes of the new one, and that choice is recorded.
6. An invalid activation names each failing check; a later matching event sends only the activated message.
7. Activation, pause and archive each appear with actor/time in filterable activity.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-009 — Per-send rechecks

Core · target · **missing**

**Requirement.** Each flow hand-off rechecks current recipient eligibility and records a skip’s consequences.

**Acceptance.**
1. Before hand-off, Mango rechecks channel/topic permission, opt-out, suppression, cross-message frequency, quiet hours, sender reputation, sender evidence and source freshness.
2. A skip names its reason and the node’s chosen continue/exit consequence.
3. A between-message unsubscribe prevents the second and all later messages, and its node records unsubscribed.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-010 — Exactly-once execution

Core · target · **missing** · Cites BASE-OPS-003

**Requirement.** Enrollment-node execution preserves source order and never replays obsolete marketing after an interruption.

**Acceptance.**
1. Each revision/enrollment/node combination has at most one effect under redelivery, restart and redeploy.
2. Duplicate, replayed and out-of-order source events retain source-identity deduplication and occurrence-time order.
3. After an outage, triggers older than the node’s relevance window skip with stale-trigger; cart and browse defaults are seven days.
4. Three replays of one checkout plus a runtime interruption mid-dispatch yield one enrollment and hand-off; eight-day-old carts released after outage are skipped.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-011 — Pause, manual review and stop

Core · target · **missing**

**Requirement.** Operators can suspend selected flow work or stop all marketing hand-offs.

**Acceptance.**
1. A flow pause explicitly chooses whether new triggers queue or are dropped; selected contacts can be removed.
2. A message’s manual mode holds each pending send in its review queue until approved, then sends once.
3. Stop all sending halts every campaign and flow hand-off within 30 seconds until an Owner/Admin resumes.
4. The active-campaign/flow stop journey reads no later hand-off after that bound; resume continues both through their current rechecks.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-012 — Flow library

Core · target · **missing**

**Requirement.** The flow library installs explained editable lifecycle journeys as drafts.

**Acceptance.**
1. Library jobs include welcome, abandoned checkout/cart, browse/site abandonment, post-purchase thanks/cross-sell, review request, win-back, re-permission/sunset, birthday, restock, price-drop, predicted replenishment, VIP/loyalty, renewal reminder and lead nurture.
2. Before activation, each shows expected weekly enrollments from this deployment’s recent events, frequency setting and 30-day skipped count.
3. Cart, browse, restock and price-drop flows are not blocked by campaign sends.
4. The abandoned-checkout draft contains three messages, an order goal and seven-day relevance, with volume calculated from seeded checkout events.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-013 — Flow analytics and path inspection

Core · target · **missing**

**Requirement.** Flow and node reports explain counts, revenue and a contact’s entire route.

**Acceptance.**
1. Each flow/node reports entered, waiting, sent, skipped-by-reason, exited-by-reason, converted and attributed revenue with period comparison.
2. A contact path shows every evaluated filter, split and recheck with its inputs, answering why the person received a message.
3. After a seeded run, every node reconciles entered against waiting, sent, skipped and exited, and one contact path exposes each decision.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-014 — Priority and cross-message frequency

Core · target · **missing**

**Requirement.** Ranked competing messages honor shared per-contact frequency choices.

**Acceptance.**
1. Operators rank flows/campaigns and set cross-email/SMS per-contact caps such as one email/day and three/week.
2. When messages compete, higher priority sends and the other skips with frequency-cap or waits as its node chooses.
3. Configured caps replace AUD-004’s campaign/flow defaults and any override follows AUD-009.
4. The same-day campaign/win-back fixture sends only the higher-priority message and records the other’s cap outcome.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-015 — Sequences

Core · target · **missing**

**Requirement.** A linear sequence offers the Kit/ActiveCampaign day-by-day authoring journey on the same flow behavior.

**Acceptance.**
1. Operators choose emails, days after entry and allowed weekdays/hours.
2. Sequences use the same activation, eligibility rechecks and reporting as flows.
3. A five-email weekday-only sequence entered on Friday sends its first email Monday at the chosen hour.

**Evidence.** None.
**Gap.** not implemented

#### FLOW-016 — Flow portability

Core · target · **missing** · Cites BASE-DATA-001

**Requirement.** Restored flow work remains safely paused until the operator resumes it.

**Acceptance.**
1. Flow definitions, revisions, enrollments, timers and history are restored together.
2. A restored live flow appears paused with unchanged enrollments and sends nothing before explicit resume under fresh rechecks.
3. After resume each previously waiting message sends once.

**Evidence.** None.
**Gap.** not implemented

### Experiments and optimization

#### EXP-001 — Campaign A/B tests

Core · target · **missing**

**Requirement.** A campaign can test two to eight variants of subject, preheader, sender name, content or send time on a test portion (for example 20 per cent) for a set duration, then send the winner to the rest. Every variant is part of the approved revision. The winner metric is click rate, placed-order rate or revenue per recipient (open rate only as a labeled estimate, RESULT-002), declared before sending with its evidence threshold (EXP-005); if no variant clears it by the deadline, the pre-chosen default variant sends.

**Acceptance.**
1. a three-variant subject test sends to the test portion, picks the winner by the declared rule, and sends it to the remainder before the step deadline; a test with no clear winner sends the default and says why.

**Evidence.** None.
**Gap.** not implemented

#### EXP-002 — Multivariate tests

Core · target · **missing**

**Requirement.** A campaign can test combinations of up to four subjects and four content versions (16 cells); review blocks a design whose cells would each receive fewer recipients than the stated minimum for the declared effect size.

**Acceptance.**
1. a 2×2 test on a 40,000-contact audience sends four cells and reports each cell and each factor's effect with intervals.

**Evidence.** None.
**Gap.** not implemented

#### EXP-003 — Flow splits and flow holdouts

Core · target · **missing**

**Requirement.** A flow can split traffic randomly between message versions or paths and can hold out a fixed share of enrollments who receive nothing, so that its incremental conversion rate and revenue are measured against them.

**Acceptance.**
1. with a 10 per cent holdout, the flow report shows conversion and revenue for messaged and held-out groups with the difference and interval.

**Evidence.** None.
**Gap.** not implemented

#### EXP-004 — Global holdout

Core · target · **missing**

**Requirement.** An owner can set an installation-wide holdout (for example 5 per cent of subscribers for 90 days) excluded from all marketing campaigns and flows, to measure the overall incremental revenue of marketing. Holdout members keep their consent and are never shown as unsubscribed.

**Acceptance.**
1. a review excludes the holdout members with the global-holdout cause, and the overview report shows revenue per contact for holdout and messaged groups.

**Evidence.** None.
**Gap.** not implemented

#### EXP-005 — Honest test statistics

Core · target · **missing**

**Requirement.** Every experiment states its method (two-proportion test or Bayesian probability to beat control), sample size, observed difference, interval, and the minimum detectable effect it was powered for; a sample-size calculator runs before sending. No variant is labeled a winner below the declared threshold, and stopping early is allowed only by a rule declared before sending.

**Acceptance.**
1. an experiment with too few conversions reports "no reliable difference" with its interval rather than a winner.

**Evidence.** None.
**Gap.** not implemented

#### EXP-006 — Send-time optimization

Core · target · **missing**

**Requirement.** A campaign step can send to each contact at the hour their own past clicks and orders suggest within a 24-hour window, in their local time, respecting quiet hours, frequency and the step deadline. Imported clicks (MOVE-009) contribute at their original hours; imported opens contribute nothing. Contacts without enough history send at the campaign's chosen time and are counted separately; the report compares optimized sending with a randomized control slice.

**Acceptance.**
1. in the scheduler journey, contacts with seeded click histories receive their own best hours, others the default time, and the report shows the control comparison.
2. Imported clicks (MOVE-009) use their original hours; imported opens provide no send-time evidence and leave contacts without qualifying history at the default.

**Evidence.** None.
**Gap.** not implemented

### SMS, push and other channels

#### SMS-001 — US SMS through Twilio

Core · target · **partial** · Cites BASE-OPS-003, BASE-MAIL-001

**Requirement.** US and Canadian SMS and MMS use the owner’s Twilio account with a Messaging Service and a registered 10DLC, verified toll-free or short-code sender. Signed status callbacks distinguish delivered, undelivered and failed; signed inbound webhooks carry replies. Australian senders retain the Mobile Message adapter, and each destination country selects its registered sender under MSG-001. The connection is made through SMS-008; SEND-001, SEND-005 and SEND-008 govern its recipient-step hand-off and reconciliation.

**Acceptance.**
1. Using an SMS-008 connection and a Twilio network edge, an approved SMS step hands off through its country’s registered sender.
2. Signed delivered, undelivered and failed callbacks retain their distinct outcomes; a replay creates no duplicate fact.
3. Signed replies enter the inbound path.

**Evidence.** `src/core/platform/adapters/mobile-message.ts`
**Gap.** acceptance not yet met: The go-live journey with a Twilio edge sends an approved SMS step, ingests signed delivered and undelivered callbacks once each, and a replayed callback adds no fact, run on a connection made through SMS-008; done only once SMS-008 is done.

#### SMS-002 — Carrier registration status

Core · target · **missing**

**Requirement.** Settings submits and tracks Twilio 10DLC brand and campaign registration or toll-free verification on the SMS-008 account. One pre-filled form uses the business identity, legal name, EIN, business type, website and contact, plus the brand’s sample messages, use case, opt-in description and screenshots and CONT-007 replies. The owner sees one-time and monthly USD fees before submission, fixes rejection reasons beside their fields and resubmits without the Twilio console. MSG-004 requires the sender’s approved registration; fees and carrier charges remain on the owner’s Twilio account.

**Acceptance.**
1. An Owner submits a pre-filled brand and campaign registration to a Twilio edge from Settings without a console step; the edge receives the sample messages and opt-in description.
2. A pending registration blocks SMS approval with the named unregistered-sender reason.
3. A rejection appears beside its field; correcting and resubmitting reaches the edge; approved state clears the block.
4. Toll-free verification and each fee are shown and submitted through the same owner-facing route.

**Evidence.** None.
**Gap.** not implemented

#### SMS-003 — US quiet hours and state rules

Core · target · **partial**

**Requirement.** Marketing texts use the US window of 08:00 to 20:00 in the recipient’s local time and any stricter state frequency rule, including Florida’s same-subject limit. Unknown location blocks hand-off. Recorded address or other location evidence outranks the telephone area code; a phone-only contact retains the area code as named evidence. Where it spans zones, only their window overlap applies. Operators may make the rule stricter. [The SMS mechanism](docs/contract/mechanism.md) records the quiet-hours policy.

**Acceptance.**
1. A scheduled message hands off only while each recipient’s local window permits it, including New York and Los Angeles fixtures.
2. A fourth same-subject Florida text within a day is skipped with the state-frequency cause.
3. A phone-only 305 contact is sent at 10:00 Eastern with area-code evidence shown and deferred at 20:30.
4. A multi-zone area code uses the windows’ overlap, while recorded location evidence takes precedence; an unknown zone sends nothing.

**Evidence.** `src/core/features/sms/policy.ts`
**Gap.** acceptance not yet met: A step scheduled at 19:30 Eastern hands off to New York recipients and defers Los Angeles recipients only if 19:30 Eastern is outside their window; a fourth same-subject text to a Florida number in 24 hours is skipped with `state-frequency-limit`. A phone-only subscriber with a 305 number and no address hands off at 10:00 Eastern with zone source `area-code`, and is deferred at 20:30 Eastern.

#### SMS-004 — Two-way SMS inbox

Core · target · **partial**

**Requirement.** Replies appear in a conversation view per contact and in a shared inbox; operators can answer one-to-one (not marketing, logged under the operator), with compliance keywords still processed first (CONT-007). Replies can be forwarded to HappyToHelp or another help desk through a webhook.

**Acceptance.**
1. an inbound signed reply appears in the inbox and contact timeline; the operator's answer hands off through Twilio once; an inbound STOP opts the number out before the webhook is acknowledged and shows in the thread.

**Evidence.** `src/core/features/sms/inbound.ts`
**Gap.** acceptance not yet met: An inbound signed reply appears in the inbox and contact timeline; the operator's answer hands off through Twilio once; an inbound STOP opts the number out before the webhook is acknowledged and shows in the thread.

#### SMS-005 — Branded short links and MMS

Core · target · **missing**

**Requirement.** SMS links use the owner’s branded short domain and RESULT-005’s per-recipient-step tracking without disclosing the contact. MMS images reuse CAMP-012’s stored asset within carrier limits.

**Acceptance.**
1. a sent SMS's short link records one click for that recipient and redirects to the original URL; a click from a known link-preview bot is retained as automated and excluded from engagement.

**Evidence.** None.
**Gap.** not implemented

#### SMS-006 — SMS cost control

Core · target · **missing**

**Requirement.** Review shows estimated USD SMS cost from segments, recipient count, configured provider rates and carrier surcharges. The owner can set a daily SMS spend cap; dispatch stops before a hand-off would exceed it, with a counted budget cause. RESULT-004 records actual provider costs.

**Acceptance.**
1. a step whose estimate exceeds the cap shows a blocking finding at review; with a cap reached mid-dispatch, remaining recipient-steps skip with the SMS-budget cause.

**Evidence.** None.
**Gap.** not implemented

#### SMS-007 — WhatsApp marketing messages

Core · target · **missing**

**Requirement.** Through the owner's WhatsApp Business account (Twilio or Meta's Cloud API), Mango sends pre-approved WhatsApp templates to contacts with WhatsApp-specific opt-in evidence, with delivery and read receipts as provider facts and opt-out replies honored like SMS.

**Acceptance.**
1. a template campaign to an opted-in contact hands off through the provider edge, records the delivered fact, and an opt-out reply excludes the contact from the next send.

**Evidence.** None.
**Gap.** not implemented

#### SMS-008 — Twilio connection an owner makes in Settings

Core · target · **missing** · Cites BASE-SECRET-001, BASE-ROLE-001

**Requirement.** An Owner connects Twilio in Settings without deployment edits or a redeploy. Mango reads account state, names suspended or trial accounts, creates its own Messaging Service, wires signed inbound and status deliveries and lets the owner choose or buy a number after seeing its price. Moving a number from another service identifies it and requires the person’s confirmation; another service’s routes are unchanged. A signed status callback for a test text to the Owner completes connection. Settings shows credentials, account, service, numbers, registration and callback state with fixes; loss of credentials or service raises Home and email alerts and fences SMS sending. [The Twilio mechanism](docs/contract/mechanism.md) specifies custody and wiring.

**Acceptance.**
1. On a fresh installation without SMS deployment inputs, an Owner connects a Twilio edge from Settings without redeployment.
2. The edge contains Mango’s service with its status and inbound destinations; an existing service is unchanged.
3. Until the Owner test text’s signed callback arrives, SMS approval names missing events; verified storage of that callback passes the step.
4. A signed inbound STOP opts the number out through CONT-007.
5. Credential rotation at the edge raises the Home alert and blocks SMS approval.
6. An Admin cannot connect; number purchase shows price, and moving an assigned number names its old service before the person confirms.
7. Replacing credentials preserves the uncertain-handoff fences, and the labelled developer route follows the owner route.

**Evidence.** None.
**Gap.** not implemented

#### PUSH-001 — Web push

Core · target · **missing**

**Requirement.** A store offers a soft prompt before the browser’s push permission prompt, using owner-held push credentials. Campaigns and flows send title, body, image and link. Browser or Mango withdrawal ends this separate channel subscription.

**Acceptance.**
1. A browser grants permission and receives an approved campaign’s push through a test push service.
2. Revoking permission prevents the next send and records the unsubscribed-push cause.

**Evidence.** None.
**Gap.** not implemented

#### PUSH-002 — Mobile app push and in-app messages

Core · target · **missing** · Cites BASE-SECRET-001

**Requirement.** For a business with its own iOS or Android app, an SDK registers devices against contacts and Mango sends push through APNs and Firebase Cloud Messaging with the owner's credentials, plus in-app messages shown on the next app open, from campaigns and flows.

**Acceptance.**
1. a test app registers a device; a flow push reaches it through the APNs and FCM edges; an in-app message shows once on next open and records its view.

**Evidence.** None.
**Gap.** not implemented

### Deliverability

#### DELIV-001 — Sending providers

Core · target · **partial** · Cites BASE-MAIL-001

**Requirement.** Marketing email uses the owner’s SendGrid, Resend, Amazon SES, Postmark broadcast stream, Mailgun or authenticated SMTP account. Adapters state deduplication, event and lookup capabilities, with SEND-006’s distinctions applied to each. The owner-facing connection and event proof come through DELIV-008 and DELIV-010; deployment-input configuration does not substitute for that journey.

**Acceptance.**
1. Each adapter’s edge journey sends through a Settings connection and displays its capabilities on campaign detail.
2. An SMTP relay without signed events reports only hand-off and acceptance and no delivered count.

**Evidence.** `src/core/platform/adapters/sendgrid.ts` · `src/core/platform/adapters/resend.ts` · `tests/go-live/resend-delivery.journeys.ts`
**Gap.** acceptance not yet met: The go-live journey runs against each adapter's edge and shows the declared capability on the campaign page; an SMTP relay without events never shows a delivered count; run on a connection made through DELIV-008, and done only once DELIV-008 is done.

#### DELIV-002 — Domain setup

Core · target · **partial** · Register R-502

**Requirement.** A setup guide gives the exact SPF, DKIM, DMARC and return-path records for the chosen provider, read from the connected account (DELIV-008), which Mango asks to create the domain authentication for the From domain when none exists, checks them in public DNS (MSG-002), sets up a branded tracking and link domain with TLS, and explains BIMI with the DMARC policy it needs.

**Acceptance.**
1. the sender-verification journey reports each record pass or fail with the record to add, and a tracking domain with a valid CNAME rewrites tracked links to it.
2. On a provider edge with no domain authentication for the From domain, Mango creates it at the edge and shows the edge's records.

**Evidence.** `src/core/features/sender-verification/domain-setup.ts` · `src/core/features/sender-verification/setup-routes.ts` · `tests/go-live/contact-links.journeys.ts`
**Gap.** SendGrid create-if-missing, returned records, public-DNS pass/fail, DMARC/BIMI guidance and CNAME+HTTPS-gated branded links are implemented. Two real proofs each validated an authentication and all four DNS records, then deleted two authentications and ten DNS records in total with zero remaining after each run. Gap: the throwaway tracking CNAME passed but HTTPS transport failed, so real branded-host TLS/rewrite acceptance is unproved. Read-only Cloudflare diagnosis on 22 October found active wildcard certificates and no zone Worker routes: a DNS CNAME alone does not attach the branded hostname to Mango’s redirect handler. Live hosted branded-link proof pending a disposable deployment. Main declined account-wide Worker/D1 credentials; a separately reviewed proof workflow must use the repository’s existing deploy secret and always clean up; no new provider objects were created in c11; the setup guide currently operates on SendGrid, with Resend retaining its existing verification path.

#### DELIV-003 — Bulk-sender compliance dashboard

Core · target · **partial**

**Requirement.** The bulk-sender dashboard shows Mango’s state against Gmail, Yahoo and Microsoft requirements: SPF and DKIM, aligned DMARC, one-click unsubscribe, unsubscribe processing time and complaint rate from signed provider facts, plus Google Postmaster Tools when connected. Until DELIV-010’s event proof completes, the rate says events are not connected. Warnings precede MSG-011’s sending block.

**Acceptance.**
1. with seeded provider facts at a 0.25 per cent complaint rate, the dashboard warns; at 0.3 per cent the MSG-011 block shows the same figures.
2. With no signed event received yet, the complaint rate reads delivery events not connected.

**Evidence.** `src/core/features/lifecycle/reputation-guard.ts` · `tests/go-live/delivery.journeys.ts`
**Gap.** acceptance not yet met: With seeded provider facts at a 0.25 per cent complaint rate, the dashboard warns; at 0.3 per cent the MSG-011 block shows the same figures. With no signed event received yet, the complaint rate reads `delivery events not connected`.

#### DELIV-004 — Domain warm-up

Core · target · **missing**

**Requirement.** For a new sending domain or dedicated IP, Mango proposes a warm-up schedule (daily volume steps over two to six weeks), sends to the most engaged contacts first, and enforces the day's cap across campaigns and flows, deferring the rest.

**Acceptance.**
1. with warm-up on and a 2,000-a-day cap, a 10,000-recipient campaign hands off 2,000 most-engaged recipients on day one and continues the next day within the step deadline or skips with the warm-up-cap cause.

**Evidence.** None.
**Gap.** not implemented

#### DELIV-005 — Mailbox-provider breakdown

Core · target · **done**

**Requirement.** Reports split delivered, bounced, complained and clicked by recipient mailbox provider (Gmail, Outlook and Hotmail, Yahoo and AOL, Apple iCloud, other) and bounce reasons into a stated taxonomy (invalid address, mailbox full, policy block, reputation, content, other).

**Acceptance.**
1. Signed recipient outcomes report delivered, bounced, complained and clicked separately for Gmail, Outlook/Hotmail, Yahoo/AOL, Apple iCloud and other mailboxes.
2. Bounce reasons classify invalid address, mailbox full, policy block, reputation, content and other; seeded Gmail and Outlook bounce facts appear under the right provider and reason.

**Evidence.** `tests/go-live/mailbox-provider.journeys.ts`
**Gap.** None.

#### DELIV-006 — Address quality at intake

Core · target · **missing**

**Requirement.** Forms and imports flag invalid syntax, missing mail exchangers, disposable domains and role addresses separately. Operators decide whether to keep flagged rows, recording that choice. Purchased and rented lists remain outside the product’s boundaries.

**Acceptance.**
1. an import with each kind of flagged row reports them separately; keeping them records the operator's decision.

**Evidence.** None.
**Gap.** not implemented

#### DELIV-007 — Sender evidence renewal without stopping live flows

Core · target · **partial** · Cites BASE-MAIL-001, BASE-OPS-003

**Requirement.** Sender-receipt evidence renews before its expiry or invalidation by provider, DNS, binding or credential changes. Home and email reminders name renewal work and waiting-message counts and deadlines; authenticated receipt-connector results can renew without a person’s click, while published DNS alone cannot. A lapse visibly holds scheduled campaign and flow hand-offs until their send-by deadline, then skips them with the named cause. Renewed work resumes in order within five minutes, at most once, and enrollment history shows the wait. [The renewal mechanism](docs/contract/mechanism.md) retains the reminder schedule and custody.

**Acceptance.**
1. At day 23 after confirmation, Home shows renewal and the mail edge receives the reminder and diagnostic messages; day 29 repeats the final reminder.
2. At day 31 the next live welcome message waits for lapsed sender evidence, and Home counts it with its earliest deadline.
3. Confirming the diagnostic resumes that message within five minutes, once and in original order.
4. A changed DNS signing record raises the same card immediately and holds the next message; a deadline passed during the lapse records its skip cause.
5. With an authenticated receipt-connector fixture, day-23 renewal requires no click.

**Evidence.** `tests/sender-verification/worker.spec.ts` — native Worker renewal proof (day 22/23/29/31, last confirmer and all Owners, diagnostic and reminder replay, provider evidence change, populated 0094 upgrade); `tests/go-live/managed-mail.journeys.ts` — managed relay and authenticated connector renewal, Home at 1440/390 with axe, overflow and hydration checks
**Gap.** PARTIAL: lifecycle approval/hand-off, deadline skip and ordered resume hooks remain in concurrent writers’ lifecycle files; `sender-evidence-lapsed`/`sender-evidence-deadline` are named by the renewal read only, not installed dispatch hooks. Live welcome-flow history waits on FLOW-*. Home/public renewal and the existing minute Cron share the same durable claims. Automatic renewal/reminders require the confirming native operator authority; legacy or restored confirmations need a fresh diagnostic before outbound renewal resumes. Default ADOPTED: last confirmer and every Owner receive reminders, once per evidence period; renewal never confirms on their behalf; configured connector renews only from authenticated diagnostic results. No provider account was used.

#### DELIV-008 — Sending connection an owner makes in Settings

Core · target · **partial** · Cites BASE-SECRET-001, BASE-ROLE-001 · Register R-502

**Requirement.** An Owner connects SendGrid or Resend in Settings without a terminal or redeploy on Managed, Assisted or Free. Permissions are read before mutation, missing permissions are named and overbroad permission is disclosed against the restricted list. The private connection survives restore. Managed transactional mail remains on its relay; Free and Assisted use the connection for sign-in and confirmation once made, with deploy-time owner admission before that. DELIV-010 wires events and DELIV-009 watches the connection. [The connection mechanism](docs/contract/mechanism.md) names provider scopes and encrypted custody; RL-82 records the owner authorization boundary.

**Acceptance.**
1. On fresh Managed and Free installations without mail deployment credentials, an Owner connects each provider edge in Settings without redeployment.
2. No route, page, log or export contains the key; Settings shows only provider, last four characters, connecting person and time, and a private-settings restore retains the connection.
3. On Free, an invited operator’s sign-in mail uses the connected provider; before connection invitations name missing sending configuration.
4. A SendGrid key missing webhook permissions and a sending-only Resend key are each named and create no webhook; broader SendGrid permission is labelled with the restricted list.
5. Admin, Manager and Author cannot connect, replace or disconnect.

**Evidence.** `tests/go-live/delivery.journeys.ts` — MSG-011 case calls `tests/go-live/sending-connection-journey.ts` for completed Connect Activity actor/time, named Admin 403 refusals on review/connect/disconnect (also OPER-004), key scopes/account review before create, signed-or-delete failures, existing-hook preservation/reconnect, encrypted key and export secrecy, signed Owner-check delivery gate and Settings Sending at 1440/390 (Verify go-live 2/9); `tests/audience-controls/sendgrid-forwarding.spec.ts` for unsigned/stale/future signatures and replay; `tests/portability.spec.ts` for populated migration, private connection exclusion and restore without resumed sending. `tests/go-live/resend-connection-journey.ts` extends that MSG-011 registration (Verify go-live 2/9): sending-only key refusal before mutation, six-event disclosed webhook creation, encrypted secret/reconnect reuse including recovery after refused configuration confirmation, unrelated-hook preservation, unsigned/stale rejection, named 401/403/deleted-hook approval blocks and Owner/Admin mail notices, with Settings and Home at 1440/390.
**Gap.** SendGrid and Resend installation-side connections are exercised against synthetic provider and mail network edges; no real provider call, account or consent was used. A fresh installation without deployment mail inputs, Free sign-in through the connection, `delivery-events-silent`, scheduled daily read-back, handoff-unknown key replacement, complete developer-route authority coverage and DELIV-002 domain creation through this connection remain unproved. Request-driven five-minute read-back names revoked keys and missing owned webhooks, fences approval, shows Home alerts and notifies current Owners/Admins; unknown mail handoffs are not replayed. Settings names the route in use and places the labelled developer route after the owner connection form. Developer-only deployment inputs retain their legacy transport authority; read-only operation without a Settings connection remains unbuilt. Restricted scope CRUD behavior is inferred from provider documentation, not real-provider evidence. Conservative disclosed-before-create Owner authorization, signed-or-delete, five-minute timestamp window and id-only ownership defaults are adopted; Default ADOPTED; sandbox proof pending.

#### DELIV-009 — Sending-connection watch and replacement

Core · target · **partial** · From DELIV-008 · Cites BASE-SECRET-001, BASE-MAIL-001, BASE-OPS-005

**Requirement.** Mango inspects its owned webhook at every approval and daily. Revoked credentials, deleted or unsigned delivery configuration or a day of accepted hand-offs without events raise named Home and Owner/Admin email alerts, fence approval and activation, and hold hand-offs until their deadlines. Replacement repeats connection checks and invalidates sender evidence; disconnect removes the private key and owned webhook. Uncertain hand-offs remain unreplayed through either action. The labelled developer route follows the owner route and applies equivalent checks apart from automatic webhook creation.

**Acceptance.**
1. Revoking each provider’s key or deleting Mango’s webhook raises the Home and email notices and blocks approval with the named cause.
2. Disabling signing or a day of accepted hand-offs without signed events raises its distinct cause and applies the same hold, deadline and activation behavior.
3. Replacing a key leaves every uncertain recipient-step unsent and reruns permission, domain, event and sender-evidence work.
4. Disconnect removes the stored key and owned webhook and blocks approval as disconnected.
5. Every connect, replace and disconnect records the actor, time and provider in OPER-007’s activity.
6. Settings shows which configuration route applies, reads the developer route only without a Settings connection and applies equivalent event checks.

**Evidence.** `tests/go-live/delivery.journeys.ts` — MSG-011 case calls `tests/go-live/sending-connection-journey.ts` for completed Connect Activity actor/time, named Admin 403 refusals on review/connect/disconnect (also OPER-004), key scopes/account review before create, signed-or-delete failures, existing-hook preservation/reconnect, encrypted key and export secrecy, signed Owner-check delivery gate and Settings Sending at 1440/390 (Verify go-live 2/9); `tests/audience-controls/sendgrid-forwarding.spec.ts` for unsigned/stale/future signatures and replay; `tests/portability.spec.ts` for populated migration, private connection exclusion and restore without resumed sending. `tests/go-live/resend-connection-journey.ts` extends that MSG-011 registration (Verify go-live 2/9): sending-only key refusal before mutation, six-event disclosed webhook creation, encrypted secret/reconnect reuse including recovery after refused configuration confirmation, unrelated-hook preservation, unsigned/stale rejection, named 401/403/deleted-hook approval blocks and Owner/Admin mail notices, with Settings and Home at 1440/390.
**Gap.** SendGrid and Resend installation-side connections are exercised against synthetic provider and mail network edges; no real provider call, account or consent was used. A fresh installation without deployment mail inputs, Free sign-in through the connection, `delivery-events-silent`, scheduled daily read-back, handoff-unknown key replacement, complete developer-route authority coverage and DELIV-002 domain creation through this connection remain unproved. Request-driven five-minute read-back names revoked keys and missing owned webhooks, fences approval, shows Home alerts and notifies current Owners/Admins; unknown mail handoffs are not replayed. Settings names the route in use and places the labelled developer route after the owner connection form. Developer-only deployment inputs retain their legacy transport authority; read-only operation without a Settings connection remains unbuilt. Restricted scope CRUD behavior is inferred from provider documentation, not real-provider evidence. Conservative disclosed-before-create Owner authorization, signed-or-delete, five-minute timestamp window and id-only ownership defaults are adopted; Default ADOPTED; sandbox proof pending.

#### DELIV-010 — Signed delivery-event connection

Core · target · **partial** · From DELIV-008 · Cites BASE-SECRET-001, BASE-OPS-003, BASE-MAIL-001

**Requirement.** Mango creates and owns one provider webhook for its deployment, leaving every unrelated account setting and webhook unchanged. The person sees the account, destination, event list and signing before creation. Signing failure removes the new webhook; reconnect reuses the owned identifier. Connection completes on a signed event for Mango’s own diagnostic, not a provider test. No-slot accounts see the limit and the documented transparent signed-forwarding route. [The delivery-event mechanism](docs/contract/mechanism.md) lists exact subscriptions and signature rules.

**Acceptance.**
1. Each SendGrid and Resend edge records one disclosed webhook with the required event set and signing; reconnect creates no duplicate and an unrelated webhook is unchanged.
2. If signing cannot be enabled or its key read back, no newly created Mango webhook remains and the step shows failure.
3. Unsigned and stale signed deliveries change nothing.
4. Before a signed Mango diagnostic event, approval and flow activation name missing delivery events; verified storage passes the webhook step.
5. A signed hard bounce suppresses before the next hand-off, while a delivered event shows Delivered on campaign detail.
6. No free webhook slot leaves the provider unchanged and shows its limit plus the forwarding route.
7. Settings shows each permission, domain, DNS, webhook, signing, first-event and sender-check step with its state and fix; Home shows failed steps and reports distinguish unconnected events from zero outcomes.

**Evidence.** `tests/go-live/delivery.journeys.ts` — MSG-011 case calls `tests/go-live/sending-connection-journey.ts` for completed Connect Activity actor/time, named Admin 403 refusals on review/connect/disconnect (also OPER-004), key scopes/account review before create, signed-or-delete failures, existing-hook preservation/reconnect, encrypted key and export secrecy, signed Owner-check delivery gate and Settings Sending at 1440/390 (Verify go-live 2/9); `tests/audience-controls/sendgrid-forwarding.spec.ts` for unsigned/stale/future signatures and replay; `tests/portability.spec.ts` for populated migration, private connection exclusion and restore without resumed sending. `tests/go-live/resend-connection-journey.ts` extends that MSG-011 registration (Verify go-live 2/9): sending-only key refusal before mutation, six-event disclosed webhook creation, encrypted secret/reconnect reuse including recovery after refused configuration confirmation, unrelated-hook preservation, unsigned/stale rejection, named 401/403/deleted-hook approval blocks and Owner/Admin mail notices, with Settings and Home at 1440/390.
**Gap.** SendGrid and Resend installation-side connections are exercised against synthetic provider and mail network edges; no real provider call, account or consent was used. A fresh installation without deployment mail inputs, Free sign-in through the connection, `delivery-events-silent`, scheduled daily read-back, handoff-unknown key replacement, complete developer-route authority coverage and DELIV-002 domain creation through this connection remain unproved. Request-driven five-minute read-back names revoked keys and missing owned webhooks, fences approval, shows Home alerts and notifies current Owners/Admins; unknown mail handoffs are not replayed. Settings names the route in use and places the labelled developer route after the owner connection form. Developer-only deployment inputs retain their legacy transport authority; read-only operation without a Settings connection remains unbuilt. Restricted scope CRUD behavior is inferred from provider documentation, not real-provider evidence. Conservative disclosed-before-create Owner authorization, signed-or-delete, five-minute timestamp window and id-only ownership defaults are adopted; Default ADOPTED; sandbox proof pending.

### Reporting and attribution

#### REPORT-001 — Overview dashboard

Core · target · **partial**

**Requirement.** One page shows, for a chosen period against the previous one: attributed revenue in USD split by campaigns and flows, holdout-measured incremental revenue where a holdout exists (EXP-003, EXP-004), list growth by source, engagement (clicks, conversions), deliverability health, provider costs and top campaigns and flows. Forecasts are never shown as results (PROP-008).

**Acceptance.**
1. with a seeded month of sends, orders and holdout data, each figure on the page matches the underlying records and the incremental figure is labeled separately from attribution.

**Evidence.** `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/overview-journey.ts`
**Gap.** Default ADOPTED: holdout-measured incremental revenue says no holdout configured until EXP-003/004; flows and top flows say no flows yet. No forecast is presented as a result. Campaign attribution/engagement use the detailed performance table’s scheduled-step period; costs, growth and provider facts use occurrence days, with each basis disclosed. Flow and holdout acceptance remains open.

#### REPORT-002 — Campaign and flow performance tables

Core · target · **partial**

**Requirement.** Sortable tables list recipients, delivered, clicks and unique clicks, click rate, unsubscribes, complaints, conversions, revenue and revenue per recipient for every campaign, flow and flow message, filterable by channel, topic and date, exportable as CSV; each campaign and flow message opens its per-link detail (RESULT-007). When an operator has turned open estimates on (RESULT-002), the tables add an open-rate column headed and exported as an estimate, which is never used for ranking a test winner or for attribution.

**Acceptance.**
1. the CSV export of the table equals the on-screen rows for the same filter; with open estimates on, the estimated open-rate column appears on screen and in the CSV labeled as an estimate, and is absent with them off.

**Evidence.** `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/results.journeys.ts`
**Gap.** Campaign revision/channel tables, sorting, topic/channel/UTC date filters, matched CSV, optional open-rate estimates, per-link detail and net attributed revenue by currency are exercised. Gap: flow and flow-message performance awaits the flow engine.

#### REPORT-003 — Attribution for campaigns, flows and SMS

Core · target · **done**

**Requirement.** RESULT-003's policy extends to flows and SMS: one conversion metric (Placed Order by default, or a custom event), a click window per channel (default seven days for email and SMS), at most one attribution per order, refunds and cancellations subtracting, and automated clicks excluded (RESULT-005). The window and metric are shown beside every revenue figure and can be changed, which recalculates reports without changing stored events.

**Acceptance.**
1. an order following an SMS click and an earlier email click is attributed once, to the most recent qualifying click; changing the window to one day recalculates the report.

**Evidence.** `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/cross-channel-attribution.ts` · `tests/campaign-results/custom-attribution.ts` · `tests/campaign-results/attribution-report-ui.ts`
**Gap.** Flow attribution is inherited by FLOW-001/FLOW-002, which remain missing.

#### REPORT-004 — Customer and retention analytics

Core · target · **done**

**Requirement.** Reports show repeat-purchase rate, cohort retention by first-order month, median days between orders, customer value by acquisition source and form, and product affinity (products bought together and next product bought).

**Acceptance.**
1. on a seeded order history, the cohort table and repeat-purchase rate match an independent calculation.

**Evidence.** `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/retention-journey.ts`
**Gap.** None.

#### REPORT-005 — List growth and consent sources

Core · target · **partial**

**Requirement.** Subscriptions, confirmations, resubscribes (CONT-027, counted apart from new subscribers) and unsubscriptions by day, form, landing page, kiosk form (FORM-009), import and integration, with the consent text version each used, so an owner can show where every subscriber came from.
- The membership-history requirement applies from migration 0073 onward. Deleted, erased or merged membership history recorded before migration 0073 cannot be reconstructed and is not claimed. Retained earlier consent captures and confirmations recovered by migration 0074 are labeled as retained evidence and do not imply earlier membership changes.
- This clause is done only when FORM-002 (popup and other dedicated forms), FORM-004 (landing pages), FORM-009 (kiosk capture) and CONT-027 (approved confirmed-only public-form resubscribe) are done.
-

**Acceptance.**
1. growth by source over a seeded period from migration 0073 onward sums to the change in subscribed contacts, and each source links to its consent text version.
2. The period includes captures and confirmations, resubscribes counted separately, unsubscriptions, suppression and removal, across forms, landing pages, kiosk forms, imports and integrations.
3. Opening membership plus the recorded deltas equals closing membership.
4. Deleted, erased or merged membership history recorded before migration 0073 cannot be reconstructed and is not claimed; retained earlier consent evidence is labeled without inferred membership changes.
5. Anonymous counts survive erasure while the erased evidence links do not.

**Evidence.** `tests/go-live/list-growth.journeys.ts` · `src/core/features/insights/list-growth.ts` · `migrations/core/0074_list_growth_retained_history.sql`
**Gap.** Insights reconciles opening/net/closing subscribed membership by UTC day and separates captures/confirmations, opt-outs, suppression and removal, retaining source/version disclosures and anonymous counts after erasure. Real hosted and embedded form capture/confirmation journeys reconcile. Upgrade recovers retained pre-baseline consent captures/confirmations, explicitly labeled with zero inferred membership change; imported dates do not invent earlier local growth. Unavailable pre-baseline membership history is outside the amended history requirement; kiosk capture and confirmation are exercised by tests/go-live/shared-kiosk.journeys.ts. Hosted/kiosk public resubscribe confirmation and separate growth counts are exercised by tests/go-live/resubscribe.journeys.ts. Remaining: dedicated popup/landing-page attribution (FORM-002/004) and the full CONT-027 incentive/topic/flow and erasure-expiry acceptance.

#### REPORT-006 — Scheduled and custom reports

Core · target · **partial**

**Requirement.** Operators save custom reports (a metric by dimensions over time) and schedule any report as a weekly or monthly email or Slack message to chosen operators; scheduled reports contain no contact identities.

**Acceptance.**
1. a weekly scheduled report is delivered once at its time through the mail edge with the same figures as the saved report.

**Evidence.** `tests/go-live/managed-mail.journeys.ts` · `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/saved-report-metric-journey.ts` · `tests/sender-verification/worker.spec.ts`
**Gap.** PARTIAL: Slack requires an unavailable webhook; scheduling currently covers saved provider cost/units and campaign click/conversion/USD attribution reports plus the built-in cost and engagement reports, not every report family or dimension. Default ADOPTED: Owner/Admin only, existing active operator IDs only, email only, no contact identities or per-contact rows, no currency conversion; weekly Monday 09:00 UTC / monthly first-day 09:00 UTC. Delivery refusals and sends are durable/audited; authorization/input refusals intercepted by the existing shared middleware are not yet activity records. Restored or revoked native authority requires explicit enable; uncertain provider outcomes never automatically resend.

#### REPORT-007 — Usage and cost transparency

Core · target · **partial**

**Requirement.** Mango never bills or limits sending by contact count. Settings shows contacts by consent state, and RESULT-004's provider costs (email, SMS, AI, design) by campaign, flow and day with a projected month in USD, so an owner sees exactly what each send cost on their own provider accounts.

**Acceptance.**
1. `tests/campaign-results/costs.journeys.ts` for campaign and day totals; a flow's costs appear under that flow.

**Evidence.** `tests/campaign-results/costs.journeys.ts`
**Gap.** Flow cost grouping waits on flows. Default ADOPTED: projected month is the priced month-to-date UTC run rate extended linearly; each reported currency stays separate with no conversion, and unpriced facts are counted rather than zero.

### Integrations

#### INT-001 — Shopify

Core · target · **partial**

**Requirement.** The owner-facing Mango for Shopify connection in INT-015 and its wiring, sync, trust, disconnection and privacy parts carries customers and Shopify email/SMS marketing evidence, products, variants, collections, inventory, orders, refunds, fulfillments, checkouts, carts and pixel events. Incumbent-held opt-ins use CONT-024 and CONT-025 after checkout disclosure attestation, while Mango opt-outs prevail and write back to Shopify. The connection creates approved BUILD-007 discount codes and offers forms and tracking. A developer connection alone does not meet this merchant-install journey.

**Acceptance.**
1. Run native sync, signed cart and pixel journeys on an INT-015 installation and show every declared source type with source identity and time.
2. A Mango unsubscribe reads back as unsubscribed in the Shopify-edge customer record.
3. CONT-025’s Shopify opt-in journey preserves the attested opt-in mode and Mango’s stronger restriction.
4. Approved discount creation and form/tracking activation use the same installed connection.

**Evidence.** `src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts`
**Gap.** acceptance not yet met: Done only once INT-015 is done. `tests/shopify/connection.spec.ts` (native sync, signed carts, signed pixel), run on a connection made through INT-015's install journey, plus a consent write-back journey: a Mango unsubscribe appears as unsubscribed in the Shopify edge's customer record; and the CONT-025 Shopify opt-in journey.

#### INT-002 — WooCommerce

Core · target · **partial** · Cites BASE-SECRET-001, BASE-OPS-003

**Requirement.** A WooCommerce connection uses REST credentials, signed webhooks and the shipped WordPress tracking-and-forms plugin to synchronize customers, products, orders, refunds and abandoned checkouts. Under RL-83, store enablement begins off, observations require a signed-in customer’s explicit analytics and marketing consent, GPC revokes pending eligibility, and the plugin does not widen subscription permission or track across sites. The plugin’s single protected first-party cookie and observation retention follow [the WooCommerce mechanism](docs/contract/mechanism.md). Its form uses Mango’s confirmed signup door; abandoned-checkout events enter only an activated exact tag-and-exit revision, with no marketing message.

**Acceptance.**
1. An Owner connects the WooCommerce edge from Settings and synchronizes seeded customers, products, orders and refunds.
2. Replaying a signed order webhook preserves the existing source records and one receipt; conflicting bytes and forged origins are refused.
3. A plugin abandoned-checkout event enters the activated exact revision once, adds its contact tag and exits; draft, stale, purchased and opted-out cases do not enroll.
4. The shipped plugin script uses explicit consent, default-deny collection and GPC withdrawal without cross-site or subscription-permission widening.
5. The plugin’s signup form remains pending until Mango’s affirmative single-use confirmation.

**Evidence.** `tests/go-live/woocommerce.journeys.ts` — “[INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery”: Owner connects encrypted REST/signing credentials through Settings; seeded customers, paginated products, orders and refunds sync through Store with original identity/occurrence times and financial projection; the signed order webhook replays once without duplicate facts and rejects conflicting bytes; the installed-plugin edge supplies abandoned checkouts, whose signed event enters only an explicitly activated exact flow revision, adds one contact tag and exits once. Draft, stale, purchased and opted-out cases never enroll; forged, expired, nonconsented and GPC events are refused. `tests/go-live/woocommerce-plugin-journey.ts` runs the shipped browser script against the WordPress network edge for default-deny, explicit consent and GPC withdrawal. Settings/Store are exercised at 1440/390. The real plugin source is `extensions/mango-woocommerce/mango-woocommerce.php` with `extensions/mango-woocommerce/INSTALL.md`; its shortcode uses the existing confirmed signup door proved by `tests/audience-import/signup.spec.ts` — “CONT-003/009 public signup remains pending until single-use expiring confirmation and records source time method IP”. Ct approved the INT-002 semantic on 22 October 2026 at 20:20Z: store-admin enablement is off initially; only signed-in store customers; explicit analytics and marketing consent before the one Secure HttpOnly SameSite=Lax first-party cookie, expiring after 30 days; GPC records no observation and revokes pending eligibility; no cross-site tracking or subscription-consent widening; WordPress observations expire after 30 days. The allowlisted signup iframe uses Mango’s own confirmation. A saved tag-and-exit flow revision must be explicitly activated; it sends no marketing message. CONT-018 and FORM-008 retain their other acceptance obligations and statuses; FLOW clauses retain their graph/message obligations.
**Gap.** The cited edge and browser journeys assert owner connection, source synchronization, replay preservation, exact activated tag-and-exit flow, default-deny collection, explicit consent and GPC withdrawal, plus unchanged subscription evidence and confirmation. Gap: the cited evidence does not assert absence of cross-site observation throughout the plugin journey. No completion is carried for that unasserted privacy outcome.

#### INT-003 — BigCommerce

Core · target · **missing**

**Requirement.** A BigCommerce connection syncs customers, catalog, orders, refunds and abandoned carts through its API and webhooks.

**Acceptance.**
1. a BigCommerce edge journey syncs a seeded store and enrolls a contact from an abandoned-cart webhook.

**Evidence.** None.
**Gap.** not implemented

#### INT-004 — Stripe

Core · target · **partial**

**Requirement.** A Stripe connection (restricted key or Stripe Connect) records customers, successful payments, Checkout sessions, subscriptions (started, renewed, past due, canceled) and refunds as events, for businesses that sell through Stripe Checkout or Payment Links, and is the payment rail for paid newsletters (PUB-002). Nectar's subscription events arrive the same way.

**Acceptance.**
1. signed Stripe webhook fixtures for a subscription start and cancellation create the two events once each and trigger a renewal-reminder flow.

**Evidence.** `src/core/features/store/stripe/` · `tests/go-live/roles.journeys.ts` · `tests/portability.spec.ts`
**Gap.** Owner-only encrypted connection and signed once-only commerce event ingestion. Gap: required real-provider lifecycle proof cannot start as written: Stripe rejects metadata on a test clock (HTTP 400 parameter_unknown, metadata). No real lifecycle events or cleanup search proof claimed. FLOW-001/FLOW-002 inherit renewal-reminder enrolment without status changes.

#### INT-005 — Square

Core · target · **missing**

**Requirement.** A Square connection records customers, in-person and online orders and refunds so retail purchases feed segments and post-purchase flows.

**Acceptance.**
1. a Square edge journey syncs a seeded location's orders into contact timelines.

**Evidence.** None.
**Gap.** not implemented

#### INT-006 — Stall and Orbit

Core · target · **missing**

**Requirement.** Mango connects to the sibling Stall storefront (customers, catalog, carts, checkouts, orders, refunds, discount codes) through Stall's published events, and to the sibling Orbit CRM through INT-011, without sharing either product's database.

**Acceptance.**
1. a journey against Stall's event edge enrolls a Started Checkout contact into the abandoned-checkout flow and stops it when Stall reports the order.

**Evidence.** None.
**Gap.** not implemented

#### INT-007 — Events and profiles API

Core · target · **partial** · Cites BASE-ACCESS-004, BASE-INPUT-001, BASE-OPS-003

**Requirement.** The public versioned REST API and JavaScript client let external systems identify contacts, set properties, track events, read rule-derived segment membership and submit subscriptions with consent evidence. Credentials are scoped, each key has its own rate limit, writes retain key attribution and event writes retain idempotent outcomes. The public API description matches these operations. Website keys remain on a website server behind its authenticated same-origin proxy; this does not authorize automatic visitor collection or consent inference.

**Acceptance.**
1. Identify and update a contact through the scoped API; the profile retains its properties.
2. The shipped JavaScript client concurrently repeats one custom event with one idempotency key and stores one event; conflicting content is refused.
3. The API and client return the contact’s rule-derived segment memberships.
4. A subscription without consent evidence returns the named consent-evidence error.
5. Exhausting one key returns a named rate-limit refusal with retry guidance while another key remains usable.
6. Writes retain their integration-key attribution, and the public API description declares their scopes.

**Evidence.** `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/custom-event-journey.ts`: shipped JavaScript client records one general event on concurrent replay, rejects conflicting content, reads profile and rule-derived segment membership, refuses subscribe without evidence by name and exhausts one key without affecting another; timeline at 1440/390 passes axe, overflow and hydration checks. OpenAPI: `src/core/features/integrations/openapi.ts`; client: `src/core/features/integrations/client-source.ts`. Existing scoped profile/consent/suppression, conversion and refusal-feed journeys remain green.
**Gap.** The cited journeys assert profile properties, contact identity, event idempotency and key attribution, membership reads, consent refusal and independent per-key rate limits. Gap: the cited files do not assert integration-key attribution on contact/property/subscription writes or full public-description coverage for all named contact and membership operations; event-write scope and event attribution alone do not prove those outcomes. Website keys remain server-held behind an authenticated same-origin proxy; no automatic collection or consent inference is authorized.

#### INT-008 — Outbound webhooks

Core · target · **missing** · Cites BASE-OPS-003, BASE-OPS-004

**Requirement.** Owners subscribe HTTPS endpoints to Mango events (subscribed, unsubscribed, confirmed, message sent, clicked, converted, flow entered and exited, form submitted), signed with an HMAC secret, retried with backoff for 24 hours, with a delivery log.

**Acceptance.**
1. an endpoint that fails twice then succeeds receives each event once with a valid signature, and the log shows the attempts.

**Evidence.** None.
**Gap.** not implemented

#### INT-009 — Zapier and Crank

Core · target · **missing** · Register R-503

**Requirement.** A Zapier app and a Crank connector expose Mango triggers (new subscriber, unsubscribe, form submitted, event) and actions (add or update contact, track event, add tag, subscribe with evidence) over INT-007 and INT-008.

**Acceptance.**
1. a Zapier platform test run of each trigger and action succeeds against a test installation.

**Evidence.** None.
**Gap.** not implemented

#### INT-010 — Segment

Core · target · **missing**

**Requirement.** Mango is a Segment destination (identify and track calls become contacts, properties and events) and source (Mango events into the owner's Segment workspace).

**Acceptance.**
1. Segment-format identify and track payloads at the edge create one contact and one event, and Mango events are delivered to a test Segment source.

**Evidence.** None.
**Gap.** not implemented

#### INT-011 — CRM sync

Core · target · **partial**

**Requirement.** Two-way property sync with HubSpot, Salesforce and the sibling Orbit: contact fields map both ways with a chosen winner per field; Mango's consent and suppression are authoritative and written to the CRM's marketing-status fields; flows can create a CRM task or note.

**Acceptance.**
1. an edge journey changes a mapped field in the CRM and sees it in Mango, unsubscribes in Mango and sees the CRM marked opted out, and a flow creates one CRM task.

**Evidence.** `tests/go-live/sync-integrations.journeys.ts` · `docs/integrations.md`
**Gap.** Scoped subscriber sync and a cursor-paged refusal feed support a sibling CRM client. The Coffer client is supplied as a patch in the integration round, not landed in Coffer here. Full CRM field mapping UI and flow-created CRM tasks remain unmet.

#### INT-012 — Ad audiences

Core · target · **missing**

**Requirement.** Segments sync daily (and on change) to Meta Custom Audiences, Google Customer Match and TikTok audiences as hashed identifiers through the owner's ad accounts, excluding anyone who opted out of sale or sharing (CONT-021) or lacks the consent the ad platform's terms require; removal from the segment removes them from the audience.

**Acceptance.**
1. an edge journey syncs a segment, then removes a contact who made a do-not-share request, and the next sync deletes them from the audience.

**Evidence.** None.
**Gap.** not implemented

#### INT-013 — Web analytics tagging

Core · target · **partial**

**Requirement.** Campaign, flow and message links carry reviewed static UTM values for Google Analytics 4 and Vane. RL-105 freezes defaults into new drafts while preserving author parameters and previously approved revisions; ordinary web destinations alone receive them, with no contact interpolation or changes to managed/private links. Flow dimensions and Vane goal events through INT-007 remain part of this capability. [The analytics mechanism](docs/contract/mechanism.md) specifies the parameter labels.

**Acceptance.**
1. A sent message’s ordinary web links carry the reviewed campaign, flow and message dimensions.
2. Author parameters win; managed or private links and contact-derived values remain excluded.
3. Changing defaults affects new drafts and preserves previously approved revisions.
4. A Vane goal fixture creates one idempotent contact event through INT-007.

**Evidence.** `tests/go-live/contact-links.journeys.ts` via `tests/go-live/domain-journey.ts` — configured UTM redirect on the branded tracking host; `tests/campaign-results/performance.journeys.ts` — INT-013 / REPORT-002 at 1440 via `tests/campaign-results/tracking-journey.ts` and `tests/campaign-results/custom-attribution.ts`: sent UTM destinations, original click identity, author values, managed/contact exclusions, campaign off, Settings at 1440/390 and one idempotent Vane goal on the contact timeline; `tests/portability.spec.ts` — native settings restore.
**Gap.** Static campaign defaults freeze into new drafts, preserve author values and managed/contact exclusions, and the scoped Vane conversion fixture is recorded. Gap: flow dimensions and INT-007’s general custom-event goal path remain unfinished; no real Vane or provider call is claimed.

#### INT-014 — Reviews and loyalty apps

Core · target · **partial**

**Requirement.** Events from Judge.me, Yotpo, Okendo and Smile.io (review submitted, points earned, tier changed) arrive through adapters on INT-007 and drive review-request and loyalty flows; Mango does not collect reviews itself.

**Acceptance.**
1. a review-submitted fixture exits the contact from the review-request flow as converted.

**Evidence.** `tests/go-live/sync-integrations.journeys.ts` via `tests/go-live/review-loyalty-journey.ts`; `tests/sender-verification/worker.spec.ts` — populated 0096 upgrade. Owner/Admin inbound Judge.me review, Okendo review/earned-points/tier-entry and Smile customer-profile adapters verify native signatures and use the INT-007 event writer. Existing contacts only; no consent or outbound action. Signed replay, account/timestamp refusal, concurrent unmatched count, encrypted export-excluded secrets, populated receipt restore, erasure/reconnection replay protection and Settings at 1440/390 are exercised.
**Gap.** PARTIAL: Yotpo stays disabled with adapter_signature_protocol_unverified because its signing protocol could not be verified from this VM; Smile customer/updated supports profile/balance observations, not inferred points earned or tier transitions. Live provider payload confirmation remains open. Review-request flow conversion/exit waits on FLOW-*. Default ADOPTED: Owner/Admin under integration.manage, existing encrypted credential custody, no new contact/consent/send, unknown addresses counted without storage. No provider account was used.

#### INT-015 — Shopify connection a merchant installs

Core · target · **missing** · Cites BASE-DATA-004, BASE-SECRET-001 · Register R-501

**Requirement.** A merchant connects through the free Mango for Shopify public app without a developer account, terminal, secret deployment input or redeploy. Every Mango tier uses the shared connector only after installation-scoped Owner/Admin authorization under RL-106. The merchant may start in Mango Settings or the App Store; Shopify’s own hosted permission screen keeps its consent step. Settings lists required scopes and withheld protected fields truthfully. Run Edit Run obtains the App Store and protected-data approvals; these do not become merchant setup tasks. The labelled single-shop developer route remains after the merchant route. [The Shopify mechanism](docs/contract/mechanism.md) specifies the authorization protocol.

**Acceptance.**
1. On a fresh installation without commerce deployment inputs, an Owner connects a Shopify edge from Settings and returns connected after its permission screen, without redeployment.
2. An App Store start asks for the installation address and reaches the same authorization.
3. Granted scopes cover customer and order history, products and inventory, pixel, consent write-back, discount creation and theme inspection; withheld scopes or protected fields appear as unavailable.
4. An invalid shop, bad callback authentication or reused or expired authorization state completes no exchange and names its reason.
5. The public app remains free to install on every tier; a merchant is never asked for a developer account or app approval.
6. The developer route is labelled, not offered first, and applies every installation check that does not belong to the connector.

**Evidence.** `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts`
**Gap.** The shared public-app connector and merchant-install route are not built. Existing developer-adapter sync and signed-event evidence do not prove merchant authorization, App Store start or provider scope admission.

#### INT-016 — Shopify mandatory privacy intake

Core · target · **missing** · From INT-015 · Cites BASE-DATA-003, BASE-OPS-005

**Requirement.** Authenticated Shopify customer access, customer erasure and post-uninstall shop erasure reach the installation even after ordinary disconnection. Acknowledgment follows durable installation receipt under RL-106. Access requests follow CONT-021; erasure follows CONT-013’s surviving opt-out rule, retaining unrelated Mango-held or other-source evidence. Shop erasure removes every record from that connection and its customers’ Shopify-only data. Every actual outcome is visible in OPER-007’s activity within Shopify’s deadlines.

**Acceptance.**
1. Badly authenticated mandatory privacy delivery is refused and changes nothing; acknowledgment of a valid delivery occurs only after durable installation receipt.
2. A customer-access delivery creates a request visible to Owner and Admin and completed within Shopify’s thirty-day deadline.
3. Customer erasure removes Shopify customer data under CONT-013 while preserving only the permitted surviving opt-out and unrelated evidence.
4. The delayed shop erasure after uninstall removes every connection source record and all Shopify-only customer data through the protected residual route.
5. Each privacy action records its actual outcome and meets its provider deadline.

**Evidence.** `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts`
**Gap.** Mandatory privacy intake, durable acknowledgment and delayed post-uninstall redaction remain unbuilt; RL-106 requires protected residual routing rather than deleting reachability with live credentials.

#### INT-017 — Shopify disconnection and reinstall

Core · target · **missing** · From INT-015 · Cites BASE-SECRET-001, BASE-OPS-003

**Requirement.** Disconnect, app uninstall or a revoked Shopify token visibly disconnects the store within sixty seconds. Live credentials and ordinary forwarding custody are removed; only time-bounded protected routing needed for later mandated privacy work remains under RL-106. Synced data stays, dependent approvals and audiences are fenced under STORE-005 and STORE-006, and store-triggered flows stop enrolling. Reinstallation resumes saved cursors.

**Acceptance.**
1. Uninstall or revoked authority shows the store disconnected with time on Home and Settings within sixty seconds.
2. Live administrative credentials, ordinary routing tokens, forwarding keys and counts are removed; only the declared time-bounded mandatory-redaction route remains.
3. A store-dependent campaign cannot approve, dependent audiences and activations stay blocked and new store-event flow enrollment stops.
4. Existing synced data stays, and reinstall resumes its saved cursors without restarting the import.

**Evidence.** `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts`
**Gap.** The connector disconnect, post-disconnect custody and reinstall journey are not built; retaining late mandatory routing is required by RL-106, not permission for live forwarding.

#### INT-018 — Shopify connector trust and custody

Core · target · **missing** · From INT-015 · Cites BASE-DATA-004, BASE-DATA-005, BASE-SECRET-001, BASE-OPS-003

**Requirement.** The connector separates every shop and installation using its installation-scoped routing custody and authenticated provider content, forwards verified deliveries within five seconds under the installation’s own trust and re-reads customer, product and order notifications through that shop’s own account. It has no default destination. It retains only routing custody and delivery counts/failures, never the shop’s administrative credential or forwarded content. Administrative calls go directly from installation to Shopify. Supersedes `BASE-DATA-005` only for the explicitly selected connector dependency under RL-106; [the connector mechanism](docs/contract/mechanism.md) states precise retained facts and trust checks.

**Acceptance.**
1. Wrong-installation routing, bad provider authentication, another signed-body shop and bad forwarding authentication each produce no change.
2. Captured connector exchange leaves no administrative credential at the connector; protected fields remain installation-held.
3. Unmatched routing and disconnected shops reach no installation and return an error; no default installation exists.
4. Verified forwarding arrives within five seconds with the declared shop, topic, delivery identity and time, and downstream record changes re-read that shop’s authoritative data.
5. Forwarded bodies are not stored or logged; visible per-connection counts and failures contain only the declared routing observations.
6. A connector outage pauses forwarding and provider retries plus scheduled reconciliation recover missed work.

**Evidence.** `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts`
**Gap.** The shared connector trust, routing isolation, custody, forwarding latency and recovery journey are not built.

#### INT-019 — Shopify bulk first sync

Core · target · **missing** · From INT-015 · Cites BASE-OPS-003

**Requirement.** The installed Shopify connection imports customers with marketing evidence, all available order history, refunds, fulfillments, products, variants, collections, inventory and thirty days of abandoned checkouts through bulk operations. Settings and Home show source progress and estimated completion. At SCALE-001’s buyer size the sync finishes within two hours and resumes after interruption without duplicates. Until each source completes, dependent segments, campaigns and flows stay visibly syncing and cannot resolve a partial audience.

**Acceptance.**
1. A seeded edge store with 250,000 customers and a year of orders completes its full declared source sync within two hours.
2. Progress and estimated finish remain visible per source on Settings and Home.
3. A forced restart resumes from saved position with no duplicate source records.
4. Before purchase data completes, the purchase segment shows syncing and approval or activation cannot use a partial audience.

**Evidence.** `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts`
**Gap.** The merchant-installed bulk first sync, restart, progress, two-hour capacity bar and pre-completion audience gate are not proved by existing developer-adapter fixtures.

#### INT-020 — Shopify wiring and first-use work

Core · target · **missing** · From INT-015 · Cites BASE-OPS-004

**Requirement.** After Shopify authorization Mango creates its subscriptions, activates the site-configured pixel, opens the selected form/tracking theme embed and verifies its saved state. Settings shows every approval, scope, protected-data, subscription, pixel, theme, attestation and first-sync step with fixes, and Home shows failures. The connection leads through checkout consent attestation and supports an identified cart event, approved unique code and unsubscribe write-back through the same installation. Missing subscriptions are recreated on the next installation check.

**Acceptance.**
1. The Shopify edge records subscriptions and pixel creation with discount and customer-write authority.
2. Turning on and saving the selected theme embed makes its Settings step pass; every other step exposes state and a relevant fix.
3. Deleting a Mango subscription is repaired on the next check and shown in Settings.
4. An identified pixel cart event enrolls in the abandoned-checkout flow, its approved message obtains an edge-created unique code, and Mango unsubscribe reads back at Shopify.
5. Checkout opt-in attestation completes under CONT-024 and CONT-025.

**Evidence.** `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts`
**Gap.** The connector wiring, merchant-facing step state and installed-connection flow/code/consent journey are not built; developer-adapter checks alone do not prove them.

### Migration from incumbents

#### MOVE-001 — From Mailchimp

Core · target · **partial**

**Requirement.** An owner moves in a Mailchimp audience export (subscribed, unsubscribed, non-subscribed and cleaned files), the full account export ZIP (audiences, sent campaigns as history, templates and reports, including `granular_activity`) or, with a Mailchimp API key, a live pull. Merge fields become properties, tags become tags and groups become topics. Subscribed rows become subscribed with incumbent-held evidence (CONT-024) from their `OPTIN_TIME`, `CONFIRM_TIME` or `LAST_CHANGED` under the owner's once-per-audience attestation, and no status is ever upgraded. The move-in runs at the scale MOVE-012 commits to (SCALE-001), whichever route is used. The move-in also carries what a Mailchimp account uses every week: saved segments (MOVE-007), classic automations and Customer Journeys (MOVE-008), per-contact open and click history (MOVE-009, MOVE-015), several audiences (MOVE-010) and templates converted into the email grammar (MOVE-011). Each appears in the reconciliation report (MOVE-006). An API-key move-in then keeps Mango and Mailchimp in step on consent, both ways, until the owner marks the cutover complete (MOVE-013).

**Acceptance.**
1. `tests/move-in/archive.journeys.ts` runs on synthetic exports, extended with checked-in Mailchimp-format fixtures for a saved segment with a campaign-activity condition, a classic automation, a `granular_activity` file, two overlapping audiences with conflicting statuses and a template with merge tags and a `<style>` block.
2. Each fixture shows its expected lines in the reconciliation report (MOVE-007 to MOVE-011).
3. The CONT-024 subscribed-file fixture and the MOVE-012 full-scale export run through the same journey.
4. The same journey also runs on one real, owner-supplied Mailchimp export with its reconciliation report.

**Evidence.** `src/core/features/move-in/archive-service.ts` · `tests/move-in/archive.journeys.ts`
**Gap.** acceptance not yet met: tests/move-in/archive.journeys.ts runs on synthetic exports, extended with checked-in Mailchimp-format fixtures for a saved segment with a campaign-activity condition, a classic automation, a granular_activity file, two overlapping audiences with conflicting statuses and a template with merge tags and a <style> block. Each fixture shows its expected lines in the reconciliation report (MOVE-007 to MOVE-011). The CONT-024 subscribed-file fixture and the MOVE-012 full-scale export run through the same journey. The same journey also runs on one real, owner-supplied Mailchimp export with its reconciliation report.

#### MOVE-002 — From Klaviyo

Core · target · **partial**

**Requirement.** With a Klaviyo private API key or CSV exports, Mango imports profiles with email and SMS consent and their timestamps (subscribed profiles as incumbent-held evidence, CONT-024), custom properties, list and segment definitions (recreated as segments for review), suppressions, templates (as templates) and historical order and engagement events, and recreates flows as draft flows with every unsupported step named. Until cutover, the parallel-run sync keeps consent in step both ways where this incumbent's API allows it, with any gap named (MOVE-013).

**Acceptance.**
1. an edge journey against a Klaviyo API fixture imports profiles with consent, a segment definition and an abandoned-cart flow as a draft with its unsupported steps listed.

**Evidence.** `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-csv-journey.ts` · `tests/go-live/source-api-journey.ts` · `tests/go-live/source-draft-journey.ts`
**Gap.** Owner/Admin one-time Klaviyo API read and CSV preset retain email source method/time, restrictive suppressions, properties, list/segment review snapshots, library templates and original-time order/engagement history. Unsupported conditions and abandoned-cart action steps are named in the report. tests/portability.spec.ts preserves these records on native restore. Gap: executable flows (FLOW-002/008), parallel-run sync (MOVE-013) and real-provider sandbox proof. Positive incumbent SMS remains held under CONT-024/A2P; missing row time or collection point never grants SMS consent. Snapshot membership grants no additional category consent.  The source outline is now also an inert saved FLOW-001 draft revision; source trigger/action execution is unavailable.

#### MOVE-003 — From ActiveCampaign

Core · target · **partial**

**Requirement.** Contacts, lists (as topics), tags, custom fields, unsubscribes and bounces import by CSV or API; automations are imported as a readable outline and recreated as draft flows. Until cutover, the parallel-run sync keeps consent in step both ways where this incumbent's API allows it, with any gap named (MOVE-013).

**Acceptance.**
1. an API fixture import keeps an unsubscribed contact unsubscribed and produces a draft flow for a seeded automation.

**Evidence.** `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-csv-journey.ts` · `tests/go-live/source-api-journey.ts` · `tests/go-live/source-draft-journey.ts`
**Gap.** Owner/Admin one-time ActiveCampaign API read and CSV preset retain contacts, list membership as review topics, tags, custom fields, unsubscribes and bounces. The key is used only in bounded declared-host HTTPS reads and is not stored or logged. Automation names/statuses form a readable report outline; unavailable trigger/action definitions are named. Gap: executable automations (FLOW-002/008), parallel-run sync (MOVE-013) and real-provider sandbox proof. Review topics grant no additional category consent.  The source outline is now also an inert saved FLOW-001 draft revision; source trigger/action execution is unavailable.

#### MOVE-004 — From Kit (ConvertKit)

Core · target · **partial**

**Requirement.** Subscribers with their states (active, canceled, bounced, complained), tags, custom fields and sequences import by CSV or API; sequences become draft sequences (FLOW-015). Until cutover, the parallel-run sync keeps consent in step both ways where this incumbent's API allows it, with any gap named (MOVE-013).

**Acceptance.**
1. the move-in journey's Kit-format synthetic files (`docs/moving-in.md`) keep every restrictive state, plus a sequence fixture becomes a draft sequence.

**Evidence.** `docs/moving-in.md` · `tests/move-in/held.journeys.ts`
**Gap.** acceptance not yet met: The move-in journey's Kit-format synthetic files (docs/moving-in.md) keep every restrictive state, plus a sequence fixture becomes a draft sequence.

#### MOVE-005 — From beehiiv, Omnisend and Customer.io

Core · target · **partial**

**Requirement.** Subscriber and profile exports with their statuses, tiers or attributes and consent evidence import by CSV or API, with the same restrictive mapping; active subscribers carry incumbent-held evidence (CONT-024), as they do from ActiveCampaign (MOVE-003) and Kit (MOVE-004). Until cutover, the parallel-run sync keeps consent in step both ways where this incumbent's API allows it, with any gap named (MOVE-013).

**Acceptance.**
1. one synthetic export per product imports with every unsubscribed or suppressed row restricted.

**Evidence.** `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-csv-journey.ts` · `tests/go-live/source-api-journey.ts`
**Gap.** beehiiv, Omnisend and Customer.io documented CSV presets retain source status, tiers, attributes and tags; explicit source attestation carries incumbent-held email evidence and reconciliation counts evidence kinds. Unsubscribed, bounced and suppressed rows remain restricted. Gap: API pulls and parallel-run sync (MOVE-013); real-provider export proof pending. Missing or unfamiliar subscription states remain non-subscribed.

#### MOVE-006 — Reconciliation and cutover

Core · target · **partial**

**Requirement.** Every move-in ends with a reconciliation report (rows read, created, updated, rejected with reasons, consent mapped with a count per evidence kind (Mango-captured, incumbent-held with each time source, `time-unknown`, and non-subscribed for want of an attestation; CONT-024) and the attestation each relies on, suppressions carried, engagement rows imported and dropped (MOVE-009), audiences and their overlaps (MOVE-010), segments recreated with each unsupported condition (MOVE-007), automations and journeys mapped with each unmapped step (MOVE-008) and each template's conversion findings (MOVE-011)) and a cutover checklist: DNS records for the sending domain, forms replaced on the site, flows recreated and reviewed, no template or live message still loading images from an incumbent host (MOVE-014), a parallel-run week with the two-way sync on (MOVE-013) or, for an export-only move-in, a re-import before each Mango send, the old platform's sending turned off, and **Mark cutover complete**, which ends the sync. Nothing imported sends until it is approved or activated.

**Acceptance.**
1. after a move-in, the report's counts reconcile to the files and contact table, and no campaign or flow is scheduled or live.

**Evidence.** `src/core/features/move-in/archive-report.ts` · `tests/move-in/archive.journeys.ts`
**Gap.** acceptance not yet met: After a move-in, the report's counts reconcile to the files and contact table, and no campaign or flow is scheduled or live. The report counts consent per evidence kind (CONT-024) and names the attestation each relies on. The cutover checklist shows the parallel-run sync (MOVE-013), or the re-import advice for an export-only move-in, and Mark cutover complete ends the sync. The checklist names any template or live message still loading images from an incumbent host (MOVE-014).

#### MOVE-007 — Mailchimp saved segments

Core · target · **missing**

**Requirement.** With an API key, every saved segment of each moved audience is read from the Mailchimp Marketing API with its match type and conditions. It is recreated as a draft segment for review, which no campaign uses until an operator saves it. Conditions map as follows: merge fields to properties; tags to tags; groups to topics; signup date and location to SEG-001 conditions; contact rating and engagement (often, sometimes, rarely) to the SEG-006 engagement level; and ecommerce conditions to SEG-001 event conditions over the imported store data. Campaign-activity conditions (was sent, opened, clicked or did not click a named campaign, or any of the last 5 campaigns) map to SEG-006 conditions over the campaign history MOVE-009 imports. Automation-activity conditions (started or completed a classic automation) map to SEG-006 flow conditions over the draft flow MOVE-008 creates and the imported history. Every condition Mango cannot express is named in the segment and in the report, and the recreated segment's count is shown beside the count Mailchimp reported. An export-only move-in carries no segment definitions: it brings static segments across as tags and says that saved segments need the API pull.

**Acceptance.**
1. a Mailchimp API fixture has two saved segments.
2. One, "clicked campaign X and engagement is often", is recreated as a draft segment whose membership over the imported history equals the fixture's expected members.
3. The other has an unsupported condition, which is named in the segment and the report.

**Evidence.** None.
**Gap.** not implemented

#### MOVE-008 — Mailchimp automations and Customer Journeys

Core · target · **missing**

**Requirement.** Classic automations, which the Mailchimp API reads with their trigger, delays and emails, are recreated as draft flows (FLOW-001). Each email's content is converted under MOVE-011, and every unmapped trigger, delay or setting is named. Customer Journeys have no export or read API, so Mango builds a journey inventory from two sources. The first is what Mailchimp does expose: journey emails' reports and content, in the API and the account export, name their journey. The second is the owner, who confirms or adds each live journey by name and starting point from a checklist that mirrors Mailchimp's starting points. Each starting point is mapped to the matching FLOW-012 library flow (for example abandoned cart to the abandoned-cart flow, joins audience to the welcome series, and date-based to birthday or anniversary). That flow is installed as a draft with the journey's readable email content carried over, and every step Mango could not read or map (rules, branches, actions) is named for the owner to rebuild. Each recreated draft carries AUD-009's setting for moved-in flows, so campaign sends do not block it, as they did not in Mailchimp. Nothing activates until FLOW-008.

**Acceptance.**
1. a Mailchimp API fixture with one classic two-email welcome automation yields a draft flow with both emails' converted content and named delays.
2. A journey fixture whose two emails name an abandoned-cart journey yields an abandoned-cart draft flow with those emails, and a report line names its unreadable branch.
3. Neither flow is live.

**Evidence.** None.
**Gap.** not implemented

#### MOVE-009 — Incumbent engagement history

Core · target · **done**

**Requirement.** The Mailchimp account export's `granular_activity` files import as historical click and open facts on the matching contacts at their original times. Each fact is linked to the imported campaign history (sent campaigns and their links) and labeled `imported` with its source. Imported clicks count as engagement for dormancy (CONT-012, AUD-008). Imported opens are kept as estimates (RESULT-002) and count for none of them. Imported facts never become Mango send facts, results or attribution (Archive move-in policy) and never change consent. Activity rows for addresses that are not in the move-in are counted and dropped. MOVE-015 carries API-key activity, the other incumbents' history and the remaining engagement uses.

**Acceptance.**
1. a `granular_activity` fixture with clicks and opens for three contacts and one unknown address imports one click or open fact per row on the right contacts at their original times.
2. The reconciliation report counts imported and dropped rows, the contacts' timelines show the facts as imported, and no campaign result figure changes.

**Evidence.** `tests/move-in/archive.journeys.ts` · `tests/move-in/hostile.journeys.ts` · `tests/portability.spec.ts`
**Gap.** Mailchimp-format granular activity imports one durable click/open fact per accepted row, with original time, imported campaign/link and source. Reconciliation names imported/dropped counts; timeline, repeat, undo, merge, erasure and populated upgrade/restore are exercised. Per archive: 10,000 engagement rows within existing ZIP/text limits, visibly refused beyond that limit. Imported clicks govern CONT-012/AUD-008 dormancy; opens stay open-only, never engagement; no send fact, result, attribution or consent changes. API-key activity, other incumbents' history and CONT-020/SEG-005/SEG-006/EXP-006 uses are MOVE-015.

#### MOVE-010 — Several audiences

Core · target · **partial**

**Requirement.** A move-in with more than one Mailchimp audience, or more than one Klaviyo or ActiveCampaign list, asks the owner what each audience becomes. By default it becomes a topic in this installation; alternatively it belongs to a separate brand that moves into its own installation (Honest boundaries: one brand per installation). An address present in two audiences becomes one contact (CONT-001), with its status per topic taken from each audience. Within a topic and channel the most restrictive status wins, in CONT-011's order. A cleaned or complained address is suppressed for the channel across every topic (CONT-006). Conflicting merge-field values are listed, and the owner chooses which audience wins for each field.

**Acceptance.**
1. a fixture has two audiences that share addresses: one address subscribed in A and unsubscribed in B, one cleaned in B, and one with a different first name in each.
2. Each address becomes one contact.
3. The first is subscribed to topic A and unsubscribed from topic B, the cleaned one is suppressed on email, and the first-name conflict is listed.
4. The report counts each audience and their overlap.

**Evidence.** `src/core/features/move-in/archive-service.ts` · `tests/move-in/archive.journeys.ts`
**Gap.** acceptance not yet met: A fixture has two audiences that share addresses: one address subscribed in A and unsubscribed in B, one cleaned in B, and one with a different first name in each. Each address becomes one contact. The first is subscribed to topic A and unsubscribed from topic B, the cleaned one is suppressed on email, and the first-name conflict is listed. The report counts each audience and their overlap.

#### MOVE-011 — Incumbent template conversion

Core · target · **partial**

**Requirement.** Imported Mailchimp templates and campaign bodies, and Klaviyo, ActiveCampaign and Kit templates, become builder templates (BUILD-002) in the email grammar.
- *Merge tags* map to Mango tokens with fallbacks the owner confirms (MSG-008): `*|FNAME|*` and `*|LNAME|*` to name tokens; other merge fields to their mapped properties; `*|UNSUB|*` to the managed unsubscribe link; `*|UPDATE_PROFILE|*` to the preference center (CONT-016); `*|LIST:ADDRESS|*` and `*|LIST:ADDRESSLINE|*` to the saved postal address; `*|ARCHIVE|*` to the campaign's web version (PUB-001); and `*|DATE|*` and `*|CURRENT_YEAR|*` to date tokens. Klaviyo-style `{{ first_name }}` tags map the same way.
- *Styles:* `<style>` rules are inlined onto the elements they select and kept only where the grammar admits them. Media-query rules become BUILD-010 mobile settings where they map. Classes and everything else are removed.
- *Report:* each template's conversion report lists every mapped and unmapped merge tag, every dropped rule, property or block with its location, every link and image host it uses outside MSG-014's list, its sent size against BUILD-012's limit, and whether the result passes the MSG-012 checker.
- *Readability:* a text run below MSG-012's 3:1 contrast is recolored to the nearest shade of its own hue that reaches 4.5:1 against the background it is judged on, as Mango's design compiler aims. For example, `#999999` on white becomes `#767676`. Each recoloring is listed in the report with its location and its before and after colors. The operator can undo one in the builder, and the run then blocks approval under MSG-012 as it does today.
- *Size:* inlining grows a template, so conversion measures each result's sent size (BUILD-012). A result over the limit is never dropped: it is kept as a held conversion, listed in its report and in the reconciliation report (MOVE-006) with its size and its largest blocks, and opens in the builder for the operator to trim before it can be saved as a template.
- *Images:* each template's images come home under MOVE-014.
- *Outside hosts:* the reconciliation report (MOVE-006) gathers those hosts across every imported template and campaign, with a count of uses each. The owner can allow the chosen ones there in one step (MSG-014, recorded in OPER-007). Any not allowed are listed again with MSG-015's allow action when a campaign or flow message built from the template reaches review. An unmapped merge tag stays visible and blocks approval through the personalization check, as it does today.
-

**Acceptance.**
1. a Mailchimp template fixture contains `*|FNAME|*`, `*|UNSUB|*`, `*|LIST:ADDRESS|*`, `*|ARCHIVE|*`, an unknown `*|FOO|*`, and a `<style>` block with class rules, a `display: none` rule and a media query.
2. It becomes a template whose tokens resolve in preview and whose inlined colors and sizes match the source.
3. Its report names the unknown tag, the dropped `display: none` rule and the mapped mobile rule.
4. The template passes the checker apart from the unknown-tag block.
5. A second fixture with links to three outside hosts lists them in its report and in the reconciliation report, and a campaign built from it reaches review with the three hosts and their allow actions (MSG-015).
6. Mailchimp's `base_boxed_3column_query.html` blueprint, filled with fixture content, converts to a template whose report states its sent size, and it starts a draft that saves and reaches approval (BUILD-012).
7. A fixture inflated past the limit is listed with its size as a held conversion, not dropped.
8. A fixture whose footer is `#999999` on white converts with that text at `#767676`, listed in its report, and passes the checker.

**Evidence.** `src/core/features/move-in/html-import.ts` · `tests/move-in/archive.journeys.ts` · `tests/go-live/content-checks.journeys.ts` · `tests/go-live/content-hosts.ts` · `tests/go-live/template-conversion.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-api-journey.ts`
**Gap.** Gap: Campaign bodies remain imported history copied into drafts rather than automatically becoming library templates. Only FNAME, Klaviyo first_name, UNSUB and LIST:ADDRESS/ADDRESSLINE map to existing rendering targets; LNAME, DATE, CURRENT_YEAR, ARCHIVE, UPDATE_PROFILE (CONT-016), arbitrary property mapping and unknown fields remain visible and block personalization approval. The conservative name fallback is there; per-owner fallback configuration is unproved. CSS supports simple element/class selectors and top-level 480px mobile font size, line height, padding and alignment; other selectors, media widths, nested rules and orientation/hiding mappings remain unproved. Source-body inherited styles, complete per-location dropped-block diagnostics, general same-hue nearest-shade correctness across all backgrounds, a dedicated per-recoloring builder undo control and complete ActiveCampaign/Kit template conversion remain unproved; Klaviyo coverage currently proves only its supported name tag. Oversized results retain measured size, limit and largest blocks in custody/reconciliation, but cannot yet open directly in the builder for trimming. Mailchimp-host images in converted templates are re-hosted through the MOVE-014 journey; the rest follows MOVE-014's Gap. Host use counts and campaign review actions are covered by the existing imported-host journey; one-step reconciliation allowance/audit and flow-message review remain unproved. Mailchimp blueprint is CC BY-SA 3.0; vendoring waits on an owner licence decision.

#### MOVE-012 — Move-in at the buyer's scale

Core · target · **partial**

**Requirement.** Every Mailchimp route (MOVE-001), and every other incumbent's (MOVE-002 to MOVE-005), completes a move-in at the SCALE-001 floors rather than within one Worker request:
- *Account export:* a ZIP of up to 2 GB holding up to 250,000 audience rows and a year of weekly campaigns with `granular_activity` (up to 25,000,000 activity rows) uploads from the browser straight to object storage in resumable parts, and a part that fails is re-sent alone. Mango reads it as a stream in bounded, durable steps (Queues or Workflows), staging rows in storage rather than holding the archive, its text or per-row snapshots in memory. Preview writes no contact, shows every count with the row-level detail as a download, and keeps the custody hashes, undo and idempotent re-run of the Archive move-in policy.
- *API pull:* with a Mailchimp API key, members, merge fields, tags, segments, automations, campaigns and each campaign's email activity are read with paginated or batch operations within Mailchimp's connection and rate limits, from a saved cursor, at the same counts.
- *CSV files:* each audience file of up to the SCALE-001 import-row floor is one review.
- *Resumable:* an interruption (worker eviction, deploy, provider rate limit or a closed browser) resumes from the last committed step, as CONT-010 imports do, with no duplicate contact or activity fact and no operator re-upload. The move-in page shows progress per part and an estimated finish, and nothing sends until approved or activated (MOVE-006).
- Archives and pulls beyond these sizes are refused before any write with a named reason and the limit, as oversized archives are today.
-

**Acceptance.**
1. a generated Mailchimp account export with 250,000 contacts across the subscribed, unsubscribed, non-subscribed and cleaned files and 52 weekly campaigns with `granular_activity` moves in through the journey.
2. It is interrupted once by a forced worker restart during the activity import and resumes to completion with no re-upload.
3. Its reconciliation report adds up per file, evidence kind and activity rows.
4. A campaign to the whole subscribed audience then reaches review with an eligible count equal to an independent count over the generated files.
5. The run records its wall time and peak memory.
6. A generated API-pull fixture of the same size completes the same way.

**Evidence.** `src/core/features/move-in/archive-limits.ts` · `tests/move-in/archive.journeys.ts`
**Gap.** acceptance not yet met: A generated Mailchimp account export with 250,000 contacts across the subscribed, unsubscribed, non-subscribed and cleaned files and 52 weekly campaigns with granular_activity moves in through the journey. It is interrupted once by a forced worker restart during the activity import and resumes to completion with no re-upload. Its reconciliation report adds up per file, evidence kind and activity rows. A campaign to the whole subscribed audience then reaches review with an eligible count equal to an independent count over the generated files. The run records its wall time and peak memory. A generated API-pull fixture of the same size completes the same way.

#### MOVE-013 — Two-way sync during the parallel run

Core · target · **missing**

**Requirement.** From the moment a move-in with API access completes until the owner marks the cutover complete (MOVE-006), Mango and the incumbent stay in step on consent. An opt-out in either is an opt-out in both, as CAN-SPAM treats them for one business.
- *Mailchimp in:* a Mailchimp API-key move-in (MOVE-001) registers an audience webhook on each moved audience for subscribe, unsubscribe, profile, email-change and cleaned events from every source (subscriber, admin and API).
  - Mailchimp does not sign audience webhooks, so each webhook URL carries an unguessable secret for that move-in. Mango reads the member back from the Marketing API before applying an event. When that read fails, an unsubscribe or clean still applies, because opt-out precedence wins; a subscribe or profile change waits for the next read.
  - Every 15 minutes, a cursor re-pull of the members changed since the last pull (`since_last_changed`) applies anything a webhook missed. It uses the same idempotent path, so a dropped or repeated event never changes anything twice.
- *Applying incoming changes:*
  - An unsubscribe applies CONT-004, and an unsubscribe Mailchimp marks as `abuse` is a complaint that applies CONT-006. A clean applies CONT-006. Each is recorded with the incumbent as its source and applies before Mango's next hand-off to that contact.
  - A new subscriber arrives subscribed with incumbent-held evidence (CONT-024) under the audience's existing attestation, and a `pending` member stays pending. Either enters the flows whose triggers admit them (FLOW-002), such as the welcome series.
  - A profile change updates the mapped properties (MOVE-001). An email change moves the address under CONT-001 and keeps its consent.
  - No incoming change ever upgrades a status Mango holds as unsubscribed or suppressed (CONT-004).
- *Freshness before sending:* while the sync is on, the incumbent is a source under STORE-005.
  - A campaign step begins dispatch only after a re-pull completed within the previous 15 minutes, and runs one first if needed.
  - A flow hand-off waits with `incumbent-sync-stale` while the last successful re-pull is more than 30 minutes old, until a re-pull succeeds or its deadline passes (CAMP-010).
  - Approval names a stale incumbent sync as a blocking check (CAMP-004).
- *Mango out:* every Mango unsubscribe, one-click unsubscribe, preference-center opt-out and suppression (CONT-004, CONT-006, CONT-016) is written back as an unsubscribed member, through the Marketing API, to each moved audience that holds the address. So is an erasure request (CONT-013), written before the erasure completes.
  - Transient failures are retried up to 5 times over 1 hour. A write-back that still fails is shown on the move-in page and on Home with its count, its error and a retry action, and the pending write-backs can be downloaded as a CSV to import into the incumbent by hand.
  - The webhook echo of Mango's own write-back is recognized and recorded once.
- *Export-only move-ins:* the move-in page states that, without an API key, Mango cannot see later incumbent changes, and that the export must be re-imported before each Mango send during the parallel week.
  - A re-import of a newer export is a delta under the same idempotent rules: new restrictive statuses apply, new subscribers arrive as incumbent-held under the attestation, and nothing is upgraded.
  - Approval shows an advisory finding (MSG-007), which the approver acknowledges on record, when the last incumbent import is older than the last incumbent send Mango knows of. That is the latest send in the imported campaign history. While the MOVE-008 journey inventory lists a journey the owner has not marked turned off, it is 24 hours after the last import.
- *Ending the sync:* **Mark cutover complete** (Owner or Admin; OPER-004) works in this order:
  - It first flushes pending write-backs, and lists any that still fail.
  - It then deletes the registered webhooks at the incumbent, stops the re-pull and write-back, and deletes the stored incumbent API key.
  - The event and its operator are recorded in the activity log (OPER-007). A later call to an old webhook URL is answered 410 and changes nothing.
  - Until the cutover is marked, Home shows the parallel run's day count and the sync's last success.
- *Other incumbents:* the same sync runs for every incumbent whose API allows it. The move-in page names, for each incumbent, the mechanism used in each direction and any gap.
  - Klaviyo: a 15-minute re-pull of profiles and subscription changes in, and write-back through its unsubscribe and suppression jobs (MOVE-002).
  - ActiveCampaign: its unsubscribe, subscribe, bounce and contact-update webhooks plus the re-pull in, and write-back by setting each list status to unsubscribed (MOVE-003).
  - Kit: its subscriber activate, unsubscribe, bounce and complaint webhooks plus the re-pull in, and write-back through its unsubscribe endpoint (MOVE-004).
  - beehiiv, Omnisend and Customer.io: their subscription webhooks, or a re-pull where they have none, in, and write-back by their subscription or attribute updates (MOVE-005).
  - Where an incumbent, or the buyer's plan with it, offers no write-back, the move-in page says so and the cutover checklist adds a suppression-CSV import into that incumbent.
-

**Acceptance.**
1. after a Mailchimp API-fixture move-in, the Mailchimp edge emits three webhook events: an unsubscribe for contact A, a cleaned event for B and a subscribe for new address C.   - A Mango campaign approved and dispatched straight afterwards excludes A as `unsubscribed` and B as `suppressed`.
2. C is subscribed with incumbent-held evidence and enters the live welcome flow.   - With the webhooks dropped, the same three changes made at the edge are applied by the 15-minute re-pull before the next dispatch.
3. An event sent to a URL with the wrong secret changes nothing.   - An unsubscribe from a Mango email appears as an unsubscribed member at the Mailchimp edge.
4. A forced edge failure shows the write-back retried and then failed on the move-in page.   - Marking the cutover complete deletes the webhooks at the edge, and a later Mailchimp event changes nothing in Mango.   - An export-only move-in shows the approval advisory once the imported history holds a send after the import.   - A Klaviyo API fixture and a Kit webhook fixture each carry one unsubscribe in and one write-back out.

**Evidence.** None.
**Gap.** not implemented

#### MOVE-014 — Incumbent images brought home

Core · target · **partial**

**Requirement.** Images that imported templates, campaign bodies and flow messages load from an incumbent's hosts (for Mailchimp, `mcusercontent.com` and `gallery.mailchimp.com`; for every other incumbent, the image hosts its move-in fixtures name) are re-hosted as campaign images (CAMP-012) before the incumbent account can close.
- *Source:* from an account export, the gallery files it already carries, matched to each image address by file name and content; from an API move-in, or for an image the export lacks, one fetch per image under MSG-006's network inspection, within CAMP-012's type, byte and pixel limits.
- *Rewrite:* each matching `img src` is rewritten to the deployment's `/media/<sha256>` address, with its alt text, size and link unchanged, and the conversion report lists each image re-hosted or failed with its reason. A failed image stays on its incumbent host and is listed for the operator to upload a replacement.
- *Cutover:* the reconciliation report counts images re-hosted, failed and still on an incumbent host, and the cutover checklist (MOVE-006) confirms that no template, draft, scheduled campaign or live flow message still uses an incumbent image host before **Mark cutover complete**, naming each one that does.
-

**Acceptance.**
1. a Mailchimp account-export fixture with three gallery images used by a template and a campaign moves in, and every image source is rewritten to `/media/`, serving the same bytes.
2. An API-fixture template's image is fetched from the edge and re-hosted the same way.
3. An image the edge answers 404 for is listed as failed and blocks the cutover checklist item until replaced, and the checklist names the template using it.

**Evidence.** `tests/go-live/content-checks.journeys.ts` · `tests/go-live/template-conversion.ts` · `tests/go-live/incumbent-image-journey.ts`
**Gap.** Gap: The cutover checklist item and its block on Mark cutover complete (MOVE-006 checklist unbuilt; MOVE-013 owner-held), flow messages (FLOW-*), and every other incumbent's image hosts beyond the Mailchimp-host fixtures proved here remain unproved. Large galleries remain subject to the existing retained archive-data budget. Scheduled-campaign enumeration beyond the proved template and draft list remains unproved.

#### MOVE-015 — Incumbent engagement history beyond the Mailchimp export

Core · target · **missing**

**Requirement.** Each sent campaign's email activity imports as historical click and open facts on the matching contacts at their original times when a Mailchimp move-in uses an API key, under every MOVE-009 rule. Imported clicks, from every move-in, count as engagement for sunsetting (CONT-020), campaign-activity segments (SEG-006), engagement scores (SEG-005) and send-time optimization (EXP-006); imported opens count for none of them. Klaviyo, ActiveCampaign, Kit and the other incumbents bring their engagement history the same way where their exports or APIs carry it (MOVE-002 to MOVE-005).

**Acceptance.**
1. a Mailchimp API fixture at the network edge with email activity for three contacts across two sent campaigns and one unknown address imports one click or open fact per activity on the right contacts at their original times, with MOVE-009's reconciliation, timeline and no-result-change checks; each other incumbent's fixture, where its export or API carries engagement, does the same; and the imported-history acceptance of CONT-020, SEG-005, SEG-006 and EXP-006 passes.
2. Provider acceptance repeats the API-key import with a real Mailchimp account.

**Evidence.** None.
**Gap.** not implemented

### Mobile

#### MOBILE-001 — Responsive operator app

Core · target · **partial**

**Requirement.** Every operator page works at 390 pixels wide with no horizontal scroll: dashboards, reports, contact lookup, review and approval of campaigns, flow status and pause, forms and settings; the flow canvas is readable with node details.

**Acceptance.**
1. the representative-pages journey (`tests/newsletter-ui/representative-pages.journeys.ts`) extended to every operator page at 390 pixels with axe and overflow checks.

**Evidence.** `tests/newsletter-ui/representative-pages.journeys.ts`
**Gap.** acceptance not yet met: The representative-pages journey (tests/newsletter-ui/representative-pages.journeys.ts) extended to every operator page at 390 pixels with axe and overflow checks.

#### MOBILE-002 — Native iOS and Android app

Core · target · **missing**

**Requirement.** A native app for operators shows the overview dashboard and campaign and flow reports; opens any revision awaiting approval with its full previews and checks and lets a permitted role approve it; pauses a flow or presses Stop all sending (FLOW-011); answers SMS conversations (SMS-004); and receives push alerts for approval requests, flow errors, deliverability blocks and provider outages. It uses the same server authority and roles (OPER-004) and never sends anything offline.

**Acceptance.**
1. an app test against a test installation signs in, approves a revision with the same checks the web app shows, receives an outage alert from the push edge, and a role without approval rights sees no approve control and is refused by the server.

**Evidence.** None.
**Gap.** not implemented

### Publishing and monetization

#### PUB-001 — Web archive

Core · target · **done**

**Requirement.** Sent newsletters can be published as public web pages with an archive index, RSS feed and search-engine metadata; personalization is replaced by neutral text and unsubscribe and tracking links are removed.

**Acceptance.**
1. publishing a sent campaign creates a page and feed item with no recipient token or personal value.

**Evidence.** `tests/campaign-results/archive.journeys.ts` · `tests/audience-import/erasure.spec.ts`
**Gap.** None.

#### PUB-002 — Paid newsletters

Core · target · **partial**

**Requirement.** Creators offer paid tiers through Stripe Checkout and Stripe Billing on their own Stripe account (or Nectar), with US sales tax by Stripe Tax; paying subscribers join a paid topic, paid-only content is sent only to them, and cancellation or failed payment moves them back to the free topic. Mango never holds funds.

**Acceptance.**
1. a Stripe test-mode checkout journey subscribes a reader to the paid topic, a paid-only campaign reaches them and not free readers, and a cancellation webhook moves them back.

**Evidence.** `tests/go-live/roles.journeys.ts` · `tests/go-live/stripe-journey.ts` · `tests/go-live/paid-tier-journey.ts` · `tests/portability.spec.ts` · `tests/local-start/retained-archive.journey.ts`
**Gap.** Sandbox proof pending: the acceptance's Stripe test-mode checkout needs a held restricted test key (rk_test_) for Mango's Owner connection; the held test keys are unrestricted (sk_test_), which the connection refuses by design. Stripe Tax's test-account state is ct's 23 October source read, not a live-provider receipt from this round. The Nectar rail is not connected (INT-004). Policy ruled by ct (22 October 20:05Z): payment never creates or widens consent; a paid topic needs the reader's own confirmed channel consent, opt-out and suppression win, and a payer without it is counted as paid, consent missing and never mailed. Paid membership follows a fresh Stripe read for checkout completed, customer.subscription.* including paused/resumed, invoice.payment_failed and invoice.paid: active/trialing is paid; past_due, unpaid, paused, incomplete, incomplete_expired and canceled leave; a later active/trialing read rejoins. Read-start time orders overlapping reads, never the event's created second; equally fresh conflicting reads leave the paid topic. Failed Stripe reads remove paid eligibility, move the source-authority fence, record a failed operation and return a retryable refusal; the same event can recover after a successful fresh read. Cancellation ends paid membership only, while consent withdrawal stops every send on the channel. Immediate-confirmation card methods only; delayed methods are not supported. Paid writes move the source-authority fence, including a change after the final recheck. Mango stores Stripe ids, states and Stripe-reported tax, never card data or funds. Payer signup/consent capture is PUB-005's separate obligation under ct's approved 23 October 04:38Z defaults; its implementation status is PUB-005's own row. No real provider call, store, account or consent was used.

#### PUB-003 — Recommendations

Core · target · **missing**

**Requirement.** At signup a creator can recommend partner newsletters they choose (reciprocal or not); a subscriber who ticks one is passed to that partner's own signup with explicit consent, and both sides see subscribers gained.

**Acceptance.**
1. ticking a partner at signup posts to the partner's signup edge with the consent text and records one recommendation.

**Evidence.** None.
**Gap.** not implemented

#### PUB-004 — Direct sponsorships

Core · target · **missing**

**Requirement.** Creators sell sponsor placements: a sponsor block in a chosen campaign or issue, a booking calendar of available slots, tracked sponsor clicks and a sponsor report to share.

**Acceptance.**
1. a booked slot inserts the sponsor block into that issue's draft, and the sponsor report lists the issue's tracked clicks.

**Evidence.** None.
**Gap.** not implemented

#### PUB-005 — Paid signup page and payer consent

Core · target · **done**

**Requirement.** A hosted paid-signup page shows the paid tier's price, Stripe Tax notice and consent wording, starts Stripe Checkout, and Checkout returns the reader to a Mango page that says what happens next. A payer without confirmed email consent gets CONT-003 evidence labelled `paid-checkout` and one CONT-009 confirmation, and joins the paid topic only after confirming; unsubscribed and suppressed addresses follow CONT-027.

**Acceptance.**
1. a first-time payer completes checkout from the page, appears as “paid, consent missing”, receives one confirmation at the mail edge and, after confirming, the next paid-only send; an unsubscribed payer stays unsubscribed until their own confirmation.

**Evidence.** `tests/go-live/roles.journeys.ts` · `tests/go-live/paid-signup-journey.ts`
**Gap.** Default ADOPTED, approved by ct 23 October 04:38Z: page only for an Owner-saved tier, displaying exact price/frequency before Checkout; newsletter consent is unchecked and separate from payment, recorded with timestamp, source and wording version when Checkout opens and authorizing only one confirmation per payer address per Checkout session. Already subscribed/confirmed needs no second confirmation. Never-confirmed payers receive no paid or free newsletters. Payment events never create or widen consent; unsubscribe and suppression win and resubscription requires the person’s own POST confirmation. Stripe hosts the card fields; Mango has none. Erasure follows the existing audit-fact rule and removes address and consent evidence. PUB-002’s restricted-key sandbox and Nectar gaps are separate; no real provider call or consent was used.

### Agents

#### AGENT-001 — Retention-gap finder

Core · push-further · **partial** · Cites BASE-AGENT-003, BASE-AGENT-007, BASE-AGENT-011

**Requirement.** On the schedule the owner sets, initially weekly, a retention agent works on Mango’s recorded orders, events, segments, live flows and results to find cohorts whose missing or inactive journeys leave repeat purchases at stake. Each finding carries its data, period, cohort size and revenue estimate from this installation’s own history.

**Acceptance.**
1. On the owner’s schedule, initially weekly, the agent identifies both a missing post-purchase flow and a lapsed cohort in seeded store history.
2. Each finding cites the queries and source period behind its count, and the cohort count equals the stored records.
3. The fixtures distinguish 412 first-time buyers from the last 90 days past their predicted reorder date with no reaching flow from 3,100 identified visitors last month whose browse-abandonment flow is off, and estimate the revenue at stake from this installation’s own history.

**Evidence.** `src/core/features/proposals/forecast.ts` · `src/core/features/proposals/service.ts`
**Gap.** The existing proposal forecast and service provide store-grounded observations. Scheduled retention findings for both a missing post-purchase flow and a lapsed cohort, their cited queries and counts, and the installation-history revenue estimate remain unproved.

#### AGENT-002 — Journey proposal with holdout and stop rules

Core · push-further · **missing** · Cites BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** For a chosen retention finding, the agent prepares a FLOW-001 journey with catalog-grounded brand content, exits, a powered randomized holdout, a declared outcome and measurement period, and stop rules. Activating the exact saved revision carries commitment and live; any resulting outside message also carries external. The company’s policy decides those calls, including the person’s step when its rule asks for one.

**Acceptance.**
1. The seeded lapsed-cohort proposal includes its trigger, audience filters, messages in the brand kit’s style grounded under AGENT-007, and exits.
2. Its randomized holdout share and size follow the EXP-005 power calculation and it names an outcome, such as repeat purchase within 60 days, and a measurement period.
3. Its stop rules can express unsubscribe rate above 1 per cent, complaint rate above 0.1 per cent, and a lift interval excluding a positive effect after the measurement period.
4. Under the held company policy, the commitment and live calls for FLOW-008 activation wait for the named person, then activate the exact revision through the normal validation checks.
5. Under the all-autonomous company policy, the equivalent agent activation takes that policy’s decision and is recorded as the agent’s act.

**Evidence.** None.
**Gap.** not implemented

#### AGENT-003 — Outcome judge

Core · push-further · **missing** · Cites BASE-AGENT-006, BASE-AGENT-007

**Requirement.** For an agent-proposed or other holdout-carrying flow, Mango’s outcome agent compares the declared outcome in the messaged and held-out groups at the declared checkpoints. It explains lift and its interval and recommends keeping, changing or retiring the flow using measured repeat purchases or revenue. Pause, resume and widening carry live, with external added when the change reaches recipients; the company’s policy decides each call.

**Acceptance.**
1. At each checkpoint, the report compares the declared outcome in messaged and held-out groups and shows lift with its interval in plain language.
2. When the seeded holdout converts as well as the messaged group, the agent reports no supported lift and recommends retirement; opens alone never support that recommendation.
3. A breached complaint threshold triggers the declared stop-rule pause under the company policy and notifies operators.
4. The same seeded stop, resume and widening changes receive the decisions of their live class under both company policies.

**Evidence.** None.
**Gap.** not implemented

#### AGENT-004 — Lifecycle failure diagnosis and repair

Core · push-further · **partial** · Cites BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-012

**Requirement.** The lifecycle agent identifies disconnected or lagging integrations, webhook sequence or timestamp gaps, stuck waits, rising skip reasons, coupon-creation failures and provider errors. Its repair plan names the cause, affected contacts and flows and the source-window resync, event replay or eligible re-enrollment needed. Repair carries live, adding external when it creates outside messages, and the company’s policy decides whether it runs or awaits the person its rule names.

**Acceptance.**
1. A simulated six-hour Shopify webhook outage is reported with its cause, the 37 missed checkouts and affected flows.
2. The proposed repair names its source window, replayed events and eligible contacts, preserving FLOW-010 relevance windows and prior delivery and opt-out authority.
3. Under the held company policy, the replay waits for the named person and then enrolls only still-relevant contacts not already messaged, sending nothing twice.
4. Under the all-autonomous company policy, the same repair receives that policy’s decision while the same relevance, opt-out and deduplication checks hold.

**Evidence.** `src/core/features/store/synchronize.ts` · `src/core/features/lifecycle/provider-outages.ts`
**Gap.** Existing synchronization and provider-outage handling provide source recovery primitives. The six-hour agent diagnosis, affected-checkout listing, deduplicated relevant replay and company-policy decisions are not yet proved.

#### AGENT-005 — Deliverability diagnostician

Core · push-further · **missing** · Cites BASE-AGENT-006, BASE-AGENT-007

**Requirement.** A deliverability agent explains changes using bounce codes, complaints, DELIV-005 mailbox-provider breakdowns, DNS state and Postmaster data. It links each diagnosis to its evidence and prepares sunset-segment, ramp or DNS fixes. Applying a fix carries standard, live or security according to the setting it changes, and the company’s policy decides its execution.

**Acceptance.**
1. Seeded Outlook policy-block bounces after a campaign to unengaged contacts produce a diagnosis naming that campaign, Microsoft and the affected segment with supporting evidence.
2. The proposed sunset-segment, slower-ramp or DNS changes are inspectable drafts whose preparation changes no live setting.
3. Applying a chosen fix is classified from the segment, running ramp or protective DNS setting it changes and follows the company’s policy.

**Evidence.** None.
**Gap.** not implemented

#### AGENT-006 — Account audit

Core · push-further · **missing** · Cites BASE-AGENT-003, BASE-AGENT-007

**Requirement.** On request, Mango’s account auditor checks live flows, recent campaigns, forms and settings against working marketing practice and this installation’s data. It identifies missing core flows, flows without exit goals, messages without plain-text alternatives, unbalanced frequency, forms without SMS capture, untested subject lines and expired coupons, linking each finding to its object and an editable draft fix.

**Acceptance.**
1. A seeded account with three known issues yields all three findings with links to the affected objects.
2. Each finding opens a one-click draft fix without applying it as a side effect of the audit.
3. The audit examines core-flow coverage, exits, plain-text alternatives, frequency, SMS-capture forms, subject-line tests and coupon expiry using the installation’s records.

**Evidence.** None.
**Gap.** not implemented

#### AGENT-007 — Grounded content drafting

Core · push-further · **partial** · Cites BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007

**Requirement.** For campaigns and flow messages, an agent prepares subject lines, preheaders, body copy, SMS text and product selections in the brand’s voice, using its brand kit, catalog, past messages and measured results. Product, price and offer claims retain PROP-006’s evidence rule. Sending or activating drafted work carries external and, for changing a running flow, live; the company’s policy decides those calls.

**Acceptance.**
1. The abandoned-cart draft names only products and prices present in the catalog or an approved source revision.
2. A drafted claim outside its evidence is rejected under PROP-007, without turning it into a sendable campaign.
3. Subject lines, preheaders, body copy, SMS text and product selections draw on the saved brand kit, catalog, messages and measured results.
4. Preparing content does not send it; subsequent send and activation calls take the company’s decisions for their computed external and live classes.

**Evidence.** `src/core/features/proposals/generation.ts` · `tests/proposals-decision/decision-routes.spec.ts`
**Gap.** Existing proposal generation has grounding and rejection checks. Abandoned-cart and flow-message drafting across all listed content fields, brand and measured-history inputs, and the agent registry’s policy-based send and activation paths remain unproved.

#### AGENT-008 — Natural-language segments and questions

Core · push-further · **missing** · Cites BASE-AGENT-003, BASE-AGENT-006, BASE-AGENT-007

**Requirement.** An operator describes an audience or asks a marketing question in words. The agent produces an editable structured segment or report with its plain-language summary, count and cited report evidence. Saving the prepared segment is a standard call whose execution the company’s policy decides.

**Acceptance.**
1. The request for Texas customers who bought twice but not in the last 120 days produces state, order-count and recency conditions with a matching plain-language summary.
2. Its count equals the segment builder’s count on the same records, and the prepared rule can be edited or saved.
3. A question about the flow with the most incremental revenue last quarter answers from the cited report, retaining the distinction between measured lift and attribution.

**Evidence.** None.
**Gap.** not implemented

#### AGENT-009 — Scheduled routines and editable memory

Core · push-further · **missing** · Cites BASE-AGENT-007, BASE-AGENT-011

**Requirement.** Owners set scheduled routines such as a weekly performance digest, threshold-based revenue, unsubscribe or complaint alerts and pre-holiday checks. The routine uses the cost limit the owner sets through the company’s policy. Its remembered operator notes and decisions remain readable, editable and deletable and shape every agent’s subsequent work.

**Acceptance.**
1. A seeded revenue drop triggers its configured anomaly alert exactly once and the routine stays within the owner-set cost limit.
2. A weekly digest and a pre-holiday readiness check run at their configured times, while unsubscribe and complaint alerts use the configured thresholds.
3. The operator can read, edit and delete a remembered note or decision.
4. A memory note excluding the Heritage product line keeps that line out of the next drafted content.

**Evidence.** None.
**Gap.** not implemented

#### AGENT-010 — Retention-routine authority and activity

Core · push-further · **partial** · Cites BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008, BASE-AGENT-009, BASE-AGENT-011

**Requirement.** Mango’s retention routines bind their requested read scope, output jobs and owner-set monthly USD model budget to their routine identity. Their campaign approval or activation, send or test-send, consent, suppression, discount, targeting and spend changes carry the classes declared in the Agent surface and take the company’s policy decision. The Activity screen distinguishes each routine grant in its agent filter, and disabling a routine prevents its next scheduled run.

**Acceptance.**
1. Under a company policy blocking commitment, live and external, a routine’s campaign approval, activation, send and test-send attempts are refused with a named reason and appear in Activity.
2. Under a company policy blocking standard for consent changes, the routine’s consent-change attempt is refused with a named reason and appears in Activity; the same class follows an all-autonomous policy in its companion run.
3. Discount and spend changes carry money, and targeting or running-flow changes carry live, with the call facts and decision visible for the routine.
4. The routine’s permitted Activity entries identify its grant and the Activity agent filter lists those grants.
5. Disabling the named routine prevents its next scheduled run.

**Evidence.** `tests/proposals-decision/decision-routes.spec.ts`
**Gap.** Existing proposal-route checks constrain generation. The complete policy-driven routine job matrix, grant-valued Activity filter, disabling the next scheduled run and owner-set routine budget remain unproved.

#### AGENT-011 — Migration agent

Core · push-further · **missing** · Cites BASE-AGENT-003, BASE-AGENT-006, BASE-AGENT-007

**Requirement.** During move-in, the agent reads an incumbent export or API under MOVE-001 to MOVE-005, proposes field, topic and tag mappings with reasons, translates automations into draft flows and explains unsupported steps. It checks the reconciliation report for anomalies, including any mapping that would upgrade consent. Applying its plan carries standard, adding live for changing a running parallel sync; the company’s policy decides whether the import plan runs or awaits its named person.

**Acceptance.**
1. A Klaviyo fixture yields a proposed mapping for every field and flags the consent-upgrading column.
2. Under the held company policy, applying the plan awaits the named person and writes nothing beforehand; under the all-autonomous company policy, the same plan takes that policy’s decision.
3. A Mailchimp fixture yields the MOVE-007 segment and MOVE-008 journey mappings, explaining every unsupported condition and step.
4. The prepared import plan includes topic and tag mappings with reasons and the reconciliation anomalies it found, without activating imported flows.

**Evidence.** None.
**Gap.** not implemented

## Agent surface

### Agent surface

#### SURFACE-001 — The marketing registry and conformance journey

Agent surface · target · **missing** · From new · Cites BASE-AGENT-001, BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-013 · Register R-601

**Requirement.** Mango’s marketing specialist exposes the Core jobs in the tool table and the record families in the resource list through Base’s agent door. The same table documents the particular visual, device, installation and import-door work that is not a tool.

**Acceptance.**
1. The registry’s Core clause associations equal the table, including Mango’s consent, campaign, flow, migration, paid-newsletter and retention-agent jobs.
2. The specialist’s listed job prompts cover campaign preparation, lifecycle recovery, retention review, migration planning and account audits with their clause references.
3. The public discovery instructions link the marketing records, tool table and non-tool reasons used by a stranger starting with only the Mango URL.
4. The Base conformance harness runs Mango’s tool fixtures and every SURFACE acceptance point under the all-autonomous and held company policies, including the marketing specialist week in SURFACE-008.

**Evidence.** None.
**Gap.** The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented.

#### SURFACE-002 — Drafts and outside marketing exposure

Agent surface · target · **missing** · From new · Cites BASE-AGENT-003, BASE-AGENT-006, BASE-AGENT-007

**Requirement.** Mango classifies a reversible internal draft or segment change as standard. A call that exposes a message, form, archive issue, report, customer audience or model context outside the business carries external from the recipient or visibility change, including a flow action that will deliver outside.

**Acceptance.**
1. Saving an internal campaign draft or segment is standard with its changed-item count.
2. Sending an email, SMS, test message or push is external with the channel, recipient count and counterparty derived from the addressed records.
3. Publishing a form, landing page or archive issue is external with public counterparty, while an internal preview of the same revision is standard.
4. An ad-audience upload, scheduled report delivery or selected model request carries external for the actual receiving service or people.
5. A known recipient relationship and a new recipient relationship yield known and new counterparties respectively; a public issue yields public.
6. An import field or generated message that claims its recipient is internal leaves these classes and facts unchanged.

**Evidence.** None.
**Gap.** The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented.

#### SURFACE-003 — Sending-provider setup classes

Agent surface · target · **missing** · From new · Cites BASE-AGENT-004, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** The marketing specialist distinguishes provider account creation from credential custody and from provider steps retained for a person. Sending-domain verification, sending-provider setup, Shopify authorization and SMS registration are classified from the provider operation and response.

**Acceptance.**
1. Creating or verifying a sending domain, provider account or SMS sender registration carries accounts with its named provider.
2. Storing or rotating a marketing-provider credential or changing protective sender-authentication settings carries security with the changed setting.
3. A Shopify or other provider authorization consent, identity verification, carrier-registration attestation or hosted payment entry that the provider reserves for a person carries gated with that provider and step.
4. An API or broker credential route that the provider permits takes the company’s decision for its actual classes; its facts never claim a person completed a hosted step.
5. A completed setup returns the particular sender, shop or carrier-registration resource and leaves other connections unchanged.

**Evidence.** None.
**Gap.** The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented.

#### SURFACE-004 — Marketing authority and irreversible privacy operations

Agent surface · target · **missing** · From new · Cites BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-011

**Requirement.** Mango classifies staff and integration-grant changes as access, credential or protective-setting changes as security, and irreversible contact erasure or unrecoverable deletion as destructive. These classifications use the saved operation and current records, not a confirmation claimed by the caller.

**Acceptance.**
1. Inviting an operator or enlarging another integration grant is access with the number of people or grants and widening direction; removing membership or narrowing a grant records narrowing.
2. Changing a sender secret or an authentication protection is security with its setting name.
3. Erasing a contact or permanently purging retained marketing data is destructive with its affected-item count; a reversible draft removal stays standard.
4. The contact-erasure fixture removes that contact’s Mango data while retaining the particular surviving opt-out custody CONT-013 requires.
5. A routine disable changes access for that routine and prevents its next scheduled run.

**Evidence.** None.
**Gap.** The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented.

#### SURFACE-005 — Paid marketing and exact-revision commitments

Agent surface · target · **missing** · From new · Cites BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** Mango classifies paid-tier prices, coupon value, sponsorship terms and changes to what the business charges or pays as money. A campaign sign-off, binding sponsorship agreement or other decision relied on as a sign-off carries commitment for its saved revision; publishing a paid offer also carries external.

**Acceptance.**
1. Changing a paid-newsletter recurring price or a coupon’s monetary value carries money with amount, currency and the customer or provider counterparty.
2. Changing a provider spending commitment or sponsorship charge carries money with the value the saved operation changes.
3. A campaign or flow sign-off carries commitment with its exact revision and the value or counterparty where the record has one.
4. A binding sponsorship acceptance carries commitment and money for its terms, while drafting those terms is standard.
5. A paid offer exposed to readers adds external without creating or widening any reader’s channel consent.
6. Under both company policies, the computed classes remain equal for the same saved price, coupon and revision.

**Evidence.** None.
**Gap.** The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented.

#### SURFACE-006 — Live marketing changes

Agent surface · target · **missing** · From new · Cites BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-012

**Requirement.** Mango’s live class identifies changes to running flows, public capture, send schedules, tracking and delivery configuration. Merely drafting a prospective change stays standard; activation and changes to the running service use the affected service records.

**Acceptance.**
1. Activating, pausing, resuming, archiving or changing a running flow carries live with the flow service identity.
2. Changing a running campaign schedule, active intake setting or onsite-tracking switch carries live with the affected campaign or site.
3. Changing an active sending route or connector behavior carries live in addition to any accounts, security, access or external class that the same operation meets.
4. The same flow draft before activation stays standard, and its activation adds live without losing the exact-revision checks in FLOW-008.
5. The company-policy fixture’s repair replay changes only the declared source window and eligible enrollments, leaving previously delivered messages intact.

**Evidence.** None.
**Gap.** The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented.

#### SURFACE-007 — Marketing records and reports

Agent surface · target · **missing** · From new · Cites BASE-AGENT-003, BASE-AGENT-010, BASE-AGENT-013

**Requirement.** The specialist reads Mango contacts, consent facts, source records, segments, campaigns, flow revisions and enrollments, forms, experiments, provider outcomes, import plans and marketing reports through the resource families listed below. Its output keeps measured lift, attribution, forecasts and provider hand-off distinct.

**Acceptance.**
1. The seeded campaign report exposes separate provider acceptance, delivery, opens, clicks, attributed revenue and measured holdout lift records.
2. A retention finding links back to its source cohort, segment or flow resources, and a proposed repair links the affected source window and enrollments.
3. The source fixture’s failed or unavailable data remains unavailable in the agent’s result rather than becoming a generated fact.
4. The migration resource includes the reconciliation and unsupported-step reports for the same retained import plan.

**Evidence.** None.
**Gap.** The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented.

#### SURFACE-008 — A stranger runs a seeded retention week

Agent surface · target · **missing** · From new · Cites BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-013 · Register R-601

**Requirement.** Given only the installation URL, the marketing specialist runs a seeded week of audience review, grounded campaign preparation, lifecycle recovery and retention measurement through MCP. The same week runs under an all-autonomous company policy and a held company policy, with the business’s decisions determining each class.

**Acceptance.**
1. The agent discovers Mango, reads the store history, finds the lapsed cohort and missing post-purchase flow, and prepares the powered holdout journey with its measurement period and stop rules.
2. It prepares a catalog-grounded campaign and a flow message, checks eligibility and exact revisions, and schedules the chosen work through the declared tools.
3. The week includes one public signup-form update, one new outside recipient, one known recipient, a provider setup through its permitted service-credential API route, a role-narrowing change and a contact erasure.
4. The week includes a paid-tier price change, a campaign sign-off and a running-flow repair, covering money, commitment and live with the operation facts in SURFACE-005 and SURFACE-006.
5. With every class autonomous and the seeded provider offering its service-credential API route, the week completes without a person taking an approval or provider step, a policy refusal, a policy wait or a review-feed entry.
6. With standard reviewed and every other used class held by the company policy, draft changes appear in review and the remaining calls run exactly once after the signed-in person named by the policy takes the returned steps.
7. A seeded complaint breach triggers the declared stop rule and operator notice, and the checkpoint report explains whether measured repeat-purchase lift supports keeping or retiring the flow.
8. The end-of-week report reconciles tool outcomes, affected recipients, flow state, source recovery and measured costs to Mango’s stored records, without counting opens as incremental purchases.

**Evidence.** None.
**Gap.** The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented.

#### SURFACE-009 — Specialist handoffs keep marketing context

Agent surface · target · **missing** · From new · Cites BASE-AGENT-003, BASE-AGENT-010, BASE-AGENT-012, BASE-AGENT-013

**Requirement.** Mango’s specialist follows purchase and customer events from connected commerce and CRM systems and emits typed marketing outcomes for other specialists. A handoff supplies the relevant Mango record, source time and consent context so the receiving job can inspect the evidence.

**Acceptance.**
1. A connected store purchase produces a post-purchase candidate linked to the source order and contact, while the contact’s current channel consent still controls eligibility.
2. A signed-out or withdrawn customer cannot become sendable merely because a sibling handoff or imported record requests a marketing action.
3. A delivered message, consent withdrawal, lapsed-cohort finding and completed flow goal produce the documented marketing event types with their Mango record links.
4. The same source event replay produces one marketing effect and preserves the original source time in the affected record.

**Evidence.** None.
**Gap.** The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented.

## Later

None.

## Field proof register

| ID | Proof | Clauses | State | Date | Receipt |
| --- | --- | --- | --- | --- | --- |
| R-101 | Real Okta, Microsoft Entra ID, Google Workspace and JumpCloud tenant receipts for configured sign-in, group mapping and deprovisioning. | OPER-006 | not run |  |  |
| R-501 | Mango for Shopify public App Store listing and Shopify protected-customer-data and all-order-history approvals. | INT-015 | not run |  |  |
| R-502 | A real SendGrid and Resend account completes the owner connection, signed-event and branded-host TLS journeys. | DELIV-008, DELIV-002 | not run |  |  |
| R-503 | Zapier marketplace app availability and a real platform account receipt. | INT-009 | not run |  |  |
| R-601 | Mango’s remote MCP door works in the supported Claude, ChatGPT, Codex and Copilot clients. | SURFACE-001, SURFACE-008 | not run |  |  |
