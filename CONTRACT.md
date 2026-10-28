# CONTRACT.md — Mango target product contract

Run and verify through `rer`; AGENTS.md gives the local sequence and OPERATIONS.md describes configuration, recovery and data movement.

## Product target

Mango is an email and SMS marketing platform that a US small or mid-size business can switch to from Mailchimp, Klaviyo, ActiveCampaign or Kit (ConvertKit) without losing a capability it uses every week. It grows a consented audience through signup forms, popups and landing pages; builds campaigns in a drag-and-drop editor with a template library and brand kit; selects people with behavior-driven segments fed by the store and other business events; runs always-on automated flows (welcome, abandoned cart and checkout, browse abandonment, post-purchase, win-back and more) that start, wait, branch and exit on real events; sends SMS alongside email under US consent and carrier rules; tests and optimizes what it sends; and reports revenue attributed to each campaign and flow, with holdout-measured lift kept separate from attribution. Agents go further than today's up-and-comers (beehiiv, Customer.io, Omnisend): they find a retention gap in connected purchase and engagement data, propose a journey with its audience, stop rules and holdout, run it only once a person approves it, and judge it on measured repeat purchases rather than open rates (see [Agents](#agents)).

| | |
| --- | --- |
| Category | Email marketing and marketing automation |
| Incumbents a buyer switches from | Mailchimp, Klaviyo, ActiveCampaign, Kit (ConvertKit); up-and-comers beehiiv, Customer.io, Omnisend |
| First buyer | A US ecommerce operator or creator-led business (about 1,000 to 250,000 contacts, one brand, one to ten people sending marketing) paying in USD |

This document is the product Mango is building towards, not only what exists today. Every clause carries a status in the [status table](#status) at the end: **done** (implemented and exercised by a cited test), **partial** (some of the behavior exists, cited) or **missing**. A missing clause is a release obligation of the target, not a waiver; difficulty (carrier registration, provider apps, native apps, payments) is engineering work recorded in a clause, never a reason to cut scope. ACCEPTANCE.md lists every clause's acceptance evidence and status for build rounds to work towards.

The first buyer is a US ecommerce operator or creator-led business (about 1,000 to 250,000 contacts, one brand, one to ten people sending marketing) paying in USD. US norms are the default: CAN-SPAM sender and unsubscribe rules, TCPA express written consent and quiet hours for marketing texts, CTIA and carrier 10DLC or toll-free registration, Gmail, Yahoo and Microsoft bulk-sender requirements, CCPA/CPRA and other US state privacy rights, and USD money with US sales tax handled by the payment provider. Mango states these as product rules; it does not give legal advice.

**Scope before (newsletter release, 6 October 2026):** operators collect confirmed consent, author and preview newsletters, approve one exact revision, freeze and recheck the recipient set and send on a timezone schedule with authenticated senders, unsubscribe handling and truthful delivery reporting; commerce, SMS and design are optional modules; visual journey automation, A/B testing, landing pages, roles and native apps were declared out of scope.

**Scope after (this contract):** the complete category job above. Visual flows, experiments, send-time optimization, landing pages and popups, roles and permissions, multiple commerce connections, SMS for the US, migration from every named incumbent and a native mobile app are now in scope. Every existing clause still holds: exact-revision approval for campaigns, reviewed activation for flows, consent and opt-out precedence, suppression, delivery truth, erasure, audit and portability are the guarantees the larger product is built on, not its whole job.

Neighboring products stay separate products, as the market separates them. Mango links to them rather than rebuilding them: the storefront and checkout are Stall's (`just-every/run-stall`) or Shopify's; the sales pipeline is Orbit's (`just-every/run-orbit`); full websites are Pane's; surveys and quizzes are Pencil's; cross-app workflow automation is Crank's; product feedback is Penny's; the support inbox is HappyToHelp's; subscription billing is Nectar's or Stripe's; payroll is Envelope's (`just-every/run-envelope`); work and project management is Pegboard's (`just-every/run-pegboard`); metrics, logs, traces and alerts are Porthole's (`just-every/run-porthole`). See [Honest boundaries](#honest-boundaries).

The primary journey: Exercise the capabilities and acceptance journeys below.

## How to read this contract

- This follows the RER contract standard.
- Core, Agent surface and Later are reported separately.
- Done means every acceptance point has recorded proof.
- Field proof is kept in its register.
- ACCEPTANCE.md and the homepage claims document are generated from this file.

## Shared duties (Base)

| Base duty | Duty | Delta clauses | Base journey |
| --- | --- | --- | --- |
| BASE-ACCESS-001 | Sign-in | none | not run |
| BASE-ACCESS-002 | Sessions | OPER-001, OPER-003, OPER-006 | not run |
| BASE-ACCESS-003 | Public endpoints | HOME-001, HOME-002, DOCS-001 | not run |
| BASE-ACCESS-004 | Server-side authorisation | OPER-002, OPER-004 | not run |
| BASE-INPUT-001 | Validation | CONT-010, CONT-013 | not run |
| BASE-INPUT-002 | HTML | none | not run |
| BASE-INPUT-003 | Uploads | none | not run |
| BASE-SECRET-001 | No leakage | none | not run |
| BASE-SECRET-002 | Startup | none | not run |
| BASE-DATA-001 | Export and import | CONT-030 | not run |
| BASE-DATA-002 | Retention | CONT-012 | not run |
| BASE-DATA-003 | Erasure | OPER-007, CONT-013, CONT-029, CONT-030 | not run |
| BASE-DATA-004 | Outbound flows | CONT-029 | not run |
| BASE-DATA-005 | Independence | HOME-002 | not run |
| BASE-PUBLIC-001 | Privacy | HOME-001, HOME-002, DOCS-001 | not run |
| BASE-PUBLIC-002 | Origins | none | not run |
| BASE-PUBLIC-003 | Accessibility | HOME-002 | not run |
| BASE-OPS-001 | Health | none | not run |
| BASE-OPS-002 | Migrations | none | not run |
| BASE-OPS-003 | Idempotency | STORE-002, CONT-006, CONT-007 | not run |
| BASE-OPS-004 | Failure is visible | STORE-003, STORE-004 | not run |
| BASE-OPS-005 | Audit | none | not run |
| BASE-ROLE-001 | Roles through every door | OPER-001, OPER-004 | not run |
| BASE-AUDIT-001 | Searchable, durable audit | OPER-003, OPER-004, OPER-006, OPER-007 | not run |
| BASE-BACKUP-001 | Independent backup, restore and rollback | none | not run |
| BASE-DATA-006 | Erasure respects retention and legal hold | none | not run |
| BASE-SIGNIN-001 | Standards-based SSO and lifecycle | OPER-002, OPER-006 | not run |
| BASE-SIGNIN-002 | Native multi-factor authentication | none | not run |
| BASE-INSTALL-001 | Free self-host and removal | none | not run |
| BASE-MAIL-001 | Truthful mail outcomes | CONT-006, CONT-009 | not run |
| BASE-ACCESSIBILITY-001 | One accessibility bar | none | not run |
| BASE-DOCS-001 | On-site docs from one contract | DOCS-001 | not run |
| BASE-AGENT-001 | One MCP door per seed | none | not run |
| BASE-AGENT-002 | The seed's jobs are tools, through the UI's own actions | none | not run |
| BASE-AGENT-003 | Records are resources | none | not run |
| BASE-AGENT-004 | Business identity and short-lived, audience-bound tokens | none | not run |
| BASE-AGENT-005 | An agent acts as a person in a role, never more | none | not run |
| BASE-AGENT-006 | Every action declares its risk class | OPER-005 | not run |
| BASE-AGENT-007 | The company's policy decides, at one chokepoint | OPER-005 | not run |
| BASE-AGENT-008 | Truthful attribution | none | not run |
| BASE-AGENT-009 | Every agent action is audited with its class and decision | OPER-007 | not run |
| BASE-AGENT-010 | Agents can follow changes | none | not run |
| BASE-AGENT-011 | Limits are policy, and Pause stops everything | none | not run |
| BASE-AGENT-012 | Writes are idempotent and conflict-safe | none | not run |
| BASE-AGENT-013 | Manifest, docs and the conformance journey | none | not run |

## Published clauses

- `HOME-001`: *Tier:* Core · *Cites:* BASE-PUBLIC-001, BASE-ACCESS-003
- `HOME-002`: *Tier:* Core · *From:* HOME-001 · *Cites:* BASE-PUBLIC-001, BASE-DATA-005, BASE-PUBLIC-003, BASE-ACCESS-003
- `DOCS-001`: *Tier:* Core · *Cites:* BASE-DOCS-001, BASE-PUBLIC-001, BASE-ACCESS-003
- `OPER-001`: *Tier:* Core · *Cites:* BASE-ACCESS-002, BASE-ROLE-001
- `OPER-002`: *Tier:* Core · *Cites:* BASE-ACCESS-004, BASE-SIGNIN-001
- `OPER-003`: *Tier:* Core · *Cites:* BASE-ACCESS-002, BASE-AUDIT-001
- `STORE-001`: *Tier:* Core
- `STORE-002`: *Tier:* Core · *Cites:* BASE-OPS-003
- `STORE-003`: *Tier:* Core · *Cites:* BASE-OPS-004
- `STORE-004`: *Tier:* Core · *Cites:* BASE-OPS-004
- `STORE-005`: *Tier:* Core
- `STORE-006`: *Tier:* Core
- `STORE-007`: *Tier:* Core
- `CONT-001`: *Tier:* Core
- `CONT-002`: *Tier:* Core
- `CONT-003`: *Tier:* Core
- `CONT-004`: *Tier:* Core
- `CONT-005`: *Tier:* Core
- `CONT-006`: *Tier:* Core · *Cites:* BASE-OPS-003, BASE-MAIL-001
- `CONT-007`: *Tier:* Core · *Cites:* BASE-OPS-003
- `CONT-008`: *Tier:* Core
- `CONT-009`: *Tier:* Core · *Cites:* BASE-MAIL-001
- `CONT-028`: *Tier:* Core · *From:* CONT-005, CONT-009
- `CONT-010`: *Tier:* Core · *Cites:* BASE-INPUT-001
- `CONT-011`: *Tier:* Core
- `CONT-012`: *Tier:* Core · *Cites:* BASE-DATA-002
- `CONT-013`: *Tier:* Core · *Cites:* BASE-DATA-003, BASE-INPUT-001
- `CONT-029`: *Tier:* Core · *From:* CONT-013 · *Cites:* BASE-DATA-003, BASE-DATA-004
- `CONT-030`: *Tier:* Core · *From:* CONT-013 · *Cites:* BASE-DATA-003, BASE-DATA-001
- `PROP-001`: *Tier:* Core
- `PROP-002`: *Tier:* Core
- `PROP-003`: *Tier:* Core
- `PROP-004`: *Tier:* Core
- `PROP-005`: *Tier:* Core
- `PROP-006`: *Tier:* Core
- `PROP-007`: *Tier:* Core
- `PROP-008`: *Tier:* Core
- `PROP-009`: *Tier:* Core
- `AUD-001`: *Tier:* Core
- `AUD-002`: *Tier:* Core
- `AUD-003`: *Tier:* Core
- `AUD-004`: *Tier:* Core
- `AUD-005`: *Tier:* Core
- `AUD-006`: *Tier:* Core
- `AUD-007`: *Tier:* Core
- `CAMP-001`: *Tier:* Core
- `CAMP-002`: *Tier:* Core
- `CAMP-003`: *Tier:* Core
- `CAMP-004`: *Tier:* Core
- `CAMP-005`: *Tier:* Core
- `CAMP-006`: *Tier:* Core
- `CAMP-007`: *Tier:* Core
- `CAMP-008`: *Tier:* Core
- `CAMP-009`: *Tier:* Core
- `CAMP-010`: *Tier:* Core
- `CAMP-011`: *Tier:* Core
- `CAMP-012`: *Tier:* Core
- `DESIGN-001`: *Tier:* Core
- `DESIGN-002`: *Tier:* Core
- `DESIGN-003`: *Tier:* Core
- `DESIGN-004`: *Tier:* Core
- `MSG-001`: *Tier:* Core
- `MSG-002`: *Tier:* Core
- `MSG-003`: *Tier:* Core
- `MSG-004`: *Tier:* Core
- `MSG-005`: *Tier:* Core
- `MSG-006`: *Tier:* Core
- `MSG-007`: *Tier:* Core
- `MSG-008`: *Tier:* Core
- `MSG-009`: *Tier:* Core
- `MSG-010`: *Tier:* Core
- `MSG-011`: *Tier:* Core
- `MSG-012`: *Tier:* Core
- `SEND-001`: *Tier:* Core
- `SEND-002`: *Tier:* Core
- `SEND-003`: *Tier:* Core
- `SEND-004`: *Tier:* Core
- `SEND-005`: *Tier:* Core
- `SEND-006`: *Tier:* Core
- `SEND-007`: *Tier:* Core
- `SEND-008`: *Tier:* Core
- `SEND-009`: *Tier:* Core
- `RESULT-001`: *Tier:* Core
- `RESULT-002`: *Tier:* Core
- `RESULT-003`: *Tier:* Core
- `RESULT-004`: *Tier:* Core
- `RESULT-005`: *Tier:* Core
- `RESULT-006`: *Tier:* Core
- `DATA-001`: *Tier:* Core
- `MGMT-001`: *Tier:* Core
- `MGMT-002`: *Tier:* Core

### Home

#### HOME-001 — Lobby and public landing

**Requirement.** The installation’s public Lobby identifies Mango and directs a stranger to sender setup before claim and sign-in afterwards.

**Acceptance.**
1. Mango’s mark, name and one newsletter description identify the installation.
2. Before sender setup, the only action finishes setup; after saved setup, it signs in.
3. The setup-state reading agrees with the Lobby before and after claim.

#### HOME-002 — Newsletter landing

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

#### DOCS-001 — Public documentation

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

### Operators

#### OPER-001 — Operators and the default role

**Requirement.** Before individual roles are assigned, an operator has the product’s Admin capabilities. First-run sender setup gates operator documents until the business sender identity is valid.

**Acceptance.**
1. Before role assignment, an operator can see and act on proposals, campaigns, flows, contacts and settings as Admin.
2. Both server navigation and client navigation keep operator documents at sender setup until valid identity is saved.
3. Valid identity already configured for the installation also completes setup.
4. Authenticated configuration APIs remain usable during setup, and completing setup does not claim provider readiness.

#### OPER-002 — Management

**Requirement.** Operators manage invitations and removals in Settings, with fresh, session-bound email proof before an invitation grants access. The [management policy](docs/contract/mechanism.md) records its extension and default.

**Acceptance.**
1. Settings can invite an operator and remove an operator.
2. A session without fresh email proof cannot grant another operator access.
3. Settings can request a confirmation link bound to the current session; completing it permits an invitation retry.
4. Reading or inspecting the confirmation link has no effect; only its affirmative submission supplies proof.
5. Only the operator established at setup may remove that operator.

#### OPER-003 — Removal does not rewrite history

**Requirement.** Removing an operator preserves Mango’s authorship and decision history.

**Acceptance.**
1. Every proposal remains attributed to the removed operator.
2. Campaign approvals, revisions, approval requests, transitions and audit entries retain the removed author’s and approver’s identity.
3. Review, campaign detail and activity expose that retained attribution at desktop and phone widths.

### Store signals

#### STORE-001 — Store and event connections

**Requirement.** The owner connects the declared commerce and event sources from Settings without developer work. Each connection retains source identity, connection and occurrence time and combines one contact’s facts across connections.

**Acceptance.**
1. Shopify, WooCommerce, BigCommerce, Stripe, Square, Stall and the events API import every source type they declare: customers, products, variants, inventory, orders, refunds, carts, checkouts, subscriptions and browsing events.
2. Each connection is made from Settings by the owner without developer steps, including the merchant-installed Shopify connection.
3. Every imported fact retains its source identifier, connection and occurrence time.
4. A person present in two connections remains one contact carrying both sources’ records.
5. Each connection declares which source types it supplies under STORE-006.

#### STORE-002 — Source identity

**Requirement.** Repeated source deliveries preserve one commerce fact per source identity while refreshing its contents.

**Acceptance.**
1. A replayed webhook or repeated scheduled sync updates the existing customer, order, cart, refund or browsing-event source record without creating a duplicate.

#### STORE-003 — Freshness

**Requirement.** The Decision Desk explains freshness for each source type, retaining the last completed sync alongside later failure until completed recovery.

**Acceptance.**
1. Each source type displays its last successful completion time and any later sync failure.
2. A failed source retains its previous completion time while unaffected sources retain their own state.
3. A source with no completed sync shows no successful sync.
4. Completed recovery clears the error and advances the successful-completion time.
5. Desktop and phone Decision Desk views show the source, safe failure cause and retained completion time without provider-private diagnostics.

#### STORE-004 — Source failure

**Requirement.** Commerce outages do not destroy saved marketing work or cause a campaign to send. Ingestion and generation retain inspectable failed operations carrying the source’s safe error.

**Acceptance.**
1. An ingestion or proposal-generation failure records one failed operation carrying the adapter error; a forged delivery records no operation, replay adds none and recovery completes the operation.
2. Provider diagnostics, secrets, tokens and record payloads remain absent from failed-operation text.
3. Saved drafts remain editable, recorded delivery outcomes and history remain readable, and a scheduled campaign causes no new mail handoff during the outage.
4. The Store view shows generation and webhook failures at desktop and phone widths.
5. Webhook failure responses remain retryable under their provider’s protocol.

#### STORE-005 — Stale sources block approval

**Requirement.** Mango withholds approval when inclusion or exclusion rules depend on stale source facts. The [freshness window](docs/contract/mechanism.md) defines aged and failed sources.

**Acceptance.**
1. Aged and failed source data block both inclusion-dependent and exclusion-dependent saved campaigns, while review names the source and safe cause.
2. Blocked reviews keep audience counts unavailable and create no approval authority or recipient steps.
3. At desktop and phone widths the review labels stale data and prevents approval.
4. After a completed sync and explicit recheck, the same saved revision can pass its ordinary approval checks.

#### STORE-006 — Declared adapter capability

**Requirement.** Mango refuses to turn unsupported source requirements into an apparently empty or partial audience.

**Acceptance.**
1. Each commerce connection declares its supplied source types; uninstalled cart and browsing observations remain unavailable.
2. A rule, exclusion or proposal requiring an unsupplied source is labeled unavailable and cannot be approved.
3. Inclusion and exclusion reviews name the missing source, keep counts unknown and save no approval authority, snapshot or recipients.
4. The AI proposal-generation door names the missing source and saves neither campaign nor partial audience.

#### STORE-007 — Ingestion latency

**Requirement.** An accepted commerce webhook becomes readable source activity in the operator app within the documented ingestion-latency limit at declared capacity.

**Acceptance.**
1. Measure from webhook acknowledgement to app readability at the declared limits and meet the ingestion-latency bar.

### Contacts and consent

#### CONT-001 — Contact identity

**Requirement.** Canonical email and phone identities identify one Mango contact.

**Acceptance.**
1. Email comparison ignores case and surrounding whitespace.
2. Phone identities use the documented international canonical form.
3. Each canonical email or phone identity belongs to at most one contact on capture and import.

#### CONT-002 — Channel status

**Requirement.** Consent and eligibility are independent for email and SMS on every contact.

**Acceptance.**
1. Each channel independently represents pending, subscribed, non-subscribed, unsubscribed and suppressed as defined in the [channel-state specification](docs/contract/mechanism.md).
2. Only subscribed channels are eligible for a marketing send.
3. Store activity or consent on one channel never changes the other channel’s state.

#### CONT-003 — Consent evidence

**Requirement.** A subscription is bound to its recorded recipient, sender, channel and disclosure scope. Missing or obsolete consent cannot silently subscribe a contact.

**Acceptance.**
1. Capture and import retain channel, brand or legal sender, applicable SMS sender or program, subject or category, frequency, jurisdiction, capture method, source, occurrence time, consent text and version, and confirmation evidence.
2. Consent is used only for the recorded scope and current recipient.
3. Missing evidence creates a non-subscribed contact, except for the incumbent-held evidence CONT-024 defines.
4. A reassigned phone or one no longer belonging to the recipient becomes non-subscribed until fresh evidence is captured.
5. A stale or missing rendered disclosure cannot create consent evidence.

#### CONT-004 — Opt-out precedence

**Requirement.** An opt-out wins over every later marketing input and reaches pending marketing work before acknowledgment.

**Acceptance.**
1. Email unsubscribe, one-click unsubscribe and SMS opt-out set that channel unsubscribed before acknowledgement and exclude every draft, scheduled campaign and queued recipient step.
2. Imports, syncs, store events, merges and operator edits never reverse the opt-out.
3. During a parallel run, incumbent opt-outs and suppressions apply the same precedence, and Mango writes its own restrictions back to the incumbent.

#### CONT-005 — Resubscription

**Requirement.** A restricted channel returns to subscribed only through fresh recipient consent and the required confirmation. Suppression additionally needs its cause resolved.

**Acceptance.**
1. Fresh affirmative evidence is later than the opt-out and is confirmed under CONT-009 before resubscription.
2. An operator edit alone never resubscribes an unsubscribed or suppressed channel.
3. A suppression cause must be resolved before that channel becomes subscribed.
4. A recipient’s own public-form resubscribe follows CONT-027.
5. Public capture follows CONT-027’s protected-destination acknowledgement, confirmation allowance, suppression and never-downgrade rules; guarded capture follows CONT-028.
6. During parallel run, a confirmed resubscribe writes subscribed state back where the incumbent API allows; otherwise the cutover report lists it.

#### CONT-006 — Email suppression

**Requirement.** Mango’s email suppression gate applies provider restrictions before the next campaign handoff and retains the documented soft-bounce policy.

**Acceptance.**
1. A hard bounce, complaint or provider suppression suppresses the address before the next campaign handoff.
2. Soft bounces are recorded and visible, and apply the documented consecutive-bounce suppression rule.
3. A later provider-confirmed delivery resets the consecutive-soft-bounce count.
4. The connected sending provider’s signed delivery webhook supplies these facts, and incomplete webhook setup blocks approval.
5. Refreshing local authentication/setup credentials preserves existing contact-hash restrictions, including restrictions without a remaining contact row.
6. Legacy local authority conversion preserves the original verified contact authority before credential rotation; unknown or missing authority refuses work rather than selecting an unused secret.

#### CONT-007 — SMS compliance replies

**Requirement.** Signed SMS replies apply the sender, program and destination-jurisdiction semantics declared by the SMS adapter.

**Acceptance.**
1. Every documented STOP synonym opts out before acknowledgment; HELP and INFO request help.
2. START and UNSTOP begin fresh consent under CONT-005 without subscribing by themselves.
3. Each reply is recorded once, and Mango sends the configured compliance response only when the provider has not already sent it.

#### CONT-008 — Contact history

**Requirement.** A contact’s timeline brings marketing and source facts together in original occurrence order, preserving their sources while keeping other contacts and private payloads out.

**Acceptance.**
1. The timeline combines source activity, consent changes, suppressions, eligibility decisions, channel handoffs and deliveries, and operator actions.
2. Each fact uses its original occurrence time and source, including confirmation, approved eligibility and dispatch exclusions.
3. Older events remain reachable at desktop and phone widths.
4. Unrelated contacts and private source, provider and audit payloads remain absent.

#### CONT-009 — Confirmation

**Requirement.** The configured opt-in mode controls whether captured consent waits for a recipient confirmation or subscribes directly; CONT-025 owns source defaults and configuration authority.

**Acceptance.**
1. When confirmation is required, capture creates pending consent and one confirmation message on that channel.
2. An affirmative use of the opaque per-contact confirmation link subscribes the channel and records the confirming request’s time.
3. A pending channel receives no marketing send.
4. A confirmation link is single-use and stops working after the documented lifetime.
5. When confirmation is not required, recorded consent under CONT-003 subscribes the channel directly.
6. Opening or inspecting a confirmation link previews a form without changing consent, consuming its token or changing channel state; only its explicit affirmative submission confirms.
7. Active-identity, later-opt-out and suppression guards remain mandatory; operator-recorded SMS uses its separately authenticated exact-message reply under CONT-026 rather than a URL confirmation.

#### CONT-028 — Guarded consent capture

**Requirement.** Public consent capture and confirmation handoff preserve current recipient authority even when requests race. The [capture transaction specification](docs/contract/mechanism.md) records the guarded transaction and provider boundary.

**Acceptance.**
1. Public eligibility, profile changes, consent evidence, capture metadata, history and pending status commit together, or a currently barred destination gains none of the new consent records.
2. A surviving unsubscribe or erasure restriction may recreate an unsubscribed profile containing only new post-opt-out request evidence, without restoring history; confirmation mail stays within CONT-027’s shared allowance.
3. A surviving suppression restriction permits neither consent writes nor confirmation mail.
4. Confirmation preparation finishes before the authoritative handoff check; suppression, a later opt-out or an already committed confirmation prevents handoff when present at that check.
5. The adapter is invoked immediately after the authoritative check; a provider handoff already authorized and in progress cannot be recalled by a later transition.

#### CONT-010 — Import

**Requirement.** An operator reviews and imports CSV contact rows independently, preserving canonical identities, consent and restrictions. CONT-024 owns named-source attestation and SCALE-001 owns the review-size floor.

**Acceptance.**
1. Rows carry email or phone identity and may carry consent evidence under CONT-003; each row is validated independently.
2. A matching canonical identity updates one contact, and rerunning the same file changes nothing further.
3. The report reconciles created, updated and rejected counts and names a reason for each rejected row.
4. Import never subscribes an identity restricted by CONT-004.
5. A named incumbent export may use incumbent-held consent only under the owner’s once-per-source attestation; an unnamed file remains under the per-row consent rule.
6. Import undo preserves restrictions and the reviewed capacity meets SCALE-001.

#### CONT-011 — Merge

**Requirement.** Merging contacts preserves their combined marketing history and chooses the most restrictive channel state.

**Acceptance.**
1. The survivor keeps the union of source activity, consent, campaign history and suppressions.
2. For each channel, suppression wins over unsubscribe, non-subscription, pending and subscription, in that order.
3. A merge never resubscribes a restricted channel.

#### CONT-012 — Dormancy without deletion

**Requirement.** Dormancy is an audience label and exclusion based on original meaningful activity times. Imported-history gaps and open-only histories are explicit labels, never hidden assumptions.

**Acceptance.**
1. No click, order or consent change in the dormancy window makes a contact dormant and excluded under AUD-003 and AUD-008.
2. Imported clicks, orders and consent changes use the incumbent’s original occurrence times; opens never qualify as meaningful activity.
3. A move-in contact with no engagement history is no-history rather than dormant, and its dormancy window begins at move-in completion.
4. An otherwise dormant contact with only imported opens inside the window is labeled open-only.
5. Inactivity never deletes, unsubscribes or suppresses a contact; clearing a dormant list is an operator action.

#### CONT-013 — Erasure and surviving opt-out

**Requirement.** Contact erasure follows Base except for surviving unsubscribe and suppression restrictions. **Supersedes BASE-DATA-003 only for this opt-out dependency, including its retained portable mapping and exported hashes.** Other personal-data entities retain Base’s guarantees; CONT-029 owns portability and CONT-030 owns restore refusal.

**Acceptance.**
1. Every known restricted channel identity, including opted-out aliases, retains its destination hash, channel, reason and occurrence time after erasure.
2. The retained local hash is one-way and installation-keyed; no readable destination remains.
3. For a subscribed identity with no surviving restriction, erasure removes all mapping aliases and leaves no address-derived row tombstone.
4. An import, sync or capture matching a retained local or portable identity preserves its restriction; an erasure opt-out means unsubscribed.
5. Only the recipient’s own confirmed public-form resubscribe can clear an unsubscribe or erasure restriction under CONT-027; it cannot clear suppression.

#### CONT-029 — Portable surviving restrictions

**Requirement.** Portable audience restrictions remain effective after erasure and transfer. Their stable address-derived mappings are sensitive personal data, never anonymous.

**Acceptance.**
1. The local-to-portable restriction mapping survives erasure and is included in complete local archives.
2. Audience CSV exports carry surviving restrictions by their portable hash after erasure.
3. No retained mapping or export contains a readable destination.
4. Documentation explains that a mapping or export holder can test guessed destinations or an address dictionary without the installation secret and can match stable hashes across installations and exports.
5. The retained mappings and exports are handled as sensitive personal data.

#### CONT-030 — Erasure-safe restore authority

**Requirement.** Restore refuses stale archive authority rather than reviving erased contacts. The [erasure-authority specification](docs/contract/mechanism.md) records epoch floors and legacy migration behavior.

**Acceptance.**
1. Any archive older than known local or supplied current matching authority is refused in full, even where its unaffected data predates erasure.
2. Nonempty legacy row journals are refused before staging.
3. Upgrade retires legacy journals and transfers only after advancing every known source floor.
4. An offline copy without current authority makes no claim to detect later erasure.

### Proposals

#### PROP-001 — Decision Desk

**Requirement.** The Decision Desk lists proposals in the *proposed* state ordered by the proposal policy, highest-ranked first. *Policy: `proposal.selection.v1`; default: rank by expected revenue where this deployment has enough of its own attribution history (RESULT-003) to estimate it, then by the earliest send-by instant; proposals with neither rank last.*

**Acceptance.**
1. (done).
2. Decision Desk orders proposed suggestions by revenue then deadline.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

#### PROP-002 — Evidence

**Requirement.** A proposal names its triggering source events, lookback window, inclusion rule, exclusion rule, source-data as-of time, send-by instant, proposed channels and step instants, and the method behind every forecast or confidence label.

**Acceptance.**
1. (done).
2. Proposal detail shows observed values, event IDs, lookback, rules, as-of and methods.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

#### PROP-003 — Counts

**Requirement.** A proposal distinguishes candidates, excluded contacts, eligible contacts, and per-channel recipient-steps. No count is labeled recipients until exclusions have been applied.

**Acceptance.**
1. (done).
2. Counts apply real consent exclusions.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

#### PROP-004 — Content

**Requirement.** A proposal contains an editable campaign name, email subject and body, SMS body when SMS is proposed, sender identity, destination links, and a preview for every selected channel.

**Acceptance.**
1. (done).
2. Generated content and sender are previewable and editable as a saved draft.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

#### PROP-005 — Owner control

**Requirement.** A generated proposal is a draft and cannot schedule or send anything until an operator explicitly approves a particular saved revision.

**Acceptance.**
1. (done).
2. A proposal schedules nothing until a saved revision is approved.
3. Evidence: `src/core/features/campaigns/adopt-proposal.ts` · `tests/proposals-decision/decision-routes.spec.ts`.

#### PROP-006 — Grounded generation

**Requirement.** AI-generated audience explanations, timing claims, and forecasts use only this deployment's imported store data and configured knowledge, supplied to `ai.provider.v1`. A generation containing a claim not derivable from that evidence is rejected and the proposal is marked failed per PROP-007; no generic marketing copy is substituted.

**Acceptance.**
1. (done).
2. Fabricated claims are rejected even with valid citations.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

#### PROP-007 — Generation failure

**Requirement.** If the configured AI adapter returns invalid output or does not complete within 60 seconds, the proposal is marked failed carrying the provider error, no semantic fallback is created, and existing proposals and campaigns are unaffected.

**Acceptance.**
1. (done).
2. Provider rejection yields a failed proposal with no substitute.
3. Evidence: `tests/proposals-decision/proposal-states.spec.ts`.

#### PROP-008 — Forecast provenance

**Requirement.** Every revenue, recovery-rate, or confidence figure names the deployment's own campaigns and store events it was computed from and the number of them. Mango never presents a benchmark drawn from other stores, and where its own history is too thin to compute a figure it says so instead of showing a range.

**Acceptance.**
1. (done).
2. Forecasts use only owned mature history and refuse thin history.
3. Evidence: `tests/proposals-decision/decision-routes.spec.ts`.

#### PROP-009 — Proposal states

**Requirement.** A proposal is *proposed*, *approved* (an operator approved a revision and a campaign exists), *dismissed* (an operator rejected it, with the reason recorded), *expired* (its send-by instant passed), or *failed* (PROP-007). Only a proposed proposal can be approved or dismissed, and every transition records its actor and time.

**Acceptance.**
1. (done).
2. Decisions record actor and time once.
3. Evidence: `tests/proposals-decision/proposal-states.spec.ts`.

### Audiences

#### AUD-001 — Review snapshot

**Requirement.** Campaign review shows the audience rule and as-of time, candidate count, each exclusion reason with its count, eligible contact count, and the recipient-step count per channel.

**Acceptance.**
1. (done).
2. Review snapshot counts per exclusion reason.
3. Evidence: `tests/audience-controls/segments.spec.ts`.

#### AUD-002 — Consent and suppression

**Requirement.** Contacts whose state on a channel is pending, non-subscribed, unsubscribed, or suppressed are excluded from that channel regardless of segment membership or an operator-authored inclusion rule.

**Acceptance.**
1. (done).
2. Non-subscribed states are excluded regardless of rule.
3. Evidence: `src/core/features/audience/eligibility.ts` · `tests/go-live/delivery.journeys.ts`.

#### AUD-003 — Commerce and dormancy exclusions

**Requirement.** Contacts excluded by the audience policy are listed in review with their reason and count. *Policy: `audience.exclusions.v1`; default: exclude a contact from a product campaign for seven days after purchasing that product, while a refund or return of it is unresolved, and while the contact is dormant under a twelve-month dormancy window (CONT-012).* AUD-008 states which inactivity rule governs a send, what counts for migrated contacts and how an operator turns the dormancy exclusion off for one campaign.

**Acceptance.**
1. (done).
2. One Shopify-backed product review lists recent-product-purchase (seven days), unresolved-refund, unresolved-return and dormant (twelve months), each with its count, at 1440/390.
3. Resolved commerce and eleven-month activity stay eligible; thirteen-month activity is dormant.
4. AUD-008 states how an operator turns the dormancy exclusion off for one campaign and retains that switch.
5. Evidence: `tests/go-live/stale-sources.journeys.ts`.

#### AUD-004 — Frequency protection

**Requirement.** A contact inside the channel's frequency window is excluded from that step and recorded with the reason `frequency-window`, never silently deferred to a later time. *Policy: `audience.frequency.v1`; default: 24 hours since the contact's last marketing email and 72 hours since their last marketing SMS.* AUD-009 states how these windows combine with FLOW-014 caps and how an operator overrides them for one campaign, with the override recorded.

**Acceptance.**
1. (done).
2. Frequency-window exclusions recorded, never deferred.
3. Evidence: `src/core/features/audience/eligibility.ts` · `tests/go-live/open-estimates.journeys.ts`.

#### AUD-005 — Dispatch recheck

**Requirement.** Eligibility is recalculated when a step's dispatch begins and again immediately before each provider hand-off, so a purchase, refund, opt-out, bounce, complaint, consent change, merge, or frequency-window change after approval prevents that delivery and is recorded as the exclusion reason. Every source type used by the audience must still satisfy STORE-005; if refresh fails or the source becomes stale, the affected channel pauses before any further hand-off and resumes only after a successful refresh.

**Acceptance.**
1. (done).
2. Eligibility rechecked at dispatch and before each hand-off.
3. Evidence: `tests/audience-controls/merge.spec.ts` · `tests/go-live/delivery.journeys.ts`.

#### AUD-006 — Multi-step exit

**Requirement.** Each later step re-applies its audience and exclusion rules; a contact who converts or becomes ineligible after an earlier step receives no later step.

**Acceptance.**
1. (done).
2. Each later step re-applies its audience and exclusion rules; a contact who converts or becomes ineligible after an earlier step receives no later step.
3. The two-step journey changes inclusion, a custom exclusion and consent after the first send, verifies named skip reasons at the second step, sends only to the still-eligible control, and keeps newly matching contacts outside the frozen audience.
4. Evidence: `tests/go-live/multistep.journeys.ts`.

#### AUD-007 — Frozen candidate set

**Requirement.** Approval freezes the candidate set resolved at that instant. A contact who first matches the inclusion rule after approval is never added to the approved campaign, and each contact yields at most one recipient-step per channel per step even when they match the rule more than once. Exclusions still apply at dispatch (AUD-005).

**Acceptance.**
1. (done).
2. Approval freezes the candidate set.
3. Evidence: `tests/audience-controls/segments.spec.ts`.

### Campaigns

#### CAMP-001 — States

**Requirement.** A campaign is *draft* (editable, nothing scheduled), *scheduled* (an approved revision with a future step instant), *dispatching* (a step has begun handing off), *paused* (dispatch stopped by SEND-009), *completed* (SEND-007), *canceled* (CAMP-009), or *failed* (its first step could not begin before its deadline because a required adapter or sender registration was unavailable). Every transition records its actor or the feature that acted, and its time; an invalid transition is rejected.

**Acceptance.**
1. (done).
2. Campaign state transitions with actor and time.
3. Evidence: `tests/campaign-results/results.journeys.ts`.

#### CAMP-002 — Draft editing

**Requirement.** Operators can edit and persist the campaign name, selected channels, audience rule, message content, sender identity, links, and schedule while a campaign is a draft. An email body saves whenever its sent size is within BUILD-012's limit; a larger one is refused with its measured size and the limit named, never truncated.

**Acceptance.**
1. (done).
2. Draft editing persists every field; the body size limit is proved under BUILD-012.
3. Evidence: `tests/campaign-authoring/browser.spec.ts`.

#### CAMP-003 — Revision preview

**Requirement.** Desktop, mobile, and plain-text previews render from the saved revision that will be approved, including resolved personalization examples and the compliance footer or SMS opt-out text that will be sent.

**Acceptance.**
1. (done).
2. Previews render from the saved revision.
3. Evidence: `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts`.

#### CAMP-004 — Approval checks

**Requirement.** Approval atomically validates the audience, consent, source freshness (STORE-005, including incumbent sync freshness during a parallel run, MOVE-013), sender registration, email authentication, sending reputation (MSG-011), compliance content, personalization, links (MSG-006, MSG-013 to MSG-015), schedule, and adapter configuration. A sender adapter must provide effective deduplication and provider reconciliation as required by SEND-001 and SEND-008. Any failure leaves the campaign a draft and names every blocking check.

**Acceptance.**
1. (done).
2. Approval names every blocking check.
3. Evidence: `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/create-api.spec.ts`.

#### CAMP-005 — Idempotent approval

**Requirement.** Repeated approval requests carrying the same campaign and revision identifier produce one scheduled campaign and one set of steps and recipient-steps, whatever the number of requests.

**Acceptance.**
1. (done).
2. Repeated approval produces one schedule.
3. Evidence: `tests/campaign-authoring/browser.spec.ts`.

#### CAMP-006 — Schedule

**Requirement.** Each step stores an IANA time zone and the resolved UTC instant. A local time that does not exist or is ambiguous under daylight saving is rejected until the operator chooses an unambiguous instant. *Policy: `campaign.send-time.v1`; default: resolve every step against the store time zone and the operator-selected local time.*

**Acceptance.**
1. (done).
2. DST-invalid local times are rejected.
3. Evidence: `tests/campaign-authoring/browser.spec.ts`.

#### CAMP-007 — Scheduled edits

**Requirement.** Editing a scheduled campaign creates a new draft revision and leaves the approved revision active until the replacement passes approval. Replacement approval atomically makes the new revision the campaign's only active schedule and cancels every pending recipient-step of the prior revision. Once any step has begun dispatching, edits can only create a new campaign; the original campaign and its later steps remain active until the operator explicitly cancels them.

**Acceptance.**
1. (done).
2. Replacement approval wins a forced D1 ordering without mixing revisions.
3. Evidence: `tests/go-live/delivery.journeys.ts`.

#### CAMP-008 — Test send

**Requirement.** A test sends only to the configured operator test addresses or phone numbers, or to the typed addresses CAMP-019 admits, is visibly marked as a test in its content and in campaign history, and changes no contact activity, reporting, attribution, or frequency protection.

**Acceptance.**
1. (done).
2. Test sends reach only operator addresses and change no reporting.
3. Evidence: `tests/go-live/go-live.journeys.ts`.

#### CAMP-009 — Cancellation

**Requirement.** Canceling a scheduled, dispatching, or paused campaign stops every step and every recipient-step confirmed not handed to a provider within 30 seconds, records provider-confirmed hand-offs separately, and leaves an in-flight request in `handoff-unknown` until SEND-008 reconciles it. It never claims to recall a delivered message. Campaign detail shows the time remaining until the next step dispatches.

**Acceptance.**
1. (done).
2. Cancellation stops unsent recipient-steps within 30 seconds.
3. Evidence: `tests/campaign-results/results.journeys.ts`.

#### CAMP-010 — Step deadline

**Requirement.** Each step carries a send-by instant, defaulting to the end of that step's scheduled local day. Recipient-steps not handed to a provider by then are skipped and recorded as `deadline-passed`; a step whose deadline passes before dispatch begins does not send.

**Acceptance.**
1. (done).
2. Missed deadlines skip with `deadline-passed`.
3. Evidence: `tests/go-live/scheduler.journeys.ts`.

#### CAMP-011 — Dispatch punctuality

**Requirement.** Dispatch of a scheduled step begins within 60 seconds of its resolved UTC instant, and each step's instant dispatches exactly once even if the scheduler runs twice.

**Acceptance.**
1. (done).
2. Each step dispatches once within 60 seconds.
3. Evidence: `tests/go-live/scheduler.journeys.ts`.

#### CAMP-012 — Campaign images

**Requirement.** A signed-in operator can upload a JPEG, PNG, GIF or WebP image within the byte and pixel limits in `seed.json`. Its type is read from the file's own header, never from the name or type the client declares, and the file must be complete; anything else is refused and nothing is stored. Each image is stored once under its SHA-256 and is never changed or deleted, so the bytes behind an approved revision cannot change, except that contact erasure (CONT-013) removes the bytes of an image holding an erased contact's identifier; such an image then answers 410 and blocks approval. It is served without a session at `/media/<sha256>` on this deployment with its exact content type, `X-Content-Type-Options: nosniff`, an immutable public cache and no cookie, answers 404 for an unknown name, and is rate-limited per image at the limit in `seed.json`, not per client address, returning 429 without affecting other images. Serving an image records nothing about who requested it. Every image is exported as its original file (DATA-001).

**Acceptance.**
1. (done).
2. Image upload, immutable serving and erasure.
3. Evidence: `tests/campaign-assets.spec.ts` · `tests/campaign-authoring/local-images.spec.ts`.

### Designs

#### DESIGN-001 — Optional design module

**Requirement.** The design module is disabled while both `DESIGN_PROVIDER_API_KEY` and `DESIGN_PROVIDER_ORIGIN` are absent; supplying either requires both, and startup fails naming what is missing. The origin must be an HTTPS origin with no path; only a copy running on a computer may name a loopback `http:` origin. A disabled module constructs no adapter, shows no design-generation control, contacts no design service, and its routes refuse to start a run with `design_unavailable` naming the inputs. An enabled module contacts the design service only with the owner's own key and only because an operator started a design run or chose one of its candidates.

**Acceptance.**
1. (done).
2. Disabled design module offers nothing and refuses runs.
3. Evidence: `tests/campaign-authoring/design-generation.spec.ts`.

#### DESIGN-002 — Draft-only design generation

**Requirement.** From a draft's email editor an operator can ask the design service for two to four designs from a brief that starts as the draft's name, subject, preheader, sender name and current text and that the operator may edit. An estimate of the spend on the owner's design-service account is shown before each paid step: drawing the candidates and preparing the chosen layout. The run belongs to the draft and continues in the background: candidates appear as they land and the run is shown again after a reload. The operator chooses one with **Use this design** beside its image; Mango fetches its layout and then opens the design import path (DESIGN-004), where the browser builds the email; it opens by itself only as the continuation of that choice while the operator has done nothing else in the page, and otherwise the run shows a notice whose action opens it, so nothing opens over, or takes focus from, an operator who is working: photos hosted as campaign images, the HTTPS button destination the operator enters, the managed footer, and every design line not in the brief highlighted. The result is an unsaved edit of the email body that replaces existing content only after confirmation. The run and its candidates stay on offer until the draft is saved with the design or the operator discards them, so discarding the edit, reloading, a failed layout step or starting another run never loses a design that was paid for, and using the same prepared design again buys nothing. After a failed layout step the run says which step failed and whether the design service's allowance or wallet is the cause, and offers to try the layout again (a new paid layout) or choose a different design; a new run leaves earlier runs' designs reachable under the latest run. While the design service holds a run back, the editor says why and when Mango asks again, until the service answers. A run never saves, approves, schedules or sends; the body reaches the editor already in the canonical form saving stores (CAMP-003 policy), and the operator's Save stores it through the ordinary draft save path, where it passes every approval check like any other draft. A run that fails or outlives its deadline is shown as failed with Mango's own reason and changes nothing in the draft; Mango never substitutes content of its own for a design the service did not deliver.

**Acceptance.**
1. (done).
2. A brief becomes an unsaved body through the import path.
3. Evidence: `tests/campaign-authoring/design-generation.spec.ts`.

#### DESIGN-003 — Design data and records

**Requirement.** A run sends the design service only Mango's fixed description of an email layout with the operator's brief, every `{{…}}` token removed, and then only the chosen candidate image: never a contact, audience, personalization value or token. Every paid request carries an idempotency key derived from the run, so a retried or replayed request never buys again. Each run records its brief, the service's run and layout identifiers, each candidate's outcome, SHA-256 and size, the chosen candidate, the operator, its times and a safe failure code, and is never deleted; the candidate images and the layout are stored in R2 as authoring evidence and exported with everything else (DATA-001). Each paid request records a cost fact (RESULT-004).

**Acceptance.**
1. (done).
2. A run sends only the brief, never buys twice and records costs.
3. Evidence: `tests/campaign-authoring/design-generation.spec.ts`.

#### DESIGN-004 — Design import

**Requirement.** An operator editing a draft can import a design made with their own 12ui CLI: a LayerDoc version 2 file and the PNG candidate it was converted from. Mango compiles it in the operator's browser into the same email grammar every authored body uses (MSG-009, MSG-012): the photos become campaign images hosted by this deployment (CAMP-012), the design's button links to an HTTPS destination the operator enters, and its footer becomes the managed unsubscribe link and saved postal address. Layers Mango does not import are listed by their LayerDoc text, and every line of the design that does not appear in the operator's brief is highlighted for review. An unsupported version, a non-HTTPS button destination or a design the grammar cannot hold is refused visibly with the body unchanged; nothing outside the grammar is ever saved. Import only produces an unsaved edit of a draft's email body: it never saves, approves, schedules or sends, and the result passes every approval check and exact-revision approval like any other draft. Import itself makes no request to 12ui; generating designs inside Mango is DESIGN-001 to DESIGN-003.

**Acceptance.**
1. (done).
2. A LayerDoc imports as an unsaved body that passes approval and BUILD-012's measured per-part UTF-8 size check: at most 102,400 bytes for each of the HTML and plain-text parts (`seed.json → limits.maxEmailHtmlBytes`, `src/core/features/campaigns/email-size.ts`), replacing the historical 20,000-character cap of the 13 October 2026 policy.
3. Evidence: `tests/campaign-authoring/design-import.spec.ts`.

### Message safety

#### MSG-001 — Sender identity

**Requirement.** Every email uses the configured business display name, From address, reply-to address, and physical postal address; every SMS uses a sender registered for the recipient's country.

**Acceptance.**
1. (partial).
2. Email identity is proved; per-country registered SMS senders await SMS-001 and SMS-002.
3. Evidence: `src/core/features/settings/sender-validation.ts` · `tests/settings-sender/routes.spec.ts`.

#### MSG-002 — Email authentication

**Requirement.** A marketing email cannot be scheduled unless the mail adapter reports SPF, DKIM, and DMARC passing for the sending domain and the visible From domain aligns with an authenticated domain.

**Acceptance.**
1. (done).
2. SPF, DKIM and DMARC alignment gate scheduling.
3. Evidence: `tests/sender-verification/worker.spec.ts`.

#### MSG-003 — Email unsubscribe

**Requirement.** Every marketing email carries a visible unsubscribe link and an opaque per-recipient HTTPS `List-Unsubscribe` URL with `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; DKIM covers both headers. The one-click URL accepts a context-free HTTPS POST body of `List-Unsubscribe=One-Click`, does not redirect, and applies CONT-004 before returning success. The visible link opens a page that applies CONT-004 on a single confirming action and never on page load, so a mailbox scanner or link prefetcher cannot unsubscribe anyone. Both paths are idempotent under repeats, need no session or cookie, and reveal no contact other than their own.

**Acceptance.**
1. (done).
2. One-click and visible unsubscribe behave as mail clients send them.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/sender-verification/worker.spec.ts`.

#### MSG-004 — SMS permission

**Requirement.** An SMS is eligible only when its phone number is subscribed for the recorded consent scope and the SMS adapter confirms an approved sender for that recipient's country. For every permitted sender and jurisdiction, the adapter must be able to receive and enforce the standard opt-out and help keywords in CONT-007; otherwise SMS is blocked for that recipient.

**Acceptance.**
1. (partial).
2. SMS eligibility needs subscribed scope and an approved sender; US registration pending.
3. Evidence: `src/core/features/sms/transport-guard.ts`.

#### MSG-005 — SMS opt-out

**Requirement.** Every marketing SMS carries the configured program identity and `Reply STOP to unsubscribe`, or the jurisdiction's required equivalent, and the configured frequency disclosure where required. An opaque unsubscribe URL may be additional but never replaces reply-based opt-out. Review shows the exact compliance text and resulting segment count.

**Acceptance.**
1. (done).
2. On the Mobile Message edge, review of an SMS step for a confirmed SMS contact shows the rendered example with the configured program identity, `Reply STOP to unsubscribe`, the configured frequency disclosure, the help contact and the exact segment count at 1440 and 390.
3. Evidence: `tests/go-live/content-checks.journeys.ts`, `src/core/features/sms/review-preview.ts`.

#### MSG-006 — Links

**Requirement.** Scheduling is blocked when a destination link is malformed; uses a scheme other than HTTPS or the contact schemes MSG-013 admits (`http:`, `javascript:`, `data:`, `file:` and every other scheme block); or resolves, on the link itself or on any redirect it follows, to a host outside the allowed link hosts MSG-014 sets out. Image sources must be HTTPS on an allowed host. Review names every blocked link with the scheme or host that blocks it, and offers MSG-015's allow action for each blocked host. Approval (CAMP-004), flow activation (FLOW-008), the link inspector and tracking (RESULT-005) apply this one rule.

**Acceptance.**
1. (done).
2. One draft with a malformed link, `http:`, `javascript:`, `data:` and `file:` links, a redirect to an unlisted host, an `http:` image and an HTTPS image on an unlisted host is blocked at review and approval; every blocked link is named with its scheme, fault or host, only unlisted HTTPS hosts offer Allow this host, and `mailto:`/`tel:` links never need it, at 1440 and 390.
3. FLOW-008 and RESULT-005 inherit the rule.
4. Evidence: `tests/go-live/content-checks.journeys.ts`, `src/core/features/campaigns/link-reasons.ts`.

#### MSG-007 — Content checks

**Requirement.** Review names blocking and advisory content findings per channel. An operator can acknowledge an advisory finding; the consent, sender registration, opt-out, authentication, link, personalization, and reputation checks are blocking and cannot be overridden.

**Acceptance.**
1. (done).
2. The native Worker/D1 journey shows advisory and blocking findings, acknowledges only the exact saved advisory, retains its actor and time across reload and replay, invalidates it after an edit, refuses safety-check acknowledgments and still blocks approval until the content is corrected.
3. Review is exercised at 1440 and 390 pixels.
4. Evidence: `tests/go-live/content-checks.journeys.ts`.

#### MSG-008 — Personalization

**Requirement.** Every personalization token carries a fallback value. A bare token is refused by the authoring checks and blocks approval and scheduling even when every current eligible contact resolves it, because the audience can change before send. When a contact has no value for a valid token, its saved fallback is rendered and the count of eligible contacts using a fallback is shown in review.

**Acceptance.**
1. (done).
2. The native Worker/D1 journey refuses tokens without fallbacks even on an audience where every eligible contact resolves the token, counts eligible fallback recipients rather than token occurrences, excludes pending contacts from those counts and preserves the counts on approval.
3. Names render escaped in HTML and unchanged in text; a contact labeled only by their destination uses the saved fallback.
4. Preview supplies an illustrative value only for `displayName`, the name field available to delivery; `first_name`, `name` and other unavailable properties use their saved fallbacks in preview and provider output.
5. Editor, preview and review are exercised at 1440 and 390 pixels, then the provider payloads are checked.
6. Evidence: `tests/go-live/personalisation.journeys.ts`.

#### MSG-009 — Email body

**Requirement.** Every marketing email is sent as multipart/alternative with an HTML part and a plain-text part carrying the same offer, links, and unsubscribe link, plus the preheader text set on the revision. Operator-authored HTML is saved as the WHATWG HTML parser reads it and transmitted exactly as saved within the allowed tag, attribute, and inline-style set and within the size limit BUILD-012 derives from delivery, which admits no script, form, stylesheet, class, or CSS function. The single exception is the responsive block BUILD-010 generates from builder settings: no author writes it, saving regenerates it, and the checker judges the email with and without it. One checker, reading the stored body with that parser, decides approval, test send, and delivery; the preview renders the HTML sanitized per BASE-INPUT-002 from the same parse and keeps its styles only when that checker passes, and the plain-text part is derived from the same parse.

**Acceptance.**
1. (done).
2. One parser and checker decide approval, test send and delivery; the size limit is proved under BUILD-012.
3. Evidence: `tests/campaign-authoring/canonical-save.spec.ts`.

#### MSG-010 — Unsubscribe availability

**Requirement.** The unsubscribe path answers within 2 seconds and is rate-limited per unsubscribe token at the limit in `seed.json`, not per client IP address. The token is the rate-limit key declared for this public path under BASE-ACCESS-003, so mailbox-provider requests for unrelated recipients cannot consume one another's allowance; an exceeded token allowance returns 429 without affecting other tokens.

**Acceptance.**
1. (done).
2. The native Worker journey measures complete confirmation GET and one-click POST responses below 2 seconds, exhausts one token's shared GET/POST allowance from `seed.json`, and receives 429 without affecting another recipient's token from the same client IP.
3. Confirmation and success pages fit 1440 and 390; both opt-outs prevent already-approved deliveries and survive provider reconciliation.
4. This is a local measured path, not a hosted latency measurement.
5. Evidence: `tests/go-live/opt-out-reasons.journeys.ts`.

#### MSG-011 — Sending reputation

**Requirement.** Once a sending domain has at least 1,000 marketing deliveries in the reporting window, scheduling a marketing email from it is blocked while provider-reported complaints divided by delivered marketing emails are at or above 0.3%, or hard bounces divided by attempted marketing hand-offs are at or above 5% (RESULT-006). A provider's stricter block applies at any volume. The block names each numerator, denominator, reporting window, and provider rule, cannot be acknowledged away, recomputes when late facts arrive, and clears only when every applicable threshold is below its limit.

**Acceptance.**
1. (done).
2. Complaint and bounce-rate blocks with named figures.
3. Evidence: `tests/go-live/delivery.journeys.ts`.

#### MSG-012 — Hidden or deceptive presentation

**Requirement.** Authored presentation cannot hide or disguise content. Approval, test send, and delivery judge the tree mail clients build from the stored body. Only table cells and the email's outer wrapper paint a background, no element changes its display, and nothing in the grammar can carry text out of the table cell that holds it, so every text run is drawn on the background of its nearest table cell that paints one, or outside any on the wrapper or the white page; they are blocked, with the reason named, when text sits below 3:1 contrast against that background (text on the wrapper also against the white page, since a block does not hold what overflows it) in standards or quirks rendering, when a style hides, clips, fades, shrinks below 10px, moves, overlays, or reverses text, when presentation stands where the grammar does not admit it (a background outside a table cell or the outer wrapper, any display, a width or height that could make a box smaller than its text, a border on an inline element, a rounded painted corner over the text it holds, right-to-left text outside a cell, overlapping styled cells), when styled markup is not written the way HTML parsers build it, or when markup is written in a way mail clients read differently from how it looks. The unsubscribe link and postal address fall under the same rule.

**Acceptance.**
1. (done).
2. Hidden or low-contrast text blocks approval.
3. Evidence: `tests/campaign-authoring/canonical-save.spec.ts`.

### Delivery

#### SEND-001 — Provider hand-off

**Requirement.** Email uses `mail.sender.v1` and SMS uses `sms.sender.v1`. Every recipient-step carries a provider-effective idempotency key derived from the campaign, revision, step, and contact. Mango stores the provider message identifier before treating it as handed off. A timeout or lost response becomes `handoff-unknown` and is reconciled by provider lookup before any retry; an adapter whose deduplication retention cannot cover the campaign deadline and reconciliation window cannot pass CAMP-004. A retried job, redelivered queue message, or resumed dispatch therefore never produces a second provider message.

**Acceptance.**
1. (done).
2. Hand-off fencing and idempotency.
3. Evidence: `tests/go-live/managed-mail.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`.

#### SEND-002 — Quiet hours

**Requirement.** SMS is handed off only inside the recipient-local legal and provider-required windows. The recipient time zone is resolved from recorded location evidence with its source and freshness, never substituted with the store time zone; an unknown or stale zone blocks hand-off; the US area-code evidence SMS-003 defines counts as recorded location evidence. Legal and provider windows are mandatory minima that a policy cannot weaken. *Policy: `sms.quiet-hours.v1`; default: defer until the next allowed instant at or before the step's send-by instant (CAMP-010), otherwise skip and record `quiet-hours-deadline`.*

**Acceptance.**
1. (partial).
2. Recipient-local SMS windows; US defaults in SMS-003.
3. Evidence: `src/core/features/sms/policy.ts`.

#### SEND-003 — Throttling and progress

**Requirement.** Dispatch paces hand-offs to the provider and carrier rate limits in `seed.json`. Campaign status shows the estimated completion instant and updates the handed-off, delivered, skipped, and failed counts within 30 seconds of each change.

**Acceptance.**
1. (done).
2. Paced hand-offs with live progress.
3. Evidence: `tests/go-live/delivery.journeys.ts`.

#### SEND-004 — Transport failure

**Requirement.** A transient provider or network failure on a recipient-step is retried up to 5 times over 1 hour with increasing delay, except that `handoff-unknown` is reconciled rather than retried. A permanent rejection or exhausted retry budget marks that recipient-step failed with the provider's error and campaign detail shows it; a hard rejection, complaint, or provider suppression also updates CONT-006 atomically before another hand-off.

**Acceptance.**
1. (done).
2. Increasing retries within the hour and terminal reasons.
3. Evidence: `tests/go-live/delivery-recovery.journeys.ts` · `tests/go-live/delivery.journeys.ts`.

#### SEND-005 — Provider-event identity

**Requirement.** Every signed provider webhook is stored once as an immutable fact using the strongest identity that adapter declares: provider event identifier where supplied, otherwise provider message identifier, event kind, provider event time or version, and a stable payload digest. Replaying or reordering delivery, bounce, complaint, suppression, and SMS reply facts produces the same derived delivery disposition and contact state, and an older fact never downgrades a later provider disposition.

**Acceptance.**
1. (done).
2. Signed provider facts stored once.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/delivery-recovery.journeys.ts`.

#### SEND-006 — Delivery truth

**Requirement.** A recipient-step has a transport disposition of queued, handoff-unknown, handed-off, accepted, delivered, bounced, skipped, or failed, plus independent complaint and suppression facts. *Delivered* is recorded only from a provider fact asserting delivery; provider acceptance is never reported as delivery. A later complaint remains visible without erasing the earlier delivery fact, and a skipped disposition carries its reason.

**Acceptance.**
1. (done).
2. Delivered only from a provider delivery fact.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/scheduler.journeys.ts`.

#### SEND-007 — Partial completion

**Requirement.** A campaign becomes completed only once every recipient-step has a terminal transport disposition; `handoff-unknown` is not terminal. Its summary keeps delivered, skipped, failed, bounced, complained, and suppressed totals separate and never sums them into a single success figure. Later complaint or suppression facts update the completed campaign's summary and the contact ledger.

**Acceptance.**
1. (done).
2. Completion needs terminal dispositions; totals stay separate.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/campaign-results/results.journeys.ts`.

#### SEND-008 — Resumable dispatch and reconciliation

**Requirement.** Dispatch survives worker eviction, redeployment, and restart: it resumes from recipient-steps without a terminal transport disposition, sends nothing twice (SEND-001), and needs no operator action. At the reconciliation interval in `seed.json`, it queries the provider for handoff-unknown and other unresolved messages and imports missed provider facts. After the provider's declared lookup window expires, an unresolved message becomes failed with `outcome-unconfirmed`; it is never counted as delivered or retried blindly. A campaign never remains dispatching with no work or reconciliation in progress.

**Acceptance.**
1. (done).
2. Resumable dispatch and reconciliation.
3. Evidence: `tests/go-live/go-live.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts`.

#### SEND-009 — Provider outage

**Requirement.** When hand-offs to a provider fail transiently for 5 continuous minutes, or the adapter reports the provider unavailable, the affected campaign channel moves to paused and no recipient hand-offs are attempted on it. The adapter runs a bounded health probe or non-recipient canary at the reconciliation interval in `seed.json`; a successful probe resumes dispatch automatically, subject to CAMP-010 and AUD-005. The pause and provider error are shown on campaign detail, and each operator is emailed once as soon as the mail provider is available.

**Acceptance.**
1. (done).
2. Outage pause and probe-driven resume.
3. Evidence: `src/core/features/lifecycle/provider-outages.ts` · `tests/go-live/delivery-recovery.journeys.ts`.

### Results

#### RESULT-001 — Campaign history

**Requirement.** Operators can list campaigns by state and channel, open the approved revision, and inspect its audience snapshot, delivery timeline, cancellation, and per-channel outcome totals.

**Acceptance.**
1. (done).
2. Campaign history by state and channel.
3. Evidence: `tests/campaign-results/results.journeys.ts`.

#### RESULT-002 — Engagement

**Requirement.** Clicks and store conversions are shown as observed events. Open tracking is off by default; when an operator enables it, opens are labeled privacy-sensitive estimates and never support a confidence, deliverability, or attribution figure.

**Acceptance.**
1. (done).
2. Opens off by default and labeled estimates when enabled.
3. Evidence: `tests/go-live/open-estimates.journeys.ts`.

#### RESULT-003 — Attribution

**Requirement.** Revenue attributed to a campaign names the qualifying store event and attribution window, is reported separately from any forecast, and is assigned at most once per order. *Policy: `campaign.attribution.v1`; default: the most recent non-automated tracked click in the seven days before purchase wins; a cancellation or refund subtracts the corresponding attributed amount.*

**Acceptance.**
1. (done).
2. Evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/performance-fixture.ts`: signed Shopify orders, latest qualifying click across two campaigns, webhook replay and later sync without duplicate or moved attribution, expired/scanner-only/no-click exclusions, partial/full refunds and cancellation in USD/JPY, API/CSV/Insights net amounts and the existing campaign-results drill-down naming each Shopify order and seven-day window separately from forecasts; 1440/390 overflow and axe checks).

