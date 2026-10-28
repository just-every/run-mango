# Mango target product contract

Mango is an email and SMS marketing platform for US ecommerce operators and creator-led businesses switching from Mailchimp, Klaviyo, ActiveCampaign or Kit. It grows consented audiences, prepares campaigns and lifecycle flows, sends through the owner’s providers and measures repeat purchases separately from forecasts and attributed revenue.

## Product target

| | |
| --- | --- |
| Category | Email marketing and marketing automation |
| Incumbents a buyer switches from | Mailchimp, Klaviyo, ActiveCampaign, Kit (ConvertKit) |
| Up-and-comers it must also beat | beehiiv, Customer.io, Omnisend |
| First buyer | A US ecommerce operator or creator-led business with 1,000–250,000 contacts, one brand and one to ten marketing operators; USD and an operator-selected IANA time zone, with US consent, privacy, carrier and sender rules |

The primary journey: Connect the business’s sources and sender, grow a consented audience, prepare and review an exact campaign or flow revision, schedule its eligible recipients, deliver through the chosen provider, and inspect recorded outcomes and measured retention lift.

## How to read this contract

- This follows the RER contract standard; Core is the first-week switching job plus push-further work, Agent surface offers those jobs to specialists, and Later retains uncommon work.
- Done means every acceptance point has asserting evidence; partial names delivered behavior and what remains, and missing means no delivered workflow.
- The Field proof register holds dated real-world proof that the repository cannot produce; it never blocks done.
- Base duties are cited once; Mango clauses describe their product-specific delta and door rules state repeated Mango rules.
- ACCEPTANCE.md, docs/CLAIMS.md and the status summary are generated from this file.

## Door rules

- **D-1.** Optional marketing modules. A disabled commerce, SMS or design module is unavailable, constructs or contacts no adapter and invents no facts, content, forecast or delivery. Commerce-dependent audience inclusion and exclusion remain blocked without their required current source; manual mail-only work uses recorded contact and permission evidence.
- **D-2.** Permission precedence. Audience selection, review, activation and every handoff honor current channel/topic permission, opt-out, suppression and surviving restrictions; an import, payment, source event or agent output never grants permission by itself.
- **D-3.** Exact marketing authority. A draft, preview, source outline or generated suggestion grants no delivery authority. A person’s campaign approval or flow activation binds its saved revision; an agent’s equivalent binding action carries commitment, adding external or live for exposure or a running service, and the company’s policy decides its disposition.

## Shared duties (Base)

| Base duty | Duty | Delta clauses | Base journey |
| --- | --- | --- | --- |
| BASE-ACCESS-001 | Sign-in | MGMT-001 | not run |
| BASE-ACCESS-002 | Sessions | OPER-001, OPER-003, CAMP-021, DESIGN-011, MGMT-001, MGMT-002, OPER-006 | not run |
| BASE-ACCESS-003 | Public endpoints | HOME-001, HOME-002, DOCS-001, CAMP-012, MSG-003, MSG-010, CONT-041, FORM-007, HEALTH-001 | not run |
| BASE-ACCESS-004 | Server-side authorisation | OPER-002, MGMT-001, OPER-004, INT-007 | not run |
| BASE-INPUT-001 | Validation | CONT-010, CONT-013, DESIGN-011, DESIGN-014, FORM-007, INT-007 | not run |
| BASE-INPUT-002 | HTML | MSG-009, MSG-016, BUILD-001, BUILD-010, BUILD-013, BUILD-014 | not run |
| BASE-INPUT-003 | Uploads | CAMP-012, BUILD-001 | not run |
| BASE-SECRET-001 | No leakage | DESIGN-011, SMS-008, PUSH-002, DELIV-008, DELIV-009, DELIV-010, INT-002, INT-015, INT-017, INT-018, PUB-002, HEALTH-001 | not run |
| BASE-SECRET-002 | Startup | DESIGN-001, DESIGN-006, FORM-013 | not run |
| BASE-DATA-001 | Export and import | CONT-030, CAMP-012, DESIGN-003, DATA-001, DATA-002, CONT-023, CONT-038, BUILD-002, FLOW-016 | not run |
| BASE-DATA-002 | Retention | CONT-012 | not run |
| BASE-DATA-003 | Erasure | CONT-013, CONT-029, CONT-030, CAMP-012, DESIGN-011, RESULT-009, OPER-007, CONT-036, CONT-021, CONT-023, INT-016, PUB-006 | not run |
| BASE-DATA-004 | Outbound flows | CONT-029, DESIGN-001, DESIGN-005, DESIGN-002, DESIGN-003, DESIGN-014, CONT-037, BUILD-003, INT-015, INT-018, MAIL-001 | not run |
| BASE-DATA-005 | Independence | HOME-002, DESIGN-005, RESULT-010, INT-018, MAIL-001 | not run |
| BASE-PUBLIC-001 | Privacy | HOME-001, HOME-002, DOCS-001, CAMP-012, CONT-016, CONT-018, CONT-032, CONT-033, CONT-037, FORM-004, PUB-001 | not run |
| BASE-PUBLIC-002 | Origins | CONT-018, CONT-031, FORM-001, FORM-002 | not run |
| BASE-PUBLIC-003 | Accessibility | HOME-002 | not run |
| BASE-OPS-001 | Health | HEALTH-001 | not run |
| BASE-OPS-002 | Migrations | none | not run |
| BASE-OPS-003 | Idempotency | STORE-002, CONT-006, CONT-007, DESIGN-003, MSG-003, SEND-001, SEND-005, SEND-008, FLOW-006, FLOW-010, SMS-001, DELIV-007, DELIV-010, INT-002, INT-007, INT-008, INT-017, INT-018, INT-019 | not run |
| BASE-OPS-004 | Failure is visible | STORE-003, STORE-004, PROP-007, DESIGN-007, SEND-004, SEND-009, CONT-022, FORM-010, INT-008, INT-020 | not run |
| BASE-OPS-005 | Audit | PROP-009, CAMP-001, DESIGN-003, AUD-008, AUD-009, CAMP-014, CAMP-019, DELIV-009, INT-016 | not run |
| BASE-ROLE-001 | Roles through every door | OPER-001, MGMT-002, OPER-004, CONT-017, CONT-031, CONT-025, CONT-026, CAMP-019, MSG-015, FORM-012, FORM-013, SMS-008, DELIV-008, MOBILE-002 | not run |
| BASE-AUDIT-001 | Searchable, durable audit | OPER-003, OPER-004, OPER-006, OPER-007, CONT-031, CONT-021, CONT-038, CONT-040, CONT-025, CONT-026, MSG-015, FORM-012, FORM-013, FORM-010, FLOW-008, MOVE-025 | not run |
| BASE-BACKUP-001 | Independent backup, restore and rollback | none | not run |
| BASE-DATA-006 | Erasure respects retention and legal hold | none | not run |
| BASE-SIGNIN-001 | Standards-based SSO and lifecycle | OPER-002, OPER-006 | not run |
| BASE-SIGNIN-002 | Native multi-factor authentication | none | not run |
| BASE-INSTALL-001 | Free self-host and removal | none | not run |
| BASE-MAIL-001 | Truthful mail outcomes | CONT-006, CONT-009, SEND-001, SEND-004, SEND-006, SEND-007, SEND-008, SEND-009, RESULT-009, SMS-001, DELIV-001, DELIV-007, DELIV-009, DELIV-010, REPORT-006, MAIL-001 | not run |
| BASE-ACCESSIBILITY-001 | One accessibility bar | HOME-002, DOCS-001, FORM-002, BUILD-001, FLOW-001, MOBILE-001 | not run |
| BASE-DOCS-001 | On-site docs from one contract | DOCS-001 | not run |
| BASE-AGENT-001 | One MCP door per seed | SURFACE-001 | not run |
| BASE-AGENT-002 | The seed's jobs are tools, through the UI's own actions | SURFACE-001, SURFACE-008, AGENT-007 | not run |
| BASE-AGENT-003 | Records are resources | SURFACE-001, SURFACE-002, SURFACE-007, SURFACE-009, AGENT-001, AGENT-006, AGENT-008, AGENT-011 | not run |
| BASE-AGENT-004 | Business identity and short-lived, audience-bound tokens | SURFACE-003 | not run |
| BASE-AGENT-005 | An agent acts as a person in a role, never more | SURFACE-004, AGENT-010 | not run |
| BASE-AGENT-006 | Every action declares its risk class | PROP-005, OPER-005, CAMP-017, FLOW-008, SURFACE-002, SURFACE-003, SURFACE-004, SURFACE-005, SURFACE-006, SURFACE-008, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-007, AGENT-008, AGENT-010, AGENT-011 | not run |
| BASE-AGENT-007 | The company's policy decides, at one chokepoint | PROP-005, OPER-005, CAMP-017, BUILD-004, FLOW-008, SURFACE-002, SURFACE-003, SURFACE-004, SURFACE-005, SURFACE-006, SURFACE-008, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, AGENT-009, AGENT-010, AGENT-011 | not run |
| BASE-AGENT-008 | Truthful attribution | PROP-005, SURFACE-003, SURFACE-005, AGENT-002, AGENT-010 | not run |
| BASE-AGENT-009 | Every agent action is audited with its class and decision | OPER-007, SURFACE-008, AGENT-010 | not run |
| BASE-AGENT-010 | Agents can follow changes | SURFACE-007, SURFACE-009 | not run |
| BASE-AGENT-011 | Limits are policy, and Pause stops everything | SURFACE-004, AGENT-001, AGENT-009, AGENT-010 | not run |
| BASE-AGENT-012 | Writes are idempotent and conflict-safe | SURFACE-006, SURFACE-009, AGENT-004 | not run |
| BASE-AGENT-013 | Manifest, docs and the conformance journey | SURFACE-001, SURFACE-007, SURFACE-008, SURFACE-009 | not run |

## Published clauses

- `HOME-001`: *Tier:* Core · *Cites:* BASE-PUBLIC-001, BASE-ACCESS-003
- `HOME-002`: *Tier:* Core · *From:* HOME-001 · *Cites:* BASE-PUBLIC-001, BASE-DATA-005, BASE-PUBLIC-003, BASE-ACCESS-003, BASE-ACCESSIBILITY-001 · *Register:* R-801, R-802
- `DOCS-001`: *Tier:* Core · *Cites:* BASE-DOCS-001, BASE-PUBLIC-001, BASE-ACCESS-003, BASE-ACCESSIBILITY-001 · *Register:* R-801, R-802
- `OPER-001`: *Tier:* Core · *Cites:* BASE-ACCESS-002, BASE-ROLE-001
- `OPER-002`: *Tier:* Core · *Cites:* BASE-ACCESS-004, BASE-SIGNIN-001
- `OPER-003`: *Tier:* Core · *Cites:* BASE-ACCESS-002, BASE-AUDIT-001
- `STORE-001`: *Tier:* Core · *Rules:* D-1
- `STORE-002`: *Tier:* Core · *Cites:* BASE-OPS-003 · *Rules:* D-1
- `STORE-003`: *Tier:* Core · *Cites:* BASE-OPS-004 · *Rules:* D-1
- `STORE-004`: *Tier:* Core · *Cites:* BASE-OPS-004 · *Rules:* D-1
- `STORE-005`: *Tier:* Core · *Rules:* D-1
- `STORE-006`: *Tier:* Core · *Rules:* D-1
- `STORE-007`: *Tier:* Core · *Rules:* D-1
- `CONT-001`: *Tier:* Core · *Rules:* D-2
- `CONT-002`: *Tier:* Core · *Rules:* D-2
- `CONT-003`: *Tier:* Core · *Rules:* D-2
- `CONT-004`: *Tier:* Core · *Rules:* D-2
- `CONT-005`: *Tier:* Core · *Rules:* D-2
- `CONT-006`: *Tier:* Core · *Cites:* BASE-OPS-003, BASE-MAIL-001 · *Rules:* D-2
- `CONT-007`: *Tier:* Core · *Cites:* BASE-OPS-003 · *Rules:* D-2
- `CONT-008`: *Tier:* Core · *Rules:* D-2
- `CONT-009`: *Tier:* Core · *Cites:* BASE-MAIL-001 · *Rules:* D-2
- `CONT-028`: *Tier:* Core · *From:* CONT-005, CONT-009 · *Rules:* D-2
- `CONT-010`: *Tier:* Core · *Cites:* BASE-INPUT-001 · *Rules:* D-2
- `CONT-011`: *Tier:* Core · *Rules:* D-2
- `CONT-012`: *Tier:* Core · *Cites:* BASE-DATA-002 · *Rules:* D-2
- `CONT-013`: *Tier:* Core · *Cites:* BASE-DATA-003, BASE-INPUT-001 · *Rules:* D-2
- `CONT-029`: *Tier:* Core · *From:* CONT-013 · *Cites:* BASE-DATA-003, BASE-DATA-004 · *Rules:* D-2
- `CONT-030`: *Tier:* Core · *From:* CONT-013 · *Cites:* BASE-DATA-003, BASE-DATA-001 · *Rules:* D-2
- `PROP-001`: *Tier:* Core · *Rules:* D-1
- `PROP-002`: *Tier:* Core · *Rules:* D-1
- `PROP-003`: *Tier:* Core · *Rules:* D-1
- `PROP-004`: *Tier:* Core · *Rules:* D-1
- `PROP-005`: *Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008 · *Rules:* D-1
- `PROP-006`: *Tier:* Core · *Rules:* D-1
- `PROP-007`: *Tier:* Core · *Cites:* BASE-OPS-004 · *Rules:* D-1
- `PROP-008`: *Tier:* Core · *Rules:* D-1
- `PROP-009`: *Tier:* Core · *Cites:* BASE-OPS-005 · *Rules:* D-1
- `AUD-001`: *Tier:* Core · *Rules:* D-2
- `AUD-002`: *Tier:* Core · *Rules:* D-2
- `AUD-003`: *Tier:* Core · *Rules:* D-2
- `AUD-004`: *Tier:* Core · *Rules:* D-2
- `AUD-005`: *Tier:* Core · *Rules:* D-2
- `AUD-006`: *Tier:* Core · *Rules:* D-2
- `AUD-007`: *Tier:* Core · *Rules:* D-2
- `CAMP-001`: *Tier:* Core · *Cites:* BASE-OPS-005 · *Rules:* D-1, D-3
- `CAMP-002`: *Tier:* Core · *Rules:* D-1, D-3
- `AUD-010`: *Tier:* Core · *From:* AUD-001, CAMP-002 · *Rules:* D-2
- `CAMP-020`: *Tier:* Core · *From:* CAMP-002 · *Rules:* D-1, D-3
- `CAMP-021`: *Tier:* Core · *From:* CAMP-002 · *Cites:* BASE-ACCESS-002 · *Rules:* D-1, D-3
- `CAMP-003`: *Tier:* Core · *Rules:* D-1, D-3
- `CAMP-022`: *Tier:* Core · *From:* CAMP-003 · *Rules:* D-1, D-3
- `CAMP-004`: *Tier:* Core · *Rules:* D-1, D-3
- `CAMP-005`: *Tier:* Core · *Rules:* D-1, D-3
- `CAMP-006`: *Tier:* Core · *Rules:* D-1, D-3
- `CAMP-007`: *Tier:* Core · *Rules:* D-1, D-3
- `CAMP-008`: *Tier:* Core · *Rules:* D-1, D-3
- `CAMP-009`: *Tier:* Core · *Rules:* D-1, D-3
- `CAMP-010`: *Tier:* Core · *Rules:* D-1, D-3
- `CAMP-011`: *Tier:* Core · *Rules:* D-1, D-3
- `CAMP-012`: *Tier:* Core · *Cites:* BASE-ACCESS-003, BASE-INPUT-003, BASE-DATA-001, BASE-DATA-003, BASE-PUBLIC-001 · *Rules:* D-1, D-3 · *Register:* R-202
- `CAMP-023`: *Tier:* Core · *From:* CAMP-012 · *Rules:* D-1, D-3 · *Register:* R-202
- `DESIGN-001`: *Tier:* Core · *Cites:* BASE-SECRET-002, BASE-DATA-004 · *Rules:* D-1 · *Register:* R-203
- `DESIGN-005`: *Tier:* Core · *From:* DESIGN-001 · *Cites:* BASE-DATA-004, BASE-DATA-005 · *Rules:* D-1 · *Register:* R-203
- `DESIGN-006`: *Tier:* Core · *From:* DESIGN-001 · *Cites:* BASE-SECRET-002 · *Rules:* D-1 · *Register:* R-203
- `DESIGN-002`: *Tier:* Core · *Cites:* BASE-DATA-004 · *Rules:* D-1
- `DESIGN-007`: *Tier:* Core · *From:* DESIGN-002 · *Cites:* BASE-OPS-004 · *Rules:* D-1
- `DESIGN-008`: *Tier:* Core · *From:* DESIGN-002 · *Rules:* D-1
- `DESIGN-009`: *Tier:* Core · *From:* DESIGN-002 · *Rules:* D-1
- `DESIGN-010`: *Tier:* Core · *From:* DESIGN-002 · *Rules:* D-1
- `DESIGN-003`: *Tier:* Core · *Cites:* BASE-DATA-001, BASE-DATA-004, BASE-OPS-003, BASE-OPS-005 · *Rules:* D-1
- `DESIGN-011`: *Tier:* Core · *From:* DESIGN-003 · *Cites:* BASE-ACCESS-002, BASE-SECRET-001, BASE-INPUT-001, BASE-DATA-003 · *Rules:* D-1
- `DESIGN-004`: *Tier:* Core · *Rules:* D-1 · *Register:* R-201
- `DESIGN-012`: *Tier:* Core · *From:* DESIGN-004 · *Rules:* D-1 · *Register:* R-201
- `DESIGN-013`: *Tier:* Core · *From:* DESIGN-004 · *Rules:* D-1
- `DESIGN-014`: *Tier:* Core · *From:* DESIGN-004 · *Cites:* BASE-INPUT-001, BASE-DATA-004 · *Rules:* D-1
- `MSG-001`: *Tier:* Core
- `MSG-002`: *Tier:* Core
- `MSG-003`: *Tier:* Core · *Cites:* BASE-ACCESS-003, BASE-OPS-003
- `MSG-004`: *Tier:* Core
- `MSG-005`: *Tier:* Core
- `MSG-006`: *Tier:* Core
- `MSG-007`: *Tier:* Core
- `MSG-008`: *Tier:* Core
- `MSG-009`: *Tier:* Core · *Cites:* BASE-INPUT-002
- `MSG-010`: *Tier:* Core · *Cites:* BASE-ACCESS-003
- `MSG-011`: *Tier:* Core
- `MSG-012`: *Tier:* Core
- `MSG-016`: *Tier:* Core · *From:* MSG-009, MSG-012 · *Cites:* BASE-INPUT-002
- `SEND-001`: *Tier:* Core · *Cites:* BASE-OPS-003, BASE-MAIL-001 · *Rules:* D-2, D-3
- `SEND-002`: *Tier:* Core · *Rules:* D-2, D-3
- `SEND-003`: *Tier:* Core · *Rules:* D-2, D-3
- `SEND-004`: *Tier:* Core · *Cites:* BASE-OPS-004, BASE-MAIL-001 · *Rules:* D-2, D-3
- `SEND-005`: *Tier:* Core · *Cites:* BASE-OPS-003 · *Rules:* D-2, D-3
- `SEND-006`: *Tier:* Core · *Cites:* BASE-MAIL-001 · *Rules:* D-2, D-3
- `SEND-007`: *Tier:* Core · *Cites:* BASE-MAIL-001 · *Rules:* D-2, D-3
- `SEND-008`: *Tier:* Core · *Cites:* BASE-OPS-003, BASE-MAIL-001 · *Rules:* D-2, D-3
- `SEND-009`: *Tier:* Core · *Cites:* BASE-OPS-004, BASE-MAIL-001 · *Rules:* D-2, D-3
- `RESULT-001`: *Tier:* Core
- `RESULT-002`: *Tier:* Core
- `RESULT-003`: *Tier:* Core
- `RESULT-004`: *Tier:* Core
- `RESULT-005`: *Tier:* Core
- `RESULT-009`: *Tier:* Core · *From:* RESULT-005 · *Cites:* BASE-DATA-003, BASE-MAIL-001
- `RESULT-010`: *Tier:* Core · *From:* RESULT-005 · *Cites:* BASE-DATA-005
- `RESULT-006`: *Tier:* Core
- `DATA-001`: *Tier:* Core · *Cites:* BASE-DATA-001
- `DATA-002`: *Tier:* Core · *From:* DATA-001 · *Cites:* BASE-DATA-001
- `MGMT-001`: *Tier:* Core · *Cites:* BASE-ACCESS-001, BASE-ACCESS-002, BASE-ACCESS-004
- `MGMT-002`: *Tier:* Core · *Cites:* BASE-ACCESS-002, BASE-ROLE-001

### Home

#### HOME-001 — Installation Lobby

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
5. Inactivity never unsubscribes or suppresses a contact; clearing a dormant list is an operator action.

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

**Requirement.** The Decision Desk presents the highest-ranked proposed work first.

**Acceptance.**
1. The Decision Desk lists only proposed proposals.
2. The ordering policy ranks by expected revenue when this deployment has enough of its own attribution history (RESULT-003), then by the earliest send-by instant; proposals with neither rank last.

#### PROP-002 — Evidence

**Requirement.** A proposal makes the source evidence and reasoning behind its audience, timing and forecasts inspectable.

**Acceptance.**
1. The proposal names its triggering source events, lookback window and source-data as-of time.
2. It shows the inclusion rule and exclusion rule.
3. It shows the send-by instant, proposed channels and each step instant.
4. Every forecast or confidence label names its method.

#### PROP-003 — Counts

**Requirement.** Proposal counts distinguish the successive audience populations and the channel work they imply.

**Acceptance.**
1. A proposal distinguishes candidate, excluded and eligible contact counts.
2. It reports per-channel recipient-step counts, and labels no count recipients before exclusions have been applied.

#### PROP-004 — Content

**Requirement.** A proposal provides an editable draft and a preview for every selected channel.

**Acceptance.**
1. The campaign name, email subject and email body are editable.
2. When SMS is proposed its body is editable.
3. The sender identity and destination links are editable.
4. Each selected channel has a preview of its saved content.

#### PROP-005 — Owner control

**Requirement.** A generated proposal preserves draft provenance and exact-revision control. An agent’s scheduling or sending call carries external, with money when it incurs provider spend; the company’s policy decides that call. A person’s campaign approval binds the particular saved revision they approved.

**Acceptance.**
1. Creating or adopting a generated proposal creates an editable draft without itself scheduling or sending.
2. Under a company policy that holds activation for approval, the particular saved revision runs only after the named person approves it.

#### PROP-006 — Grounded generation

**Requirement.** Generated audience explanations, timing claims and forecasts are grounded in this deployment’s imported store data and configured knowledge.

**Acceptance.**
1. Generation uses only the deployment’s imported store data and configured knowledge as evidence.
2. A claim not derivable from that evidence is rejected and the proposal is failed under PROP-007.
3. Rejected generation is not replaced with generic marketing copy.

#### PROP-007 — Generation failure

**Requirement.** Invalid or overdue generation fails visibly while preserving existing work.

**Acceptance.**
1. Invalid output from the configured AI provider fails the proposal with its provider error.
2. A configured AI provider that does not complete within 60 seconds fails the proposal with its provider error.
3. Failure creates no semantic substitute and leaves existing proposals and campaigns unaffected.

#### PROP-008 — Forecast provenance

**Requirement.** Forecasts distinguish this deployment’s own measured history from insufficient evidence.

**Acceptance.**
1. Every revenue, recovery-rate and confidence figure identifies the deployment’s own campaigns and store events behind it, with their counts.
2. No forecast presents a benchmark from another store.
3. Insufficient own history is stated explicitly instead of a displayed range.

#### PROP-009 — Proposal states

**Requirement.** The proposal lifecycle records decisions and fences competing or expired decisions.

**Acceptance.**
1. A proposal is proposed, approved when a revision is approved and its campaign exists, dismissed with a recorded reason, expired after its send-by instant, or failed under PROP-007.
2. Only a proposed proposal can be approved or dismissed.
3. Each transition records its actor and time once.

### Audiences

#### AUD-001 — Review snapshot

**Requirement.** Campaign review makes the frozen audience and its exclusions inspectable.

**Acceptance.**
1. Review shows the audience rule and its as-of time.
2. It shows candidate count, each exclusion reason with its count, and eligible contact count.
3. It shows recipient-step count separately for each channel.

#### AUD-002 — Consent and suppression

**Requirement.** Channel consent and suppression take precedence over any audience inclusion.

**Acceptance.**
1. Pending, non-subscribed, unsubscribed and suppressed contacts are excluded on that channel, regardless of segment membership or an operator-authored inclusion rule.

#### AUD-003 — Commerce and dormancy exclusions

**Requirement.** Product review explains commerce and dormancy exclusions. AUD-008 governs campaign inactivity controls.

**Acceptance.**
1. Review lists every audience-policy exclusion with its reason and count.
2. The default excludes a contact for seven days after buying that campaign’s product, while its refund or return is unresolved, and while dormant under CONT-012’s twelve-month window.
3. Resolved commerce and eleven-month activity remain eligible; thirteen-month activity is dormant.

#### AUD-004 — Frequency protection

**Requirement.** Frequency protection excludes a recipient from the current step rather than silently rescheduling it. AUD-009 governs overrides and the combination with FLOW-014 caps.

**Acceptance.**
1. A contact inside the channel’s frequency window is excluded from that step with a frequency-window reason and is never silently deferred.
2. The default windows are 24 hours since the last marketing email and 72 hours since the last marketing SMS.

#### AUD-005 — Dispatch recheck

**Requirement.** Dispatch evaluates current eligibility throughout the provider hand-off boundary.

**Acceptance.**
1. Eligibility is recalculated when step dispatch begins and immediately before each provider hand-off.
2. A purchase, refund, opt-out, bounce, complaint, consent change, merge or frequency-window change after approval prevents that delivery and records its exclusion reason.
3. Every audience source still satisfies STORE-005; a failed refresh or stale source pauses its affected channel before any further hand-off, and only a successful refresh permits resumption.

#### AUD-006 — Multi-step exit

**Requirement.** Every later step applies its own current inclusion and exclusion rules to the frozen audience.

**Acceptance.**
1. A conversion or other loss of eligibility after an earlier step prevents every later affected step.
2. After the first send, changes to inclusion, a custom exclusion and consent yield named skips at the second step, with only the still-eligible control sent.
3. A contact newly matching the rule remains outside the frozen audience.

#### AUD-007 — Frozen candidate set

**Requirement.** Approval fixes the campaign’s candidates without disabling dispatch-time exclusions under AUD-005.

**Acceptance.**
1. Approval freezes the candidate set resolved at that instant; contacts first matching later are not added.
2. Each contact creates at most one recipient-step per channel per step even when matching the rule more than once.

### Campaigns

#### CAMP-001 — States

**Requirement.** A campaign’s lifecycle distinguishes editable work, dispatch progress, stops and terminal outcomes.

**Acceptance.**
1. The states are draft with nothing scheduled, scheduled with an approved revision and future step, dispatching once hand-off begins, paused under SEND-009, completed under SEND-007, canceled under CAMP-009, or failed when the first step misses its deadline because its required provider or sender registration is unavailable.
2. Each transition records its actor or acting feature and its time, and an invalid transition is rejected.

#### CAMP-002 — Draft editing

**Requirement.** An operator can persist the complete draft without losing an otherwise valid email to a character-count limit.

**Acceptance.**
1. Draft edits persist the campaign name, channels, audience rule, message content, sender identity, links and schedule.
2. An email within BUILD-012’s sent-size limit saves; one above it is refused with its measured size and limit, without truncation.

### Audiences — Derived audience rule summaries

#### AUD-010 — Derived audience rule summaries

**Requirement.** Every displayed audience explanation derives from the rules that actually select recipients.

**Acceptance.**
1. Review, approval checks, scheduled pages, campaign lists and audience snapshots show the plain-text summary derived from the inclusion and exclusion rules.
2. The summary includes every condition, comparison, value and lookback, with editor field labels and explicit all-or-any matching.
3. The composer shows that summary live instead of authoring audience prose; each new saved revision stores it and ignores caller-supplied audience text as authority.
4. Earlier revisions display the derived summary without rewriting immutable approvals; readiness requires valid structured rules and approval binds the exact saved rules.

### Campaigns — Live audience authoring counts

#### CAMP-020 — Live audience authoring counts

**Requirement.** Audience controls always show counts for the newest structured rule and its real source evidence.

**Acceptance.**
1. Editing inclusion and exclusion controls changes the versioned structured rules and refreshes counts from real contacts and recorded source evidence.
2. Missing or stale required commerce shows unavailable counts.
3. An older in-flight count request cannot replace the result for a newer rule.

#### CAMP-021 — Start and adopt newsletters

**Requirement.** An operator can start a newsletter without optional providers and reuse existing proposal work.

**Acceptance.**
1. A signed-in operator reaches the same editable Review within three clicks from Campaigns by choosing a blank newsletter without AI or commerce, or an available starter from this deployment’s real store signals.
2. Decision Desk Use this reuses the linked campaign or atomically adopts an unlinked, unexpired proposal once.
3. Creating, selecting and saving do not themselves approve or enqueue delivery; incomplete drafts can save while approval names missing content.
4. Rich text is the initial editor and retains unstyled markup; HTML mode preserves allowed authored markup, and images or presentation use HTML mode without fetching remote images.

#### CAMP-003 — Revision preview

**Requirement.** Approval previews represent the exact saved message.

**Acceptance.**
1. Desktop, mobile and plain-text previews render the saved revision that will be approved.
2. The previews include resolved personalization examples and the compliance footer or SMS opt-out text that will be sent.
3. Saved-revision previews preserve validated styles; a body the checker refuses appears unstyled with its warning.

#### CAMP-022 — Canonical saved email bytes

**Requirement.** One canonical saved body is the authority for preview, checking and exact-revision approval.

**Acceptance.**
1. Create and save normalize the managed unsubscribe and postal footer once and derive plain text with actual destination URLs from that saved body.
2. The body is parsed as mail clients read an HTML body with scripting off, then serialized until its written form reparses to itself; a save of that result or its editor form stores identical bytes.
3. Normalization preserves kept attribute values and styles, comments and personalization tokens, never repairs refused markup and never refuses merely noncanonical authoring syntax.
4. Parser-discarded structure is absent exactly as for recipients: the first duplicate attribute survives, closing-tag attributes and ignored misplaced tags are absent, and the checker judges the stored tree.
5. Leading newlines in preformatted controls and unclosed plaintext settle without growing or moving the footer; a form that has not settled after sixteen rounds is refused rather than saved unstably.
6. All newly saved drafts, including older drafts saved through other field edits, use this canonical form; plain text comes from the same parse.

#### CAMP-004 — Approval checks

**Requirement.** Approval either validates all sending prerequisites together or leaves the campaign in draft with every blocker visible.

**Acceptance.**
1. Approval atomically validates audience, consent, source freshness including MOVE-013 parallel-run freshness, sender registration, email authentication and MSG-011 reputation.
2. It also validates compliance content, personalization, MSG-006 and MSG-013 to MSG-015 links, schedule and provider configuration.
3. The sender provides the effective deduplication and provider reconciliation SEND-001 and SEND-008 require.
4. Any failed check leaves the campaign a draft and names every blocking check.
5. Missing subject, body, preheader or sender remains a named blocker; optional AI or commerce absence does not block manually authored mail-only rules, while required source dependencies still block.

#### CAMP-005 — Idempotent approval

**Requirement.** Approval retries do not duplicate scheduled work.

**Acceptance.**
1. Repeated requests for the same campaign and revision produce one scheduled campaign, one set of steps and one set of recipient-steps regardless of request count.

#### CAMP-006 — Schedule

**Requirement.** Every schedule retains an unambiguous local time and its resolved instant.

**Acceptance.**
1. Each step stores its IANA time zone and resolved UTC instant.
2. A nonexistent or ambiguous daylight-saving local time is rejected until an unambiguous instant is chosen.
3. The default resolves the operator-selected local time in the store time zone.
4. Local dates use the configured IANA store zone independently of the browser zone, and resolved UTC fields are read-only; the deadline defaults to 23:59 on the chosen local day.
5. UI and API refuse nonexistent and ambiguous times, including non-hour daylight-saving transitions.
6. Existing clients may still supply an explicit instant with its IANA zone; supplied local and UTC values must agree.

#### CAMP-007 — Scheduled edits

**Requirement.** Editing a scheduled campaign preserves its approved work until a replacement is approved, and cannot rewrite a dispatch already begun.

**Acceptance.**
1. An edit creates a draft revision while the approved revision remains active.
2. Replacement approval atomically makes the new revision the only active schedule and cancels every prior pending recipient-step.
3. After any step begins dispatching, an edit creates a different campaign; the original campaign and later steps stay active until explicitly canceled.

#### CAMP-008 — Test send

**Requirement.** Test sends remain visibly separate from audience delivery and campaign results. CAMP-019 governs typed destinations.

**Acceptance.**
1. A test goes only to configured operator test email addresses or phone numbers, or the typed destinations admitted under CAMP-019.
2. Test content and campaign history identify it as a test.
3. A test changes no contact activity, reporting, attribution or frequency protection.

#### CAMP-009 — Cancellation

**Requirement.** Cancellation distinguishes stopped work from provider hand-offs and uncertainty.

**Acceptance.**
1. Canceling scheduled, dispatching or paused work stops every step and recipient-step confirmed not handed off within 30 seconds.
2. Provider-confirmed hand-offs remain separate; in-flight requests stay uncertain until SEND-008 reconciliation, without a claim to recall delivered mail.
3. Campaign detail shows the time remaining until the next step dispatches.

#### CAMP-010 — Step deadline

**Requirement.** Steps never begin sending after their send-by deadline.

**Acceptance.**
1. Each step has a send-by instant defaulting to the end of its scheduled local day.
2. A recipient-step not handed off by that instant is skipped with a deadline-passed reason.
3. A step whose deadline passed before dispatch begins sends nothing.

#### CAMP-011 — Dispatch punctuality

**Requirement.** The scheduler starts each due step promptly and once.

**Acceptance.**
1. Dispatch begins within 60 seconds of the step’s resolved UTC instant.
2. Two scheduler runs still dispatch that step instant exactly once.

#### CAMP-012 — Campaign images

**Requirement.** Campaign images preserve the bytes of an approved revision throughout their lifecycle. Public image serving is the authorized exception to BASE-INPUT-003’s session-bound download duty.

**Acceptance.**
1. A signed-in operator can upload complete JPEG, PNG, GIF or WebP within the declared byte and pixel limits; the file header determines its type, and refused input stores nothing.
2. An image is stored once by its SHA-256 and its bytes remain immutable.
3. Erasing an identified contact removes an image holding that contact’s identifier; the erased image then answers gone and blocks approval.
4. Public image serving uses the exact content type, no-sniff protection, a sandboxed no-content-execution policy and immutable public caching; an unknown image is not found.
5. The declared per-image rate bound returns a rate refusal without affecting other images or varying by client address.
6. Serving records nothing identifying its requester.
7. DATA-001 exports each image as its original file.
8. Image delivery is not an open-tracking signal; pending erasure or restore makes it unavailable, and restoration to a different origin preserves the saved absolute image address.

#### CAMP-023 — Insert and preview campaign images

**Requirement.** The editor can insert a scaled image and preview local-copy assets without granting them sending authority.

**Acceptance.**
1. Insert image uploads one file, requires its description, and inserts it at the cursor with header-derived proportions scaled to at most the 600-pixel email width.
2. The image response supplies its public address; the stored-type file extension serves the same bytes and a different extension is not found.
3. A local computer’s own HTTP-origin media images save and preview with validated styles after image opt-in; other HTTP origins remain refused.
4. Approval, test send and delivery refuse those local HTTP images with the named HTTPS requirement; HTTPS deployments are unaffected.

### Designs

#### DESIGN-001 — Optional design module

**Requirement.** Design generation is optional and uses only an intentionally configured owner connection.

**Acceptance.**
1. With neither design key nor origin the module is disabled; supplying either enables the connection and requires both.
2. The origin is HTTPS without a path, except that a local computer may use loopback HTTP.
3. Disabled design generation constructs no provider, shows no generation control, contacts no design service and refuses runs with an unavailable explanation naming its inputs.
4. Enabled generation uses the owner’s key only when an operator starts a run or chooses a candidate.

#### DESIGN-005 — Owner-selected design provider

**Requirement.** Supersedes BASE-DATA-005 only for the owner-configured default-off design provider under the recorded 13 October 2026 decision. This is an operator-commissioned provider connection on the owner’s account, with candidate work, chosen layouts and resumption of those same runs carrying only DESIGN-003’s data.

**Acceptance.**
1. With the module absent no request goes to 12ui; enabled requests occur only for an operator’s design run, never at startup, on an independent schedule or for unrelated deployment activity.
2. A provider refusal or outage fails only that run.
3. An operator with design-authoring rights may commission within the provider wallet and allowance; Mango shows each paid-step estimate and records the request. Business limits and spend caps follow the company’s policy.
4. The owner is told that the brief and selected image reach 12ui and its declared subprocessors, may remain in its evaluation corpus until owner-requested deletion, and reveal when this installation designs email.

#### DESIGN-006 — Optional design deployment credentials

**Requirement.** Local and hosted installations can intentionally configure the default-off design connection.

**Acceptance.**
1. Local copies read both optional design inputs from private local settings; hosted deployment uploads a supplied optional secret on first or later deploy, never requires it and retains it on later deploys.
2. Verification runs with design inputs absent keep the module disabled.
3. The local design consumer processes design work only; unrelated queued commands remain unconsumed for retry.

#### DESIGN-002 — Draft-only design generation

**Requirement.** A draft’s editor can commission designs from an editable brief and see paid work progress.

**Acceptance.**
1. The editable brief starts from the draft’s name, subject, preheader, sender name and current text; it requests two to four designs.
2. Before drawing candidates or preparing a chosen layout, the operator sees the estimated spend on their design-service account.
3. The run belongs to the draft and continues in the background; candidates appear as delivered and reappear after reload.

#### DESIGN-007 — Design provider retries and deadlines

**Requirement.** Design runs settle predictably when the provider holds, refuses or stops answering.

**Acceptance.**
1. Every request is bounded: 30 seconds ordinarily, 60 seconds for downloads and 150 seconds for a candidate purchase.
2. A rate refusal naming a retry time waits until that time with the same purchase key and visible relative-time notice that remains until the next answer; a wait beyond the run deadline fails as quota.
3. A refusal without a retry time or an empty wallet fails immediately as quota; network, server and request-timeout failures retry at most three passes five and ten seconds apart, then visibly fail unavailable.
4. A refused key or request, unreadable answer, forbidden redirect, failed design or expired layout fails with its specific safe Mango reason.
5. Minute scheduling and reading a draft both fail overdue runs; scheduling also resumes live work quiet for two minutes unless awaiting the provider’s declared retry time.
6. A new run cannot start while another of that draft waits on the provider; a design already offered may still prepare its layout.

#### DESIGN-008 — Save generated design through ordinary authoring

**Requirement.** Generated design bodies follow the normal draft lifecycle.

**Acceptance.**
1. The generated body reaches the editor in the canonical form ordinary saving stores.
2. A run itself does not save, approve, schedule or send; an operator’s Save uses the ordinary draft-save path and all approval checks still apply.
3. A failed or overdue run visibly states Mango’s reason and leaves the draft unchanged, without substituting content the service did not deliver.

#### DESIGN-009 — Apply a chosen design without stealing focus

**Requirement.** Choosing a candidate leads into design import without interrupting unrelated editing.

**Acceptance.**
1. Use this design appears beside each candidate image and fetches the selected layout through DESIGN-004’s import path.
2. Import opens automatically only as a continuation of that choice while the operator has done nothing else; otherwise a ready notice offers an action without opening over work or stealing focus.
3. The browser-built result uses hosted campaign photos, the operator’s HTTPS button destination and the managed footer, highlighting every design line absent from the brief.
4. The result is an unsaved body edit that replaces prior content only after confirmation.

#### DESIGN-010 — Keep paid design candidates

**Requirement.** Paid designs remain recoverable until used or discarded.

**Acceptance.**
1. Runs and candidates remain available until the draft is saved with the design or they are discarded; discarding an edit, reloading, a failed layout and a new run do not lose paid designs.
2. Reusing the same prepared design buys nothing again.
3. A failed layout identifies its failed step and whether allowance or wallet caused it, and offers a newly paid retry or another design.
4. Earlier runs’ designs remain reachable under the latest run.
5. When the service holds a run, the editor states why and when Mango will ask again until the service answers.

#### DESIGN-003 — Design data and records

**Requirement.** The design connection discloses only commissioned design material, avoids repurchasing retries and retains its authoring record.

**Acceptance.**
1. The service receives only Mango’s fixed email-layout description with the operator’s brief stripped of every personalization token, then only the chosen candidate image; no contact, audience or personalization value or token is sent.
2. Every paid request has a run-derived idempotency key; a retry or replay buys nothing again.
3. The retained run records the brief, provider run and layout identifiers, each candidate’s outcome, SHA-256 and size, chosen candidate, operator, times and safe failure code, and is never deleted.
4. Candidate images and layouts are retained as authoring evidence and exported under DATA-001.
5. Each paid request records its RESULT-004 cost fact.

#### DESIGN-011 — Design provider custody

**Requirement.** Untrusted provider outputs remain bounded and private until their selected crops become campaign images.

**Acceptance.**
1. JSON answers are streamed within 64 KB; candidate PNG downloads within 40 MB and 4,096 pixels per side, with over-declared lengths refused unread.
2. A layout matches the provider’s published SHA-256 and passes the version-2 import parser; downloads redirect only on the configured origin and purchase redirects are refused.
3. Provider-owned error text is never stored or displayed; operators see the corresponding safe Mango reason.
4. Candidate PNGs and layouts require a signed-in operator; only selected cropped campaign images become public.
5. Each candidate offers its full-size image; up to ten older runs with drawn designs remain reachable with their own choice controls.
6. Queue work carries only the run identity, performs the requests still needed, and obeys contact-erasure and restore fences; erasure redacts run briefs like campaign text.

#### DESIGN-004 — Design import

**Requirement.** A local design file and its candidate PNG become an unsaved campaign-body edit through the email grammar.

**Acceptance.**
1. A version-2 LayerDoc and its source PNG compile in the browser into the same email grammar MSG-009 and MSG-012 require.
2. Photos become hosted campaign images under CAMP-012, the button uses the operator’s HTTPS destination, and the footer becomes the managed unsubscribe link and saved postal address.
3. The import lists unsupported layers by their text and highlights every design line absent from the operator’s brief.
4. An unsupported version, non-HTTPS button or unrepresentable grammar is refused visibly with the saved body unchanged; nothing outside the grammar saves.
5. Import yields only an unsaved body edit, without saving, approving, scheduling or sending; ordinary approval checks and exact-revision approval still apply.
6. Each HTML and plain-text part is at most 102,400 UTF-8 bytes under BUILD-012’s measured per-part check.
7. Import makes no request to 12ui; generation is DESIGN-001, DESIGN-002 and DESIGN-010 to DESIGN-008.

#### DESIGN-012 — Compile the imported layout

**Requirement.** The compiler produces a readable bounded email layout from supported design elements.

**Acceptance.**
1. The layout is a centered 600-pixel table containing emblem and lettering, full-width or two-column photos aligned vertically, one button and the managed footer under MSG-012’s tightened grammar.
2. Only cells paint the page and button backgrounds; images use their natural inline box, and rounded button corners remain inside its side padding.
3. Text is escaped and long words wrap; only closed hex colors are used and moved to at least 4.5:1 contrast, faces map to Georgia or Helvetica stacks, and Mango supplies sizes and spacing.
4. Photos are cropped from the full-resolution PNG at up to twice displayed width and uploaded as JPEG; no image codec runs on the server.
5. The compiler and server enforce the measured per-part BUILD-012 limit before editing, saving, approval, tests and delivery; oversized recipient hand-offs are skipped without truncation.
6. Two-column sections remain side by side on phones and narrow with the email.

#### DESIGN-013 — Review imported design content

**Requirement.** An imported design exposes what was omitted or invented before saving.

**Acceptance.**
1. The summary shows each hosted image as a thumbnail from its own address and highlights image descriptions and text absent from the brief.
2. Unsupported icons, dividers, shapes, destinationless links, further buttons, footer links and footer lines containing digits are omitted and listed by text.
3. The summary distinguishes unsaved and edited-since-import state and disappears when Discard changes restores the prior body.
4. An abandoned import leaves its uploaded public images under CAMP-012; the design’s model-written claims are not verified by approval.

#### DESIGN-014 — Bounded local design input

**Requirement.** A design import accepts only a bounded, shape-matched file pair.

**Acceptance.**
1. LayerDoc version 2 is bounded to 2 MB, 2,000 layers and 64 nesting levels; a deep file is refused by name without a stack overflow and unsupported input is not guessed.
2. The PNG shape matches the LayerDoc canvas.
3. Design text containing personalization-token delimiters is refused.
4. The brief starts from name, subject, preheader and sender name and is editable; a line is from it only when the whole line occurs as whole words ignoring case, spacing and typographic quotes.
5. Signed design URLs are never fetched, no design value escapes the compiler, and the importer loads only when opened.

### Message safety

#### MSG-001 — Sender identity

**Requirement.** Email and SMS identify the configured business sender.

**Acceptance.**
1. Each email carries the configured business display name, From address, reply-to address and physical postal address.
2. Each SMS uses a sender registered for the recipient's country.

#### MSG-002 — Email authentication

**Requirement.** Marketing email scheduling requires passing authentication and an aligned visible From domain.

**Acceptance.**
1. Scheduling is refused when the sending domain does not pass SPF.
2. Scheduling is refused when the sending domain does not pass DKIM.
3. Scheduling is refused when the sending domain does not pass DMARC.
4. Scheduling is refused when the visible From domain does not align with an authenticated domain.
5. A message whose domain passes all four checks can be scheduled.

#### MSG-003 — Email unsubscribe

**Requirement.** Marketing email offers both a visible confirmation and the mail-client one-click unsubscribe channel. Protocol details are in [message and delivery mechanisms](docs/contract/mechanism.md).

**Acceptance.**
1. Every marketing email carries a visible unsubscribe link and an opaque per-recipient HTTPS mail-client unsubscribe URL with the one-click declaration; DKIM covers both headers.
2. A context-free one-click POST applies CONT-004 before success and answers without a redirect.
3. The visible link requires one confirming action; page load, scanner fetch and prefetch alone do not unsubscribe.
4. Repeated requests through either channel have one opt-out effect.
5. Neither channel requires a session or cookie.
6. A token reveals no contact other than its own.

#### MSG-004 — SMS permission

**Requirement.** SMS eligibility combines the recorded subscription scope with the sender's jurisdictional capability.

**Acceptance.**
1. Hand-off requires the phone number to be subscribed for the recorded consent scope and the sender to be approved for the recipient's country.
2. A sender unable to receive and enforce CONT-007 opt-out and help keywords is refused for that recipient.

#### MSG-005 — SMS opt-out

**Requirement.** Marketing SMS carries its program and reply-based compliance text, and review exposes the message recipients will receive.

**Acceptance.**
1. Each message names its configured program and says 'Reply STOP to unsubscribe', or the jurisdiction's required equivalent.
2. Each message carries the configured frequency disclosure where required.
3. An optional opaque unsubscribe URL never replaces reply-based opt-out.
4. Review shows the exact compliance text and the resulting segment count, including the help contact.

#### MSG-006 — Links

**Requirement.** One link and image rule governs campaign approval, scheduling, flow activation, inspection and tracking, with allowed hosts from MSG-014 and contact forms from MSG-013.

**Acceptance.**
1. A malformed destination blocks scheduling and is named in review.
2. A destination using a scheme other than HTTPS or an admitted MSG-013 contact scheme blocks scheduling, with its scheme named.
3. A link or any followed redirect on an unlisted host blocks scheduling, with that host named.
4. An image outside HTTPS or the allowed-host list blocks scheduling, with its fault or host named.
5. Review offers MSG-015's allow action for blocked hosts, and never for a blocked scheme or a valid contact link.
6. Campaign approval, flow activation, the link inspector and tracking enforce the same rule.
7. A link or image pointing to this deployment's own campaign asset is checked against its record and stored bytes without a same-host network lookup; a missing asset blocks approval and is named.

#### MSG-007 — Content checks

**Requirement.** Review separates blocking content findings from advisories in every channel.

**Acceptance.**
1. Review names each blocking and advisory finding per channel.
2. An operator can acknowledge an advisory for its exact saved finding, with actor and time retained through reload and replay.
3. An edit invalidates the old advisory acknowledgment.
4. Consent, sender registration, opt-out, authentication, links, personalization and reputation findings cannot be acknowledged away.
5. Approval stays blocked until each blocking finding is corrected.

#### MSG-008 — Personalization

**Requirement.** Saved personalization always has a fallback, and review counts affected eligible people.

**Acceptance.**
1. Authoring refuses a token without a fallback and blocks approval and scheduling even when every eligible contact currently resolves it.
2. A missing contact value renders the saved fallback.
3. Review counts eligible people using a fallback, rather than token occurrences, excluding pending contacts; approval preserves those counts.
4. Delivered names are escaped in HTML and unchanged in plain text; a contact labeled only by its destination uses the fallback.
5. Preview uses an illustrative display name only for the name field delivery supports; unavailable properties use their saved fallbacks in preview and delivered content.
6. Editor, preview and review expose the same fallback outcomes at desktop and phone widths.

#### MSG-009 — Email body

**Requirement.** Marketing email delivers the exact saved body as recipients parse it, with equivalent HTML and plain-text offers. The accepted grammar and normalization rules are in [message and delivery mechanisms](docs/contract/mechanism.md).

**Acceptance.**
1. The delivered multipart message has HTML and plain-text parts carrying the same offer, links and unsubscribe link, and the saved preheader.
2. Saving canonicalizes authored markup to the structure mail clients parse and later saves keep those bytes stable.
3. Delivery transmits the saved authored HTML unchanged apart from managed token substitution and tracked-link rewriting, within the admitted tags, attributes, inline styles and BUILD-012 size.
4. Authored scripts, forms, stylesheets, classes and CSS functions are refused.
5. Only BUILD-010 may generate a responsive block; saving regenerates it and checking judges the message with and without it.
6. Approval, test send and delivery use the same checker of the stored parse.
7. Preview uses that parse under the cited HTML duty, retains styles only after the checker passes, and derives plain text from the same parse.
8. Link and image addresses are judged decoded and refuse literal quote or angle-bracket characters and no-break space; normalization never changes a hiding declaration to make it pass.

#### MSG-010 — Unsubscribe availability

**Requirement.** Unsubscribe capacity is partitioned by token so a shared mailbox-provider address cannot spend another recipient's allowance.

**Acceptance.**
1. The complete unsubscribe response arrives within two seconds in the measured journey.
2. GET and POST share the configured per-token allowance, with excess requests refused.
3. Exhausting one token's allowance leaves another token usable from the same client address.
4. Confirmation and success pages fit desktop and phone widths.
5. Both opt-outs prevent already-approved delivery and survive later provider reconciliation.

#### MSG-011 — Sending reputation

**Requirement.** Scheduling is gated by the sending domain's measured complaint and hard-bounce rates and any stricter provider hold.

**Acceptance.**
1. At 1,000 or more marketing deliveries in the reporting window, a complaint rate at or above 0.3% blocks scheduling.
2. At that volume, a hard-bounce rate at or above 5% of attempted marketing hand-offs blocks scheduling.
3. A stricter provider block applies at any volume.
4. Each block names its numerator, denominator, reporting window and provider rule and cannot be acknowledged away.
5. Late facts recompute the block, which clears only when every applicable threshold is below its limit.

#### MSG-012 — Hidden or deceptive presentation

**Requirement.** Authored presentation cannot hide or disguise the marketing content, unsubscribe link or postal address. The full presentation grammar and legacy-revision rules are specified in [message and delivery mechanisms](docs/contract/mechanism.md).

**Acceptance.**
1. Approval, test send and delivery judge the tree mail clients build from the saved message.
2. Text is blocked below 3:1 contrast against its nearest painted table-cell background, otherwise its outer wrapper or the white page; wrapper text is also checked against the white page in standards and quirks rendering.
3. Styles that hide, clip, fade, shrink below 10px, move, overlay or reverse text are blocked with the reason named.
4. Backgrounds outside cells or the outer wrapper, display changes, text-constraining dimensions, inline borders, painted rounded corners over text, direction outside a cell and overlapping styled cells are blocked.
5. Styled markup that differs from the structure parsers build, or markup mail clients read differently from its apparent structure, is blocked.
6. The same presentation rule protects the unsubscribe link and postal address.

#### MSG-016 — Legacy approved email and draft compatibility

**Requirement.** Existing approvals preserve their exact bytes while legacy parser ambiguities receive the specific compatibility treatment recorded by the owner. The full accepted grammar and legacy cases are in [message and delivery mechanisms](docs/contract/mechanism.md).

**Acceptance.**
1. An earlier valid plain revision remains deliverable byte for byte without normalization or re-approval, including parser-stable legacy styled output.
2. Delivery refuses a legacy approved revision that uses a comment-like malformed close tag, attributes on a table cell or row outside a table, undersized unstyled nested headings, or a direction-override character; it names the reason and requires a new approval.
3. Legacy apparent tags that mail clients read as literal text remain deliverable as approved; tighter placement rules do not invalidate earlier plain approvals.
4. A styled revision that uses presentation the owner later prohibited is refused at test send and delivery and needs new approval; earlier incompatible design output is imported again.
5. Any save of an older draft stores canonical markup regardless of which fields changed; spelling alone never prevents a draft save.

### Delivery

#### SEND-001 — Provider hand-off

**Requirement.** Campaign recipient-steps retain the declared provider deduplication guarantee, with SendGrid's explicitly authorized at-most-once exception. [Message and delivery mechanisms](docs/contract/mechanism.md) records the fence and provider correlation details.

**Acceptance.**
1. Email and SMS use their declared adapters, and each recipient-step binds campaign, revision, step and contact in its hand-off identity.
2. Outside the SendGrid exception, approval requires provider-effective deduplication lasting through the campaign deadline and reconciliation window.
3. A durable recipient-step fence precedes each at-most-once SendGrid hand-off; a correlation key is never presented as provider deduplication.
4. Success persists the provider message identifier before treating the step as handed off.
5. A definite SendGrid nonacceptance, including a rate rejection, may retry within the existing deadline; accepted or uncertain hand-offs are never automatically retried.
6. Timeout, connection reset, provider uncertainty or missing message identity, and eviction after the fence remain uncertain with operator review named.
7. Retried jobs, redelivered queue messages and resumed dispatch create no second provider message.

#### SEND-002 — Quiet hours

**Requirement.** SMS scheduling respects recipient-local legal and provider windows, with a bounded defer-or-skip policy.

**Acceptance.**
1. Hand-off occurs only inside all legal and provider-required recipient-local windows, which installation policy cannot weaken.
2. The recipient time zone comes from recorded location evidence with source and freshness, including SMS-003 area-code evidence, never a store-time-zone substitution.
3. Unknown or stale location evidence blocks hand-off.
4. The replaceable quiet-hours policy defers to the next allowed instant at or before CAMP-010's deadline; otherwise the step is skipped with its quiet-hours deadline reason.

#### SEND-003 — Throttling and progress

**Requirement.** Provider and carrier pacing keeps dispatch within configured capacity while campaign progress remains current.

**Acceptance.**
1. Hand-offs are paced to the configured provider and carrier limits.
2. Campaign status shows an estimated completion instant.
3. Handed-off, delivered, skipped and failed counts refresh within 30 seconds of each change.

#### SEND-004 — Transport failure

**Requirement.** Transient failures consume a bounded increasing retry schedule, while permanent failure and suppression remain visible in the recipient-step.

**Acceptance.**
1. A transient provider or network failure retries at most five times over one hour with increasing delay.
2. An uncertain hand-off is reconciled rather than retried.
3. Permanent rejection or an exhausted retry budget leaves a failed recipient-step with its provider error shown on campaign detail.
4. Hard rejection, complaint and provider suppression update CONT-006 atomically before another hand-off.

#### SEND-005 — Provider-event identity

**Requirement.** Provider facts retain adapter-declared identity and event order independently of their arrival order. Identity fields are documented in [message and delivery mechanisms](docs/contract/mechanism.md).

**Acceptance.**
1. Each signed webhook becomes one immutable fact using the strongest identity the adapter supplies.
2. Replayed and reordered delivery, bounce, complaint, suppression and SMS-reply facts leave the same derived delivery disposition and contact state.
3. An older fact never downgrades a later provider disposition.

#### SEND-006 — Delivery truth

**Requirement.** Each recipient-step combines a transport disposition with independent complaint and suppression facts, under the cited truthful-mail duty.

**Acceptance.**
1. Transport dispositions distinguish queued, uncertain hand-off, handed off, accepted, delivered, bounced, skipped and failed.
2. Complaint and suppression remain independent facts.
3. A later complaint stays visible without erasing the earlier delivery fact.
4. A skipped disposition carries its reason.

#### SEND-007 — Partial completion

**Requirement.** Completed campaign reporting reconciles every recipient-step while keeping overlapping facts separate.

**Acceptance.**
1. Completion requires every recipient-step to have a terminal transport disposition; an uncertain hand-off remains nonterminal.
2. The summary separately reports delivered, skipped, failed, bounced, complained and suppressed totals without one combined success figure.
3. Later complaint or suppression facts update both the completed campaign summary and contact ledger.

#### SEND-008 — Resumable dispatch and reconciliation

**Requirement.** Dispatch resumes and reconciles unresolved provider work, preserving SendGrid's single-attempt fence and truthful uncertainty. [Message and delivery mechanisms](docs/contract/mechanism.md) specifies the provider correlation policy.

**Acceptance.**
1. Worker eviction, redeployment, restart, queue redelivery and resumed dispatch preserve nonterminal recipient-steps and the existing fence, without duplicate sends or operator restart action.
2. At the configured interval, provider lookup resolves uncertain and other unresolved messages and imports missed facts.
3. SendGrid reconciliation correlates submission identity with signed provider event message identifiers and Activity data when available.
4. Unavailable SendGrid Activity or an expired lookup window leaves uncertainty visible for operator review, without inventing delivery or failure, resubmission or an automatic retry control.
5. Operators can review receiver evidence and provider message identifiers for uncertainty.
6. For other providers, unresolved messages past their declared lookup window fail with an unconfirmed-outcome reason, without delivery credit or blind retry.
7. A campaign never remains dispatching with neither work nor reconciliation in progress.

#### SEND-009 — Provider outage

**Requirement.** A provider outage pauses only its affected campaign channel, then recovers through bounded probes.

**Acceptance.**
1. Five continuous minutes of transient hand-off failure or an adapter unavailable report pauses the affected channel and stops recipient hand-offs.
2. A bounded health probe or non-recipient canary runs at the configured reconciliation interval.
3. A successful probe resumes dispatch automatically subject to CAMP-010 and AUD-005.
4. Campaign detail shows the pause and provider error.
5. Each operator receives one outage email as soon as the mail provider is available.

### Results

#### RESULT-001 — Campaign history

**Requirement.** Operators inspect campaign history by state and channel, including the exact approved work and its delivery results.

**Acceptance.**
1. The campaign list filters by state and channel.
2. An operator can open the approved revision and its audience snapshot.
3. The campaign exposes its delivery timeline and cancellation.
4. Per-channel outcome totals remain individually inspectable.

#### RESULT-002 — Engagement

**Requirement.** Engagement distinguishes observed clicks and store conversions from optional privacy-sensitive open estimates.

**Acceptance.**
1. Clicks and store conversions are labeled as observed events.
2. Open tracking begins off and enables only after an operator chooses it.
3. Enabled opens are labeled privacy-sensitive estimates.
4. Open estimates never support confidence, deliverability or attribution figures.

#### RESULT-003 — Attribution

**Requirement.** Campaign revenue identifies its source event and attribution window, independently of forecasts. The replaceable attribution policy is specified in [message and delivery mechanisms](docs/contract/mechanism.md).

**Acceptance.**
1. Attributed revenue names the qualifying store event and attribution window, separately from forecasts.
2. Each order is attributed at most once.
3. The default attribution policy selects the latest non-automated tracked click in the seven days before purchase.
4. A cancellation or refund subtracts the corresponding attributed amount.

#### RESULT-004 — Cost

**Requirement.** Provider usage and reported cost remain inspectable by campaign and day, including AI work and hand-offs.

**Acceptance.**
1. Each AI call and provider hand-off records the external provider, model or channel, billable units and reported cost.
2. Campaign totals reconcile those recorded cost facts.
3. UTC-day totals reconcile those facts, keeping currencies and unknown reported prices distinct.
4. A design purchase records one purchased-candidate unit and a converted layout records one layout unit, each once for its deduplication identity; a timed-out purchase counts only after the provider shows it occurred.

#### RESULT-005 — Link tracking

**Requirement.** Per-recipient-step click redirects preserve destination privacy and distinguish people from automated scanners. CONT-018 owns its click-token outcome; ordinary image and optional open-estimate lifecycles are RESULT-010 and RESULT-009.

**Acceptance.**
1. Each tracked link becomes an opaque first-party recipient-step redirect that records the request and forwards to the original URL.
2. A redirect sets no cookie, loads nothing and exposes no address, name or contact identifier in its destination.
3. Only a connected storefront whose site tracking is enabled may receive CONT-018's opaque, random, single-use token, exchangeable for seven days after send; automated clicks and Global Privacy Control requests receive no token.
4. Known scanner and bot requests are retained as automated events and excluded from engagement and attribution.
5. Disabling campaign tracking sends the original URLs and records no clicks.
6. Email, phone and text contact links are unchanged and record no click.
7. The delivered link continues forwarding after its recording window, thirty days after the send-by instant, closes, recording no further person or scanner fact.

#### RESULT-009 — Open-estimate lifecycle

**Requirement.** Optional first-party open estimates are revocable and isolated from observed marketing outcomes, under RESULT-002.

**Acceptance.**
1. Enabling estimates affects newly prepared marketing messages, with a signed recipient-specific first-party pixel; ordinary campaign images remain untracked.
2. Image requests establish only privacy-sensitive estimates, never reads or evidence for clicks, conversions, delivery, confidence, deliverability or attribution.
3. Disabling revokes every issued pixel; enabling again accepts only newly prepared messages.
4. Repeated requests record at most one estimate per recipient-step, without an IP address, user agent or cookie.
5. Private open tokens and facts remain until contact erasure removes them.

#### RESULT-010 — Ordinary campaign images are untracked

**Requirement.** An ordinary campaign image is shared content and never an open tracker.

**Acceptance.**
1. Every recipient receives the same campaign-image URL.
2. A fetch retains no address, user agent, cookie, recipient or request time, only the current-minute per-image rate counter.
3. An ordinary image fetch is never counted or shown as an open.

#### RESULT-006 — Deliverability reporting

**Requirement.** Sending-domain and SMS-sender reports show the rates that currently govern MSG-011.

**Acceptance.**
1. Each sending domain and SMS sender lists delivered, bounced, complained and failed counts for the configured reporting window.
2. Hard-bounce and spam-complaint rates expose the same numerators, denominators and window MSG-011 evaluates.

### Data

#### DATA-001 — Export contents

**Requirement.** Mango's portable export includes its marketing records and original campaign assets. The schema and excluded admission credentials are in [message and delivery mechanisms](docs/contract/mechanism.md).

**Acceptance.**
1. The archive includes contacts, source records, consent, suppression, surviving opt-outs, proposals, campaigns, revisions, audience decisions, messages, recipient-step outcomes, attribution events, settings and audit entries.
2. Each uploaded campaign asset is retained as its original file.
3. Signed first-owner admission authority, authentication credentials, sessions and transfer bookkeeping are excluded; operator profiles retain attribution only.

#### DATA-002 — Marketing restore custody

**Requirement.** Marketing restore preserves the destination's own authority and current source-wide erasure floor. The private-key and maintenance sequence is documented in [message and delivery mechanisms](docs/contract/mechanism.md).

**Acceptance.**
1. Restore stages an archive into an empty maintenance-mode destination, with explicit confirmation and fresh destination native authentication.
2. Privately backed-up contact and link keys must match before an archive can restore records or original objects.
3. A source-wide erasure floor refuses every older archive against current authority.
4. A nonempty legacy journal is refused before staging.
5. A current post-erasure export restores with matching private authority and preserves surviving opt-outs.

### Managed installation and editor

#### MGMT-001 — Signed first-owner admission

**Requirement.** First-owner admission binds the trusted management claim to one installation and its intended owner.

**Acceptance.**
1. The claim binds issuer, installation, configured app origin and owner email and expires promptly.
2. A claim initializes an installation only once, and no existing installation acquires another first owner.
3. GET and HEAD cannot initialize ownership.
4. Admission uses the cited native operator authentication and creates its native owner session.

#### MGMT-002 — Native owner editor

**Requirement.** The native owner can edit Mango through a management frame while product permissions stay those of OPER-004.

**Acceptance.**
1. Only an active native owner receives a short-lived editor grant; anonymous visitors have no widget.
2. The frame loads from exactly the configured management origin and accepts messages only from that frame and origin.
3. Logout, loss of authorization and grant expiry remove the editor.
4. Compiled visual edits apply after the actual route leaf hydrates.
5. Mango's six product roles remain separate from Base owner, admin and member roles.
6. The last product Owner is protected, restored authority belongs to the destination, and CSV export is restricted to Owner or Admin.

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

*Tier:* Core · *Rules:* D-2

**Requirement.** Operators define and maintain typed contact properties whose provenance remains visible without changing consent.

**Acceptance.**
1. Text, number, USD money, date, boolean and list properties fit the declared property-count limit.
2. Imports, forms, integrations, the events API, flow actions and operator edits set properties; history records each source and time.
3. Properties are usable in segments, personalization, conditional content and flow splits, and changing one leaves consent unchanged.
4. An operator defines date and money properties, imports both, changes one through the API, and sees a date-based segment and a personalized money preview with each source in history.

#### CONT-015 — Topics and tags

*Tier:* Core · *Rules:* D-2

**Requirement.** Topic permissions remain distinct from channel permission and from free-form tags.

**Acceptance.**
1. A contact may subscribe to Promotions while declining Newsletter within recorded channel consent scope.
2. Operators, imports, forms, flows and the API apply tags without creating consent or changing eligibility.
3. Campaigns and flows name their sending topic; eligibility checks both that topic and its channel, and unsubscribe-all remains available.
4. After a preference-center topic withdrawal, the next campaign excludes that topic while another permitted topic still reaches the contact.

#### CONT-016 — Preference center

*Tier:* Core · *Cites:* BASE-PUBLIC-001 · *Rules:* D-2

**Requirement.** A recipient uses the preference link in a marketing message without signing in to control only their own preferences.

**Acceptance.**
1. An opaque recipient-bound link offers topics, operator-offered frequency, pauses of 30, 60 or 90 days, chosen profile fields and unsubscribe-all.
2. Only an explicit confirming action changes preferences and records consent evidence; loading the page, including a scanner fetch, changes nothing.
3. The page reveals no other contact.
4. After a topic change and 30-day pause confirmed from a sent-message link, following campaigns record topic-unsubscribed and paused-by-recipient exclusions.

#### CONT-017 — Contact profile and event timeline

*Tier:* Core · *Cites:* BASE-ROLE-001 · *Rules:* D-2

**Requirement.** A contact profile brings identities, channel permission, properties, segments and a time-ordered history together. FLOW-002 owns the current flow-enrollment panel, and SEG-004 owns predictions, following ct’s recorded routing.

**Acceptance.**
1. The profile shows identities, per-channel consent and topics with their evidence, properties and segment membership.
2. Events, messages, clicks, conversions, form submissions, SMS replies, consent changes and operator or agent actions appear in original time and source order.
3. A contact who submits a form, places an order, enters a flow and clicks a message shows the profile facts in order at 1440 and 390.
4. Analyst and Support see the contact-specific masked profile at both widths.

#### CONT-018 — Onsite behavior

*Tier:* Core · *Cites:* BASE-PUBLIC-001, BASE-PUBLIC-002 · *Rules:* D-2

**Requirement.** Identified onsite behavior is recorded consistently by the first-party snippet, Shopify pixel, WooCommerce plugin and Stall integration. A site uses exactly one carrier; store record synchronization remains STORE-001 rather than onsite tracking. These are product privacy rules, without a claim of legal compliance.

**Acceptance.**
1. Each carrier records Viewed Product, Added to Cart, Started Checkout and Active on Site for an identified visitor, preserving products, variants, quantities, time, carrier and identification method.
2. Only the visitor’s own form submission, store-passed login identity or Mango tracked-link click identifies them; a store login or form submission replaces prior click identification.
3. No fingerprint, IP address, user agent or device characteristic links anonymous browsing to a contact.
4. The tracked-link storefront journey records two views and a cart event on the correct timeline and labels click identity honestly.
5. The same journeys apply to all four carriers; one carrier’s result does not establish another’s.

#### CONT-031 — Per-site tracking switch

*Tier:* Core · *From:* CONT-018 · *Cites:* BASE-ROLE-001, BASE-PUBLIC-002, BASE-AUDIT-001 · *Rules:* D-2

**Requirement.** Site tracking is off until an authorized operator enables that individual site and is reset off on reconnection.

**Acceptance.**
1. Owner or Admin enables a site in Site tracking; Owner, Admin or Manager can disable it. Settings at 1440 and 390 exposes controls only to the allowed roles.
2. Each switch change records its actor and time in activity. Where the store also has a switch, both must be on.
3. While off, forms remain available, but no behavior is observed, no cookie is set, no event or click token is exchanged or recorded, and tracked redirects add no token.
4. The Shopify pixel subscribes to no event while off; the snippet runs only on an allowed embed origin.
5. Disabling ends identified sessions; re-enabling cannot identify a prior browser without a fresh permitted identification.

#### CONT-032 — Onsite consent and opt-out precedence

*Tier:* Core · *From:* CONT-018 · *Cites:* BASE-PUBLIC-001 · *Rules:* D-2

**Requirement.** A carrier tracks only while the store’s consent tool permits analytics and marketing and reports no sale-or-sharing opt-out.

**Acceptance.**
1. Shopify uses its Customer Privacy API permissions, WordPress uses statistics and marketing permissions, Stall uses its visitor consent state, and the snippet uses the site-banner consent call.
2. No consent tool or no decision means refusal: nothing is set, held, sent or exchanged.
3. A refusal or withdrawal deletes the tracking cookie and stops recording; an identified visitor’s withdrawal also removes their earlier onsite events from that carrier.
4. Global Privacy Control and a store sale-or-sharing opt-out override an accepted banner on every site and for every visitor.
5. Header-only GPC prevents redirect token creation; browser-only GPC drops a token without exchange. A do-not-share contact records no behavior after store login.
6. Consent given on the landing page may identify the visitor then; before it, the token leaves the address bar and waits only in page memory, and otherwise is dropped.

#### CONT-033 — Onsite session storage

*Tier:* Core · *From:* CONT-018 · *Cites:* BASE-PUBLIC-001 · *Rules:* D-2

**Requirement.** One host-bound tracking cookie holds a limited session and optional earlier browsing; carrier code stores no other tracking identity.

**Acceptance.**
1. The cookie is Secure, SameSite=Lax, path-rooted, has no Domain attribute and is HttpOnly when a store server sets it; script-only carriers do not claim HttpOnly.
2. Its random 128-bit identifier and optional earlier browsing fit within 2,048 bytes, with no address, name, contact/customer identifier, click token or price.
3. Anonymous expiry is at most 30 days from creation; identified expiry is at most 30 days from the latest permitted identification. Browsing alone never extends it.
4. Identification, including a change of identified contact, rotates the session identifier.
5. No tracking identity enters another cookie, localStorage, sessionStorage or IndexedDB, and non-HTTPS pages receive none. Form display memory contains no identifier and is neither sent nor read as behavior.
6. The browser proof reads cookie attributes and storage after consent, expiry and withdrawal.

#### CONT-034 — Storefront click identity

*Tier:* Core · *From:* CONT-018 · *Rules:* D-2

**Requirement.** A tracked click can identify the recipient at the connected storefront without exposing personal data or granting consent.

**Acceptance.**
1. Only a connected-store destination with site and campaign tracking enabled receives a token; outside hosts, automated clicks, GPC and disabled tracking receive none.
2. Each eligible click mints an unrelated 32-random-byte, 43-character opaque token bound to that recipient-step and storefront host; only its digest is retained for seven days.
3. Exchange is one-time, within seven days, through the destination host’s authenticated carrier and only while consent permits; expired, reused, wrong-host or tracking-off tokens identify nobody.
4. After exchange the token is absent from the address bar; the Shopify theme embed removes it where the pixel sandbox cannot.
5. Identity is labeled click-identified because email can be forwarded, never changes consent, and is replaced by a later form submission or store login.
6. Two clicks yield unrelated tokens; another browser replay, another store and an expired token all fail to identify.

#### CONT-035 — Earlier browsing stays on the visitor’s device

*Tier:* Core · *From:* CONT-018 · *Rules:* D-2

**Requirement.** Consented earlier browsing stays inside the unidentified visitor’s browser and reaches Mango only with permitted identification.

**Acceptance.**
1. The cookie holds only the 20 most recent product views, cart additions and checkout starts within its 30-day session, each with product, variant, quantity and time.
2. Before identification, Mango receives and retains no onsite event, session or identifier; no anonymous visit is counted, profiled, segmented, displayed or shared.
3. A form submission, store login or permitted tracked click links the held browsing to the contact; withdrawal, GPC, refusal or cookie expiry leaves nothing to link.
4. A browser with 25 views holds only the latest 20; network observations, the observations view and the timeline contain nothing for it before identification.

#### CONT-036 — Onsite retention and erasure

*Tier:* Core · *From:* CONT-018 · *Cites:* BASE-DATA-003 · *Rules:* D-2

**Requirement.** Identified onsite records have bounded retention and follow the contact’s erasure, while tracking never creates permission or undoes restrictions.

**Acceptance.**
1. Identified events expire 90 days after occurrence and retain no IP address, user agent, referrer, page URL or price.
2. Active on Site occurs once per visit; a visit ends after 30 inactive minutes.
3. Segments, flow triggers and product blocks offer no onsite-history window over 90 days and explain why at 1440 and 390.
4. A carrier’s outbound queue retains an event only until acknowledgment and at most 30 days; the Shopify observation log retains 30 days, and withdrawal records remain until erasure so replays are refused.
5. Contact erasure removes onsite events, identified sessions, withdrawal records and token digests under CONT-013. A browser with an erased session is unidentified until a fresh permitted identification.
6. Onsite tracking never creates a contact, changes consent or topics, reverses an opt-out or removes a surviving restriction.
7. Site tracking settings and the integration guide disclose the cookie, purpose, lifetime, attributes, recorded data, retention periods and honored opt-out signals.

#### CONT-037 — No cross-site onsite identity

*Tier:* Core · *From:* CONT-018 · *Cites:* BASE-DATA-004, BASE-PUBLIC-001 · *Rules:* D-2

**Requirement.** Onsite identity belongs to one storefront, never a cross-site identity or an ad-network feed.

**Acceptance.**
1. A storefront cookie and its identifier are never sent to, shared with or recognized on another site, including another site in the same installation.
2. Mango’s deployment and tracking hosts set no visitor cookie, and snippet calls to the deployment carry no credentials.
3. Onsite event requests go only to the store’s own origin and this deployment; contacts reach ad platforms only through INT-012 under CONT-021.
4. After the storefront journey, the browser has no deployment or tracking-host cookie, and every carrier request has an allowed destination and credential mode.

#### CONT-019 — US SMS consent capture

*Tier:* Core · *Rules:* D-2

**Requirement.** US SMS capture records express written permission and the recipient’s own confirmation.

**Acceptance.**
1. A blank opt-in box or keyword text-in is accompanied by brand, recurring-automated-marketing, frequency, rates, no-purchase-condition, STOP/HELP and terms/privacy disclosures.
2. Evidence adds the disclosure version, page or keyword, phone, time and capture IP to CONT-003.
3. A form with a pre-checked box or missing disclosure cannot publish.
4. The provider edge sends one confirmation text and only its authenticated confirming reply subscribes the number under the applicable opt-in policy.

#### CONT-020 — Engagement-based sunsetting

*Tier:* Core · *Rules:* D-2

**Requirement.** An engagement-based sunsetting label is separate from dormancy and preserves every contact.

**Acceptance.**
1. No click, order, SMS reply or form submission for 180 days labels a contact unengaged; opens do not count.
2. Only campaigns or flow messages that choose engaged-only sending exclude that label; CONT-012 dormancy remains the default exclusion and AUD-008 distinguishes both in review.
3. Unengaged contacts may enter a re-permission flow; suppression occurs only after the operator approves it, records that operator and suppresses exactly the selected contacts without deleting a row.
4. Imported clicks and orders use original times, imported opens count for nothing, and a no-history contact’s 180-day window starts at completed move-in.
5. Review shows the unengaged count and exclusion against imported engagement history.

#### CONT-021 — US privacy requests

*Tier:* Core · *Cites:* BASE-DATA-003, BASE-AUDIT-001 · *Rules:* D-2

**Requirement.** Contact privacy requests expose that contact’s own data and exclude requested sharing.

**Acceptance.**
1. Support can record an access request and a do-not-sell-or-share request, with receipt and completion times.
2. Within 45 days, JSON and CSV access exports include profile, consent evidence, events, messages, enrollments and audit references for that contact and no other.
3. Global Privacy Control and a recorded do-not-share request exclude the contact from ad-audience synchronization and every other declared sharing.
4. The next ad-audience sync omits that contact; erasure remains CONT-013.

#### CONT-022 — Contact search and bulk actions

*Tier:* Core · *Cites:* BASE-OPS-004 · *Rules:* D-2

**Requirement.** Operators find contacts and apply selected bulk changes with a durable receipt.

**Acceptance.**
1. Search supports email, phone, name, property value, tag, segment and consent state.
2. A selection can be tagged, untagged, exported, suppressed, erased under CONT-013 or added to a topic only with covering consent evidence.
3. Actions over 1,000 contacts run as durable jobs with progress and a receipt.
4. A property search selects the expected people, a 5,000-contact tag job completes, and topic additions name every contact refused for missing evidence.

#### CONT-023 — Custom objects

*Tier:* Core · *Cites:* BASE-DATA-001, BASE-DATA-003 · *Rules:* D-2

**Requirement.** Contact-related custom object types make business records usable in targeting and content.

**Acceptance.**
1. Operators define typed object properties and one-to-many or many-to-many relationships to contacts, populated by the events API and integrations.
2. Segments, flow triggers, splits and personalization read related objects, including subscription renewal and plan or pet names.
3. Export includes related objects; erasing their only related contact removes them while an object shared with another contact remains.
4. An API-created subscription triggers a flow 14 days before renewal and personalizes with its plan name.

#### CONT-024 — Incumbent-held consent

*Tier:* Core · *Rules:* D-2

**Requirement.** A source-reported subscriber may enter without Mango reconfirmation only with distinct incumbent-held evidence and the source attestation in CONT-038. This is the named amendment to the earlier archive move-in interpretation.

**Acceptance.**
1. Move-ins from every named incumbent, owner-identified incumbent exports and connected stores accept incumbent-held evidence alongside Mango-captured evidence.
2. Each row retains source/account or audience, source status, native permission times and level, preserving Mailchimp, Shopify, Klaviyo and matching incumbent fields as documented in the consent mechanism.
3. Evidence time prefers confirmation, then opt-in, then last-change; a source with none uses the export’s explicitly supplied creation time, is labeled time-unknown and may remain subscribed.
4. Without source attestation, imported subscribed rows remain non-subscribed with a named reconciliation reason; with it, eligible fixture rows appear in first-campaign review and no Mango confirmation is sent.
5. SMS is subscribed only with per-row consent time, collection point and express-written-permission disclosure; otherwise it stays non-subscribed and an email re-permission flow may invite a text-in.

#### CONT-038 — Source consent attestation

*Tier:* Core · *From:* CONT-024 · *Cites:* BASE-AUDIT-001, BASE-DATA-001 · *Rules:* D-2

**Requirement.** An Owner or Admin attests separately to each source’s subscription scope with a versioned, reviewable record.

**Acceptance.**
1. For each audience/account/store, the attestation names brand/legal sender, category, disclosed frequency, destination jurisdiction and consent wording, or explicitly says the source holds unavailable wording; it confirms the list was not purchased, rented or scraped and covers only subscribed rows.
2. Each statement is an unticked control with a not-sure choice, and the operator types the source name. The displayed wording, version and hash are retained; new wording needs a new attestation for later imports or connections.
3. The record includes operator, role, UTC time, session IP and user agent, source identifier, each statement/answer and covered-row count, bound to its archive or connection and recorded in activity.
4. The attestation remains while any contact relies on it and for five years after revocation; contact erasure removes per-row personal data while retaining this record.
5. DATA-001 exports the record, and each relying contact’s evidence names its attestation, including operator, time, wording hash and answers.
6. Mango does not claim to verify another platform’s collected consent; the identified source record and revocable attestation remain visible.

#### CONT-039 — Incumbent evidence restrictions

*Tier:* Core · *From:* CONT-024 · *Rules:* D-2

**Requirement.** Source permission never removes a restriction or supplies missing SMS proof.

**Acceptance.**
1. Non-subscribed source states, pending/transactional/unsubscribed/cleaned/complained rows, and existing Mango unsubscribe/suppression/surviving opt-outs keep their restriction; merge retains the most restrictive state.
2. An uncertain attestation or unattested brand, a role mailbox reserved for abuse/postmaster, and a known country outside the attested jurisdiction import non-subscribed with a named reconciliation reason.
3. An SMS row without both source consent time and collection point, or without the attested express-written disclosure, remains non-subscribed.
4. Future unsubscribe, preference-center changes and other opt-outs apply exactly as for Mango-captured consent.
5. The mixed incumbent fixture preserves unsubscribe and cleaned states, rejects uncertain attestations and ineligible mailbox/jurisdiction rows, and subscribes no row without its qualifying evidence.

#### CONT-040 — Incumbent evidence labeling and revocation

*Tier:* Core · *From:* CONT-024 · *Cites:* BASE-AUDIT-001 · *Rules:* D-2

**Requirement.** Incumbent-held evidence remains labeled and can be revoked without disturbing independent Mango-captured permission.

**Acceptance.**
1. Contact pages, contact/account/access exports, list-growth-by-source and reconciliation label incumbent-held evidence with its source; it is never presented as Mango-captured evidence.
2. Campaign review counts eligible contacts relying on incumbent-held permission, and reconciliation counts each evidence kind.
3. Revoking an attestation records its operator and returns every channel relying only on it to non-subscribed before the next hand-off.
4. Channels with independent Mango-captured evidence are unaffected by that revocation.
5. The revoke-and-review journey reads the changed subscription state and retained independent evidence.

#### CONT-025 — Opt-in mode per form and source

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-AUDIT-001 · *Rules:* D-2

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

#### CONT-026 — Contact added by hand

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-AUDIT-001 · *Rules:* D-2

**Requirement.** An Author or higher role records a hand-captured contact’s permission, with prospective mode authority inherited solely from CONT-025 under RL-102.

**Acceptance.**
1. Entry records email, phone, name and properties, and separately for each channel/topic the permission method, time, wording and affirmative operator attestation.
2. Manual entry defaults to pending with one email confirmation; after an Owner/Admin prospective single-mode change, a new email entry is subscribed with operator-recorded evidence naming its operator.
3. That evidence label remains on the contact page, exports and source-growth report.
4. A manual phone entry receives its confirmation text and stays pending until its own authenticated reply; an email/link confirmation cannot substitute.
5. An existing unsubscribe or suppression remains and its reason is shown; each hand entry appears in activity.
6. An authenticated Support attempt to subscribe is refused with 403.

#### CONT-027 — Resubscribe through a public form

*Tier:* Core · *Rules:* D-2

**Requirement.** A past email unsubscriber may return through new recipient-confirmed consent, with the same public acknowledgment for every address state. This applies to every public form carrier and both single and double capture modes.

**Acceptance.**
1. New affirmative evidence identifies its form, page, consent-text version, capture IP and post-opt-out time, including opt-outs from preferences, incumbent imports or surviving erasure restrictions.
2. An eligible request sends one confirmation within CONT-042’s allowance, but the channel stays unsubscribed, receives no incentive and is excluded from campaigns and flows until the recipient confirms.
3. Only the recipient’s affirmative action from the emailed link confirms; load/scan, a non-affirmative action, replay and a link older than 30 days cannot resubscribe or reverse a later opt-out.
4. Confirmation subscribes only the form’s named topics, preserves other topics, releases an incentive once and emits the distinct resubscribed trigger for flows that explicitly name it.
5. A single-mode form also keeps an earlier unsubscriber unconfirmed until this recipient action.
6. History shows the request, email and confirmation or expiry; form and source-growth reports count resubscriptions separately.

#### CONT-041 — Destination-private resubscription refusals

*Tier:* Core · *From:* CONT-027 · *Cites:* BASE-ACCESS-003 · *Rules:* D-2

**Requirement.** Public resubscription cannot disclose a destination’s state or bypass suppression.

**Acceptance.**
1. New, subscribed, unsubscribed, suppressed and allowance-exhausted destinations receive the same generic acknowledgment; an already-subscribed contact receives no mail.
2. Destination-dependent intake, allowance and provider failure preserve that acknowledgment and record an operator-visible refusal; network/challenge admission stays address-independent.
3. This is the named exception to public rate-refusal responses only for destination-dependent confirmation privacy, without granting marketing or incentive authority.
4. Hard-bounce, complaint, provider/operator suppression, legal hold and surviving suppression restrictions send no mail and change no consent or suppression until their cause is resolved through CONT-005.
5. Neither a fresh signup nor a previously issued confirmation bypasses suppression or releases an incentive.
6. An SMS opt-out requires new express-written permission and the confirming reply under CONT-019.

#### CONT-042 — Shared destination confirmation allowance

*Tier:* Core · *From:* CONT-027 · *Rules:* D-2

**Requirement.** Confirmation admission bounds mail to one address across every public capture carrier without revealing whether admission succeeded.

**Acceptance.**
1. At most three confirmation reservations and emails per destination per UTC day are shared across public forms and kiosk capture, including requests from different networks.
2. The fourth eligible request sends no confirmation and returns the same acknowledgment; the allowance resets at midnight UTC with confirmation and suppression guards unchanged.
3. An uncertain or failed confirmation hand-off is not retried automatically under the unchanged signup delivery rule.
4. The cross-carrier journey reads the exact email count before and after exhaustion and next-day reset.

#### CONT-043 — Resubscription after erasure

*Tier:* Core · *From:* CONT-027 · *Rules:* D-2

**Requirement.** An erased person may give new consent without reviving their former history.

**Acceptance.**
1. An unsubscribe/erasure surviving restriction may start a new request; a suppression surviving restriction remains refused under CONT-041.
2. The request recreates only a new contact and request evidence, then sends confirmation.
3. Confirmed consent creates a new subscribed person with no prior history and marks the retained opt-out as superseded by the new evidence for audit.
4. If no confirmation arrives before expiry, the recreated contact and request are removed and the surviving opt-out is unchanged.
5. The erased-contact journey reads both the newly subscribed empty-history profile and expired-request cleanup.

### Target: Audiences

#### AUD-008 — Inactivity rules in review

*Tier:* Core · *Cites:* BASE-OPS-005 · *Rules:* D-2

**Requirement.** One visible inactivity rule governs each campaign or flow message without changing consent protections.

**Acceptance.**
1. Campaign steps and flow messages default to CONT-012’s twelve-month dormancy exclusion; engaged-only messages additionally exclude CONT-020 unengaged contacts.
2. Review lists dormant and unengaged separately, counts an overlap only as dormant, shows included no-history contacts, and counts open-only contacts inside dormant with one action to include just those.
3. An approver can disable dormancy for one campaign; an Owner or Admin can change its installation default and window with an activity record.
4. The approved revision retains that choice and restored-contact count, AUD-005 honors it, and the activity log names its approver; consent, topics, suppression and opt-outs are unaffected.
5. In a two-year-old Mailchimp audience, a click three months ago and no activity history avoid dormant exclusion, with the latter counted no-history; a thirteen-month-old click is dormant until the campaign override includes it.

#### AUD-009 — Frequency protection: one policy and a recorded override

*Tier:* Core · *Cites:* BASE-OPS-005 · *Rules:* D-2

**Requirement.** Campaigns and flows share a visible frequency policy and exact-revision override. AUD-011 governs cart-flow counting and activation impact.

**Acceptance.**
1. AUD-004 windows apply to campaign steps and flow messages until FLOW-014 caps replace them for both; review names the governing rule and distinguishes frequency-window from frequency-cap exclusions.
2. A campaign approver can ignore frequency protection for a step; a flow message can choose the same in its FLOW-008 activation revision.
3. The approved revision records the choice and restored-contact count, dispatch honors it, and the activity log names the approver; those sends count toward later windows and caps.
4. An override never changes consent, topic, suppression, opt-out, SMS quiet hours, state frequency limits, global holdout or SMS spend cap.
5. With two campaigns four hours apart the default excludes the first’s recipients from the second; a recorded override sends to them but still excludes anyone who unsubscribed between sends.

#### AUD-011 — Cart-flow frequency and impact

*Tier:* Core · *From:* AUD-009 · *Rules:* D-2

**Requirement.** Library and moved-in flows show their campaign-versus-flow counting rule before activation.

**Acceptance.**
1. Campaign sends do not block abandoned-checkout, abandoned-cart, browse-abandonment, back-in-stock and price-drop library messages, or draft flows recreated under MOVE-008.
2. Those messages initially count only other flow messages; the flow revision shows that setting and permits changing it before activation.
3. Every flow activation shows the count its governing window would have skipped over the last 30 days of this deployment’s events and the count with the changed setting.
4. A morning campaign does not stop an afternoon abandoned-cart message; a Mailchimp journey fixture carries the same setting and activation shows the seeded 30-day skip count.

### Target: Campaigns

#### CAMP-013 — Recipient-local send time

*Tier:* Core · *Rules:* D-1, D-3

**Requirement.** Campaigns can schedule in each recipient’s evidenced local time.

**Acceptance.**
1. A chosen recipient-local time resolves from recorded location evidence with source and freshness; New York, Chicago and Los Angeles recipients hand off at their own chosen time.
2. Recipients without a known zone use the store zone and review counts them.
3. Approval is at least 26 hours before the earliest recipient-local instant, or review names the zones that will be missed; dispatch starts with the earliest zone.

#### CAMP-014 — Pause and resume

*Tier:* Core · *Cites:* BASE-OPS-005 · *Rules:* D-1, D-3

**Requirement.** An operator can pause and resume campaign work without duplicating hand-offs.

**Acceptance.**
1. Pausing scheduled or dispatching work prevents further hand-offs within 30 seconds while retaining already handed-off dispositions.
2. Resume continues remaining recipient-steps with AUD-005 rechecks and CAMP-010 deadlines; a two-step mid-dispatch pause sends nothing while paused and hands off each eligible recipient-step once after resumption.
3. Pause and resume each record their actor.

#### CAMP-015 — Marketing calendar

*Tier:* Core · *Rules:* D-1, D-3

**Requirement.** A calendar exposes planned marketing pressure and preserves scheduled-revision control.

**Acceptance.**
1. Month and week views place scheduled and sent campaigns, live-flow expected daily volume and configured US retail dates on their days.
2. The retail dates include Black Friday, Cyber Monday, Mother’s Day, Father’s Day, Back to School and operator-configured Prime Day.
3. Each day shows contact pressure and prospective AUD-004 exclusions.
4. Dragging a scheduled campaign opens a new CAMP-007 draft revision while its approved revision remains active.

#### CAMP-016 — Follow-up to non-engaged recipients

*Tier:* Core · *Rules:* D-1, D-3

**Requirement.** An operator can create a linked, independently approved follow-up from a sent campaign.

**Acceptance.**
1. A chosen delay and new subject create a follow-up for non-clickers, or for non-openers explicitly labeled an estimate under RESULT-002.
2. A follow-up at 48 hours targets exactly the original non-clickers less current review exclusions.
3. The new campaign passes its own approval and frequency checks.

#### CAMP-017 — Recurring and RSS-to-email campaigns

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1, D-3

**Requirement.** Campaigns can recur or derive new editions from feeds while preserving authorized revision scope. An agent’s recurrence or activation call carries standard for draft preparation and external for sending, with money for provider spend; the company’s policy decides the call.

**Acceptance.**
1. Daily, weekly and monthly recurrence and RSS or Atom intake each create a new revision; feed editions contain only items new since the previous send.
2. A person can require approval of each instance or authorize recurrence from one exact audience rule and template; any changed audience or template needs a new authorization and all CAMP-004 checks still pass.
3. In an RSS fixture two new items produce a draft containing both; under a company policy that permits the authorized recurrence the next unchanged instance sends, while a changed template is held under that policy.

#### CAMP-018 — Duplicate a campaign

*Tier:* Core · *Rules:* D-1, D-3

**Requirement.** Duplication creates an independent draft while leaving the source’s results and approval intact.

**Acceptance.**
1. A campaign in any state can be duplicated into a draft named Copy of its source.
2. The copy retains channels, audience rule, content, sender, preheader, tracking choice and step settings, and its stored body reparses to the source revision’s bytes.
3. It copies no schedule, approval, audience snapshot, test or result.
4. Its own approval checks current settings, consent and audience; editing and approving it leaves the source’s approved revision and results unchanged.

#### CAMP-019 — Test send to typed addresses

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-OPS-005 · *Rules:* D-1, D-3

**Requirement.** Approvers can direct a visibly marked test to a bounded set of typed destinations. CAMP-024 governs the shared daily allowance. Its full workflow includes OPER-004 role assignment, OPER-007 activity, SMS-001 typed SMS transport and CONT-019 SMS consent.

**Acceptance.**
1. An operator with approval rights may type up to five additional email addresses or phone numbers for one test; an Author has no typed field and their typed request is refused.
2. An unsubscribed or suppressed typed destination is refused with its reason; a typed SMS additionally needs CONT-019 consent.
3. Each typed destination is marked as a test and recorded in campaign history and the OPER-007 activity log with its actor.
4. A Manager’s two typed addresses receive marked tests, while a third unsubscribed address is refused and named.

#### CAMP-024 — Shared daily test allowance

*Tier:* Core · *From:* CAMP-019 · *Rules:* D-1, D-3

**Requirement.** Configured and typed tests consume the same installation-wide attempt allowance.

**Acceptance.**
1. The default allowance is 100 attempted recipient hand-offs per UTC calendar day; one recipient consumes one unit, including an uncertain provider outcome, and two recipients consume two.
2. Before sending, the owner sees the remaining count; a request exceeding it is wholly refused before any hand-off with the remaining count named.
3. At midnight UTC the configured allowance resets without carrying attempts forward.
4. The owner can change the source-configured limit and rebuild or redeploy; there is no Settings control.
5. With one unit remaining a two-recipient test is refused before either hand-off; configured and typed tests draw from that same count.

### Target: Message safety

#### MSG-013 — Contact links (mailto:, tel:, sms:)

*Tier:* Core

**Requirement.** The link tool and authored HTML admit single-recipient email, phone and text contact links as well as HTTPS. Their exact grammar and fixture examples are in [message and delivery mechanisms](docs/contract/mechanism.md).

**Acceptance.**
1. Email links admit one validated address, with optional subject and body; additional addresses, cc, bcc and every other parameter block approval with a named reason.
2. Phone links admit one E.164 number or ten-digit US number, with visual separators; text links admit the same and an optional body.
3. The builder offers Web, Email, Phone and Text as first-class link kinds and writes those forms; HTML mode accepts them.
4. Review decodes and lists each contact address or number, subject and body.
5. Delivered HTML and plain text preserve each contact link unchanged; the plain-text part exposes its address or number.
6. Contact links require no allowed-host entry, are never rewritten and record no click; malformed contact links still block, and image sources remain HTTPS only.

#### MSG-014 — Allowed link and image hosts

*Tier:* Core

**Requirement.** Settings lists every allowed link and image host with its source, starting with normal connected-store and brand hosts rather than requiring manual setup.

**Acceptance.**
1. The initial list includes this deployment, connected stores' primary and additional storefronts and catalog product, collection and image hosts; catalog sync refreshes those derived entries.
2. Social-block web hosts are listed and their icons use deployment media; brand-kit website and social hosts are listed.
3. Operators can add hosts in settings, campaign review or the move-in report, with their source shown.
4. Entries match exact hosts; an explicitly entered wildcard covers subdomains but excludes the bare parent, consistently in approval, flow activation, inspection and tracking.
5. Operator removal survives later catalog sync; disconnecting a source removes its derived entries from later checks.
6. Every source or operator change is recorded under OPER-007.
7. Allowed hosts still pass every MSG-006 inspection: redirects are followed, and private-network or unreachable destinations block.
8. A fresh connected-store fixture sends catalog, social, email-contact and phone-contact links without a settings change; an unlisted subdomain blocks until explicitly allowed, and deceptive suffixes remain blocked.

#### MSG-015 — Allow a blocked host from review

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-AUDIT-001

**Requirement.** Review lets an authorized approver resolve an unlisted host without bypassing the rest of message safety.

**Acceptance.**
1. Campaign review and flow activation list every blocked host with its affected links, including redirect hosts.
2. A Manager, Admin or Owner can allow an exact host or explicit subdomain entry, retaining its review source, campaign or flow, and operator; checks rerun immediately.
3. The append-only activity entry records the operator, host and campaign or flow and remains available through the OPER-007 activity views and filters.
4. An Author sees the blocked hosts and can request approval naming them, but has no allow action and cannot allow a host.
5. Valid contact links need no allowance, and an allowed host still passes all other MSG-006 inspections.
6. An imported Mailchimp template using three outside hosts reaches review with all three hosts and allow actions.

### Target: Results

#### RESULT-007 — Click map, per-link clicks and clicker lists

*Tier:* Core

**Requirement.** Campaign and flow-message reports connect each link's non-automated clicks to its saved revision, contact cohort and anonymous retained counts.

**Acceptance.**
1. Each link is identified by position and destination within its revision, and each click retains that identity.
2. Campaign and flow-message reports show total and unique human clicks per link, with automated requests retained separately and excluded.
3. The table and click map use the saved revision preview.
4. Each link opens its exact clicker list with first and last click time.
5. An authorized operator can export that cohort as matching CSV or start a segment with exactly those contacts, with Analyst masking under OPER-004.
6. Unique counts count a contact once per link and once per campaign.
7. Erased contacts leave only anonymous counts under CONT-013.
8. On a three-link fixture with repeated human clicks and a scanner on every link, every count and exported or segmented cohort equals the fixture.

#### RESULT-008 — Recipients per outcome

*Tier:* Core

**Requirement.** Campaign and flow-message recipient reports reconcile each outcome with the campaign summary and retain anonymous counts after erasure.

**Acceptance.**
1. The report lists delivered recipients, hard and soft bounces with provider reasons, complaints, send-bound unsubscribes with method and first time, skips with reason, and failures with provider error.
2. Every list can be filtered, exported as matching CSV or used to create its exact contact segment under RESULT-007's role and masking rules.
3. Every list count equals SEND-007 campaign totals, including a fixture with hard bounce, complaint, unsubscribe and quiet-hours skip.
4. Send-bound visible-link, one-click and authenticated reply attribution survives replay without changing its first method or time.
5. Actual erasure retains only anonymous outcome counts under CONT-013.

### Capacity

#### SCALE-001 — Capacity for the first buyer

*Tier:* Core

**Requirement.** Mango serves the full first buyer at the published capacity floors; raises require another recorded load run.

**Acceptance.**
1. One installation holds 250,000 contacts and selects up to 250,000 eligible people for one campaign; one contact-import review holds 250,000 rows, with the move-in sizes in MOVE-012.
2. It retains 25,000,000 commerce, onsite and imported activity events and supports an email HTML part of 102,400 bytes as sent, with BUILD-012 deriving the save allowance.
3. FORM-008 sustains 1,000 accepted signups per hour and 100 in a minute, with network allowances of 30 per hour, 120 challenged and 300 kiosk; confirmation handoffs fit the mail rate.
4. A generated installation with 250,000 contacts and a year of orders and activity completes MOVE-012, computes an independently exact eligible count within 60 seconds and hands off completely at its declared rate, under 90 minutes at 3,000 per minute, with SEND-003 progress and no duplicate.
5. At that size, SEG-002 membership and FLOW-002 triggers keep their stated times; the run records wall time and peak memory, and release evidence identifies the load-tested limits.

### Growth: forms, popups and landing pages

#### FORM-001 — Hosted and embedded signup

*Tier:* Core · *Cites:* BASE-PUBLIC-002 · *Rules:* D-2

**Requirement.** Hosted and embeddable signup capture email and optional SMS permission without granting marketing-send authority.

**Acceptance.**
1. A hosted page and an embed collect valid identities with recorded explicit consent and confirmation under CONT-003/005/009.
2. Before confirmation the public signup remains pending; one valid confirmation subscribes it, while replay and expiry cannot subscribe again.
3. An embed accepts only configured allowed origins.
4. No submission by itself authorizes a campaign or flow hand-off.

#### FORM-002 — Popups, flyouts and full-page forms

*Tier:* Core · *Cites:* BASE-ACCESSIBILITY-001, BASE-PUBLIC-002 · *Rules:* D-2

**Requirement.** Operators build and display branded growth forms through the storefront carrier appropriate to their site.

**Acceptance.**
1. The builder makes popup, corner flyout, banner and full-page forms with teaser, success and error states; rate refusal shows error rather than success and challenge defaults follow FORM-013.
2. Display can depend on time on page, scroll, desktop exit intent, included/excluded URL, UTM source, referrer, cart value, new/returning status and device.
3. After close a form hides for its chosen days; after submit it stays hidden, and identified subscribers of its topic do not see it.
4. Carriers are a script tag, Shopify theme embed enabled from Mango Settings, WooCommerce/WordPress plugin and Stall integration.
5. Forms load asynchronously without layout shift, contain focus while open and close on Escape under the shared accessibility bar.
6. An exit-intent journey displays once, submits, shows success and remains hidden after reload.

#### FORM-003 — Multi-step capture and incentives

*Tier:* Core · *Rules:* D-2

**Requirement.** Multi-step forms collect permission and release a promised incentive only after recipient confirmation.

**Acceptance.**
1. Capture can collect email then phone with CONT-019 disclosure and chosen typed properties or interests mapped to topics.
2. An incentive is a unique discount code or lead-magnet file and is unavailable until the relevant channel confirms, including confirmed resubscription.
3. A fake or unconfirmed address receives no incentive; a repeat recipient receives the same code rather than another.
4. A two-step journey leaves both channels pending, shows/emails the code only after confirmation and issues no second code on repeat.

#### FORM-004 — Landing pages

*Tier:* Core · *Cites:* BASE-PUBLIC-001 · *Rules:* D-2

**Requirement.** Branded hosted growth pages support a campaign’s capture task, without becoming a general website builder.

**Acceptance.**
1. Templates cover lead magnets, waitlists, giveaways, event signups and product launches, with title, description and social-share image.
2. Pages publish on the deployment origin or an operator-pointed custom subdomain with automatic TLS.
3. Each page carries its form, privacy-policy link and sender identity; a lead-magnet file becomes available only after confirmation.
4. A waitlist journey on a custom subdomain confirms a visitor and reads the file; the same file is not found before confirmation.

#### FORM-005 — Form performance and tests

*Tier:* Core · *Rules:* D-2

**Requirement.** A form reports its own acquisition funnel and compares deliberate variants without premature winner claims.

**Acceptance.**
1. Views, submissions, confirmation rate, resubscriptions, allowance refusals by reason and later purchasers are available by device, page and source.
2. Copy, incentive and timing variants use a predeclared winner metric under EXP-005.
3. An equal-session two-variant journey reads separate views, submissions and confirmations, and names no winner before the evidence threshold.

#### FORM-006 — Referral program

*Tier:* Core · *Rules:* D-2

**Requirement.** Confirmed referrals can unlock the operator’s chosen milestone reward.

**Acceptance.**
1. Each confirmed subscriber may receive a personal referral link; referred people complete the ordinary capture and confirmation.
2. Milestones support a code, file or manually fulfilled gift with its fulfillment recorded.
3. Self-referrals, disposable domains and unconfirmed referrals do not count.
4. Three qualifying referrals unlock the fixture milestone and send one reward email; an unconfirmed fourth and self-referral add nothing.

#### FORM-007 — Abuse resistance

*Tier:* Core · *Cites:* BASE-INPUT-001, BASE-ACCESS-003 · *Rules:* D-2

**Requirement.** Public capture separates abuse admission from subscription authority and preserves address privacy. The detailed edge and challenge protocol is documented in [the consent mechanism](docs/contract/mechanism.md).

**Acceptance.**
1. Invalid sender name, from/reply-to address or physical address is refused before any allowance, signup claim or consent record is stored.
2. The declared body limit, honeypot and configured challenge are checked before capture; a honeypot hit receives the generic acknowledgment without mail.
3. Rate admission uses durable atomic network, destination and global counters at FORM-008/011 levels, persists across restart and stops incrementing at its ceiling.
4. Network identity treats full IPv4 and mapped IPv4 alike and every textual/interface form in an IPv6 /64 as one network; missing or invalid edge IP is refused.
5. Configured challenge verification fails closed on missing, malformed, expired, reused, rejected or unavailable verification, and verifies the expected action and public hostname.
6. An ordinary installation without challenge keys retains all consent, suppression and rate guards; kiosk always requires a fresh challenge.
7. No public response reveals whether an address is already subscribed, unsubscribed or suppressed; FORM-010 owns address-independent rate errors.

#### FORM-008 — Signup intake capacity

*Tier:* Core · *Rules:* D-2

**Requirement.** Legitimate signup capacity has published accepted-signup floors with isolated bot and carrier budgets under RL-103.

**Acceptance.**
1. Across ordinary carriers, each challenged and unchallenged pool accepts at least 1,000 per UTC hour and 100 per UTC minute; unchallenged traffic cannot consume challenged capacity.
2. Each ordinary network admits at least 30 accepted per hour without a challenge and 120 with a passed challenge, using one accepted counter; refused attempts have a separate allowance of at least 60 per hour.
3. Exhausted refused-attempt admission blocks further unchallenged traffic while a passed challenge can proceed.
4. Kiosk network and installation partitions each admit at least 300 accepted per hour and consume no ordinary pool.
5. The sustained fixture accepts all 600 valid submissions spread across 200 networks and the 100-request minute burst; 200 bot attempts leave the next legitimate signup admitted.
6. The shared-network fixture admits its full 30 and 120 cohorts, and unchallenged-pool exhaustion leaves challenged admission available.

#### FORM-011 — Accepted-only signup accounting

*Tier:* Core · *From:* FORM-008 · *Rules:* D-2

**Requirement.** Signup allowances charge accepted captures rather than bot failures, retain uncertain hand-off reservations and protect each destination.

**Acceptance.**
1. Only a valid, eligible, non-duplicate capture that passes sender, body, challenge, honeypot, field and disclosure checks spends the accepted global allowance.
2. Honeypot, failed/missing/malformed challenge, malformed/oversized body, protected destination and pending duplicate spend none of that pool.
3. A reservation lost to a concurrent duplicate before any hand-off is returned; after a hand-off attempt it remains spent whether the outcome is certain or uncertain.
4. Single and double modes both spend accepted capacity; single-mode capture sends no confirmation and spends no destination confirmation reservation. Repeating a subscribed single-mode address changes nothing.
5. Three confirmation reservations per address per UTC day remain shared under CONT-042, with status-free acknowledgments under CONT-041.
6. The race fixture leaves exactly one reservation spent and reads counters around bot and duplicate traffic.

#### FORM-012 — Owner-controlled signup allowance raises

*Tier:* Core · *From:* FORM-008 · *Cites:* BASE-ROLE-001, BASE-AUDIT-001 · *Rules:* D-2

**Requirement.** Owners may raise published signup allowances prospectively within the delivery ceiling, preserving their floors.

**Acceptance.**
1. Each allowance starts at its published floor, including ordinary challenged/unchallenged, network, refused-attempt, destination and separate kiosk partitions.
2. Settings at 1440 and 390 shows every level, its floor and the declared email hand-off ceiling of 3,000 per minute.
3. Only the Owner raises a level; a raise takes effect from the next UTC hour/minute/day window and records one activity entry.
4. An Admin’s raise, a cut below a floor and a raise beyond the delivery ceiling are refused with a named reason.
5. Confirmation hand-offs admitted by raised limits remain inside the declared hand-off rate.

#### FORM-013 — Signup challenge defaults and configuration

*Tier:* Core · *From:* FORM-008 · *Cites:* BASE-ROLE-001, BASE-AUDIT-001, BASE-SECRET-002 · *Rules:* D-2

**Requirement.** Growth carriers start with a verified challenge and expose configuration problems before traffic is accepted.

**Acceptance.**
1. New popup, flyout, full-page, landing and kiosk forms have challenge enabled; an installation provisions both keys and Home warns when public forms lack them.
2. Only Owner/Admin can disable a non-kiosk challenge and the change is recorded; Author/Manager cannot disable it, and kiosk cannot disable it at all.
3. Each token is server-verified once within five minutes; a second use is refused.
4. Key configuration is all-or-nothing; the documented challenge protocol bounds token length and verification time and checks action and hostname.
5. The carrier journey reads new-form defaults, allowed/denied toggles, activity and failed token replay.

#### FORM-009 — Kiosk and event forms

*Tier:* Core · *Rules:* D-2

**Requirement.** A shared kiosk captures one visitor at a time without carrying identity to the next.

**Acceptance.**
1. A marked kiosk/event form opens full-screen and, after success, resets every field and consent control to blank within five seconds.
2. It never prefills or remembers a previous visitor, sets no identifying cookie or storage and supplies no identity for a later onsite visitor.
3. Every submission requires its own fresh challenge; a missing or unverified challenge makes no contact.
4. At least 300 accepted signups per hour fit one kiosk network under FORM-008, and the 30-browser-signup cohort completes with independent challenges.
5. Consent evidence records kiosk capture and its device label; confirmed-source growth reports show that source separately.
6. Ordinary consent, confirmation and destination allowances still apply, and marking/unmarking a kiosk records its operator and time in activity.

#### FORM-010 — Refused signups are never silent

*Tier:* Core · *Cites:* BASE-OPS-004, BASE-AUDIT-001 · *Rules:* D-2

**Requirement.** A refusal is visible to the affected visitor where privacy permits and to the operator on every promised report surface. RL-104 retains FORM-005’s per-form report, Home alert and hourly activity summary.

**Acceptance.**
1. An address-independent network/global/kiosk refusal returns 429 with remaining-window Retry-After, preserves entries and displays error rather than success or an incentive promise.
2. Destination-dependent confirmation refusal instead uses CONT-041’s identical acknowledgment, sends no extra mail and grants no subscription or incentive authority.
3. FORM-005 reports refusal counts by form, reason (network, destination or global) and hour; Settings may expose immediate counts without replacing that report.
4. A global or network refusal in the past hour raises a Home alert with count and links to the form and allowance setting.
5. Each hour with refusals has one activity summary with counts by form and reason and no addresses.
6. The over-limit and fourth-destination journeys read the appropriate response and report, Home and activity counts for both cases.

### Segments and predictions

#### SEG-001 — Segment builder

*Tier:* Core

**Requirement.** Nested segment conditions cover the buyer’s audience facts and show an explained estimate before an exact campaign review.

**Acceptance.**
1. Nested all/any groups combine typed properties, channel/topic consent and tags.
2. Event conditions combine count, time window and event-property filters; geographic conditions cover US state, ZIP and distance from a ZIP.
3. Product, collection and category conditions work for both purchases and views.
4. Email/SMS click engagement and campaign, link and flow activity conditions are available under SEG-006.
5. RFM/lifecycle and prediction conditions are available under SEG-003/004, with unavailable rather than empty results when evidence is unavailable.
6. The builder’s live estimate and plain-text summary name every condition, while campaign review recomputes exact eligible membership.
7. A saved count/value/time/state segment selects exactly the seeded contacts through review, and changing a nested operator or time window changes only the matching cohort.

#### SEG-002 — Live membership

*Tier:* Core

**Requirement.** Live segment changes can drive flows and preserve unavailable-source truth.

**Acceptance.**
1. Qualifying events, property changes and time-window boundaries change membership within five minutes.
2. Joining and leaving are recorded in contact history and emit events usable by FLOW-002.
3. A stale or unavailable source makes its rule unavailable rather than an empty audience.
4. A qualifying order enters a repeat-buyer segment once, emits one entry event and enrolls its listening flow once.

#### SEG-003 — RFM and lifecycle stages

*Tier:* Core

**Requirement.** Purchase history produces customer-relative RFM scores and a visible lifecycle stage.

**Acceptance.**
1. Recency, frequency and monetary scores use quintiles across this deployment’s customers and each contact’s own orders.
2. Each contact has new, active, at-risk, lapsed or champion stage, with method and thresholds visible.
3. Scores and stages are recomputed daily.
4. On seeded order history, the stage distribution and a contact’s scores match an independent calculation of the documented method.

#### SEG-004 — Predictions

*Tier:* Core

**Requirement.** Customer predictions use only this installation’s sufficient purchase history and show their uncertainty; the contact profile owns no duplicate prediction promise.

**Acceptance.**
1. Predictions provide expected next order date, predicted 12-month USD spend, churn risk and average days between orders.
2. Until at least 500 customers with orders and 180 days of orders exist, predictions say not enough history and their segment conditions remain unavailable.
3. Each prediction shows its method, training date and back-tested error on held-out recent orders.
4. Above/below-minimum fixtures read both the contact profile prediction panel and matching segment availability.

#### SEG-005 — Engagement and lead scoring

*Tier:* Core

**Requirement.** Operator-defined engagement scores use time-aware weighted behavior rather than opens.

**Acceptance.**
1. Weighted rules for clicks, orders, form submissions, replies and visits with decay score people who have not yet purchased.
2. Segments and splits can read the score, and the contact shows its history.
3. Two clicks and a form submission produce the configured score, which decays after the configured period.
4. Imported clicks use their original times for scoring and decay; imported opens change nothing.

#### SEG-006 — Campaign and flow activity conditions

*Tier:* Core

**Requirement.** Campaign and flow activity conditions retain named message identities and original engagement times.

**Acceptance.**
1. A named campaign supports sent, delivered, clicked, did-not-click and specific-link conditions; opened/not-opened appears only as a labeled estimate with open tracking enabled.
2. Any/all of the latest N sent campaigns support sent, clicked and did-not-click conditions.
3. Flow conditions cover entered, completed, exited-with-reason and current enrollment; flow-message conditions cover received and clicked.
4. Explained click-based engagement levels are often, sometimes, rarely and never, in the manner of Mailchimp rating conditions.
5. A seeded campaign’s received-but-not-clicked cohort and link-2 cohort are exact, and no-clicks across five campaigns selects exactly those contacts.
6. Imported named campaigns and links behave identically at original click times; the Mailchimp granular history fixture matches named clickers and imported opens satisfy no engagement condition.

### Email builder and content

#### BUILD-001 — Drag-and-drop email builder

*Tier:* Core · *Cites:* BASE-INPUT-002, BASE-INPUT-003, BASE-ACCESSIBILITY-001 · *Rules:* D-1

**Requirement.** Operators compose email by dragging, reordering, duplicating and deleting text, image, button, one-to-four-column, spacer, divider, social-link, linked video thumbnail, header, footer, product, product-grid, cart-item, coupon and restricted-HTML blocks. Blocks and sections offer padding, alignment, background and the mobile controls in BUILD-010. Undo, redo and keyboard operation preserve the message. Web, Email, Phone and Text links follow MSG-013 and social hosts follow MSG-014. The builder and HTML view share MSG-009 and MSG-012’s grammar and exact-revision approval, with lossless round trips for valid content.

**Acceptance.**
1. Build, save, reopen and approve a two-column product-and-button email; its stored body re-parses to the same bytes under CAMP-003.
2. At phone email width the columns stack under BUILD-010.
3. Build a full promotional email with header, hero image and button, two text columns, six-item product grid, social links, managed footer and mobile settings; it saves, reopens and approves within BUILD-012’s limit.
4. The builder shows sent size throughout composition.
5. Every listed block and setting supports drag, keyboard, duplicate, delete, undo and redo without losing grammar-valid content in an HTML-view round trip.

#### BUILD-002 — Template library

*Tier:* Core · *Cites:* BASE-DATA-001 · *Rules:* D-1

**Requirement.** A library of starter templates for each common job (newsletter, promotion, product launch, welcome, abandoned cart, browse abandonment, post-purchase thank-you, review request, win-back, event invitation, re-permission) and the operator's own saved templates; a template starts a draft or a flow message, and later edits to a template never change saved or approved revisions. Imported designs (DESIGN-004), generated designs (DESIGN-002) and migrated templates (MOVE-001 to MOVE-005) land as templates.

**Acceptance.**
1. an operator saves a draft as a template, starts a second campaign from it, edits the template, and the first campaign's approved revision is unchanged.

#### BUILD-003 — Brand kit

*Tier:* Core · *Cites:* BASE-DATA-004 · *Rules:* D-1

**Requirement.** The brand kit holds logo, colors, fonts (with email-safe fallback stacks), button style, link color, footer and social links. Given the store's website address, Mango can propose a brand kit by fetching that page once on the operator's request and extracting logo, colors and fonts for the operator to accept or edit. New templates, forms and landing pages start from the kit; changing the kit never alters saved or approved revisions. The kit's website and social link hosts join the allowed link hosts (MSG-014).

**Acceptance.**
1. proposing a kit from a test storefront page at the network edge yields its logo and two colors for review, and accepting it styles a new template.

#### BUILD-004 — Reusable blocks

*Tier:* Core · *Cites:* BASE-AGENT-007 · *Rules:* D-1

**Requirement.** A saved block (for example a footer, promotion banner or shipping notice) can be placed in many templates, drafts and flow messages. Editing it updates drafts; for approved campaign revisions and live flow revisions it creates new draft revisions that must pass approval or activation (CAMP-007, FLOW-008).

**Acceptance.**
1. editing a reusable footer updates two drafts and creates a new draft revision of one live flow message, while the live revision keeps sending the old footer until activation.

#### BUILD-005 — Conditional content

*Tier:* Core · *Rules:* D-1

**Requirement.** A block can be shown or hidden by segment, property, topic, predicted stage or the trigger event's properties, with an "otherwise" alternative; the plain-text part follows the same choice. Preview can render as any chosen contact or as each branch.

**Acceptance.**
1. a VIP-only block appears in the preview as a VIP contact and not as another, and both recipients' plain-text parts match their HTML.

#### BUILD-006 — Dynamic product content

*Tier:* Core · *Rules:* D-1

**Requirement.** At hand-off, product blocks render the trigger’s cart or checkout items with image, title, variant, quantity and current price, the viewed product, or connected-catalog recommendations: bestsellers, new arrivals, recently viewed, frequently bought together and purchase-history personalization. Unpublished or out-of-stock items are omitted. An empty result hides the block or skips the message as chosen. MSG-006 and MSG-014 govern links and images, including connected storefront and asset hosts; a disallowed item is omitted and counted with its reason. Operators can also select products under BUILD-011.

**Acceptance.**
1. An abandoned-cart message with two items renders both with current values.
2. Marking one item out of stock before hand-off omits it; personalized grids omit products the recipient already bought.
3. Each recommendation mode reads the connected catalog at hand-off; unpublished items and disallowed image or link hosts are omitted and counted.
4. With no remaining item, the chosen hide-or-skip behavior applies.

#### BUILD-007 — Coupons

*Tier:* Core · *Rules:* D-1

**Requirement.** A message carries a static code or a unique single-use discount or Stripe promotion code created at hand-off through Shopify, WooCommerce, BigCommerce or Stall. The exact revision contains the discount, expiry and usage limit. Failed creation skips the recipient-step with a named reason; no message without its code is sent. Shopify’s installation authority is part of INT-015.

**Acceptance.**
1. An approved flow message obtains a unique Shopify-edge code per recipient with the approved discount, expiry and usage limit.
2. Failed store-side creation records the coupon-unavailable reason and sends nothing for that recipient.
3. No discount is created outside the exact approved revision.

#### BUILD-008 — Previews and pre-send checks

*Tier:* Core · *Rules:* D-1

**Requirement.** Previews show desktop, mobile, dark-mode approximation and plain text as a chosen contact under CAMP-003. Review locates advisory findings for missing image alt text, heading order, link text, likely spam triggers and sent size at or above 90 percent of BUILD-012’s limit, alongside MSG-006 to MSG-012’s blocking checks. A size advisory identifies measured size, limit and the three largest blocks.

**Acceptance.**
1. Desktop, mobile, dark approximation and plain-text previews render the chosen contact and its fallback safely.
2. Missing image alt text, heading order, link text and likely spam wording each produce a located advisory.
3. A 95 KB draft shows a located size advisory with measured size, limit and the three largest blocks.
4. Acknowledging advisories does not bypass a contrast blocker; correcting the blocker and acknowledging the current revision permits approval.
5. A 110 KB body is refused at save under BUILD-012.

#### BUILD-009 — SMS and MMS composer

*Tier:* Core · *Rules:* D-1

**Requirement.** The SMS editor counts characters and GSM-7 or UCS-2 segments, estimates per-recipient and total USD cost under SMS-006, uses the branded tracked links in RESULT-005, attaches one carrier-compliant MMS image, applies personalization fallbacks and appends MSG-005’s compliance text.

**Acceptance.**
1. a message with an emoji switches to UCS-2 and shows the new segment count and cost; the preview shows the short link and STOP text that will be sent.

#### BUILD-010 — Mobile layout the checker can prove

*Tier:* Core · *Cites:* BASE-INPUT-002 · *Rules:* D-1

**Requirement.** Built email columns remain readable with or without stylesheet support: they appear side by side at desktop email width and stack in their chosen order on a phone. Responsive settings and the checker follow BUILD-014 and BUILD-013; the detailed compiler authority is recorded in [the mobile mechanism](docs/contract/mechanism.md).

**Acceptance.**
1. Build and save two columns with one mobile-hidden block and another block’s mobile font size, then render the stored body at phone and desktop email widths in standards and quirks modes.
2. At phone width the columns stack; at desktop email width they sit side by side.
3. Removing stylesheet support still stacks phone-width columns without losing content.
4. Preview names the mobile settings that depend on stylesheet support.

#### BUILD-013 — Mobile and desktop message checks

*Tier:* Core · *From:* BUILD-010 · *Cites:* BASE-INPUT-002 · *Rules:* D-1

**Requirement.** The MSG-012 checker evaluates desktop and mobile email trees in standards and quirks rendering. Compliance content remains visible, and a block hidden at one width passes at the other and remains in plain text.

**Acceptance.**
1. The stored body passes all MSG-012 rules in both width trees and rendering modes.
2. Unsubscribe, postal address and compliance text cannot be hidden.
3. Every other hidden block is visible and checked at the other width and retained in plain text.

#### BUILD-014 — Generated mobile presentation

*Tier:* Core · *From:* BUILD-010 · *Cites:* BASE-INPUT-002 · *Rules:* D-1

**Requirement.** The builder alone generates responsive presentation from the stored block and section controls. Authors cannot supply a competing style block or hidden-content rule. RL-81 records the closed compiler authority and fallback rules; [the mobile mechanism](docs/contract/mechanism.md) specifies it.

**Acceptance.**
1. Mobile and desktop hiding, chosen stacking order, font size, line height, padding and alignment match saved controls.
2. A desktop-hidden block is absent at desktop email width, present at phone width, and present at both when the generated style is removed.
3. A handwritten style block, class or overriding declaration is refused with a named reason.
4. The generated block is placed in the document head and refuses an over-limit configuration with measured size.
5. Generated selectors and declarations introduce no remote load or author-controlled tracking channel.

#### BUILD-011 — Chosen catalog products

*Tier:* Core · *Rules:* D-1

**Requirement.** Operators search the connected catalog by title, SKU, collection or vendor and choose products and variants for a product or product-grid block. Choices retain identifiers; image, title, price, compare-at price and URL come fresh from the catalog at hand-off, while review and preview show current values and read time. Unpublished, deleted and out-of-stock items are omitted and counted; empty blocks hide or skip as chosen. RL-84 records the unavailable-read and save-state treatment.

**Acceptance.**
1. Choose two Shopify-edge products, one with a variant, and preview their current image, title, price, compare-at price, URL and read time.
2. When the edge raises a price before hand-off, the delivered email uses the new price.
3. Unpublished, deleted and out-of-stock selections are omitted at hand-off and counted distinctly on campaign detail.
4. An empty result applies the chosen hide-or-skip behavior; an unavailable catalog read skips with a named cause and never sends stale values.
5. Save retains selected identifiers, including selections that become unavailable, and names current publication or removal work without losing unsaved edits.

#### BUILD-012 — Email size the builder and imported templates fit in

*Tier:* Core · *Rules:* D-1

**Requirement.** A full promotional email built in Mango or moved from an incumbent saves, approves and sends within one transmitted-byte limit shared by authoring, imports, generation, templates, duplication, follow-ups and flow messages. The bound includes personalization, tracking, compliance content, responsive styles and each configured product maximum; plain text has its own equal byte limit. The builder and HTML view show the bound while editing. Oversize refusal names measured size, limit and three largest blocks and retains unsaved content. Approval, test send and hand-off remeasure; oversize rendered recipients skip with a counted cause rather than clipped content. [The size mechanism](docs/contract/mechanism.md) specifies measurement.

**Acceptance.**
1. The full BUILD-001 promotional email with a six-item Shopify picker grid and mobile controls saves, reopens unchanged and approves above the former character cap while within the byte limit; shown and provider-edge sizes agree.
2. The named Mailchimp three-column blueprint, filled with fixture content and converted through MOVE-011, becomes a template whose draft saves and reaches approval.
3. An oversize save names measured HTML and text bytes, the shared limit and three largest blocks, preserves the saved revision and keeps unsaved editor content.
4. A 95 KB body shows BUILD-008’s advisory.
5. Every listed reuse and generation door applies the same bound, including the configured maximum dynamic or selected products and audience-derived personalization.
6. Approval, test send and hand-off remeasure; a later expansion over the limit sends nothing for that recipient and is counted on campaign or flow detail.

### Automated flows

#### FLOW-001 — Visual flow builder

*Tier:* Core · *Cites:* BASE-ACCESSIBILITY-001 · *Rules:* D-2, D-3

**Requirement.** A visual canvas builds an explained flow graph before any activation.

**Acceptance.**
1. Nodes cover triggers, fixed/conditional waits, conditional/trigger/random or A/B splits, email/SMS/push, property/tag changes, webhooks, team notifications, CRM tasks and exits.
2. The canvas zooms and pans, supports keyboard operation and explains each node in plain words; phone users can read it and its details.
3. Validation refuses unreachable nodes, loops without delay and paths without an end.
4. At 1440, the operator builds a three-message welcome flow with a split, sees and fixes an unconnected-node error and saves a draft revision; details remain readable at 390.
5. Stripe subscription events support the inherited renewal-reminder journey.

#### FLOW-002 — Triggers

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** Events, dates and source changes start the flow they match and expose its current enrollment state on the contact profile under ct’s CONT-017 routing.

**Acceptance.**
1. Triggers cover confirmed topic subscription, distinct confirmed resubscription, segment entry, filtered commerce/form/custom events, added tags and incoming SMS keywords.
2. Commerce events include checkout/cart/product views, placed/fulfilled/refunded orders and subscription starts/cancellations, including Stripe renewals.
3. Clicks may match any link, a specific link of a campaign or flow message, or any message; sent-campaign triggers can pair with a did-not-click wait.
4. Date properties support offsets such as birthdays, anniversaries and renewal-minus-seven-days; viewed-product price drops and restock can trigger.
5. Each trigger declares its source capability and cannot activate without it.
6. Every trigger fixture enrolls only matching contacts once; a one-link click trigger excludes another link’s clicker.
7. The contact profile shows each active enrollment with its current node and preserves its occurrence/source ordering.

#### FLOW-003 — Entry filters and re-entry

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** Entry and continuing eligibility govern enrollment and bounded re-entry.

**Acceptance.**
1. Entry filters can inspect post-start purchase, country and segment status; continuing flow filters are checked before each action.
2. A contact who stops matching exits with a filter-exit reason.
3. Re-entry supports once ever, once per chosen days and every occurrence, without simultaneous duplicate enrollment in one revision.
4. Three checkout triggers within an hour under once-per-seven-days leave one enrollment, and a mid-flow purchase exits before the next action.

#### FLOW-004 — Delays and waits

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** Durable waits choose the right instant or event branch across interruptions.

**Acceptance.**
1. Delays support minutes/hours/days, a recipient-local weekday/time and a condition with a timeout path.
2. Timers fire once within 60 seconds of their instant, never early, after restart, redeploy and outage.
3. A controlled-clock five-minute and two-day journey restarts between waits and reads both due firings.
4. An order wait follows its event branch when an order arrives and its timeout branch otherwise.

#### FLOW-005 — Splits

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** Every split records the evaluated facts behind the contact’s branch.

**Acceptance.**
1. Conditional splits read properties, membership, event history, per-channel permission, predictions and engagement.
2. Trigger splits read triggering-event properties such as cart value or product category.
3. Contacts with $80 and $150 carts take their expected branches, and each enrollment shows the evaluated condition and reason.

#### FLOW-006 — Actions

*Tier:* Core · *Cites:* BASE-OPS-003 · *Rules:* D-2, D-3

**Requirement.** Non-message flow actions update business records while preserving permission boundaries.

**Acceptance.**
1. Actions update a property, add/remove a tag, notify the team by email/Slack, create a connected-CRM task/note and generate a coupon.
2. A topic action requires covering evidence and otherwise records consent-missing; no action subscribes, resubscribes or unsuppresses a person.
3. Signed webhook actions use the same safe delivery behavior as INT-008.
4. Property/tag/webhook actions run once per enrollment after redelivery, and the no-evidence topic fixture records its refusal.

#### FLOW-007 — Exits and goals

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** Goals and explicit exits stop an enrollment with a readable reason.

**Acceptance.**
1. Named goal events mark conversion; unsubscribe, suppression, erasure, higher-priority-flow entry and manual removal also end enrollment.
2. Every exit retains its reason and time, and a converted contact receives no later message from that enrollment.
3. An abandoned-checkout contact who orders after message one receives no second message and is counted converted with the order value.

#### FLOW-008 — Reviewed activation

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007, BASE-AUDIT-001 · *Rules:* D-2, D-3

**Requirement.** An exact flow revision is activated with its declared audience, content and limits. An agent’s activation carries live and external classes; the company’s policy determines its disposition under AGENT-010.

**Acceptance.**
1. Revisions have draft, in-review, live, paused and archived states.
2. Activation atomically validates trigger capability, every message’s approval checks, sender, links/allowed-host action, personalization, coupons, frequency, quiet hours and maximum-per-day/per-contact/optional-end limits.
3. The activating actor is recorded; a live revision sends only its own content to people its trigger and filters admit within its limits.
4. Editing creates a new draft; an edited message does not send before the new exact revision is activated.
5. Activation requires an explicit migration choice: in-flight enrollments finish on the earlier revision or move to matching nodes of the new one, and that choice is recorded.
6. An invalid activation names each failing check; a later matching event sends only the activated message.
7. Activation, pause and archive each appear with actor/time in filterable activity.

#### FLOW-009 — Per-send rechecks

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** Each flow hand-off rechecks current recipient eligibility and records a skip’s consequences.

**Acceptance.**
1. Before hand-off, Mango rechecks channel/topic permission, opt-out, suppression, cross-message frequency, quiet hours, sender reputation, sender evidence and source freshness.
2. A skip names its reason and the node’s chosen continue/exit consequence.
3. A between-message unsubscribe prevents the second and all later messages, and its node records unsubscribed.

#### FLOW-010 — Exactly-once execution

*Tier:* Core · *Cites:* BASE-OPS-003 · *Rules:* D-2, D-3

**Requirement.** Enrollment-node execution preserves source order and never replays obsolete marketing after an interruption.

**Acceptance.**
1. Each revision/enrollment/node combination has at most one effect under redelivery, restart and redeploy.
2. Duplicate, replayed and out-of-order source events retain source-identity deduplication and occurrence-time order.
3. After an outage, triggers older than the node’s relevance window skip with stale-trigger; cart and browse defaults are seven days.
4. Three replays of one checkout plus a runtime interruption mid-dispatch yield one enrollment and hand-off; eight-day-old carts released after outage are skipped.

#### FLOW-011 — Pause, manual review and stop

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** Operators can suspend selected flow work or stop all marketing hand-offs.

**Acceptance.**
1. A flow pause explicitly chooses whether new triggers queue or are dropped; selected contacts can be removed.
2. A message’s manual mode holds each pending send in its review queue until approved, then sends once.
3. Stop all sending halts every campaign and flow hand-off within 30 seconds until an Owner/Admin resumes.
4. The active-campaign/flow stop journey reads no later hand-off after that bound; resume continues both through their current rechecks.

#### FLOW-012 — Flow library

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** The flow library installs explained editable lifecycle journeys as drafts.

**Acceptance.**
1. Library jobs include welcome, abandoned checkout/cart, browse/site abandonment, post-purchase thanks/cross-sell, review request, win-back, re-permission/sunset, birthday, restock, price-drop, predicted replenishment, VIP/loyalty, renewal reminder and lead nurture.
2. Before activation, each shows expected weekly enrollments from this deployment’s recent events, frequency setting and 30-day skipped count.
3. Cart, browse, restock and price-drop flows are not blocked by campaign sends.
4. The abandoned-checkout draft contains three messages, an order goal and seven-day relevance, with volume calculated from seeded checkout events.

#### FLOW-013 — Flow analytics and path inspection

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** Flow and node reports explain counts, revenue and a contact’s entire route.

**Acceptance.**
1. Each flow/node reports entered, waiting, sent, skipped-by-reason, exited-by-reason, converted and attributed revenue with period comparison.
2. A contact path shows every evaluated filter, split and recheck with its inputs, answering why the person received a message.
3. After a seeded run, every node reconciles entered against waiting, sent, skipped and exited, and one contact path exposes each decision.

#### FLOW-014 — Priority and cross-message frequency

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** Ranked competing messages honor shared per-contact frequency choices.

**Acceptance.**
1. Operators rank flows/campaigns and set cross-email/SMS per-contact caps such as one email/day and three/week.
2. When messages compete, higher priority sends and the other skips with frequency-cap or waits as its node chooses.
3. Configured caps replace AUD-004’s campaign/flow defaults and any override follows AUD-009.
4. The same-day campaign/win-back fixture sends only the higher-priority message and records the other’s cap outcome.

#### FLOW-015 — Sequences

*Tier:* Core · *Rules:* D-2, D-3

**Requirement.** A linear sequence offers the Kit/ActiveCampaign day-by-day authoring journey on the same flow behavior.

**Acceptance.**
1. Operators choose emails, days after entry and allowed weekdays/hours.
2. Sequences use the same activation, eligibility rechecks and reporting as flows.
3. A five-email weekday-only sequence entered on Friday sends its first email Monday at the chosen hour.

#### FLOW-016 — Flow portability

*Tier:* Core · *Cites:* BASE-DATA-001 · *Rules:* D-2, D-3

**Requirement.** Restored flow work remains safely paused until the operator resumes it.

**Acceptance.**
1. Flow definitions, revisions, enrollments, timers and history are restored together.
2. A restored live flow appears paused with unchanged enrollments and sends nothing before explicit resume under fresh rechecks.
3. After resume each previously waiting message sends once.

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
1. a review excludes the holdout members with the global-holdout cause, and the overview report shows revenue per contact for holdout and messaged groups.

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

*Tier:* Core · *Cites:* BASE-OPS-003, BASE-MAIL-001

**Requirement.** US and Canadian SMS and MMS use the owner’s Twilio account with a Messaging Service and a registered 10DLC, verified toll-free or short-code sender. Signed status callbacks distinguish delivered, undelivered and failed; signed inbound webhooks carry replies. Australian senders retain the Mobile Message adapter, and each destination country selects its registered sender under MSG-001. The connection is made through SMS-008; SEND-001, SEND-005 and SEND-008 govern its recipient-step hand-off and reconciliation.

**Acceptance.**
1. Using an SMS-008 connection and a Twilio network edge, an approved SMS step hands off through its country’s registered sender.
2. Signed delivered, undelivered and failed callbacks retain their distinct outcomes; a replay creates no duplicate fact.
3. Signed replies enter the inbound path.

#### SMS-002 — Carrier registration status

*Tier:* Core

**Requirement.** Settings submits and tracks Twilio 10DLC brand and campaign registration or toll-free verification on the SMS-008 account. One pre-filled form uses the business identity, legal name, EIN, business type, website and contact, plus the brand’s sample messages, use case, opt-in description and screenshots and CONT-007 replies. The owner sees one-time and monthly USD fees before submission, fixes rejection reasons beside their fields and resubmits without the Twilio console. MSG-004 requires the sender’s approved registration; fees and carrier charges remain on the owner’s Twilio account.

**Acceptance.**
1. An Owner submits a pre-filled brand and campaign registration to a Twilio edge from Settings without a console step; the edge receives the sample messages and opt-in description.
2. A pending registration blocks SMS approval with the named unregistered-sender reason.
3. A rejection appears beside its field; correcting and resubmitting reaches the edge; approved state clears the block.
4. Toll-free verification and each fee are shown and submitted through the same owner-facing route.

#### SMS-003 — US quiet hours and state rules

*Tier:* Core

**Requirement.** Marketing texts use the US window of 08:00 to 20:00 in the recipient’s local time and any stricter state frequency rule, including Florida’s same-subject limit. Unknown location blocks hand-off. Recorded address or other location evidence outranks the telephone area code; a phone-only contact retains the area code as named evidence. Where it spans zones, only their window overlap applies. Operators may make the rule stricter. [The SMS mechanism](docs/contract/mechanism.md) records the quiet-hours policy.

**Acceptance.**
1. A scheduled message hands off only while each recipient’s local window permits it, including New York and Los Angeles fixtures.
2. A fourth same-subject Florida text within a day is skipped with the state-frequency cause.
3. A phone-only 305 contact is sent at 10:00 Eastern with area-code evidence shown and deferred at 20:30.
4. A multi-zone area code uses the windows’ overlap, while recorded location evidence takes precedence; an unknown zone sends nothing.

#### SMS-004 — Two-way SMS inbox

*Tier:* Core

**Requirement.** Replies appear in a conversation view per contact and in a shared inbox; operators can answer one-to-one (not marketing, logged under the operator), with compliance keywords still processed first (CONT-007). Replies can be forwarded to HappyToHelp or another help desk through a webhook.

**Acceptance.**
1. an inbound signed reply appears in the inbox and contact timeline; the operator's answer hands off through Twilio once; an inbound STOP opts the number out before the webhook is acknowledged and shows in the thread.

#### SMS-005 — Branded short links and MMS

*Tier:* Core

**Requirement.** SMS links use the owner’s branded short domain and RESULT-005’s per-recipient-step tracking without disclosing the contact. MMS images reuse CAMP-012’s stored asset within carrier limits.

**Acceptance.**
1. a sent SMS's short link records one click for that recipient and redirects to the original URL; a click from a known link-preview bot is retained as automated and excluded from engagement.

#### SMS-006 — SMS cost control

*Tier:* Core

**Requirement.** Review shows estimated USD SMS cost from segments, recipient count, configured provider rates and carrier surcharges. The owner can set a daily SMS spend cap; dispatch stops before a hand-off would exceed it, with a counted budget cause. RESULT-004 records actual provider costs.

**Acceptance.**
1. a step whose estimate exceeds the cap shows a blocking finding at review; with a cap reached mid-dispatch, remaining recipient-steps skip with the SMS-budget cause.

#### SMS-007 — WhatsApp marketing messages

*Tier:* Core

**Requirement.** Through the owner's WhatsApp Business account (Twilio or Meta's Cloud API), Mango sends pre-approved WhatsApp templates to contacts with WhatsApp-specific opt-in evidence, with delivery and read receipts as provider facts and opt-out replies honored like SMS.

**Acceptance.**
1. a template campaign to an opted-in contact hands off through the provider edge, records the delivered fact, and an opt-out reply excludes the contact from the next send.

#### SMS-008 — Twilio connection an owner makes in Settings

*Tier:* Core · *Cites:* BASE-SECRET-001, BASE-ROLE-001

**Requirement.** An Owner connects Twilio in Settings without deployment edits or a redeploy. Mango reads account state, names suspended or trial accounts, creates its own Messaging Service, wires signed inbound and status deliveries and lets the owner choose or buy a number after seeing its price. Moving a number from another service identifies it and requires the person’s confirmation; another service’s routes are unchanged. A signed status callback for a test text to the Owner completes connection. Settings shows credentials, account, service, numbers, registration and callback state with fixes; loss of credentials or service raises Home and email alerts and fences SMS sending. [The Twilio mechanism](docs/contract/mechanism.md) specifies custody and wiring.

**Acceptance.**
1. On a fresh installation without SMS deployment inputs, an Owner connects a Twilio edge from Settings without redeployment.
2. The edge contains Mango’s service with its status and inbound destinations; an existing service is unchanged.
3. Until the Owner test text’s signed callback arrives, SMS approval names missing events; verified storage of that callback passes the step.
4. A signed inbound STOP opts the number out through CONT-007.
5. Credential rotation at the edge raises the Home alert and blocks SMS approval.
6. An Admin cannot connect; number purchase shows price, and moving an assigned number names its old service before the person confirms.
7. Replacing credentials preserves the uncertain-handoff fences, and the labelled developer route follows the owner route.

#### PUSH-001 — Web push

*Tier:* Core

**Requirement.** A store offers a soft prompt before the browser’s push permission prompt, using owner-held push credentials. Campaigns and flows send title, body, image and link. Browser or Mango withdrawal ends this separate channel subscription.

**Acceptance.**
1. A browser grants permission and receives an approved campaign’s push through a test push service.
2. Revoking permission prevents the next send and records the unsubscribed-push cause.

#### PUSH-002 — Mobile app push and in-app messages

*Tier:* Core · *Cites:* BASE-SECRET-001

**Requirement.** For a business with its own iOS or Android app, an SDK registers devices against contacts and Mango sends push through APNs and Firebase Cloud Messaging with the owner's credentials, plus in-app messages shown on the next app open, from campaigns and flows.

**Acceptance.**
1. a test app registers a device; a flow push reaches it through the APNs and FCM edges; an in-app message shows once on next open and records its view.

### Deliverability

#### DELIV-001 — Sending providers

*Tier:* Core · *Cites:* BASE-MAIL-001

**Requirement.** Marketing email uses the owner’s SendGrid, Resend, Amazon SES, Postmark broadcast stream, Mailgun or authenticated SMTP account. Adapters state deduplication, event and lookup capabilities, with SEND-006’s distinctions applied to each. The owner-facing connection and event proof come through DELIV-008 and DELIV-010; deployment-input configuration does not substitute for that journey.

**Acceptance.**
1. Each adapter’s edge journey sends through a Settings connection and displays its capabilities on campaign detail.
2. An SMTP relay without signed events reports only hand-off and acceptance and no delivered count.

#### DELIV-002 — Domain setup

*Tier:* Core · *Register:* R-502

**Requirement.** A setup guide gives the exact SPF, DKIM, DMARC and return-path records for the chosen provider, read from the connected account (DELIV-008), which Mango asks to create the domain authentication for the From domain when none exists, checks them in public DNS (MSG-002), sets up a branded tracking and link domain with TLS, and explains BIMI with the DMARC policy it needs.

**Acceptance.**
1. the sender-verification journey reports each record pass or fail with the record to add, and a tracking domain with a valid CNAME rewrites tracked links to it.
2. On a provider edge with no domain authentication for the From domain, Mango creates it at the edge and shows the edge's records.

#### DELIV-003 — Bulk-sender compliance dashboard

*Tier:* Core

**Requirement.** The bulk-sender dashboard shows Mango’s state against Gmail, Yahoo and Microsoft requirements: SPF and DKIM, aligned DMARC, one-click unsubscribe, unsubscribe processing time and complaint rate from signed provider facts, plus Google Postmaster Tools when connected. Until DELIV-010’s event proof completes, the rate says events are not connected. Warnings precede MSG-011’s sending block.

**Acceptance.**
1. with seeded provider facts at a 0.25 per cent complaint rate, the dashboard warns; at 0.3 per cent the MSG-011 block shows the same figures.
2. With no signed event received yet, the complaint rate reads delivery events not connected.

#### DELIV-004 — Domain warm-up

*Tier:* Core

**Requirement.** For a new sending domain or dedicated IP, Mango proposes a warm-up schedule (daily volume steps over two to six weeks), sends to the most engaged contacts first, and enforces the day's cap across campaigns and flows, deferring the rest.

**Acceptance.**
1. with warm-up on and a 2,000-a-day cap, a 10,000-recipient campaign hands off 2,000 most-engaged recipients on day one and continues the next day within the step deadline or skips with the warm-up-cap cause.

#### DELIV-005 — Mailbox-provider breakdown

*Tier:* Core

**Requirement.** Reports split delivered, bounced, complained and clicked by recipient mailbox provider (Gmail, Outlook and Hotmail, Yahoo and AOL, Apple iCloud, other) and bounce reasons into a stated taxonomy (invalid address, mailbox full, policy block, reputation, content, other).

**Acceptance.**
1. Signed recipient outcomes report delivered, bounced, complained and clicked separately for Gmail, Outlook/Hotmail, Yahoo/AOL, Apple iCloud and other mailboxes.
2. Bounce reasons classify invalid address, mailbox full, policy block, reputation, content and other; seeded Gmail and Outlook bounce facts appear under the right provider and reason.

#### DELIV-006 — Address quality at intake

*Tier:* Core

**Requirement.** Forms and imports flag invalid syntax, missing mail exchangers, disposable domains and role addresses separately. Operators decide whether to keep flagged rows, recording that choice. Purchased and rented lists remain outside the product’s boundaries.

**Acceptance.**
1. an import with each kind of flagged row reports them separately; keeping them records the operator's decision.

#### DELIV-007 — Sender evidence renewal without stopping live flows

*Tier:* Core · *Cites:* BASE-MAIL-001, BASE-OPS-003

**Requirement.** Sender-receipt evidence renews before its expiry or invalidation by provider, DNS, binding or credential changes. Home and email reminders name renewal work and waiting-message counts and deadlines; authenticated receipt-connector results can renew without a person’s click, while published DNS alone cannot. A lapse visibly holds scheduled campaign and flow hand-offs until their send-by deadline, then skips them with the named cause. Renewed work resumes in order within five minutes, at most once, and enrollment history shows the wait. [The renewal mechanism](docs/contract/mechanism.md) retains the reminder schedule and custody.

**Acceptance.**
1. At day 23 after confirmation, Home shows renewal and the mail edge receives the reminder and diagnostic messages; day 29 repeats the final reminder.
2. At day 31 the next live welcome message waits for lapsed sender evidence, and Home counts it with its earliest deadline.
3. Confirming the diagnostic resumes that message within five minutes, once and in original order.
4. A changed DNS signing record raises the same card immediately and holds the next message; a deadline passed during the lapse records its skip cause.
5. With an authenticated receipt-connector fixture, day-23 renewal requires no click.

#### DELIV-008 — Sending connection an owner makes in Settings

*Tier:* Core · *Cites:* BASE-SECRET-001, BASE-ROLE-001 · *Register:* R-502

**Requirement.** An Owner connects SendGrid or Resend in Settings without a terminal or redeploy on Managed, Assisted or Free. Permissions are read before mutation, missing permissions are named and overbroad permission is disclosed against the restricted list. The private connection survives restore. Managed transactional mail remains on its relay; Free and Assisted use the connection for sign-in and confirmation once made, with deploy-time owner admission before that. DELIV-010 wires events and DELIV-009 watches the connection. [The connection mechanism](docs/contract/mechanism.md) names provider scopes and encrypted custody; RL-82 records the owner authorization boundary.

**Acceptance.**
1. On fresh Managed and Free installations without mail deployment credentials, an Owner connects each provider edge in Settings without redeployment.
2. No route, page, log or export contains the key; Settings shows only provider, last four characters, connecting person and time, and a private-settings restore retains the connection.
3. On Free, an invited operator’s sign-in mail uses the connected provider; before connection invitations name missing sending configuration.
4. A SendGrid key missing webhook permissions and a sending-only Resend key are each named and create no webhook; broader SendGrid permission is labelled with the restricted list.
5. Admin, Manager and Author cannot connect, replace or disconnect.

#### DELIV-009 — Sending-connection watch and replacement

*Tier:* Core · *From:* DELIV-008 · *Cites:* BASE-SECRET-001, BASE-MAIL-001, BASE-OPS-005

**Requirement.** Mango inspects its owned webhook at every approval and daily. Revoked credentials, deleted or unsigned delivery configuration or a day of accepted hand-offs without events raise named Home and Owner/Admin email alerts, fence approval and activation, and hold hand-offs until their deadlines. Replacement repeats connection checks and invalidates sender evidence; disconnect removes the private key and owned webhook. Uncertain hand-offs remain unreplayed through either action. The labelled developer route follows the owner route and applies equivalent checks apart from automatic webhook creation.

**Acceptance.**
1. Revoking each provider’s key or deleting Mango’s webhook raises the Home and email notices and blocks approval with the named cause.
2. Disabling signing or a day of accepted hand-offs without signed events raises its distinct cause and applies the same hold, deadline and activation behavior.
3. Replacing a key leaves every uncertain recipient-step unsent and reruns permission, domain, event and sender-evidence work.
4. Disconnect removes the stored key and owned webhook and blocks approval as disconnected.
5. Every connect, replace and disconnect records the actor, time and provider in OPER-007’s activity.
6. Settings shows which configuration route applies, reads the developer route only without a Settings connection and applies equivalent event checks.

#### DELIV-010 — Signed delivery-event connection

*Tier:* Core · *From:* DELIV-008 · *Cites:* BASE-SECRET-001, BASE-OPS-003, BASE-MAIL-001

**Requirement.** Mango creates and owns one provider webhook for its deployment, leaving every unrelated account setting and webhook unchanged. The person sees the account, destination, event list and signing before creation. Signing failure removes the new webhook; reconnect reuses the owned identifier. Connection completes on a signed event for Mango’s own diagnostic, not a provider test. No-slot accounts see the limit and the documented transparent signed-forwarding route. [The delivery-event mechanism](docs/contract/mechanism.md) lists exact subscriptions and signature rules.

**Acceptance.**
1. Each SendGrid and Resend edge records one disclosed webhook with the required event set and signing; reconnect creates no duplicate and an unrelated webhook is unchanged.
2. If signing cannot be enabled or its key read back, no newly created Mango webhook remains and the step shows failure.
3. Unsigned and stale signed deliveries change nothing.
4. Before a signed Mango diagnostic event, approval and flow activation name missing delivery events; verified storage passes the webhook step.
5. A signed hard bounce suppresses before the next hand-off, while a delivered event shows Delivered on campaign detail.
6. No free webhook slot leaves the provider unchanged and shows its limit plus the forwarding route.
7. Settings shows each permission, domain, DNS, webhook, signing, first-event and sender-check step with its state and fix; Home shows failed steps and reports distinguish unconnected events from zero outcomes.

### Reporting and attribution

#### REPORT-001 — Overview dashboard

*Tier:* Core

**Requirement.** The overview compares a chosen period with the previous one and keeps observed results separate from forecasts.

**Acceptance.**
1. For a seeded month of sends, orders and holdouts, each displayed figure reconciles to the underlying records.
2. Attributed USD revenue is split between campaigns and flows, and incremental revenue measured by a holdout is labelled separately.
3. The page also compares list growth by source, clicks, conversions, deliverability health, provider cost and top campaigns and flows; PROP-008 forecasts are never results.

#### REPORT-002 — Campaign and flow performance tables

*Tier:* Core

**Requirement.** Campaign, flow and flow-message performance can be inspected, sorted, filtered and exported.

**Acceptance.**
1. Tables list recipients, delivered, clicks, unique clicks, click rate, unsubscribes, complaints, conversions, revenue and revenue per recipient for each campaign, flow and flow message.
2. Channel, topic and date filters affect the on-screen table and CSV identically; the CSV rows equal the visible filtered rows.
3. Each campaign and flow message opens its RESULT-007 per-link detail.
4. When RESULT-002 open estimates are enabled, the screen and CSV label the added open-rate column as an estimate; when disabled, both omit it. Estimates never rank an experiment winner or determine attribution.

#### REPORT-003 — Attribution for campaigns, flows and SMS

*Tier:* Core

**Requirement.** Attribution extends RESULT-003 to flows and SMS, with an editable reporting policy that leaves source facts unchanged.

**Acceptance.**
1. One conversion metric is used: Placed Order unless the operator selects a custom event. Each channel has a click window, initially seven days for email and SMS.
2. An order following an SMS click and an earlier email click is attributed once to the most recent qualifying non-automated click; refunds and cancellations subtract.
3. Every revenue figure shows its metric and window; changing the window to one day recalculates reports without changing stored events.
4. Flows use the same attribution policy and carry their revenue through the flow reports.

#### REPORT-004 — Customer and retention analytics

*Tier:* Core

**Requirement.** Retention reports describe customers and purchasing patterns using recorded orders.

**Acceptance.**
1. The seeded order history produces an independently reconciled repeat-purchase rate and first-order-month cohort retention table.
2. Reports show median days between orders and customer value by acquisition source and form.
3. Product affinity shows products bought together and the next product bought.

#### REPORT-005 — List growth and consent sources

*Tier:* Core

**Requirement.** List growth reconciles subscriptions and removals with their consent sources. Earlier membership history that cannot be reconstructed is outside the history boundary.

**Acceptance.**
1. By day and by form, landing page, kiosk, import and integration, the report separates subscriptions, confirmations, resubscriptions and unsubscriptions and links each source to its consent wording version.
2. For a seeded period from the recorded membership-history baseline onward, opening subscribed membership plus captures, confirmations, resubscriptions, opt-outs, suppression and removal equals closing membership.
3. Retained evidence from before the baseline is labelled as evidence and implies no earlier membership change; deleted, erased or merged earlier membership history is not reconstructed.
4. Anonymous counts survive erasure while links to erased evidence do not.
5. The source reconciliation includes the dedicated forms, landing pages and kiosks of FORM-002, FORM-004 and FORM-009 and the full CONT-027 resubscription journey.

#### REPORT-006 — Scheduled and custom reports

*Tier:* Core · *Cites:* BASE-MAIL-001

**Requirement.** Operators save a metric by dimensions over time and deliver saved reports on a schedule.

**Acceptance.**
1. Any report can be scheduled weekly or monthly by email or Slack to chosen operators, with no contact identities.
2. A weekly report reaches the mail provider once at its scheduled time with the same figures as the saved report.

#### REPORT-007 — Usage and cost transparency

*Tier:* Core

**Requirement.** Owners can see use and actual provider cost without contact-count billing or sending limits.

**Acceptance.**
1. Mango never bills or limits sending by contact count.
2. Settings shows contact counts by consent state and email, SMS, AI and design cost by campaign, flow and day.
3. Campaign and day totals reconcile with RESULT-004 provider facts; a flow shows its own costs.
4. The projected month uses the disclosed priced month-to-date UTC run rate, keeps each reported currency separate without conversion and counts unpriced facts rather than treating them as zero.

### Integrations

#### INT-001 — Shopify

*Tier:* Core

**Requirement.** The owner-facing Mango for Shopify connection in INT-015 and its wiring, sync, trust, disconnection and privacy parts carries customers and Shopify email/SMS marketing evidence, products, variants, collections, inventory, orders, refunds, fulfillments, checkouts, carts and pixel events. Incumbent-held opt-ins use CONT-024 and CONT-025 after checkout disclosure attestation, while Mango opt-outs prevail and write back to Shopify. The connection creates approved BUILD-007 discount codes and offers forms and tracking. A developer connection alone does not meet this merchant-install journey.

**Acceptance.**
1. Run native sync, signed cart and pixel journeys on an INT-015 installation and show every declared source type with source identity and time.
2. A Mango unsubscribe reads back as unsubscribed in the Shopify-edge customer record.
3. CONT-025’s Shopify opt-in journey preserves the attested opt-in mode and Mango’s stronger restriction.
4. Approved discount creation and form/tracking activation use the same installed connection.

#### INT-002 — WooCommerce

*Tier:* Core · *Cites:* BASE-SECRET-001, BASE-OPS-003

**Requirement.** A WooCommerce connection uses REST credentials, signed webhooks and the shipped WordPress tracking-and-forms plugin to synchronize customers, products, orders, refunds and abandoned checkouts. Under RL-83, store enablement begins off, observations require a signed-in customer’s explicit analytics and marketing consent, GPC revokes pending eligibility, and the plugin does not widen subscription permission or track across sites. The plugin’s single protected first-party cookie and observation retention follow [the WooCommerce mechanism](docs/contract/mechanism.md). Its form uses Mango’s confirmed signup door; abandoned-checkout events enter only an activated exact tag-and-exit revision, with no marketing message.

**Acceptance.**
1. An Owner connects the WooCommerce edge from Settings and synchronizes seeded customers, products, orders and refunds.
2. Replaying a signed order webhook preserves the existing source records and one receipt; conflicting bytes and forged origins are refused.
3. A plugin abandoned-checkout event enters the activated exact revision once, adds its contact tag and exits; draft, stale, purchased and opted-out cases do not enroll.
4. The shipped plugin script uses explicit consent, default-deny collection and GPC withdrawal without cross-site or subscription-permission widening.
5. The plugin’s signup form remains pending until Mango’s affirmative single-use confirmation.

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

*Tier:* Core · *Cites:* BASE-ACCESS-004, BASE-INPUT-001, BASE-OPS-003

**Requirement.** The public versioned REST API and JavaScript client let external systems identify contacts, set properties, track events, read rule-derived segment membership and submit subscriptions with consent evidence. Credentials are scoped, each key has its own rate limit, writes retain key attribution and event writes retain idempotent outcomes. The public API description matches these operations. Website keys remain on a website server behind its authenticated same-origin proxy; this does not authorize automatic visitor collection or consent inference.

**Acceptance.**
1. Identify and update a contact through the scoped API; the profile retains its properties.
2. The shipped JavaScript client concurrently repeats one custom event with one idempotency key and stores one event; conflicting content is refused.
3. The API and client return the contact’s rule-derived segment memberships.
4. A subscription without consent evidence returns the named consent-evidence error.
5. Exhausting one key returns a named rate-limit refusal with retry guidance while another key remains usable.
6. Writes retain their integration-key attribution, and the public API description declares their scopes.

#### INT-008 — Outbound webhooks

*Tier:* Core · *Cites:* BASE-OPS-003, BASE-OPS-004

**Requirement.** Owners subscribe HTTPS endpoints to Mango events (subscribed, unsubscribed, confirmed, message sent, clicked, converted, flow entered and exited, form submitted), signed with an HMAC secret, retried with backoff for 24 hours, with a delivery log.

**Acceptance.**
1. an endpoint that fails twice then succeeds receives each event once with a valid signature, and the log shows the attempts.

#### INT-009 — Zapier and Crank

*Tier:* Core · *Register:* R-503

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

**Requirement.** Campaign, flow and message links carry reviewed static UTM values for Google Analytics 4 and Vane. RL-105 freezes defaults into new drafts while preserving author parameters and previously approved revisions; ordinary web destinations alone receive them, with no contact interpolation or changes to managed/private links. Flow dimensions and Vane goal events through INT-007 remain part of this capability. [The analytics mechanism](docs/contract/mechanism.md) specifies the parameter labels.

**Acceptance.**
1. A sent message’s ordinary web links carry the reviewed campaign, flow and message dimensions.
2. Author parameters win; managed or private links and contact-derived values remain excluded.
3. Changing defaults affects new drafts and preserves previously approved revisions.
4. A Vane goal fixture creates one idempotent contact event through INT-007.

#### INT-014 — Reviews and loyalty apps

*Tier:* Core

**Requirement.** Events from Judge.me, Yotpo, Okendo and Smile.io (review submitted, points earned, tier changed) arrive through adapters on INT-007 and drive review-request and loyalty flows; Mango does not collect reviews itself.

**Acceptance.**
1. a review-submitted fixture exits the contact from the review-request flow as converted.

#### INT-015 — Shopify connection a merchant installs

*Tier:* Core · *Cites:* BASE-DATA-004, BASE-SECRET-001 · *Register:* R-501

**Requirement.** A merchant connects through the free Mango for Shopify public app without a developer account, terminal, secret deployment input or redeploy. Every Mango tier uses the shared connector only after installation-scoped Owner/Admin authorization under RL-106. The merchant may start in Mango Settings or the App Store; Shopify’s own hosted permission screen keeps its consent step. Settings lists required scopes and withheld protected fields truthfully. Run Edit Run obtains the App Store and protected-data approvals; these do not become merchant setup tasks. The labelled single-shop developer route remains after the merchant route. [The Shopify mechanism](docs/contract/mechanism.md) specifies the authorization protocol.

**Acceptance.**
1. On a fresh installation without commerce deployment inputs, an Owner connects a Shopify edge from Settings and returns connected after its permission screen, without redeployment.
2. An App Store start asks for the installation address and reaches the same authorization.
3. Granted scopes cover customer and order history, products and inventory, pixel, consent write-back, discount creation and theme inspection; withheld scopes or protected fields appear as unavailable.
4. An invalid shop, bad callback authentication or reused or expired authorization state completes no exchange and names its reason.
5. The public app remains free to install on every tier; a merchant is never asked for a developer account or app approval.
6. The developer route is labelled, not offered first, and applies every installation check that does not belong to the connector.

#### INT-016 — Shopify mandatory privacy intake

*Tier:* Core · *From:* INT-015 · *Cites:* BASE-DATA-003, BASE-OPS-005

**Requirement.** Authenticated Shopify customer access, customer erasure and post-uninstall shop erasure reach the installation even after ordinary disconnection. Acknowledgment follows durable installation receipt under RL-106. Access requests follow CONT-021; erasure follows CONT-013’s surviving opt-out rule, retaining unrelated Mango-held or other-source evidence. Shop erasure removes every record from that connection and its customers’ Shopify-only data. Every actual outcome is visible in OPER-007’s activity within Shopify’s deadlines.

**Acceptance.**
1. Badly authenticated mandatory privacy delivery is refused and changes nothing; acknowledgment of a valid delivery occurs only after durable installation receipt.
2. A customer-access delivery creates a request visible to Owner and Admin and completed within Shopify’s thirty-day deadline.
3. Customer erasure removes Shopify customer data under CONT-013 while preserving only the permitted surviving opt-out and unrelated evidence.
4. The delayed shop erasure after uninstall removes every connection source record and all Shopify-only customer data through the protected residual route.
5. Each privacy action records its actual outcome and meets its provider deadline.

#### INT-017 — Shopify disconnection and reinstall

*Tier:* Core · *From:* INT-015 · *Cites:* BASE-SECRET-001, BASE-OPS-003

**Requirement.** Disconnect, app uninstall or a revoked Shopify token visibly disconnects the store within sixty seconds. Live credentials and ordinary forwarding custody are removed; only time-bounded protected routing needed for later mandated privacy work remains under RL-106. Synced data stays, dependent approvals and audiences are fenced under STORE-005 and STORE-006, and store-triggered flows stop enrolling. Reinstallation resumes saved cursors.

**Acceptance.**
1. Uninstall or revoked authority shows the store disconnected with time on Home and Settings within sixty seconds.
2. Live administrative credentials, ordinary routing tokens, forwarding keys and counts are removed; only the declared time-bounded mandatory-redaction route remains.
3. A store-dependent campaign cannot approve, dependent audiences and activations stay blocked and new store-event flow enrollment stops.
4. Existing synced data stays, and reinstall resumes its saved cursors without restarting the import.

#### INT-018 — Shopify connector trust and custody

*Tier:* Core · *From:* INT-015 · *Cites:* BASE-DATA-004, BASE-DATA-005, BASE-SECRET-001, BASE-OPS-003

**Requirement.** The connector separates every shop and installation using its installation-scoped routing custody and authenticated provider content, forwards verified deliveries within five seconds under the installation’s own trust and re-reads customer, product and order notifications through that shop’s own account. It has no default destination. It retains only routing custody and delivery counts/failures, never the shop’s administrative credential or forwarded content. Administrative calls go directly from installation to Shopify. Supersedes `BASE-DATA-005` only for the explicitly selected connector dependency under RL-106; [the connector mechanism](docs/contract/mechanism.md) states precise retained facts and trust checks.

**Acceptance.**
1. Wrong-installation routing, bad provider authentication, another signed-body shop and bad forwarding authentication each produce no change.
2. Captured connector exchange leaves no administrative credential at the connector; protected fields remain installation-held.
3. Unmatched routing and disconnected shops reach no installation and return an error; no default installation exists.
4. Verified forwarding arrives within five seconds with the declared shop, topic, delivery identity and time, and downstream record changes re-read that shop’s authoritative data.
5. Forwarded bodies are not stored or logged; visible per-connection counts and failures contain only the declared routing observations.
6. A connector outage pauses forwarding and provider retries plus scheduled reconciliation recover missed work.

#### INT-019 — Shopify bulk first sync

*Tier:* Core · *From:* INT-015 · *Cites:* BASE-OPS-003

**Requirement.** The installed Shopify connection imports customers with marketing evidence, all available order history, refunds, fulfillments, products, variants, collections, inventory and thirty days of abandoned checkouts through bulk operations. Settings and Home show source progress and estimated completion. At SCALE-001’s buyer size the sync finishes within two hours and resumes after interruption without duplicates. Until each source completes, dependent segments, campaigns and flows stay visibly syncing and cannot resolve a partial audience.

**Acceptance.**
1. A seeded edge store with 250,000 customers and a year of orders completes its full declared source sync within two hours.
2. Progress and estimated finish remain visible per source on Settings and Home.
3. A forced restart resumes from saved position with no duplicate source records.
4. Before purchase data completes, the purchase segment shows syncing and approval or activation cannot use a partial audience.

#### INT-020 — Shopify wiring and first-use work

*Tier:* Core · *From:* INT-015 · *Cites:* BASE-OPS-004

**Requirement.** After Shopify authorization Mango creates its subscriptions, activates the site-configured pixel, opens the selected form/tracking theme embed and verifies its saved state. Settings shows every approval, scope, protected-data, subscription, pixel, theme, attestation and first-sync step with fixes, and Home shows failures. The connection leads through checkout consent attestation and supports an identified cart event, approved unique code and unsubscribe write-back through the same installation. Missing subscriptions are recreated on the next installation check.

**Acceptance.**
1. The Shopify edge records subscriptions and pixel creation with discount and customer-write authority.
2. Turning on and saving the selected theme embed makes its Settings step pass; every other step exposes state and a relevant fix.
3. Deleting a Mango subscription is repaired on the next check and shown in Settings.
4. An identified pixel cart event enrolls in the abandoned-checkout flow, its approved message obtains an edge-created unique code, and Mango unsubscribe reads back at Shopify.
5. Checkout opt-in attestation completes under CONT-024 and CONT-025.

### Migration from incumbents

#### MOVE-001 — From Mailchimp

*Tier:* Core · *Rules:* D-2 · *Register:* R-701

**Requirement.** Owners move their Mailchimp audiences and account history to Mango by export or live pull without upgrading any consent.

**Acceptance.**
1. Audience CSV exports preserve subscribed, unsubscribed, non-subscribed and cleaned states; a full account ZIP also carries audiences, sent-campaign history, templates, reports and granular activity.
2. A key-authorized live pull carries the same scope at MOVE-012 capacity. Merge fields become properties, tags become tags and groups become topics.
3. Subscribed rows carry CONT-024 incumbent-held evidence using source opt-in, confirmation or last-changed time under one owner attestation per audience; no status is upgraded.
4. Saved segments, classic automations, Customer Journeys, engagement history, overlapping audiences, converted templates and re-hosted images appear under MOVE-007 to MOVE-011, MOVE-014 and MOVE-015 with MOVE-006 reconciliation.
5. An API move-in keeps consent synchronized both ways until cutover under MOVE-013.
6. Mailchimp-format fixtures include a campaign-activity segment, classic automation, granular activity, overlapping audiences with conflicting statuses and a template with merge tags and styles; each yields its expected reconciliation lines through the same move-in journey.
7. The CONT-024 subscribed-file fixture and MOVE-012 full-scale generated export pass that journey.

#### MOVE-002 — From Klaviyo

*Tier:* Core · *Rules:* D-2

**Requirement.** Klaviyo profiles and marketing assets move by private-key pull or CSV, retaining source restrictions and naming unsupported flow steps.

**Acceptance.**
1. Email and SMS consent and timestamps carry CONT-024 evidence; custom properties, lists, suppressions, historical orders and engagement retain their source meaning.
2. Lists and segment definitions become reviewable segments, templates become templates and flows become draft flows with each unsupported step named.
3. The API fixture carries profiles, a segment and an abandoned-cart draft with its unmapped steps; MOVE-013 maintains two-way consent where the API permits it and names every gap.

#### MOVE-003 — From ActiveCampaign

*Tier:* Core · *Rules:* D-2

**Requirement.** ActiveCampaign contacts and automations move by CSV or API.

**Acceptance.**
1. Lists become topics and tags, custom fields, unsubscribes and bounces retain their meaning.
2. Automations become a readable outline and draft flows; the API fixture preserves an unsubscribed contact and produces a draft flow for its automation.
3. MOVE-013 keeps consent synchronized both ways until cutover where the API allows it and names each gap.

#### MOVE-004 — From Kit (ConvertKit)

*Tier:* Core · *Rules:* D-2

**Requirement.** Kit subscribers and sequences move by CSV or API.

**Acceptance.**
1. Active, cancelled, bounced and complained states, tags and custom fields retain every restriction; sequences become FLOW-015 draft sequences.
2. Kit-format synthetic files preserve every restrictive state and a sequence fixture becomes a draft sequence.
3. MOVE-013 keeps consent synchronized both ways until cutover where the API permits it and names each gap.

#### MOVE-005 — From beehiiv, Omnisend and Customer.io

*Tier:* Core · *Rules:* D-2

**Requirement.** beehiiv, Omnisend and Customer.io subscribers move by export or API without upgrading restrictions.

**Acceptance.**
1. Statuses, tiers, attributes and consent evidence retain their source meaning; active subscribers carry CONT-024 incumbent-held evidence as for ActiveCampaign and Kit.
2. One synthetic export per product leaves every unsubscribed or suppressed row restricted.
3. MOVE-013 keeps consent synchronized both ways until cutover where the API permits it and names each gap.

#### MOVE-006 — Reconciliation and cutover

*Tier:* Core · *Rules:* D-2

**Requirement.** Each move-in has a reconciliation report that accounts for the source data and every conversion finding.

**Acceptance.**
1. Rows read, created, updated and rejected reconcile to the files and contact table; rejections name reasons.
2. Consent is counted separately for Mango-captured, incumbent-held with each time source, time-unknown and non-subscribed for want of attestation, naming each supporting attestation.
3. The report counts suppressions, imported and dropped engagement rows, audiences and overlaps, recreated segments and unsupported conditions, automations and journeys and unmapped steps, and template conversion findings.
4. Nothing imported is scheduled, sent or live until its campaign approval or flow activation; MOVE-016 governs cutover.

#### MOVE-016 — Move-in cutover checklist

*Tier:* Core · *From:* MOVE-006 · *Rules:* D-2

**Requirement.** An owner completes an inspectable cutover checklist before closing the incumbent account.

**Acceptance.**
1. The checklist covers sender-domain DNS, replaced forms, recreated and reviewed flows, a parallel week under MOVE-013 synchronization or export re-import before each Mango send, and the old platform’s sending switched off.
2. It names each template, draft, scheduled campaign or live message that still uses an incumbent image host, as MOVE-014 requires.
3. Marking cutover complete ends the parallel sync under MOVE-025.

#### MOVE-007 — Mailchimp saved segments

*Tier:* Core · *Rules:* D-2

**Requirement.** Mailchimp saved segments become reviewable draft segments with visible differences from the original.

**Acceptance.**
1. A key-authorized pull reads every moved audience’s saved segments with their match type and conditions; no campaign uses one until an operator saves it.
2. Merge fields, tags, groups, signup date, location, contact rating, engagement and ecommerce conditions map respectively to properties, tags, topics and SEG-001/SEG-006 conditions over imported facts.
3. Sent, open, click and no-click conditions for a named campaign or any of the last five map over MOVE-009 history; classic-automation started/completed conditions map over MOVE-017 history and drafts.
4. Each unsupported condition is named in the segment and report; its recreated count is displayed beside Mailchimp’s count.
5. Export-only moves carry static segments as tags and explain that definitions require an API pull.
6. The fixture recreates “clicked campaign X and engagement is often” with independently expected membership and separately reports the other segment’s unsupported condition.

#### MOVE-008 — Mailchimp automations and Customer Journeys

*Tier:* Core · *Rules:* D-2

**Requirement.** Classic Mailchimp automations become inspectable draft flows.

**Acceptance.**
1. Triggers, delays and emails are read through the available API, each email is converted under MOVE-011, and every unmapped trigger, delay or setting is named.
2. A two-email welcome automation fixture produces a draft with both converted messages and named delays; it is not live.
3. Moved-in drafts carry AUD-009’s moved-flow frequency setting and cannot activate before FLOW-008.

#### MOVE-017 — Customer Journey inventory and drafts

*Tier:* Core · *From:* MOVE-008 · *Rules:* D-2

**Requirement.** Customer Journeys without a read API are rebuilt from an explicit inventory.

**Acceptance.**
1. Journey email reports and content in the API and export supply journey names; the owner confirms or adds each live journey’s name and starting point using a checklist matching Mailchimp’s starting points.
2. Each starting point selects its FLOW-012 library draft, including abandoned-cart, welcome, birthday and anniversary flows, and carries over readable email content.
3. Every unreadable or unmapped rule, branch and action is named for rebuilding.
4. The two-email abandoned-cart fixture becomes a draft with both messages and an unreadable-branch report line; nothing is live before FLOW-008, and AUD-009’s moved-flow setting applies.

#### MOVE-009 — Incumbent engagement history

*Tier:* Core · *Rules:* D-2

**Requirement.** Mailchimp export engagement becomes historical imported facts, separate from native sending and consent.

**Acceptance.**
1. Granular-activity clicks and opens for three known contacts and one unknown address produce one fact per accepted row on the matching contact at its original time.
2. Each fact links to imported campaign history and links, and the timeline labels it imported with its source.
3. The reconciliation report counts imported and dropped rows, including unknown addresses.
4. Imported clicks count for CONT-012 and AUD-008 dormancy; imported opens remain estimates and never count as engagement.
5. Importing facts creates no Mango send facts, results or attribution and changes no consent; existing populated campaign results remain identical.
6. MOVE-015 owns API-key activity, other incumbents and the remaining engagement uses.

#### MOVE-010 — Several audiences

*Tier:* Core · *Rules:* D-2

**Requirement.** Several incumbent audiences reconcile into one brand without losing topic-specific restrictions.

**Acceptance.**
1. The owner chooses what every Mailchimp audience or Klaviyo/ActiveCampaign list becomes: a topic by default, or a separate brand in its own installation.
2. Overlapping addresses become one CONT-001 contact, retaining per-topic source states; within a topic/channel CONT-011’s most restrictive status wins and cleaned or complained addresses remain channel-suppressed across topics.
3. Conflicting merge-field values are listed and the owner selects the winning audience per field.
4. The overlapping-audience fixture preserves subscribed topic A and unsubscribed topic B, channel suppression and the listed first-name conflict, with each audience and overlap counted.

#### MOVE-011 — Incumbent template conversion

*Tier:* Core · *Rules:* D-2

**Requirement.** Imported templates and campaign bodies become builder templates with mapped personalization and visible unmapped content.

**Acceptance.**
1. Mailchimp templates and campaign bodies and Klaviyo, ActiveCampaign and Kit templates become BUILD-002 templates in the email grammar.
2. Name, other merge-field properties, unsubscribe, preference-center, postal-address, archive, date and year tags map to their Mango equivalents with owner-confirmed fallbacks; Klaviyo-style name tags map the same way.
3. The report names each mapped and unmapped tag and its location; an unknown tag stays visible and blocks personalization approval.
4. The fixture resolves the mapped name, unsubscribe, postal-address and archive tags in preview and reports its unknown tag; MOVE-018 governs its styles and MOVE-019 the remaining conversion findings.

#### MOVE-018 — Converted template styles and readability

*Tier:* Core · *From:* MOVE-011 · *Rules:* D-2

**Requirement.** Template conversion preserves admitted styles and makes readability changes inspectable.

**Acceptance.**
1. Style rules are inlined on the elements they select only where the grammar admits them; mappable media queries become BUILD-010 mobile settings and classes and other rules are removed.
2. The report lists every dropped rule, property or block with its location and the mapped mobile rules.
3. Text below MSG-012’s contrast bar is recoloured to the nearest shade of its hue reaching 4.5:1 against its judged background, with before/after colours and location reported.
4. An operator can undo a recolouring in the builder, after which MSG-012 blocks approval when required.
5. The fixture preserves source-admitted colours and sizes, reports the dropped hidden-display rule and mapped mobile rule, and passes the checker apart from its unknown-tag block; the grey-on-white footer fixture becomes the stated darker grey and passes.

#### MOVE-019 — Held conversions and outside hosts

*Tier:* Core · *From:* MOVE-011 · *Rules:* D-2

**Requirement.** Conversion keeps oversize content and outside hosts visible through review and cutover.

**Acceptance.**
1. Each report lists outside link/image hosts, sent size against BUILD-012 and MSG-012 checker results; MOVE-014 brings images home.
2. An oversize conversion is held rather than dropped, listed with measured size and largest blocks in both reports, and opens in the builder for trimming before template save.
3. The filled Mailchimp three-column blueprint converts, reports size and starts a draft that saves and reaches approval; an inflated fixture is held and reported.
4. Reconciliation aggregates outside hosts across all templates and campaign bodies with use counts; the owner can allow chosen hosts in one recorded action.
5. Unallowed hosts appear again with MSG-015 allowance actions when a resulting campaign or flow message reaches review; the three-host fixture proves both report and review paths.

#### MOVE-012 — Move-in at the buyer's scale

*Tier:* Core · *Rules:* D-2

**Requirement.** Full-size move-in uploads and previews stay bounded and durable.

**Acceptance.**
1. Every incumbent route completes at SCALE-001 floors, including a Mailchimp account ZIP up to 2 GB, 250,000 audience rows and 52 weekly campaigns with up to 25,000,000 activity rows.
2. Browser uploads go directly to object storage in resumable parts and only a failed part is resent; processing streams through bounded durable steps with staged rows rather than whole archives, text or row snapshots in memory.
3. Preview writes no contact, displays every count with downloadable row details, and preserves archive custody hashes, undo and idempotent rerun.
4. A CSV audience file up to the SCALE-001 row floor is one review; oversize archives and pulls refuse before any write with their reason and limit.
5. The generated subscribed/unsubscribed/non-subscribed/cleaned export completes the real move-in journey; MOVE-021 governs interrupted completion and exact review.

#### MOVE-020 — Full-size API move-in

*Tier:* Core · *From:* MOVE-012 · *Rules:* D-2

**Requirement.** Full-size API migration keeps its position within the incumbent’s limits.

**Acceptance.**
1. A key-authorized Mailchimp pull reads members, merge fields, tags, segments, automations, campaigns and campaign activity through bounded pagination or batches within provider connection/rate limits.
2. Its saved cursor supports the same contact/activity counts as MOVE-012; every other incumbent route meets the same SCALE-001 floors.
3. A generated API fixture at full export size completes under the same reconciliation and resumption acceptance as MOVE-012 and MOVE-021.

#### MOVE-021 — Move-in resumption and reconciliation

*Tier:* Core · *From:* MOVE-012 · *Rules:* D-2

**Requirement.** Interrupted move-ins resume from committed progress without duplicate work.

**Acceptance.**
1. Worker eviction, deployment, provider rate limits and a closed browser resume from the last committed step with no duplicate contact or activity fact and no re-upload.
2. The move-in page shows progress by part and an estimated finish; no imported content sends before MOVE-006 approval or activation.
3. A forced worker restart during full-scale activity import resumes to completion; reconciliation adds up per file, evidence kind and activity rows.
4. A campaign over the whole subscribed audience reaches review with an eligible count equal to an independent count over the generated files; the run records wall time and peak memory.

#### MOVE-013 — Two-way sync during the parallel run

*Tier:* Core · *Rules:* D-2

**Requirement.** During a parallel run, incumbent and Mango consent stay synchronized until explicit cutover.

**Acceptance.**
1. An API move-in registers Mailchimp audience changes from subscribers, admins and API users for subscribe, unsubscribe, profile, email-change and cleaned outcomes.
2. Incoming unsubscribes and abuse complaints apply CONT-004/CONT-006, and cleaned members are suppressed before the next Mango handoff.
3. New subscribers carry CONT-024 evidence under the audience attestation, pending stays pending and admitted triggers enter FLOW-002, including welcome.
4. Profile changes update mapped properties; address changes retain CONT-001 consent, and no incoming event upgrades a Mango opt-out or suppression.
5. The API fixture’s unsubscribe and cleaned contacts are excluded with the corresponding reasons and its newly subscribed contact enters the live welcome flow.

#### MOVE-022 — Parallel-run verification and freshness

*Tier:* Core · *From:* MOVE-013 · *Rules:* D-2

**Requirement.** The parallel sync authenticates and verifies changes and catches up before sending.

**Acceptance.**
1. Mailchimp’s unsigned webhook uses a secret unique to that move-in; a wrong secret changes nothing. Mango rereads the member before applying, allowing unsubscribe or clean during failed reads but holding subscribe/profile changes.
2. A cursor repull every 15 minutes recovers missed changes idempotently; dropping the fixture webhooks yields the same unsubscribe, clean and subscribe outcomes before dispatch.
3. Campaign dispatch first completes a repull from the preceding 15 minutes; a flow handoff with no successful repull in 30 minutes waits for recovery until CAMP-010’s deadline.
4. Approval identifies stale incumbent synchronization as a blocking CAMP-004 check.

#### MOVE-023 — Restriction writeback

*Tier:* Core · *From:* MOVE-013 · *Rules:* D-2

**Requirement.** Mango restrictions are written back to every moved audience that holds the address.

**Acceptance.**
1. Every unsubscribe, one-click unsubscribe, preference opt-out, suppression and erasure is written as unsubscribed; the erasure write precedes completion.
2. Transient writeback failures retry up to five times over an hour. Exhaustion appears on move-in and Home with count, error, retry action and downloadable pending-suppression CSV.
3. The echo of Mango’s writeback is recognized once.
4. The fixture carries an email unsubscribe to Mailchimp and a forced provider failure through retries to a visible failed writeback.

#### MOVE-024 — Export-only parallel-run custody

*Tier:* Core · *From:* MOVE-013 · *Rules:* D-2

**Requirement.** An export-only move makes its consent-freshness limits explicit through the parallel week.

**Acceptance.**
1. Without a key, the move-in page explains that later incumbent changes are unseen and requires a newer export before each Mango send.
2. Reimports are idempotent deltas: restrictions apply, source-attested new subscribers arrive and no status upgrades.
3. Approval records an advisory acknowledgment when the latest known incumbent send follows the import, or after 24 hours when an inventoried journey has not been marked off.
4. The export-only fixture with later sent history displays that advisory.

#### MOVE-025 — End the parallel run

*Tier:* Core · *From:* MOVE-013 · *Cites:* BASE-AUDIT-001 · *Rules:* D-2

**Requirement.** Owner or Admin cutover ends synchronization in a recorded sequence.

**Acceptance.**
1. Marking cutover complete first flushes pending writebacks and lists any still failing.
2. It then deletes incumbent webhooks, stops repulls and writebacks and removes the stored incumbent key; the activity log records the operator and event.
3. A later event at the old webhook receives a gone response and changes nothing; the fixture proves remote webhook removal and no later Mango effect.
4. Until cutover, Home shows parallel-run day count and last sync success.

#### MOVE-026 — Other-incumbent parallel sync

*Tier:* Core · *From:* MOVE-013 · *Rules:* D-2

**Requirement.** Each supported incumbent uses its available consent-synchronization route and exposes any missing direction.

**Acceptance.**
1. Klaviyo uses a 15-minute profile/subscription repull and unsubscribe/suppression writeback jobs.
2. ActiveCampaign uses subscribe, unsubscribe, bounce and contact-update webhooks plus repull, with unsubscribed list-status writeback.
3. Kit uses activate, unsubscribe, bounce and complaint webhooks plus repull and unsubscribe writeback.
4. beehiiv, Omnisend and Customer.io use subscription webhooks or repull and subscription/attribute writeback.
5. An absent writeback API or buyer-plan permission is named and adds a suppression-CSV import to cutover; each incumbent’s move-in page states both mechanisms and gaps.
6. The Klaviyo API fixture and Kit webhook fixture each carry one unsubscribe in and one writeback out.

#### MOVE-014 — Incumbent images brought home

*Tier:* Core · *Rules:* D-2

**Requirement.** Imported images are brought home before an incumbent account closes.

**Acceptance.**
1. Templates, campaign bodies and flow messages use re-hosted CAMP-012 images for every incumbent host named by its migration fixtures.
2. Export galleries match by file name and content; API and missing-gallery images are fetched once under MSG-006 inspection within CAMP-012 type, byte and pixel bounds.
3. Image sources are rewritten to this deployment’s content-addressed media while alt text, size, link and bytes stay unchanged; the report names each re-hosted or failed image and reason.
4. A failed image stays at its old host until an operator uploads a replacement; cutover counts re-hosted, failed and remaining hosts and names every template, draft, schedule or live flow still using one.
5. The export fixture’s three gallery images and the API image return identical re-hosted bytes; the not-found image is reported and blocks the checklist item until replaced, naming its template.

#### MOVE-015 — Incumbent engagement history beyond the Mailchimp export

*Tier:* Core · *Rules:* D-2 · *Register:* R-702

**Requirement.** API-key activity and other incumbents’ histories retain MOVE-009 custody and support the remaining engagement uses.

**Acceptance.**
1. Mailchimp API activity becomes one historical click/open fact per activity for matching contacts at original times, with MOVE-009 reconciliation, timeline and unchanged-result outcomes.
2. Unknown addresses are dropped and counted; the fixture has three contacts, two sent campaigns and an unknown address.
3. All imported clicks feed CONT-020 sunsetting, SEG-005 scores, SEG-006 activity segments and EXP-006 send-time optimization; imported opens feed none of them.
4. Klaviyo, ActiveCampaign, Kit and the other incumbents’ export/API fixtures carry the same history where the provider exposes it.

### Mobile

#### MOBILE-001 — Responsive operator app

*Tier:* Core · *Cites:* BASE-ACCESSIBILITY-001 · *Register:* R-801, R-802

**Requirement.** Every operator page is usable at phone width, including the flow canvas and its node details.

**Acceptance.**
1. At 390 pixels the dashboards, reports, contact lookup, campaign review/approval, flow status/pause, forms and settings have no horizontal scroll.
2. The flow canvas is readable and node details are available; each page meets the shared Base accessibility bar.

#### MOBILE-002 — Native iOS and Android app

*Tier:* Core · *Cites:* BASE-ROLE-001 · *Register:* R-703

**Requirement.** Native iOS and Android apps carry the operator’s first-week work.

**Acceptance.**
1. The app shows overview, campaign and flow reports; an authorized role opens a waiting revision with its full web-equivalent previews/checks and approves it.
2. An operator pauses a flow, stops sending under FLOW-011 and answers SMS under SMS-004.
3. Push alerts cover approval requests, flow errors, deliverability blocks and provider outages.
4. An app journey signs into a test installation, approves a revision with the web checks, receives an outage push from the provider edge and proves an unauthorized role has no approval control and server refusal.
5. The app never sends offline.

### Publishing and monetization

#### PUB-001 — Web archive

*Tier:* Core · *Cites:* BASE-PUBLIC-001 · *Rules:* D-2

**Requirement.** A sent newsletter can be shared as a neutral public web version.

**Acceptance.**
1. Publishing a sent campaign creates its public page and archive-index entry.
2. The RSS feed includes the published issue and the public page carries search-engine metadata.
3. Personalization becomes neutral text; public output contains no recipient token or personal value, unsubscribe link or private tracking link.

#### PUB-002 — Paid newsletters

*Tier:* Core · *Cites:* BASE-SECRET-001 · *Rules:* D-2

**Requirement.** Creators sell paid newsletter tiers on their own Stripe or Nectar connection without Mango holding funds.

**Acceptance.**
1. Stripe Checkout/Billing or Nectar enrolls paying readers into a paid topic; Stripe Tax handles US sales tax, and paid-only content reaches paying subscribers rather than free readers.
2. A cancellation or failed payment returns a reader to the free topic. Fresh provider state, not webhook arrival time, determines membership under the recorded paid-tier rule.
3. Payment never creates/widens consent; a paid topic requires the reader’s own confirmed channel permission, and opt-outs and suppression always win.
4. A test-mode checkout subscribes the reader to the topic, a paid-only send excludes free readers and a cancellation webhook moves the reader back.
5. Provider uncertainty removes paid eligibility and remains a visible failed operation; card details and funds stay with the payment provider.

#### PUB-003 — Recommendations

*Tier:* Core · *Rules:* D-2

**Requirement.** Creators can recommend chosen partner newsletters when someone signs up.

**Acceptance.**
1. A reader explicitly choosing a reciprocal or nonreciprocal partner is sent to the partner’s own signup with the consent text.
2. The fixture records one recommendation at that provider edge and both sides can see subscribers gained.

#### PUB-004 — Direct sponsorships

*Tier:* Core · *Rules:* D-2

**Requirement.** Creators book and report direct sponsorships in their newsletters.

**Acceptance.**
1. A booking calendar shows available campaign/issue slots; booking a slot inserts that sponsor block into the chosen draft.
2. Sponsor clicks are tracked and the shareable sponsor report lists the issue’s recorded clicks.

#### PUB-005 — Paid signup page and payer consent

*Tier:* Core · *Rules:* D-2

**Requirement.** A hosted paid signup leads from a saved tier to provider checkout and tells the reader what happens next.

**Acceptance.**
1. The page offers only the Owner-saved tier and displays its exact price/frequency, tax notice and explicit newsletter consent wording before checkout.
2. Newsletter consent is a separate, initially unchecked choice; the payment provider hosts card fields and Mango has none.
3. Checkout returns the reader to a Mango explanation of the next step.
4. Opening checkout records permission timestamp, source and wording version; only one confirmation per payer address per checkout session is authorized.

#### PUB-006 — Paid-reader consent and restrictions

*Tier:* Core · *From:* PUB-005 · *Cites:* BASE-DATA-003 · *Rules:* D-2

**Requirement.** A paying reader joins the mailing audience only with their own channel confirmation.

**Acceptance.**
1. A first-time payer without confirmed email consent receives labelled paid-checkout evidence and one confirmation and remains paid with consent missing until they confirm.
2. After their affirmative confirmation the next paid-only send reaches them; before it no paid or free newsletter does.
3. An unsubscribed payer stays unsubscribed until their own affirmative confirmation under CONT-027; suppression receives no confirmation and no newsletter.
4. An already confirmed subscriber needs no second confirmation; payment events alone never create or widen permission.
5. Contact erasure removes the paid-signup address and consent evidence under CONT-013.

### Installation services

#### HEALTH-001 — Bounded dependency readiness

*Tier:* Core · *From:* new · *Cites:* BASE-OPS-001, BASE-ACCESS-003, BASE-SECRET-001

**Requirement.** Supersedes `BASE-OPS-001` under the recorded 21 October health ruling: Mango reports dependency readiness within two seconds, using the bounded Queue observation described in [health readiness](docs/contract/health-readiness.md).

**Acceptance.**
1. Database, object-storage and Queue acceptance observations run concurrently with 1,500-millisecond dependency deadlines; all succeeding returns ready, while each failed or expired dependency is named as unreachable or timeout.
2. Database and object storage are read fresh for each request. Queue success or failure is reused for 60 seconds from its start, within one binding and isolate only; new deployments and isolates start fresh.
3. Each waiting request has its own deadline; the shared Queue observation and its slot release survive cancellation by the originating caller.
4. An expired Queue result starts another observation while at most two sends per binding/isolate are outstanding. At that cap the last timed-out failure is reused beyond its window without moving expiry until a slot frees.
5. A late send releases only its slot and cannot rewrite a returned observation or a later result; the next eligible request after release can start a fresh check.
6. The readiness response identifies elapsed Queue observation time, slow responses and cached reuse; it distinguishes producer acceptance from consumer processing or delivery and discloses the cap’s potentially indefinite stale failure.
7. The public check reads no private record, mutates no database or object-storage data and exposes no upstream diagnostic. Binding-edge journeys cover slow success, rejection, deadlines, concurrent reuse, expiry, recovery, cap, cancellation and isolation inside the two-second response.

#### MAIL-001 — Selected Managed service mail

*Tier:* Core · *From:* new · *Cites:* BASE-DATA-005, BASE-DATA-004, BASE-MAIL-001

**Requirement.** Supersedes `BASE-DATA-005` only for the owner-selected Managed transactional-mail connection. The exception is limited to sign-in and subscription confirmation; its authorization and failure boundary are recorded in [Managed mail](docs/contract/managed-mail.md).

**Acceptance.**
1. The configured RER relay receives only the transactional message’s one recipient, subject, text and optional HTML with the installation credential; it owns that sending identity.
2. Free and Assisted installations keep their own-provider choices and have no RER relay dependency.
3. Inactive Managed service, revoked credentials or a relay failure is visible through the normal delivery policy and never causes provider substitution or a local outbox.
4. This connection grants no newsletter sender, authentication, unsubscribe, deduplication or delivery-evidence authority; MSG-001 to MSG-003 and SEND-001/SEND-008 retain their separate gates.

### Agent surface

**Specialist: retention marketer.** It grows a consented audience, prepares grounded campaigns and lifecycle journeys, repairs delivery gaps and measures repeat purchases for the business.

Inherits BASE-AGENT-001 to BASE-AGENT-013. The company’s policy decides every call.

**How Mango computes each class.**
- **standard:** reversible internal campaign, template, form, audience, import-plan and routine-memory changes use their changed-item count; a private marketing read uses its returned record count.
- **external:** delivery, publication, audience upload, scheduled outside reporting or a selected model request uses its actual recipients or public visibility, their count and the server-known known, new or public counterparty; live flow execution is included when it creates that exposure.
- **money:** paid-tier prices, coupon values, sponsorship charges and provider-spending commitments use the saved amount, currency and customer or provider counterparty.
- **commitment:** campaign and flow sign-offs and binding sponsorship terms use the exact saved revision, counterparty and recorded value when present.
- **accounts:** creating a provider account, verifying a sending domain or registering a sender uses the named outside provider and resource.
- **gated:** provider authorization consent, identity or carrier verification and hosted payment entry use the provider and personal step its route or response requires; the permitted provider API route keeps its own actual classes.
- **access:** operator membership and roles, integration credentials’ scopes and routine grants use the people or grants changed and whether authority widens or narrows.
- **security:** provider secrets, sender authentication and protective capture or tracking settings use the changed protective setting.
- **destructive:** irreversible contact erasure and permanent retained-data removal use their affected-item count; reversible draft removal remains standard.
- **live:** changes to active flows, campaign schedules, capture forms, tracking switches, connector behavior or sending routes use the affected running service.

| Tool | Does | Core clauses | Risk class | Today |
| --- | --- | --- | --- | --- |
| `mango.operators.manage` | Configure operator membership and roles | OPER-001, OPER-002, OPER-003, OPER-004, OPER-005, OPER-006 | access (+ security) | Not implemented |
| `mango.activity.read` | Inspect and export marketing activity | OPER-007 | standard | Not implemented |
| `mango.sources.connect` | Configure a commerce source | STORE-001 | accounts · security (+ gated) | Not implemented |
| `mango.sources.sync` | Sync and reconcile source records | STORE-002, STORE-003, STORE-004, STORE-005, STORE-006, STORE-007 | standard or live | Not implemented |
| `mango.contacts.read` | Read contact identity, channel state and history | CONT-001, CONT-002, CONT-003, CONT-008, CONT-014, CONT-017, CONT-022 | standard | Scoped profile API; no MCP adapter |
| `mango.contacts.update` | Manage reversible profile, topic and consent evidence | CONT-004, CONT-005, CONT-028, CONT-006, CONT-007, CONT-009, CONT-011, CONT-012, CONT-015, CONT-016, CONT-019, CONT-020, CONT-023, CONT-024, CONT-038, CONT-039, CONT-040, CONT-025, CONT-026, CONT-027, CONT-041, CONT-042, CONT-043 | standard or external | Scoped contact and suppression APIs; no MCP adapter |
| `mango.contacts.import` | Prepare and apply a contact import plan | CONT-010 | standard | Not implemented |
| `mango.contacts.erase` | Erase contact data and exercise privacy requests | CONT-013, CONT-029, CONT-030, CONT-021 | destructive | Not implemented |
| `mango.tracking.configure` | Configure permitted onsite behavior capture | CONT-018, CONT-031, CONT-032, CONT-033, CONT-034, CONT-035, CONT-036, CONT-037 | live · security | Not implemented |
| `mango.proposals.prepare` | Prepare grounded observations, forecasts and content | PROP-001, PROP-002, PROP-003, PROP-004, PROP-005, PROP-006, PROP-007, PROP-008, PROP-009 | standard or external | Proposal service; no MCP adapter |
| `mango.audiences.evaluate` | Inspect eligibility, counts and exclusions | AUD-001, AUD-010, AUD-002, AUD-003, AUD-004, AUD-005, AUD-006, AUD-007, AUD-008, AUD-009, AUD-011 | standard | Not implemented |
| `mango.campaigns.read` | Inspect campaign state, history and preview | CAMP-001, CAMP-003, CAMP-022 | standard | Not implemented |
| `mango.campaigns.draft` | Edit, duplicate and prepare campaigns or images | CAMP-002, AUD-010, CAMP-020, CAMP-021, CAMP-007, CAMP-012, CAMP-023, CAMP-018 | standard | Not implemented |
| `mango.campaigns.signoff` | Sign off the exact campaign revision | CAMP-004, CAMP-005 | commitment | Not implemented |
| `mango.campaigns.schedule` | Schedule, cancel, pause or resume campaigns | CAMP-006, CAMP-009, CAMP-010, CAMP-011, CAMP-013, CAMP-014, CAMP-015, CAMP-016, CAMP-017 | live (+ external) | Not implemented |
| `mango.campaigns.test` | Send a campaign test to chosen recipients | CAMP-008, CAMP-019, CAMP-024 | external | Not implemented |
| `mango.designs.prepare` | Generate or import editable designs | DESIGN-001, DESIGN-005, DESIGN-006, DESIGN-002, DESIGN-007, DESIGN-008, DESIGN-009, DESIGN-010, DESIGN-003, DESIGN-011, DESIGN-004, DESIGN-012, DESIGN-013, DESIGN-014 | standard or external | Not implemented |
| `mango.messages.check` | Check message identity, safety and rendering | MSG-001, MSG-002, MSG-003, MSG-004, MSG-005, MSG-006, MSG-007, MSG-008, MSG-009, MSG-016, MSG-010, MSG-011, MSG-012, MSG-013, MSG-014, MSG-015 | standard (+ security) | Not implemented |
| `mango.delivery.dispatch` | Dispatch eligible messages and reconcile outcomes | SEND-001, SEND-002, SEND-003, SEND-004, SEND-005, SEND-006, SEND-007, SEND-008, SEND-009 | external | Scoped campaign-send API; no MCP adapter |
| `mango.results.read` | Inspect marketing results, links, revenue and cost | RESULT-001, RESULT-002, RESULT-003, RESULT-004, RESULT-005, RESULT-009, RESULT-010, RESULT-006, RESULT-007, RESULT-008 | standard | Not implemented |
| `mango.data.export` | Prepare a portable account export | DATA-001, DATA-002 | standard | Not implemented |
| `mango.forms.publish` | Prepare and publish signup forms and landing pages | FORM-001, FORM-002, FORM-003, FORM-004, FORM-009 | standard or external (+ live) | Not implemented |
| `mango.forms.measure` | Inspect form performance, referrals and refusal reports | FORM-005, FORM-006, FORM-010 | standard | Not implemented |
| `mango.forms.configure` | Configure abuse controls and intake capacity | FORM-007, FORM-008, FORM-011, FORM-012, FORM-013 | security · live | Not implemented |
| `mango.segments.manage` | Prepare and evaluate segments, predictions and scores | SEG-001, SEG-002, SEG-003, SEG-004, SEG-005, SEG-006 | standard | Not implemented |
| `mango.content.edit` | Prepare templates, blocks, product and channel content | BUILD-001, BUILD-002, BUILD-003, BUILD-004, BUILD-005, BUILD-006, BUILD-008, BUILD-009, BUILD-010, BUILD-013, BUILD-014, BUILD-011, BUILD-012 | standard | Not implemented |
| `mango.coupons.prepare` | Prepare and issue catalog-grounded coupons | BUILD-007 | standard or money (+ external) | Not implemented |
| `mango.flows.draft` | Prepare triggers, filters, waits, branches and goals | FLOW-001, FLOW-002, FLOW-003, FLOW-004, FLOW-005, FLOW-006, FLOW-007, FLOW-012, FLOW-015, FLOW-016 | standard | Not implemented |
| `mango.flows.activate` | Sign off and activate a saved flow revision | FLOW-008 | commitment · live (+ external) | Not implemented |
| `mango.flows.run` | Inspect, pause, resume and repair running flows | FLOW-009, FLOW-010, FLOW-011, FLOW-013, FLOW-014 | standard or live (+ external) | Not implemented |
| `mango.experiments.manage` | Prepare experiments, holdouts and optimization | EXP-001, EXP-002, EXP-003, EXP-004, EXP-005, EXP-006 | standard or live (+ external) | Not implemented |
| `mango.sms.connect` | Configure SMS sender and carrier registration | SMS-001, SMS-002, SMS-008 | accounts · security (+ gated) | Not implemented |
| `mango.sms.compose` | Inspect quiet hours, two-way messages, links and MMS | SMS-003, SMS-004, SMS-005, SMS-007 | standard or external | Not implemented |
| `mango.sms.budget` | Change the business’s SMS spending commitment | SMS-006 | money | Not implemented |
| `mango.push.publish` | Configure and deliver web and app notifications | PUSH-001, PUSH-002 | external · live | Not implemented |
| `mango.deliverability.configure` | Configure sender providers, domains and warm-up | DELIV-001, DELIV-002, DELIV-003, DELIV-004, DELIV-007, DELIV-008, DELIV-009, DELIV-010 | accounts or security (+ live) (+ gated) | Not implemented |
| `mango.deliverability.read` | Inspect mailbox-provider outcomes and address quality | DELIV-005, DELIV-006 | standard | Not implemented |
| `mango.reports.read` | Inspect marketing and retention reports | REPORT-001, REPORT-002, REPORT-003, REPORT-004, REPORT-005, REPORT-007 | standard | Not implemented |
| `mango.reports.schedule` | Schedule delivery of a custom report | REPORT-006 | external · live | Not implemented |
| `mango.connections.configure` | Configure commerce, CRM and marketing connectors | INT-001, INT-002, INT-003, INT-004, INT-005, INT-006, INT-009, INT-010, INT-011, INT-014, INT-015, INT-016, INT-017, INT-018, INT-019, INT-020 | accounts · security (+ access) (+ gated) | Not implemented |
| `mango.events.manage` | Record source events and configure outbound subscriptions | INT-007, INT-008 | standard or external (+ access) | Scoped custom-event API; no MCP adapter |
| `mango.ad-audiences.sync` | Publish consented ad audiences | INT-012 | external | Not implemented |
| `mango.links.tag` | Prepare static campaign analytics tags | INT-013 | standard | Not implemented |
| `mango.move.plan` | Prepare an incumbent move-in with mapping and reconciliation | MOVE-001, MOVE-002, MOVE-003, MOVE-004, MOVE-005, MOVE-006, MOVE-016, MOVE-007, MOVE-008, MOVE-017, MOVE-009, MOVE-010, MOVE-011, MOVE-018, MOVE-019, MOVE-012, MOVE-020, MOVE-021, MOVE-013, MOVE-022, MOVE-023, MOVE-024, MOVE-025, MOVE-026, MOVE-014, MOVE-015 | standard or accounts (+ security) (+ gated) | Not implemented |
| `mango.archive.publish` | Publish a campaign in the public archive | PUB-001 | external · live | Not implemented |
| `mango.paid.configure` | Configure a paid tier and payer signup | PUB-002, PUB-005, PUB-006 | money · commitment (+ accounts) (+ gated) | Not implemented |
| `mango.recommendations.publish` | Publish newsletter recommendations | PUB-003 | external | Not implemented |
| `mango.sponsorships.manage` | Prepare and accept direct sponsorship terms | PUB-004 | standard or commitment (+ money) (+ external) | Not implemented |
| `mango.retention.find` | Find retention gaps and supporting cohorts | AGENT-001 | standard | Not implemented |
| `mango.retention.propose` | Prepare a powered retention journey | AGENT-002 | standard or external | Not implemented |
| `mango.retention.judge` | Measure lift and apply declared stop rules | AGENT-003 | standard or live (+ external) | Not implemented |
| `mango.lifecycle.repair` | Diagnose and repair lifecycle delivery gaps | AGENT-004 | standard or live (+ external) | Not implemented |
| `mango.deliverability.diagnose` | Explain deliverability changes and prepare fixes | AGENT-005 | standard or security (+ live) | Not implemented |
| `mango.account.audit` | Audit marketing practice and prepare draft fixes | AGENT-006 | standard | Not implemented |
| `mango.content.draft` | Draft grounded campaign and flow content | AGENT-007 | standard or external | Not implemented |
| `mango.questions.answer` | Prepare natural-language segments and cited answers | AGENT-008 | standard | Not implemented |
| `mango.routines.manage` | Set schedules, thresholds and editable routine memory | AGENT-009 | standard (+ live) | Not implemented |
| `mango.routines.authority` | Configure routine jobs, budget and disabling | AGENT-010 | access (+ money) (+ security) | Not implemented |
| `mango.move.assist` | Explain incumbent mappings and import anomalies | AGENT-011 | standard or live | Not implemented |

**Resources.** `mango://contacts/{id}`, `mango://consent/{id}`, `mango://sources/{connection}/{record}`, `mango://segments/{id}`, `mango://proposals/{id}`, `mango://campaigns/{id}`, `mango://flows/{id}`, `mango://enrollments/{id}`, `mango://forms/{id}`, `mango://templates/{id}`, `mango://experiments/{id}`, `mango://messages/{id}`, `mango://imports/{id}`, `mango://reports/{id}`, `mango://routines/{id}` and `mango://paid-tiers/{id}`.

**Events.** Contact and consent changes, source sync completion or failure, campaign revision or delivery changes, flow enrollment and goal changes, signup refusal summaries, import reconciliation, retention findings and paid membership changes, together with Base’s policy, approval and review events.

**Prompts.** Prepare a consented campaign → CAMP-002, CAMP-004, AUD-001; plan a retention journey → AGENT-001, AGENT-002; diagnose a delivery gap → AGENT-004, AGENT-005; judge incremental retention → AGENT-003, EXP-003; plan an incumbent move-in → AGENT-011, MOVE-006; audit the marketing account → AGENT-006.

**Not tools, and why.**
- HOME-001, HOME-002: The installed Lobby and static marketing landing are public presentation and installation facts.
- DOCS-001: The public documentation reading screen and build-time publishing are presentation and installation facts.
- SCALE-001: Capacity and seeded performance are installation facts proved by the declared scale journey.
- MGMT-001: First-owner admission is the person’s installation-claim screen.
- MGMT-002: The native owner editor is a person’s interactive coding screen.
- MOBILE-001: The responsive operator display is a person’s screen; its record actions use the tools above.
- HEALTH-001: Dependency readiness is an installation fact; the check itself reads no marketing record.
- MAIL-001: Selection of Managed transactional-mail service is an installation fact; marketing-provider jobs use the tools above.
- MOBILE-002: The iOS and Android apps’ notification and device interfaces run on the device; their server jobs use the same tools.

**Limits.** Mango’s declared capacity limits bound request rate, input size, import size, recipient batch size and retained file bytes; the marketing installation publishes those capacities alongside its existing scale and intake limits. Business thresholds and provider-spend caps are the company’s policy.

**Handoffs.** Listens for store purchases, checkouts, refunds and customer changes from connected Stall, Shopify, WooCommerce, Stripe and other declared commerce sources, plus CRM and custom business events. Emits delivery, consent-withdrawal, audience, retention-finding and flow-goal events with the relevant Mango records for other specialists.


#### SURFACE-001 — The marketing registry and conformance journey

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-001, BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-013 · *Register:* R-601

**Requirement.** Mango’s marketing specialist exposes the Core jobs in the tool table and the record families in the resource list through Base’s agent door. The same table documents the particular visual, device, installation and import-door work that is not a tool.

**Acceptance.**
1. The registry’s Core clause associations equal the table, including Mango’s consent, campaign, flow, migration, paid-newsletter and retention-agent jobs.
2. The specialist’s listed job prompts cover campaign preparation, lifecycle recovery, retention review, migration planning and account audits with their clause references.
3. The public discovery instructions link the marketing records, tool table and non-tool reasons used by a stranger starting with only the Mango URL.
4. The Base conformance harness runs Mango’s tool fixtures and every SURFACE acceptance point under the all-autonomous and held company policies, including the marketing specialist week in SURFACE-008.

#### SURFACE-002 — Drafts and outside marketing exposure

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-003, BASE-AGENT-006, BASE-AGENT-007

**Requirement.** Mango classifies a reversible internal draft or segment change as standard. A call that exposes a message, form, archive issue, report, customer audience or model context outside the business carries external from the recipient or visibility change, including a flow action that will deliver outside.

**Acceptance.**
1. Saving an internal campaign draft or segment is standard with its changed-item count.
2. Sending an email, SMS, test message or push is external with the channel, recipient count and counterparty derived from the addressed records.
3. Publishing a form, landing page or archive issue is external with public counterparty, while an internal preview of the same revision is standard.
4. An ad-audience upload, scheduled report delivery or selected model request carries external for the actual receiving service or people.
5. A known recipient relationship and a new recipient relationship yield known and new counterparties respectively; a public issue yields public.
6. An import field or generated message that claims its recipient is internal leaves these classes and facts unchanged.

#### SURFACE-003 — Sending-provider setup classes

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-004, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** The marketing specialist distinguishes provider account creation from credential custody and from provider steps retained for a person. Sending-domain verification, sending-provider setup, Shopify authorization and SMS registration are classified from the provider operation and response.

**Acceptance.**
1. Creating or verifying a sending domain, provider account or SMS sender registration carries accounts with its named provider.
2. Storing or rotating a marketing-provider credential or changing protective sender-authentication settings carries security with the changed setting.
3. A Shopify or other provider authorization consent, identity verification, carrier-registration attestation or hosted payment entry that the provider reserves for a person carries gated with that provider and step.
4. An API or broker credential route that the provider permits takes the company’s decision for its actual classes; its facts never claim a person completed a hosted step.
5. A completed setup returns the particular sender, shop or carrier-registration resource and leaves other connections unchanged.

#### SURFACE-004 — Marketing authority and irreversible privacy operations

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-011

**Requirement.** Mango classifies staff and integration-grant changes as access, credential or protective-setting changes as security, and irreversible contact erasure or unrecoverable deletion as destructive. These classifications use the saved operation and current records, not a confirmation claimed by the caller.

**Acceptance.**
1. Inviting an operator or enlarging another integration grant is access with the number of people or grants and widening direction; removing membership or narrowing a grant records narrowing.
2. Changing a sender secret or an authentication protection is security with its setting name.
3. Erasing a contact or permanently purging retained marketing data is destructive with its affected-item count; a reversible draft removal stays standard.
4. The contact-erasure fixture removes that contact’s Mango data while retaining the particular surviving opt-out custody CONT-013 requires.
5. A routine disable changes access for that routine and prevents its next scheduled run.

#### SURFACE-005 — Paid marketing and exact-revision commitments

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** Mango classifies paid-tier prices, coupon value, sponsorship terms and changes to what the business charges or pays as money. A campaign sign-off, binding sponsorship agreement or other decision relied on as a sign-off carries commitment for its saved revision; publishing a paid offer also carries external.

**Acceptance.**
1. Changing a paid-newsletter recurring price or a coupon’s monetary value carries money with amount, currency and the customer or provider counterparty.
2. Changing a provider spending commitment or sponsorship charge carries money with the value the saved operation changes.
3. A campaign or flow sign-off carries commitment with its exact revision and the value or counterparty where the record has one.
4. A binding sponsorship acceptance carries commitment and money for its terms, while drafting those terms is standard.
5. A paid offer exposed to readers adds external without creating or widening any reader’s channel consent.
6. Under both company policies, the computed classes remain equal for the same saved price, coupon and revision.

#### SURFACE-006 — Live marketing changes

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-012

**Requirement.** Mango’s live class identifies changes to running flows, public capture, send schedules, tracking and delivery configuration. Merely drafting a prospective change stays standard; activation and changes to the running service use the affected service records.

**Acceptance.**
1. Activating, pausing, resuming, archiving or changing a running flow carries live with the flow service identity.
2. Changing a running campaign schedule, active intake setting or onsite-tracking switch carries live with the affected campaign or site.
3. Changing an active sending route or connector behavior carries live in addition to any accounts, security, access or external class that the same operation meets.
4. The same flow draft before activation stays standard, and its activation adds live without losing the exact-revision checks in FLOW-008.
5. The company-policy fixture’s repair replay changes only the declared source window and eligible enrollments, leaving previously delivered messages intact.

#### SURFACE-007 — Marketing records and reports

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-003, BASE-AGENT-010, BASE-AGENT-013

**Requirement.** The specialist reads Mango contacts, consent facts, source records, segments, campaigns, flow revisions and enrollments, forms, experiments, provider outcomes, import plans and marketing reports through the resource families listed below. Its output keeps measured lift, attribution, forecasts and provider hand-off distinct.

**Acceptance.**
1. The seeded campaign report exposes separate provider acceptance, delivery, opens, clicks, attributed revenue and measured holdout lift records.
2. A retention finding links back to its source cohort, segment or flow resources, and a proposed repair links the affected source window and enrollments.
3. The source fixture’s failed or unavailable data remains unavailable in the agent’s result rather than becoming a generated fact.
4. The migration resource includes the reconciliation and unsupported-step reports for the same retained import plan.

#### SURFACE-008 — A stranger runs a seeded retention week

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-009, BASE-AGENT-013 · *Register:* R-601

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

#### SURFACE-009 — Specialist handoffs keep marketing context

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-003, BASE-AGENT-010, BASE-AGENT-012, BASE-AGENT-013

**Requirement.** Mango’s specialist follows purchase and customer events from connected commerce and CRM systems and emits typed marketing outcomes for other specialists. A handoff supplies the relevant Mango record, source time and consent context so the receiving job can inspect the evidence.

**Acceptance.**
1. A connected store purchase produces a post-purchase candidate linked to the source order and contact, while the contact’s current channel consent still controls eligibility.
2. A signed-out or withdrawn customer cannot become sendable merely because a sibling handoff or imported record requests a marketing action.
3. A delivered message, consent withdrawal, lapsed-cohort finding and completed flow goal produce the documented marketing event types with their Mango record links.
4. The same source event replay produces one marketing effect and preserves the original source time in the affected record.


## Push further

### Agents

#### AGENT-001 — Retention-gap finder

*Tier:* Core · *Cites:* BASE-AGENT-003, BASE-AGENT-007, BASE-AGENT-011 · *Rules:* D-2, D-3

**Requirement.** On the schedule the owner sets, initially weekly, a retention agent works on Mango’s recorded orders, events, segments, live flows and results to find cohorts whose missing or inactive journeys leave repeat purchases at stake. Each finding carries its data, period, cohort size and revenue estimate from this installation’s own history.

**Acceptance.**
1. On the owner’s schedule, initially weekly, the agent identifies both a missing post-purchase flow and a lapsed cohort in seeded store history.
2. Each finding cites the queries and source period behind its count, and the cohort count equals the stored records.
3. The fixtures distinguish 412 first-time buyers from the last 90 days past their predicted reorder date with no reaching flow from 3,100 identified visitors last month whose browse-abandonment flow is off, and estimate the revenue at stake from this installation’s own history.

#### AGENT-002 — Journey proposal with holdout and stop rules

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008 · *Rules:* D-2, D-3

**Requirement.** For a chosen retention finding, the agent prepares a FLOW-001 journey with catalog-grounded brand content, exits, a powered randomized holdout, a declared outcome and measurement period, and stop rules. Activating the exact saved revision carries commitment and live; any resulting outside message also carries external. The company’s policy decides those calls, including the person’s step when its rule asks for one.

**Acceptance.**
1. The seeded lapsed-cohort proposal includes its trigger, audience filters, messages in the brand kit’s style grounded under AGENT-007, and exits.
2. Its randomized holdout share and size follow the EXP-005 power calculation and it names an outcome, such as repeat purchase within 60 days, and a measurement period.
3. Its stop rules can express unsubscribe rate above 1 per cent, complaint rate above 0.1 per cent, and a lift interval excluding a positive effect after the measurement period.
4. Under the held company policy, the commitment and live calls for FLOW-008 activation wait for the named person, then activate the exact revision through the normal validation checks.
5. Under the all-autonomous company policy, the equivalent agent activation takes that policy’s decision and is recorded as the agent’s act.

#### AGENT-003 — Outcome judge

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-2, D-3

**Requirement.** For an agent-proposed or other holdout-carrying flow, Mango’s outcome agent compares the declared outcome in the messaged and held-out groups at the declared checkpoints. It explains lift and its interval and recommends keeping, changing or retiring the flow using measured repeat purchases or revenue. Pause, resume and widening carry live, with external added when the change reaches recipients; the company’s policy decides each call.

**Acceptance.**
1. At each checkpoint, the report compares the declared outcome in messaged and held-out groups and shows lift with its interval in plain language.
2. When the seeded holdout converts as well as the messaged group, the agent reports no supported lift and recommends retirement; opens alone never support that recommendation.
3. A breached complaint threshold triggers the declared stop-rule pause under the company policy and notifies operators.
4. The same seeded stop, resume and widening changes receive the decisions of their live class under both company policies.

#### AGENT-004 — Lifecycle failure diagnosis and repair

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-012 · *Rules:* D-2, D-3

**Requirement.** The lifecycle agent identifies disconnected or lagging integrations, webhook sequence or timestamp gaps, stuck waits, rising skip reasons, coupon-creation failures and provider errors. Its repair plan names the cause, affected contacts and flows and the source-window resync, event replay or eligible re-enrollment needed. Repair carries live, adding external when it creates outside messages, and the company’s policy decides whether it runs or awaits the person its rule names.

**Acceptance.**
1. A simulated six-hour Shopify webhook outage is reported with its cause, the 37 missed checkouts and affected flows.
2. The proposed repair names its source window, replayed events and eligible contacts, preserving FLOW-010 relevance windows and prior delivery and opt-out authority.
3. Under the held company policy, the replay waits for the named person and then enrolls only still-relevant contacts not already messaged, sending nothing twice.
4. Under the all-autonomous company policy, the same repair receives that policy’s decision while the same relevance, opt-out and deduplication checks hold.

#### AGENT-005 — Deliverability diagnostician

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-2, D-3

**Requirement.** A deliverability agent explains changes using bounce codes, complaints, DELIV-005 mailbox-provider breakdowns, DNS state and Postmaster data. It links each diagnosis to its evidence and prepares sunset-segment, ramp or DNS fixes. Applying a fix carries standard, live or security according to the setting it changes, and the company’s policy decides its execution.

**Acceptance.**
1. Seeded Outlook policy-block bounces after a campaign to unengaged contacts produce a diagnosis naming that campaign, Microsoft and the affected segment with supporting evidence.
2. The proposed sunset-segment, slower-ramp or DNS changes are inspectable drafts whose preparation changes no live setting.
3. Applying a chosen fix is classified from the segment, running ramp or protective DNS setting it changes and follows the company’s policy.

#### AGENT-006 — Account audit

*Tier:* Core · *Cites:* BASE-AGENT-003, BASE-AGENT-007 · *Rules:* D-2, D-3

**Requirement.** On request, Mango’s account auditor checks live flows, recent campaigns, forms and settings against working marketing practice and this installation’s data. It identifies missing core flows, flows without exit goals, messages without plain-text alternatives, unbalanced frequency, forms without SMS capture, untested subject lines and expired coupons, linking each finding to its object and an editable draft fix.

**Acceptance.**
1. A seeded account with three known issues yields all three findings with links to the affected objects.
2. Each finding opens a one-click draft fix without applying it as a side effect of the audit.
3. The audit examines core-flow coverage, exits, plain-text alternatives, frequency, SMS-capture forms, subject-line tests and coupon expiry using the installation’s records.

#### AGENT-007 — Grounded content drafting

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-2, D-3

**Requirement.** For campaigns and flow messages, an agent prepares subject lines, preheaders, body copy, SMS text and product selections in the brand’s voice, using its brand kit, catalog, past messages and measured results. Product, price and offer claims retain PROP-006’s evidence rule. Sending or activating drafted work carries external and, for changing a running flow, live; the company’s policy decides those calls.

**Acceptance.**
1. The abandoned-cart draft names only products and prices present in the catalog or an approved source revision.
2. A drafted claim outside its evidence is rejected under PROP-007, without turning it into a sendable campaign.
3. Subject lines, preheaders, body copy, SMS text and product selections draw on the saved brand kit, catalog, messages and measured results.
4. Preparing content does not send it; subsequent send and activation calls take the company’s decisions for their computed external and live classes.

#### AGENT-008 — Natural-language segments and questions

*Tier:* Core · *Cites:* BASE-AGENT-003, BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-2, D-3

**Requirement.** An operator describes an audience or asks a marketing question in words. The agent produces an editable structured segment or report with its plain-language summary, count and cited report evidence. Saving the prepared segment is a standard call whose execution the company’s policy decides.

**Acceptance.**
1. The request for Texas customers who bought twice but not in the last 120 days produces state, order-count and recency conditions with a matching plain-language summary.
2. Its count equals the segment builder’s count on the same records, and the prepared rule can be edited or saved.
3. A question about the flow with the most incremental revenue last quarter answers from the cited report, retaining the distinction between measured lift and attribution.

#### AGENT-009 — Scheduled routines and editable memory

*Tier:* Core · *Cites:* BASE-AGENT-007, BASE-AGENT-011 · *Rules:* D-2, D-3

**Requirement.** Owners set scheduled routines such as a weekly performance digest, threshold-based revenue, unsubscribe or complaint alerts and pre-holiday checks. The routine uses the cost limit the owner sets through the company’s policy. Its remembered operator notes and decisions remain readable, editable and deletable and shape every agent’s subsequent work.

**Acceptance.**
1. A seeded revenue drop triggers its configured anomaly alert exactly once and the routine stays within the owner-set cost limit.
2. A weekly digest and a pre-holiday readiness check run at their configured times, while unsubscribe and complaint alerts use the configured thresholds.
3. The operator can read, edit and delete a remembered note or decision.
4. A memory note excluding the Heritage product line keeps that line out of the next drafted content.

#### AGENT-010 — Retention-routine authority and activity

*Tier:* Core · *Cites:* BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008, BASE-AGENT-009, BASE-AGENT-011 · *Rules:* D-2, D-3

**Requirement.** Mango’s retention routines bind their requested read scope, output jobs and owner-set monthly USD model budget to their routine identity. Their campaign approval or activation, send or test-send, consent, suppression, discount, targeting and spend changes carry the classes declared in the Agent surface and take the company’s policy decision. The Activity screen distinguishes each routine grant in its agent filter, and disabling a routine prevents its next scheduled run.

**Acceptance.**
1. Under a company policy blocking commitment, live and external, a routine’s campaign approval, activation, send and test-send attempts are refused with a named reason and appear in Activity.
2. Under a company policy blocking standard for consent changes, the routine’s consent-change attempt is refused with a named reason and appears in Activity; the same class follows an all-autonomous policy in its companion run.
3. Discount and spend changes carry money, and targeting or running-flow changes carry live, with the call facts and decision visible for the routine.
4. The routine’s permitted Activity entries identify its grant and the Activity agent filter lists those grants.
5. Disabling the named routine prevents its next scheduled run.

#### AGENT-011 — Migration agent

*Tier:* Core · *Cites:* BASE-AGENT-003, BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-2, D-3

**Requirement.** During move-in, the agent reads an incumbent export or API under MOVE-001 to MOVE-005, proposes field, topic and tag mappings with reasons, translates automations into draft flows and explains unsupported steps. It checks the reconciliation report for anomalies, including any mapping that would upgrade consent. Applying its plan carries standard, adding live for changing a running parallel sync; the company’s policy decides whether the import plan runs or awaits its named person.

**Acceptance.**
1. A Klaviyo fixture yields a proposed mapping for every field and flags the consent-upgrading column.
2. Under the held company policy, applying the plan awaits the named person and writes nothing beforehand; under the all-autonomous company policy, the same plan takes that policy’s decision.
3. A Mailchimp fixture yields the MOVE-007 segment and MOVE-008 journey mappings, explaining every unsupported condition and step.
4. The prepared import plan includes topic and tag mappings with reasons and the reconciliation anomalies it found, without activating imported flows.

## Field proof register

| ID | Proof | Clauses | State | Date | Receipt |
| --- | --- | --- | --- | --- | --- |
| R-101 | Real Okta, Microsoft Entra ID, Google Workspace and JumpCloud tenant receipts for configured sign-in, group mapping and deprovisioning. | OPER-006 | not run |  |  |
| R-201 | Gmail, Apple Mail and Outlook rendering of imported designs through test sends. | DESIGN-004, DESIGN-012 | not run |  |  |
| R-202 | Hosted campaign-image serving, mailbox image-proxy behavior at the declared rate and real inbox rendering. | CAMP-012, CAMP-023 | not run |  |  |
| R-203 | A paid live 12ui run, provider acceptance without corpus references, hosted secret custody and provider acceptance of server-held personal-key use. | DESIGN-001, DESIGN-006, DESIGN-005 | not run |  |  |
| R-501 | Mango for Shopify public App Store listing and Shopify protected-customer-data and all-order-history approvals. | INT-015 | not run |  |  |
| R-502 | A real SendGrid and Resend account completes the owner connection, signed-event and branded-host TLS journeys. | DELIV-008, DELIV-002 | not run |  |  |
| R-503 | Zapier marketplace app availability and a real platform account receipt. | INT-009 | not run |  |  |
| R-601 | Mango’s remote MCP door works in the supported Claude, ChatGPT, Codex and Copilot clients. | SURFACE-001, SURFACE-008 | not run |  |  |
| R-701 | One real owner-supplied Mailchimp export completes move-in with its reconciliation report. | MOVE-001 | not run |  |  |
| R-702 | A real Mailchimp account repeats the API-key engagement-history import. | MOVE-015 | not run |  |  |
| R-703 | The native iOS and Android apps obtain their real store listings. | MOBILE-002 | not run |  |  |
| R-801 | A human screen-reader pass through the operator and public journeys. | MOBILE-001, HOME-002, DOCS-001 | not run |  |  |
| R-802 | A completed VPAT for the Mango installation. | MOBILE-001, HOME-002, DOCS-001 | not run |  |  |

## Boundaries

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

- The newsletter release profile is a delivery subset, not a waiver of the full marketing target. Missing providers stay unavailable; local or synthetic receipts prove only their stated scope.
- A provider handoff already authorized and in progress cannot be recalled by a later database transition.
- Membership history predating the recorded growth baseline cannot be reconstructed; retained consent evidence is labelled without inventing historical membership changes.

## Homepage claims

| # | Claim | Clauses |
| --- | --- | --- |
| 1 | Newsletters people are glad to get. | HOME-002 |
| 2 | Write it, approve exactly what goes out, and send it only to people who said yes. Your list stays yours. | CAMP-002, AUD-010, CAMP-020, CAMP-021, CAMP-004, AUD-002, DATA-001, DATA-002 |
| 3 | 100% free, open source alternative to Mailchimp and Klaviyo | HOME-002, DATA-001, DATA-002 |
| 4 | Five calm steps, and you are in charge of every one. | CAMP-002, AUD-010, CAMP-020, CAMP-021, CAMP-004, CAMP-006, SEND-001 |
| 5 | Readers join on your hosted signup page and confirm by email. | FORM-001, CONT-009, CONT-028 |
| 6 | Draft in the rich-text editor or in HTML mode, then preview it at desktop and phone widths. | CAMP-002, AUD-010, CAMP-020, CAMP-021, CAMP-003, CAMP-022 |
| 7 | An operator approves the exact saved letter, and that is the letter that goes. | CAMP-004, CAMP-007 |
| 8 | Pick the local date and time for each step, in your newsletter's time zone. | CAMP-006 |
| 9 | Mango hands each letter to your mail provider and records what the provider confirms. | SEND-001, SEND-006 |
| 10 | Every reader said yes. Your list is built on consent, not assumptions. | CONT-003, AUD-002 |
| 11 | Share your hosted signup page; new readers confirm their address before they get a single letter. | FORM-001, CONT-009, CONT-028, AUD-002 |
| 12 | Mango keeps when and how each reader agreed, and the exact wording they saw. | CONT-003 |
| 13 | Bring your list as CSV. Opt-outs and suppressions are applied first and never undone by a later import. | CONT-004, CONT-006, CONT-010 |
| 14 | Every letter carries a visible unsubscribe link, and an opt-out is recorded before the reader is told it worked. | MSG-003, MSG-010, CONT-004 |
| 15 | What you approve is exactly what goes out. | CAMP-003, CAMP-022, CAMP-004, CAMP-007 |
| 16 | Mango records who approved the letter and when, against the exact content they saw. | CAMP-004, CAMP-005 |
| 17 | After approval the letter can't be edited. To send something different, write it and approve it on its own. | CAMP-007 |
| 18 | Mango blocks approval until the sender, the unsubscribe link, the links and the audience rules are right. | CAMP-004, MSG-001, MSG-003, MSG-006, AUD-001, AUD-010 |
| 19 | Choose the local time; Mango works out the exact moment. | CAMP-006 |
| 20 | Each step is set in your newsletter's time zone, with the exact UTC moment shown beside it. | CAMP-006 |
| 21 | Campaign history shows each step's time, state and recipient outcomes. | RESULT-001 |
| 22 | Cancel queued work while it is waiting. Mango never pretends to recall a letter already sent. | CAMP-009 |
| 23 | Reports show what your mail provider confirmed, never guesses. | SEND-006, RESULT-006 |
| 24 | A letter counts as delivered only when the provider says so. Accepted is not delivered. | SEND-006 |
| 25 | A hard bounce or complaint suppresses that address before the next send. | CONT-006 |
| 26 | No forecasts or modelled numbers. An unconfirmed send stays unconfirmed. | SEND-006, RESULT-001 |
| 27 | Your list stays yours. Nobody else holds your readers. | DATA-001, DATA-002, MGMT-001 |
| 28 | Your readers, letters and history stay in your own database. | DATA-001, DATA-002, MGMT-001 |
| 29 | Download your audience with its consent history as CSV, ready to import again. | DATA-001, DATA-002, CONT-010 |
| 30 | The owner gives each operator one of six roles, and approvals and cancellations record who made them. | OPER-004, CAMP-004, CAMP-009 |
| 31 | MIT-licensed source you can customise with your own agents. | MGMT-002, AGENT-010 |
| 32 | Set up Mango and send a newsletter people are glad to get. | OPER-001, CAMP-002, AUD-010, CAMP-020, CAMP-021, CAMP-004, SEND-001 |

## Status

Judged from the code and tests at commit `144c1db1d10d6578a3f6c4134a7d5cea655542bc` (25 October 2026).

| Clauses | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Published | 7 | 103 | 0 | 110 |
| Target and push further | 2 | 106 | 98 | 206 |
| All | 9 | 209 | 98 | 316 |

| Clause | Title | Kind | Status | Evidence | Gap |
| --- | --- | --- | --- | --- | --- |
| `HOME-001` | Installation Lobby | published | partial | `tests/local-start/local.journey.ts` · `src/site/pages.tsx` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Mango’s mark, name and one newsletter description identify the installation.; The Lobby has only one action. |
| `HOME-002` | Newsletter landing | published | partial | `tests/local-start/local.journey.ts` · `src/site/pages.tsx` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: The primary action opens the Run page; the run-site landing has no sign-in link.; The hero is the only top-level heading; the alternative sentence also ends the metadata description and names both replacement products.; The sections explain collection, writing, exact-letter approval, scheduling, delivery reporting and ownership, followed by a closing action.; The optional product credit appears only when the owner enables it; illustrative addresses, names, counts and dates are never records.; The static landing reads no operator, contact, campaign or session data and is written once by the site build.; Header Mango identity and links; Hero identity and exact alternative sentence; Hero actions and destinations; Footer deployment-owner name and description; Fixed page rather than a buyer page builder; No vendor pricing; No testimonials; No customer logos; No ratings; No metrics; No cross-store claims; No third-party brand logos; No optional commerce, SMS or AI advertising; No per-reader-send-time or provider-neutral-delivery advertising; Only specified link destinations; Fixed light palette in a dark-themed browser; Readable without scripts; Readable with reduced motion; Licensed self-hosted faces; Inline drawings without raster or embedded images; CSS-only once-only drawing motion; No motion for reduced preference; Motion never hides content. |
| `DOCS-001` | Public documentation | published | partial | `tests/docs.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Sole Sign in link; Shared footer, palette, faces and drawings; Every root, docs and top-level readme Markdown file is published or explicitly excluded with a reason; undeclared files, broken links or anchors, links to unpublished pages, raw HTML, forbidden images and absolute build-machine paths fail validation.; Published pages describe the default newsletter profile, expose no maintainer material and have no source-repository or edit link.; No documentation request reads workspace, session or database records.; Other-host behavior; Documentation is compiled before serving; Worker and browser outputs contain no Markdown or highlighter code, and individual page chunks are loaded lazily.. |
| `OPER-001` | Operators and the default role | published | partial | `tests/local-start/local.journey.ts` · `tests/production-entry.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Before role assignment, an operator can see and act on proposals, campaigns, flows, contacts and settings as Admin.; Valid identity already configured for the installation also completes setup.; Authenticated configuration APIs remain usable during setup, and completing setup does not claim provider readiness.. |
| `OPER-002` | Management | published | partial | `tests/settings-sender/routes.spec.ts` · `src/core/features/auth/service.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Settings can invite an operator and remove an operator.; A session without fresh email proof cannot grant another operator access.; Settings can request a confirmation link bound to the current session; completing it permits an invitation retry.; Reading or inspecting the confirmation link has no effect; only its affirmative submission supplies proof.; Only the operator established at setup may remove that operator.. |
| `OPER-003` | Removal does not rewrite history | published | partial | `tests/go-live/roles.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Every proposal remains attributed to the removed operator.. |
| `STORE-001` | Store and event connections | published | partial | `src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts` · `tests/store/source-export-proof.ts` · `tests/go-live/built-source-journey.ts` · `tests/go-live/store-source-journey.ts` · `tests/go-live/source-runtime.mjs` · `tests/go-live/woocommerce.journeys.ts` · `tests/go-live/roles.journeys.ts` · `tests/go-live/stripe-journey.ts` | Gap: BigCommerce (INT-003), Square (INT-005) and Stall (INT-006) remain unbuilt; Shopify's Owner Settings connection without a developer step remains unproved under INT-015. |
| `STORE-002` | Source identity | published | partial | `tests/shopify/connection.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Customer and refund replay update existing contents without duplicates. |
| `STORE-003` | Freshness | published | done | `tests/go-live/source-freshness.journeys.ts` · `src/core/features/campaigns/ui/source-freshness.tsx` |  |
| `STORE-004` | Source failure | published | done | `tests/go-live/source-freshness.journeys.ts` · `tests/go-live/roles.journeys.ts` · `tests/go-live/stripe-journey.ts` · `tests/shopify/connection.spec.ts` · `tests/go-live/stale-sources.journeys.ts` |  |
| `STORE-005` | Stale sources block approval | published | done | `tests/go-live/stale-sources.journeys.ts` · `src/core/features/lifecycle/evaluate-approval.ts` |  |
| `STORE-006` | Declared adapter capability | published | partial | `tests/go-live/stale-sources.journeys.ts` · `src/core/features/audience/source-coverage.ts` · `src/core/features/campaigns/authoring-service.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Source capability declared unavailable; Unsupported requirement refused; Reviews name missing source and leave no snapshots; Generation source refusal without campaign or audience. Assertions for the unsupported-source journey are in tests/go-live/declared-capability.ts outside the old Evidence set. |
| `STORE-007` | Ingestion latency | published | partial | `src/core/features/audience/commerce-webhook-routes.ts` | acceptance not yet met: A webhook source record is readable within 60 seconds of acknowledgment, measured at the stated limits. |
| `CONT-001` | Contact identity | published | partial | `tests/move-in/archive.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Case and whitespace canonicalization; Phone canonicalization; Phone identity uniqueness on capture and import. |
| `CONT-002` | Channel status | published | partial | `tests/move-in/held.journeys.ts` · `tests/move-in/archive.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Independent pending and SMS states; Cross-channel independence under store activity and consent. |
| `CONT-003` | Consent evidence | published | partial | `tests/audience-import/signup.spec.ts` · `tests/campaign-authoring/import-category.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Recipient scope maintained; Missing evidence creates a non-subscribed contact, except for the incumbent-held evidence CONT-024 defines.; A reassigned phone or one no longer belonging to the recipient becomes non-subscribed until fresh evidence is captured.; Retained channel on capture and import; Retained brand or legal sender on capture and import; Retained SMS sender or program on capture and import; Retained message subject or category on capture and import; Retained frequency disclosure on capture and import; Retained destination jurisdiction on capture and import; Retained consent text on capture and import; Retained consent version on capture and import; Retained confirmation evidence on capture and import. |
| `CONT-004` | Opt-out precedence | published | partial | `tests/go-live/go-live.journeys.ts` · `tests/provider-suppression-ingress.spec.ts` · `tests/move-in/held.journeys.ts` · `tests/go-live/sync-integrations.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Sync, store events, merge and operator edits retain the restriction; Parallel-run incumbent writeback. |
| `CONT-005` | Resubscription | published | partial | `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/opt-out-reasons.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Fresh affirmative evidence is later than the opt-out and is confirmed under CONT-009 before resubscription.; An operator edit alone never resubscribes an unsubscribed or suppressed channel.; A recipient’s own public-form resubscribe follows CONT-027.; During parallel run, a confirmed resubscribe writes subscribed state back where the incumbent API allows; otherwise the cutover report lists it.. |
| `CONT-006` | Email suppression | published | partial | `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/go-live/sync-integrations.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Soft-bounce recorded and visible; Consecutive soft-bounce policy suppresses; Confirmed delivery resets consecutive soft-bounce count; Incomplete provider webhook setup blocks approval; Refreshing local authentication/setup credentials preserves existing contact-hash restrictions, including restrictions without a remaining contact row.; Legacy local authority conversion preserves the original verified contact authority before credential rotation; unknown or missing authority refuses work rather than selecting an unused secret.. Soft-bounce progression and reset assertions are in tests/go-live/opt-out-reasons.journeys.ts outside the old Evidence set. |
| `CONT-007` | SMS compliance replies | published | partial | `src/core/features/sms/inbound.ts` · `tests/audience-import/signup.spec.ts` | acceptance not yet met: Signed SMS replies: STOP family opts out before acknowledgment, HELP and START never subscribe; proved on the Mobile Message adapter, Twilio pending (SMS-001). |
| `CONT-008` | Contact history | published | partial | `tests/audience-controls/contact-history.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Every other event retains its source. |
| `CONT-009` | Confirmation | published | partial | `tests/go-live/go-live.journeys.ts` · `tests/audience-import/signup.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Confirming request time read back; Pending channel cannot receive marketing; When confirmation is not required, recorded consent under CONT-003 subscribes the channel directly.; Reading and HEAD do not consume confirmation token; Suppression guard cannot be bypassed; Inactive identity cannot be confirmed; Operator-recorded SMS exact authenticated reply. |
| `CONT-028` | Guarded consent capture | published | partial | `tests/provider-suppression-ingress.spec.ts` · `tests/go-live/opt-out-reasons.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Public eligibility, profile changes, consent evidence, capture metadata, history and pending status commit together, or a currently barred destination gains none of the new consent records.; A surviving unsubscribe or erasure restriction may recreate an unsubscribed profile containing only new post-opt-out request evidence, without restoring history; confirmation mail stays within CONT-027’s shared allowance.; Surviving suppression blocks fresh capture eligibility; Confirmation preparation finishes before the authoritative handoff check; suppression, a later opt-out or an already committed confirmation prevents handoff when present at that check.; The adapter is invoked immediately after the authoritative check; a provider handoff already authorized and in progress cannot be recalled by a later transition.. |
| `CONT-010` | Import | published | partial | `tests/audience-import/routes.spec.ts` · `tests/move-in/archive.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Phone-only CSV validated; Each rejected row reason read back; Unnamed-file per-row rule; Full review capacity. |
| `CONT-011` | Merge | published | partial | `tests/audience-controls/merge.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Every channel preserves the restrictive order. |
| `CONT-012` | Dormancy without deletion | published | partial | `tests/move-in/archive.journeys.ts` · `tests/go-live/stale-sources.journeys.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Imported order and consent changes retain original times for dormancy. |
| `CONT-013` | Erasure and surviving opt-out | published | partial | `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: All listed hash/channel/reason/time fields and opted-out aliases retained; Installation-keyed one-way destination hash; Subscribed identity has no row tombstone; An import, sync or capture matching a retained local or portable identity preserves its restriction; an erasure opt-out means unsubscribed.; Only the recipient’s own confirmed public-form resubscribe can clear an unsubscribe or erasure restriction under CONT-027; it cannot clear suppression.. |
| `CONT-029` | Portable surviving restrictions | published | partial | `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Local-to-portable mapping retained specifically; Audience CSV exports carry surviving restrictions by their portable hash after erasure.; Documentation explains that a mapping or export holder can test guessed destinations or an address dictionary without the installation secret and can match stable hashes across installations and exports.; The retained mappings and exports are handled as sensitive personal data.. |
| `CONT-030` | Erasure-safe restore authority | published | partial | `tests/portability.spec.ts` · `tests/audience-import/erasure-merge.spec.ts` | Carried evidence asserts only the outcomes identified in DONE-AUDIT. Unasserted: Nonempty legacy row journals are refused before staging.; Upgrade retires legacy journals and transfers only after advancing every known source floor.; An offline copy without current authority makes no claim to detect later erasure.. |
| `PROP-001` | Decision Desk | published | done | `tests/proposals-decision/decision-routes.spec.ts` |  |
| `PROP-002` | Evidence | published | partial | `tests/proposals-decision/decision-routes.spec.ts` | Asserted: Triggering source events; Lookback window; Source-data as-of; Inclusion rule; Exclusion rule; Send-by instant and scheduled instant relationship; Proposed channels; Forecast method displayed. Unasserted: Confidence-label method. |
| `PROP-003` | Counts | published | partial | `tests/proposals-decision/decision-routes.spec.ts` | Asserted: Candidate count; Excluded contact count; Eligible contact count; Per-channel recipient-step count. Unasserted: No recipients label before exclusions. |
| `PROP-004` | Content | published | partial | `tests/proposals-decision/decision-routes.spec.ts` | Asserted: Editable campaign name; Editable email subject; Saved email preview; Saved SMS preview. Unasserted: Editable email body; Editable proposed SMS body; Editable sender identity; Editable destination links. |
| `PROP-005` | Owner control | published | partial | `src/core/features/campaigns/adopt-proposal.ts` · `tests/proposals-decision/decision-routes.spec.ts` | Asserted: Adoption retains draft state; Generation and adoption enqueue nothing. Unasserted: Held company policy binds the exact saved revision. |
| `PROP-006` | Grounded generation | published | partial | `tests/proposals-decision/decision-routes.spec.ts` | Asserted: related implementation or scenario coverage, with no complete assertion of the outcomes below. Unasserted: Grounded source observations accepted; Own imported data and configured knowledge only; Fabricated or malformed claims rejected; Rejected proposal failed; No substituted composition. |
| `PROP-007` | Generation failure | published | partial | `tests/proposals-decision/proposal-states.spec.ts` | Asserted: Provider error recorded; No substitute campaign. Unasserted: Invalid AI output fails proposal; 60-second timeout fails with provider error; Existing proposals preserved; Existing campaigns preserved. |
| `PROP-008` | Forecast provenance | published | partial | `tests/proposals-decision/decision-routes.spec.ts` | Asserted: Own campaign identifiers; Own event identifiers; Campaign count; Event count; Thin history has no range. Unasserted: Every recovery-rate and confidence figure identifies source history; Other-store benchmark rejected. |
| `PROP-009` | Proposal states | published | partial | `tests/proposals-decision/proposal-states.spec.ts` | Asserted: Approved state with linked campaign; Dismissed state; Dismissal reason read back; Expired state; Failed state; Dismissed or expired proposal refuses approval; Approved proposal refuses dismissal; Actor; Single transition under competing decisions. Unasserted: Proposed state; Time. |
| `AUD-001` | Review snapshot | published | partial | `tests/audience-controls/segments.spec.ts` | Asserted: Candidate count; Eligible contact count; Every exclusion reason and count. Unasserted: Audience rule; Audience as-of time; Per-channel recipient-step count. |
| `AUD-002` | Consent and suppression | published | partial | `src/core/features/audience/eligibility.ts` · `tests/go-live/delivery.journeys.ts` | Asserted: related implementation or scenario coverage, with no complete assertion of the outcomes below. Unasserted: Pending channel exclusion; Non-subscribed channel exclusion; Unsubscribed channel exclusion; Suppressed channel exclusion; Segment or explicit inclusion cannot override channel exclusion. |
| `AUD-003` | Commerce and dormancy exclusions | published | done | `tests/go-live/stale-sources.journeys.ts` |  |
| `AUD-004` | Frequency protection | published | partial | `src/core/features/audience/eligibility.ts` · `tests/go-live/open-estimates.journeys.ts` | Asserted: related implementation or scenario coverage, with no complete assertion of the outcomes below. Unasserted: Frequency-window exclusion; Recorded frequency-window reason; No silent deferral; 24-hour email window; 72-hour SMS window. |
| `AUD-005` | Dispatch recheck | published | partial | `tests/audience-controls/merge.spec.ts` · `tests/go-live/delivery.journeys.ts` | Asserted: Immediate hand-off eligibility recheck; Complaint after approval prevents hand-off; Merge after approval prevents hand-off; Merge skip reason is recorded. Unasserted: Dispatch-start eligibility recheck; Purchase after approval prevents hand-off; Purchase skip reason is recorded; Refund after approval prevents hand-off; Refund skip reason is recorded; Opt-out after approval prevents hand-off; Opt-out skip reason is recorded; Bounce after approval prevents hand-off; Bounce skip reason is recorded; Complaint skip reason is recorded; Consent change after approval prevents hand-off; Consent change skip reason is recorded; Frequency-window change after approval prevents hand-off; Frequency-window change skip reason is recorded; Source freshness holds at hand-off; Failed refresh pauses channel before more hand-offs; Stale source pauses channel before more hand-offs; Only successful refresh resumes. |
| `AUD-006` | Multi-step exit | published | partial | `tests/go-live/multistep.journeys.ts` | Asserted: Changed eligibility prevents later step; Changed inclusion yields named skip; Custom exclusion yields named skip; Consent change yields named skip; Only eligible control receives second step; Newly matching contact never added. Unasserted: Conversion prevents later step. |
| `AUD-007` | Frozen candidate set | published | partial | `tests/audience-controls/segments.spec.ts` | Asserted: Frozen candidate set survives segment changes. Unasserted: Newly matching contacts not added; At most one recipient-step per contact per channel per step under overlapping matches. |
| `CAMP-001` | States | published | partial | `tests/campaign-results/results.journeys.ts` | Asserted: Scheduled state; Dispatching state; Completed state; Canceled state. Unasserted: Draft state; Paused state; Failed after missing first-step deadline; Actor or feature recorded for each transition; Time recorded for each transition; Invalid transition rejected. |
| `CAMP-002` | Draft editing | published | partial | `tests/campaign-authoring/browser.spec.ts` | Asserted: Persisted Campaign name; Persisted Message content; Persisted Links; Persisted Schedule. Unasserted: Persisted Channels; Persisted Audience rule; Persisted Sender identity; Body within sent-size limit saves; Oversized body refused with measured size; Refusal names limit; Oversized body not truncated. |
| `AUD-010` | Derived audience rule summaries | published | partial | `tests/audience-controls/segments.spec.ts` | Asserted: related implementation or scenario coverage, with no complete assertion of the outcomes below. Unasserted: Review summary; Approval checks summary; Scheduled page summary; Campaign list summary; Audience snapshot summary; Every condition; Comparison; Value; Lookback; Editor labels; All-or-any matching; Composer live summary; New saved revision summary; Caller prose not authority; Old summary derives without approval rewrite; Readiness requires structured rules; Approval binds saved rules. |
| `CAMP-020` | Live audience authoring counts | published | partial | `tests/campaign-authoring/browser.spec.ts` | Asserted: Structured inclusion updates; Real source counts; Unavailable missing source counts; Unavailable stale counts; Late old request cannot replace new count. Unasserted: Structured exclusion updates. |
| `CAMP-021` | Start and adopt newsletters | published | partial | `tests/campaign-authoring/browser.spec.ts` | Asserted: Blank newsletter without AI or commerce; Real source starter; Same editable Review; Linked proposal reused; Concurrent adoption creates one campaign; Create has no authority; Select and save enqueue nothing; Incomplete draft saves; Approval names missing content; Rich text initial editor; Optional HTML mode preserves authored markup; Styled and image content stays in HTML mode; No image fetch while authoring. Unasserted: At most three clicks; Expired proposal not adopted. |
| `CAMP-003` | Revision preview | published | partial | `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts` | Asserted: Desktop saved preview. Unasserted: Mobile saved preview; Plain-text saved preview; Resolved personalization examples; Compliance footer; SMS opt-out text; Validated styles in saved preview; Failing body unstyled with warning. |
| `CAMP-022` | Canonical saved email bytes | published | partial | `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts` | Asserted: One managed unsubscribe footer; Derived text contains destination URL; Stored body resaves byte-identically; Editor body resaves byte-identically; First duplicate attribute kept; Ignored misplaced tags absent; Checker judges stored tree. Unasserted: One managed postal footer; HTML-body parse with scripting off; Kept attribute values preserved; Kept styles preserved; Comments preserved but refused; Personalization tokens preserved; Refused markup not repaired; Noncanonical syntax saves; Closing-tag attributes dropped; Leading newline stable; Plaintext stable without footer growth; Sixteen-round instability refusal; Older draft canonicalized on any-field save; Plain text comes from same parse. |
| `CAMP-004` | Approval checks | published | partial | `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/create-api.spec.ts` | Asserted: Refusal leaves campaign in draft; Every blocking check named; Missing subject named; Missing body named; Missing preheader named; Optional AI or commerce absence permits manual mail-only draft; Required source dependency blocks. Unasserted: Atomic audience validation; Atomic consent validation; Source freshness including parallel incumbent sync; Sender registration; Email authentication; Sending reputation; Compliance content; Personalization; All named link rules; Schedule; Provider configuration; Effective deduplication; Provider reconciliation; Missing sender named. |
| `CAMP-005` | Idempotent approval | published | partial | `tests/campaign-authoring/browser.spec.ts` | Asserted: One scheduled campaign; One recipient-step set; One approval after repeat. Unasserted: One set of steps. |
| `CAMP-006` | Schedule | published | partial | `tests/campaign-authoring/browser.spec.ts` | Asserted: IANA zone retained; Resolved UTC retained; Ambiguous local time refused; Nonexistent local time refused; Store-zone default; Store zone independent of browser zone; Read-only resolved UTC; 23:59 local deadline; UI daylight-saving refusal; API non-hour DST refusal. Unasserted: Explicit instant compatibility; Local and UTC disagreement refused. |
| `CAMP-007` | Scheduled edits | published | partial | `tests/go-live/delivery.journeys.ts` | Asserted: Editing produces draft replacement; Only replacement schedule hands off; Prior pending recipients canceled; Replacement atomic with dispatch race; Post-dispatch edit creates another campaign. Unasserted: Original remains active before replacement approval; Original and later steps stay active until cancellation. |
| `CAMP-008` | Test send | published | partial | `tests/go-live/go-live.journeys.ts` | Asserted: Test content is marked; No contact activity change; No reporting change. Unasserted: Configured operator email destination only; Configured operator phone destination only; Only admitted typed destinations; Campaign history identifies test; No attribution change; No frequency protection change. |
| `CAMP-009` | Cancellation | published | partial | `tests/campaign-results/results.journeys.ts` | Asserted: Accepted hand-offs remain separate; In-flight uncertainty retained; Countdown to next dispatch. Unasserted: Scheduled cancellation stops within 30 seconds; Dispatching cancellation stops within 30 seconds; Paused cancellation stops within 30 seconds; Every unsent step stopped; Delivered mail is not recalled. |
| `CAMP-010` | Step deadline | published | partial | `tests/go-live/scheduler.journeys.ts` | Asserted: related implementation or scenario coverage, with no complete assertion of the outcomes below. Unasserted: Step send-by instant; Default end of local scheduled day; Missed recipient deadline is skipped with named reason; No send when deadline predates dispatch. |
| `CAMP-011` | Dispatch punctuality | published | done | `tests/go-live/scheduler.journeys.ts` |  |
| `CAMP-012` | Campaign images | published | partial | `tests/campaign-assets.spec.ts` · `tests/campaign-authoring/local-images.spec.ts` | Asserted: Signed-in image upload; PNG accepted; Header type overrides declared type; Truncated upload refused; Byte limit; Pixel limit; Refusals store nothing; Store once by hash; Image bytes immutable; Exact image type; No-sniff; Immutable public cache; Unknown image not found; Per-image refusal; Other image unaffected. Unasserted: JPEG accepted; GIF accepted; WebP accepted; Erasure removes matching image bytes; Erased image answers gone; Erased image blocks approval; Not keyed by client address; No requester identification is recorded; Original bytes exported; Image fetch is not an open signal; Pending erasure image unavailable; Restore image unavailable; Cross-origin restore retains original absolute URLs; Sandboxed no-content-execution policy. |
| `CAMP-023` | Insert and preview campaign images | published | partial | `tests/campaign-assets.spec.ts` · `tests/campaign-authoring/local-images.spec.ts` | Asserted: Insert image uploads and inserts header-derived dimensions; At most 600-pixel width; Public address in response; Stored-type extension serves same bytes; Wrong extension not found; Local own HTTP image saves; Styled local preview loads after opt-in; Local HTTP image approval refusal; HTTPS deployment unaffected. Unasserted: Description required; Other HTTP origins refused; Local HTTP image test refusal; Local HTTP image delivery refusal. |
| `DESIGN-001` | Optional design module | published | partial | `tests/campaign-authoring/design-generation.spec.ts` | Asserted: Default-off when both inputs absent; No generation control; Unavailable run refusal names input; Configured owner key used. Unasserted: Partial configuration requires both; HTTPS origin without path; Local-only loopback HTTP exception; No provider construction or contact; Only explicitly started or chosen design work contacts service. |
| `DESIGN-005` | Owner-selected design provider | published | partial | `tests/campaign-authoring/design-generation.spec.ts` | Asserted: related implementation or scenario coverage, with no complete assertion of the outcomes below. Unasserted: No 12ui request when absent; Only operator run requests; No startup request; No independent-schedule request; No unrelated request; Refusal fails only that run; Outage fails only that run; Design-authoring role authority; Provider wallet and allowance honored; Per-paid-step estimate; Request recorded; Subprocessors disclosure; Evaluation-corpus retention disclosure; Design-timing disclosure. |
| `DESIGN-006` | Optional design deployment credentials | published | partial | `tests/campaign-authoring/design-generation.spec.ts` | Asserted: related implementation or scenario coverage, with no complete assertion of the outcomes below. Unasserted: Local optional input reading; First-deploy supplied optional upload; Later-deploy supplied optional upload; Never required; Later deploy preserves secrets; Verification inputs absent keeps module off; Local consumer only design work; Other queue work left for retry. |
| `DESIGN-002` | Draft-only design generation | published | partial | `tests/campaign-authoring/design-generation.spec.ts` | Asserted: Subject in brief; Current text in brief; Brief editable; Candidate-drawing spend estimate; Draft-owned run survives reload; Candidates appear progressively; Later candidate appears. Unasserted: Draft name in brief; Preheader in brief; Sender name in brief; Two-to-four design choice; Layout spend estimate. |
| `DESIGN-007` | Design provider retries and deadlines | published | partial | `tests/campaign-authoring/design-generation.spec.ts` | Asserted: Same key on rate retry; Notice stays until answer; Untimed refusal fails quota; Wallet refusal fails quota; Failed design reason; Read deadline settlement. Unasserted: Ordinary 30-second request bound; 60-second download bound; 150-second purchase bound; Retry-After honored; Relative retry time notice; Beyond-deadline wait fails quota; Network failure retries; Server failure retries; Request timeout retries; Three-pass bound; Five- and ten-second spacing; Unavailable final failure; Unauthorized reason; Rejected request reason; Unreadable reason; Forbidden redirect reason; Expired layout reason; Cron deadline settlement; Quiet work resumed after two minutes; Declared provider wait respected; New run refused while same draft waits; Offered design may prepare during wait. |
| `DESIGN-008` | Save generated design through ordinary authoring | published | partial | `tests/campaign-authoring/design-generation.spec.ts` | Asserted: Generated body canonical; No implicit save; No approval; No schedule; No delivery; Save uses ordinary draft path; Failed run safe reason; Timeout reason; Failure leaves draft unchanged; No semantic content substitute. Unasserted: All ordinary approval checks. |
| `DESIGN-009` | Apply a chosen design without stealing focus | published | partial | `tests/campaign-authoring/design-generation.spec.ts` | Asserted: Choose beside candidate image; Chosen layout enters import; Untouched choice opens import; Unrelated typing prevents automatic opening; Focus remains in body; Ready notice offers explicit opening; Operator destination retained; Non-brief lines highlighted; Unsaved edit. Unasserted: Hosted photos; Managed footer; Replacement confirmation required. |
| `DESIGN-010` | Keep paid design candidates | published | partial | `tests/campaign-authoring/design-generation.spec.ts` | Asserted: Discarding edit retains paid design; Reload retains candidates; Failed layout retains candidates; New run retains paid design; Save or discard ends offer; Prepared design reuse has no further purchase; Failed layout step shown; Wallet or allowance reason; New paid layout retry; Choose another design; Earlier designs reachable; Hold reason visible; Hold cleared only after answer. Unasserted: Next retry time visible. |
| `DESIGN-003` | Design data and records | published | partial | `tests/campaign-authoring/design-generation.spec.ts` | Asserted: Only layout description and brief; All personalization tokens removed; Only chosen candidate sent for layout; No contact or audience values; Each purchase has idempotency key; Retried purchase buys once; Candidate outcomes; Candidate SHA-256; Chosen candidate; Safe failure code; Cost fact for every paid request. Unasserted: Brief retained; Provider run identifier; Provider layout identifier; Candidate size; Operator; Times; Run never deleted; Candidate originals retained; Layout retained; Candidate and layout export. |
| `DESIGN-011` | Design provider custody | published | partial | `tests/campaign-authoring/design-generation.spec.ts` | Asserted: Provider error text never shown; Separate old-run choice controls. Unasserted: 64 KB JSON stream cap; 40 MB candidate stream cap; 4,096-pixel bound; Declared oversize refused unread; Published layout digest verified; Version-2 layout parser; Same-origin read redirects only; Purchase redirects refused; Provider error text never stored; Safe Mango reason; Candidate requires session; Layout requires session; Only selected crops public; Full-size candidate link; Up to ten older offered runs; Queue contains only run identity; Only still-needed requests; Erasure write fence; Restore fence; Erasure redacts briefs. |
| `DESIGN-004` | Design import | published | partial | `tests/campaign-authoring/design-import.spec.ts` | Asserted: Version-2 LayerDoc and PNG imported; Hosted photos; Operator HTTPS button; Managed unsubscribe footer; Saved postal-address footer; Unsupported layer text listed; Novel design line highlighted; Brief line not falsely highlighted; Unsupported version visibly refused; Non-HTTPS button visibly refused; Saved body unchanged after refusal; Unsaved edit leaves saved revision intact; No import save; Ordinary exact-revision approval succeeds; Measured HTML-part size refusal; No request to 12ui. Unasserted: Browser compiles email grammar; Unrepresentable grammar refused; Nothing outside grammar saved; No import approval; No import schedule; No import send; Measured plain-text-part size refusal. |
| `DESIGN-012` | Compile the imported layout | published | partial | `tests/campaign-authoring/design-import.spec.ts` | Asserted: related implementation or scenario coverage, with no complete assertion of the outcomes below. Unasserted: Centered 600-pixel layout; Header emblem and lettering; Full-width photos; Two-column vertical alignment; One button; Managed footer; Tightened email grammar; Only cells paint backgrounds; Images keep natural inline display; Button corners within padding; Escaped text; Long-word wrapping; Closed hex colors; At least 4.5:1; Georgia-or-Helvetica stacks; Mango sizes and spacing; Full-resolution crop; At most twice displayed width; JPEG uploaded; No server image codec; Compiler size check; Save size check; Approval size check; Test size check; Delivery size check; Oversize recipient skipped; No truncation; Phone columns side by side; Phone columns narrow with email. |
| `DESIGN-013` | Review imported design content | published | partial | `tests/campaign-authoring/design-import.spec.ts` | Asserted: Hosted image thumbnail; Text novel-line highlighting; Unsaved state shown; Discard removes summary. Unasserted: Image description highlighting; Icons omitted and listed; Dividers omitted and listed; Shapes omitted and listed; Destinationless links omitted and listed; Extra buttons omitted and listed; Footer links omitted and listed; Digit-bearing footer lines omitted and listed; Edited-since state shown; Abandoned uploaded images remain; Approval does not verify model claims. |
| `DESIGN-014` | Bounded local design input | published | partial | `tests/campaign-authoring/design-import.spec.ts` | Asserted: related implementation or scenario coverage, with no complete assertion of the outcomes below. Unasserted: 2 MB bound; 2,000-layer bound; 64-level nesting bound; Deep input named refusal without overflow; Unsupported input not guessed; PNG canvas shape matched; Personalization delimiter rejected; Editable draft-derived brief; Whole-line whole-word matching; Case/spacing/typographic-quote matching; Signed URLs never fetched; Every value stays within compiler; Lazy importer load. |
| `MSG-001` | Sender identity | published | partial | `src/core/features/settings/sender-validation.ts` · `tests/settings-sender/routes.spec.ts` | acceptance not yet met: Email identity is proved; per-country registered SMS senders await SMS-001 and SMS-002. |
| `MSG-002` | Email authentication | published | partial | `tests/sender-verification/worker.spec.ts` | Old evidence asserts Passing sender schedules. Unasserted: Scheduling is refused when the sending domain does not pass SPF.; Scheduling is refused when the sending domain does not pass DKIM.; Scheduling is refused when the sending domain does not pass DMARC.; Scheduling is refused when the visible From domain does not align with an authenticated domain.. |
| `MSG-003` | Email unsubscribe | published | partial | `tests/go-live/go-live.journeys.ts` · `tests/sender-verification/worker.spec.ts` | Old evidence asserts Visible link; One-click declaration; Opt-out ledger is changed before success; Context-free one-click body; Scanner and prefetch do not unsubscribe. Unasserted: Opaque HTTPS mail-client URL; DKIM covers both headers; No redirect; Visible confirmation action alone opts out; A token changes only its contact. |
| `MSG-004` | SMS permission | published | partial | `src/core/features/sms/transport-guard.ts` | acceptance not yet met: SMS eligibility needs subscribed scope and an approved sender; US registration pending. |
| `MSG-005` | SMS opt-out | published | partial | `tests/go-live/content-checks.journeys.ts` · `src/core/features/sms/review-preview.ts` · `src/core/features/sms/content.ts` | Assertions in tests/go-live/sms-review.ts are outside this clause's old Evidence set. Old evidence asserts no complete acceptance outcome at an asserting line. Unasserted: Configured program identity; STOP or jurisdiction equivalent; Frequency disclosure; URL never replaces reply opt-out; Compliance text; Segment count; Help contact. |
| `MSG-006` | Links | published | partial | `tests/go-live/content-checks.journeys.ts` · `src/core/features/campaigns/link-reasons.ts` · `src/core/features/lifecycle/checks.ts` | Assertions in tests/go-live/content-links.ts and tests/go-live/content-hosts.ts are outside this clause's old Evidence set. Old evidence asserts Campaign approval. Unasserted: Malformed links named and blocked; Forbidden schemes named and blocked; Unlisted link and redirect hosts named and blocked; Image scheme and host named and blocked; Allow action only for host; Contact links need no allowance; Flow activation; Link inspection; Tracking; Own asset checked without DNS; Own asset checked without same-host request; Missing own asset blocks and is named. |
| `MSG-007` | Content checks | published | partial | `tests/go-live/content-checks.journeys.ts` | Old evidence asserts Blocking findings shown; Advisory findings shown; Acknowledgment survives reload; Replay produces one audit entry; Actor. Unasserted: Every channel. |
| `MSG-008` | Personalization | published | partial | `tests/go-live/personalisation.journeys.ts` | Old evidence asserts Bare token blocks checks; Approval refusal leaves no recipient steps; Saved fallback rendered; Eligible person counts exclude pending people and token occurrences; Approval preserves counts. Unasserted: Bare token when every eligible person resolves it; Scheduling refusal. |
| `MSG-009` | Email body | published | partial | `tests/campaign-authoring/canonical-save.spec.ts` | Old evidence asserts Stored parser structure; Save stability. Unasserted: Decoded destination checks; Literal quote refusal; Literal angle-bracket refusal; No-break space refusal; Normalization does not repair hiding declarations; Multipart alternative; Equivalent offer in HTML and text; Equivalent links in HTML and text; Unsubscribe link in both parts; Saved preheader delivered; Saved HTML bytes delivered; Only token and tracking substitutions; Admitted tag set; Admitted attribute set; Admitted inline-style set; BUILD-012 size bar; Script refusal; Form refusal; Stylesheet refusal; Class refusal; CSS-function refusal; Responsive block generated only by builder; Responsive block regenerated on save; Check with responsive block; Check without responsive block; Same stored-parse checker for approval; Same stored-parse checker for test send; Same stored-parse checker for delivery; Preview uses shared parse; Preview styles only after checker success; Plain text derives from same parse. |
| `MSG-010` | Unsubscribe availability | published | partial | `tests/go-live/opt-out-reasons.journeys.ts` · `src/core/features/audience/unsubscribe-routes.ts` | Old evidence asserts Complete response below two seconds; Shared GET allowance excess; Shared POST allowance excess; Another token at the same client address actually opts out; Confirmation at both widths. Unasserted: Visible confirmation alone prevents approved delivery (the cited journey confirms only after its one-click opt-out). |
| `MSG-011` | Sending reputation | published | partial | `tests/go-live/delivery.journeys.ts` | Old evidence asserts no complete acceptance outcome at an asserting line. Unasserted: At 1,000 or more marketing deliveries in the reporting window, a complaint rate at or above 0.3% blocks scheduling.; At that volume, a hard-bounce rate at or above 5% of attempted marketing hand-offs blocks scheduling.; Provider hold blocks approval; Each block names its numerator, denominator, reporting window and provider rule and cannot be acknowledged away.; Late facts recompute the block, which clears only when every applicable threshold is below its limit.. |
| `MSG-012` | Hidden or deceptive presentation | published | partial | `tests/campaign-authoring/canonical-save.spec.ts` | Old evidence asserts Parser tree controls approval; Low-contrast text blocked; Misparsed styled markup blocks. Unasserted: Test-send tree; Delivery tree; Hidden text refused; Clipped text refused; Faded text refused; Under-10px text refused; Moved text refused; Overlaid text refused; Reversed text refused; Reason named; Background outside painted cells/wrapper refused; Display changes refused; Constraining dimensions refused; Inline borders refused; Painted rounded corner over text refused; Direction outside cell refused; Overlapping styled cells refused; Unsubscribe presentation protected; Postal-address presentation protected; Painted-cell contrast; Outer-wrapper contrast; White-page contrast; Standards-rendering contrast; Quirks-rendering contrast. |
| `MSG-016` | Legacy approved email and draft compatibility | published | partial | `tests/campaign-authoring/canonical-save.spec.ts` | Old evidence asserts no complete acceptance outcome at an asserting line. Unasserted: Legacy plain approval remains byte-identical; Legacy parser-stable styled approval remains byte-identical; No re-approval of valid legacy body; Malformed-close legacy refusal; Out-of-table attribute legacy refusal; Undersized nested-heading legacy refusal; Direction-override legacy refusal; Reason named; New approval needed; Literal-text legacy forms deliver unchanged; Tightened placement preserves plain approvals; Old prohibited style refused at test send; Old prohibited style refused at delivery; Earlier design re-imported; Older draft canonicalized on any save; Markup spelling does not refuse save. |
| `SEND-001` | Provider hand-off | published | partial | `tests/go-live/managed-mail.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts` | Old evidence asserts Email adapter hand-off; Reconciliation-window coverage; Resumed dispatch does not duplicate. Unasserted: SMS adapter hand-off; Campaign/revision/step/contact identity; Provider-effective deduplication; Deadline coverage; Durable fence precedes SendGrid request; Correlation key is not provider deduplication; Provider identifier stored before handed-off state; Definite nonacceptance may retry; Accepted hand-off never retried; Uncertain hand-off never retried; Timeout remains uncertain; Reset remains uncertain; Uncertain provider response remains uncertain; Missing message identifier remains uncertain; Eviction after fence remains uncertain; Operator review is named; Job retry does not duplicate; Queue replay does not duplicate. |
| `SEND-002` | Quiet hours | published | partial | `src/core/features/sms/policy.ts` | acceptance not yet met: Recipient-local SMS windows; US defaults in SMS-003. |
| `SEND-003` | Throttling and progress | published | partial | `tests/go-live/delivery.journeys.ts` | Old evidence asserts Provider pacing; Estimated completion; Accepted count refresh within 30 seconds. Unasserted: Carrier pacing; Delivered count refresh; Skipped count refresh; Failed count refresh. |
| `SEND-004` | Transport failure | published | partial | `tests/go-live/delivery-recovery.journeys.ts` · `tests/go-live/delivery.journeys.ts` | Old evidence asserts Five retries then failure; Within original hour; Increasing delays; Exhaustion failed state; Error visible in detail. Unasserted: Uncertainty reconciled without retry; Permanent rejection terminal; Atomic suppression for hard rejection; Atomic suppression for complaint; Atomic provider suppression. |
| `SEND-005` | Provider-event identity | published | partial | `tests/go-live/go-live.journeys.ts` · `tests/go-live/delivery-recovery.journeys.ts` | Old evidence asserts Signed event accepted; Replay and reorder preserve recipient disposition; Older fact does not downgrade delivery. Unasserted: Strongest adapter identity and immutable fact; Replay and reorder preserve every contact state; SMS reply identity. |
| `SEND-006` | Delivery truth | published | partial | `tests/go-live/go-live.journeys.ts` · `tests/go-live/scheduler.journeys.ts` | Old evidence asserts Accepted and uncertain states; Independent complaint; Delivery retained after complaint. Unasserted: All remaining disposition states; Independent suppression; Skipped reason retained. |
| `SEND-007` | Partial completion | published | partial | `tests/go-live/go-live.journeys.ts` · `tests/campaign-results/results.journeys.ts` | Old evidence asserts Per-disposition visible counts; Late complaint updates campaign summary; Late complaint updates ledger. Unasserted: Uncertainty is not terminal; Every terminal disposition gates completion; All overlapping complaint/suppression totals separate; No combined success figure; Late suppression updates completed summary. |
| `SEND-008` | Resumable dispatch and reconciliation | published | partial | `tests/go-live/go-live.journeys.ts` · `tests/go-live/resend-delivery.journeys.ts` | Old evidence asserts Restart resumes; No duplicate send; Provider lookup reconciles uncertainty; Missed provider facts imported; Activity unavailable retains uncertainty. Unasserted: Eviction resumes; Redeployment resumes; Queue redelivery preserves fence; No operator restart action; Other unresolved lookup; Signed SendGrid event correlation; Activity identity correlation; Expired SendGrid lookup retains uncertainty; No invented delivery; No invented failure; No automatic retry control; Receiver evidence available; Provider identifiers available; No delivery credit. |
| `SEND-009` | Provider outage | published | partial | `src/core/features/lifecycle/provider-outages.ts` · `tests/go-live/delivery-recovery.journeys.ts` | Old evidence asserts Adapter unavailable pauses channel; No recipient hand-off while paused; Bounded non-recipient probe; Probe cadence survives restart; Automatic probe recovery. Unasserted: Five-minute continuous transient trigger; Audience recheck after recovery; Provider error visible. |
| `RESULT-001` | Campaign history | published | partial | `tests/campaign-results/results.journeys.ts` | Old evidence asserts State and channel filters; Cancellation outcome; Delivery schedule/timeline; Per-channel disposition totals. Unasserted: The opened body is the approved revision; Full audience snapshot is inspectable. |
| `RESULT-002` | Engagement | published | partial | `tests/go-live/open-estimates.journeys.ts` | Old evidence asserts Default off and explicit enablement; Privacy-sensitive estimate label; Other result fields unchanged after pixel fetch. Unasserted: Observed click labels; Observed conversion labels. |
| `RESULT-003` | Attribution | published | done | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/performance-fixture.ts` |  |
| `RESULT-004` | Cost | published | partial | `tests/campaign-results/costs.journeys.ts` | Old evidence asserts AI billable units; Provider units, currency and cost; Campaign totals; UTC day boundary; Day/currency/unknown-price groups. Unasserted: Model or channel on each fact; Timed-out purchase proven before counting; Layout unit once. |
| `RESULT-005` | Link tracking | published | partial | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/tracking-journey.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/open-estimates.journeys.ts` | Old evidence asserts Opaque first-party redirect; Distinct recipient-step redirect; Original destination forwarding; No cookie; No loaded body. Unasserted: CONT-018 token not yet built; Scanner excluded from attribution. |
| `RESULT-009` | Open-estimate lifecycle | published | partial | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/tracking-journey.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/open-estimates.journeys.ts` | Old evidence asserts Unique first-party pixels after opt-in; Pixel changes only estimate results; Disable revokes issued pixels; Reenable does not readmit old pixels; One estimate after repeated requests. Unasserted: Ordinary images remain untracked; No IP retained; No user agent retained. |
| `RESULT-010` | Ordinary campaign images are untracked | published | partial | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/tracking-journey.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/open-estimates.journeys.ts` | Old evidence asserts no complete acceptance outcome at an asserting line. Unasserted: Every recipient receives the same campaign-image URL.; No address retained; No user agent retained; No cookie retained; No recipient retained; No request time retained; Only current-minute image rate counter retained; Ordinary image not counted as open; Ordinary image not shown as open. |
| `RESULT-006` | Deliverability reporting | published | partial | `src/core/features/insights/ui/sender-rates.tsx` · `tests/go-live/delivery.journeys.ts` | acceptance not yet met: Per-domain rates shown; SMS sender rates await SMS-001. |
| `DATA-001` | Export contents | published | partial | `tests/portability.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/local-start/command-data.journey.ts` | Old evidence asserts Archive includes contacts; Archive includes consent; Archive includes suppressions; Archive includes surviving opt-outs; Archive includes recipient-step outcomes. Unasserted: Archive includes source records; Archive includes proposals; Archive includes campaigns; Archive includes revisions; Archive includes audience decisions; Archive includes messages; Archive includes attribution events; Archive includes settings; Archive includes audit entries; Signed first-owner authority excluded; Authentication credentials excluded; Sessions excluded; Transfer bookkeeping excluded; Operator profiles attribution-only. |
| `DATA-002` | Marketing restore custody | published | partial | `tests/portability.spec.ts` · `tests/go-live/go-live.journeys.ts` · `tests/local-start/command-data.journey.ts` | Old evidence asserts Every older archive refused by current erasure floor; Nonempty legacy journal refused before staging; Current post-erasure export restores; Surviving opt-outs preserved. Unasserted: Empty maintenance destination; Explicit confirmation; Fresh destination native authentication; Contact keys match before record restore; Link keys match before object restore. |
| `MGMT-001` | Signed first-owner admission | published | partial | `src/core/features/auth/owner-claim.ts` | acceptance not yet met: Signed first-owner admission once per installation; hosted proof pending. |
| `MGMT-002` | Native owner editor | published | partial | `tests/local-start/editor.journey.ts` | Old evidence asserts Owner editor present; Anonymous no widget; Logout removes widget. Unasserted: Short-lived grant; Configured management frame origin; Foreign frame/message rejected; Authorization loss removes widget; Grant expiry removes widget; Compiled edits after route hydration; Six product roles separate from Base roles; Last product Owner protected; Destination-owned restore authority; Owner/Admin CSV restriction. |
| `OPER-004` | Roles and permissions | target | partial | `tests/go-live/roles.journeys.ts` · `src/core/features/auth/permissions.ts` · `src/core/features/auth/product-roles.ts` · `migrations/core/0076_operator_product_roles.sql` · `tests/go-live/delivery.journeys.ts` · `tests/go-live/sending-connection-journey.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-api-journey.ts` | Six persisted roles, Owner assignment and Analyst unmasking grant, next-request API/server-function enforcement, role-change audits, last-owner protection, Author draft/request/configured-test controls, Manager typed tests and approval, restricted contact views, Support opt-out/request recording and visible controls at 1440/390 are exercised. Gap: full flow activation, billing-bearing provider connect/replace/disconnect and installation-erasure journeys await their owning product implementations; masked CSV export is not implemented (exports remain Owner/Admin only). Authentication role grants stay destination-owned on restore. |
| `OPER-005` | Separation of approval | target | missing |  | not implemented |
| `OPER-006` | Single sign-on and deprovisioning | target | missing |  | not implemented |
| `OPER-007` | Activity log | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/auth/activity.ts` · `src/core/features/auth/activity-query.ts` · `src/core/features/auth/ui/activity-page.tsx` · `src/core/features/auth/activity-record.ts` | Owner and Admin read Activity under Settings (Authors and signed-out requests are refused on both doors): every `lifecycle_audit_entries` row and every integration-audit call, newest first, filtered by operator, agent, action, object and date, with older pages and a CSV of the filtered view that keeps a formula-like cell as text. One journey performs drafts saved, approval requests and approvals, pause, resume and cancel, an import, an audience export, an account export, a consent hand entry, an opt-out, an erasure (anonymised afterwards), signup-allowance and kiosk-form changes, role changes and an hourly signup-refusal summary (counts by form and reason, no addresses), then checks each appears once with actor and time, every filter and the export, at 1440 and 390 with axe. Each action's record is written with the action it records: in its own batch where the action is one (draft save, signup settings), otherwise immediately after it succeeds. FLOW-008 (activation, pause and archive of flows) and AGENT-010 (agent actions and the agent filter's values) inherit the obligation in their text (ct pattern 1). The product has no approval-rejection operation, so none is recorded. Gap: actual restore completion must be recorded with actor and time and visible, filterable and exportable in Activity. |
| `CONT-014` | Custom properties | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` | The scoped API persists contact fields with contact identity and consent source. Typed property definitions, UI editing, date/money semantics, segments and personalization remain unimplemented. |
| `CONT-015` | Topics and tags | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `src/core/features/integrations/contacts.ts` · `src/core/features/lifecycle/email-consent-scope.ts` | Scoped subscriber sync stores deduplicated tags without granting consent, and maintains saved integration lists. Topic preference-center acceptance and general tag-driven segmentation remain unmet. |
| `CONT-016` | Preference center | target | missing |  | not implemented |
| `CONT-017` | Contact profile and event timeline | target | partial | `tests/audience-controls/contact-history.spec.ts` | Identities, channel/topic evidence, properties, segment membership, original-time events and masked Analyst/Support views are exercised. Apply the recorded routing of enrollment/current-node display to FLOW-002 and predictions to SEG-004; independent topic withdrawal remains CONT-015/016. No unavailable panel establishes completion. |
| `CONT-018` | Onsite behavior | target | partial | `tests/shopify/connection.spec.ts` | Shopify signed identified ingest and current privacy controls are exercised. The snippet and Stall carriers, expanded WooCommerce parity, shared switch/click identity and full four-carrier browser journeys remain unproved. INT-002’s separately approved plugin semantic remains distinct. The owner’s tracking default is already in force; no ct approval remains pending. |
| `CONT-031` | Per-site tracking switch | target | partial | `tests/shopify/connection.spec.ts` | Shopify pixel controls exercise part of the privacy rule. The shared per-site Mango switch, full role/control/activity matrix, off/on identity reset and every-carrier journey remain unproved. |
| `CONT-032` | Onsite consent and opt-out precedence | target | partial | `tests/shopify/connection.spec.ts` | Shopify privacy consent/GPC controls are exercised. Snippet, Stall and expanded WooCommerce parity, every consent-tool failure/withdrawal branch and every-carrier refusal/deletion journey remain unproved. |
| `CONT-033` | Onsite session storage | target | partial | `tests/shopify/connection.spec.ts` | Existing Shopify and separately approved INT-002 storage behavior are exercised. The unified cookie attributes, rotated identity, bounded payload/lifetimes and no-other-storage assertions across all carriers remain unproved. |
| `CONT-034` | Storefront click identity | target | missing | `tests/shopify/connection.spec.ts` | Shopify pixel ingest and current privacy controls are exercised; the shared click-token redirect, host-bound exchange, one-use/expiry and address-bar journeys across carriers remain unbuilt and unproved. |
| `CONT-035` | Earlier browsing stays on the visitor’s device | target | missing | `tests/shopify/connection.spec.ts` | Shopify signed identified ingest is exercised. Consent buffering, browser-only earlier browsing and absence of anonymous requests/records remain unbuilt and unproved across carriers. |
| `CONT-036` | Onsite retention and erasure | target | missing | `tests/shopify/connection.spec.ts` | Shopify signed ingest and present privacy controls exist. Cross-carrier 90-day retention, limited windows, erasure/session/token cleanup and disclosure proof remain unbuilt and unproved. |
| `CONT-037` | No cross-site onsite identity | target | partial | `tests/shopify/connection.spec.ts` | Shopify signed ingest and current privacy controls exist. Cross-site cookie, destination, credential and replay assertions across every carrier remain unproved. |
| `CONT-019` | US SMS consent capture | target | partial | `src/core/features/sms/signup.ts` · `tests/audience-import/signup.spec.ts` | acceptance not yet met: A form with phone capture shows the disclosure, the submission stores every evidence field, the confirmation text is sent once through the provider edge, and only a signed confirming reply subscribes; a pre-checked or missing disclosure blocks the form from publishing. |
| `CONT-020` | Engagement-based sunsetting | target | missing |  | not implemented |
| `CONT-021` | US privacy requests | target | partial | `tests/audience-import/erasure.spec.ts` | acceptance not yet met: A Support operator records an access request and a do-not-share request; the export contains every record type for that contact and no other contact; the next ad-audience sync omits the contact. |
| `CONT-022` | Contact search and bulk actions | target | partial | `src/core/features/audience/ui/contact-merge.tsx` | acceptance not yet met: A search for a property value returns the matching contacts; a bulk tag of 5,000 contacts completes as a job with a receipt; a bulk "add to topic" refuses contacts without covering evidence and names them. |
| `CONT-023` | Custom objects | target | missing |  | not implemented |
| `CONT-024` | Incumbent-held consent | target | partial | `tests/move-in/archive.journeys.ts` · `tests/move-in/incumbent-journey.ts` · `tests/portability.spec.ts` · `tests/go-live/contact-links.journeys.ts` | Mailchimp archive and named CSV/API source attestation and incumbent-held email evidence are exercised through the public preview, apply, campaign-review, native export/restore, revocation and erasure doors at 1440/390. Store connections (INT-001 to INT-006), five-year expiry and positive SMS evidence (A2P hold) remain unproved. A source without a row time requires an explicitly supplied export creation time. No real provider call or consent was used. |
| `CONT-038` | Source consent attestation | target | partial | `tests/move-in/archive.journeys.ts` · `tests/move-in/incumbent-journey.ts` · `tests/portability.spec.ts` · `tests/go-live/contact-links.journeys.ts` | Mailchimp archive and named CSV/API attestation, native export/restore and erasure are exercised. Store-connection attestation and five-year retention/expiry remain unproved; no real provider consent was used. |
| `CONT-039` | Incumbent evidence restrictions | target | partial | `tests/move-in/archive.journeys.ts` · `tests/move-in/incumbent-journey.ts` · `tests/portability.spec.ts` · `tests/go-live/contact-links.journeys.ts` | Mailchimp archive and named CSV/API restrictive-state, revocation and campaign review journeys are exercised. Connected-store intake, full cross-incumbent fields and positive SMS evidence remain unproved; no real consent was used. |
| `CONT-040` | Incumbent evidence labeling and revocation | target | partial | `tests/move-in/archive.journeys.ts` · `tests/move-in/incumbent-journey.ts` · `tests/portability.spec.ts` · `tests/go-live/contact-links.journeys.ts` | Archive and named CSV/API incumbent-held evidence, revocation and campaign-review counts are exercised. Complete source/privacy/report labeling and independent-evidence revocation behavior across store connections and every incumbent remain unproved. |
| `CONT-025` | Opt-in mode per form and source | target | partial | `tests/go-live/shared-kiosk.journeys.ts` · `tests/go-live/opt-in-journey.ts` · `tests/go-live/sync-integrations.journeys.ts` · `tests/portability.spec.ts` | Hosted, kiosk and manual email default/single capture, future-only Owner/Admin changes, activity and restoration are exercised. API mode editing, Shopify incumbent-held/Pending/Non-subscribed acceptance, popup/landing carriers, Zapier/Crank and SMS mode editing remain open. RL-101 settles manual-mode authority without changing status; no real provider consent was used. |
| `CONT-026` | Contact added by hand | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `tests/go-live/manual-entry-journey.ts` · `tests/portability.spec.ts` | Author entry, permission fields, properties, default confirmation, operator-recorded single mode, authenticated SMS reply and restricted-role views are exercised. Topic-specific permission awaits CONT-015; unauthenticated access follows BASE-ACCESS-002; legacy API evidence may omit new form-attestation fields. RL-102 adopts CONT-025’s Owner/Admin prospective authority; no real provider consent was used. |
| `CONT-027` | Resubscribe through a public form | target | partial | `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts` | Owner-approved confirmed-only hosted/kiosk resubscription retains the opt-out until recipient POST, records request/handoff/confirmation history, silently caps destination confirmation reservations at three per UTC day and refuses hard-bounce, complaint and owner suppressions. Generic acknowledgments include destination-dependent intake refusals and uncertain/failed delivery without automatic retries. Local browser journeys cover 1440/390 and separate resubscribe growth. Remaining full-clause acceptance: popup/landing and incentive/topic/flow integration, erasure reason preservation and supersession, and expired recreated-contact cleanup; ambiguous legacy erasure-only restrictions remain blocked. |
| `CONT-041` | Destination-private resubscription refusals | target | partial | `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts` | Owner-approved confirmed-only hosted/kiosk resubscription retains the opt-out until recipient POST, records request/handoff/confirmation history, silently caps destination confirmation reservations at three per UTC day and refuses hard-bounce, complaint and owner suppressions. Generic acknowledgments include destination-dependent intake refusals and uncertain/failed delivery without automatic retries. Local browser journeys cover 1440/390 and separate resubscribe growth. Remaining full-clause acceptance: popup/landing and incentive/topic/flow integration, erasure reason preservation and supersession, and expired recreated-contact cleanup; ambiguous legacy erasure-only restrictions remain blocked. |
| `CONT-042` | Shared destination confirmation allowance | target | partial | `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts` | Owner-approved confirmed-only hosted/kiosk resubscription retains the opt-out until recipient POST, records request/handoff/confirmation history, silently caps destination confirmation reservations at three per UTC day and refuses hard-bounce, complaint and owner suppressions. Generic acknowledgments include destination-dependent intake refusals and uncertain/failed delivery without automatic retries. Local browser journeys cover 1440/390 and separate resubscribe growth. Remaining full-clause acceptance: popup/landing and incentive/topic/flow integration, erasure reason preservation and supersession, and expired recreated-contact cleanup; ambiguous legacy erasure-only restrictions remain blocked. |
| `CONT-043` | Resubscription after erasure | target | missing | `tests/go-live/resubscribe.journeys.ts` · `src/core/features/audience/public-capture-writer.ts` · `src/core/features/audience/confirmation-handoff.ts` | Hosted/kiosk confirmed resubscription is exercised. Erasure reason preservation, supersession and expired recreated-contact cleanup remain unbuilt/unproved; ambiguous legacy erasure-only restrictions remain refused. |
| `AUD-008` | Inactivity rules in review | target | partial | `tests/move-in/archive.journeys.ts` · `tests/go-live/roles.journeys.ts` | Review shows dormant/open-only and included no-history counts. An approver can include open-only or disable dormancy for the campaign, with the restored count saved; Owner/Admin defaults under audience.exclusions.v1 copy into new drafts. The immutable approved policy, actor audit and dispatch recheck are exercised. Gap: unengaged (CONT-020), dormant precedence over unengaged, and flow-message inactivity controls remain owed. Existing fieldset, checkbox, numeric input and action patterns suffice; no new design pattern is introduced. |
| `AUD-009` | Frequency protection: one policy and a recorded override | target | partial | `src/core/features/lifecycle/policies.ts` · `src/core/features/audience/eligibility.ts` | acceptance not yet met: Two campaigns to the same audience are approved four hours apart. With the default, the second excludes everyone the first emailed, with `frequency-window`. With the override recorded at the second's approval, it hands off to them, the override and its approver appear in the activity log, and a contact who unsubscribed between the two sends is still excluded. A contact emailed a campaign in the morning still receives that afternoon's abandoned-cart message from the library flow, a draft flow made from a Mailchimp journey fixture carries the same setting, and its activation shows the 30-day skip count from seeded sends. |
| `AUD-011` | Cart-flow frequency and impact | target | missing | `src/core/features/lifecycle/policies.ts` · `src/core/features/audience/eligibility.ts` | No delivered flow-message frequency workflow is proved: cart/library and moved-in-flow counting, visible changeable settings and the 30-day activation impact comparison are wholly absent in the old gap. |
| `CAMP-013` | Recipient-local send time | target | missing |  | not implemented |
| `CAMP-014` | Pause and resume | target | done | `tests/go-live/pause.journeys.ts` |  |
| `CAMP-015` | Marketing calendar | target | missing |  | not implemented |
| `CAMP-016` | Follow-up to non-engaged recipients | target | partial | `tests/campaign-results/followup.journeys.ts` · `tests/portability.spec.ts` | Asserted: Linked follow-up and selected delay; New subject; Non-opener estimate label; 48-hour non-clicker candidates; Current exclusions including frequency; Independent approval; Independent frequency check. Unasserted: Exact non-clicker recipient identities after current exclusions. |
| `CAMP-017` | Recurring and RSS-to-email campaigns | target | missing |  | not implemented |
| `CAMP-018` | Duplicate a campaign | target | partial | `tests/campaign-authoring/browser.spec.ts` | Asserted: related implementation or scenario coverage, with no complete assertion of the outcomes below. Unasserted: Duplication from every campaign state; Copy-of name; New independent draft; Copied channels; Copied audience rule; Copied content bytes; Copied sender; Copied preheader; Copied tracking choice; Copied step settings; No copied schedule; No copied approval; No copied snapshot; No copied test; No copied result; Current settings checked; Current consent checked; Current audience checked; Source revision unchanged; Source results unchanged. Assertions in tests/campaign-authoring/reuse-journey.ts are outside the old Evidence cell. |
| `CAMP-019` | Test send to typed addresses | target | partial | `tests/go-live/typed-tests.journeys.ts` · `src/core/features/lifecycle/test-send-allowance.ts` · `src/core/features/lifecycle/test-destinations.ts` | Up to five typed email recipients receive marked saved-draft tests with opt-out/suppression refusal and destination/actor history. Remaining allowance is visible; whole-request quota admission is atomic and names the remaining count on refusal. Configured and typed attempts share the default 100 attempted hand-offs per UTC day, including uncertain outcomes, with midnight reset exercised. Authors see configured destinations only and typed requests receive 403; assigned Manager typed tests and Author configured tests are exercised by `tests/go-live/roles.journeys.ts`. Activity lists each typed destination with actor and time, action/object filters and CSV export; contact erasure redacts the destination while retaining the receipt (`tests/go-live/typed-tests.journeys.ts`, push Verify go-live 8/9, 1440/390). Remaining: typed SMS consent/transport (SMS-001, CONT-019), full role acceptance (OPER-004). |
| `CAMP-024` | Shared daily test allowance | target | partial | `tests/go-live/typed-tests.journeys.ts` · `src/core/features/lifecycle/test-send-allowance.ts` · `src/core/features/lifecycle/test-destinations.ts` | Up to five typed email recipients receive marked saved-draft tests with opt-out/suppression refusal and destination/actor history. Remaining allowance is visible; whole-request quota admission is atomic and names the remaining count on refusal. Configured and typed attempts share the default 100 attempted hand-offs per UTC day, including uncertain outcomes, with midnight reset exercised. Authors see configured destinations only and typed requests receive 403; assigned Manager typed tests and Author configured tests are exercised by `tests/go-live/roles.journeys.ts`. Activity lists each typed destination with actor and time, action/object filters and CSV export; contact erasure redacts the destination while retaining the receipt (`tests/go-live/typed-tests.journeys.ts`, push Verify go-live 8/9, 1440/390). Remaining: typed SMS consent/transport (SMS-001, CONT-019), full role acceptance (OPER-004). |
| `MSG-013` | Contact links (mailto:, tel:, sms:) | target | partial | `tests/go-live/contact-links.journeys.ts` | Old evidence asserts Multiple addresses blocked; Disallowed parameters blocked; Email subject/body form saved; E.164 phone and SMS body saved; Invalid phone blocked. Unasserted: Ten-digit US and visual separators; Web kind; HTTPS-only image sources. |
| `MSG-014` | Allowed link and image hosts | target | partial | `tests/go-live/content-checks.journeys.ts` · `tests/go-live/content-hosts.ts` · `tests/portability.spec.ts` | Fresh installations list deployment, conservative social defaults and genuine configured connection hosts with sources. Exact and explicit wildcard matching stays shared; durable operator removals survive catalog sync, review allowances retain source/operator/campaign, and source changes are audited. Existing explicit policies remain explicit. Acceptance remains unmet: Shopify does not store primary/additional storefront or catalog image domains; product/social blocks (BUILD-001), brand kit (BUILD-003), Shopify disconnect and flow activation are absent. The existing store-owned editor help incorrectly describes implicit subdomain matching and is not changed in this writer. Social vocabulary approval is pending. |
| `MSG-015` | Allow a blocked host from review | target | partial | `tests/go-live/content-checks.journeys.ts` | Assertions in tests/go-live/content-hosts.ts are outside this clause's old Evidence set. Old evidence asserts no complete acceptance outcome at an asserting line. Unasserted: Campaign blocked-host list; Flow blocked-host list; Every affected link; Redirect host list; Manager exact-host allowance; Admin exact-host allowance; Owner exact-host allowance; Explicit subdomain allowance; Review source retained; Campaign/flow retained; Operator retained; Immediate recheck; Append-only activity; Operator field; Host field; Campaign/flow field; Activity view; Operator filter; Action filter; Object filter; Author sees blocked hosts; Author can request named approval; No Author allow control; Author allowance refused; Contact links need no allowance; Remaining safety inspections retained; All three imported outside hosts listed; Allow action for each imported outside host. |
| `RESULT-007` | Click map, per-link clicks and clicker lists | target | partial | `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/reporting-journey.ts` | Campaign links show human totals, unique identified clickers, automated requests, a saved-revision click map, matching clicker CSV and exact saved ID cohorts. Gap: repeated positions with one destination share counts; legacy clicks without destination identity remain unassigned; erased click facts are removed rather than retained as anonymous link counts; campaign-wide unique rollups, flow reports and role masking are absent; very large saved cohorts require CSV. |
| `RESULT-008` | Recipients per outcome | target | partial | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/recipient-method-journey.ts` · `tests/campaign-results/results.journeys.ts` · `tests/portability.spec.ts` | Message-bound link, one-click and signed SMS reply methods are retained with their first recorded time, shown in the recipient list and CSV and preserved as anonymous counts after erasure. Historical methods remain unknown. Flow messages and role masking remain absent; very large saved cohorts require CSV. |
| `SCALE-001` | Capacity for the first buyer | target | partial | `seed.json` · `src/core/features/audience/import-limits.ts` | acceptance not yet met: A generated installation of 250,000 contacts with a year of order and activity events passes the MOVE-012 move-in, an exact review count within 60 seconds, a complete hand-off to the provider edge at the declared rate with no duplicate (SEND-001), and a segment update within SEG-002's time, with wall time and peak memory recorded against seed.json → limits; the per-email size floor is proved under BUILD-012, and the intake floor under FORM-008. |
| `FORM-001` | Hosted and embedded signup | target | partial | `src/core/features/audience/signup-routes.ts` · `tests/audience-import/signup.spec.ts` | The cited signup journey asserts pending consent, one confirmation, replay and expiry. It does not assert an embedded-origin refusal or absence of campaign/flow authority after submission; the old evidence set has no embed-origin journey. |
| `FORM-002` | Popups, flyouts and full-page forms | target | missing |  | not implemented |
| `FORM-003` | Multi-step capture and incentives | target | missing |  | not implemented |
| `FORM-004` | Landing pages | target | missing |  | not implemented |
| `FORM-005` | Form performance and tests | target | missing |  | not implemented |
| `FORM-006` | Referral program | target | missing |  | not implemented |
| `FORM-007` | Abuse resistance | target | partial | `src/core/features/audience/signup-security.ts` · `tests/audience-import/signup.spec.ts` | The cited signup test asserts body/disclosure rejection, honeypot no-mail, duplicate mail and durable network refusal. It does not assert every sender-before-claim guard, network normalization/restart/counter ceiling, Turnstile action/hostname/reuse/failure mode or status-free acknowledgment for all protected address states; additional challenge tests exist outside the old Evidence cell. |
| `FORM-008` | Signup intake capacity | target | partial | `tests/go-live/shared-kiosk.journeys.ts` · `tests/go-live/signup-capacity-journey.ts` · `tests/audience-import/signup-security.spec.ts` · `tests/audience-import/signup-reservation-clock.spec.ts` · `tests/portability.spec.ts` | Hosted capacity, separate pools, shared network, bot isolation, duplicate claims and settings are exercised. Popup/flyout/full-page/landing carriers remain open; their absence does not waive the published sustained 1,000/hour floor. RL-103 adopts these capacity choices without promoting status. |
| `FORM-011` | Accepted-only signup accounting | target | partial | `tests/go-live/shared-kiosk.journeys.ts` · `tests/go-live/signup-capacity-journey.ts` · `tests/audience-import/signup-security.spec.ts` · `tests/audience-import/signup-reservation-clock.spec.ts` · `tests/portability.spec.ts` | Hosted/kiosk accepted-only claims, bot isolation, duplicate refunds and single-mode admission are exercised. Accounting across popup, flyout, full-page and landing carriers remains unproved; no local proof promotes this split of a partial clause. |
| `FORM-012` | Owner-controlled signup allowance raises | target | partial | `tests/go-live/shared-kiosk.journeys.ts` · `tests/go-live/signup-capacity-journey.ts` · `tests/audience-import/signup-security.spec.ts` · `tests/audience-import/signup-reservation-clock.spec.ts` · `tests/portability.spec.ts` | Owner-only next-window raises, floor/ceiling validation, activity and Settings are exercised on hosted/kiosk capacity. This remains a carried partial part; capacity disclosure and delivery-ceiling behavior across every promised carrier remain unproved. |
| `FORM-013` | Signup challenge defaults and configuration | target | partial | `tests/go-live/shared-kiosk.journeys.ts` · `tests/go-live/signup-capacity-journey.ts` · `tests/audience-import/signup-security.spec.ts` · `tests/audience-import/signup-reservation-clock.spec.ts` · `tests/portability.spec.ts` | Hosted/kiosk challenge defaults, toggles, token replay and missing-key warning are exercised. Popup/flyout/full-page/landing carriers and their provisioning proof remain open; RL-103 preserves all those obligations. |
| `FORM-009` | Kiosk and event forms | target | partial | `tests/go-live/shared-kiosk.journeys.ts` · `src/core/features/audience/signup-routes.ts` · `src/core/features/audience/ui/kiosk-signup-page.tsx` · `migrations/core/0075_kiosk_forms.sql` | The cited kiosk journey asserts blank fields/consent controls, 300 confirmations from one network, no cookies/storage, mandatory challenge/no contact, source report and attributed marking. It does not assert full-screen geometry or prove that kiosk facts cannot identify a later CONT-018 visitor; screenshots and empty browser storage alone do not prove the latter. Original FORM-008 provisioning and ordinary intake obligations stay there. |
| `FORM-010` | Refused signups are never silent | target | partial | `tests/go-live/shared-kiosk.journeys.ts` · `tests/go-live/signup-refusal-screens.ts` · `tests/audience-import/signup-security.spec.ts` · `tests/audience-import/signup-reservation-clock.spec.ts` · `tests/go-live/resubscribe.journeys.ts` · `tests/go-live/sync-integrations.journeys.ts` · `tests/go-live/activity-log.ts` | Hosted/kiosk errors, retained entries, generic destination acknowledgment, Home and activity are exercised. FORM-005’s per-form report remains required and unbuilt under RL-104; Settings counts do not replace it. Other growth carriers remain open. |
| `SEG-001` | Segment builder | target | partial | `tests/audience-controls/segments.spec.ts` · `tests/audience-controls/segment-journey.ts` · `tests/audience-controls/segment-catalog.ts` · `tests/audience-controls/segment-fixture.ts` · `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/cross-channel-attribution.ts` | Nested property/tag/consent/geographic/order/catalog and human click selection, summaries, live estimate and per-contact exact review are asserted. Cited old evidence does not assert viewed product/collection/category selection, full named campaign/link/flow activity or prediction-based matching; their dependencies being unfinished does not remove them from this clause. RFM and unavailable-catalog cases are asserted; predictive evidence remains SEG-004. |
| `SEG-002` | Live membership | target | missing |  | not implemented |
| `SEG-003` | RFM and lifecycle stages | target | partial | `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/retention-journey.ts` | The old retention journey asserts the five-stage distribution, a customer’s order/recency/frequency/monetary scores and displayed method. It does not advance a daily boundary or assert daily recomputation; the fixed fixture also does not independently recalculate every quintile boundary. |
| `SEG-004` | Predictions | target | missing |  | not implemented |
| `SEG-005` | Engagement and lead scoring | target | missing |  | not implemented |
| `SEG-006` | Campaign and flow activity conditions | target | missing |  | not implemented |
| `BUILD-001` | Drag-and-drop email builder | target | partial | `tests/proposals-decision/decision-routes.spec.ts` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/full-promotional-email-journey.ts` | The editor offers text, image, button, 1–4 columns, spacer, divider, header, footer, product, a six-item manual product grid and a closed-list social links block, with existing per-block and mobile settings through the MSG-009/012 grammar. Gap: video thumbnail, cart items, coupon and restricted HTML blocks remain unbuilt; exhaustive public-door coverage of every block/settings combination and the complete builder acceptance remain unproved. |
| `BUILD-002` | Template library | target | partial | `tests/campaign-authoring/browser.spec.ts` · `tests/portability.spec.ts` · `tests/move-in/archive.journeys.ts` · `tests/campaign-authoring/design-import.spec.ts` · `tests/campaign-authoring/design-generation.spec.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/flow-template-journey.ts` | Starter and saved templates create independent unscheduled campaigns; updating a template preserves existing drafts and approvals. Mailchimp archive templates enter the library, held conversions stay held, and undo removes an untouched template while preserving edits and independent drafts. The first saved DESIGN-004 import or DESIGN-002 application files its own library template. Library proof at 1440/390 is in the archive journey. Gap: executable migrated flows (FLOW-002), full importer coverage and real-provider sandbox proof remain; MOVE-002/003/005 now have the partial import paths recorded in their own rows.  FLOW-001 email nodes now retain independent subject, preheader, HTML and plain-text copies from the library; they remain draft only. |
| `BUILD-003` | Brand kit | target | missing |  | not implemented |
| `BUILD-004` | Reusable blocks | target | partial | `tests/proposals-decision/decision-routes.spec.ts` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/reusable-block-journey.ts` · `tests/portability.spec.ts` | Gap: live flow revisions and activation (FLOW-008 unbuilt) and template-library sync beyond BUILD-002's copy rule. |
| `BUILD-005` | Conditional content | target | missing |  | not implemented |
| `BUILD-006` | Dynamic product content | target | missing |  | not implemented |
| `BUILD-007` | Coupons | target | missing |  | not implemented |
| `BUILD-008` | Previews and pre-send checks | target | partial | `tests/go-live/presend-checks.journeys.ts` · `tests/go-live/email-size.journeys.ts` | The cited journeys assert safe contact/fallback previews, each located advisory, size detail and largest blocks, contrast refusal, no recipient effect on refusal and oversized save rejection. Gap: after correcting and acknowledging findings, approval is called and returns success but the cited files do not assert the persisted approval state or saved approval record; rendering a preview region is not that assertion. |
| `BUILD-009` | SMS and MMS composer | target | partial | `src/core/features/sms/content.ts` · `src/core/features/sms/review-preview.ts` | acceptance not yet met: A message with an emoji switches to UCS-2 and shows the new segment count and cost; the preview shows the short link and STOP text that will be sent. |
| `BUILD-010` | Mobile layout the checker can prove | target | partial | `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/mobile-presentation-journey.ts` · `tests/support/adversarial-email.mjs` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/design-import.spec.ts` · `tests/proposals-decision/decision-routes.spec.ts` | Per-block controls now use BUILD-001's block model and the existing generated-only style authority. Gap: nested/horizontal orientation and the complete editor acceptance remain unbuilt or unproved. Preview names hide on mobile/desktop, font size, line height, padding and alignment as dependent on the generated block. Conservative generated-only head style, 8192-byte bound and fail-visible desktop hiding defaults ADOPTED. No registration, timeout, shard count or cap was added or raised. |
| `BUILD-013` | Mobile and desktop message checks | target | partial | `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/mobile-presentation-journey.ts` · `tests/support/adversarial-email.mjs` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/design-import.spec.ts` · `tests/proposals-decision/decision-routes.spec.ts` | Per-block controls now use BUILD-001's block model and the existing generated-only style authority. Gap: nested/horizontal orientation and the complete editor acceptance remain unbuilt or unproved. Preview names hide on mobile/desktop, font size, line height, padding and alignment as dependent on the generated block. Conservative generated-only head style, 8192-byte bound and fail-visible desktop hiding defaults ADOPTED. No registration, timeout, shard count or cap was added or raised. |
| `BUILD-014` | Generated mobile presentation | target | partial | `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/mobile-presentation-journey.ts` · `tests/support/adversarial-email.mjs` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/design-import.spec.ts` · `tests/proposals-decision/decision-routes.spec.ts` | Per-block controls now use BUILD-001's block model and the existing generated-only style authority. Gap: nested/horizontal orientation and the complete editor acceptance remain unbuilt or unproved. Preview names hide on mobile/desktop, font size, line height, padding and alignment as dependent on the generated block. Conservative generated-only head style, 8192-byte bound and fail-visible desktop hiding defaults ADOPTED. No registration, timeout, shard count or cap was added or raised. |
| `BUILD-011` | Chosen catalog products | target | partial | `tests/go-live/multistep.journeys.ts` · `tests/go-live/chosen-catalog-journey.ts` · `tests/go-live/chosen-catalog-edge.ts` · `tests/local-start/signin-hydration.journey.ts` · `tests/campaign-authoring/chosen-size-journey.ts` · `tests/campaign-authoring/catalog-guard-journey.ts` | Gap: WooCommerce catalog picking and hand-off are unimplemented. Imported and flow authoring doors remain unproved; native imported history and MOVE-011 conversion do not create catalog choices. Unavailable hand-off reads skip the recipient-step with catalog-unavailable, counted on campaign detail; stale values never send (ct ruling 25 October). |
| `BUILD-012` | Email size the builder and imported templates fit in | target | partial | `tests/go-live/email-size.journeys.ts` · `tests/go-live/email-size-imports.ts` · `tests/go-live/email-size-reuse.ts` · `tests/campaign-authoring/create-api.spec.ts` · `tests/campaign-authoring/browser.spec.ts` · `tests/campaign-authoring/email-size-adoption.ts` · `tests/campaign-authoring/design-import.spec.ts` · `tests/campaign-authoring/canonical-save.spec.ts` · `tests/campaign-authoring/mobile-presentation-journey.ts` · `tests/proposals-decision/decision-routes.spec.ts` · `tests/campaign-authoring/block-builder-journey.ts` · `tests/campaign-authoring/reusable-size-journey.ts` · `tests/campaign-authoring/audience-size-journey.ts` · `tests/campaign-authoring/full-promotional-email-journey.ts` · `tests/local-start/signin-hydration.journey.ts` · `tests/campaign-authoring/chosen-size-journey.ts` · `tests/go-live/chosen-catalog-edge.ts` · `tests/campaign-authoring/catalog-riders-journey.ts` | Today's draft/create, store-signal starter, template save/replace/start, duplication, replacement-schedule copy, follow-up, imported-history copy and proposal-adoption doors use measured sent-size refusals with the limit and largest available HTML sections, comparing fallback and expanded saved-name renderings. Browser edits, selected design files and saved source snapshots survive refusal at 1440 and 390. Oversized archive template conversions are held with their measured diagnostic and original archive custody; the import continues, reconciliation distinguishes held conversions from created library templates, and undo removes unchanged held copies. In-limit content saves, reopens, approves and reaches the provider edge within its bound; a later oversized hand-off skips with email-too-large. Saved rule and exclusion membership now bounds displayName through the shared audience evaluator; approval measures its frozen email candidates. Separate raw and escaped maxima stay in D1. Only displayName currently supplies recipient values; other valid keys render their authored fallback. An unresolved new follow-up cohort retains the conservative deployment-wide bound until its membership authority exists. Size advisories retain saved audience and analytics context and recheck the eligible email identities used by approval. Gap: configured dynamic product maxima (BUILD-006), flow messages (FLOW-008), and the Mailchimp `base_boxed_3column_query.html` blueprint acceptance through MOVE-011 remain unproved. Mailchimp blueprint is CC BY-SA 3.0; vendoring waits on an owner licence decision. Existing LayerDoc application shares the design-import compiler; no real design or proposal generation/provider acceptance is claimed. |
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
| `SMS-003` | US quiet hours and state rules | target | partial | `src/core/features/sms/policy.ts` | acceptance not yet met: A step scheduled at 19:30 Eastern hands off to New York recipients and defers Los Angeles recipients only if 19:30 Eastern is outside their window; a fourth same-subject text to a Florida number in 24 hours is skipped with `state-frequency-limit`. A phone-only subscriber with a 305 number and no address hands off at 10:00 Eastern with zone source `area-code`, and is deferred at 20:30 Eastern. |
| `SMS-004` | Two-way SMS inbox | target | partial | `src/core/features/sms/inbound.ts` | acceptance not yet met: An inbound signed reply appears in the inbox and contact timeline; the operator's answer hands off through Twilio once; an inbound STOP opts the number out before the webhook is acknowledged and shows in the thread. |
| `SMS-005` | Branded short links and MMS | target | missing |  | not implemented |
| `SMS-006` | SMS cost control | target | missing |  | not implemented |
| `SMS-007` | WhatsApp marketing messages | target | missing |  | not implemented |
| `SMS-008` | Twilio connection an owner makes in Settings | target | missing |  | not implemented |
| `PUSH-001` | Web push | target | missing |  | not implemented |
| `PUSH-002` | Mobile app push and in-app messages | target | missing |  | not implemented |
| `DELIV-001` | Sending providers | target | partial | `src/core/platform/adapters/sendgrid.ts` · `src/core/platform/adapters/resend.ts` · `tests/go-live/resend-delivery.journeys.ts` | acceptance not yet met: The go-live journey runs against each adapter's edge and shows the declared capability on the campaign page; an SMTP relay without events never shows a delivered count; run on a connection made through DELIV-008, and done only once DELIV-008 is done. |
| `DELIV-002` | Domain setup | target | partial | `src/core/features/sender-verification/domain-setup.ts` · `src/core/features/sender-verification/setup-routes.ts` · `tests/go-live/contact-links.journeys.ts` | SendGrid create-if-missing, returned records, public-DNS pass/fail, DMARC/BIMI guidance and CNAME+HTTPS-gated branded links are implemented. Two real proofs each validated an authentication and all four DNS records, then deleted two authentications and ten DNS records in total with zero remaining after each run. Gap: the throwaway tracking CNAME passed but HTTPS transport failed, so real branded-host TLS/rewrite acceptance is unproved. Read-only Cloudflare diagnosis on 22 October found active wildcard certificates and no zone Worker routes: a DNS CNAME alone does not attach the branded hostname to Mango’s redirect handler. Live hosted branded-link proof pending a disposable deployment. Main declined account-wide Worker/D1 credentials; a separately reviewed proof workflow must use the repository’s existing deploy secret and always clean up; no new provider objects were created in c11; the setup guide currently operates on SendGrid, with Resend retaining its existing verification path. |
| `DELIV-003` | Bulk-sender compliance dashboard | target | partial | `src/core/features/lifecycle/reputation-guard.ts` · `tests/go-live/delivery.journeys.ts` | acceptance not yet met: With seeded provider facts at a 0.25 per cent complaint rate, the dashboard warns; at 0.3 per cent the MSG-011 block shows the same figures. With no signed event received yet, the complaint rate reads `delivery events not connected`. |
| `DELIV-004` | Domain warm-up | target | missing |  | not implemented |
| `DELIV-005` | Mailbox-provider breakdown | target | done | `tests/go-live/mailbox-provider.journeys.ts` |  |
| `DELIV-006` | Address quality at intake | target | missing |  | not implemented |
| `DELIV-007` | Sender evidence renewal without stopping live flows | target | partial | `tests/sender-verification/worker.spec.ts` · `tests/go-live/managed-mail.journeys.ts` | PARTIAL: lifecycle approval/hand-off, deadline skip and ordered resume hooks remain in concurrent writers’ lifecycle files; `sender-evidence-lapsed`/`sender-evidence-deadline` are named by the renewal read only, not installed dispatch hooks. Live welcome-flow history waits on FLOW-*. Home/public renewal and the existing minute Cron share the same durable claims. Automatic renewal/reminders require the confirming native operator authority; legacy or restored confirmations need a fresh diagnostic before outbound renewal resumes. Default ADOPTED: last confirmer and every Owner receive reminders, once per evidence period; renewal never confirms on their behalf; configured connector renews only from authenticated diagnostic results. No provider account was used. |
| `DELIV-008` | Sending connection an owner makes in Settings | target | partial | `tests/go-live/delivery.journeys.ts` · `tests/go-live/sending-connection-journey.ts` · `tests/audience-controls/sendgrid-forwarding.spec.ts` · `tests/portability.spec.ts` · `tests/go-live/resend-connection-journey.ts` | SendGrid and Resend installation-side connections are exercised against synthetic provider and mail network edges; no real provider call, account or consent was used. A fresh installation without deployment mail inputs, Free sign-in through the connection, `delivery-events-silent`, scheduled daily read-back, handoff-unknown key replacement, complete developer-route authority coverage and DELIV-002 domain creation through this connection remain unproved. Request-driven five-minute read-back names revoked keys and missing owned webhooks, fences approval, shows Home alerts and notifies current Owners/Admins; unknown mail handoffs are not replayed. Settings names the route in use and places the labelled developer route after the owner connection form. Developer-only deployment inputs retain their legacy transport authority; read-only operation without a Settings connection remains unbuilt. Restricted scope CRUD behavior is inferred from provider documentation, not real-provider evidence. Conservative disclosed-before-create Owner authorization, signed-or-delete, five-minute timestamp window and id-only ownership defaults are adopted; Default ADOPTED; sandbox proof pending. |
| `DELIV-009` | Sending-connection watch and replacement | target | partial | `tests/go-live/delivery.journeys.ts` · `tests/go-live/sending-connection-journey.ts` · `tests/audience-controls/sendgrid-forwarding.spec.ts` · `tests/portability.spec.ts` · `tests/go-live/resend-connection-journey.ts` | SendGrid and Resend installation-side connections are exercised against synthetic provider and mail network edges; no real provider call, account or consent was used. A fresh installation without deployment mail inputs, Free sign-in through the connection, `delivery-events-silent`, scheduled daily read-back, handoff-unknown key replacement, complete developer-route authority coverage and DELIV-002 domain creation through this connection remain unproved. Request-driven five-minute read-back names revoked keys and missing owned webhooks, fences approval, shows Home alerts and notifies current Owners/Admins; unknown mail handoffs are not replayed. Settings names the route in use and places the labelled developer route after the owner connection form. Developer-only deployment inputs retain their legacy transport authority; read-only operation without a Settings connection remains unbuilt. Restricted scope CRUD behavior is inferred from provider documentation, not real-provider evidence. Conservative disclosed-before-create Owner authorization, signed-or-delete, five-minute timestamp window and id-only ownership defaults are adopted; Default ADOPTED; sandbox proof pending. |
| `DELIV-010` | Signed delivery-event connection | target | partial | `tests/go-live/delivery.journeys.ts` · `tests/go-live/sending-connection-journey.ts` · `tests/audience-controls/sendgrid-forwarding.spec.ts` · `tests/portability.spec.ts` · `tests/go-live/resend-connection-journey.ts` | SendGrid and Resend installation-side connections are exercised against synthetic provider and mail network edges; no real provider call, account or consent was used. A fresh installation without deployment mail inputs, Free sign-in through the connection, `delivery-events-silent`, scheduled daily read-back, handoff-unknown key replacement, complete developer-route authority coverage and DELIV-002 domain creation through this connection remain unproved. Request-driven five-minute read-back names revoked keys and missing owned webhooks, fences approval, shows Home alerts and notifies current Owners/Admins; unknown mail handoffs are not replayed. Settings names the route in use and places the labelled developer route after the owner connection form. Developer-only deployment inputs retain their legacy transport authority; read-only operation without a Settings connection remains unbuilt. Restricted scope CRUD behavior is inferred from provider documentation, not real-provider evidence. Conservative disclosed-before-create Owner authorization, signed-or-delete, five-minute timestamp window and id-only ownership defaults are adopted; Default ADOPTED; sandbox proof pending. |
| `REPORT-001` | Overview dashboard | target | partial | `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/overview-journey.ts` | Default ADOPTED: holdout-measured incremental revenue says no holdout configured until EXP-003/004; flows and top flows say no flows yet. No forecast is presented as a result. Campaign attribution/engagement use the detailed performance table’s scheduled-step period; costs, growth and provider facts use occurrence days, with each basis disclosed. Flow and holdout acceptance remains open. |
| `REPORT-002` | Campaign and flow performance tables | target | partial | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/results.journeys.ts` | Campaign revision/channel tables, sorting, topic/channel/UTC date filters, matched CSV, optional open-rate estimates, per-link detail and net attributed revenue by currency are exercised. Gap: flow and flow-message performance awaits the flow engine. |
| `REPORT-003` | Attribution for campaigns, flows and SMS | target | partial | `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/cross-channel-attribution.ts` · `tests/campaign-results/custom-attribution.ts` · `tests/campaign-results/attribution-report-ui.ts` | Campaign and SMS attribution, window/metric edits, refunds, cancellations and immutable source records are asserted. Flow attribution and flow revenue reporting are not asserted by the old evidence; FLOW-001/FLOW-002 remain missing. |
| `REPORT-004` | Customer and retention analytics | target | partial | `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/retention-journey.ts` | Repeat-purchase rate, cohort retention, median order interval, value for one form and products bought together are asserted. Value grouped by acquisition source and the next-product-bought outcome have no assertion in the old evidence. |
| `REPORT-005` | List growth and consent sources | target | partial | `tests/go-live/list-growth.journeys.ts` · `src/core/features/insights/list-growth.ts` · `migrations/core/0074_list_growth_retained_history.sql` | Insights reconciles opening/net/closing subscribed membership by UTC day and separates captures/confirmations, opt-outs, suppression and removal, retaining source/version disclosures and anonymous counts after erasure. Real hosted and embedded form capture/confirmation journeys reconcile. Upgrade recovers retained pre-baseline consent captures/confirmations, explicitly labeled with zero inferred membership change; imported dates do not invent earlier local growth. Unavailable pre-baseline membership history is outside the amended history requirement; kiosk capture and confirmation are exercised by tests/go-live/shared-kiosk.journeys.ts. Hosted/kiosk public resubscribe confirmation and separate growth counts are exercised by tests/go-live/resubscribe.journeys.ts. Remaining: dedicated popup/landing-page attribution (FORM-002/004) and the full CONT-027 incentive/topic/flow and erasure-expiry acceptance. |
| `REPORT-006` | Scheduled and custom reports | target | partial | `tests/go-live/managed-mail.journeys.ts` · `tests/campaign-results/results.journeys.ts` · `tests/campaign-results/saved-report-metric-journey.ts` · `tests/sender-verification/worker.spec.ts` | PARTIAL: Slack requires an unavailable webhook; scheduling currently covers saved provider cost/units and campaign click/conversion/USD attribution reports plus the built-in cost and engagement reports, not every report family or dimension. Default ADOPTED: Owner/Admin only, existing active operator IDs only, email only, no contact identities or per-contact rows, no currency conversion; weekly Monday 09:00 UTC / monthly first-day 09:00 UTC. Delivery refusals and sends are durable/audited; authorization/input refusals intercepted by the existing shared middleware are not yet activity records. Restored or revoked native authority requires explicit enable; uncertain provider outcomes never automatically resend. |
| `REPORT-007` | Usage and cost transparency | target | partial | `tests/campaign-results/costs.journeys.ts` | Flow cost grouping waits on flows. Default ADOPTED: projected month is the priced month-to-date UTC run rate extended linearly; each reported currency stays separate with no conversion, and unpriced facts are counted rather than zero. |
| `INT-001` | Shopify | target | partial | `src/core/platform/adapters/shopify.ts` · `tests/shopify/connection.spec.ts` | acceptance not yet met: Done only once INT-015 is done. `tests/shopify/connection.spec.ts` (native sync, signed carts, signed pixel), run on a connection made through INT-015's install journey, plus a consent write-back journey: a Mango unsubscribe appears as unsubscribed in the Shopify edge's customer record; and the CONT-025 Shopify opt-in journey. |
| `INT-002` | WooCommerce | target | partial | `tests/go-live/woocommerce.journeys.ts` · `tests/go-live/woocommerce-plugin-journey.ts` · `extensions/mango-woocommerce/mango-woocommerce.php` · `extensions/mango-woocommerce/INSTALL.md` · `tests/audience-import/signup.spec.ts` | The cited edge and browser journeys assert owner connection, source synchronization, replay preservation, exact activated tag-and-exit flow, default-deny collection, explicit consent and GPC withdrawal, plus unchanged subscription evidence and confirmation. Gap: the cited evidence does not assert absence of cross-site observation throughout the plugin journey. No completion is carried for that unasserted privacy outcome. |
| `INT-003` | BigCommerce | target | missing |  | not implemented |
| `INT-004` | Stripe | target | partial | `tests/go-live/roles.journeys.ts` · `tests/portability.spec.ts` | Owner-only encrypted connection and signed once-only commerce event ingestion. Gap: required real-provider lifecycle proof cannot start as written: Stripe rejects metadata on a test clock (HTTP 400 parameter_unknown, metadata). No real lifecycle events or cleanup search proof claimed. FLOW-001/FLOW-002 inherit renewal-reminder enrolment without status changes. |
| `INT-005` | Square | target | missing |  | not implemented |
| `INT-006` | Stall and Orbit | target | missing |  | not implemented |
| `INT-007` | Events and profiles API | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `tests/go-live/custom-event-journey.ts` · `src/core/features/integrations/openapi.ts` · `src/core/features/integrations/client-source.ts` | The cited journeys assert profile properties, contact identity, event idempotency and key attribution, membership reads, consent refusal and independent per-key rate limits. Gap: the cited files do not assert integration-key attribution on contact/property/subscription writes or full public-description coverage for all named contact and membership operations; event-write scope and event attribution alone do not prove those outcomes. Website keys remain server-held behind an authenticated same-origin proxy; no automatic collection or consent inference is authorized. |
| `INT-008` | Outbound webhooks | target | missing |  | not implemented |
| `INT-009` | Zapier and Crank | target | missing |  | not implemented |
| `INT-010` | Segment | target | missing |  | not implemented |
| `INT-011` | CRM sync | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `docs/integrations.md` | Scoped subscriber sync and a cursor-paged refusal feed support a sibling CRM client. The Coffer client is supplied as a patch in the integration round, not landed in Coffer here. Full CRM field mapping UI and flow-created CRM tasks remain unmet. |
| `INT-012` | Ad audiences | target | missing |  | not implemented |
| `INT-013` | Web analytics tagging | target | partial | `tests/go-live/contact-links.journeys.ts` · `tests/go-live/domain-journey.ts` · `tests/campaign-results/performance.journeys.ts` · `tests/campaign-results/tracking-journey.ts` · `tests/campaign-results/custom-attribution.ts` · `tests/portability.spec.ts` | Static campaign defaults freeze into new drafts, preserve author values and managed/contact exclusions, and the scoped Vane conversion fixture is recorded. Gap: flow dimensions and INT-007’s general custom-event goal path remain unfinished; no real Vane or provider call is claimed. |
| `INT-014` | Reviews and loyalty apps | target | partial | `tests/go-live/sync-integrations.journeys.ts` · `tests/go-live/review-loyalty-journey.ts` · `tests/sender-verification/worker.spec.ts` | PARTIAL: Yotpo stays disabled with adapter_signature_protocol_unverified because its signing protocol could not be verified from this VM; Smile customer/updated supports profile/balance observations, not inferred points earned or tier transitions. Live provider payload confirmation remains open. Review-request flow conversion/exit waits on FLOW-*. Default ADOPTED: Owner/Admin under integration.manage, existing encrypted credential custody, no new contact/consent/send, unknown addresses counted without storage. No provider account was used. |
| `INT-015` | Shopify connection a merchant installs | target | missing | `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts` | The shared public-app connector and merchant-install route are not built. Existing developer-adapter sync and signed-event evidence do not prove merchant authorization, App Store start or provider scope admission. |
| `INT-016` | Shopify mandatory privacy intake | target | missing | `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts` | Mandatory privacy intake, durable acknowledgment and delayed post-uninstall redaction remain unbuilt; RL-106 requires protected residual routing rather than deleting reachability with live credentials. |
| `INT-017` | Shopify disconnection and reinstall | target | missing | `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts` | The connector disconnect, post-disconnect custody and reinstall journey are not built; retaining late mandatory routing is required by RL-106, not permission for live forwarding. |
| `INT-018` | Shopify connector trust and custody | target | missing | `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts` | The shared connector trust, routing isolation, custody, forwarding latency and recovery journey are not built. |
| `INT-019` | Shopify bulk first sync | target | missing | `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts` | The merchant-installed bulk first sync, restart, progress, two-hour capacity bar and pre-completion audience gate are not proved by existing developer-adapter fixtures. |
| `INT-020` | Shopify wiring and first-use work | target | missing | `src/core/features/store/shopify/health.ts` · `src/core/features/store/shopify/collector.ts` · `tests/shopify/connection.spec.ts` | The connector wiring, merchant-facing step state and installed-connection flow/code/consent journey are not built; developer-adapter checks alone do not prove them. |
| `MOVE-001` | From Mailchimp | target | partial | `src/core/features/move-in/archive-service.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: tests/move-in/archive.journeys.ts runs on synthetic exports, extended with checked-in Mailchimp-format fixtures for a saved segment with a campaign-activity condition, a classic automation, a granular_activity file, two overlapping audiences with conflicting statuses and a template with merge tags and a <style> block. Each fixture shows its expected lines in the reconciliation report (MOVE-007 to MOVE-011). The CONT-024 subscribed-file fixture and the MOVE-012 full-scale export run through the same journey. The same journey also runs on one real, owner-supplied Mailchimp export with its reconciliation report. |
| `MOVE-002` | From Klaviyo | target | partial | `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-csv-journey.ts` · `tests/go-live/source-api-journey.ts` · `tests/go-live/source-draft-journey.ts` | Owner/Admin one-time Klaviyo API read and CSV preset retain email source method/time, restrictive suppressions, properties, list/segment review snapshots, library templates and original-time order/engagement history. Unsupported conditions and abandoned-cart action steps are named in the report. tests/portability.spec.ts preserves these records on native restore. Gap: executable flows (FLOW-002/008), parallel-run sync (MOVE-013) and real-provider sandbox proof. Positive incumbent SMS remains held under CONT-024/A2P; missing row time or collection point never grants SMS consent. Snapshot membership grants no additional category consent.  The source outline is now also an inert saved FLOW-001 draft revision; source trigger/action execution is unavailable. |
| `MOVE-003` | From ActiveCampaign | target | partial | `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-csv-journey.ts` · `tests/go-live/source-api-journey.ts` · `tests/go-live/source-draft-journey.ts` | Owner/Admin one-time ActiveCampaign API read and CSV preset retain contacts, list membership as review topics, tags, custom fields, unsubscribes and bounces. The key is used only in bounded declared-host HTTPS reads and is not stored or logged. Automation names/statuses form a readable report outline; unavailable trigger/action definitions are named. Gap: executable automations (FLOW-002/008), parallel-run sync (MOVE-013) and real-provider sandbox proof. Review topics grant no additional category consent.  The source outline is now also an inert saved FLOW-001 draft revision; source trigger/action execution is unavailable. |
| `MOVE-004` | From Kit (ConvertKit) | target | partial | `docs/moving-in.md` · `tests/move-in/held.journeys.ts` | acceptance not yet met: The move-in journey's Kit-format synthetic files (docs/moving-in.md) keep every restrictive state, plus a sequence fixture becomes a draft sequence. |
| `MOVE-005` | From beehiiv, Omnisend and Customer.io | target | partial | `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-csv-journey.ts` · `tests/go-live/source-api-journey.ts` | beehiiv, Omnisend and Customer.io documented CSV presets retain source status, tiers, attributes and tags; explicit source attestation carries incumbent-held email evidence and reconciliation counts evidence kinds. Unsubscribed, bounced and suppressed rows remain restricted. Gap: API pulls and parallel-run sync (MOVE-013); real-provider export proof pending. Missing or unfamiliar subscription states remain non-subscribed. |
| `MOVE-006` | Reconciliation and cutover | target | partial | `src/core/features/move-in/archive-report.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: After a move-in, the report's counts reconcile to the files and contact table, and no campaign or flow is scheduled or live. The report counts consent per evidence kind (CONT-024) and names the attestation each relies on. The cutover checklist shows the parallel-run sync (MOVE-013), or the re-import advice for an export-only move-in, and Mark cutover complete ends the sync. The checklist names any template or live message still loading images from an incumbent host (MOVE-014). |
| `MOVE-016` | Move-in cutover checklist | target | partial | `src/core/features/move-in/archive-report.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: After a move-in, the report's counts reconcile to the files and contact table, and no campaign or flow is scheduled or live. The report counts consent per evidence kind (CONT-024) and names the attestation each relies on. The cutover checklist shows the parallel-run sync (MOVE-013), or the re-import advice for an export-only move-in, and Mark cutover complete ends the sync. The checklist names any template or live message still loading images from an incumbent host (MOVE-014). |
| `MOVE-007` | Mailchimp saved segments | target | missing |  | not implemented |
| `MOVE-008` | Mailchimp automations and Customer Journeys | target | missing |  | not implemented |
| `MOVE-017` | Customer Journey inventory and drafts | target | missing |  | not implemented |
| `MOVE-009` | Incumbent engagement history | target | partial | `tests/move-in/archive.journeys.ts` · `tests/move-in/hostile.journeys.ts` · `tests/portability.spec.ts` | Historical contact/time/campaign/link facts, imported/dropped reconciliation, dormancy distinctions and populated native result preservation are asserted. The cited evidence does not compare consent state and consent-evidence rows before and after the initial historical-event import; its after-import status snapshot cannot prove that import changes no consent. |
| `MOVE-010` | Several audiences | target | partial | `src/core/features/move-in/archive-service.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: A fixture has two audiences that share addresses: one address subscribed in A and unsubscribed in B, one cleaned in B, and one with a different first name in each. Each address becomes one contact. The first is subscribed to topic A and unsubscribed from topic B, the cleaned one is suppressed on email, and the first-name conflict is listed. The report counts each audience and their overlap. |
| `MOVE-011` | Incumbent template conversion | target | partial | `src/core/features/move-in/html-import.ts` · `tests/move-in/archive.journeys.ts` · `tests/go-live/content-checks.journeys.ts` · `tests/go-live/content-hosts.ts` · `tests/go-live/template-conversion.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-api-journey.ts` | Gap: Campaign bodies remain imported history copied into drafts rather than automatically becoming library templates. Only FNAME, Klaviyo first_name, UNSUB and LIST:ADDRESS/ADDRESSLINE map to existing rendering targets; LNAME, DATE, CURRENT_YEAR, ARCHIVE, UPDATE_PROFILE (CONT-016), arbitrary property mapping and unknown fields remain visible and block personalization approval. The conservative name fallback is there; per-owner fallback configuration is unproved. CSS supports simple element/class selectors and top-level 480px mobile font size, line height, padding and alignment; other selectors, media widths, nested rules and orientation/hiding mappings remain unproved. Source-body inherited styles, complete per-location dropped-block diagnostics, general same-hue nearest-shade correctness across all backgrounds, a dedicated per-recoloring builder undo control and complete ActiveCampaign/Kit template conversion remain unproved; Klaviyo coverage currently proves only its supported name tag. Oversized results retain measured size, limit and largest blocks in custody/reconciliation, but cannot yet open directly in the builder for trimming. Mailchimp-host images in converted templates are re-hosted through the MOVE-014 journey; the rest follows MOVE-014's Gap. Host use counts and campaign review actions are covered by the existing imported-host journey; one-step reconciliation allowance/audit and flow-message review remain unproved. Mailchimp blueprint is CC BY-SA 3.0; vendoring waits on an owner licence decision. |
| `MOVE-018` | Converted template styles and readability | target | partial | `src/core/features/move-in/html-import.ts` · `tests/move-in/archive.journeys.ts` · `tests/go-live/content-checks.journeys.ts` · `tests/go-live/content-hosts.ts` · `tests/go-live/template-conversion.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-api-journey.ts` | Gap: Campaign bodies remain imported history copied into drafts rather than automatically becoming library templates. Only FNAME, Klaviyo first_name, UNSUB and LIST:ADDRESS/ADDRESSLINE map to existing rendering targets; LNAME, DATE, CURRENT_YEAR, ARCHIVE, UPDATE_PROFILE (CONT-016), arbitrary property mapping and unknown fields remain visible and block personalization approval. The conservative name fallback is there; per-owner fallback configuration is unproved. CSS supports simple element/class selectors and top-level 480px mobile font size, line height, padding and alignment; other selectors, media widths, nested rules and orientation/hiding mappings remain unproved. Source-body inherited styles, complete per-location dropped-block diagnostics, general same-hue nearest-shade correctness across all backgrounds, a dedicated per-recoloring builder undo control and complete ActiveCampaign/Kit template conversion remain unproved; Klaviyo coverage currently proves only its supported name tag. Oversized results retain measured size, limit and largest blocks in custody/reconciliation, but cannot yet open directly in the builder for trimming. Mailchimp-host images in converted templates are re-hosted through the MOVE-014 journey; the rest follows MOVE-014's Gap. Host use counts and campaign review actions are covered by the existing imported-host journey; one-step reconciliation allowance/audit and flow-message review remain unproved. Mailchimp blueprint is CC BY-SA 3.0; vendoring waits on an owner licence decision. |
| `MOVE-019` | Held conversions and outside hosts | target | partial | `src/core/features/move-in/html-import.ts` · `tests/move-in/archive.journeys.ts` · `tests/go-live/content-checks.journeys.ts` · `tests/go-live/content-hosts.ts` · `tests/go-live/template-conversion.ts` · `tests/go-live/contact-links.journeys.ts` · `tests/go-live/source-api-journey.ts` | Gap: Campaign bodies remain imported history copied into drafts rather than automatically becoming library templates. Only FNAME, Klaviyo first_name, UNSUB and LIST:ADDRESS/ADDRESSLINE map to existing rendering targets; LNAME, DATE, CURRENT_YEAR, ARCHIVE, UPDATE_PROFILE (CONT-016), arbitrary property mapping and unknown fields remain visible and block personalization approval. The conservative name fallback is there; per-owner fallback configuration is unproved. CSS supports simple element/class selectors and top-level 480px mobile font size, line height, padding and alignment; other selectors, media widths, nested rules and orientation/hiding mappings remain unproved. Source-body inherited styles, complete per-location dropped-block diagnostics, general same-hue nearest-shade correctness across all backgrounds, a dedicated per-recoloring builder undo control and complete ActiveCampaign/Kit template conversion remain unproved; Klaviyo coverage currently proves only its supported name tag. Oversized results retain measured size, limit and largest blocks in custody/reconciliation, but cannot yet open directly in the builder for trimming. Mailchimp-host images in converted templates are re-hosted through the MOVE-014 journey; the rest follows MOVE-014's Gap. Host use counts and campaign review actions are covered by the existing imported-host journey; one-step reconciliation allowance/audit and flow-message review remain unproved. Mailchimp blueprint is CC BY-SA 3.0; vendoring waits on an owner licence decision. |
| `MOVE-012` | Move-in at the buyer's scale | target | partial | `src/core/features/move-in/archive-limits.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: A generated Mailchimp account export with 250,000 contacts across the subscribed, unsubscribed, non-subscribed and cleaned files and 52 weekly campaigns with granular_activity moves in through the journey. It is interrupted once by a forced worker restart during the activity import and resumes to completion with no re-upload. Its reconciliation report adds up per file, evidence kind and activity rows. A campaign to the whole subscribed audience then reaches review with an eligible count equal to an independent count over the generated files. The run records its wall time and peak memory. A generated API-pull fixture of the same size completes the same way. |
| `MOVE-020` | Full-size API move-in | target | partial | `src/core/features/move-in/archive-limits.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: A generated Mailchimp account export with 250,000 contacts across the subscribed, unsubscribed, non-subscribed and cleaned files and 52 weekly campaigns with granular_activity moves in through the journey. It is interrupted once by a forced worker restart during the activity import and resumes to completion with no re-upload. Its reconciliation report adds up per file, evidence kind and activity rows. A campaign to the whole subscribed audience then reaches review with an eligible count equal to an independent count over the generated files. The run records its wall time and peak memory. A generated API-pull fixture of the same size completes the same way. |
| `MOVE-021` | Move-in resumption and reconciliation | target | partial | `src/core/features/move-in/archive-limits.ts` · `tests/move-in/archive.journeys.ts` | acceptance not yet met: A generated Mailchimp account export with 250,000 contacts across the subscribed, unsubscribed, non-subscribed and cleaned files and 52 weekly campaigns with granular_activity moves in through the journey. It is interrupted once by a forced worker restart during the activity import and resumes to completion with no re-upload. Its reconciliation report adds up per file, evidence kind and activity rows. A campaign to the whole subscribed audience then reaches review with an eligible count equal to an independent count over the generated files. The run records its wall time and peak memory. A generated API-pull fixture of the same size completes the same way. |
| `MOVE-013` | Two-way sync during the parallel run | target | missing |  | not implemented |
| `MOVE-022` | Parallel-run verification and freshness | target | missing |  | not implemented |
| `MOVE-023` | Restriction writeback | target | missing |  | not implemented |
| `MOVE-024` | Export-only parallel-run custody | target | missing |  | not implemented |
| `MOVE-025` | End the parallel run | target | missing |  | not implemented |
| `MOVE-026` | Other-incumbent parallel sync | target | missing |  | not implemented |
| `MOVE-014` | Incumbent images brought home | target | partial | `tests/go-live/content-checks.journeys.ts` · `tests/go-live/template-conversion.ts` · `tests/go-live/incumbent-image-journey.ts` | Gap: The cutover checklist item and its block on Mark cutover complete (MOVE-006 checklist unbuilt; MOVE-013 owner-held), flow messages (FLOW-*), and every other incumbent's image hosts beyond the Mailchimp-host fixtures proved here remain unproved. Large galleries remain subject to the existing retained archive-data budget. Scheduled-campaign enumeration beyond the proved template and draft list remains unproved. |
| `MOVE-015` | Incumbent engagement history beyond the Mailchimp export | target | missing |  | not implemented |
| `MOBILE-001` | Responsive operator app | target | partial | `tests/newsletter-ui/representative-pages.journeys.ts` | acceptance not yet met: The representative-pages journey (tests/newsletter-ui/representative-pages.journeys.ts) extended to every operator page at 390 pixels with axe and overflow checks. |
| `MOBILE-002` | Native iOS and Android app | target | missing |  | not implemented |
| `PUB-001` | Web archive | target | partial | `tests/campaign-results/archive.journeys.ts` · `tests/audience-import/erasure.spec.ts` | Publication, index navigation, RSS, metadata, neutral personalization and removal of representative private/tracking values are asserted. The cited evidence checks absence of the unsubscribe template token, but does not assert that the actual unsubscribe anchor is absent from the public page. |
| `PUB-002` | Paid newsletters | target | partial | `tests/go-live/roles.journeys.ts` · `tests/go-live/stripe-journey.ts` · `tests/go-live/paid-tier-journey.ts` · `tests/portability.spec.ts` · `tests/local-start/retained-archive.journey.ts` | Sandbox proof pending: the acceptance's Stripe test-mode checkout needs a held restricted test key (rk_test_) for Mango's Owner connection; the held test keys are unrestricted (sk_test_), which the connection refuses by design. Stripe Tax's test-account state is ct's 23 October source read, not a live-provider receipt from this round. The Nectar rail is not connected (INT-004). Policy ruled by ct (22 October 20:05Z): payment never creates or widens consent; a paid topic needs the reader's own confirmed channel consent, opt-out and suppression win, and a payer without it is counted as paid, consent missing and never mailed. Paid membership follows a fresh Stripe read for checkout completed, customer.subscription.* including paused/resumed, invoice.payment_failed and invoice.paid: active/trialing is paid; past_due, unpaid, paused, incomplete, incomplete_expired and canceled leave; a later active/trialing read rejoins. Read-start time orders overlapping reads, never the event's created second; equally fresh conflicting reads leave the paid topic. Failed Stripe reads remove paid eligibility, move the source-authority fence, record a failed operation and return a retryable refusal; the same event can recover after a successful fresh read. Cancellation ends paid membership only, while consent withdrawal stops every send on the channel. Immediate-confirmation card methods only; delayed methods are not supported. Paid writes move the source-authority fence, including a change after the final recheck. Mango stores Stripe ids, states and Stripe-reported tax, never card data or funds. Payer signup/consent capture is PUB-005's separate obligation under ct's approved 23 October 04:38Z defaults; its implementation status is PUB-005's own row. No real provider call, store, account or consent was used. |
| `PUB-003` | Recommendations | target | missing |  | not implemented |
| `PUB-004` | Direct sponsorships | target | missing |  | not implemented |
| `PUB-005` | Paid signup page and payer consent | target | partial | `tests/go-live/roles.journeys.ts` · `tests/go-live/paid-signup-journey.ts` | Paid signup, provider return, recorded permission and one confirmation, own-confirmation paid-only delivery, opt-out/suppression and erasure are asserted. Unasserted: Only Owner-saved tier can be offered. |
| `PUB-006` | Paid-reader consent and restrictions | target | partial | `tests/go-live/roles.journeys.ts` · `tests/go-live/paid-signup-journey.ts` | Paid signup, provider return, recorded permission and one confirmation, own-confirmation paid-only delivery, opt-out/suppression and erasure are asserted. Unasserted: No free newsletters before confirmation. |
| `HEALTH-001` | Bounded dependency readiness | target | partial | `tests/production-entry.spec.ts` | Binding-edge health cases are exercised. Real elapsed workerd cancellation, actual Queue latency, hosted isolate behavior and the deploy probe are not established by those cases. |
| `MAIL-001` | Selected Managed service mail | target | partial | `tests/go-live/managed-mail.journeys.ts` | Configured Managed service-mail journeys exercise the selected relay. Full hosted revocation and service-availability acceptance remains unproved. |
| `SURFACE-001` | The marketing registry and conformance journey | target | missing |  | The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented. |
| `SURFACE-002` | Drafts and outside marketing exposure | target | missing |  | The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented. |
| `SURFACE-003` | Sending-provider setup classes | target | missing |  | The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented. |
| `SURFACE-004` | Marketing authority and irreversible privacy operations | target | missing |  | The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented. |
| `SURFACE-005` | Paid marketing and exact-revision commitments | target | missing |  | The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented. |
| `SURFACE-006` | Live marketing changes | target | missing |  | The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented. |
| `SURFACE-007` | Marketing records and reports | target | missing |  | The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented. |
| `SURFACE-008` | A stranger runs a seeded retention week | target | missing |  | The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented. |
| `SURFACE-009` | Specialist handoffs keep marketing context | target | missing |  | The Mango MCP adapter and the seed-specific company-policy conformance journey are not implemented. |
| `AGENT-001` | Retention-gap finder | push-further | partial | `src/core/features/proposals/forecast.ts` · `src/core/features/proposals/service.ts` | The existing proposal forecast and service provide store-grounded observations. Scheduled retention findings for both a missing post-purchase flow and a lapsed cohort, their cited queries and counts, and the installation-history revenue estimate remain unproved. |
| `AGENT-002` | Journey proposal with holdout and stop rules | push-further | missing |  | not implemented |
| `AGENT-003` | Outcome judge | push-further | missing |  | not implemented |
| `AGENT-004` | Lifecycle failure diagnosis and repair | push-further | partial | `src/core/features/store/synchronize.ts` · `src/core/features/lifecycle/provider-outages.ts` | Existing synchronization and provider-outage handling provide source recovery primitives. The six-hour agent diagnosis, affected-checkout listing, deduplicated relevant replay and company-policy decisions are not yet proved. |
| `AGENT-005` | Deliverability diagnostician | push-further | missing |  | not implemented |
| `AGENT-006` | Account audit | push-further | missing |  | not implemented |
| `AGENT-007` | Grounded content drafting | push-further | partial | `src/core/features/proposals/generation.ts` · `tests/proposals-decision/decision-routes.spec.ts` | Existing proposal generation has grounding and rejection checks. Abandoned-cart and flow-message drafting across all listed content fields, brand and measured-history inputs, and the agent registry’s policy-based send and activation paths remain unproved. |
| `AGENT-008` | Natural-language segments and questions | push-further | missing |  | not implemented |
| `AGENT-009` | Scheduled routines and editable memory | push-further | missing |  | not implemented |
| `AGENT-010` | Retention-routine authority and activity | push-further | partial | `tests/proposals-decision/decision-routes.spec.ts` | Existing proposal-route checks constrain generation. The complete policy-driven routine job matrix, grant-valued Activity filter, disabling the next scheduled run and owner-set routine budget remain unproved. |
| `AGENT-011` | Migration agent | push-further | missing |  | not implemented |