#### RESULT-004 — Cost

**Requirement.** Each AI call and provider hand-off records the external provider, model or channel, billable units, and reported cost; totals are visible by campaign and by day.

**Acceptance.**
1. (done).
2. Provider and AI costs by campaign and UTC day.
3. Evidence: `tests/campaign-results/costs.journeys.ts`.

#### RESULT-005 — Link tracking

**Requirement.** A tracked link is rewritten to an opaque per-recipient-step redirect on this deployment that records the request and forwards to the original URL. The redirect sets no cookie, loads nothing, and carries no address, name or contact ID in the destination URL; the only thing it adds is CONT-018's opaque, expiring click token, and only to a connected store's storefront host. Known mailbox security scanners and bot requests are retained as automated events but excluded from engagement and attribution. An operator can disable tracking per campaign, which sends the original URLs and records no clicks. Contact links (`mailto:`, `tel:`, `sms:`; MSG-013) are never rewritten and record no click.

**Acceptance.**
1. (done).
2. Evidence: `tests/campaign-results/performance.journeys.ts` — “[REPORT-002] [RESULT-005][RESULT-003][REPORT-003] campaign filters, exact CSV rows and optional open estimates at 1440; native commerce and cross-channel attribution at 1440 and 390” (via `tests/campaign-results/tracking-journey.ts`: actual per-recipient-step links without recipient/campaign/revision identity, exact connected-store redirect with no cookie or body, retained scanner excluded from totals/unique clicks/click map/CSV/attribution, the same delivered link still forwarding exactly with no cookie or body after its click-recording window (30 days after send-by) closes, while recording nothing for a person or a scanner, “mailto:”, “tel:” and “sms:” links in the same tracked message delivered byte for byte with no redirect and zero clicks in the API, CSV and click map, and the operator tracking-off control through delivery and destination request).
3. `tests/go-live/contact-links.journeys.ts` — “[DELIV-002][MSG-013][RESULT-005] contact links survive authoring, exact approval and delivery without tracking” proves the same contact links through the link tool and approval with tracking off.
4. `tests/go-live/open-estimates.journeys.ts` — “[RESULT-002][CONT-013] explicit open estimates are isolated, revocable, replay safe and erased” retains the 13 October policy.
5. CONT-018 owns its unbuilt click token, which this redirect consumes; until it is built these redirects add nothing.

#### RESULT-006 — Deliverability reporting

**Requirement.** Per sending domain and SMS sender, Mango shows the delivered, bounced, complained, and failed counts and the resulting hard-bounce and spam-complaint rates over the reporting window in `seed.json`, and the rates MSG-011 is currently evaluating.

**Acceptance.**
1. (partial).
2. Per-domain rates shown; SMS sender rates await SMS-001.
3. Evidence: `src/core/features/insights/ui/sender-rates.tsx` · `tests/go-live/delivery.journeys.ts`.

### Data

#### DATA-001 — Export contents

**Requirement.** The export contains every contact, source record, consent record, suppression and surviving opt-out record (CONT-013), proposal, campaign, revision, audience decision, message, recipient-step outcome, attribution event, setting, and audit entry as JSON, and every uploaded campaign asset as its original file.

**Acceptance.**
1. (done).
2. Complete export and restore into an empty installation.
3. Evidence: `tests/portability.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/local-start/command-data.journey.ts`.

### Managed installation and editor

#### MGMT-001 — Signed first-owner admission

**Requirement.** A claim is bound to the trusted management issuer, installation, configured app origin and owner email, expires promptly, and can initialize an installation only once. GET and HEAD never initialize it. Admission uses ordinary Base operator-auth and its native owner session. An existing installation cannot claim another first owner.

**Acceptance.**
1. (partial).
2. Signed first-owner admission once per installation; hosted proof pending.
3. Evidence: `src/core/features/auth/owner-claim.ts`.

#### MGMT-002 — Native owner editor

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

## Target clauses

### Target: Operators

#### OPER-004 — Roles and permissions

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-ACCESS-004, BASE-AUDIT-001

**Requirement.** The owner assigns six Mango product roles, separately from Base authentication roles: Owner handles all product work, billing-bearing connections, operator management and installation erasure; Admin handles everything except removing the owner and changing billing-bearing sending or Twilio connections; Manager approves campaigns, activates and pauses flows and manages segments, forms and integrations; Author edits drafts, templates, forms and draft flows and requests approval, but does not approve, activate or send; Analyst reads reports, campaigns and flows with contact identifiers masked unless granted; Support looks up contacts, reads history and records opt-out or erasure requests, but cannot subscribe anyone.

**Acceptance.**
1. The owner assigns Owner, Admin, Manager, Author, Analyst and Support with every capability and restriction in the product-role matrix.
2. The last product Owner cannot be removed or demoted.
3. Restored product authority belongs to the destination installation; source role assignments grant nothing there.
4. Only Owner and Admin can export audience CSV.
5. Analyst contact details are masked unless granted, and Support can record opt-outs and erasure requests but cannot subscribe a contact.
6. Each matrix-controlled operation is exercised for every role, and visible controls reflect those rights at desktop and phone widths.

#### OPER-005 — Separation of approval

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007

**Requirement.** The optional separation-of-approval policy requires another eligible operator to approve a campaign or activate a flow or form last edited by the requester. A binding agent approval or activation carries commitment; company policy decides its disposition.

**Acceptance.**
1. When separation is enabled, the last editor cannot approve or activate their own campaign revision, flow revision or form.
2. A different operator with approval rights can approve or activate that revision.
3. Approval requests notify approvers by email and in the app, linking to the exact revision.

#### OPER-006 — Single sign-on and deprovisioning

*Tier:* Core · *Cites:* BASE-SIGNIN-001, BASE-ACCESS-002, BASE-AUDIT-001 · *Register:* R-101

**Requirement.** Mango’s identity-provider group mapping assigns its product roles, and deprovisioning keeps marketing attribution intact. The owner retains native email sign-in for recovery.

**Acceptance.**
1. The owner may require standards sign-in and map provider groups to Mango roles.
2. A standards-provider fixture admits an operator with the mapped product role, deprovisions them, refuses their next request and retains their past approval attribution.
3. The owner’s native email recovery path remains available.

#### OPER-007 — Activity log

*Tier:* Core · *Cites:* BASE-AUDIT-001, BASE-DATA-003, BASE-AGENT-009

**Requirement.** Mango’s activity trail exposes marketing, audience and configuration activity to Owners and Admins. It includes every action named in the [activity inventory](docs/contract/mechanism.md), including restore completion.

**Acceptance.**
1. Owners and Admins can inspect and filter marketing activity by operator, agent, action, object and date, and export the filtered view as CSV.
2. Draft saves, approval requests and approvals, activations, pauses, imports, exports, erasures, integration changes, role changes and consent edits appear once with actor and time.
3. Signup-allowance changes, kiosk-form changes and hourly signup-refusal summaries appear once with actor and time.
4. Completed restore appears with actor and time and remains visible, filterable and exportable.
5. Flow activation, pause and archive and agent actions join the same trail when their owning workflows operate.

### Target: Contacts and consent

#### CONT-014 — Custom properties

*Tier:* Core

**Requirement.** Operators define typed contact properties (text, number, USD money, date, boolean, list of values) within the count limit in `seed.json`. Properties are set by import mapping (CONT-010), forms, integrations, the events API (INT-007), flow actions and operator edits, each change recorded with its source and time in contact history; they are usable in segments, personalization (MSG-008), conditional content (BUILD-005) and flow splits. Changing a property never changes consent.

**Acceptance.**
1. an operator creates a date and a money property, imports a CSV that maps both, sets one through the events API, and sees a segment on the date property and a personalized preview using the money value, with history showing each source.

#### CONT-015 — Topics and tags

*Tier:* Core

**Requirement.** Email and SMS consent can be held per topic inside the recorded consent scope (CONT-003): a contact can be subscribed to Promotions and unsubscribed from Newsletter. Tags are free labels applied by operators, imports, forms, flows and the API; a tag is never consent. Campaigns and flows name the topic they send under, and eligibility (AUD-002) checks that topic as well as the channel. An unsubscribe-all link always remains (MSG-003).

**Acceptance.**
1. a contact unsubscribes from one topic through the preference center; the next campaign on that topic excludes them with `topic-unsubscribed` while a campaign on another topic still reaches them; adding a tag changes no eligibility.

#### CONT-016 — Preference center

*Tier:* Core

**Requirement.** Every marketing email links to a hosted, no-sign-in preference page bound to the recipient by an opaque token: choose topics, choose a frequency the operator offers (for example weekly digest only), pause email for 30, 60 or 90 days, update chosen profile fields, and unsubscribe from everything. The page applies changes on an explicit confirming action, never on load (as MSG-003), records each change as consent evidence, and reveals no other contact.

**Acceptance.**
1. a journey opens the preference link from a sent message, confirms a topic change and a 30-day pause, and the next two campaigns exclude the contact with `topic-unsubscribed` and `paused-by-recipient`; a GET from a link scanner changes nothing.

#### CONT-017 — Contact profile and event timeline

*Tier:* Core

**Requirement.** A contact page shows identities, consent and topic state per channel with its evidence, properties, segments, active flow enrollments with their current node, predictions (SEG-004) and one time-ordered timeline of events, messages, clicks, conversions, form submissions, SMS replies, consent changes and operator or agent actions (extends CONT-008). Analyst and Support roles see the masked view (OPER-004).

**Acceptance.**
1. a contact who submitted a form, placed an order, entered a flow and clicked a message shows each in order with its source, at 1440 and 390 pixels.
2. The profile also shows identities, per-channel consent and topics with evidence, properties, segment membership, the active flow enrollment's current node and predictions from SEG-004.
3. Analyst and Support sessions see the masked profile required by OPER-004 at both widths.

#### CONT-018 — Onsite behavior

*Tier:* Core

**Requirement.** A first-party snippet, the Shopify web pixel (activated by Mango on connection, INT-015), the WooCommerce plugin and the Stall integration record Viewed Product, Added to Cart, Started Checkout and Active on Site for identified visitors. A visitor is identified only by their own form submission, login identity passed by the store (Shopify's signed `logged_in_customer_id`), or a click on a Mango tracked link; anonymous browsing is never linked to a contact afterwards from fingerprinting. The snippet sets one first-party cookie, honors the store's consent banner state and the Global Privacy Control signal, loads asynchronously and records nothing for an unidentified visitor beyond an anonymous session identifier that expires in 30 days. Every rule below binds all four surfaces alike, and a site uses exactly one of them. They are the product's rules, not a claim that any jurisdiction's law is met (Honest boundaries).
- *Off until the site owner turns it on:* site tracking starts off for every connected store and snippet site, and again after a reconnect. Only an Owner or Admin (OPER-004) turns it on, per site, in Settings → Site tracking. An Owner, Admin or Manager can turn it off, and any other role's request gets 403 with a named reason. Each change is an activity log entry (OPER-007). Where the store platform has its own switch (the WooCommerce plugin's setting in WordPress), both must be on. The snippet runs only on an allowed embed origin (FORM-001), and Mango refuses its requests from any other origin.
  - While a site's tracking is off, its surfaces still show forms (FORM-002) but observe nothing, set no cookie and exchange no click token. Mango refuses and records nothing from that site, and the RESULT-005 redirect adds no token for its hosts. On Shopify, the pixel INT-015 creates carries the switch in its settings and subscribes to no event while it is off.
  - Turning it off ends every identified session on that site, so turning it on again identifies nobody from before.
- *Consent:* a surface sets its cookie, holds or sends an event, or exchanges a click token only while the store's consent tool reports, for that visitor, that analytics and marketing are both allowed and that sale or sharing is not opted out:
  - on Shopify, the Customer Privacy API's `analyticsProcessingAllowed`, `marketingAllowed` and `saleOfDataAllowed`, all true, as the pixel requires today
  - on WordPress, the WP Consent API's `statistics` and `marketing` categories
  - on Stall, Stall's own consent state for that visitor
  - for the snippet, the consent call the site's banner makes
  - The consent tool decides where consent is required; Shopify's, for example, keeps visitors in consent-required regions refused until they opt in. With no consent tool, or no decision yet, the visitor is treated as needing consent and refused: nothing is set, held or sent.
  - A refusal, or a withdrawal after consent, deletes the cookie and stops recording. A withdrawal by an identified visitor also removes the onsite events recorded for that contact through that surface before it, as the Shopify privacy control does today.
- *Opt-out signals always win:* Global Privacy Control is an opt-out on every site, for every visitor, wherever they are. A request carrying `Sec-GPC: 1`, or a page where `navigator.globalPrivacyControl` is true (the pixel reads it in its worker), is treated as a refusal even when the banner was accepted. The RESULT-005 redirect adds no token to a request that carries the header. A store's "Do not sell or share" choice, and any other opt-out its consent tool reports, is a refusal too. A contact with a do-not-sell-or-share request (CONT-021) is recorded on no surface.
- *The one cookie:* it is named `mgo_s` and set on the storefront host with `Secure`, `SameSite=Lax`, `Path=/` and no `Domain` attribute, so no other host receives it. It is also `HttpOnly` wherever the store's own server sets it (the WooCommerce plugin and Stall); the snippet and the pixel can set it only from script.
  - Its value is a random 128-bit session identifier, plus, while the visitor is unidentified, the browsing held under *Earlier browsing*. It never holds an address, name, contact or customer ID, click token or price, and never exceeds 2,048 bytes.
  - It lasts at most 30 days: from when it was set, for an anonymous session; and from the visitor's last form submission, store login identity or tracked-link click, for an identified one. Browsing without a new identification never extends it. Whenever a browser becomes identified, or identified as a different contact, its identifier is replaced with a new one.
  - For tracking and identity, Mango's onsite code writes no other cookie and nothing to localStorage, sessionStorage or IndexedDB, and a page not served over HTTPS gets nothing. The display memory of the forms these surfaces show is FORM-002's: it holds no identifier and is never sent to Mango or read as onsite behavior.
- *Click identity:* when a tracked link's destination is on a connected store's storefront host (MSG-014's store entries), the RESULT-005 redirect adds one parameter, `mgo_c`, to the destination: an opaque click token of 32 random bytes. It names no address, name or contact ID, is bound to that recipient-step, and can be exchanged for 7 days after the send.
  - The snippet or pixel exchanges it once, by POST to this deployment (on Shopify, through the app proxy), for the identified session, and then removes it from the address bar. A token that is expired, already exchanged by another browser, or from a send with tracking off identifies nobody.
  - A destination outside the store hosts never carries it, and a campaign with tracking off sends original URLs with no token (RESULT-005).
  - Identity from a click is labeled `click-identified` on the timeline, because a forwarded email carries the same link. It never changes consent. A later form submission or store login on the same browser replaces it.
  - *The token:* its 32 bytes come from a cryptographically secure random generator and are written as 43 base64url characters. It is derived from nothing, so it carries no personal data. The redirect mints a fresh token for each click it does not class as automated (RESULT-005), and only for a store whose site tracking is on. Mango stores only the token's SHA-256 digest, bound to the recipient-step and the destination's storefront host, and deletes the digest when the 7-day window closes. The click itself remains a RESULT-005 click.
  - *The exchange:* a token is accepted once, only through the surface of its destination host (on Shopify, the app proxy's signed `shop`; for the plugin and Stall, their signed store connection; for the snippet, the requesting origin), and only while consent allows. When consent is not yet known on the landing page, the snippet or pixel removes the token from the address bar at once and keeps it only in page memory. It is exchanged if consent is given on that page view, and otherwise dropped. On Shopify, where the pixel's sandbox cannot reach the address bar, the theme app embed removes it.
- *Earlier browsing:* browsing already recorded under the anonymous session on that browser is linked to the contact when the visitor identifies by any of the three ways above, as Mailchimp's site pixel does once a visitor gives their email. A session that consent or GPC withdrew records nothing to link.
  - Until the visitor identifies, that browsing exists only in their own cookie: the 20 most recent Viewed Product, Added to Cart and Started Checkout events within the session's 30 days, each with its product, variant, quantity and time only. It reaches Mango only with the identifying request.
  - Mango's servers receive and hold no onsite event, session or identifier for an unidentified visitor, so no anonymous visit is ever counted, profiled, segmented, shown or shared. A cookie that expires, or is refused or withdrawn, takes its held browsing with it.
- *What Mango keeps, and for how long:* an identified visitor's onsite events are kept for 90 days after they occur and are then deleted. Each holds the event, its time, its products, variants and quantities, the surface and how the visitor was identified. None holds an IP address, user agent, referrer, page URL or price. Active on Site is recorded once per visit, and a visit ends after 30 minutes without activity.
  - Segment conditions, flow triggers and product blocks that read these events (SEG-001, FLOW-002, BUILD-006) offer windows of at most 90 days and say why.
  - An identified session ends with its cookie. A surface's outbound queue keeps an event only until Mango acknowledges it, and for at most 30 days; the Shopify observation log keeps its 30 days. Withdrawal records are kept until erasure, so a replayed observation is refused.
  - Settings → Site tracking and the integration guide state the cookie's name, purpose, lifetime and attributes, what is recorded, these periods and the opt-out signals honored, for the store's privacy notice.
- *Erasure:* erasing a contact (CONT-013) removes their onsite events, identified sessions, withdrawal records and click-token digests within the same five minutes. A browser that still holds a cookie from an erased session is an unidentified visitor from then on, identified again only by one of the three ways above. Onsite tracking never creates a contact, changes consent or a topic, or reverses an opt-out or a surviving restriction.
- *No cross-site tracking:* the cookie belongs to one storefront host, and its identifier is never sent to, shared with or recognized on another site, including another site of the same installation. Mango's deployment and tracking host set no cookie on a visitor (RESULT-005), and the snippet's requests to the deployment carry no credentials. No IP address, user agent or other device characteristic is used to recognize or link a visitor. Onsite events go only to the store's own origin and this deployment, never to an ad network or other third party; contacts reach ad platforms only through INT-012, under CONT-021.
- *Store data is not onsite tracking:* customers, orders, refunds, carts and checkouts that a connection syncs from the store's own records, server to server (INT-001 to INT-006, including INT-002's REST sync, signed webhooks and the plugin's server-side relay of them), are store data under STORE-001. This clause governs only what the snippet, the pixel, the plugin's storefront code and the Stall integration observe of a visitor's browsing.
-

**Acceptance.**
1. a browser journey clicks a tracked link to the store, views two products and adds one to the cart; the contact timeline shows the three events, labeled `click-identified`, and the address bar no longer shows `mgo_c`.
2. An anonymous visitor views a product, then submits a form, and the earlier view appears on their timeline.
3. A second browser using the same token after the exchange identifies nobody.
4. A link to a host outside the store hosts carries no token.
5. The same journey with Global Privacy Control set records none.   - *Each surface:* the journeys below run on the snippet and the Shopify pixel, and on the WooCommerce plugin and the Stall integration once INT-002 and INT-006 build them.
6. The Status row names any surface not yet run.   - *Switch:* on a newly connected store, Settings → Site tracking at 1440 and 390 pixels shows the site off, with the cookie, purpose and retention text.
7. The tracked-link journey then gets no `mgo_c` from the redirect, sets no cookie and records nothing.
8. Manager, Author, Analyst and Support requests to turn it on get 403 with a named reason, and neither width shows them an enabled control. An Owner turns it on, and the activity log shows the change once, with actor and time. After a Manager turns it off, the next event from that site is refused; after an Admin turns it on again, the browser identified before is not identified.   - *Consent:* with the store's consent tool reporting no decision, the landing page's address bar loses `mgo_c`, no cookie is set and nothing is recorded; accepting the banner on that page view exchanges the token and identifies the visitor. The browser then holds one cookie from Mango's code, `mgo_s`, with `Secure`, `SameSite=Lax`, `Path=/`, no `Domain`, a lifetime of at most 30 days (`HttpOnly` on the plugin and Stall) and a value under 2,048 bytes that holds no address, name or ID. Mango's code has written nothing to localStorage, sessionStorage or IndexedDB. Withdrawing consent deletes the cookie, records nothing more and removes that contact's onsite events from that surface.   - *Opt-out signals:* with the banner accepted, a journey sending only `Sec-GPC: 1` gets no `mgo_c` from the redirect, and one where only `navigator.globalPrivacyControl` is true drops the token unexchanged. Neither sets a cookie or records anything. A contact with a CONT-021 do-not-share request who logs in to the store records nothing.   - *Nothing anonymous leaves the browser:* before the anonymous visitor above submits the form, no request from Mango's onsite code carries an event, and the observations API and the timeline show nothing for that browser. A cookie that has held 25 views carries only the 20 most recent.   - *Token:* two clicks by the same recipient get two unrelated tokens of 43 base64url characters, and a click classed as automated gets none. An exchange through another store's surface, or after the 7 days, identifies nobody.   - *Retention and erasure:* with the installation clock 91 days later, an identified view is gone from the timeline, and at 1440 and 390 the segment builder offers no onsite window over 90 days and says why. Erasing the contact removes their onsite events, sessions and token digests within five minutes, and the same browser records nothing until it identifies again.   - *No cross-site tracking:* after the journey, the browser holds no cookie for the deployment or the tracking host, and every request Mango's onsite code made went to the store's origin or, without credentials, to the deployment.

#### CONT-019 — US SMS consent capture

*Tier:* Core

**Requirement.** SMS marketing consent is captured only as express written consent: an unchecked box or a keyword text-in, next to a disclosure naming the brand, that messages are recurring automated marketing, the message frequency, that message and data rates may apply, that consent is not a condition of purchase, how to reply STOP and HELP, and links to terms and privacy policy. The evidence stored under CONT-003 adds the disclosure version, page URL or keyword, phone number, time and IP address. A confirmation text is sent and, under the default opt-in policy (CONT-009), the number is subscribed only after the recipient replies to confirm.

**Acceptance.**
1. a form with phone capture shows the disclosure, the submission stores every evidence field, the confirmation text is sent once through the provider edge, and only a signed confirming reply subscribes; a pre-checked or missing disclosure blocks the form from publishing.

#### CONT-020 — Engagement-based sunsetting

*Tier:* Core

**Requirement.** *Policy: `contact.sunset.v1`; default: a contact with no click, order, SMS reply or form submission in 180 days is labeled unengaged.* Unengaged contacts are excluded by the audience policy (AUD-003) from campaigns that opt in to engaged-only sending, can enter a re-permission flow (FLOW-012), and are suppressed from marketing only after an operator approves that suppression; nothing is deleted (CONT-012 stands). Opens never count as engagement for this policy. CONT-012 dormancy is the default exclusion for every campaign and flow message; this unengaged label excludes only from a campaign or flow message that opts in to engaged-only sending, and AUD-008 states how the two appear in review. Imported clicks and orders count at their original times (MOVE-009), and a `no-history` contact (CONT-012) becomes unengaged only 180 days after their move-in.

**Acceptance.**
1. with imported engagement history, a review shows the unengaged count and exclusion; approving a sunset suppresses exactly those contacts and records the operator; no contact row is removed.
2. Imported clicks and orders count at their original times, imported opens never count, and the no-history window starts at move-in completion (MOVE-009, CONT-012).

#### CONT-021 — US privacy requests

*Tier:* Core

**Requirement.** An operator can produce a contact's access export (profile, consent evidence, events, messages, enrollments and audit references, as JSON and CSV) within the 45 days CCPA allows, record a "Do not sell or share my personal information" request, and honor the Global Privacy Control signal; a contact with that request is excluded from ad-audience sync (INT-012) and any other declared sharing. Erasure remains CONT-013. Each request is logged with its receipt time and completion time.

**Acceptance.**
1. a Support operator records an access request and a do-not-share request; the export contains every record type for that contact and no other contact; the next ad-audience sync omits the contact.

#### CONT-022 — Contact search and bulk actions

*Tier:* Core

**Requirement.** Operators search contacts by email, phone, name, property value, tag, segment or consent state and act on a selection: tag, untag, add to a topic only where consent evidence already covers it, export, suppress, or request erasure (each erasure through CONT-013). Bulk actions over 1,000 contacts run as durable jobs with progress and a receipt.

**Acceptance.**
1. a search for a property value returns the matching contacts; a bulk tag of 5,000 contacts completes as a job with a receipt; a bulk "add to topic" refuses contacts without covering evidence and names them.

#### CONT-023 — Custom objects

*Tier:* Core

**Requirement.** Operators define object types related to contacts (for example subscriptions, vehicles, pets, memberships or accounts), each with typed properties and a one-to-many or many-to-many relationship to contacts, populated by the events API (INT-007) and integrations. Segments, flow triggers and splits, and personalization can read related objects (*has a subscription renewing in 14 days*; *pet's name*). Objects are exported with everything else (DATA-001) and removed with an erased contact where no other contact relates to them (CONT-013).

**Acceptance.**
1. an API journey creates a subscription object related to a contact, a flow triggers 14 days before its renewal date and personalizes with its plan name, and erasing the only related contact removes the object.

#### CONT-024 — Incumbent-held consent

*Tier:* Core

**Requirement.** A contact who arrives *subscribed* on a channel from an incumbent (MOVE-001 to MOVE-005, and a CONT-010 file the owner names as that platform's export) or from a connected store (INT-001 to INT-006) is subscribed without a Mango re-confirmation when the move-in or connection carries **incumbent-held evidence**, a defined evidence kind beside the Mango-captured evidence of CONT-003.
- *What it records, per contact:* the source and its account or audience; the source's own status; and the source's own times and level, as the source holds them: Mailchimp `OPTIN_TIME`, `OPTIN_IP`, `CONFIRM_TIME`, `CONFIRM_IP` and `LAST_CHANGED`; Shopify's marketing state, opt-in level (`single_opt_in`, `confirmed_opt_in` or `unknown`) and consent time (`emailMarketingConsent`/`smsMarketingConsent`, or the legacy `accepts_marketing` with `accepts_marketing_updated_at`); Klaviyo's consent, method and timestamp; and the matching fields of the other incumbents. The evidence time is the confirmation time, else the opt-in time, else the last-changed time. A subscribed row that carries none of them takes the export's own creation time and is labeled `time-unknown`, and is still subscribed.
- *What the owner attests, once per source:* an Owner or Admin (OPER-004) states, for each moved audience, incumbent account or store connection, the brand or legal sender, message category, disclosed frequency and destination jurisdiction the consent covered, and either the consent wording people saw or the statement that the original wording is held by the source and not available. The attestation also confirms that the list was not purchased, rented or scraped (Honest boundaries). It is stored with the operator, time, source and the archive or connection it covers, and recorded in the activity log (OPER-007). It covers only rows that arrive subscribed.
- *Conservative default (Mailchimp and Klaviyo import attestations, GDPR Art. 7(1), CASL s. 13, TCPA record practice; owner rule of 19 October 2026):* the attestation is a versioned record, not a checkbox.
  - *Form:* each statement is a separate unticked control with a "not sure" choice. The operator types the source's name to confirm. The wording shown is stored with its version and SHA-256, and a later wording version needs a new attestation for later move-ins or connections.
  - *Record:* operator, role, time (UTC), session IP and user agent, source identifier (incumbent account or audience ID, archive SHA-256 or Shopify shop ID), each statement and answer, and the count of rows it covers. It is kept while any contact relies on it and for 5 years after revocation. CONT-013 erasure removes the person from per-row evidence, never the record.
  - *Never imported as subscribed, whatever the attestation:* a row whose source status is not subscribed; an SMS row without a per-row consent time and collection point; the RFC 2142 mailboxes `abuse@` and `postmaster@`; a row whose known country lies outside the attested destination jurisdiction; and every row of a source where any statement is answered "not sure" or the list is not attested as collected by the attested brand. Each such row imports non-subscribed with its named reason in the reconciliation report (MOVE-006).
  - *Exportable:* the attestation record is in the DATA-001 export and is named by ID on each contact's incumbent-held evidence (CONT-017, CONT-021).
- *Labeling:* the evidence is labeled `incumbent-held` with its source on the contact page (CONT-017), in contact and DATA-001 exports, in the privacy access export (CONT-021), in list growth by source (REPORT-005) and in the reconciliation report (MOVE-006). It is never merged into or presented as Mango-captured evidence. Campaign review shows how many eligible contacts rely on it.
- *Restrictions still win:* a row's own status is its ceiling, so pending, non-subscribed, transactional, unsubscribed, cleaned and complained rows keep their restriction. An attestation never touches a contact Mango holds as unsubscribed, suppressed or with a surviving opt-out (CONT-004, CONT-006, CONT-013), and a merge keeps the most restrictive state (CONT-011). Unsubscribing, the preference center and every later opt-out apply exactly as for captured consent.
- *SMS:* an SMS row is subscribed with incumbent-held evidence only when the source supplies, per row, the consent time and the collection point (for example Shopify's `consentCollectedFrom` with its opt-in level, Klaviyo's SMS consent method and timestamp, or Mailchimp's SMS opt-in time and source), and the owner's attestation includes the express-written-consent disclosure shown there with the CONT-019 fields. Any other SMS row is non-subscribed for SMS, and Mango may invite it to text in only by email, through a re-permission flow (FLOW-012).
- *Revocation:* revoking an attestation returns every contact whose only subscribed evidence on that channel is that attestation to non-subscribed before the next hand-off, and is recorded with its operator. Contacts with Mango-captured evidence are unaffected.
- *Security consequences:* Mango cannot verify consent another platform collected; the owner's attestation is the basis, which is how the incumbents themselves accept imported subscribers. The evidence is labeled so an audit, a complaint or a privacy request can find exactly who relies on it, and the attestation is revocable. This is the one named amendment of the 12 October Archive move-in rule (Interpretations).
-

**Acceptance.**
1. a Mailchimp subscribed-file fixture has rows with both `OPTIN_TIME` and `CONFIRM_TIME`, rows with only `CONFIRM_TIME`, and rows with neither but with `LAST_CHANGED`.
2. With the owner's attestation, all import as subscribed with incumbent-held evidence and reach the first campaign's review as eligible, with no confirmation message at the mail edge.
3. The reconciliation report counts each evidence kind, and an unsubscribed row and a cleaned row in the same move-in stay unsubscribed and suppressed.
4. Without the attestation, the same rows import as non-subscribed with a named reason.
5. Revoking the attestation makes them non-subscribed, and an SMS row without a collection point stays non-subscribed for SMS.
6. An attestation with one statement answered "not sure" subscribes no row of that move-in.
7. A `postmaster@` row and a row whose country is outside the attested jurisdiction import non-subscribed with their named reasons.
8. The DATA-001 export carries the attestation record with its operator, time, wording hash and answers, and each incumbent-held contact names that record. Erasing one such contact leaves the attestation record in place.

#### CONT-025 — Opt-in mode per form and source

*Tier:* Core

**Requirement.** Settings → Opt-in lists every capture point: each form, popup and landing page (FORM-001 to FORM-004), each API key (INT-007), Zapier and Crank (INT-009), each connected store (INT-001 to INT-006) and each incumbent move-in source. For each, per channel, it shows and lets an Owner or Admin change the mode. Each mode states the evidence it requires:
- *Double opt-in:* the contact enters *pending* and receives one CONT-009 confirmation message, and is subscribed on confirming.
- *Single opt-in:* the contact is subscribed on capture with the full CONT-003 evidence and receives no confirmation message. For SMS, single opt-in still requires CONT-019's express written consent and sends the carrier-required opt-in confirmation text, which needs no reply.
- *Incumbent-held* (stores and move-in sources only): a contact the source reports as subscribed is subscribed under CONT-024.
- *Pending:* a contact the source reports as subscribed enters *pending* and receives one Mango confirmation message.
- *Non-subscribed:* the source's consent is kept as source state only, and the contact is non-subscribed.
- *Defaults (`contact.opt-in.v1`):* double opt-in on both channels for Mango's own forms, popups, landing pages and API captures. Incumbent-held for email from a connected store and from incumbent move-ins, once the owner has made the CONT-024 attestation, which is a step in connecting the store (INT-001, shown in INT-015's connection steps) and in every move-in (MOVE-006). Until that attestation exists the source runs as non-subscribed, and Settings and the dashboard show the number of contacts waiting on it. SMS from a store follows CONT-024's SMS rule.
- *A Shopify checkout opt-in* (marketing state `subscribed`, or legacy `accepts_marketing` true) is therefore subscribed by default, with Shopify's consent time and opt-in level as incumbent-held evidence, and receives no Mango confirmation email. A Shopify state of `pending` (Shopify's own double opt-in under way) stays non-subscribed in Mango with that source state shown, and becomes subscribed when Shopify reports `subscribed`, with no Mango message. A Shopify `unsubscribed` is an opt-out under CONT-004.
- Whatever the mode, a public submission for an unsubscribed destination is always confirmed before it resubscribes anyone (CONT-027).
- A mode change is recorded with its operator (OPER-007) and applies to captures after it. It never upgrades an existing contact, and moving a source to a stricter mode never downgrades contacts already subscribed through it; revoking the attestation (CONT-024) is how an owner does that.
-

**Acceptance.**
1. a Shopify edge customer with marketing state `subscribed`, opt-in level `single_opt_in` and a consent time becomes subscribed with incumbent-held evidence under the default, and no confirmation email appears at the mail edge.
2. After the operator switches the Shopify source to *Pending*, a second such customer becomes pending and receives exactly one confirmation email.
3. After a switch to *Non-subscribed*, a third stays non-subscribed with the source state shown.
4. A Shopify `pending` customer stays non-subscribed until the edge reports `subscribed`.
5. A hosted form switched to single opt-in subscribes a submitter with full CONT-003 evidence and sends no confirmation, while a form left on the default sends exactly one.
6. Each mode change appears in the activity log.

#### CONT-026 — Contact added by hand

*Tier:* Core

**Requirement.** An operator whose role may subscribe people (Author or above; Support never subscribes anyone, OPER-004) can add one contact by hand, for example after an in-store signup.
- The operator enters email, phone, name and properties. For each channel and topic, they record how the person gave permission (in person, at an event, by phone or in writing), when, and the consent wording shown, and tick that the person gave it.
- This capture point is listed in CONT-025 as `manual entry`, with its own mode. By default it follows Mango's own forms: the person enters *pending* and receives the CONT-009 confirmation email.
- The owner can switch the point to single opt-in. Email is then subscribed on entry with `operator-recorded` evidence naming the operator, labeled as such wherever evidence shows (contact page, exports, REPORT-005).
- SMS never becomes subscribed from a hand entry alone: the number receives the CONT-019 confirmation text and is subscribed only on the reply.
- A hand entry never reverses an existing unsubscribe or suppression (CONT-004, CONT-006), and the operator is shown why. Each hand entry is in the activity log (OPER-007).
-

**Acceptance.**
1. an operator adds an in-store signup with email and phone, and the email edge receives one confirmation.
2. After the owner switches `manual entry` to single opt-in, a second entry is subscribed with `operator-recorded` evidence naming the operator.
3. In both cases the phone receives a confirmation text at the SMS edge and stays pending until the reply.
4. Adding an address that unsubscribed earlier leaves it unsubscribed, with the reason shown.
5. A Support session is refused with 403.

#### CONT-027 — Resubscribe through a public form

*Tier:* Core

**Requirement.** A past unsubscriber who signs up again on a form can come back only through their own confirmed consent, and the form still reveals nothing about any address (owner decision, 19 Oct 2026).
- *A submission is new evidence:* a public form submission (FORM-001 to FORM-004, FORM-006 or FORM-009) for an unsubscribed email destination records new affirmative consent evidence under CONT-003. It is labeled `resubscribe-request` and stores the form, page, consent text version, IP and a time after the opt-out. This applies however the destination became unsubscribed:
  - their own unsubscribe or a preference-center opt-out (CONT-004, CONT-016)
  - an incumbent's unsubscribed row brought in by a move-in (MOVE-001 to MOVE-005, MOVE-013)
  - a surviving erasure opt-out whose reason is an unsubscribe or the erasure itself (CONT-013)
- *Always confirmed:* whatever the form's CONT-025 mode, an eligible submission sends one CONT-009 confirmation email to that destination address, within the allowance below. Only that person's own affirmative POST with `confirm=true` from the emailed confirmation form can resubscribe them; GET and HEAD remain read-only, and the link is single-use and expires after 30 days. Until that POST, the channel stays unsubscribed, not pending, so no campaign, flow message or incentive reaches it. The request expires with its link.
- *On confirmation:* the channel becomes subscribed under CONT-005 for the topics the form names (CONT-015), and other topics keep their state. FORM-003's incentive is released once, then and not before. The contact emits `resubscribed`, a flow trigger kind of its own (FLOW-002), so a welcome flow enters them only if it names that trigger.
- *Status-free:* the signup form returns the same generic acknowledgment whether the address is new, subscribed, unsubscribed or suppressed, or its confirmation allowance is exhausted. Only the person receiving mail at that address can complete the confirmation, so the form reveals no status. An address that is already subscribed still gets the acknowledgment and no mail. Destination-dependent confirmation intake, allowance and provider failures use that same acknowledgment, with the refusal recorded for the operator; challenge and network admission remain independent of address state. This is the named exception to BASE-ACCESS-003's and FORM-010's 429 rules for these confirmation limits only: the limits still prevent mail, and the generic response prevents address-state enumeration.
- *Still refused:*
  - Suppressed destinations (hard bounce, complaint, provider or operator suppression, or legal hold, CONT-006), including a surviving erasure opt-out whose reason is a suppression, send nothing and change nothing until the cause is resolved through CONT-005. Neither a signup submission nor a confirmation POST bypasses suppression; bounces, complaints and legal holds stay suppressed.
  - A phone that opted out of SMS comes back only through CONT-019's new express written consent and the confirming reply (CONT-007).
  - At most three confirmation reservations and confirmation emails are allowed per destination address per UTC calendar day (FORM-008), shared across public signup surfaces, including kiosk capture. The allowance resets at 00:00 UTC; an exhausted allowance sends no further confirmation and returns the same generic acknowledgment.
- *Erased contacts:* a surviving erasure hash with an unsubscribe or erasure reason counts as an unsubscribed destination, and its owner may reconfirm.
  - The submission recreates a contact holding only the request evidence and sends the confirmation email.
  - On confirmation, the contact is subscribed as a new person with no history restored. The retained opt-out record is marked as superseded by that consent evidence and kept for audit.
  - If the request expires unconfirmed, the recreated contact and its request are removed, and the opt-out record stands unchanged.
- *The operator can see it:* the contact's history (CONT-008, CONT-017) shows the resubscribe request, the confirmation email, and the confirmation or expiry. REPORT-005 and FORM-005 count resubscribes separately from new subscribers.
- It amends the "CONT-005 public capture policy" sentence that public capture provides no reconsent route, and the "CONT-005/009 concurrency" sentence that a surviving erasure hash recreates only an unsubscribed profile with no confirmation mail. Both amendments are approved (owner decision, 19 Oct 2026). Opt-out precedence, the status-free acknowledgment, the never-downgrade rule and suppression guards stand; implementation status remains the CONT-027 Status row.
-

**Acceptance.**
1. - *Resubscribe:* a contact imported as unsubscribed from the Mailchimp fixture submits the popup with an incentive.
2. They see the same acknowledgment as any visitor, and the mail edge receives one confirmation email.
3. Before confirming, they are still unsubscribed and receive no code and no campaign.
4. GET and HEAD of the emailed link, a POST without affirmative `confirm=true`, and an expired link leave them unsubscribed.
5. Only their own affirmative POST from the confirmation email sent to that address subscribes them with the new evidence for the form's topics; the code is emailed once, and the next campaign includes them.
6. Replaying the consumed link cannot resubscribe again or reverse a later opt-out.
7. Their history shows the request and the confirmation, and REPORT-005 counts one resubscribe.   - *Suppressed:* submissions for hard-bounced, complained, provider-suppressed, operator-suppressed and legally held destinations, including surviving suppression hashes, return the same generic acknowledgment as an unsuppressed address, send no mail and change no consent or suppression state.
8. A previously issued confirmation POST after suppression also cannot subscribe or release an incentive.   - *Allowance:* exercise three eligible confirmation requests for the same destination address in one UTC day across public forms and kiosk capture, including requests from different networks. A fourth sends no further confirmation email and returns the same generic acknowledgment. At 00:00 UTC the next day the allowance resets, with confirmation still required and every suppression guard intact.   - *Erased:* an erased contact's address submits the form and confirms, and becomes a new subscribed contact with no prior history. An unconfirmed request for another erased address is removed after expiry, leaving its opt-out record unchanged.   - *Single opt-in form:* an unsubscribed contact submitting a single opt-in form still receives the confirmation email and stays unsubscribed until confirming.

### Target: Audiences

#### AUD-008 — Inactivity rules in review

*Tier:* Core

**Requirement.** One inactivity rule governs each send, and the operator sees and controls it. By default every campaign step and flow message excludes contacts dormant under CONT-012 (twelve-month window, reason `dormant`). Only a campaign step or flow message that opts in to engaged-only sending also excludes contacts CONT-020 labels unengaged (reason `unengaged`). Review lists the two reasons separately and counts a contact under only one of them (`dormant` when both apply). It also shows how many included contacts are `no-history` (CONT-012) and therefore not excluded, and, within `dormant`, how many are `open-only` (CONT-012), with a one-click action to include just those. An operator with approval rights (OPER-004) can turn the dormancy exclusion off for one campaign in review, as Mailchimp applies no inactivity exclusion unless the sender segments on engagement. An Owner or Admin can also set the installation-wide default (dormancy exclusion on or off, and the window, under `audience.exclusions.v1`), recorded in the activity log, so a sender who never excludes on inactivity does not repeat the step on every send. That choice is part of the approved revision, shows the number of contacts it brings back, is honored by the dispatch recheck (AUD-005) and is recorded with its approver in the activity log (OPER-007). It never affects consent, topic, suppression or opt-out exclusions (AUD-002, CONT-004, CONT-015).

**Acceptance.**
1. a Mailchimp move-in fixture of contacts subscribed two years ago reaches the first campaign's review with no `dormant` exclusion, both for contacts whose `granular_activity` shows a click three months ago and for contacts with no activity rows (counted as `no-history`); a contact whose last imported click is 13 months old is excluded as `dormant`; turning the exclusion off for that campaign includes them, and the approved revision and activity log record the choice and its approver.
2. The review also counts `open-only` contacts within `dormant` and includes them in one action, and an Owner or Admin's installation-wide default is recorded in the activity log.

#### AUD-009 — Frequency protection: one policy and a recorded override

*Tier:* Core

**Requirement.** Campaigns and flows share one frequency policy. Until an operator sets cross-message caps (FLOW-014), AUD-004's default windows apply to every campaign step and flow message. Once caps are set, they replace AUD-004's default windows for campaigns and flows alike, review names the governing rule, and excluded contacts carry `frequency-window` or `frequency-cap` to match. In review, an operator with approval rights (OPER-004) can choose **Ignore frequency protection** for one campaign step, and a flow message can be set the same way in its flow revision, activated under FLOW-008; Klaviyo's Smart Sending can likewise be switched off per message. The choice is part of the approved revision, shows the number of contacts it brings back, is honored by the dispatch recheck (AUD-005) and is recorded with its approver in the activity log (OPER-007). Messages sent under it still count towards later messages' windows and caps. It never overrides consent, topic, suppression or opt-out (AUD-002, CONT-004, CONT-006, CONT-015), SMS quiet hours and state frequency limits (SEND-002, SMS-003), the global holdout (EXP-004) or the SMS spend cap (SMS-006). *Cart and moved-in flows:* campaign sends never block the messages of the abandoned-checkout, abandoned-cart, browse-abandonment, back-in-stock and price-drop library flows (FLOW-012), or of draft flows recreated from Mailchimp journeys and automations (MOVE-008), since Mailchimp does not suppress journeys for campaign sends. Those messages are created with the window set to count only other flow messages, shown in the flow revision and changeable before activation. Every flow's activation shows how many of its sends the governing window would have skipped over the last 30 days of this deployment's own events, and the count it would skip with the setting changed.

**Acceptance.**
1. two campaigns to the same audience are approved four hours apart.
2. With the default, the second excludes everyone the first emailed, with `frequency-window`.
3. With the override recorded at the second's approval, it hands off to them, the override and its approver appear in the activity log, and a contact who unsubscribed between the two sends is still excluded.
4. A contact emailed a campaign in the morning still receives that afternoon's abandoned-cart message from the library flow, and a draft flow made from a Mailchimp journey fixture carries the same setting; its activation shows the 30-day skip count from seeded sends.

### Target: Campaigns

#### CAMP-013 — Recipient-local send time

*Tier:* Core

**Requirement.** A campaign step can send at a chosen local time in each recipient's own time zone (for example 10:00 wherever they are), resolved from recorded location evidence with its source and freshness; recipients without a known zone send at that time in the store zone and are counted as such in review. Dispatch starts with the earliest zone, so the campaign is approved at least 26 hours before the earliest local instant or review names the zones that will be missed.

**Acceptance.**
1. a campaign approved for 10:00 recipient-local hands off New York, Chicago and Los Angeles recipients at their own 10:00 in the scheduler journey, and an unknown-zone recipient at 10:00 store time with review showing that count.

#### CAMP-014 — Pause and resume

*Tier:* Core

**Requirement.** An operator can pause a scheduled or dispatching campaign; no further hand-off begins within 30 seconds, recipient-steps already handed off keep their dispositions, and resume continues from the remaining recipient-steps subject to AUD-005 rechecks and the step deadline (CAMP-010). Pause and resume are recorded with their actor.

**Acceptance.**
1. the scheduler journey pauses a two-step campaign mid-dispatch, shows no hand-off during the pause, resumes, and completes with each recipient-step handed off once.

#### CAMP-015 — Marketing calendar

*Tier:* Core

**Requirement.** A month and week calendar shows scheduled and sent campaigns, live flows' expected daily volume and US retail dates (Black Friday, Cyber Monday, Mother's Day, Father's Day, Back to School, Prime Day as the operator configures), with per-day contact pressure so an operator sees when frequency protection (AUD-004) will exclude people. Drag-to-reschedule on a scheduled campaign creates a new draft revision (CAMP-007).

**Acceptance.**
1. the calendar shows a scheduled campaign, a sent campaign and a live flow's estimate on the right days; dragging the scheduled one opens a new draft revision while the approved one stays active.

#### CAMP-016 — Follow-up to non-engaged recipients

*Tier:* Core

**Requirement.** From a sent campaign an operator can create a linked follow-up to recipients who did not click (or, labeled as an estimate under RESULT-002, did not open) after a chosen delay, with a new subject; it is a new campaign that passes its own approval and frequency checks.

**Acceptance.**
1. a follow-up created 48 hours after a send targets exactly the non-clickers minus those excluded at review, and requires its own approval.

#### CAMP-017 — Recurring and RSS-to-email campaigns

*Tier:* Core

**Requirement.** A campaign can recur (daily, weekly, monthly) or be built from an RSS or Atom feed's new items since the last send. Each instance is a new revision. *Policy: `campaign.recurring.v1`; default: every instance needs approval.* An owner may instead grant standing approval for a recurrence: then each instance sends only if its audience rule and template are unchanged from the approved revision and every approval check (CAMP-004) passes; any failure holds that instance for review.

**Acceptance.**
1. an RSS campaign with two new feed items builds a draft containing both, and under standing approval the next instance sends while a changed template holds it for review.

#### CAMP-018 — Duplicate a campaign

*Tier:* Core

**Requirement.** From a campaign in any state, an operator can choose **Duplicate**. The new draft, named "Copy of" the source, carries the source revision's channels, audience rule, content, sender, preheader, tracking choice and step settings. It copies no schedule, approval, audience snapshot, test or result, and it passes its own approval checks against the settings, consent and audience current at that time.

**Acceptance.**
1. duplicating last week's sent campaign yields a draft with no schedule or approval, whose stored body re-parses to the source revision's bytes and whose audience rule and sender match.
2. Editing and approving the copy leaves the source's approved revision and results unchanged.

#### CAMP-019 — Test send to typed addresses

*Tier:* Core

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

### Target: Message safety

#### MSG-013 — Contact links (mailto:, tel:, sms:)

*Tier:* Core

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

#### MSG-014 — Allowed link and image hosts

*Tier:* Core

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

#### MSG-015 — Allow a blocked host from review

*Tier:* Core

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

### Target: Results

#### RESULT-007 — Click map, per-link clicks and clicker lists

*Tier:* Core

**Requirement.** Each tracked link in a sent campaign or flow message is identified within its revision by position and destination, and every click fact records the link it came from. Campaign and flow-message reports show, per link, total and unique non-automated clicks, plus the automated requests retained but excluded (RESULT-005). They show this as a table and as a click map over the saved revision's preview. Each link opens the list of contacts who clicked it, with first and last click times. An operator whose role permits it (OPER-004; masked for Analyst) can export that list as CSV or start a segment from it (SEG-006). Unique counts count each contact once per link and per campaign. Erased contacts leave only anonymous counts (CONT-013).

**Acceptance.**
1. a seeded send has three links; some recipients click one link twice, and a known scanner requests every link.
2. The report shows each link's total and unique clicks, with the scanner excluded.
3. One link's clicker list equals the seeded clickers and exports as CSV with the same rows, and a segment started from it holds exactly those contacts.

#### RESULT-008 — Recipients per outcome

*Tier:* Core

**Requirement.** Each sent campaign and flow message lists its recipients by outcome: delivered; bounced, hard or soft, with the provider's reason; complained; unsubscribed from this send, by link, one-click or reply, with the time; skipped, with the SEND-006 reason; and failed, with the provider error. Each list can be filtered, exported as CSV and used to start a segment, under the role and masking rules of RESULT-007. Its counts equal the campaign's totals (SEND-007), and erased contacts leave only anonymous counts (CONT-013).

**Acceptance.**
1. a seeded send has one hard bounce, one complaint, one unsubscribe from the message and one quiet-hours skip.
2. Each contact is listed under its outcome with the reason, the CSV export matches the lists, and every list count equals the campaign summary.

### Capacity

#### SCALE-001 — Capacity for the first buyer

*Tier:* Core

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

### Growth: forms, popups and landing pages

#### FORM-001 — Hosted and embedded signup

*Tier:* Core

**Requirement.** A hosted signup page and an embeddable form capture email (and phone where SMS is enabled) with explicit recorded consent and confirmation under CONT-003, CONT-005, CONT-009 and the public signup policies below; a submission never authorizes a send by itself.

**Acceptance.**
1. `tests/audience-import/signup.spec.ts` (public signup stays pending until the single-use confirmation; embed origins enforced).

#### FORM-002 — Popups, flyouts and full-page forms

*Tier:* Core

**Requirement.** A visual form builder makes popup, flyout (corner), banner and full-page forms with teaser, success and error states, using the brand kit (BUILD-003). A refusal by an allowance shows the error state, never the success state (FORM-010), and the challenge is on by default (FORM-008). Display rules: time on page, scroll depth, exit intent on desktop, page URL include and exclude, UTM source, referrer, cart value, new or returning visitor, and device; frequency rules: after close, hide for N days; after submit, never show again; never show to identified subscribers of that topic. Forms install through one script tag, the Shopify theme app embed (turned on with one toggle from Mango's Settings, INT-015), the WooCommerce or WordPress plugin, or the Stall integration; they load asynchronously, cause no layout shift, trap focus while open, close on Escape and meet WCAG 2.2 AA contrast.

**Acceptance.**
1. a browser journey on a test storefront page shows an exit-intent popup once, submits it, sees the success state, and on reload is not shown again; an axe pass on the open popup has no serious violations.

#### FORM-003 — Multi-step capture and incentives

*Tier:* Core

**Requirement.** A form can collect email first and phone second (with the CONT-019 disclosure), ask for chosen properties (birthday, interests mapped to topics) and offer an incentive: a unique discount code (BUILD-007) or a lead-magnet file. The incentive is delivered only after the channel confirms (CONT-009), so a fake address earns nothing. A past unsubscriber earns it on confirming their resubscribe (CONT-027). A contact who already received that incentive's code is shown and sent the same code again, never a second one.

**Acceptance.**
1. a two-step submission creates pending email and SMS states; the code is shown and emailed only after confirmation, and a second submission with the same address issues no second code.

#### FORM-004 — Landing pages

*Tier:* Core

**Requirement.** Operators publish hosted list-growth pages (lead magnet, waitlist, giveaway entry, event signup, product launch) from templates in the brand kit, on the deployment's origin or a custom subdomain they point by CNAME with automatic TLS, with title, description and social-share image, and a lead-magnet file stored in R2 and linked after confirmation. Pages carry the form, a privacy-policy link and the sender's identity; they are not a general website builder (Pane owns that).

**Acceptance.**
1. an operator publishes a waitlist page on a custom subdomain, a visitor signs up and confirms, and the file link works once confirmed and answers 404 before.

#### FORM-005 — Form performance and tests

*Tier:* Core

**Requirement.** Each form reports views, submissions, confirmation rate, resubscribes (CONT-027), signups refused by an allowance with their reason (FORM-010) and subscribers who later ordered, by device, page and source, and can run a variant test on copy, incentive or timing with a pre-declared winner metric (EXP-005).

**Acceptance.**
1. two variants each shown to half the sessions in a journey report their own views, submissions and confirmations, and no winner is named below the declared evidence threshold.

#### FORM-006 — Referral program

*Tier:* Core

**Requirement.** Each confirmed subscriber can have a personal referral link; referred people go through the same capture and confirmation; milestones (for example three confirmed referrals) unlock a reward the operator defines (a code, a file or a manual gift recorded as fulfilled). Self-referrals, disposable domains and referrals that never confirm do not count.

**Acceptance.**
1. three confirmed referrals unlock the milestone and send the reward email once; an unconfirmed fourth and a self-referral do not count.

#### FORM-007 — Abuse resistance

*Tier:* Core

**Requirement.** Public capture applies the existing body limits, durable per-network, per-destination and global allowances, honeypot and optional Turnstile, and refuses to reveal any address's status (CONT-005 public capture policy). The levels of those allowances and what may draw on them are FORM-008's, and a refusal is shown and counted under FORM-010.

**Acceptance.**
1. `tests/audience-import/signup.spec.ts` security cases (allowances, Turnstile fail-closed, status-free acknowledgment).

#### FORM-008 — Signup intake capacity

*Tier:* Core

**Requirement.** Public capture keeps every real signup on a sale day while bots spend nothing that real visitors need.
- *Floor:* across the installation, public capture (FORM-001 to FORM-004, FORM-006 and FORM-009) accepts at least 1,000 signups per hour, sustained, with a burst of at least 100 in one minute. The global allowances (`seed.json → limits.signupGlobalPerHour` and `signupGlobalPerMinute`) are derived from that floor and never set below it (SCALE-001). The confirmation hand-offs they allow fit inside the declared email hand-off rate (3,000 per minute). An Owner can raise them in Settings up to that rate, and each change is recorded in OPER-007.
- *Only accepted signups count:* a submission draws on the global allowance only when it has passed the sender, body, challenge, honeypot, field and disclosure checks, its destination is eligible, and it is not a duplicate of a request already pending. None of these ever draws on it:
  - honeypot hits, which still get the generic acknowledgment
  - failed, missing or malformed challenges
  - malformed or oversized bodies
  - protected destinations, which get the status-free acknowledgment (CONT-005 public capture policy)
  - duplicates of a pending request
- *Duplicates:* a reservation whose claim loses to a concurrent duplicate before any hand-off is attempted is returned. A reservation followed by a hand-off attempt stays spent, whether the hand-off is certain or uncertain, as the existing non-refund rule says.
- *Challenge on by default:* Turnstile is on by default for popups, flyouts, full-page forms, landing pages and kiosk forms (FORM-009). Setting up the installation provisions its site and secret keys (OPER-001), and Home flags an installation that runs public forms without them. The existing fail-closed rules for a configured challenge stand. Where no challenge is configured, unchallenged traffic draws on an allowance of its own at the same floor, so it can never starve signups that pass the challenge.
- *Per network:* the existing network keys (full IPv4 address, IPv6 /64) allow at least 30 accepted signups per hour from one network, at least 120 when each request passes the challenge, and FORM-009's level for a kiosk form. Refused attempts (honeypot, failed challenge, malformed) draw on a separate per-network attempt allowance of at least 60 an hour. Once that is spent, further unchallenged requests from the network are refused, but a request that passes the challenge still proceeds. A shared office, campus, carrier NAT or store tablet therefore keeps signing people up.
- *Per destination:* three confirmation reservations per destination per UTC day stay, so a form cannot flood one address with confirmation messages (CONT-027).
- *Single and double opt-in alike:* the global and per-network allowances count every accepted capture, whatever the form's CONT-025 mode, so a single opt-in form cannot fill the contact table unchecked. A single opt-in capture sends no confirmation message, so it draws nothing on the per-destination confirmation allowance. A repeat single opt-in capture of an address that is already subscribed changes nothing and gets the generic acknowledgment.
- It replaces the "Public signup and confirmation" policy's levels of five attempts per network per hour and fifty confirmation reservations globally per hour, and its rule that a reservation lost to a concurrent duplicate is never refunded. Every other rule of that policy stands: the per-destination allowance, the network keys, fail-closed edge IP, durable counters and the non-refund of uncertain hand-off (Interpretations). `docs/signup-and-consent.md` is rewritten to match when this is built.
- *Defaults:* each allowance ships at its floor and stays there until an Owner raises it:
  - across the installation, 1,000 accepted signups an hour and 100 a minute (`seed.json → limits.signupGlobalPerHour` and `signupGlobalPerMinute`), and the same two levels again for traffic from forms without the challenge
  - per network, one count of accepted signups an hour, which admits a request without the challenge while it is under 30 and a request that passed the challenge while it is under 120, and 60 refused attempts an hour
  - per destination, three confirmation reservations per UTC day
  - for kiosk forms (FORM-009), partitions of their own that never draw on the ordinary allowances: 300 accepted signups an hour from the kiosk's network and 300 an hour across the installation's kiosk forms
  - Every window is a UTC clock hour, minute or day, as the counters are today. Only an Owner raises a level, up to the email hand-off rate, and nobody sets one below its floor. Settings shows each level with its floor and ceiling; a change applies from the next window and is an OPER-007 entry.
- *Challenge default:* each form named under *Challenge on by default* is created with the challenge on. Only an Owner or Admin turns it off for a form, and that is an OPER-007 entry; a kiosk form's challenge cannot be turned off. Each Turnstile token is verified once, on the server, within its five-minute life; a missing, expired, reused or unverifiable token fails closed under the existing rules.
-

**Acceptance.**
1. - *Volume:* a journey submits 600 distinct valid signups to one popup within an hour, spread over 200 network addresses.
2. All 600 become pending or subscribed under the form's mode, and none gets a 429.
3. A burst of 100 in one minute is also accepted in full.   - *Bots:* in the same hour, 200 honeypot or failed-challenge submissions are made.
4. The next real signup is accepted, and the global allowance's counter has risen only by the accepted signups.   - *Duplicates:* two concurrent duplicates of one signup leave one reservation spent.   - *Shared network:* 30 accepted signups come from one address to an ordinary form, and 120 that pass the challenge.   - *Unchallenged traffic:* on an installation without Turnstile, a flood of unchallenged signups up to their allowance leaves a challenged signup accepted.   - *Defaults:* at 1440 and 390 pixels, Settings shows each allowance with its floor and ceiling.
5. An Admin's raise gets 403 with a named reason.
6. An Owner's raise applies from the next window and appears once in the activity log.
7. A raise past the email hand-off rate, or a cut below the floor, is refused with a named reason.
8. A new popup has the challenge on; an Author's or Manager's request to turn it off gets 403, an Admin's is recorded in the activity log, and a kiosk form refuses it. A challenge token used twice is refused the second time.

#### FORM-009 — Kiosk and event forms

*Tier:* Core

**Requirement.** A form can be marked as a kiosk or event form, for a store tablet at a pop-up market, a trade-show booth or a till.
- It opens full-screen. After the success state, it resets to a blank form within 5 seconds.
- It never pre-fills or remembers the previous person. It sets no identifying cookie, and nothing it records identifies a later visitor under CONT-018.
- It requires the challenge on every submission.
- It allows at least 300 accepted signups per hour from its one network (FORM-008).
- Its captures record the capture method `kiosk` and the device label in CONT-003 evidence, and REPORT-005 shows them as their own source.
- Consent, confirmation and the per-destination allowance apply exactly as on any form. Marking a form as a kiosk form is recorded in OPER-007.
-

**Acceptance.**
1. 30 signups from one network address to a form marked as a kiosk form are all accepted, each after its own challenge.
2. After each success, the form is blank within 5 seconds, and the next submission carries no field, cookie or identity from the one before.
3. A submission without a passed challenge is refused.

#### FORM-010 — Refused signups are never silent

*Tier:* Core

**Requirement.** When an allowance refuses a submission, the operator knows. Address-independent refusals also inform the visitor; CONT-027's destination-dependent confirmation refusals retain the same generic acknowledgment to prevent address-state enumeration (owner decision, 19 Oct 2026).
- *Visitor:* for an address-independent allowance refusal, the route answers 429 with `Retry-After`. Every form shows its error state ("Too many signups right now. Please try again in a few minutes.") with the visitor's entries kept. The success state never shows, and no incentive is promised. The approved CONT-027 exception returns the same generic acknowledgment for destination-dependent confirmation intake and daily-allowance refusals, sends no further confirmation and grants no marketing or incentive authority; it never reveals whether an address was suppressed.
- *Form report:* FORM-005's report counts refusals per form, per reason (network, destination or global allowance) and per hour.
- *Home:* when any form had a refusal by the global or a per-network allowance in the last hour, Home raises an alert ("N signups refused by rate limit in the last hour"). It links to the form and to the allowance setting (FORM-008).
- *Activity log:* each hour with refusals is one OPER-007 entry, with counts by form and reason and no addresses.
-

**Acceptance.**
1. a submission over an address-independent allowance shows the error state, not success, with the visitor's entries kept and a `Retry-After`.
2. A fourth CONT-027 confirmation request to the same destination in one UTC day instead returns the same generic acknowledgment as an unsuppressed signup, sends no further mail and changes no subscription state.
3. In both cases the refusal is counted in the form's report under its reason, raised on Home, and summarized in the activity log entry for that hour.

### Segments and predictions

#### SEG-001 — Segment builder

*Tier:* Core

**Requirement.** Segments combine, with nested all/any groups: properties; consent and topic state; event conditions with count, time window and event-property filters (for example *Placed Order at least 2 times in the last 90 days where value is over $50*); products, collections or categories bought or viewed; US state, ZIP code or distance from a ZIP; engagement (clicked an email or SMS in the last N days); campaign, link and flow activity (SEG-006); tags; RFM stage and predictions (SEG-003, SEG-004). The builder shows a live estimated count and the plain-text summary (AUD-001 policy); campaign review always recomputes the exact eligible count.

**Acceptance.**
1. a saved segment over an event count with a value filter and a US state condition returns exactly the matching seeded contacts in review, and its summary names every condition.

#### SEG-002 — Live membership

*Tier:* Core

**Requirement.** Segment membership updates within five minutes of a qualifying event, property change or time-window boundary; joining and leaving are recorded as events that can trigger flows (FLOW-002) and appear in contact history. A rule that reads an unavailable or stale source is shown unavailable rather than empty (STORE-005, STORE-006).

**Acceptance.**
1. a Placed Order event moves a contact into a "repeat buyer" segment within five minutes, emits one entry event, and a flow triggered by that entry enrolls them once.

#### SEG-003 — RFM and lifecycle stages

*Tier:* Core

**Requirement.** From each contact's own orders Mango computes recency, frequency and monetary scores (quintiles over this deployment's customers) and a lifecycle stage (new, active, at risk, lapsed, champion), recomputed daily, with the method and thresholds visible.

**Acceptance.**
1. with a seeded order history, the stage distribution and one contact's scores match an independent calculation of the documented method.

#### SEG-004 — Predictions

*Tier:* Core

**Requirement.** Mango predicts each customer's expected next order date, predicted 12-month spend in USD, churn risk and average days between orders, only from this deployment's own history (PROP-008), and only once the history meets the stated minimum (default: at least 500 customers with orders and 180 days of orders); below it, the prediction reads "not enough history" and segments using it are unavailable. Each prediction shows its method, training date and back-tested error on held-out recent orders.

**Acceptance.**
1. on a seeded history above the minimum, predictions appear with method and back-test error; on a history below it, the segment builder marks prediction conditions unavailable.

#### SEG-005 — Engagement and lead scoring

*Tier:* Core

**Requirement.** Operators define a score from weighted rules (clicked, ordered, submitted a form, replied, visited a page, with decay) for people who have not yet bought, usable in segments and splits, with score history on the contact. Imported clicks (MOVE-009) contribute at their original times, including score decay; imported opens contribute nothing.

**Acceptance.**
1. a contact who clicks twice and submits a form reaches the configured score, which decays after the configured period.
2. Imported clicks (MOVE-009) count at their original times for both the score and its decay; imported opens never change the score.

#### SEG-006 — Campaign and flow activity conditions

*Tier:* Core

**Requirement.** Segment conditions and flow splits can name:
- a specific campaign: was sent, was delivered, clicked, did not click, or clicked a specific link (RESULT-007). Opened or did not open is available only as a labeled estimate where open tracking is on (RESULT-002);
- any or all of the last N campaigns the contact was sent: was sent, clicked or did not click;
- a flow (entered, completed, exited with a given reason, currently in it) or a flow message (received, clicked);
- an engagement level (often, sometimes, rarely, never), computed from the contact's clicks over their recent campaigns with the method shown, as Mailchimp's contact rating and engagement conditions offer.

Campaigns, links and clicks imported by a move-in (MOVE-009) can be used in these conditions under their imported names and original click times; imported opens never satisfy engagement conditions.

**Acceptance.**
1. after a seeded campaign X with known recipients and clickers, "received campaign X and did not click" returns exactly the seeded non-clickers, and "clicked link 2 of campaign X" returns exactly that link's clickers. "Did not click any of the last 5 campaigns" returns exactly the seeded contacts with no clicks across five seeded sends.
2. The same conditions over an imported Mailchimp campaign return the contacts its `granular_activity` file names, using original click times and imported campaign/link identities; imported opens never satisfy engagement conditions (MOVE-009).

### Email builder and content

#### BUILD-001 — Drag-and-drop email builder

*Tier:* Core

**Requirement.** Operators compose email from blocks (text, image, button, columns of one to four, spacer, divider, social links, video thumbnail linking out, header, footer, product, product grid, cart items, coupon, and a restricted HTML block) by dragging, reordering, duplicating and deleting, with per-block padding, alignment, background and mobile settings (columns stacking on phones with a chosen mobile content orientation, hide on mobile or on desktop, and mobile font size, line height, padding and alignment per block and section, produced as BUILD-010 states), undo and redo, and keyboard operation. The link tool offers Web, Email, Phone and Text links (MSG-013), and the hosts of the social links block's networks are allowed by default (MSG-014). The builder writes only the MSG-009 and MSG-012 grammar plus BUILD-010's generated responsive block, so every built email passes the same parser, checker and exact-revision approval as authored HTML; switching to HTML view and back is lossless for grammar-valid content.

**Acceptance.**
1. a browser journey builds a two-column email with product and button blocks, saves, reopens it unchanged, previews at desktop and mobile widths with the columns stacked at 375 pixels (BUILD-010) and approves it; the stored body re-parses to the same bytes (CAMP-003 policy).
2. A full promotional email (header, hero image with a button, a two-column text section, a six-item product grid, a social links block, the managed footer and BUILD-010 mobile settings) saves, reopens and approves within BUILD-012's limit, and the builder shows its sent size throughout.

#### BUILD-002 — Template library

*Tier:* Core

**Requirement.** A library of starter templates for each common job (newsletter, promotion, product launch, welcome, abandoned cart, browse abandonment, post-purchase thank-you, review request, win-back, event invitation, re-permission) and the operator's own saved templates; a template starts a draft or a flow message, and later edits to a template never change saved or approved revisions. Imported designs (DESIGN-004), generated designs (DESIGN-002) and migrated templates (MOVE-001 to MOVE-005) land as templates.

**Acceptance.**
1. an operator saves a draft as a template, starts a second campaign from it, edits the template, and the first campaign's approved revision is unchanged.

#### BUILD-003 — Brand kit

*Tier:* Core

**Requirement.** The brand kit holds logo, colors, fonts (with email-safe fallback stacks), button style, link color, footer and social links. Given the store's website address, Mango can propose a brand kit by fetching that page once on the operator's request and extracting logo, colors and fonts for the operator to accept or edit. New templates, forms and landing pages start from the kit; changing the kit never alters saved or approved revisions. The kit's website and social link hosts join the allowed link hosts (MSG-014).

**Acceptance.**
1. proposing a kit from a test storefront page at the network edge yields its logo and two colors for review, and accepting it styles a new template.

#### BUILD-004 — Reusable blocks

*Tier:* Core

**Requirement.** A saved block (for example a footer, promotion banner or shipping notice) can be placed in many templates, drafts and flow messages. Editing it updates drafts; for approved campaign revisions and live flow revisions it creates new draft revisions that must pass approval or activation (CAMP-007, FLOW-008).

**Acceptance.**
1. editing a reusable footer updates two drafts and creates a new draft revision of one live flow message, while the live revision keeps sending the old footer until activation.

#### BUILD-005 — Conditional content

*Tier:* Core

**Requirement.** A block can be shown or hidden by segment, property, topic, predicted stage or the trigger event's properties, with an "otherwise" alternative; the plain-text part follows the same choice. Preview can render as any chosen contact or as each branch.

**Acceptance.**
1. a VIP-only block appears in the preview as a VIP contact and not as another, and both recipients' plain-text parts match their HTML.

#### BUILD-006 — Dynamic product content

*Tier:* Core

**Requirement.** Product blocks render, at send time, the trigger event's cart or checkout items (image, title, variant, quantity, price), the viewed product, or recommendations from the connected catalog: bestsellers, new arrivals, recently viewed, frequently bought together and personalized by purchase history. Out-of-stock and unpublished items are skipped; prices are those current at hand-off; an empty recommendation hides the block or skips the message as the operator chose. Image and link hosts follow MSG-006 against MSG-014's list, which already holds every connected store's storefront and catalog asset hosts, so a product block needs no settings change. An item whose image or link uses a host outside that list at hand-off is dropped from the block like an out-of-stock item and counted with `link-host-not-allowed`. Operators can also pick specific products for a block (BUILD-011).

**Acceptance.**
1. an abandoned-cart message for a contact with two items renders both items with current prices; marking one out of stock before hand-off removes it; a personalized grid excludes products the contact already bought.

#### BUILD-007 — Coupons

*Tier:* Core

**Requirement.** A message can carry a unique single-use code created at hand-off through the connected store (Shopify, through the `write_discounts` scope INT-015's install grants; WooCommerce, BigCommerce, Stall) or a Stripe promotion code, with the discount, expiry and usage limit approved as part of the revision; or a static code. A failure to create a code skips that recipient-step with `coupon-unavailable` rather than sending without it. Mango never creates a discount outside an approved revision.

**Acceptance.**
1. a flow message hands off with a unique Shopify code per recipient at the store edge; a store-side failure records `coupon-unavailable` and sends nothing for that recipient.

#### BUILD-008 — Previews and pre-send checks

*Tier:* Core

**Requirement.** Previews show desktop, mobile, dark-mode approximation and plain text, rendered as a chosen contact (CAMP-003). Review names advisory findings for missing image alt text, heading order, link text, likely spam-filter triggers and a sent size (BUILD-012) at or above 90 per cent of `seed.json → maxEmailHtmlBytes`, where Gmail clips a message at about 102 KB, alongside the blocking checks (MSG-006 to MSG-012). The size advisory names the measured sent size, the limit and the three largest blocks by size.

**Acceptance.**
1. a draft with a missing alt attribute and a 95 KB sent size shows both advisories with locations, the size advisory naming 95 KB and the limit; acknowledging them allows approval while a contrast failure still blocks.
2. A 110 KB body is refused at save under BUILD-012.

#### BUILD-009 — SMS and MMS composer

*Tier:* Core

**Requirement.** The SMS editor counts characters and segments (GSM-7 or UCS-2), shows the per-recipient and total estimated cost in USD before approval (SMS-006), shortens links on the operator's branded short domain with per-recipient click tracking (RESULT-005), attaches one MMS image within carrier limits, applies personalization fallbacks and appends the required compliance text (MSG-005).

**Acceptance.**
1. a message with an emoji switches to UCS-2 and shows the new segment count and cost; the preview shows the short link and STOP text that will be sent.

#### BUILD-010 — Mobile layout the checker can prove

*Tier:* Core

**Requirement.** Built emails adapt to phones in two layers, both judged by the MSG-012 checker.
- *Stacking without a stylesheet.* The builder writes side-by-side columns as left-aligned, pixel-width tables (`align="left"`, `max-width: 100%`) inside a full-width cell. This fluid-table technique is already inside the authored grammar of the 13 October policy, which admits a left-aligned table. Columns sit side by side at 600 pixels and stack in order in any narrower window, including in clients that strip `<style>`, and images scale with `max-width: 100%`.
- *Mobile-only settings.* Hide on mobile, hide on desktop, mobile content orientation and per-block or per-section mobile font size, line height, padding and alignment are written into one generated responsive block. This is a single `<style>` element in the document `<head>`, of at most 8,192 bytes, holding only `@media only screen and (max-width: 480px)` rules over a closed vocabulary of Mango class names (hide, show, stack, order, font size, line height, padding, alignment), plus, for hide on desktop only, `@media only screen and (min-width: 481px)` rules that hide, so a desktop-hidden block stays visible wherever the block is not applied. Its declarations come from the allowed-property list, plus `display: none` for hiding and `display: block` with `width: 100%` for stacking, each written with `!important`, which only this generated block may carry, so it overrides the inline styles it refines; for the chosen mobile content orientation the builder writes the columns in their stacking order and the generated rules restore the desktop order.
- *Authors cannot write it.* Saving regenerates the block from the per-block settings. Any `<style>` element, class or at-rule that is not byte-identical to the regenerated block is refused, so MSG-009's authored grammar and the 13 October policy are unchanged for everything an author writes.
- *Checked at both widths.* The checker judges the email twice, as the desktop tree and as the mobile tree with the generated rules applied, in standards and quirks rendering, and every MSG-012 rule holds in both. The unsubscribe link, postal address and compliance text can never sit in a hidden block. A block hidden at one width must be shown, and pass, at the other, and the plain-text part always carries it.
- *Clients without `<style>`* show desktop sizes with stacked columns. Preview names the mobile settings that depend on the responsive block.
- *Conservative default (Gmail CSS support, caniemail `<style>`/media-query data; owner rule of 19 October 2026):* the block is generated, never merged with authored text, and its absence never loses content. Hide on mobile is applied only by the block, so a client without it shows the block. Hide on desktop is applied only by the min-width rule, so Outlook desktop and style-stripping clients show it, and preview says so. No MSO conditional comment, `mso-*` property, attribute selector, ID selector or `@import` is ever generated. A block over 8,192 bytes is refused at save with its size named.
- *Security consequences:* the responsive block is Mango's own output from a closed vocabulary, never authored text. It adds no remote load, no tracking channel and no selector an author controls. Hiding is limited to whole blocks that remain visible and checked at the other width and in plain text. This is the one named amendment of the MSG-009 and MSG-012 policy by a target clause, and it ships only with its adversarial cases in an executed spec that consumes `tests/support/adversarial-email.mjs` (see Evidence).
-

**Acceptance.**
1. a browser journey builds a two-column email with one block set to hide on mobile and a mobile font size on another, saves it, and renders the stored body at 375 and 600 pixels in standards and quirks mode.
2. At 375 the columns are stacked, the hidden block is absent and the mobile size applies.
3. At 600 the columns sit side by side and the block is present.
4. With the `<style>` element stripped, the columns still stack at 375.
5. The stored body passes the MSG-012 checker in both trees.
6. A hand-written `<style>` element or class in HTML view is refused with the reason named.
7. A block set to hide on desktop is absent at 600 pixels and present at 375, and with the `<style>` element stripped it is present at both widths.
8. The stored `<style>` sits in `<head>`, every generated declaration carries `!important`, and a hand-written `!important` in a `style` attribute is still refused. A configuration whose generated block would exceed 8,192 bytes is refused at save with the size named.

#### BUILD-011 — Chosen catalog products

*Tier:* Core

**Requirement.** In a product or product-grid block, an operator searches the connected catalog by title, SKU, collection or vendor and picks specific products and variants.
- The block stores product and variant identifiers, not copies. Image, title, price, compare-at price and product URL are read from the catalog at hand-off, so the price sent is the price at that moment. Review and preview show the current values and the time they were read.
- An item that is unpublished, deleted or out of stock at hand-off is hidden; when none remain, the block is hidden or the message skipped, as the operator chose. Each case is counted on campaign detail.
-

**Acceptance.**
1. an operator picks two products from the Shopify edge catalog, one with a chosen variant, and preview shows their current images and prices.
2. The edge raises one price before hand-off, and the delivered email carries the new price.
3. Marking the other product unpublished hides it, and campaign detail counts it.

#### BUILD-012 — Email size the builder and imported templates fit in

*Tier:* Core

**Requirement.** The limit on an email body is set by delivery, not by the size of one design, so a full promotional email built in Mango or brought across from an incumbent saves, approves and sends.
- *Measured as sent:* the sent size is the UTF-8 byte length of the HTML part as it is handed off: the stored body, BUILD-010's generated responsive block, the managed footer and postal address, every tracked link at its rewritten length (RESULT-005), each personalization token at its fallback or the longest value the audience holds, and each dynamic or chosen product block (BUILD-006, BUILD-011) at its configured maximum item count. Save measures this upper bound, so a recipient's hand-off can never exceed it.
- *The limit:* a body saves while its sent size is within `seed.json → maxEmailHtmlBytes` (102,400 bytes, Gmail's clipping point). The save schema, design import (DESIGN-004), design generation (DESIGN-002), proposals (AGENT-007), template save (BUILD-002), duplication (CAMP-018), flow messages (FLOW-008) and MOVE-011 conversion all use this one derived limit; no fixed character cap below it remains. The plain-text part has its own limit of the same number of bytes.
- *Floor:* the limit holds, with room to spare, the full promotional email in BUILD-001's acceptance and a Mailchimp `base_boxed_3column_query.html` blueprint filled with content and converted through MOVE-011.
- *Size shown while building:* the builder (BUILD-001) and the HTML view show the sent size in KB beside the limit as the operator edits, and BUILD-008's advisory appears from 90 per cent of it.
- *Refusal, never truncation:* a save over the limit is refused with the measured sent size, the limit and the three largest blocks by size named, and the editor keeps the unsaved content. Approval, test send and hand-off re-measure the stored revision; a recipient whose rendered HTML would still exceed the limit (for example after a catalog change) is skipped with `email-too-large` and counted on campaign or flow detail, never sent clipped or cut.
- This replaces the historical 20,000-character save limit recorded in the DESIGN-004 policy of 13 October 2026; every other import and grammar guarantee is unchanged.
-

**Acceptance.**
1. a browser journey builds the full promotional email in BUILD-001's acceptance (header, hero and button, a two-column text section, a six-item product grid from the Shopify edge catalog, a social links block, the managed footer and at least one block with BUILD-010 mobile settings), saves it, reopens it unchanged and approves it; its stored body is recorded as more than 20,000 characters and within the limit, and the shown sent size matches the measured hand-off size at the provider edge.
2. Mailchimp's `base_boxed_3column_query.html` blueprint, filled with fixture content and moved in through MOVE-011, becomes a template that starts a draft, which saves and reaches approval.
3. A body over the limit is refused at save with its size, the limit and its largest blocks named; a body at 95 KB shows BUILD-008's size advisory.

### Automated flows

#### FLOW-001 — Visual flow builder

*Tier:* Core

**Requirement.** Operators build a flow on a canvas from a trigger and nodes: time delay, wait-until, conditional split, trigger split, random or A/B split, send email, send SMS, send push, update property, tag, webhook, notify team, create CRM task, and exit. The canvas zooms and pans, is keyboard operable, explains every node in plain text, and validates the graph before activation (no unreachable node, no loop without a delay, every path ends). On a phone it is readable with node details (MOBILE-001).

**Acceptance.**
1. a browser journey builds a three-message welcome flow with a split, sees a validation error for an unconnected node, fixes it and saves a draft flow revision, at 1440 pixels and readable at 390.
2. Inherits INT-004: enrol on Stripe subscription events (renewal reminder) when this flow capability is built.

#### FLOW-002 — Triggers

*Tier:* Core

**Requirement.** A flow starts when: a contact confirms a topic subscription; a past unsubscriber confirms a resubscribe (`resubscribed`, CONT-027), a trigger kind of its own; joins a segment; an event occurs with property filters (Started Checkout, Added to Cart, Viewed Product, Placed Order, Fulfilled Order, Refunded Order, Subscription Started, Subscription Canceled, Form Submitted, custom API events); a contact clicks any link or a specific link of a named campaign or flow message, or any message (RESULT-007); a contact is sent a named campaign (with a wait-until for "did not click", FLOW-004); a date property arrives with an offset (birthday, signup anniversary, renewal date minus 7 days); a viewed product drops in price or comes back in stock; a tag is added; or an SMS keyword is received. Each trigger declares the source capability it needs (STORE-006) and the flow cannot be activated without it.

**Acceptance.**
1. each trigger kind, fed through the events API or a store adapter at the network edge, enrolls a matching contact once and no other; a Clicked trigger filtered to one link of a campaign enrolls a contact who clicked that link and not one who clicked another link of it.
2. Inherits INT-004: enrol on Stripe subscription events (renewal reminder) when this flow capability is built.

#### FLOW-003 — Entry filters and re-entry

*Tier:* Core

**Requirement.** A flow has entry filters (for example *has not placed an order since starting this flow*, *in the United States*, *not in the VIP segment*) and flow filters re-evaluated before every action; a contact who stops matching leaves with `filter-exit`. Re-entry is once ever, once per N days, or every time, and a contact is never enrolled twice in the same revision at once.

**Acceptance.**
1. a contact triggering Started Checkout three times in an hour under "once per 7 days" holds one enrollment; a contact who orders mid-flow exits at the next action with `filter-exit`.

#### FLOW-004 — Delays and waits

*Tier:* Core

**Requirement.** Delays are fixed (minutes, hours, days), until a weekday and local time in the recipient's zone (CAMP-013), or wait-until a condition (an event or property) with a timeout path. Timers fire within 60 seconds of their instant and survive restart, redeploy and outage without loss or early firing.

**Acceptance.**
1. a durable-timer journey sets delays of five minutes and two days (with a controlled clock), restarts the runtime between, and each fires once within 60 seconds of its instant; a wait-until for Placed Order takes the event path when the order arrives and the timeout path otherwise.

#### FLOW-005 — Splits

*Tier:* Core

**Requirement.** Conditional splits branch on properties, segment membership, event history, consent per channel (has SMS consent: send SMS; otherwise email), predictions and engagement; trigger splits branch on the triggering event's properties (cart value over $100, product category). Every split records which branch each contact took and why.

**Acceptance.**
1. two contacts with cart values of $80 and $150 take different branches, and each enrollment shows the evaluated condition.

#### FLOW-006 — Actions

*Tier:* Core

**Requirement.** Besides messages, a flow can update a property, add or remove a tag, add a topic only where consent evidence covers it (CONT-015), call a signed webhook (INT-008) with an idempotency key, notify the team by email or Slack, create a task or note in the connected CRM (INT-011), and generate a coupon (BUILD-007). No action can subscribe, resubscribe or unsuppress anyone.

**Acceptance.**
1. a flow with a property update, a tag and a webhook action applies each once per enrollment even when the job is redelivered, and an "add topic" action without evidence records `consent-missing`.

#### FLOW-007 — Exits and goals

*Tier:* Core

**Requirement.** A flow names goal events (for example Placed Order for an abandoned-checkout flow) that end the enrollment as converted, plus exits on unsubscribe, suppression, erasure, entry into a higher-priority flow and manual removal. Every exit is recorded with its reason and time; a converted contact never receives a later message of that enrollment.

**Acceptance.**
1. in an abandoned-checkout flow, a contact who orders after the first message receives no second message and is counted as converted with the order's value.

#### FLOW-008 — Reviewed activation

*Tier:* Core

**Requirement.** A flow revision is *draft*, *in review*, *live*, *paused* or *archived*. Activation atomically validates the trigger capability, every message under the approval checks (CAMP-004), sender, links (MSG-006, with MSG-015's allow action), personalization, coupons, frequency and quiet-hour policy and the revision's send limits (maximum messages per day and per contact, optional end date), and records the activating operator. A live revision sends without per-message approval only what that revision contains, to people its trigger and filters admit, within its limits; nothing else. Editing creates a new draft revision; activating it requires the operator to choose explicitly whether in-flight enrollments finish on the old revision or move to the matching node of the new one. Agents can draft and propose flows but never activate one (AGENT-010). This replaces the former "autonomous sends" exclusion: sends are automatic only inside a person's reviewed activation.

**Acceptance.**
1. activation is refused naming each failing check; after activation a matching event sends the approved message; an edited message does not send until the new revision is activated, and the migration choice is recorded.
2. Activation, pause and archive of a flow revision are each an OPER-007 activity entry with operator and time, filterable on the Activity screen (inherited from OPER-007, which is done for the actions Mango performs today).

#### FLOW-009 — Per-send rechecks

*Tier:* Core

**Requirement.** Before every flow hand-off Mango re-applies consent and topic (AUD-002, CONT-015), opt-out and suppression (CONT-004, CONT-006), cross-message frequency (AUD-004, FLOW-014), quiet hours (SEND-002, SMS-003), sender reputation (MSG-011), current sender evidence (DELIV-007) and source freshness (STORE-005). A skipped message is recorded with its reason, and the node's setting decides whether the contact continues or exits.

**Acceptance.**
1. a contact who unsubscribes between two flow messages receives neither the second nor any later one, and the enrollment shows `unsubscribed` at that node.

#### FLOW-010 — Exactly-once execution

*Tier:* Core

**Requirement.** Each node runs at most once per enrollment under an idempotency key of flow revision, enrollment and node; duplicate, replayed or out-of-order source events are deduplicated by source identity (STORE-002) and ordered by occurrence time; restarts, redeploys and redelivered queue messages never send twice (SEND-001). After an outage, triggers older than the node's relevance window (default seven days for cart and browse flows) skip with `stale-trigger` instead of sending late.

**Acceptance.**
1. a journey replays the same Started Checkout webhook three times and kills the runtime mid-dispatch; one enrollment and one hand-off result; a backlog of eight-day-old carts released after an outage skips with `stale-trigger`.

#### FLOW-011 — Pause, manual review and stop

*Tier:* Core

**Requirement.** Operators can pause a flow (new triggers are dropped or queued, as chosen), put one message into manual mode (each pending send waits in a review queue for approval), remove chosen contacts from a flow, and press one installation-wide **Stop all sending** control that halts every campaign and flow hand-off within 30 seconds until an owner or admin resumes.

**Acceptance.**
1. Stop all sending during an active flow and campaign leaves no hand-off after 30 seconds; resuming continues both under their rechecks; a manual-mode message waits for review and sends only once approved.

#### FLOW-012 — Flow library

*Tier:* Core

**Requirement.** Prebuilt flows install as drafts with explained default timings and editable content: welcome series, abandoned checkout, abandoned cart, browse abandonment, site abandonment, post-purchase thank-you and cross-sell, review request, customer win-back, re-permission and sunset, birthday, back in stock, price drop, replenishment by predicted reorder date, VIP and loyalty milestones, subscription renewal reminder, and a lead-nurture sequence. Before activation each shows its expected weekly enrollments from this deployment's own recent events, and its frequency setting with the 30-day skip count (AUD-009); cart, browse, back-in-stock and price-drop flows are not blocked by campaign sends.

**Acceptance.**
1. installing the abandoned-checkout flow creates a draft with three messages, an order goal and a seven-day relevance window, and shows an expected volume computed from seeded checkout events.

#### FLOW-013 — Flow analytics and path inspection

*Tier:* Core

**Requirement.** Each flow and node reports entered, waiting, sent, skipped by reason, exited by reason, converted and attributed revenue (REPORT-003), with period comparison; any contact's path can be opened to answer "why did this person get this?" with every evaluated filter, split and recheck.

**Acceptance.**
1. after a seeded run, node counts reconcile (entered equals waiting plus sent plus skipped plus exited at each node) and one contact's path lists each decision with its inputs.

#### FLOW-014 — Priority and cross-message frequency

*Tier:* Core

**Requirement.** Operators rank flows and campaigns by priority and set per-contact caps across email and SMS (for example at most one marketing email per day and three per week). When two messages compete, the higher priority sends and the other skips with `frequency-cap` or waits, as its node chooses. Once set, these caps replace AUD-004's default windows for campaigns and flows, and a message's recorded override follows AUD-009.

**Acceptance.**
1. a contact eligible for a campaign and a win-back message on the same day receives only the higher-priority one and the other records `frequency-cap`.

#### FLOW-015 — Sequences

*Tier:* Core

**Requirement.** A linear sequence editor (Kit and ActiveCampaign style) sends a series of emails on chosen days after entry within allowed weekdays and hours, as a flow underneath with the same activation, rechecks and reporting.

**Acceptance.**
1. a five-email weekday-only sequence entered on a Friday sends its first email on Monday at the chosen hour.

#### FLOW-016 — Flow portability

*Tier:* Core

**Requirement.** Flow definitions, revisions, enrollments, timers and history are part of the export (DATA-001). Restoring into a new installation keeps every flow paused with its enrollments, so nothing sends until an operator resumes it under fresh rechecks.

**Acceptance.**
1. the portability journey exports a live flow with waiting enrollments, restores it, finds it paused with the same enrollments, and resuming sends each waiting message once.

### Experiments and optimization

#### EXP-001 — Campaign A/B tests

*Tier:* Core

**Requirement.** A campaign can test two to eight variants of subject, preheader, sender name, content or send time on a test portion (for example 20 per cent) for a set duration, then send the winner to the rest. Every variant is part of the approved revision. The winner metric is click rate, placed-order rate or revenue per recipient (open rate only as a labeled estimate, RESULT-002), declared before sending with its evidence threshold (EXP-005); if no variant clears it by the deadline, the pre-chosen default variant sends.

**Acceptance.**
1. a three-variant subject test sends to the test portion, picks the winner by the declared rule, and sends it to the remainder before the step deadline; a test with no clear winner sends the default and says why.

#### EXP-002 — Multivariate tests

*Tier:* Core

**Requirement.** A campaign can test combinations of up to four subjects and four content versions (16 cells); review blocks a design whose cells would each receive fewer recipients than the stated minimum for the declared effect size.

**Acceptance.**
1. a 2×2 test on a 40,000-contact audience sends four cells and reports each cell and each factor's effect with intervals.

#### EXP-003 — Flow splits and flow holdouts

*Tier:* Core

**Requirement.** A flow can split traffic randomly between message versions or paths and can hold out a fixed share of enrollments who receive nothing, so that its incremental conversion rate and revenue are measured against them.

**Acceptance.**
1. with a 10 per cent holdout, the flow report shows conversion and revenue for messaged and held-out groups with the difference and interval.

#### EXP-004 — Global holdout

*Tier:* Core

**Requirement.** An owner can set an installation-wide holdout (for example 5 per cent of subscribers for 90 days) excluded from all marketing campaigns and flows, to measure the overall incremental revenue of marketing. Holdout members keep their consent and are never shown as unsubscribed.

**Acceptance.**
1. a review excludes the holdout members with `global-holdout`, and the overview report shows revenue per contact for holdout and messaged groups.

#### EXP-005 — Honest test statistics

*Tier:* Core

**Requirement.** Every experiment states its method (two-proportion test or Bayesian probability to beat control), sample size, observed difference, interval, and the minimum detectable effect it was powered for; a sample-size calculator runs before sending. No variant is labeled a winner below the declared threshold, and stopping early is allowed only by a rule declared before sending.

**Acceptance.**
1. an experiment with too few conversions reports "no reliable difference" with its interval rather than a winner.

#### EXP-006 — Send-time optimization

*Tier:* Core

**Requirement.** A campaign step can send to each contact at the hour their own past clicks and orders suggest within a 24-hour window, in their local time, respecting quiet hours, frequency and the step deadline. Imported clicks (MOVE-009) contribute at their original hours; imported opens contribute nothing. Contacts without enough history send at the campaign's chosen time and are counted separately; the report compares optimized sending with a randomized control slice.

**Acceptance.**
1. in the scheduler journey, contacts with seeded click histories receive their own best hours, others the default time, and the report shows the control comparison.
2. Imported clicks (MOVE-009) use their original hours; imported opens provide no send-time evidence and leave contacts without qualifying history at the default.

### SMS, push and other channels

#### SMS-001 — US SMS through Twilio

*Tier:* Core

**Requirement.** SMS and MMS for US and Canadian numbers send through the owner's own Twilio account (a Messaging Service with 10DLC numbers, a verified toll-free number or a short code), with signed status callbacks for delivered, undelivered and failed and signed inbound webhooks for replies. The existing Mobile Message adapter remains for Australian senders; each recipient's country selects a sender registered for it (MSG-001). Hand-off, deduplication and reconciliation follow SEND-001, SEND-005 and SEND-008. The Twilio account is connected from Settings through SMS-008, and SMS-001 is done only once SMS-008 is, with its acceptance run on an SMS-008 connection.

**Acceptance.**
1. the go-live journey with a Twilio edge sends an approved SMS step, ingests signed delivered and undelivered callbacks once each, and a replayed callback adds no fact.

#### SMS-002 — Carrier registration status

*Tier:* Core

**Requirement.** Settings shows the 10DLC brand and campaign registration (through Twilio's Trust Hub and The Campaign Registry) or toll-free verification state for each sender, with rejection reasons. Mango files the registration from inside Settings, as Mailchimp and Klaviyo do, on the account SMS-008 connected: one form, pre-filled from the business sender identity and postal address, collects the brand details (legal name, EIN, business type, website, contact), and Mango submits the brand and A2P campaign (Trust Hub customer profile, brand registration and the Messaging Service's US A2P campaign) or the toll-free verification through Twilio's APIs. The campaign's use case, sample messages, opt-in description and opt-in screenshots come from the brand's own SMS templates and SMS signup forms (FORM-001, CONT-003), and the HELP and STOP replies from CONT-007. The one-time and monthly registration fees are shown in USD before the owner submits. A rejection shows the carrier's reason beside the field it concerns, and the owner fixes and resubmits from the same form; the Twilio console is never required. SMS approval is blocked for a sender that is not registered and approved (MSG-004). Registration fees and carrier charges are the owner's, on their Twilio account.

**Acceptance.**
1. from Settings, an Owner submits the brand and campaign registration to the Twilio edge with no Twilio console step, and the edge receives the pre-filled sample messages and opt-in description; with the Twilio edge reporting the campaign as pending, SMS approval names `sender-unregistered`; a rejection shows its reason on the form and a resubmission reaches the edge; reporting it approved clears the block.

#### SMS-003 — US quiet hours and state rules

*Tier:* Core

**Requirement.** *Policy: `sms.quiet-hours.v1` (SEND-002); US default: marketing texts hand off only between 08:00 and 20:00 in the recipient's local time, which is inside the federal TCPA window and the stricter state windows (for example Florida and Oklahoma).* State frequency limits are enforced where stricter (for example no more than three marketing texts on the same subject to one number in 24 hours under Florida's rule), and an unknown recipient zone blocks hand-off. A recipient with no recorded address or other location evidence has the number's area code as location evidence, recorded with source `area-code` and shown as such on the contact; Florida's rule, for example, presumes the area code is the recipient's zone. Where an area code spans more than one time zone, the window is the overlap of 08:00 to 20:00 in each. Recorded location evidence always outranks the area code. Operators can only make these windows stricter.

**Acceptance.**
1. a step scheduled at 19:30 Eastern hands off to New York recipients and defers Los Angeles recipients only if 19:30 Eastern is outside their window; a fourth same-subject text to a Florida number in 24 hours is skipped with `state-frequency-limit`.
2. A phone-only subscriber with a 305 number and no address hands off at 10:00 Eastern with zone source `area-code`, and is deferred at 20:30 Eastern.

#### SMS-004 — Two-way SMS inbox

*Tier:* Core

**Requirement.** Replies appear in a conversation view per contact and in a shared inbox; operators can answer one-to-one (not marketing, logged under the operator), with compliance keywords still processed first (CONT-007). Replies can be forwarded to HappyToHelp or another help desk through a webhook.

**Acceptance.**
1. an inbound signed reply appears in the inbox and contact timeline; the operator's answer hands off through Twilio once; an inbound STOP opts the number out before the webhook is acknowledged and shows in the thread.

#### SMS-005 — Branded short links and MMS

*Tier:* Core

**Requirement.** Links in SMS use a short domain the owner points at the deployment, carry a per-recipient-step token (RESULT-005) and redirect without exposing the contact; MMS images are stored once (CAMP-012) and sent within carrier size limits.

**Acceptance.**
1. a sent SMS's short link records one click for that recipient and redirects to the original URL; a click from a known link-preview bot is retained as automated and excluded from engagement.

#### SMS-006 — SMS cost control

*Tier:* Core

**Requirement.** Review shows the estimated SMS cost in USD (segments × recipients × the provider's per-segment rate and carrier surcharges the owner configures); an owner can set a daily SMS spend cap, and dispatch stops with `sms-budget-reached` when the next hand-off would exceed it. Actual costs from the provider are recorded under RESULT-004.

**Acceptance.**
1. a step whose estimate exceeds the cap shows a blocking finding at review; with a cap reached mid-dispatch, remaining recipient-steps skip with `sms-budget-reached`.

#### SMS-007 — WhatsApp marketing messages

*Tier:* Core

**Requirement.** Through the owner's WhatsApp Business account (Twilio or Meta's Cloud API), Mango sends pre-approved WhatsApp templates to contacts with WhatsApp-specific opt-in evidence, with delivery and read receipts as provider facts and opt-out replies honored like SMS.

**Acceptance.**
1. a template campaign to an opted-in contact hands off through the provider edge, records the delivered fact, and an opt-out reply excludes the contact from the next send.

#### SMS-008 — Twilio connection an owner makes in Settings

*Tier:* Core

**Requirement.** The SMS counterpart of DELIV-008: an owner connects their Twilio account without a terminal, and Mango wires the status and inbound webhooks itself.
- *Connect:* in Settings → SMS an Owner (OPER-004) pastes the Twilio Account SID and Auth Token (the Auth Token is what Twilio signs its webhooks with, so it is needed even when an API key sends). Mango reads the account back, names a suspended or trial account, and stores the credentials as a server secret exactly as DELIV-008 stores a mail key, with no deployment input, `hosted.env` edit or redeploy.
- *Mango does the wiring:* it creates its own Messaging Service and sets that service's status callback and inbound request URLs to this deployment's signed Twilio routes. The owner picks which of their numbers (10DLC, toll-free or short code) join it, or buys a new number from Settings with the price shown first. A number already in another Messaging Service is moved only after the owner confirms, naming that service; Mango never changes another service's URLs.
- *Complete only once a signed callback arrives:* Mango sends one test text to the connecting Owner's own phone, and the connection is complete when its signed status callback is verified and stored under SEND-005. Until then SMS approval and activation name `sms-events-missing`.
- *Each step is visible, and the connection is watched:* Settings → SMS shows the credentials, account state, Messaging Service, each number, registration (SMS-002) and the first signed callback as passed, waiting or failed, with its fix. A rejected credential, or Mango's service found deleted or its URLs changed, raises the Home alert and email and blocks SMS approval with the cause named, as DELIV-008 does. Replacing the credentials keeps the SEND-001 and SEND-008 fences.
- *Developer route:* the deployment-input route stays, labeled and never offered first, as in DELIV-008.
-

**Acceptance.**
1. against a Twilio edge, an Owner on a fresh installation with no SMS deployment input connects by pasting the Account SID and Auth Token, with no redeploy.
2. The edge records the Messaging Service Mango created with its callback and inbound URLs, and an existing service at the edge is unchanged.
3. Before the test text's signed callback, SMS approval names `sms-events-missing`; after it, the step passes.
4. An inbound STOP signed by the edge opts the number out (CONT-007).
5. A rotated Auth Token at the edge raises the Home alert and blocks SMS approval.
6. An Admin calling the connect route is refused with 403.

#### PUSH-001 — Web push

*Tier:* Core

**Requirement.** A store can ask visitors to allow browser push notifications (a soft prompt first, then the browser prompt), keyed by owner-held VAPID keys; campaigns and flows can send push with title, body, image and link; unsubscribing in the browser or Mango ends the subscription. Push permission is its own channel state.

**Acceptance.**
1. a browser journey grants permission, receives a push from an approved campaign through a test push service, and after revoking permission the next send skips with `push-unsubscribed`.

#### PUSH-002 — Mobile app push and in-app messages

*Tier:* Core

**Requirement.** For a business with its own iOS or Android app, an SDK registers devices against contacts and Mango sends push through APNs and Firebase Cloud Messaging with the owner's credentials, plus in-app messages shown on the next app open, from campaigns and flows.

**Acceptance.**
1. a test app registers a device; a flow push reaches it through the APNs and FCM edges; an in-app message shows once on next open and records its view.

### Deliverability

#### DELIV-001 — Sending providers

*Tier:* Core

**Requirement.** Marketing email sends through the owner's own SendGrid or Resend account today and, in the target, Amazon SES, Postmark (broadcast stream), Mailgun or any authenticated SMTP relay. Each adapter declares its deduplication, event and lookup capabilities; one without signed events reports only hand-off and acceptance, labeled as such, never delivery (SEND-006). The owner connects the account from Settings, and Mango creates its signed delivery webhook, through DELIV-008. DELIV-001 is done only once DELIV-008 is, with its go-live journey run on a DELIV-008 connection; a build round never marks it done on the deployment-input route.

**Acceptance.**
1. the go-live journey runs against each adapter's edge and shows the declared capability on the campaign page; an SMTP relay without events never shows a delivered count.

#### DELIV-002 — Domain setup

*Tier:* Core

**Requirement.** A setup guide gives the exact SPF, DKIM, DMARC and return-path records for the chosen provider, read from the connected account (DELIV-008), which Mango asks to create the domain authentication for the From domain when none exists, checks them in public DNS (MSG-002), sets up a branded tracking and link domain with TLS, and explains BIMI with the DMARC policy it needs.

**Acceptance.**
1. the sender-verification journey reports each record pass or fail with the record to add, and a tracking domain with a valid CNAME rewrites tracked links to it.
2. On a provider edge with no domain authentication for the From domain, Mango creates it at the edge and shows the edge's records.

#### DELIV-003 — Bulk-sender compliance dashboard

*Tier:* Core

**Requirement.** One page shows the Gmail, Yahoo and Microsoft bulk-sender requirements and Mango's state against each: SPF and DKIM pass, DMARC policy with alignment, one-click unsubscribe, unsubscribe processing time, and spam-complaint rate from the signed provider facts DELIV-008's webhook delivers (shown as `delivery events not connected`, never as zero, until that webhook step has passed) and, when the owner connects it, Google Postmaster Tools. Rates nearing the MSG-011 limits show warnings before the block.

**Acceptance.**
1. with seeded provider facts at a 0.25 per cent complaint rate, the dashboard warns; at 0.3 per cent the MSG-011 block shows the same figures.
2. With no signed event received yet, the complaint rate reads `delivery events not connected`.

#### DELIV-004 — Domain warm-up

*Tier:* Core

**Requirement.** For a new sending domain or dedicated IP, Mango proposes a warm-up schedule (daily volume steps over two to six weeks), sends to the most engaged contacts first, and enforces the day's cap across campaigns and flows, deferring the rest.

**Acceptance.**
1. with warm-up on and a 2,000-a-day cap, a 10,000-recipient campaign hands off 2,000 most-engaged recipients on day one and continues the next day within the step deadline or skips with `warmup-cap`.

#### DELIV-005 — Mailbox-provider breakdown

*Tier:* Core

**Requirement.** Reports split delivered, bounced, complained and clicked by recipient mailbox provider (Gmail, Outlook and Hotmail, Yahoo and AOL, Apple iCloud, other) and bounce reasons into a stated taxonomy (invalid address, mailbox full, policy block, reputation, content, other).

**Acceptance.**
1. seeded signed bounce facts for Gmail and Outlook addresses appear under the right providers and reasons.

#### DELIV-006 — Address quality at intake

*Tier:* Core

**Requirement.** Imports and forms flag invalid syntax, domains without mail exchangers, disposable domains and role addresses (info@, sales@), and an operator decides whether to keep flagged rows; purchased or rented lists are not accepted (see Honest boundaries).

**Acceptance.**
1. an import with each kind of flagged row reports them separately; keeping them records the operator's decision.

#### DELIV-007 — Sender evidence renewal without stopping live flows

*Tier:* Core

**Requirement.** The receipt evidence approval and hand-off require (the owner-confirmed observation of the SendGrid guarantee section, lasting 30 days, and invalidated by any provider, DNS, binding or credential change) is renewed before it lapses, and a lapse pauses sending visibly rather than silently.
- *Reminders:* 7 days and 1 day before the evidence expires, Home shows a renewal card and Mango emails every Owner and Admin. Seven days ahead it also sends the diagnostic message itself to the operator who last confirmed, so renewal is one Confirm click from that email. An invalidating change (a DNS record, the provider, the binding or the credential) raises the same card and email at once, naming what changed.
- *Automatic renewal:* with the HTTPS receipt connector installed, Mango re-runs the diagnostic itself from day 23 and renews on receiver-authenticated results, with no human step. Published DNS records alone never renew the evidence, because they show the records, not that the provider signs and delivers mail as them (the 15 October 2026 owner policy); DNS is still re-inspected at every approval and hand-off.
- *While it lapses:* a flow hand-off waits with the named reason `sender-evidence-lapsed` until the step's send-by deadline (FLOW-004, CAMP-010), then skips with `sender-evidence-deadline`; a scheduled campaign step waits the same way; approval names the lapse as a blocking check. Home shows the lapse with the number of messages waiting and the earliest deadline, and the renewal email repeats it.
- *Resuming:* once the evidence is renewed, waiting hand-offs resume in their original order within 5 minutes, each at most once (FLOW-010, SEND-001), and the enrollment history records the wait.
-

**Acceptance.**
1. with the clock advanced to day 23 after confirmation, Home shows the renewal card and the edge receives the reminder and diagnostic emails.
2. At day 31 a live welcome flow's next message waits with `sender-evidence-lapsed`, and Home counts it.
3. Confirming the diagnostic link hands the message off within 5 minutes, once.
4. A DKIM record change at the DNS edge mid-flow raises the card at once and holds the next message the same way, and a message whose send-by passes during the lapse is skipped with `sender-evidence-deadline`.
5. With the receipt connector fixture installed, renewal on day 23 needs no click.

#### DELIV-008 — Sending connection an owner makes in Settings

*Tier:* Core

**Requirement.** A store owner who has never opened a terminal connects their SendGrid or Resend account in a few minutes, and Mango wires the delivery events itself, so bounces and complaints are seen from the first send, as Mailchimp's are.
- *Connect:* in Settings → Sending an Owner (OPER-004: billing-bearing provider connections) chooses the provider and pastes an API key.
  - Mango reads the key's permissions and names any that are missing before anything else happens. For SendGrid (`GET /v3/scopes`): `mail.send`; domain authentication read and create (`whitelabel.*`); the event webhook settings and test scopes (`user.webhooks.event.*`); and email Activity read where the account has it (SEND-008). For Resend: a full-access key, which webhook and domain management need; a sending-only key is named as missing that permission.
  - The key is stored as a server secret: encrypted at rest under the installation's connection key (generated with the other runtime secrets at Configure or `rer deploy`, never handled by the owner), never sent to a browser, logged, shown in an error or written to an export (BASE-SECRET-001, DATA-001). Settings shows only the provider, the key's last four characters, who connected it and when. The private settings backup carries it encrypted, so a restore keeps the connection.
  - Mango starts using the connection on the next request, with no redeploy. No `MAIL_*` or `MARKETING_MAIL_*` deployment input, `.rer/hosted.env` edit, `rer deploy` or `--set-secret` is needed.
  - This holds on Managed, Assisted and Free alike. On Managed the connection carries newsletters, campaigns and flows while sign-in and confirmation mail stay on the Managed relay. On Free and Assisted, where sign-in mail also uses the owner's provider, the same connection carries sign-in and confirmation mail once made; before it exists, the owner reaches Settings in the session rer's deploy-time owner claim gives them (OPER-001), and inviting another operator names `sending-connection-missing`.
- *Mango creates the delivery webhook:* right after the key passes, Mango itself:
  - creates its own event webhook at the provider, at this deployment's canonical HTTPS origin. For SendGrid: `POST /v3/user/webhooks/event/settings` to `/webhooks/mail/sendgrid`, subscribed to delivered, bounce, dropped, deferred, spam report and unsubscribe (and group unsubscribe), named as Mango's. For Resend: `POST /webhooks` to `/webhooks/mail/resend`, subscribed to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained` and `email.failed`, plus Resend's suppression event where it offers one.
  - turns on signing (SendGrid's signed event webhook toggle for that webhook), reads back the verification public key (SendGrid) or stores the returned `signing_secret` and webhook ID (Resend), as the same server secret.
  - records the provider's ID for the webhook it created, and only ever reads, changes or deletes that one. A webhook the owner already has for another system is left exactly as it was, and a reconnect reuses Mango's own webhook rather than making a second.
  - if the account has no free webhook slot, Settings says so, names the limit, and offers the transparent forwarding route in `docs/install.md` (an existing signed receiver forwards the whole request), which the same signed-event check below then confirms.
- *Conservative default (SendGrid and Resend webhook security guidance; owner rule of 19 October 2026):*
  - *Disclosed first:* before any provider call that creates anything, Settings names the provider account, the webhook URL, the event list, that signing will be on, and that no other setting or webhook is touched. The Owner's Connect press is the authorization, recorded with operator, time, provider and the key's last four characters (OPER-007).
  - *Signed or nothing:* if signing cannot be turned on or its key cannot be read back, Mango deletes the webhook it just created, names the cause, and the webhook step stays failed. An unsigned delivery to `/webhooks/mail/*` is refused and stored nowhere. An event whose signed timestamp is more than 5 minutes from receipt is refused before SEND-005's replay check.
  - *Named as Mango's:* the webhook's friendly name is `Mango <deployment origin>` where the provider supports names. Mango identifies its own webhook only by the stored provider ID, never by name or URL.
  - *Least privilege:* Settings shows the exact restricted-key scope list for SendGrid. A key with broader scopes connects and is labeled "broader than Mango needs" with that list.
  - *Nothing else:* Mango changes no other account setting (tracking, suppression groups, IP pools, subusers or another webhook), and the daily read-back (*Watching the connection*) compares against this list.
- *Complete only once a signed event arrives:* the connection is complete when a signed event for a message Mango sent has been verified and stored under SEND-005. Mango triggers it by sending the DELIV-007 sender check to the connecting Owner's inbox, whose delivered event confirms the webhook end to end; the provider's test event alone shows reachability, not completion. Until then:
  - approval and flow activation name `delivery-events-missing` as a blocking check (CAMP-004, FLOW-008), so no installation sends blind
  - Settings shows the webhook step as waiting, with the time it was created and what has been received
  - an adapter that cannot deliver signed events at all (an SMTP relay under DELIV-001) is labeled as such and reports only hand-off and acceptance (SEND-006); it never passes as a complete SendGrid or Resend connection
- *Domain setup reads from the provider:* DELIV-002's records come from the connected account. If the account has no domain authentication for the From domain, Mango creates it through the provider's API (SendGrid `POST /v3/whitelabel/domains` with automated security; Resend `POST /domains`), shows the exact records to add, asks the provider to validate them, and rechecks until they pass.
- *Each step is visible:* Settings → Sending shows each step as passed, waiting or failed, with its fix: the key, each permission, domain authentication, DNS (MSG-002), the webhook, signing, the first signed event and the DELIV-007 sender check. Home shows a connection with a failed step, and the DELIV-003 dashboard and RESULT-006 report show `delivery events not connected` rather than zero bounces or complaints while the webhook step is not passed.
- *Watching the connection:* Mango reads its webhook back at every approval and at least daily, and treats a provider-rejected key (HTTP 401 or 403 at any call) as revoked. A revoked key, a webhook found deleted, disabled or unsigned, or 24 hours of accepted hand-offs with no signed event at all:
  - raises a Home alert and emails every Owner and Admin, naming the cause
  - blocks approval and activation with the cause named (`sending-key-revoked`, `delivery-webhook-missing` or `delivery-events-silent`)
  - holds flow hand-offs with that reason until the step's send-by deadline, then skips them with the reason, as DELIV-007 does for lapsed evidence; a definite provider rejection is retry-safe within the deadline under the SendGrid guarantee policy
- *Replacing or disconnecting:* replacing the key in Settings re-runs every step above and invalidates the DELIV-007 sender evidence as any credential change does. The SEND-001 and SEND-008 fences hold across the change: a recipient-step in `handoff-unknown` is never resent with the new credential and stays for operator review. Disconnecting deletes the stored key and Mango's own webhook at the provider, and blocks approval with `sending-connection-missing`. Every connect, replace and disconnect is in the activity log (OPER-007).
- *Developer route:* the deployment-input route (`MAIL_PROVIDER` with `MAIL_PROVIDER_API_KEY` and `MAIL_WEBHOOK_SECRET`, or `MARKETING_MAIL_*` on Managed, and the hand-built webhook in `docs/install.md`) stays for owners who manage configuration in their deployment. It is labeled the developer route, never offered first, read only while no Settings connection exists, and Settings shows which route is in use; every check above except Mango's webhook creation applies to it.
-

**Acceptance.**
1. a SendGrid edge and a Resend edge provide key permissions, mail send, domain authentication, event webhook settings and signed events.   - *Connect:* on a fresh Managed installation with no `MARKETING_MAIL_*` input, and on a fresh Free installation with no `MAIL_PROVIDER_API_KEY` or `MAIL_WEBHOOK_SECRET` input, an Owner connects the SendGrid edge by pasting a key in Settings, with no redeploy.
2. No route, page, log line or export contains the key afterwards.
3. On the Free installation, an invited operator's sign-in email then arrives through the edge.   - *Wiring:* the edge records one webhook Mango created at this deployment's URL with the listed events and signing on.
4. A webhook that existed on the edge account beforehand is unchanged, and reconnecting creates no second webhook. the Settings screen names the URL, events and signing before the edge receives any create call.
5. An edge that refuses to enable signing ends with no Mango webhook at the edge and the step failed.
6. An unsigned event and a signed event whose timestamp is 10 minutes old each change nothing.   - *Blocked until complete:* before the first signed event arrives, approval and flow activation name `delivery-events-missing`.
7. Delivering the sender check's signed delivered event passes the webhook step.   - *Events:* a hard-bounce event signed by the edge's key suppresses the address under CONT-006 before the next hand-off, and a delivered event shows **Delivered** on the campaign.   - *Key permissions:* a SendGrid key without the event webhook scopes, and a sending-only Resend key, are each named in Settings as missing that permission, and no webhook is created. a full-access SendGrid key connects and is labeled broader than needed, with the restricted scope list shown.   - *No free slot:* an edge account with every webhook slot in use shows the limit and the forwarding route, and nothing at the edge changes.   - *Revocation and deletion:* revoking the key at the edge, and separately deleting Mango's webhook there, each raise the Home alert and the email and block approval with the named cause.
8. Replacing the key leaves a `handoff-unknown` recipient-step unsent.   - *Resend:* the same connect, wiring, completion and bounce journey against the Resend edge stores the returned `signing_secret`.   - *Roles:* an Admin, Manager or Author calling the connect, replace and disconnect routes is refused with 403 and a named reason.

### Reporting and attribution

#### REPORT-001 — Overview dashboard

*Tier:* Core

**Requirement.** One page shows, for a chosen period against the previous one: attributed revenue in USD split by campaigns and flows, holdout-measured incremental revenue where a holdout exists (EXP-003, EXP-004), list growth by source, engagement (clicks, conversions), deliverability health, provider costs and top campaigns and flows. Forecasts are never shown as results (PROP-008).

**Acceptance.**
1. with a seeded month of sends, orders and holdout data, each figure on the page matches the underlying records and the incremental figure is labeled separately from attribution.

#### REPORT-002 — Campaign and flow performance tables

*Tier:* Core

**Requirement.** Sortable tables list recipients, delivered, clicks and unique clicks, click rate, unsubscribes, complaints, conversions, revenue and revenue per recipient for every campaign, flow and flow message, filterable by channel, topic and date, exportable as CSV; each campaign and flow message opens its per-link detail (RESULT-007). When an operator has turned open estimates on (RESULT-002), the tables add an open-rate column headed and exported as an estimate, which is never used for ranking a test winner or for attribution.

**Acceptance.**
1. the CSV export of the table equals the on-screen rows for the same filter; with open estimates on, the estimated open-rate column appears on screen and in the CSV labeled as an estimate, and is absent with them off.

#### REPORT-003 — Attribution for campaigns, flows and SMS

*Tier:* Core

**Requirement.** RESULT-003's policy extends to flows and SMS: one conversion metric (Placed Order by default, or a custom event), a click window per channel (default seven days for email and SMS), at most one attribution per order, refunds and cancellations subtracting, and automated clicks excluded (RESULT-005). The window and metric are shown beside every revenue figure and can be changed, which recalculates reports without changing stored events.

**Acceptance.**
1. an order following an SMS click and an earlier email click is attributed once, to the most recent qualifying click; changing the window to one day recalculates the report.

#### REPORT-004 — Customer and retention analytics

*Tier:* Core

**Requirement.** Reports show repeat-purchase rate, cohort retention by first-order month, median days between orders, customer value by acquisition source and form, and product affinity (products bought together and next product bought).

**Acceptance.**
1. on a seeded order history, the cohort table and repeat-purchase rate match an independent calculation.

#### REPORT-005 — List growth and consent sources

*Tier:* Core

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

#### REPORT-006 — Scheduled and custom reports

*Tier:* Core

**Requirement.** Operators save custom reports (a metric by dimensions over time) and schedule any report as a weekly or monthly email or Slack message to chosen operators; scheduled reports contain no contact identities.

**Acceptance.**
1. a weekly scheduled report is delivered once at its time through the mail edge with the same figures as the saved report.

#### REPORT-007 — Usage and cost transparency

*Tier:* Core

**Requirement.** Mango never bills or limits sending by contact count. Settings shows contacts by consent state, and RESULT-004's provider costs (email, SMS, AI, design) by campaign, flow and day with a projected month in USD, so an owner sees exactly what each send cost on their own provider accounts.

**Acceptance.**
1. `tests/campaign-results/costs.journeys.ts` for campaign and day totals; a flow's costs appear under that flow.

### Integrations

#### INT-001 — Shopify

*Tier:* Core

**Requirement.** A Shopify connection, made by the owner through the Mango for Shopify app with no developer step (INT-015, which states the install, scopes, wiring, first sync, uninstall and privacy webhooks), syncs customers with their Shopify email and SMS marketing consent (each change recorded with Shopify's marketing state, opt-in level and consent time; a checkout or Shopify-form opt-in becomes subscribed as incumbent-held evidence (CONT-024) under the opt-in mode CONT-025 sets for the store, by default without a Mango confirmation email, after the owner attests the checkout disclosure when connecting; Mango's opt-outs always win under CONT-004 and are written back to Shopify), products, variants, collections and inventory, orders, refunds and fulfillments, checkouts and carts, and web-pixel browsing events; it creates unique discount codes (BUILD-007) and installs the form and tracking app embed. A build round marks it done only once INT-015 is done: a connection that needs the developer route is not this clause's connection.

**Acceptance.**
1. `tests/shopify/connection.spec.ts` (native sync, signed carts, signed pixel), run on a connection made through INT-015's install journey, plus a consent write-back journey: a Mango unsubscribe appears as unsubscribed in the Shopify edge's customer record; and the CONT-025 Shopify opt-in journey.

#### INT-002 — WooCommerce

*Tier:* Core

**Requirement.** A WooCommerce connection (REST API keys plus signed webhooks, and a WordPress plugin for onsite tracking and forms) syncs customers, products, orders, refunds and abandoned checkouts.

**Acceptance.**
1. a WooCommerce edge journey syncs a seeded store, replays an order webhook once, and triggers an abandoned-checkout flow from a plugin event.

#### INT-003 — BigCommerce

*Tier:* Core

**Requirement.** A BigCommerce connection syncs customers, catalog, orders, refunds and abandoned carts through its API and webhooks.

**Acceptance.**
1. a BigCommerce edge journey syncs a seeded store and enrolls a contact from an abandoned-cart webhook.

#### INT-004 — Stripe

*Tier:* Core

**Requirement.** A Stripe connection (restricted key or Stripe Connect) records customers, successful payments, Checkout sessions, subscriptions (started, renewed, past due, canceled) and refunds as events, for businesses that sell through Stripe Checkout or Payment Links, and is the payment rail for paid newsletters (PUB-002). Nectar's subscription events arrive the same way.

**Acceptance.**
1. signed Stripe webhook fixtures for a subscription start and cancellation create the two events once each and trigger a renewal-reminder flow.

#### INT-005 — Square

*Tier:* Core

**Requirement.** A Square connection records customers, in-person and online orders and refunds so retail purchases feed segments and post-purchase flows.

**Acceptance.**
1. a Square edge journey syncs a seeded location's orders into contact timelines.

#### INT-006 — Stall and Orbit

*Tier:* Core

**Requirement.** Mango connects to the sibling Stall storefront (customers, catalog, carts, checkouts, orders, refunds, discount codes) through Stall's published events, and to the sibling Orbit CRM through INT-011, without sharing either product's database.

**Acceptance.**
1. a journey against Stall's event edge enrolls a Started Checkout contact into the abandoned-checkout flow and stops it when Stall reports the order.

#### INT-007 — Events and profiles API

*Tier:* Core

**Requirement.** A versioned public REST API with scoped API keys, per-key rate limits, idempotency keys and an OpenAPI description lets any system identify a contact, set properties, track events, read segment membership and submit a subscription *with consent evidence* (never without it), plus a JavaScript client for websites. Every write is attributed to its key.

**Acceptance.**
1. an API journey tracks a custom event with an idempotency key twice (one event stored), refuses a subscribe call without evidence with a named error, and returns 429 past the key's limit.

#### INT-008 — Outbound webhooks

*Tier:* Core

**Requirement.** Owners subscribe HTTPS endpoints to Mango events (subscribed, unsubscribed, confirmed, message sent, clicked, converted, flow entered and exited, form submitted), signed with an HMAC secret, retried with backoff for 24 hours, with a delivery log.

**Acceptance.**
1. an endpoint that fails twice then succeeds receives each event once with a valid signature, and the log shows the attempts.

#### INT-009 — Zapier and Crank

*Tier:* Core

**Requirement.** A Zapier app and a Crank connector expose Mango triggers (new subscriber, unsubscribe, form submitted, event) and actions (add or update contact, track event, add tag, subscribe with evidence) over INT-007 and INT-008.

**Acceptance.**
1. a Zapier platform test run of each trigger and action succeeds against a test installation.

#### INT-010 — Segment

*Tier:* Core

**Requirement.** Mango is a Segment destination (identify and track calls become contacts, properties and events) and source (Mango events into the owner's Segment workspace).

**Acceptance.**
1. Segment-format identify and track payloads at the edge create one contact and one event, and Mango events are delivered to a test Segment source.

#### INT-011 — CRM sync

*Tier:* Core

**Requirement.** Two-way property sync with HubSpot, Salesforce and the sibling Orbit: contact fields map both ways with a chosen winner per field; Mango's consent and suppression are authoritative and written to the CRM's marketing-status fields; flows can create a CRM task or note.

**Acceptance.**
1. an edge journey changes a mapped field in the CRM and sees it in Mango, unsubscribes in Mango and sees the CRM marked opted out, and a flow creates one CRM task.

#### INT-012 — Ad audiences

*Tier:* Core

**Requirement.** Segments sync daily (and on change) to Meta Custom Audiences, Google Customer Match and TikTok audiences as hashed identifiers through the owner's ad accounts, excluding anyone who opted out of sale or sharing (CONT-021) or lacks the consent the ad platform's terms require; removal from the segment removes them from the audience.

**Acceptance.**
1. an edge journey syncs a segment, then removes a contact who made a do-not-share request, and the next sync deletes them from the audience.

#### INT-013 — Web analytics tagging

*Tier:* Core

**Requirement.** Links get UTM parameters by campaign, flow and message (operator-editable defaults) so Google Analytics 4 and the sibling Vane attribute sessions, and Vane goal events can arrive as Mango events through INT-007.

**Acceptance.**
1. a sent message's links carry the configured UTM values, and a Vane goal fixture creates one event on the contact.

#### INT-014 — Reviews and loyalty apps

*Tier:* Core

**Requirement.** Events from Judge.me, Yotpo, Okendo and Smile.io (review submitted, points earned, tier changed) arrive through adapters on INT-007 and drive review-request and loyalty flows; Mango does not collect reviews itself.

**Acceptance.**
1. a review-submitted fixture exits the contact from the review-request flow as converted.

#### INT-015 — Shopify connection a merchant installs

*Tier:* Core

**Requirement.** A store owner who has never opened a terminal connects Shopify in a few minutes, as Mailchimp for Shopify and Klaviyo do.
- *The route:* Run Edit Run publishes one public Shopify app, **Mango for Shopify**, listed on the Shopify App Store and free to install (REPORT-007). Every Mango installation, on every tier, uses that app. Run Edit Run runs the **Shopify connector**: the app's fixed redirect, webhook and app-proxy origin, which routes each shop's traffic to the one installation it was connected from (trust, below).
- *Install:* in Settings → Integrations an Owner or Admin (OPER-004) chooses **Connect Shopify** and enters their `myshopify.com` domain, or starts from the App Store listing and is asked for their Mango address.
  - Mango sends them to Shopify's permission screen with a single-use, signed state that names this installation and expires in 10 minutes.
  - They approve once and return to Mango connected.
  - No Shopify developer account, Shopify CLI, `shopify.app.toml`, GraphQL call, deployment variable, secret or redeploy is needed. The `COMMERCE_*` inputs belong to the developer route below and are not read for a connector connection.
- *Scopes:* the install asks for every scope the target clauses use, and Settings lists each one as granted or missing:
  - the read scopes today's adapter checks (`read_customers`, `read_products`, `read_inventory`, `read_locations`, `read_orders`, `read_all_orders`, `read_returns`, `read_pixels`, `read_customer_events`)
  - `write_pixels`, to activate the pixel
  - `write_customers`, for consent write-back (INT-001) through Shopify's email and SMS marketing-consent updates (CONT-025)
  - `write_discounts` and `read_discounts`, for unique codes (BUILD-007)
  - `read_themes`, to verify the theme app embed
- *Approvals that Run Edit Run obtains:* Shopify's approval of protected customer data (customer name, email, phone and address) and of `read_all_orders` is granted to the public app at App Store review, once, by Run Edit Run. It is never left to the owner. Settings names any protected field Shopify still withholds for a store, and the clauses that need it show as unavailable (STORE-006), never empty.
- *Mango does the wiring:* right after approval, Mango itself:
  - creates every shop-scoped webhook subscription it uses with `webhookSubscriptionCreate`: the topics INT-001 syncs (customers, products, inventory, orders, refunds, fulfillments, checkouts and carts), plus `app/uninstalled` and `app/scopes_update`
  - activates the web pixel with `webPixelCreate` and this installation's channel settings (CONT-018)
  - offers the theme app embed for forms and tracking (FORM-002) as one **Turn on in theme editor** button, which opens Shopify's theme editor with the embed selected so one toggle and Save turn it on, and then reads the theme to confirm it is on
  - runs the installation check today's adapter runs (`health.ts`: shop, installation, scopes, pixel settings and subscriptions), and repeats it on every sync
  - leads the owner through the CONT-024 attestation for the store's checkout opt-ins (CONT-025)
- *Each step is visible:* Settings → Shopify shows each step as passed, waiting or failed: approval, each scope, protected data, each subscription, pixel, theme embed, attestation and first sync. A failed or missing step names its cause and offers its fix: re-approve the missing scope on Shopify's screen, retry the subscription, open the theme editor. Home shows a connection with a failed step.
- *First sync:* connecting starts the full sync through Shopify's bulk operations: customers with their marketing consent, all orders (as `read_all_orders` allows), refunds and fulfillments, products, variants, collections and inventory, and abandoned checkouts from the last 30 days.
  - Settings and Home show progress per source type and an estimated finish.
  - At the SCALE-001 size (250,000 customers and a year of orders), it completes within 2 hours.
  - It is resumable from a saved cursor after an interruption, with no duplicate (STORE-002).
  - Until a source type's first sync completes, it counts as stale under STORE-005: segments, flows and campaigns that read it show it as syncing and cannot be approved or activated, and nothing resolves to a partial audience.
- *Webhook and app-proxy trust:* a shared app secret alone does not separate shops, because Shopify's webhook signature does not cover the shop and topic headers. So three checks apply together:
  - *Per-installation webhook address:* each subscription Mango creates delivers to `https://<connector>/shopify/w/<routing token>`. The token is 32 random bytes issued for one shop and one installation at connection, compared in constant time. Only that shop's own Admin token, held by that installation, registered it.
  - *Signature and shop check:* the connector verifies Shopify's HMAC with the app secret on every delivery. It routes app-level deliveries (the mandatory privacy topics) only by the `shop_domain` and `shop_id` inside the signed body. It routes app-proxy requests only by the signed `shop` query parameter, and passes on Shopify's signed `logged_in_customer_id` (CONT-018).
  - *Forwarding and read-back:* the connector forwards each verified delivery to the installation within 5 seconds, signed with that installation's own forwarding key (HMAC-SHA256 over the body, shop, topic, Shopify webhook ID and time). The installation refuses anything unsigned, stale or replayed (SEND-005). As today, customer, product and order notifications are re-read through the Admin API with the shop's own token before they change a source record, so a delivered body is never authoritative on its own.
- *What the connector holds:* the app's client secret, and per connection only the shop domain, shop ID, installation origin, routing token and forwarding key.
  - The shop's Admin access token comes from the OAuth code exchange (and any refresh Shopify requires) at the connector. It is handed to the installation over TLS in a response bound to the signed state, and the connector keeps no copy. The installation stores it as a server secret, never sent to a browser, logged or exported.
  - Admin API calls go from the installation straight to Shopify.
  - Forwarded bodies are never stored, logged or inspected beyond routing. The connector keeps only delivery counts and failures per connection, which the installation shows.
  - It has no telemetry, license check or kill switch. A connector outage pauses forwarding. Shopify's own webhook retries (up to eight attempts within four hours, after which Shopify may remove the subscription) and the next scheduled sync's reconciliation recover what was missed (STORE-004, AGENT-004). The installation check (`health.ts`) re-creates any Mango subscription Shopify removed and names it on Settings → Shopify.
  - It is a declared external (`seed.json → externals → shopify-connector`, BASE-DATA-004). This is a named amendment of BASE-DATA-005, as Managed mail is, and of the `extensions/mango-pixel/INSTALL.md` rule that a shared multi-shop app is unsupported (Interpretations). It is built to the conservative default below (*Conservative default*), with no further owner confirmation.
- *Conservative default (Shopify public-app requirements; owner rule of 19 October 2026):*
  - *Opt-in per installation:* the connector carries nothing for an installation until an Owner or Admin chooses Connect Shopify. That choice, with the operator, time, shop domain and granted scopes, is the authorizing record in the activity log (OPER-007). Disconnecting or an `app/uninstalled` delivery deletes the connection's routing token, forwarding key and delivery counts at the connector within 60 seconds.
  - *OAuth as Shopify requires:* the callback is accepted only when the `shop` matches `^[a-z0-9][a-z0-9-]*\.myshopify\.com$`, the query `hmac` verifies with the app secret in constant time, and the `state` is the unexpired single-use one this installation issued. Anything else completes no exchange and names the reason.
  - *Fail closed:* a delivery with a bad HMAC is answered 401. A delivery whose routing token, or whose signed-body shop, matches no live connection is answered with an error status and forwarded nowhere. The connector has no default installation. It answers a mandatory compliance topic 200 only after the installation has acknowledged the forwarded request, so Shopify retries until it is recorded.
  - *Scopes:* the install asks only for the scopes listed above. A scope a target clause needs but the store has not granted shows as missing and is never assumed.
  - *Protected customer data:* the installation keeps protected fields encrypted at rest under its connection key and readable only by roles that may see contact data (OPER-004). The connector never receives them except inside a forwarded body it does not store.
  - *Declared:* `seed.json → externals → shopify-connector` names exactly what the connector holds and sees (shop domain, shop ID, installation origin, routing token, forwarding key, delivery counts, forwarded bodies in transit) with the BASE-DATA-004 privacy, cost and secret boundaries.
- *Uninstall:* an `app/uninstalled` delivery, or a token Shopify rejects as revoked, marks the connection disconnected within 60 seconds. Then:
  - Home and Settings show the store as disconnected, with the time.
  - The stored token is deleted, and the connector discards that connection's routing.
  - Store-dependent approvals, activations and audiences are blocked under STORE-005 and STORE-006, and live flows triggered by store events stop enrolling (FLOW-002).
  - The data already synced is kept, and reinstalling resumes from the saved cursors.
- *Shopify's mandatory privacy webhooks:*
  - `customers/data_request` creates a CONT-021 access request for that customer, shown to Owners and Admins and completed within Shopify's 30 days.
  - `customers/redact` erases that customer's contact under CONT-013, keeping only the surviving opt-out record that clause allows. A contact who also holds Mango-captured evidence or other sources keeps only those.
  - `shop/redact` (48 hours after uninstall) removes every source record from that connection and the Shopify-only data of its customers under the same rule.
  - Each is recorded in the activity log (OPER-007) and answered to Shopify within its deadline.
- *Developer route:* an owner who does not want the connector in the path can still connect with their own single-shop custom app as `extensions/mango-pixel/INSTALL.md` describes. It is labeled the developer route, it is never offered as the first step, and every check above except the connector's applies to it.
-

**Acceptance.**
1. a Shopify edge provides OAuth, the Admin API, bulk operations, webhooks, app proxy and a theme.   - *Install:* an Owner on a fresh installation with no `COMMERCE_*` input chooses Connect Shopify, enters the edge's shop domain, approves the edge's OAuth screen, and returns connected, with no deployment variable set and no redeploy.   - *Wiring:* the edge records the webhook subscriptions and the activated pixel that Mango created.
2. The granted scopes include `write_discounts` and `write_customers`.
3. Settings shows each step as passed, and turning the edge theme's embed on turns the theme step to passed.
4. Deleting a Mango subscription at the edge is re-created by the next installation check and shown on Settings → Shopify.   - *First sync:* a seeded edge store of 250,000 customers and a year of orders syncs with progress and an estimated finish shown, survives one forced restart, and completes within 2 hours with no duplicate.
5. Before it completes, a purchase segment shows as syncing and cannot be approved.   - *Working on day one:* an edge pixel cart event enrolls an identified contact in the abandoned-checkout flow.
6. A flow message's unique code is created at the edge (BUILD-007).
7. A Mango unsubscribe is written back to the edge customer as unsubscribed.   - *Trust:* a webhook to another installation's routing token, a delivery with a bad HMAC, an app-level delivery whose signed body names another shop, and a forwarded delivery with a bad forwarding signature each change nothing.
8. A captured connector response leaves no token at the connector. An OAuth callback with a bad `hmac`, a reused or expired `state`, or a non-`myshopify.com` shop completes no exchange. A compliance delivery with a bad HMAC is answered 401. A delivery for a disconnected shop is answered with an error and reaches no installation. After a disconnect, the connector holds no routing token, forwarding key or counts for that shop.   - *Uninstall:* an `app/uninstalled` delivery disconnects the store on Home, and a store-dependent campaign is then blocked at approval while its synced data stays.   - *Privacy:* a `customers/redact` delivery erases that customer under CONT-013, and a `customers/data_request` delivery creates the access request.

### Migration from incumbents

#### MOVE-001 — From Mailchimp

*Tier:* Core

**Requirement.** An owner moves in a Mailchimp audience export (subscribed, unsubscribed, non-subscribed and cleaned files), the full account export ZIP (audiences, sent campaigns as history, templates and reports, including `granular_activity`) or, with a Mailchimp API key, a live pull. Merge fields become properties, tags become tags and groups become topics. Subscribed rows become subscribed with incumbent-held evidence (CONT-024) from their `OPTIN_TIME`, `CONFIRM_TIME` or `LAST_CHANGED` under the owner's once-per-audience attestation, and no status is ever upgraded. The move-in runs at the scale MOVE-012 commits to (SCALE-001), whichever route is used. The move-in also carries what a Mailchimp account uses every week: saved segments (MOVE-007), classic automations and Customer Journeys (MOVE-008), per-contact open and click history (MOVE-009, MOVE-015), several audiences (MOVE-010) and templates converted into the email grammar (MOVE-011). Each appears in the reconciliation report (MOVE-006). An API-key move-in then keeps Mango and Mailchimp in step on consent, both ways, until the owner marks the cutover complete (MOVE-013).

**Acceptance.**
1. `tests/move-in/archive.journeys.ts` runs on synthetic exports, extended with checked-in Mailchimp-format fixtures for a saved segment with a campaign-activity condition, a classic automation, a `granular_activity` file, two overlapping audiences with conflicting statuses and a template with merge tags and a `<style>` block.
2. Each fixture shows its expected lines in the reconciliation report (MOVE-007 to MOVE-011).
3. The CONT-024 subscribed-file fixture and the MOVE-012 full-scale export run through the same journey.
4. The same journey also runs on one real, owner-supplied Mailchimp export with its reconciliation report.

#### MOVE-002 — From Klaviyo

*Tier:* Core

**Requirement.** With a Klaviyo private API key or CSV exports, Mango imports profiles with email and SMS consent and their timestamps (subscribed profiles as incumbent-held evidence, CONT-024), custom properties, list and segment definitions (recreated as segments for review), suppressions, templates (as templates) and historical order and engagement events, and recreates flows as draft flows with every unsupported step named. Until cutover, the parallel-run sync keeps consent in step both ways where this incumbent's API allows it, with any gap named (MOVE-013).

**Acceptance.**
1. an edge journey against a Klaviyo API fixture imports profiles with consent, a segment definition and an abandoned-cart flow as a draft with its unsupported steps listed.

#### MOVE-003 — From ActiveCampaign

*Tier:* Core

**Requirement.** Contacts, lists (as topics), tags, custom fields, unsubscribes and bounces import by CSV or API; automations are imported as a readable outline and recreated as draft flows. Until cutover, the parallel-run sync keeps consent in step both ways where this incumbent's API allows it, with any gap named (MOVE-013).

**Acceptance.**
1. an API fixture import keeps an unsubscribed contact unsubscribed and produces a draft flow for a seeded automation.

#### MOVE-004 — From Kit (ConvertKit)

*Tier:* Core

**Requirement.** Subscribers with their states (active, canceled, bounced, complained), tags, custom fields and sequences import by CSV or API; sequences become draft sequences (FLOW-015). Until cutover, the parallel-run sync keeps consent in step both ways where this incumbent's API allows it, with any gap named (MOVE-013).

**Acceptance.**
1. the move-in journey's Kit-format synthetic files (`docs/moving-in.md`) keep every restrictive state, plus a sequence fixture becomes a draft sequence.

#### MOVE-005 — From beehiiv, Omnisend and Customer.io

*Tier:* Core

**Requirement.** Subscriber and profile exports with their statuses, tiers or attributes and consent evidence import by CSV or API, with the same restrictive mapping; active subscribers carry incumbent-held evidence (CONT-024), as they do from ActiveCampaign (MOVE-003) and Kit (MOVE-004). Until cutover, the parallel-run sync keeps consent in step both ways where this incumbent's API allows it, with any gap named (MOVE-013).

**Acceptance.**
1. one synthetic export per product imports with every unsubscribed or suppressed row restricted.

#### MOVE-006 — Reconciliation and cutover

*Tier:* Core

**Requirement.** Every move-in ends with a reconciliation report (rows read, created, updated, rejected with reasons, consent mapped with a count per evidence kind (Mango-captured, incumbent-held with each time source, `time-unknown`, and non-subscribed for want of an attestation; CONT-024) and the attestation each relies on, suppressions carried, engagement rows imported and dropped (MOVE-009), audiences and their overlaps (MOVE-010), segments recreated with each unsupported condition (MOVE-007), automations and journeys mapped with each unmapped step (MOVE-008) and each template's conversion findings (MOVE-011)) and a cutover checklist: DNS records for the sending domain, forms replaced on the site, flows recreated and reviewed, no template or live message still loading images from an incumbent host (MOVE-014), a parallel-run week with the two-way sync on (MOVE-013) or, for an export-only move-in, a re-import before each Mango send, the old platform's sending turned off, and **Mark cutover complete**, which ends the sync. Nothing imported sends until it is approved or activated.

**Acceptance.**
1. after a move-in, the report's counts reconcile to the files and contact table, and no campaign or flow is scheduled or live.

#### MOVE-007 — Mailchimp saved segments

*Tier:* Core

**Requirement.** With an API key, every saved segment of each moved audience is read from the Mailchimp Marketing API with its match type and conditions. It is recreated as a draft segment for review, which no campaign uses until an operator saves it. Conditions map as follows: merge fields to properties; tags to tags; groups to topics; signup date and location to SEG-001 conditions; contact rating and engagement (often, sometimes, rarely) to the SEG-006 engagement level; and ecommerce conditions to SEG-001 event conditions over the imported store data. Campaign-activity conditions (was sent, opened, clicked or did not click a named campaign, or any of the last 5 campaigns) map to SEG-006 conditions over the campaign history MOVE-009 imports. Automation-activity conditions (started or completed a classic automation) map to SEG-006 flow conditions over the draft flow MOVE-008 creates and the imported history. Every condition Mango cannot express is named in the segment and in the report, and the recreated segment's count is shown beside the count Mailchimp reported. An export-only move-in carries no segment definitions: it brings static segments across as tags and says that saved segments need the API pull.

**Acceptance.**
1. a Mailchimp API fixture has two saved segments.
2. One, "clicked campaign X and engagement is often", is recreated as a draft segment whose membership over the imported history equals the fixture's expected members.
3. The other has an unsupported condition, which is named in the segment and the report.

#### MOVE-008 — Mailchimp automations and Customer Journeys

*Tier:* Core

**Requirement.** Classic automations, which the Mailchimp API reads with their trigger, delays and emails, are recreated as draft flows (FLOW-001). Each email's content is converted under MOVE-011, and every unmapped trigger, delay or setting is named. Customer Journeys have no export or read API, so Mango builds a journey inventory from two sources. The first is what Mailchimp does expose: journey emails' reports and content, in the API and the account export, name their journey. The second is the owner, who confirms or adds each live journey by name and starting point from a checklist that mirrors Mailchimp's starting points. Each starting point is mapped to the matching FLOW-012 library flow (for example abandoned cart to the abandoned-cart flow, joins audience to the welcome series, and date-based to birthday or anniversary). That flow is installed as a draft with the journey's readable email content carried over, and every step Mango could not read or map (rules, branches, actions) is named for the owner to rebuild. Each recreated draft carries AUD-009's setting for moved-in flows, so campaign sends do not block it, as they did not in Mailchimp. Nothing activates until FLOW-008.

**Acceptance.**
1. a Mailchimp API fixture with one classic two-email welcome automation yields a draft flow with both emails' converted content and named delays.
2. A journey fixture whose two emails name an abandoned-cart journey yields an abandoned-cart draft flow with those emails, and a report line names its unreadable branch.
3. Neither flow is live.

#### MOVE-009 — Incumbent engagement history

*Tier:* Core

**Requirement.** The Mailchimp account export's `granular_activity` files import as historical click and open facts on the matching contacts at their original times. Each fact is linked to the imported campaign history (sent campaigns and their links) and labeled `imported` with its source. Imported clicks count as engagement for dormancy (CONT-012, AUD-008). Imported opens are kept as estimates (RESULT-002) and count for none of them. Imported facts never become Mango send facts, results or attribution (Archive move-in policy) and never change consent. Activity rows for addresses that are not in the move-in are counted and dropped. MOVE-015 carries API-key activity, the other incumbents' history and the remaining engagement uses.

**Acceptance.**
1. a `granular_activity` fixture with clicks and opens for three contacts and one unknown address imports one click or open fact per row on the right contacts at their original times.
2. The reconciliation report counts imported and dropped rows, the contacts' timelines show the facts as imported, and no campaign result figure changes.

#### MOVE-010 — Several audiences

*Tier:* Core

**Requirement.** A move-in with more than one Mailchimp audience, or more than one Klaviyo or ActiveCampaign list, asks the owner what each audience becomes. By default it becomes a topic in this installation; alternatively it belongs to a separate brand that moves into its own installation (Honest boundaries: one brand per installation). An address present in two audiences becomes one contact (CONT-001), with its status per topic taken from each audience. Within a topic and channel the most restrictive status wins, in CONT-011's order. A cleaned or complained address is suppressed for the channel across every topic (CONT-006). Conflicting merge-field values are listed, and the owner chooses which audience wins for each field.

**Acceptance.**
1. a fixture has two audiences that share addresses: one address subscribed in A and unsubscribed in B, one cleaned in B, and one with a different first name in each.
2. Each address becomes one contact.
3. The first is subscribed to topic A and unsubscribed from topic B, the cleaned one is suppressed on email, and the first-name conflict is listed.
4. The report counts each audience and their overlap.

#### MOVE-011 — Incumbent template conversion

*Tier:* Core

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

#### MOVE-012 — Move-in at the buyer's scale

*Tier:* Core

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

#### MOVE-013 — Two-way sync during the parallel run

*Tier:* Core

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

#### MOVE-014 — Incumbent images brought home

*Tier:* Core

**Requirement.** Images that imported templates, campaign bodies and flow messages load from an incumbent's hosts (for Mailchimp, `mcusercontent.com` and `gallery.mailchimp.com`; for every other incumbent, the image hosts its move-in fixtures name) are re-hosted as campaign images (CAMP-012) before the incumbent account can close.
- *Source:* from an account export, the gallery files it already carries, matched to each image address by file name and content; from an API move-in, or for an image the export lacks, one fetch per image under MSG-006's network inspection, within CAMP-012's type, byte and pixel limits.
- *Rewrite:* each matching `img src` is rewritten to the deployment's `/media/<sha256>` address, with its alt text, size and link unchanged, and the conversion report lists each image re-hosted or failed with its reason. A failed image stays on its incumbent host and is listed for the operator to upload a replacement.
- *Cutover:* the reconciliation report counts images re-hosted, failed and still on an incumbent host, and the cutover checklist (MOVE-006) confirms that no template, draft, scheduled campaign or live flow message still uses an incumbent image host before **Mark cutover complete**, naming each one that does.
-

**Acceptance.**
1. a Mailchimp account-export fixture with three gallery images used by a template and a campaign moves in, and every image source is rewritten to `/media/`, serving the same bytes.
2. An API-fixture template's image is fetched from the edge and re-hosted the same way.
3. An image the edge answers 404 for is listed as failed and blocks the cutover checklist item until replaced, and the checklist names the template using it.

#### MOVE-015 — Incumbent engagement history beyond the Mailchimp export

*Tier:* Core

**Requirement.** Each sent campaign's email activity imports as historical click and open facts on the matching contacts at their original times when a Mailchimp move-in uses an API key, under every MOVE-009 rule. Imported clicks, from every move-in, count as engagement for sunsetting (CONT-020), campaign-activity segments (SEG-006), engagement scores (SEG-005) and send-time optimization (EXP-006); imported opens count for none of them. Klaviyo, ActiveCampaign, Kit and the other incumbents bring their engagement history the same way where their exports or APIs carry it (MOVE-002 to MOVE-005).

**Acceptance.**
1. a Mailchimp API fixture at the network edge with email activity for three contacts across two sent campaigns and one unknown address imports one click or open fact per activity on the right contacts at their original times, with MOVE-009's reconciliation, timeline and no-result-change checks; each other incumbent's fixture, where its export or API carries engagement, does the same; and the imported-history acceptance of CONT-020, SEG-005, SEG-006 and EXP-006 passes.
2. Provider acceptance repeats the API-key import with a real Mailchimp account.

### Mobile

#### MOBILE-001 — Responsive operator app

*Tier:* Core

**Requirement.** Every operator page works at 390 pixels wide with no horizontal scroll: dashboards, reports, contact lookup, review and approval of campaigns, flow status and pause, forms and settings; the flow canvas is readable with node details.

**Acceptance.**
1. the representative-pages journey (`tests/newsletter-ui/representative-pages.journeys.ts`) extended to every operator page at 390 pixels with axe and overflow checks.

#### MOBILE-002 — Native iOS and Android app

*Tier:* Core

**Requirement.** A native app for operators shows the overview dashboard and campaign and flow reports; opens any revision awaiting approval with its full previews and checks and lets a permitted role approve it; pauses a flow or presses Stop all sending (FLOW-011); answers SMS conversations (SMS-004); and receives push alerts for approval requests, flow errors, deliverability blocks and provider outages. It uses the same server authority and roles (OPER-004) and never sends anything offline.

**Acceptance.**
1. an app test against a test installation signs in, approves a revision with the same checks the web app shows, receives an outage alert from the push edge, and a role without approval rights sees no approve control and is refused by the server.

### Publishing and monetization

#### PUB-001 — Web archive

*Tier:* Core

**Requirement.** Sent newsletters can be published as public web pages with an archive index, RSS feed and search-engine metadata; personalization is replaced by neutral text and unsubscribe and tracking links are removed.

**Acceptance.**
1. publishing a sent campaign creates a page and feed item with no recipient token or personal value.

#### PUB-002 — Paid newsletters

*Tier:* Core

**Requirement.** Creators offer paid tiers through Stripe Checkout and Stripe Billing on their own Stripe account (or Nectar), with US sales tax by Stripe Tax; paying subscribers join a paid topic, paid-only content is sent only to them, and cancellation or failed payment moves them back to the free topic. Mango never holds funds.

**Acceptance.**
1. a Stripe test-mode checkout journey subscribes a reader to the paid topic, a paid-only campaign reaches them and not free readers, and a cancellation webhook moves them back.

#### PUB-003 — Recommendations

*Tier:* Core

**Requirement.** At signup a creator can recommend partner newsletters they choose (reciprocal or not); a subscriber who ticks one is passed to that partner's own signup with explicit consent, and both sides see subscribers gained.

**Acceptance.**
1. ticking a partner at signup posts to the partner's signup edge with the consent text and records one recommendation.

#### PUB-004 — Direct sponsorships

*Tier:* Core

**Requirement.** Creators sell sponsor placements: a sponsor block in a chosen campaign or issue, a booking calendar of available slots, tracked sponsor clicks and a sponsor report to share.

**Acceptance.**
1. a booked slot inserts the sponsor block into that issue's draft, and the sponsor report lists the issue's tracked clicks.

#### PUB-005 — Paid signup page and payer consent

*Tier:* Core

**Requirement.** A hosted paid-signup page shows the paid tier's price, Stripe Tax notice and consent wording, starts Stripe Checkout, and Checkout returns the reader to a Mango page that says what happens next. A payer without confirmed email consent gets CONT-003 evidence labelled `paid-checkout` and one CONT-009 confirmation, and joins the paid topic only after confirming; unsubscribed and suppressed addresses follow CONT-027.

**Acceptance.**
1. a first-time payer completes checkout from the page, appears as “paid, consent missing”, receives one confirmation at the mail edge and, after confirming, the next paid-only send; an unsubscribed payer stays unsubscribed until their own confirmation.

## Push further

### Agents

#### AGENT-001 — Retention-gap finder

*Tier:* Core

**Requirement.** On a schedule the owner sets (default weekly), an agent reads orders, events, segments, live flows and their results and identifies retention gaps with numbers: for example *412 first-time buyers from the last 90 days have not reordered while their predicted reorder date has passed, and no flow reaches them*; or *the browse-abandonment flow is off while 3,100 identified visitors viewed products last month*. Each finding names its data, period, size and the revenue at stake estimated from this deployment's own history.

**Acceptance.**
1. on a seeded store history with a missing post-purchase flow and a lapsed cohort, the agent's findings name both with counts that match the data, and cite the queries behind them.

#### AGENT-002 — Journey proposal with holdout and stop rules

*Tier:* Core

**Requirement.** For a finding the operator chooses, the agent drafts a flow (FLOW-001): trigger, audience filters, messages in the brand kit's style grounded in the catalog (AGENT-007), exits, a randomized holdout share and size from a power calculation (EXP-005), the outcome metric (for example repeat purchase within 60 days), the measurement period and stop rules (for example *stop if unsubscribe rate exceeds 1 per cent or complaint rate exceeds 0.1 per cent, or if after the measurement period the lift interval excludes a positive effect*). The draft goes through ordinary review and activation (FLOW-008) by a person.

**Acceptance.**
1. the agent's proposal for the seeded lapsed cohort arrives as a draft flow with a holdout, metric, period and stop rules; it cannot be activated by the agent, and an operator activates it through the normal checks.

#### AGENT-003 — Outcome judge

*Tier:* Core

**Requirement.** While an agent-proposed or any holdout-carrying flow runs, an agent tracks the declared outcome for messaged and held-out groups, reports lift with its interval in plain language at the declared checkpoints, applies the declared stop rules by pausing the flow (pausing is always allowed; resuming or widening needs a person), and recommends keeping, changing or retiring the flow on measured repeat purchases or revenue, never on opens.

**Acceptance.**
1. with seeded outcomes where the holdout converts as well as the messaged group, the agent reports no supported lift at the checkpoint and recommends retirement; with a breached complaint threshold it pauses the flow and notifies operators.

#### AGENT-004 — Lifecycle failure diagnosis and repair

*Tier:* Core

**Requirement.** An agent watches for disconnected or lagging integrations, webhook gaps (source sequence or timestamp holes), stuck waits, rising skip reasons, failing coupon creation and provider errors; it names the cause, the affected contacts and flows, and prepares a repair plan (resync a source window, replay missed events, re-enroll eligible contacts) that is deduplicated against what was already sent and respects relevance windows (FLOW-010). A person approves any backfill or replay; prior deliveries and opt-outs stay authoritative.

**Acceptance.**
1. with a simulated six-hour Shopify webhook outage, the agent reports the gap, lists the 37 missed checkouts, and its approved replay enrolls only those still relevant and not already messaged, sending nothing twice.

#### AGENT-005 — Deliverability diagnostician

*Tier:* Core

**Requirement.** An agent reads bounce codes, complaints, mailbox-provider breakdowns (DELIV-005), DNS state and Postmaster data and explains a deliverability change in plain language with evidence (for example *Microsoft policy blocks began after the 9 October campaign to contacts unengaged for over a year*), proposing fixes (sunset segment, slower ramp, DNS change) for a person to apply.

**Acceptance.**
1. with seeded Outlook policy-block bounces following a send to unengaged contacts, the diagnosis names the campaign, provider and segment, and its proposals are drafts that change nothing until applied.

#### AGENT-006 — Account audit

*Tier:* Core

**Requirement.** On request, an agent audits live flows, recent campaigns, forms and settings against the category's working practice and this deployment's own data: missing core flows, flows with no exit goal, messages without plain-text alternatives, unbalanced frequency, forms without SMS capture, untested subject lines, and expired coupons; each finding links to the object and a one-click draft fix.

**Acceptance.**
1. on a seeded account with three known issues, the audit lists all three with links, and each fix opens as a draft.

#### AGENT-007 — Grounded content drafting

*Tier:* Core

**Requirement.** For campaigns and flow messages, an agent drafts subject lines, preheaders, body copy, SMS text and product selections in the brand's voice from the brand kit, catalog, past messages and their measured results; every factual claim about products, prices and offers must come from the catalog or an approved revision (PROP-006), and nothing drafted sends without approval or activation.

**Acceptance.**
1. a drafted abandoned-cart email names only products and prices present in the catalog; a draft containing a claim not in the evidence is rejected as PROP-007 requires.

#### AGENT-008 — Natural-language segments and questions

*Tier:* Core

**Requirement.** An operator can describe an audience or ask a question in words (*customers in Texas who bought twice but not in the last 120 days*; *which flow made the most incremental revenue last quarter?*); the agent turns it into a structured segment rule or report shown with its plain-text summary and count, which the operator saves or edits; answers cite the report they come from.

**Acceptance.**
1. the example request becomes a rule whose summary names the state, order count and recency conditions and whose count matches the builder's.

#### AGENT-009 — Standing routines with memory

*Tier:* Core

**Requirement.** Owners can set routines (a weekly performance digest, an anomaly alert when revenue, unsubscribes or complaints move beyond a threshold, a pre-holiday readiness check) that run on schedule with a cost limit, and a memory of operator notes and decisions (for example *we never discount the Heritage line*) that the operator can read, edit and delete and that every agent honors.

**Acceptance.**
1. a routine with a revenue-drop alert fires once on a seeded drop, stays within its cost limit, and a memory note excluding a product line keeps that line out of the next drafted content.

#### AGENT-010 — Agent authority and guardrails

*Tier:* Core

**Requirement.** Agents act with a named grant per routine: read scopes, draft-only outputs, a monthly AI spend cap in USD, and the single automatic action of pausing a flow under its declared stop rules. Agents never approve or activate anything, send or test-send, change consent, suppress or unsuppress, create discounts outside an approved revision, change targeting policy or increase spend. Every agent action is in the activity log (OPER-007) as the agent with its granting operator, and an owner can disable any agent immediately.

**Acceptance.**
1. attempts by an agent to approve, activate, send and change consent are each refused server-side with a named reason and logged; disabling the agent stops its next scheduled run.
2. Every agent action is an OPER-007 activity entry whose actor is the agent's grant, and the Activity screen's agent filter lists those grants (inherited from OPER-007, which is done for the actions Mango performs today).

#### AGENT-011 — Migration agent

*Tier:* Core

**Requirement.** During move-in an agent reads the incumbent export or API (MOVE-001 to MOVE-005), proposes field, topic and tag mappings with reasons, translates flows and automations into draft flows with each unsupported step explained, and checks the reconciliation report for anomalies (for example a status column that would upgrade consent); a person approves the mapping before anything is written.

**Acceptance.**
1. on a Klaviyo fixture the agent proposes mappings for every field, flags a consent-upgrading column, and nothing is written until the operator approves the plan.
2. On a Mailchimp fixture it proposes the MOVE-007 segment and MOVE-008 journey mappings, with each unsupported condition or step explained.

## Field proof register

| ID | Proof | Clauses | State | Date | Receipt |
| --- | --- | --- | --- | --- | --- |
| R-101 | Real Okta, Microsoft Entra ID, Google Workspace and JumpCloud tenant receipts for configured sign-in, group mapping and deprovisioning. | OPER-006 | not run |  |  |

## Boundaries

What Mango does not do, and how a US buyer gets it:

- **A bulk mail delivery network or guaranteed inbox placement.** Mango sends through the owner's own email provider, which the owner connects from Settings (DELIV-001, DELIV-008), and follows Gmail, Yahoo and Microsoft sender requirements; it authenticates, records bounces and complaints, and reports outcomes. Inbox-placement seed testing and rendering previews in dozens of real mail clients come from Litmus or Email on Acid, linked from review.
- **An SMS carrier, or sending without US registration.** Messages go through the owner's Twilio account under their 10DLC, toll-free or short-code registration; carrier fees and registration are on that account (SMS-002).
- **A storefront, checkout or store transactional messages.** Order confirmations, shipping and account emails remain the store platform's (Stall, Shopify, WooCommerce) or a transactional provider's such as Postmark; Mango sends marketing and lifecycle messages.
- **A CRM sales pipeline, help desk, website builder, survey tool or cross-app automation platform.** Those are Orbit, HappyToHelp, Pane, Pencil and Crank (or HubSpot, Zendesk, Squarespace, Typeform and Zapier); Mango integrates with them (INT-009, INT-011, SMS-004).
- **Payroll, work and project management, or monitoring and observability.** Those are the RunEditRun products [Envelope](https://github.com/just-every/run-envelope) (payroll), [Pegboard](https://github.com/just-every/run-pegboard) (work and project management) and [Porthole](https://github.com/just-every/run-porthole) (metrics, logs, traces and alerts); Mango links to them and claims none of their capability.
- **Running paid social or search ads, or social posting.** Mango syncs audiences to ad platforms (INT-012); campaigns themselves are run in Meta, Google and TikTok.
- **An ad exchange, newsletter ad network or paid-recommendation marketplace, or holding money.** Direct sponsorships (PUB-004) and partner recommendations (PUB-003) are in; network ads come from third-party sponsorship marketplaces, and all payments run through Stripe or Nectar (PUB-002).
- **Collecting product reviews, loyalty points or direct mail.** Review and loyalty apps feed events (INT-014); postcards come from a direct-mail provider triggered by a flow webhook (INT-008).
- **Purchased, rented or scraped lists and cold outreach.** Mango refuses lists without consent evidence (CONT-003, DELIV-006), and the incumbent-held attestation (CONT-024) excludes them; cold B2B outreach belongs to sales tools.
- **Several brands in one installation.** Each brand runs its own Mango installation; an operator can be invited to several. Agencies manage clients that way.
- **Legal advice or a compliance guarantee.** Mango enforces stated product rules for CAN-SPAM, TCPA, carrier rules and US state privacy laws; the owner remains responsible for their program. Rules for other jurisdictions (EU/UK GDPR and PECR, Canada's CASL) are honored through confirmed opt-in today and need their own clauses before Mango claims them.
- **Causal claims from attribution or opens.** Attributed revenue is a rule-based assignment (REPORT-003); lift is claimed only from randomized holdouts (EXP-003, EXP-004), and opens are estimates (RESULT-002).

## Homepage claims

No homepage claims are mapped yet.

## Status

Judged from the code and tests at commit `144c1db1d10d6578a3f6c4134a7d5cea655542bc` (25 October 2026). The sd-mango-c31 candidate carries the reusable-block changes and repairs the native round-trip timing. BUILD-012 retains partial with measured reusable-source refusals. BUILD-004 is proposed partial, uncounted pending exact-SHA verification and landing; its live-flow and template-copy gaps remain stated below. The sd-mango-c26b candidate adds inert FLOW-001 draft revisions, CONT-024 source attestation and review reliance counts, and partial MOVE-002/003/005 import paths; the scoped evidence and gaps below describe the candidate, pending exact-SHA branch Verify and Mac publication/landing checks. PUB-005 moved to done with its hosted paid signup page, Worker Checkout and payer-consent journey. INT-002 moved to done with its Owner connection, store sync, signed replay and activated plugin checkout-flow journey; DELIV-002 and PUB-002 remain partial. SEG-001, STORE-004 and PUB-002 were reviewed at `4c4749cf2b4fb6584483bd1fc95f7af964b12335`: SEG-001 moved to done with its collection and category purchase conditions, STORE-004 moved to done with failed webhook and generation operations carrying the adapter's error, and PUB-002 moved to partial with its paid tier proved at the Stripe network edge (sandbox proof pending); REPORT-003 was reviewed at `2ecfa8e031c3a91bfc04bfd1bef2a26bb5d15bea` (22 October 2026); other rows retain their prior review boundaries. MOVE-009, CONT-012 and AUD-008 were reviewed against the candidate source based on `b40be01dcfcf8d793a92780252859eeccdaeb754` on 21 October 2026; their evidence and gaps below supersede only those earlier status entries. Published clause wording and the issued v0.4.0 release envelope are unchanged. MOVE-009 moved to done at d21d9e2b; its unproved remainder became MOVE-015 (missing), 22 October 2026. The sd-mango-c28 candidate adds hosting hygiene, consent-neutral source draft outlines, immutable flow template copies, Resend Settings connection monitoring and native block/mobile authoring; scoped evidence below remains subject to exact-SHA Verify and Mac publication/landing checks. The sd-mango-c32 candidate adds audience-specific name bounds, native social links and a manual six-item product grid, and the provider-edge promotional-email journey. BUILD-001 and BUILD-012 remain partial and UNCOUNTED pending exact-SHA verification and Mac publication/landing checks. The sd-mango-c37 continuation proposes conservative incumbent conversion and identifier-only Shopify catalog authoring with fresh hand-off reads; MOVE-011 remains partial and BUILD-011 is proposed partial, both UNCOUNTED pending exact-SHA Verify and Mac publication/landing checks. sd-mango-c38 proposes MOVE-014 missing to partial for inspected image import and live incumbent-host diagnostics; its cutover, flow and other-host gaps remain, and this proposal is UNCOUNTED until ct reads the landing line. sd-mango-c39 extends BUILD-011 and BUILD-012 evidence for configured chosen-item size bounds, the Shopify six-item promotion, catalog authorization and adversarial payloads, and identifier-only template/start/duplicate/follow-up doors, with both clauses remaining partial and UNCOUNTED pending exact-SHA Verify and Mac publication/landing checks. This round records and proves ct's two BUILD-012 catalog save riders and STORE-001 source identity, connection and occurrence time across the built connections without changing clause statuses or counts.

| Clauses | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Published | 59 | 32 | 0 | 91 |
| Target and push further | 19 | 65 | 72 | 156 |
| All | 78 | 97 | 72 | 247 |

| Clause | Title | Kind | Status | Evidence | Gap |
| --- | --- | --- | --- | --- | --- |
| `HOME-001` | Lobby and public landing | published | partial | `tests/local-start/local.journey.ts` · `src/site/pages.tsx` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Mango’s mark, name and one newsletter description identify the installation.; The Lobby has only one action. |
| `HOME-002` | Newsletter landing | published | partial | `tests/local-start/local.journey.ts` · `src/site/pages.tsx` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: The primary action opens the Run page; the run-site landing has no sign-in link.; The hero is the only top-level heading; the alternative sentence also ends the metadata description and names both replacement products.; The sections explain collection, writing, exact-letter approval, scheduling, delivery reporting and ownership, followed by a closing action.; The optional product credit appears only when the owner enables it; illustrative addresses, names, counts and dates are never records.; The static landing reads no operator, contact, campaign or session data and is written once by the site build.; Header Mango identity and links; Hero identity and exact alternative sentence; Hero actions and destinations; Footer deployment-owner name and description; Fixed page rather than a buyer page builder; No vendor pricing; No testimonials; No customer logos; No ratings; No metrics; No cross-store claims; No third-party brand logos; No optional commerce, SMS or AI advertising; No per-reader-send-time or provider-neutral-delivery advertising; Only specified link destinations; Fixed light palette in a dark-themed browser; Readable without scripts; Readable with reduced motion; Licensed self-hosted faces; Inline drawings without raster or embedded images; CSS-only once-only drawing motion; No motion for reduced preference; Motion never hides content. |
| `DOCS-001` | Public documentation | published | partial | `tests/docs.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Sole Sign in link; Shared footer, palette, faces and drawings; Every root, docs and top-level readme Markdown file is published or explicitly excluded with a reason; undeclared files, broken links or anchors, links to unpublished pages, raw HTML, forbidden images and absolute build-machine paths fail validation.; Published pages describe the default newsletter profile, expose no maintainer material and have no source-repository or edit link.; No documentation request reads workspace, session or database records.; Other-host behavior; Documentation is compiled before serving; Worker and browser outputs contain no Markdown or highlighter code, and individual page chunks are loaded lazily.. |
| `OPER-001` | Operators and the default role | published | partial | `tests/local-start/local.journey.ts` · `tests/production-entry.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Before role assignment, an operator can see and act on proposals, campaigns, flows, contacts and settings as Admin.; Valid identity already configured for the installation also completes setup.; Authenticated configuration APIs remain usable during setup, and completing setup does not claim provider readiness.. |
| `OPER-002` | Management | published | partial | `tests/settings-sender/routes.spec.ts` · `src/core/features/auth/service.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Settings can invite an operator and remove an operator.; A session without fresh email proof cannot grant another operator access.; Settings can request a confirmation link bound to the current session; completing it permits an invitation retry.; Reading or inspecting the confirmation link has no effect; only its affirmative submission supplies proof.; Only the operator established at setup may remove that operator.. |
| `OPER-003` | Removal does not rewrite history | published | partial | `tests/go-live/roles.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Every proposal remains attributed to the removed operator.. |
| `OPER-004` | Roles and permissions | target | partial | `tests/go-live/roles.journeys.ts` · `src/core/features/auth/permissions.ts` · `src/core/features/auth/product-roles.ts` · `migrations/core/0076_operator_product_roles.sql`  · `tests/go-live/delivery.journeys.ts` via `tests/go-live/sending-connection-journey.ts` (Verify go-live 2/9: SendGrid Owner connection, Admin named 403 on review/connect/disconnect)  · `tests/go-live/roles.journeys.ts` flow-draft Author save, Analyst read and Support named 403 (Verify go-live 6/9; 1440/390) · `tests/go-live/contact-links.journeys.ts` via `tests/go-live/source-api-journey.ts` (Verify go-live 1/9): Manager/Author library snapshots allowed, Analyst/Support refused and anonymous denied; MSG-011 Resend extension (go-live 2/9) limits connection mutation to Owner and health notices to current Owners/Admins. | Six persisted roles, Owner assignment and Analyst unmasking grant, next-request API/server-function enforcement, role-change audits, last-owner protection, Author draft/request/configured-test controls, Manager typed tests and approval, restricted contact views, Support opt-out/request recording and visible controls at 1440/390 are exercised. Gap: full flow activation, billing-bearing provider connect/replace/disconnect and installation-erasure journeys await their owning product implementations; masked CSV export is not implemented (exports remain Owner/Admin only). Authentication role grants stay destination-owned on restore. |
| `OPER-005` | Separation of approval | target | missing |  | not implemented |
| `OPER-006` | Single sign-on and deprovisioning | target | missing |  | not implemented |
| `OPER-007` | Activity log | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/auth/activity.ts` · `src/core/features/auth/activity-query.ts` · `src/core/features/auth/ui/activity-page.tsx` · `src/core/features/auth/activity-record.ts` | Owner and Admin read Activity under Settings (Authors and signed-out requests are refused on both doors): every `lifecycle_audit_entries` row and every integration-audit call, newest first, filtered by operator, agent, action, object and date, with older pages and a CSV of the filtered view that keeps a formula-like cell as text. One journey performs drafts saved, approval requests and approvals, pause, resume and cancel, an import, an audience export, an account export, a consent hand entry, an opt-out, an erasure (anonymised afterwards), signup-allowance and kiosk-form changes, role changes and an hourly signup-refusal summary (counts by form and reason, no addresses), then checks each appears once with actor and time, every filter and the export, at 1440 and 390 with axe. Each action's record is written with the action it records: in its own batch where the action is one (draft save, signup settings), otherwise immediately after it succeeds. FLOW-008 (activation, pause and archive of flows) and AGENT-010 (agent actions and the agent filter's values) inherit the obligation in their text (ct pattern 1). The product has no approval-rejection operation, so none is recorded. Gap: actual restore completion must be recorded with actor and time and visible, filterable and exportable in Activity. |
| `STORE-001` | Store and event connections | published | partial | `src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts` — signed carts preserve string identity, multiple lines and ordering; conflicting delivery, tenant and topics cannot mutate source facts, via `tests/store/source-export-proof.ts`, `tests/go-live/built-source-journey.ts`, `tests/go-live/store-source-journey.ts` and `tests/go-live/source-runtime.mjs`, proves every declared Shopify snapshot and observation type, every declared WooCommerce type with the plugin enabled and every declared Stripe event type through their network edges and the owner export, retaining source identifiers, connections and edge occurrence times; one address has one contact carrying both WooCommerce and Stripe customer records and the Stripe events. WooCommerce's existing Owner Settings proof is `tests/go-live/woocommerce.journeys.ts` — [INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery. Stripe's existing Owner Settings proof is `tests/go-live/roles.journeys.ts` — [PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history, via `tests/go-live/stripe-journey.ts`. | Gap: BigCommerce (INT-003), Square (INT-005) and Stall (INT-006) remain unbuilt; Shopify's Owner Settings connection without a developer step remains unproved under INT-015. |
| `STORE-002` | Source identity | published | partial | `tests/shopify/connection.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Customer and refund replay update existing contents without duplicates. |
| `STORE-003` | Freshness | published | done | `tests/go-live/source-freshness.journeys.ts` · `src/core/features/campaigns/ui/source-freshness.tsx` |  |
| `STORE-004` | Source failure | published | partial | `tests/go-live/source-freshness.journeys.ts` — “[STORE-003] [STORE-004] Decision Desk retains each completed sync through a later failed page and recovery”: a failed product sync records its failed operation carrying the adapter error and recovers through Store/Decision Desk at 1440/390; proposal generation refused by the failed source records one failed generation operation carrying the adapter's last error, with no proposal, cost or send; during a Shopify Admin API outage a correctly signed webhook keeps its 401 answer and records exactly one failed webhook operation carrying the adapter error per delivery (a replay adds none, a forged delivery records nothing), and Shopify's retry after recovery ingests the record once and completes the operation; failed-operation text carries no upstream diagnostic, secret, token or record payload; the Store page lists the failed generation and webhook operations at 1440 and 390 with no overflow or accessibility violations; saved draft edits, readable recorded outcomes/history and zero new mail handoffs with a scheduled campaign. `tests/go-live/roles.journeys.ts` — “[PUB-005][FORM-008][FORM-010][INT-004][OPER-003][OPER-004] roles govern native requests and removal retains authors, approvers and history” (via `tests/go-live/stripe-journey.ts`): during a Stripe API outage a correctly signed Stripe event that needs a Stripe read keeps its 422 answer and records exactly one failed webhook operation carrying the adapter error (a replay adds none, a forged event records nothing), and Stripe's retry after recovery ingests it once and completes the operation. `tests/shopify/connection.spec.ts` — “[STORE-004] native authenticated sync imports complete Shopify records and retains original purchase time through nested-page failures and retry” proves failed operation diagnostics and retry. `tests/go-live/stale-sources.journeys.ts` — “[STORE-005] [STORE-006][AUD-003] sources recover only after completed sync and review counts commerce and dormancy exclusions” retains the stored-source gate. | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Stripe signed failure and recovery. |
| `STORE-005` | Stale sources block approval | published | done | `tests/go-live/stale-sources.journeys.ts` · `src/core/features/lifecycle/evaluate-approval.ts` |  |
| `STORE-006` | Declared adapter capability | published | partial | `tests/go-live/stale-sources.journeys.ts` · `src/core/features/audience/source-coverage.ts` · `src/core/features/campaigns/authoring-service.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Source capability declared unavailable; Unsupported requirement refused; Reviews name missing source and leave no snapshots; Generation source refusal without campaign or audience. |
| `STORE-007` | Ingestion latency | published | partial | `src/core/features/audience/commerce-webhook-routes.ts` | acceptance not yet met: A webhook source record is readable within 60 seconds of acknowledgment, measured at the stated limits. |
| `CONT-001` | Contact identity | published | partial | `tests/move-in/archive.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Case and whitespace canonicalization; Phone canonicalization; Phone identity uniqueness on capture and import. |
| `CONT-002` | Channel status | published | partial | `tests/move-in/held.journeys.ts` · `tests/move-in/archive.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Independent pending and SMS states; Cross-channel independence under store activity and consent. |
| `CONT-003` | Consent evidence | published | partial | `tests/audience-import/signup.spec.ts` · `tests/campaign-authoring/import-category.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Recipient scope maintained; Missing evidence creates a non-subscribed contact, except for the incumbent-held evidence CONT-024 defines.; A reassigned phone or one no longer belonging to the recipient becomes non-subscribed until fresh evidence is captured.; Retained channel on capture and import; Retained brand or legal sender on capture and import; Retained SMS sender or program on capture and import; Retained message subject or category on capture and import; Retained frequency disclosure on capture and import; Retained destination jurisdiction on capture and import; Retained consent text on capture and import; Retained consent version on capture and import; Retained confirmation evidence on capture and import. |
| `CONT-004` | Opt-out precedence | published | partial | `tests/go-live/go-live.journeys.ts` · `tests/provider-suppression-ingress.spec.ts` · `tests/move-in/held.journeys.ts` · `tests/go-live/sync-integrations.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Sync, store events, merge and operator edit all retain restriction; Parallel-run incumbent writeback. |
| `CONT-005` | Resubscription | published | partial | `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/opt-out-reasons.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Fresh affirmative evidence is later than the opt-out and is confirmed under CONT-009 before resubscription.; An operator edit alone never resubscribes an unsubscribed or suppressed channel.; A recipient’s own public-form resubscribe follows CONT-027.; During parallel run, a confirmed resubscribe writes subscribed state back where the incumbent API allows; otherwise the cutover report lists it.. |
| `CONT-006` | Email suppression | published | partial | `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/go-live/sync-integrations.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Soft-bounce recorded and visible; Consecutive soft-bounce policy suppresses; Confirmed delivery resets consecutive soft-bounce count; Incomplete provider webhook setup blocks approval; Refreshing local authentication/setup credentials preserves existing contact-hash restrictions, including restrictions without a remaining contact row.; Legacy local authority conversion preserves the original verified contact authority before credential rotation; unknown or missing authority refuses work rather than selecting an unused secret.. |
| `CONT-007` | SMS compliance replies | published | partial | `src/core/features/sms/inbound.ts` · `tests/audience-import/signup.spec.ts` | acceptance not yet met: Signed SMS replies: STOP family opts out before acknowledgment, HELP and START never subscribe; proved on the Mobile Message adapter, Twilio pending (SMS-001). |
| `CONT-008` | Contact history | published | partial | `tests/audience-controls/contact-history.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Every other event retains its source. |
| `CONT-009` | Confirmation | published | partial | `tests/go-live/go-live.journeys.ts` · `tests/audience-import/signup.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Confirming request time read back; Pending channel cannot receive marketing; When confirmation is not required, recorded consent under CONT-003 subscribes the channel directly.; Reading and HEAD do not consume confirmation token; Suppression guard cannot be bypassed; Inactive identity cannot be confirmed; Operator-recorded SMS exact authenticated reply. |
| `CONT-028` | Guarded consent capture | published | partial | `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/opt-out-reasons.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Public eligibility, profile changes, consent evidence, capture metadata, history and pending status commit together, or a currently barred destination gains none of the new consent records.; A surviving unsubscribe or erasure restriction may recreate an unsubscribed profile containing only new post-opt-out request evidence, without restoring history; confirmation mail stays within CONT-027’s shared allowance.; Surviving suppression blocks fresh capture eligibility; Confirmation preparation finishes before the authoritative handoff check; suppression, a later opt-out or an already committed confirmation prevents handoff when present at that check.; The adapter is invoked immediately after the authoritative check; a provider handoff already authorized and in progress cannot be recalled by a later transition.. |
| `CONT-010` | Import | published | partial | `tests/audience-import/routes.spec.ts` · `tests/move-in/archive.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Phone-only CSV validated; Each rejected row reason read back; Unnamed-file per-row rule; Full review capacity. |
| `CONT-011` | Merge | published | partial | `tests/audience-controls/merge.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Every channel preserves the restrictive order. |
| `CONT-012` | Dormancy without deletion | published | partial | `tests/move-in/archive.journeys.ts` · `tests/go-live/stale-sources.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Imported order and consent changes retain original times for dormancy; Contact deletion and suppression absent through same mechanism. |
| `CONT-013` | Erasure and surviving opt-out | published | partial | `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: All listed hash/channel/reason/time fields and opted-out aliases retained; Installation-keyed one-way destination hash; Subscribed identity has no row tombstone; An import, sync or capture matching a retained local or portable identity preserves its restriction; an erasure opt-out means unsubscribed.; Only the recipient’s own confirmed public-form resubscribe can clear an unsubscribe or erasure restriction under CONT-027; it cannot clear suppression.. |
| `CONT-029` | Portable surviving restrictions | published | partial | `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Local-to-portable mapping retained specifically; Audience CSV exports carry surviving restrictions by their portable hash after erasure.; Documentation explains that a mapping or export holder can test guessed destinations or an address dictionary without the installation secret and can match stable hashes across installations and exports.; The retained mappings and exports are handled as sensitive personal data.. |
| `CONT-030` | Erasure-safe restore authority | published | partial | `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Nonempty legacy row journals are refused before staging.; Upgrade retires legacy journals and transfers only after advancing every known source floor.; An offline copy without current authority makes no claim to detect later erasure.. |
| `CONT-014` | Custom properties | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` | The scoped API persists contact fields with contact identity and consent source. Typed property definitions, UI editing, date/money semantics, segments and personalization remain unimplemented. |
| `CONT-015` | Topics and tags | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` · `src/core/features/lifecycle/email-consent-scope.ts` | Scoped subscriber sync stores deduplicated tags without granting consent, and maintains saved integration lists. Topic preference-center acceptance and general tag-driven segmentation remain unmet. |
| `CONT-016` | Preference center | target | missing |  | not implemented |
| `CONT-017` | Contact profile and event timeline | target | partial | `tests/audience-controls/contact-history.spec.ts` | ct 22 October 17:12Z carves active flow enrollments/current node to FLOW-002 and predictions to SEG-004; main still carries both sentences. Default ADOPTED: PARTIAL until ct applies the text carve; the visible panels honestly say no flow enrollments and predictions not available. Topic evidence reflects the existing channel ledger; independent topic withdrawal remains CONT-015/016. |
| `CONT-018` | Onsite behavior | target | partial | `tests/shopify/connection.spec.ts` | Default in force (owner direction 19 Oct 2026), written into the clause: site tracking off per site until an Owner or Admin turns it on (Manager may turn it off; OPER-007); consent only from the store's consent tool (Shopify Customer Privacy API, WP Consent API, Stall, the snippet's consent call), none or no decision = refused; GPC (Sec-GPC: 1 or navigator.globalPrivacyControl), sale-or-share opt-outs and CONT-021 do-not-share always refuse; one cookie mgo_s (Secure, SameSite=Lax, Path=/, no Domain, at most 30 days, HttpOnly where server-set, at most 2,048 bytes; no other browser storage); nothing sent to or held by Mango for an unidentified visitor (up to 20 events wait in the cookie until identification); mgo_c is 32 random bytes, single-use, host-bound, digest-only, 7 days, never for automated clicks, GPC or tracking off; identified onsite events kept 90 days; erasure under CONT-013. ct approval of the landed default: pending. Built and exercised: Shopify signed pixel ingest and current privacy controls (tests/shopify/connection.spec.ts); the separately approved INT-002 plugin semantic stays DONE. Acceptance not yet met: the snippet and Stall surfaces; the shared site switch, click-token journey and exchange on every surface; consent buffering, cookie parity, anonymous-request refusal, 90-day retention, erasure, segment-window and cross-site browser assertions on each surface. The Shopify pixel and WooCommerce plugin have not run this expanded acceptance. RESULT-005's redirect consumes this clause's click token: it adds mgo_c to connected-store destinations once the token is built; until then the redirect adds nothing. |
| `CONT-019` | US SMS consent capture | target | partial | `src/core/features/sms/signup.ts` · `tests/audience-import/signup.spec.ts` | acceptance not yet met: A form with phone capture shows the disclosure, the submission stores every evidence field, the confirmation text is sent once through the provider edge, and only a signed confirming reply subscribes; a pre-checked or missing disclosure blocks the form from publishing. |
| `CONT-020` | Engagement-based sunsetting | target | missing |  | not implemented |
| `CONT-021` | US privacy requests | target | partial | `src/core/features/audience/erasure` · `tests/audience-import/erasure.spec.ts` | acceptance not yet met: A Support operator records an access request and a do-not-share request; the export contains every record type for that contact and no other contact; the next ad-audience sync omits the contact. |
| `CONT-022` | Contact search and bulk actions | target | partial | `src/core/features/audience/ui/contact-merge.tsx` | acceptance not yet met: A search for a property value returns the matching contacts; a bulk tag of 5,000 contacts completes as a job with a receipt; a bulk "add to topic" refuses contacts without covering evidence and names them. |
| `CONT-023` | Custom objects | target | missing |  | not implemented |
| `CONT-024` | Incumbent-held consent | target | partial | `tests/move-in/archive.journeys.ts` · `tests/move-in/incumbent-journey.ts` · `tests/portability.spec.ts` · `tests/go-live/contact-links.journeys.ts` | Mailchimp archive and named CSV/API source attestation and incumbent-held email evidence are exercised through the public preview, apply, campaign-review, native export/restore, revocation and erasure doors at 1440/390. Store connections (INT-001 to INT-006), five-year expiry and positive SMS evidence (A2P hold) remain unproved. A source without a row time requires an explicitly supplied export creation time. No real provider call or consent was used. |
| `CONT-025` | Opt-in mode per form and source | target | partial | `tests/go-live/shared-kiosk.journeys.ts` · `tests/go-live/opt-in-journey.ts` · `tests/go-live/sync-integrations.journeys.ts` · `tests/portability.spec.ts` | Built contact.opt-in.v1 for hosted, kiosk and manual email capture points with default double mode, versioned Owner/Admin changes and strict single-capture transaction guards. API keys remain fixed double mode. SMS is fixed under CONT-019. Store/move-in rows are connection-owned read-only; the Shopify incumbent-held/Pending/Non-subscribed acceptance, popup/landing carriers, Zapier/Crank and SMS mode editing remain open. Default ADOPTED: CONT-025 Owner/Admin authority also governs manual mode; ct approval pending. No real provider call or consent was used. |
| `CONT-026` | Contact added by hand | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `tests/go-live/manual-entry-journey.ts` · `tests/portability.spec.ts` | Built on the existing consent route with native role fences, future-only manual mode and anonymous Activity. SMS remains pending until its own authenticated reply and requires recorded express written permission; URL confirmation cannot subscribe manual SMS. Named CONT-009 amendment: this signed provider POST consumes the exact confirmation instead of an emailed-link POST. Gap: topic-specific permissions wait on CONT-015; signed-out requests retain BASE-ACCESS-002’s 401 rather than the brief’s requested 403; legacy email API clients may still supply the existing permission evidence shape without the new form attestation fields. Owner/Admin manual-mode authority follows CONT-025, pending ct approval. No real provider call or consent was used. |
| `CONT-027` | Resubscribe through a public form | target | partial | `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts` | Owner-approved confirmed-only hosted/kiosk resubscription retains the opt-out until recipient POST, records request/handoff/confirmation history, silently caps destination confirmation reservations at three per UTC day and refuses hard-bounce, complaint and owner suppressions. Generic acknowledgments include destination-dependent intake refusals and uncertain/failed delivery without automatic retries. Local browser journeys cover 1440/390 and separate resubscribe growth. Remaining full-clause acceptance: popup/landing and incentive/topic/flow integration, erasure reason preservation and supersession, and expired recreated-contact cleanup; ambiguous legacy erasure-only restrictions remain blocked. |
| `PROP-001` | Decision Desk | published | done | `tests/proposals-decision/decision-routes.spec.ts` |  |
| `PROP-002` | Evidence | published | done | `tests/proposals-decision/decision-routes.spec.ts` |  |
| `PROP-003` | Counts | published | done | `tests/proposals-decision/decision-routes.spec.ts` |  |
| `PROP-004` | Content | published | done | `tests/proposals-decision/decision-routes.spec.ts` |  |
| `PROP-005` | Owner control | published | done | `src/core/features/campaigns/adopt-proposal.ts` · `tests/proposals-decision/decision-routes.spec.ts` |  |
| `PROP-006` | Grounded generation | published | done | `tests/proposals-decision/decision-routes.spec.ts` |  |
| `PROP-007` | Generation failure | published | done | `tests/proposals-decision/proposal-states.spec.ts` |  |
| `PROP-008` | Forecast provenance | published | done | `tests/proposals-decision/decision-routes.spec.ts` |  |
| `PROP-009` | Proposal states | published | done | `tests/proposals-decision/proposal-states.spec.ts` |  |
| `AUD-001` | Review snapshot | published | done | `tests/audience-controls/segments.spec.ts` |  |
| `AUD-002` | Consent and suppression | published | done | `src/core/features/audience/eligibility.ts` · `tests/go-live/delivery.journeys.ts` |  |
| `AUD-003` | Commerce and dormancy exclusions | published | done | `tests/go-live/stale-sources.journeys.ts` | One Shopify-backed product review lists recent-product-purchase (seven days), unresolved-refund, unresolved-return and dormant (twelve months), each with its count, at 1440/390. Resolved commerce and eleven-month activity stay eligible; thirteen-month activity is dormant. AUD-008 states how an operator turns the dormancy exclusion off for one campaign and retains that switch. |
| `AUD-004` | Frequency protection | published | done | `src/core/features/audience/eligibility.ts` · `tests/go-live/open-estimates.journeys.ts` |  |
| `AUD-005` | Dispatch recheck | published | done | `tests/audience-controls/merge.spec.ts` · `tests/go-live/delivery.journeys.ts` |  |
| `AUD-006` | Multi-step exit | published | done | `tests/go-live/multistep.journeys.ts` |  |
| `AUD-007` | Frozen candidate set | published | done | `tests/audience-controls/segments.spec.ts` |  |
| `AUD-008` | Inactivity rules in review | target | partial | `tests/move-in/archive.journeys.ts` · `tests/go-live/roles.journeys.ts` | Review shows dormant/open-only and included no-history counts. An approver can include open-only or disable dormancy for the campaign, with the restored count saved; Owner/Admin defaults under audience.exclusions.v1 copy into new drafts. The immutable approved policy, actor audit and dispatch recheck are exercised. Gap: unengaged (CONT-020), dormant precedence over unengaged, and flow-message inactivity controls remain owed. Existing fieldset, checkbox, numeric input and action patterns suffice; no new design pattern is introduced. |
| `AUD-009` | Frequency protection: one policy and a recorded override | target | partial | `src/core/features/lifecycle/policies.ts` · `src/core/features/audience/eligibility.ts` | acceptance not yet met: Two campaigns to the same audience are approved four hours apart. With the default, the second excludes everyone the first emailed, with frequency-window. With the override recorded at the second's approval, it hands off to them, the override and its approver appear in the activity log, and a contact who unsubscribed between the two sends is still excluded. A contact emailed a campaign in the morning still receives that afternoon's abandoned-cart message from the library flow, a draft flow made from a Mailchimp journey fixture carries the same setting, and its activation shows the 30-day skip count from seeded sends. |
| `CAMP-001` | States | published | done | `tests/campaign-results/results.journeys.ts` |  |
| `CAMP-002` | Draft editing | published | done | `tests/campaign-authoring/browser.spec.ts` |  |
| `CAMP-003` | Revision preview | published | done | `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts` |  |
| `CAMP-004` | Approval checks | published | done | `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/create-api.spec.ts` |  |
| `CAMP-005` | Idempotent approval | published | done | `tests/campaign-authoring/browser.spec.ts` |  |
| `CAMP-006` | Schedule | published | done | `tests/campaign-authoring/browser.spec.ts` |  |
| `CAMP-007` | Scheduled edits | published | done | `tests/go-live/delivery.journeys.ts` |  |
| `CAMP-008` | Test send | published | done | `tests/go-live/go-live.journeys.ts` |  |
| `CAMP-009` | Cancellation | published | done | `tests/campaign-results/results.journeys.ts` |  |
| `CAMP-010` | Step deadline | published | done | `tests/go-live/scheduler.journeys.ts` |  |
| `CAMP-011` | Dispatch punctuality | published | done | `tests/go-live/scheduler.journeys.ts` |  |
| `CAMP-012` | Campaign images | published | done | `tests/campaign-assets.spec.ts` · `tests/campaign-authoring/local-images.spec.ts` |  |
| `CAMP-013` | Recipient-local send time | target | missing |  | not implemented |
| `CAMP-014` | Pause and resume | target | done | `tests/go-live/pause.journeys.ts` |  |
| `CAMP-015` | Marketing calendar | target | missing |  | not implemented |
| `CAMP-016` | Follow-up to non-engaged recipients | target | done | `tests/campaign-results/followup.journeys.ts` · `tests/portability.spec.ts` |  |
| `CAMP-017` | Recurring and RSS-to-email campaigns | target | missing |  | not implemented |
| `CAMP-018` | Duplicate a campaign | target | done | `tests/campaign-authoring/browser.spec.ts` |  |
| `CAMP-019` | Test send to typed addresses | target | partial | `tests/go-live/typed-tests.journeys.ts` · `src/core/features/lifecycle/test-send-allowance.ts` · `src/core/features/lifecycle/test-destinations.ts` | Up to five typed email recipients receive marked saved-draft tests with opt-out/suppression refusal and destination/actor history. Remaining allowance is visible; whole-request quota admission is atomic and names the remaining count on refusal. Configured and typed attempts share the default 100 attempted hand-offs per UTC day, including uncertain outcomes, with midnight reset exercised. Authors see configured destinations only and typed requests receive 403; assigned Manager typed tests and Author configured tests are exercised by tests/go-live/roles.journeys.ts. Activity lists each typed destination with actor and time, action/object filters and CSV export; contact erasure redacts the destination while retaining the receipt (tests/go-live/typed-tests.journeys.ts, push Verify go-live 8/9, 1440/390). Remaining: typed SMS consent/transport (SMS-001, CONT-019), full role acceptance (OPER-004). |
| `DESIGN-001` | Optional design module | published | done | `tests/campaign-authoring/design-generation.spec.ts` |  |
| `DESIGN-002` | Draft-only design generation | published | done | `tests/campaign-authoring/design-generation.spec.ts` |  |
| `DESIGN-003` | Design data and records | published | done | `tests/campaign-authoring/design-generation.spec.ts` |  |
| `DESIGN-004` | Design import | published | done | `tests/campaign-authoring/design-import.spec.ts` |  |
| `MSG-001` | Sender identity | published | partial | `src/core/features/settings/sender-validation.ts` · `tests/settings-sender/routes.spec.ts` | acceptance not yet met: Email identity is proved; per-country registered SMS senders await SMS-001 and SMS-002. |
| `MSG-002` | Email authentication | published | done | `tests/sender-verification/worker.spec.ts` |  |
| `MSG-003` | Email unsubscribe | published | done | `tests/go-live/go-live.journeys.ts` · `tests/sender-verification/worker.spec.ts` |  |
| `MSG-004` | SMS permission | published | partial | `src/core/features/sms/transport-guard.ts` | acceptance not yet met: SMS eligibility needs subscribed scope and an approved sender; US registration pending. |
| `MSG-005` | SMS opt-out | published | done | `tests/go-live/content-checks.journeys.ts` · `src/core/features/sms/review-preview.ts` · `src/core/features/sms/content.ts` | On the Mobile Message edge, review of an SMS step for a confirmed SMS contact shows the rendered example with the configured program identity, Reply STOP to unsubscribe, the configured frequency disclosure, the help contact and the exact segment count at 1440 and 390. Mobile Message is the proved adapter; Twilio acceptance stays with SMS-008. |
| `MSG-006` | Links | published | done | `tests/go-live/content-checks.journeys.ts` · `src/core/features/campaigns/link-reasons.ts` · `src/core/features/lifecycle/checks.ts` | One draft carries a malformed link, http:, javascript:, data: and file: links, a link whose redirect lands on an unlisted host, an http: image and an HTTPS image on an unlisted host, with mailto: and tel: contact links beside them. Review and approval block it and name every blocked link with the scheme, fault or host that blocks it; only the unlisted HTTPS hosts (the redirect's and the image's) offer Allow this host, never a scheme, at 1440 and 390. Contact links never need it. FLOW-008 (flow activation) and RESULT-005 (tracking) inherit this one rule in their own text. |
| `MSG-007` | Content checks | published | done | `tests/go-live/content-checks.journeys.ts` |  |
| `MSG-008` | Personalization | published | done | `tests/go-live/personalisation.journeys.ts` |  |
| `MSG-009` | Email body | published | done | `tests/campaign-authoring/canonical-save.spec.ts` |  |
| `MSG-010` | Unsubscribe availability | published | done | `tests/go-live/opt-out-reasons.journeys.ts` · `src/core/features/audience/unsubscribe-routes.ts` |  |
| `MSG-011` | Sending reputation | published | done | `tests/go-live/delivery.journeys.ts` |  |
| `MSG-012` | Hidden or deceptive presentation | published | done | `tests/campaign-authoring/canonical-save.spec.ts` |  |
| `MSG-013` | Contact links (mailto:, tel:, sms:) | target | done | `tests/go-live/contact-links.journeys.ts` |  |
| `MSG-014` | Allowed link and image hosts | target | partial | `tests/go-live/content-checks.journeys.ts` · `tests/go-live/content-hosts.ts` · `tests/portability.spec.ts` | Fresh installations list deployment, conservative social defaults and genuine configured connection hosts with sources. Exact and explicit wildcard matching stays shared; durable operator removals survive catalog sync, review allowances retain source/operator/campaign, and source changes are audited. Existing explicit policies remain explicit. Acceptance remains unmet: Shopify does not store primary/additional storefront or catalog image domains; product/social blocks (BUILD-001), brand kit (BUILD-003), Shopify disconnect and flow activation are absent. The existing store-owned editor help incorrectly describes implicit subdomain matching and is not changed in this writer. Social vocabulary approval is pending. |
| `MSG-015` | Allow a blocked host from review | target | done | `tests/go-live/content-checks.journeys.ts` | Review names each blocked host and its links, including redirect hosts. Authors see no allow action and receive 403; a Manager allows a host, the stored list appends it, checks rerun and approval passes. The append-only row names operator, host and campaign through Owner/Admin GET /api/activity, newest first with operator/action/object filters. An imported Mailchimp template lists three outside hosts with allow actions at 1440/390. Exact and explicit wildcard matching agree across approval, inspection and tracking; deceptive suffixes remain blocked. OPER-007 inherits the full cross-product screen, CSV and every action type (ct pattern 2, c4 authorized default). |
| `SEND-001` | Provider hand-off | published | done | `tests/go-live/managed-mail.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts` |  |
| `SEND-002` | Quiet hours | published | partial | `src/core/features/sms/policy.ts` | acceptance not yet met: Recipient-local SMS windows; US defaults in SMS-003. |
| `SEND-003` | Throttling and progress | published | done | `tests/go-live/delivery.journeys.ts` |  |
| `SEND-004` | Transport failure | published | done | `tests/go-live/delivery-recovery.journeys.ts` · `tests/go-live/delivery.journeys.ts` |  |
| `SEND-005` | Provider-event identity | published | done | `tests/go-live/go-live.journeys.ts` · `tests/go-live/delivery-recovery.journeys.ts` |  |
| `SEND-006` | Delivery truth | published | done | `tests/go-live/go-live.journeys.ts` · `tests/go-live/scheduler.journeys.ts` |  |
| `SEND-007` | Partial completion | published | done | `tests/go-live/go-live.journeys.ts` · `tests/campaign-results/results.journeys.ts` |  |
| `SEND-008` | Resumable dispatch and reconciliation | published | done | `tests/go-live/go-live.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts` |  |
| `SEND-009` | Provider outage | published | done | `src/core/features/lifecycle/provider-outages.ts` · `tests/go-live/delivery-recovery.journeys.ts` |  |
| `RESULT-001` | Campaign history | published | done | `tests/campaign-results/results.journeys.ts` |  |
| `RESULT-002` | Engagement | published | done | `tests/go-live/open-estimates.journeys.ts` |  |
| `RESULT-003` | Attribution | published | done | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/performance-fixture.ts` |  |
| `RESULT-004` | Cost | published | done | `tests/campaign-results/costs.journeys.ts` |  |
| `RESULT-005` | Link tracking | published | done | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/tracking-journey.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/open-estimates.journeys.ts` |  |
| `RESULT-006` | Deliverability reporting | published | partial | `src/core/features/insights/ui/sender-rates.tsx` · `tests/go-live/delivery.journeys.ts` | acceptance not yet met: Per-domain rates shown; SMS sender rates await SMS-001. |
| `RESULT-007` | Click map, per-link clicks and clicker lists | target | partial | `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/reporting-journey.ts` | Campaign links show human totals, unique identified clickers, automated requests, a saved-revision click map, matching clicker CSV and exact saved ID cohorts. Gap: repeated positions with one destination share counts; legacy clicks without destination identity remain unassigned; erased click facts are removed rather than retained as anonymous link counts; campaign-wide unique rollups, flow reports and role masking are absent; very large saved cohorts require CSV. |
| `RESULT-008` | Recipients per outcome | target | partial | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/recipient-method-journey.ts` · `tests/campaign-results/results.journeys.ts` · `tests/portability.spec.ts` | Message-bound link, one-click and signed SMS reply methods are retained with their first recorded time, shown in the recipient list and CSV and preserved as anonymous counts after erasure. Historical methods remain unknown. Flow messages and role masking remain absent; very large saved cohorts require CSV. |
| `DATA-001` | Export contents | published | done | `tests/portability.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/local-start/command-data.journey.ts` |  |
| `SCALE-001` | Capacity for the first buyer | target | partial | `seed.json` · `src/core/features/audience/import-limits.ts` | acceptance not yet met: A generated installation of 250,000 contacts with a year of order and activity events passes the MOVE-012 move-in, an exact review count within 60 seconds, a complete hand-off to the provider edge at the declared rate with no duplicate (SEND-001), and a segment update within SEG-002's time, with wall time and peak memory recorded against seed.json → limits; the per-email size floor is proved under BUILD-012, and the intake floor under FORM-008. |
| `FORM-001` | Hosted and embedded signup | target | done | `src/core/features/audience/signup-routes.ts` · `tests/audience-import/signup.spec.ts` |  |
| `FORM-002` | Popups, flyouts and full-page forms | target | missing |  | not implemented |
| `FORM-003` | Multi-step capture and incentives | target | missing |  | not implemented |
| `FORM-004` | Landing pages | target | missing |  | not implemented |
| `FORM-005` | Form performance and tests | target | missing |  | not implemented |
| `FORM-006` | Referral program | target | missing |  | not implemented |
| `FORM-007` | Abuse resistance | target | done | `src/core/features/audience/signup-security.ts` · `tests/audience-import/signup.spec.ts` |  |
| `FORM-008` | Signup intake capacity | target | partial | `tests/go-live/shared-kiosk.journeys.ts` · `tests/go-live/signup-capacity-journey.ts` · `tests/audience-import/signup-security.spec.ts` · `tests/audience-import/signup-reservation-clock.spec.ts` · `tests/audience-import/signup-reservation-clock.spec.ts` · `tests/portability.spec.ts` | Built: separate challenged/unchallenged 1,000/hour and 100/minute pools, one network accepted count at 30/120, separate 60 refused attempts, destination 3/day, kiosk 300 partitions, atomic accepted-only claims and pre-handoff loser refunds, Owner-only next-window raises with floor/ceiling and activity, per-form challenge default and Owner/Admin toggles, mandatory kiosk verification, five-minute one-use tokens and missing-key Home warning. Defaults ADOPTED per ct's landed text; ct approval of the landed default remains pending. Popup/flyout/full-page/landing carriers (FORM-002 to FORM-004), FORM-005's report surface remain open. Single-opt-in accepted captures are exercised under CONT-025. Hosted form is the existing volume/shared-network door; no clause sentence changed. No real provider call or consent was used. |
| `FORM-009` | Kiosk and event forms | target | done | `tests/go-live/shared-kiosk.journeys.ts` · `src/core/features/audience/signup-routes.ts` · `src/core/features/audience/ui/kiosk-signup-page.tsx` · `migrations/core/0075_kiosk_forms.sql` | Hosted form marking and device label, full-viewport blank reset within two seconds, fresh mandatory challenge, no visitor cookies/storage, 300 accepted signups from one network, confirmed kiosk source in Insights and operator-attributed marking are exercised locally. Turnstile provisioning and the ordinary-form intake amendment remain FORM-008 obligations; the hosted/kiosk resubscribe path is exercised separately under CONT-027. |
| `FORM-010` | Refused signups are never silent | target | partial | `tests/go-live/shared-kiosk.journeys.ts` · `tests/go-live/signup-refusal-screens.ts` · `tests/audience-import/signup-security.spec.ts` · `tests/audience-import/signup-reservation-clock.spec.ts` · `tests/go-live/resubscribe.journeys.ts` · `tests/go-live/sync-integrations.journeys.ts` · `tests/go-live/activity-log.ts` | Hosted and kiosk address-independent refusals answer 429 with seconds to their UTC window end, preserve entries and show the required error without success. Settings exposes hourly counts by form/reason; Home shows rolling-hour allowance counts and form/settings links, clearing after an hour. Destination-dependent refusals retain the generic acknowledgment. FORM-005's own report is not built; default ADOPTED: nearest existing Settings surface, clause remains partial pending ct's report-surface carve ruling. No real provider call or consent was used. |
| `SEG-001` | Segment builder | target | done | `tests/audience-controls/segments.spec.ts` · `tests/audience-controls/segment-journey.ts` · `tests/audience-controls/segment-catalog.ts` · `tests/audience-controls/segment-fixture.ts` · `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/cross-channel-attribution.ts` | Every sentence part is asserted except those the clause assigns elsewhere: campaign, link and flow activity are inherited by SEG-006, predictions by SEG-004, and products, collections and categories viewed by CONT-018 (onsite behavior). Collection and category membership is the synced catalog's current placement (Shopify supplies no placement history); ZIP distance uses Census ZIP-area representative points. |
| `SEG-002` | Live membership | target | missing |  | not implemented |
| `SEG-003` | RFM and lifecycle stages | target | done | `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/retention-journey.ts` |  |
| `SEG-004` | Predictions | target | missing |  | not implemented |
| `SEG-005` | Engagement and lead scoring | target | missing |  | not implemented |
| `SEG-006` | Campaign and flow activity conditions | target | missing |  | not implemented |
| `BUILD-001` | Drag-and-drop email builder | target | partial | `tests/proposals-decision/decision-routes.spec.ts` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/full-promotional-email-journey.ts` | The editor offers text, image, button, 1–4 columns, spacer, divider, header, footer, product, a six-item manual product grid and a closed-list social links block, with existing per-block and mobile settings through the MSG-009/012 grammar. Gap: video thumbnail, cart items, coupon and restricted HTML blocks remain unbuilt; exhaustive public-door coverage of every block/settings combination and the complete builder acceptance remain unproved. |
| `BUILD-002` | Template library | target | partial | `tests/campaign-authoring/browser.spec.ts` · `tests/portability.spec.ts` · `tests/move-in/archive.journeys.ts` · `tests/campaign-authoring/design-import.spec.ts` · `tests/campaign-authoring/design-generation.spec.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/portability.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/flow-template-journey.ts` | Starter and saved templates create independent unscheduled campaigns; updating a template preserves existing drafts and approvals. Mailchimp archive templates enter the library, held conversions stay held, and undo removes an untouched template while preserving edits and independent drafts. The first saved DESIGN-004 import or DESIGN-002 application files its own library template. Library proof at 1440/390 is in the archive journey. Gap: executable migrated flows (FLOW-002), full importer coverage and real-provider sandbox proof remain; MOVE-002/003/005 now have the partial import paths recorded in their own rows.  FLOW-001 email nodes now retain independent subject, preheader, HTML and plain-text copies from the library; they remain draft only. |
| `BUILD-003` | Brand kit | target | missing |  | not implemented |
| `BUILD-004` | Reusable blocks | target | partial | `tests/proposals-decision/decision-routes.spec.ts` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/reusable-block-journey.ts` · `tests/portability.spec.ts` | Gap: live flow revisions and activation (FLOW-008 unbuilt) and template-library sync beyond BUILD-002's copy rule. |
| `BUILD-005` | Conditional content | target | missing |  | not implemented |
| `BUILD-006` | Dynamic product content | target | missing |  | not implemented |
| `BUILD-007` | Coupons | target | missing |  | not implemented |
| `BUILD-008` | Previews and pre-send checks | target | done | `tests/go-live/presend-checks.journeys.ts` · `tests/go-live/email-size.journeys.ts` |  |
| `BUILD-009` | SMS and MMS composer | target | partial | `src/core/features/sms/content.ts` · `src/core/features/sms/review-preview.ts` | acceptance not yet met: A message with an emoji switches to UCS-2 and shows the new segment count and cost; the preview shows the short link and STOP text that will be sent. |
| `BUILD-010` | Mobile layout the checker can prove | target | partial | `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/mobile-presentation-journey.ts` · `tests/support/adversarial-email.mjs` · `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/design-import.spec.ts` · `tests/proposals-decision/decision-routes.spec.ts` · `tests/campaign-authoring/block-builder-journey.ts` | Per-block controls now use BUILD-001's block model and the existing generated-only style authority. Gap: nested/horizontal orientation and the complete editor acceptance remain unbuilt or unproved. Preview names hide on mobile/desktop, font size, line height, padding and alignment as dependent on the generated block. Conservative generated-only head style, 8192-byte bound and fail-visible desktop hiding defaults ADOPTED. No registration, timeout, shard count or cap was added or raised. |
| `BUILD-011` | Chosen catalog products | target | partial | `tests/go-live/multistep.journeys.ts` · `tests/go-live/chosen-catalog-journey.ts` · `tests/go-live/chosen-catalog-edge.ts` · `tests/local-start/signin-hydration.journey.ts` · `tests/campaign-authoring/chosen-size-journey.ts` · `tests/go-live/chosen-catalog-edge.ts` · `tests/local-start/signin-hydration.journey.ts` · `tests/campaign-authoring/catalog-guard-journey.ts` | Gap: WooCommerce catalog picking and hand-off are unimplemented. Imported and flow authoring doors remain unproved; native imported history and MOVE-011 conversion do not create catalog choices. Unavailable hand-off reads skip the recipient-step with catalog-unavailable, counted on campaign detail; stale values never send (ct ruling 25 October). |
| `BUILD-012` | Email size the builder and imported templates fit in | target | partial | `tests/go-live/email-size.journeys.ts` · `tests/go-live/email-size-imports.ts` · `tests/go-live/email-size-reuse.ts` · `tests/campaign-authoring/create-api.spec.ts` · `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/email-size-adoption.ts` · `tests/campaign-authoring/design-import.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/mobile-presentation-journey.ts` · `tests/proposals-decision/decision-routes.spec.ts` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/create-api.spec.ts` · `tests/campaign-authoring/reusable-size-journey.ts` · `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/audience-size-journey.ts` · `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/full-promotional-email-journey.ts` · `tests/go-live/email-size.journeys.ts` · `tests/go-live/email-size-reuse.ts` · `tests/local-start/signin-hydration.journey.ts` · `tests/campaign-authoring/chosen-size-journey.ts` · `tests/go-live/chosen-catalog-edge.ts` · `tests/campaign-authoring/catalog-riders-journey.ts` | Today's draft/create, store-signal starter, template save/replace/start, duplication, replacement-schedule copy, follow-up, imported-history copy and proposal-adoption doors use measured sent-size refusals with the limit and largest available HTML sections, comparing fallback and expanded saved-name renderings. Browser edits, selected design files and saved source snapshots survive refusal at 1440 and 390. Oversized archive template conversions are held with their measured diagnostic and original archive custody; the import continues, reconciliation distinguishes held conversions from created library templates, and undo removes unchanged held copies. In-limit content saves, reopens, approves and reaches the provider edge within its bound; a later oversized hand-off skips with email-too-large. Saved rule and exclusion membership now bounds displayName through the shared audience evaluator; approval measures its frozen email candidates. Separate raw and escaped maxima stay in D1. Only displayName currently supplies recipient values; other valid keys render their authored fallback. An unresolved new follow-up cohort retains the conservative deployment-wide bound until its membership authority exists. Size advisories retain saved audience and analytics context and recheck the eligible email identities used by approval. Gap: configured dynamic product maxima (BUILD-006), flow messages (FLOW-008), and the Mailchimp base_boxed_3column_query.html blueprint acceptance through MOVE-011 remain unproved. Mailchimp blueprint is CC BY-SA 3.0; vendoring waits on an owner licence decision. Existing LayerDoc application shares the design-import compiler; no real design or proposal generation/provider acceptance is claimed. |
| `FLOW-001` | Visual flow builder | target | partial | `tests/go-live/roles.journeys.ts` · `tests/campaign-authoring/flow-journey.ts` · `tests/portability.spec.ts` | Draft revisions only. Trigger enrolment, including the INT-004 renewal reminder (FLOW-002), and activation (FLOW-008) remain unbuilt. All node kinds have plain explanations; unavailable transports/actions are identified. No flow is enrolled, activated or sent. |
| `FLOW-002` | Triggers | target | missing |  | not implemented |
| `FLOW-003` | Entry filters and re-entry | target | missing |  | not implemented |
| `FLOW-004` | Delays and waits | target | missing |  | not implemented |
| `FLOW-005` | Splits | target | missing |  | not implemented |
| `FLOW-006` | Actions | target | missing |  | not implemented |
| `FLOW-007` | Exits and goals | target | missing |  | not implemented |
| `FLOW-008` | Reviewed activation | target | missing |  | not implemented |
| `FLOW-009` | Per-send rechecks | target | missing |  | not implemented |
| `FLOW-010` | Exactly-once execution | target | missing |  | not implemented |
| `FLOW-011` | Pause, manual review and stop | target | missing |  | not implemented |
| `FLOW-012` | Flow library | target | missing |  | not implemented |
| `FLOW-013` | Flow analytics and path inspection | target | missing |  | not implemented |
| `FLOW-014` | Priority and cross-message frequency | target | missing |  | not implemented |
| `FLOW-015` | Sequences | target | missing |  | not implemented |
| `FLOW-016` | Flow portability | target | missing |  | not implemented |
| `EXP-001` | Campaign A/B tests | target | missing |  | not implemented |
| `EXP-002` | Multivariate tests | target | missing |  | not implemented |
| `EXP-003` | Flow splits and flow holdouts | target | missing |  | not implemented |
| `EXP-004` | Global holdout | target | missing |  | not implemented |
| `EXP-005` | Honest test statistics | target | missing |  | not implemented |
| `EXP-006` | Send-time optimization | target | missing |  | not implemented |
| `SMS-001` | US SMS through Twilio | target | partial | `src/core/platform/adapters/mobile-message.ts` | acceptance not yet met: The go-live journey with a Twilio edge sends an approved SMS step, ingests signed delivered and undelivered callbacks once each, and a replayed callback adds no fact, run on a connection made through SMS-008; done only once SMS-008 is done. |
| `SMS-002` | Carrier registration status | target | missing |  | not implemented |
| `SMS-003` | US quiet hours and state rules | target | partial | `src/core/features/sms/policy.ts` | acceptance not yet met: A step scheduled at 19:30 Eastern hands off to New York recipients and defers Los Angeles recipients only if 19:30 Eastern is outside their window; a fourth same-subject text to a Florida number in 24 hours is skipped with state-frequency-limit. A phone-only subscriber with a 305 number and no address hands off at 10:00 Eastern with zone source area-code, and is deferred at 20:30 Eastern. |
| `SMS-004` | Two-way SMS inbox | target | partial | `src/core/features/sms/inbound.ts` | acceptance not yet met: An inbound signed reply appears in the inbox and contact timeline; the operator's answer hands off through Twilio once; an inbound STOP opts the number out before the webhook is acknowledged and shows in the thread. |
| `SMS-005` | Branded short links and MMS | target | missing |  | not implemented |
| `SMS-006` | SMS cost control | target | missing |  | not implemented |
| `SMS-007` | WhatsApp marketing messages | target | missing |  | not implemented |
| `SMS-008` | Twilio connection an owner makes in Settings | target | missing |  | not implemented |
| `PUSH-001` | Web push | target | missing |  | not implemented |
| `PUSH-002` | Mobile app push and in-app messages | target | missing |  | not implemented |
| `DELIV-001` | Sending providers | target | partial | `src/core/platform/adapters/sendgrid.ts` · `src/core/platform/adapters/resend.ts` · `tests/go-live/resend-delivery.journeys.ts` | acceptance not yet met: The go-live journey runs against each adapter's edge and shows the declared capability on the campaign page; an SMTP relay without events never shows a delivered count; run on a connection made through DELIV-008, and done only once DELIV-008 is done. |
| `DELIV-002` | Domain setup | target | partial | `src/core/features/sender-verification/domain-setup.ts` · `src/core/features/sender-verification/setup-routes.ts` · `tests/go-live/contact-links.journeys.ts` | SendGrid create-if-missing, returned records, public-DNS pass/fail, DMARC/BIMI guidance and CNAME+HTTPS-gated branded links are implemented. Two real proofs each validated an authentication and all four DNS records, then deleted two authentications and ten DNS records in total with zero remaining after each run. Gap: the throwaway tracking CNAME passed but HTTPS transport failed, so real branded-host TLS/rewrite acceptance is unproved. Read-only Cloudflare diagnosis on 22 October found active wildcard certificates and no zone Worker routes: a DNS CNAME alone does not attach the branded hostname to Mango’s redirect handler. Live hosted branded-link proof pending a disposable deployment. Main declined account-wide Worker/D1 credentials; a separately reviewed proof workflow must use the repository’s existing deploy secret and always clean up; no new provider objects were created in c11; the setup guide currently operates on SendGrid, with Resend retaining its existing verification path. |
| `DELIV-003` | Bulk-sender compliance dashboard | target | partial | `src/core/features/lifecycle/reputation-guard.ts` · `tests/go-live/delivery.journeys.ts` | acceptance not yet met: With seeded provider facts at a 0.25 per cent complaint rate, the dashboard warns; at 0.3 per cent the MSG-011 block shows the same figures. With no signed event received yet, the complaint rate reads delivery events not connected. |
| `DELIV-004` | Domain warm-up | target | missing |  | not implemented |
| `DELIV-005` | Mailbox-provider breakdown | target | done | `tests/go-live/mailbox-provider.journeys.ts` |  |
| `DELIV-006` | Address quality at intake | target | missing |  | not implemented |
| `DELIV-007` | Sender evidence renewal without stopping live flows | target | partial | `tests/sender-verification/worker.spec.ts` · `tests/go-live/managed-mail.journeys.ts` | PARTIAL: lifecycle approval/hand-off, deadline skip and ordered resume hooks remain in concurrent writers’ lifecycle files; sender-evidence-lapsed/sender-evidence-deadline are named by the renewal read only, not installed dispatch hooks. Live welcome-flow history waits on FLOW-*. Home/public renewal and the existing minute Cron share the same durable claims. Automatic renewal/reminders require the confirming native operator authority; legacy or restored confirmations need a fresh diagnostic before outbound renewal resumes. Default ADOPTED: last confirmer and every Owner receive reminders, once per evidence period; renewal never confirms on their behalf; configured connector renews only from authenticated diagnostic results. No provider account was used. |
| `DELIV-008` | Sending connection an owner makes in Settings | target | partial | `tests/go-live/delivery.journeys.ts` · `tests/go-live/sending-connection-journey.ts` · `tests/audience-controls/sendgrid-forwarding.spec.ts` · `tests/portability.spec.ts` · `tests/go-live/resend-connection-journey.ts` | SendGrid and Resend installation-side connections are exercised against synthetic provider and mail network edges; no real provider call, account or consent was used. A fresh installation without deployment mail inputs, Free sign-in through the connection, delivery-events-silent, scheduled daily read-back, handoff-unknown key replacement, complete developer-route authority coverage and DELIV-002 domain creation through this connection remain unproved. Request-driven five-minute read-back names revoked keys and missing owned webhooks, fences approval, shows Home alerts and notifies current Owners/Admins; unknown mail handoffs are not replayed. Settings names the route in use and places the labelled developer route after the owner connection form. Developer-only deployment inputs retain their legacy transport authority; read-only operation without a Settings connection remains unbuilt. Restricted scope CRUD behavior is inferred from provider documentation, not real-provider evidence. Conservative disclosed-before-create Owner authorization, signed-or-delete, five-minute timestamp window and id-only ownership defaults are adopted; Default ADOPTED; sandbox proof pending. |
| `REPORT-001` | Overview dashboard | target | partial | `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/overview-journey.ts` | Default ADOPTED: holdout-measured incremental revenue says no holdout configured until EXP-003/004; flows and top flows say no flows yet. No forecast is presented as a result. Campaign attribution/engagement use the detailed performance table’s scheduled-step period; costs, growth and provider facts use occurrence days, with each basis disclosed. Flow and holdout acceptance remains open. |
| `REPORT-002` | Campaign and flow performance tables | target | partial | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/results.journeys.ts` | Campaign revision/channel tables, sorting, topic/channel/UTC date filters, matched CSV, optional open-rate estimates, per-link detail and net attributed revenue by currency are exercised. Gap: flow and flow-message performance awaits the flow engine. |
| `REPORT-003` | Attribution for campaigns, flows and SMS | target | done | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/cross-channel-attribution.ts` · `tests/campaign-results/custom-attribution.ts` · `tests/campaign-results/attribution-report-ui.ts` | Flow attribution is inherited by FLOW-001/FLOW-002, which remain missing. |
| `REPORT-004` | Customer and retention analytics | target | done | `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/retention-journey.ts` |  |
| `REPORT-005` | List growth and consent sources | target | partial | `tests/go-live/list-growth.journeys.ts` · `src/core/features/insights/list-growth.ts` · `migrations/core/0074_list_growth_retained_history.sql` | Insights reconciles opening/net/closing subscribed membership by UTC day and separates captures/confirmations, opt-outs, suppression and removal, retaining source/version disclosures and anonymous counts after erasure. Real hosted and embedded form capture/confirmation journeys reconcile. Upgrade recovers retained pre-baseline consent captures/confirmations, explicitly labeled with zero inferred membership change; imported dates do not invent earlier local growth. Unavailable pre-baseline membership history is outside the amended history requirement; kiosk capture and confirmation are exercised by tests/go-live/shared-kiosk.journeys.ts. Hosted/kiosk public resubscribe confirmation and separate growth counts are exercised by tests/go-live/resubscribe.journeys.ts. Remaining: dedicated popup/landing-page attribution (FORM-002/004) and the full CONT-027 incentive/topic/flow and erasure-expiry acceptance. |
| `REPORT-006` | Scheduled and custom reports | target | partial | `tests/go-live/managed-mail.journeys.ts` · `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/saved-report-metric-journey.ts` · `tests/sender-verification/worker.spec.ts` | PARTIAL: Slack requires an unavailable webhook; scheduling currently covers saved provider cost/units and campaign click/conversion/USD attribution reports plus the built-in cost and engagement reports, not every report family or dimension. Default ADOPTED: Owner/Admin only, existing active operator IDs only, email only, no contact identities or per-contact rows, no currency conversion; weekly Monday 09:00 UTC / monthly first-day 09:00 UTC. Delivery refusals and sends are durable/audited; authorization/input refusals intercepted by the existing shared middleware are not yet activity records. Restored or revoked native authority requires explicit enable; uncertain provider outcomes never automatically resend. |
| `REPORT-007` | Usage and cost transparency | target | partial | `tests/campaign-results/costs.journeys.ts` | Flow cost grouping waits on flows. Default ADOPTED: projected month is the priced month-to-date UTC run rate extended linearly; each reported currency stays separate with no conversion, and unpriced facts are counted rather than zero. |
| `INT-001` | Shopify | target | partial | `src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts` | acceptance not yet met: Done only once INT-015 is done. tests/shopify/connection.spec.ts (native sync, signed carts, signed pixel), run on a connection made through INT-015's install journey, plus a consent write-back journey: a Mango unsubscribe appears as unsubscribed in the Shopify edge's customer record; and the CONT-025 Shopify opt-in journey. |
| `INT-002` | WooCommerce | target | done | `tests/go-live/woocommerce.journeys.ts` · `tests/go-live/woocommerce-plugin-journey.ts` · `extensions/mango-woocommerce/mango-woocommerce.php` · `extensions/mango-woocommerce/INSTALL.md` · `tests/audience-import/signup.spec.ts` |  |
| `INT-003` | BigCommerce | target | missing |  | not implemented |
| `INT-004` | Stripe | target | partial | `src/core/features/store/stripe/` · `tests/go-live/roles.journeys.ts` · `tests/portability.spec.ts` | Owner-only encrypted connection and signed once-only commerce event ingestion. Gap: required real-provider lifecycle proof cannot start as written: Stripe rejects metadata on a test clock (HTTP 400 parameter_unknown, metadata). No real lifecycle events or cleanup search proof claimed. FLOW-001/FLOW-002 inherit renewal-reminder enrolment without status changes. |
| `INT-005` | Square | target | missing |  | not implemented |
| `INT-006` | Stall and Orbit | target | missing |  | not implemented |
| `INT-007` | Events and profiles API | target | done | `tests/go-live/sync-integrations.journeys.ts` · `tests/go-live/custom-event-journey.ts` · `src/core/features/integrations/openapi.ts` · `src/core/features/integrations/client-source.ts` | Website keys stay on the website server; browser clients use an authenticated same-origin proxy. No automatic visitor collection or consent inference. |
| `INT-008` | Outbound webhooks | target | missing |  | not implemented |
| `INT-009` | Zapier and Crank | target | missing |  | not implemented |
| `INT-010` | Segment | target | missing |  | not implemented |
| `INT-011` | CRM sync | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `docs/integrations.md` | Scoped subscriber sync and a cursor-paged refusal feed support a sibling CRM client. The Coffer client is supplied as a patch in the integration round, not landed in Coffer here. Full CRM field mapping UI and flow-created CRM tasks remain unmet. |
| `INT-012` | Ad audiences | target | missing |  | not implemented |
| `INT-013` | Web analytics tagging | target | partial | `tests/go-live/contact-links.journeys.ts` · `tests/go-live/domain-journey.ts` · `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/tracking-journey.ts` · `tests/campaign-results/custom-attribution.ts` · `tests/portability.spec.ts` | Defaults ADOPTED (campaign.analytics.v1): source mango, medium by channel, campaign name slug, message revision content; static bounded values, HTTP/HTTPS only, managed links excluded, author keys win, no contact interpolation. Defaults freeze into new drafts and changes require review. Flow dimensions and INT-007's general custom-event track API remain open; the acceptance goal uses its existing scoped custom-conversion slice. ct approval pending; no Vane or real provider call was made. |
| `INT-014` | Reviews and loyalty apps | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `tests/go-live/review-loyalty-journey.ts` · `tests/sender-verification/worker.spec.ts` | PARTIAL: Yotpo stays disabled with adapter_signature_protocol_unverified because its signing protocol could not be verified from this VM; Smile customer/updated supports profile/balance observations, not inferred points earned or tier transitions. Live provider payload confirmation remains open. Review-request flow conversion/exit waits on FLOW-*. Default ADOPTED: Owner/Admin under integration.manage, existing encrypted credential custody, no new contact/consent/send, unknown addresses counted without storage. No provider account was used. |
| `INT-015` | Shopify connection a merchant installs | target | partial | `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts` | Connector not built; conservative default (opt-in per installation, Shopify OAuth/HMAC/state checks, fail-closed 401 routing, compliance topics acknowledged after installation receipt, connector state deleted on disconnect, removed subscriptions re-created) named in the clause, awaiting ct approval as landed. |
| `MOVE-001` | From Mailchimp | target | partial | `src/core/features/move-in/archive-service.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: tests/move-in/archive.journeys.ts runs on synthetic exports, extended with checked-in Mailchimp-format fixtures for a saved segment with a campaign-activity condition, a classic automation, a granular_activity file, two overlapping audiences with conflicting statuses and a template with merge tags and a <style> block. Each fixture shows its expected lines in the reconciliation report (MOVE-007 to MOVE-011). The CONT-024 subscribed-file fixture and the MOVE-012 full-scale export run through the same journey. The same journey also runs on one real, owner-supplied Mailchimp export with its reconciliation report. |
| `MOVE-002` | From Klaviyo | target | partial | `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-csv-journey.ts` · `tests/go-live/source-api-journey.ts` · `tests/go-live/source-draft-journey.ts` | Owner/Admin one-time Klaviyo API read and CSV preset retain email source method/time, restrictive suppressions, properties, list/segment review snapshots, library templates and original-time order/engagement history. Unsupported conditions and abandoned-cart action steps are named in the report. tests/portability.spec.ts preserves these records on native restore. Gap: executable flows (FLOW-002/008), parallel-run sync (MOVE-013) and real-provider sandbox proof. Positive incumbent SMS remains held under CONT-024/A2P; missing row time or collection point never grants SMS consent. Snapshot membership grants no additional category consent.  The source outline is now also an inert saved FLOW-001 draft revision; source trigger/action execution is unavailable. |
| `MOVE-003` | From ActiveCampaign | target | partial | `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-csv-journey.ts` · `tests/go-live/source-api-journey.ts` · `tests/go-live/source-draft-journey.ts` | Owner/Admin one-time ActiveCampaign API read and CSV preset retain contacts, list membership as review topics, tags, custom fields, unsubscribes and bounces. The key is used only in bounded declared-host HTTPS reads and is not stored or logged. Automation names/statuses form a readable report outline; unavailable trigger/action definitions are named. Gap: executable automations (FLOW-002/008), parallel-run sync (MOVE-013) and real-provider sandbox proof. Review topics grant no additional category consent.  The source outline is now also an inert saved FLOW-001 draft revision; source trigger/action execution is unavailable. |
| `MOVE-004` | From Kit (ConvertKit) | target | partial | `docs/moving-in.md` · `tests/move-in/held.journeys.ts` | acceptance not yet met: The move-in journey's Kit-format synthetic files (docs/moving-in.md) keep every restrictive state, plus a sequence fixture becomes a draft sequence. |
| `MOVE-005` | From beehiiv, Omnisend and Customer.io | target | partial | `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-csv-journey.ts` · `tests/go-live/source-api-journey.ts` | beehiiv, Omnisend and Customer.io documented CSV presets retain source status, tiers, attributes and tags; explicit source attestation carries incumbent-held email evidence and reconciliation counts evidence kinds. Unsubscribed, bounced and suppressed rows remain restricted. Gap: API pulls and parallel-run sync (MOVE-013); real-provider export proof pending. Missing or unfamiliar subscription states remain non-subscribed. |
| `MOVE-006` | Reconciliation and cutover | target | partial | `src/core/features/move-in/archive-report.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: After a move-in, the report's counts reconcile to the files and contact table, and no campaign or flow is scheduled or live. The report counts consent per evidence kind (CONT-024) and names the attestation each relies on. The cutover checklist shows the parallel-run sync (MOVE-013), or the re-import advice for an export-only move-in, and Mark cutover complete ends the sync. The checklist names any template or live message still loading images from an incumbent host (MOVE-014). |
| `MOVE-007` | Mailchimp saved segments | target | missing |  | not implemented |
| `MOVE-008` | Mailchimp automations and Customer Journeys | target | missing |  | not implemented |
| `MOVE-009` | Incumbent engagement history | target | done | `tests/move-in/archive.journeys.ts` · `tests/move-in/hostile.journeys.ts` · `tests/portability.spec.ts` | Mailchimp-format granular activity imports one durable click/open fact per accepted row, with original time, imported campaign/link and source. Reconciliation names imported/dropped counts; timeline, repeat, undo, merge, erasure and populated upgrade/restore are exercised. Per archive: 10,000 engagement rows within existing ZIP/text limits, visibly refused beyond that limit. Imported clicks govern CONT-012/AUD-008 dormancy; opens stay open-only, never engagement; no send fact, result, attribution or consent changes. API-key activity, other incumbents' history and CONT-020/SEG-005/SEG-006/EXP-006 uses are MOVE-015. |
| `MOVE-010` | Several audiences | target | partial | `src/core/features/move-in/archive-service.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: A fixture has two audiences that share addresses: one address subscribed in A and unsubscribed in B, one cleaned in B, and one with a different first name in each. Each address becomes one contact. The first is subscribed to topic A and unsubscribed from topic B, the cleaned one is suppressed on email, and the first-name conflict is listed. The report counts each audience and their overlap. |
| `MOVE-011` | Incumbent template conversion | target | partial | `src/core/features/move-in/html-import.ts` · `tests/move-in/archive.journeys.ts` · `tests/go-live/content-checks.journeys.ts` · `tests/go-live/content-hosts.ts` · `tests/go-live/template-conversion.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-api-journey.ts` | Gap: Campaign bodies remain imported history copied into drafts rather than automatically becoming library templates. Only FNAME, Klaviyo first_name, UNSUB and LIST:ADDRESS/ADDRESSLINE map to existing rendering targets; LNAME, DATE, CURRENT_YEAR, ARCHIVE, UPDATE_PROFILE (CONT-016), arbitrary property mapping and unknown fields remain visible and block personalization approval. The conservative name fallback is there; per-owner fallback configuration is unproved. CSS supports simple element/class selectors and top-level 480px mobile font size, line height, padding and alignment; other selectors, media widths, nested rules and orientation/hiding mappings remain unproved. Source-body inherited styles, complete per-location dropped-block diagnostics, general same-hue nearest-shade correctness across all backgrounds, a dedicated per-recoloring builder undo control and complete ActiveCampaign/Kit template conversion remain unproved; Klaviyo coverage currently proves only its supported name tag. Oversized results retain measured size, limit and largest blocks in custody/reconciliation, but cannot yet open directly in the builder for trimming. Mailchimp-host images in converted templates are re-hosted through the MOVE-014 journey; the rest follows MOVE-014's Gap. Host use counts and campaign review actions are covered by the existing imported-host journey; one-step reconciliation allowance/audit and flow-message review remain unproved. Mailchimp blueprint is CC BY-SA 3.0; vendoring waits on an owner licence decision. |
| `MOVE-012` | Move-in at the buyer's scale | target | partial | `src/core/features/move-in/archive-limits.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: A generated Mailchimp account export with 250,000 contacts across the subscribed, unsubscribed, non-subscribed and cleaned files and 52 weekly campaigns with granular_activity moves in through the journey. It is interrupted once by a forced worker restart during the activity import and resumes to completion with no re-upload. Its reconciliation report adds up per file, evidence kind and activity rows. A campaign to the whole subscribed audience then reaches review with an eligible count equal to an independent count over the generated files. The run records its wall time and peak memory. A generated API-pull fixture of the same size completes the same way. |
| `MOVE-013` | Two-way sync during the parallel run | target | missing |  | not implemented |
| `MOVE-014` | Incumbent images brought home | target | partial | `tests/go-live/content-checks.journeys.ts` · `tests/go-live/template-conversion.ts` · `tests/go-live/incumbent-image-journey.ts` | Gap: The cutover checklist item and its block on Mark cutover complete (MOVE-006 checklist unbuilt; MOVE-013 owner-held), flow messages (FLOW-*), and every other incumbent's image hosts beyond the Mailchimp-host fixtures proved here remain unproved. Large galleries remain subject to the existing retained archive-data budget. Scheduled-campaign enumeration beyond the proved template and draft list remains unproved. |
| `MOVE-015` | Incumbent engagement history beyond the Mailchimp export | target | missing |  | not implemented |
| `MOBILE-001` | Responsive operator app | target | partial | `tests/newsletter-ui/representative-pages.journeys.ts` | acceptance not yet met: The representative-pages journey (tests/newsletter-ui/representative-pages.journeys.ts) extended to every operator page at 390 pixels with axe and overflow checks. |
| `MOBILE-002` | Native iOS and Android app | target | missing |  | not implemented |
| `PUB-001` | Web archive | target | done | `tests/campaign-results/archive.journeys.ts` · `tests/audience-import/erasure.spec.ts` |  |
| `PUB-002` | Paid newsletters | target | partial | `tests/go-live/roles.journeys.ts` · `tests/go-live/stripe-journey.ts` · `tests/go-live/paid-tier-journey.ts` · `tests/portability.spec.ts` · `tests/local-start/retained-archive.journey.ts` | Sandbox proof pending: the acceptance's Stripe test-mode checkout needs a held restricted test key (rk_test_) for Mango's Owner connection; the held test keys are unrestricted (sk_test_), which the connection refuses by design. Stripe Tax's test-account state is ct's 23 October source read, not a live-provider receipt from this round. The Nectar rail is not connected (INT-004). Policy ruled by ct (22 October 20:05Z): payment never creates or widens consent; a paid topic needs the reader's own confirmed channel consent, opt-out and suppression win, and a payer without it is counted as paid, consent missing and never mailed. Paid membership follows a fresh Stripe read for checkout completed, customer.subscription.* including paused/resumed, invoice.payment_failed and invoice.paid: active/trialing is paid; past_due, unpaid, paused, incomplete, incomplete_expired and canceled leave; a later active/trialing read rejoins. Read-start time orders overlapping reads, never the event's created second; equally fresh conflicting reads leave the paid topic. Failed Stripe reads remove paid eligibility, move the source-authority fence, record a failed operation and return a retryable refusal; the same event can recover after a successful fresh read. Cancellation ends paid membership only, while consent withdrawal stops every send on the channel. Immediate-confirmation card methods only; delayed methods are not supported. Paid writes move the source-authority fence, including a change after the final recheck. Mango stores Stripe ids, states and Stripe-reported tax, never card data or funds. Payer signup/consent capture is PUB-005's separate obligation under ct's approved 23 October 04:38Z defaults; its implementation status is PUB-005's own row. No real provider call, store, account or consent was used. |
| `PUB-003` | Recommendations | target | missing |  | not implemented |
| `PUB-004` | Direct sponsorships | target | missing |  | not implemented |
| `PUB-005` | Paid signup page and payer consent | target | done | `tests/go-live/roles.journeys.ts` · `tests/go-live/paid-signup-journey.ts` | Default ADOPTED, approved by ct 23 October 04:38Z: page only for an Owner-saved tier, displaying exact price/frequency before Checkout; newsletter consent is unchecked and separate from payment, recorded with timestamp, source and wording version when Checkout opens and authorizing only one confirmation per payer address per Checkout session. Already subscribed/confirmed needs no second confirmation. Never-confirmed payers receive no paid or free newsletters. Payment events never create or widen consent; unsubscribe and suppression win and resubscription requires the person’s own POST confirmation. Stripe hosts the card fields; Mango has none. Erasure follows the existing audit-fact rule and removes address and consent evidence. PUB-002’s restricted-key sandbox and Nectar gaps are separate; no real provider call or consent was used. |
| `AGENT-001` | Retention-gap finder | push-further | partial | `src/core/features/proposals/forecast.ts` · `src/core/features/proposals/service.ts` | acceptance not yet met: On a seeded store history with a missing post-purchase flow and a lapsed cohort, the agent's findings name both with counts that match the data, and cite the queries behind them. |
| `AGENT-002` | Journey proposal with holdout and stop rules | push-further | missing |  | not implemented |
| `AGENT-003` | Outcome judge | push-further | missing |  | not implemented |
| `AGENT-004` | Lifecycle failure diagnosis and repair | push-further | partial | `src/core/features/store/synchronize.ts` · `src/core/features/lifecycle/provider-outages.ts` | acceptance not yet met: With a simulated six-hour Shopify webhook outage, the agent reports the gap, lists the 37 missed checkouts, and its approved replay enrolls only those still relevant and not already messaged, sending nothing twice. |
| `AGENT-005` | Deliverability diagnostician | push-further | missing |  | not implemented |
| `AGENT-006` | Account audit | push-further | missing |  | not implemented |
| `AGENT-007` | Grounded content drafting | push-further | partial | `src/core/features/proposals/generation.ts` · `tests/proposals-decision/decision-routes.spec.ts` | acceptance not yet met: A drafted abandoned-cart email names only products and prices present in the catalog; a draft containing a claim not in the evidence is rejected as PROP-007 requires. |
| `AGENT-008` | Natural-language segments and questions | push-further | missing |  | not implemented |
| `AGENT-009` | Standing routines with memory | push-further | missing |  | not implemented |
| `AGENT-010` | Agent authority and guardrails | push-further | partial | `tests/proposals-decision/decision-routes.spec.ts` | acceptance not yet met: Attempts by an agent to approve, activate, send and change consent are each refused server-side with a named reason and logged; disabling the agent stops its next scheduled run. |
| `AGENT-011` | Migration agent | push-further | missing |  | not implemented |
| `MGMT-001` | Signed first-owner admission | published | partial | `src/core/features/auth/owner-claim.ts` | acceptance not yet met: Signed first-owner admission once per installation; hosted proof pending. |
| `MGMT-002` | Native owner editor | published | done | `tests/local-start/editor.journey.ts` |  |
