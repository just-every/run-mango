# Mango rulings

### RL-1 — Installation Lobby and run-site landing

**Date:** 2026-10-12  
**Ruled by:** Owner  
**Governs:** HOME-001, HOME-002

The installed root is Base’s shared Lobby: Finish setup until the sender identity is saved, then Sign in. The newsletter landing belongs to the run site. The original clause records this as “owner decision, 12 October 2026”.

### RL-2 — Recipient-confirmed public resubscription

**Date:** 2026-10-19  
**Ruled by:** Owner  
**Governs:** CONT-005, CONT-009, CONT-027, CONT-028

- **CONT-005 public capture policy, as amended by CONT-027 (owner decision, 19 Oct 2026):** Public signup returns the same generic acknowledgment whether or not an address is suppressed. An already subscribed address receives no mail or new consent and is never downgraded. A previously unsubscribed person, including an address with a surviving unsubscribe or erasure hash, may supply new logged post-opt-out request evidence and receive a confirmation email sent to that address, at most three confirmations per destination address per UTC calendar day across public signup surfaces. Only that person's own affirmative POST from the confirmation email resubscribes them; submission, GET and HEAD do not. An exhausted allowance returns the same generic acknowledgment and sends no further confirmation. Nothing bypasses suppression: bounces, complaints, provider or operator suppressions and legal holds remain suppressed, including their surviving hashes, and receive no confirmation mail. Other explicit logged post-opt-out evidence through the ledger remains subject to confirmation and suppression resolution. The CONT-027 Status row records implementation of this approved rule.

- **CONT-005/009 concurrency:** Public eligibility, contact/profile changes, consent evidence, capture IP, history and pending status commit in one guarded D1 transaction. A destination barred by current consent, suppression or identity guards at that transaction causes no new consent writes. Under the approved CONT-027 rule, a surviving erasure hash with an unsubscribe or erasure reason may recreate an unsubscribed profile holding only new request evidence and send its confirmation email within the shared UTC-day allowance; only the person's own affirmative POST can subscribe it, with no history restored. A surviving suppression hash permits neither consent nor confirmation mail. Confirmation message preparation completes before a database-authoritative handoff check, and the adapter is invoked immediately after that check. Suppression, an opt-out later than the request evidence or confirmation committed before the check prevents handoff. A provider handoff already authorized and concurrently in progress cannot be recalled by a later database transition.

### RL-41 — Email presentation grammar tightened

**Date:** 2026-10-13  
**Ruled by:** owner  
**Governs:** MSG-009, MSG-012, MSG-016

The owner decision “Tighten the style rules” replaces modeled arbitrary layout with the narrower table-cell and outer-wrapper grammar. Saved styled markup is judged as parsed, with the contrast, geometry and exact-byte compatibility outcomes stated in the governing clauses. The full original grammar, replaced behavior, security argument, residuals and evidence are retained in docs/contract/mechanism.md. No status changes follow from this ruling.

### RL-42 — One email parser and preserved approval bytes

**Date:** 2026-10-13  
**Ruled by:** owner (owner-approved current-release policy)  
**Governs:** MSG-009, MSG-012, MSG-016, CAMP-003, CAMP-022

Approval, test send, delivery, preview, plain text and editor HTML mode read one parsed structure. New saves canonicalize the body; earlier approvals retain their exact bytes except the specifically refused parser-ambiguity families, and every old draft canonicalizes on its next save. Normalization does not repair a hiding declaration. The original source text, named compatibility cases, security consequences and dependency record are retained in docs/contract/mechanism.md. No status changes follow from this ruling.

### RL-81 — Generated mobile email presentation

**Date:** 2026-10-19  
**Ruled by:** Owner  
**Governs:** BUILD-010, BUILD-014, BUILD-013

The responsive block is generated from a closed vocabulary, never merged with authored text. Its absence loses no content. Mobile and desktop hiding are applied only by their generated rules; style-stripping clients show the content and preview names that fallback. The generated block is bounded and adds no author-controlled selector or remote load.

### RL-82 — Owner-authorized sending connection

**Date:** 2026-10-19  
**Ruled by:** Owner  
**Governs:** DELIV-008, DELIV-010, DELIV-009

Before provider creation, Settings discloses the account, webhook destination, event list, signing and unchanged settings. The Owner’s Connect action authorizes that exact connection. Signing is required or Mango removes its new webhook; ownership is by stored provider identifier, and restricted permissions and overbroad keys are named. Company policy determines the classes of an agent’s equivalent action.

### RL-83 — WooCommerce plugin semantic

**Date:** 2026-10-22  
**Ruled by:** ct  
**Governs:** INT-002

Ct approved the INT-002 semantic on 22 October 2026 at 20:20Z: store-admin enablement is off initially; only signed-in store customers; explicit analytics and marketing consent before the one Secure HttpOnly SameSite=Lax first-party cookie, expiring after 30 days; GPC records no observation and revokes pending eligibility; no cross-site tracking or subscription-consent widening; WordPress observations expire after 30 days. The allowlisted signup iframe uses Mango’s own confirmation. A saved tag-and-exit flow revision must be explicitly activated; it sends no marketing message. CONT-018 and FORM-008 retain their other acceptance obligations and statuses; FLOW clauses retain their graph/message obligations.

### RL-84 — Chosen catalog unavailable and deleted states

**Date:** 2026-10-25  
**Ruled by:** ct  
**Governs:** BUILD-011, BUILD-012

Ct’s 25 October 2026 23:46Z ruling retains deleted selections visibly, distinguishes unpublished and out-of-stock selections and includes them in the save bound. A catalog-unavailable save refusal names the current product and directs publication or removal, retains unsaved edits and remeasures after publication. An unavailable hand-off skips the recipient-step and never sends stale values.

### RL-3 — Bounded health readiness

**Date:** 2026-10-21  
**Ruled by:** ct and sd  
**Governs:** HEALTH-001

The recorded ct deadline ruling and sd outstanding-send decision replace BASE-OPS-001’s one-second response with a two-second response and a Queue observation reused for 60 seconds, with the two-outstanding-send exception. The complete replacement, security consequences, limits and evidence boundary are retained in docs/contract/health-readiness.md. This records the incumbent ruling without a status promotion.

### RL-4 — Managed transactional-mail exception

**Date:** 2026-10-28  
**Ruled by:** Owner (recorded Managed-mail direction; original direction undated)  
**Governs:** MAIL-001

The incumbent contract records the owner’s direction allowing the selected Managed relay for sign-in and subscription confirmation as a narrow BASE-DATA-005 exception. 28 October is the migration-record date; the original direction supplies no ruling date. Own-provider Free and Assisted installations retain independence. The full exception and its consequences are retained in docs/contract/managed-mail.md.

### RL-101 — CONT-025: Opt-in mode per form and source

**Date:** 2026-10-28  
**Ruled by:** ct  
**Governs:** CONT-025  
**Outcome:** adopt with rider

**Question:** May Owners and Admins configure manual-entry opt-in prospectively?

**Default proposed/adopted:** Double opt-in manual capture by default; Owner/Admin changes affect later captures and never upgrade existing contacts.

**Clause outcome:** Allow Owner/Admin-only prospective manual-entry mode configuration, with recorded per-channel permission and unchanged suppression, SMS-confirmation and incumbent-held evidence rules.

**Why:** Mailchimp supports configurable opt-in and gives Owners/Admins configuration authority. No common norm sets double opt-in on every channel: Mailchimp and Klaviyo defaults differ, so Mango keeps its protective explicit-consent default.

**Placement:** State mode authority once in CONT-025; CONT-026 cites it and CONT-024 attestation is unaffected.

**Sources:** [Mailchimp gives Owners and Admins account-wide configuration authority.](https://mailchimp.com/help/manage-user-levels-in-your-account/); [Mailchimp offers selectable opt-in modes for its signup forms.](https://mailchimp.com/help/set-signup-preferences/); [Klaviyo makes list and keyword opt-in configurable with SMS-specific exceptions.](https://help.klaviyo.com/hc/en-us/articles/115005251108).

**Main read:** `c85462b43ac4de1828da915177c30a62f238a4bf`, `CONTRACT.md:1057`. No status change; all unfinished acceptance and proof remain owed.

### RL-102 — CONT-026: Contact added by hand

**Date:** 2026-10-28  
**Ruled by:** ct  
**Governs:** CONT-026  
**Outcome:** adopt with rider

**Question:** Does the manual-contact capture point use CONT-025's Owner/Admin mode authority?

**Default proposed/adopted:** Manual operators record consent; only Owner/Admin configures future manual mode; SMS requires its own authenticated reply.

**Clause outcome:** Apply CONT-025's Owner/Admin prospective mode rule to manual entry, preserving operator-attributed evidence, suppression and separate authenticated SMS confirmation.

**Why:** This is the same authority decision as CONT-025, not a second consent model; Mailchimp distinguishes configuration authority and selectable opt-in.

**Placement:** Cite CONT-025 once from CONT-026; keep topic permissions, legacy evidence compatibility and signed-out refusal work explicit.

**Sources:** [Mailchimp gives Owners and Admins account-wide configuration authority.](https://mailchimp.com/help/manage-user-levels-in-your-account/); [Mailchimp offers selectable opt-in modes for its signup forms.](https://mailchimp.com/help/set-signup-preferences/); [Klaviyo makes list and keyword opt-in configurable with SMS-specific exceptions.](https://help.klaviyo.com/hc/en-us/articles/115005251108).

**Main read:** `c85462b43ac4de1828da915177c30a62f238a4bf`, `CONTRACT.md:1058`. No status change; all unfinished acceptance and proof remain owed.

### RL-103 — FORM-008: Signup intake capacity

**Date:** 2026-10-28  
**Ruled by:** ct  
**Governs:** FORM-008  
**Outcome:** adopt with rider

**Question:** May public signup capacity use separate accepted/refused/challenged pools with owner-controlled raises?

**Default proposed/adopted:** Published 1000/hour and 100/minute floors, separate bot pools, per-network and destination bounds, challenge defaults and next-window Owner raises.

**Clause outcome:** Keep the published legitimate-signup capacity and separated abuse budgets, enforce server-verified challenges and destination privacy, and permit only audited prospective Owner raises within the declared delivery ceiling.

**Why:** Mailchimp uses bot controls and throttling, but does not establish these exact numeric limits; no common norm exists for the proposed counters, so these are the seed's explicit capacity and abuse choices. Compared Mailchimp throttling/CAPTCHA with Klaviyo form bot prevention; neither publishes Mango's accepted-only counter design or numeric pool floors.

**Placement:** FORM-008 owns limits and challenge settings once; CONT-027 alone owns destination acknowledgment privacy. All missing form carriers and report proof remain owed.

**Sources:** [Mailchimp uses throttling and CAPTCHA against signup abuse.](https://mailchimp.com/help/about-fake-signups/); [Mailchimp gives Owners and Admins account-wide configuration authority.](https://mailchimp.com/help/manage-user-levels-in-your-account/); [Klaviyo enables bot prevention on signup forms.](https://help.klaviyo.com/hc/en-us/articles/360026474752).

**Main read:** `c85462b43ac4de1828da915177c30a62f238a4bf`, `CONTRACT.md:1142`. No status change; all unfinished acceptance and proof remain owed.

### RL-104 — FORM-010: Refused signups are never silent

**Date:** 2026-10-28  
**Ruled by:** ct  
**Governs:** FORM-010  
**Outcome:** replace

**Question:** Can the nearest Settings report replace the required per-form refusal report?

**Default proposed/adopted:** Use existing Settings while FORM-005 is unbuilt; seek a report-surface carve.

**Clause outcome:** Settings may expose refusal counts immediately, but FORM-005's per-form report, Home alert and activity summary remain required; no surface carve or scope reduction is approved.

**Why:** Mailchimp's form and reporting tools do not justify deleting a promised report because implementation is incomplete. The pending request is primarily an engineering dependency, not an unresolved privacy default.

**Placement:** Keep one refusal-report requirement in FORM-010, citing FORM-005; retain destination-private generic acknowledgments and address-independent 429 behavior.

**Sources:** [Mailchimp uses throttling and CAPTCHA against signup abuse.](https://mailchimp.com/help/about-fake-signups/).

**Main read:** `c85462b43ac4de1828da915177c30a62f238a4bf`, `CONTRACT.md:1144`. No status change; all unfinished acceptance and proof remain owed.

### RL-105 — INT-013: Web analytics tagging

**Date:** 2026-10-28  
**Ruled by:** ct  
**Governs:** INT-013  
**Outcome:** adopt with rider

**Question:** May new drafts freeze static UTM defaults while preserving author keys and excluding personal contact data?

**Default proposed/adopted:** source=mango, medium=channel, campaign=slug and content=revision, ordinary HTTP(S) only, author keys win, prior approvals unchanged.

**Clause outcome:** Freeze reviewed static campaign UTM parameters into new drafts, preserve existing author parameters and approved revisions, and exclude contact interpolation and managed/private links.

**Why:** Mailchimp lets authors enable Google Analytics tracking for a campaign and names the campaign in tracking. No common norm determines Mango's exact labels; the fixed product labels are local settings, not provider-matched identifiers.

**Placement:** INT-013 owns parameter defaults; preserve flow dimensions and the INT-007 custom-event API as unfinished scope.

**Sources:** [Mailchimp enables campaign-level Google Analytics link tracking.](https://mailchimp.com/help/integrate-google-analytics-with-mailchimp/).

**Main read:** `c85462b43ac4de1828da915177c30a62f238a4bf`, `CONTRACT.md:1222`. No status change; all unfinished acceptance and proof remain owed.

### RL-106 — INT-015: Shopify connection a merchant installs

**Date:** 2026-10-28  
**Ruled by:** ct  
**Governs:** INT-015  
**Outcome:** adopt with rider

**Question:** May the Shopify connector use per-install opt-in, verified OAuth/webhook routing and deletion on disconnect?

**Default proposed/adopted:** Owner/Admin connection, exact shop/state/HMAC, no default route, installation receipt before compliance acknowledgment and recreation of removed subscriptions.

**Clause outcome:** Use explicit installation-scoped Shopify authorization and verified shop-bound routing, acknowledge authenticated compliance intake only after durable receipt, and retain enough protected routing custody to complete late mandatory redaction after disconnect.

**Why:** Mailchimp's Shopify integration uses merchant connection; Shopify mandates authenticated compliance deliveries and sends shop/redact after uninstall. Immediate deletion of every routing fact must not make that later duty unreachable.

**Placement:** Keep connector trust in INT-015 once; delete live credentials on disconnect, keep only time-bounded routing needed for mandated redaction, and retain the full public-app and merchant-install target. Actual publication, pricing and spend remain owner-reserved actions, not approval required for this design.

**Sources:** [Mailchimp connects Shopify store data through an installed integration.](https://mailchimp.com/help/mailchimp-shopify-syncing/); [Shopify requires authenticated compliance webhooks, including delayed shop redaction.](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance).

**Main read:** `c85462b43ac4de1828da915177c30a62f238a4bf`, `CONTRACT.md:1224`. No status change; all unfinished acceptance and proof remain owed.

### RL-5 — Activity obligations follow their feature

**Date:** 2026-10-28 (migration record; original ruling date not recorded)

**Ruled by:** ct (incumbent “pattern 1” attribution)

**Governs:** OPER-007, FLOW-008, AGENT-010

FLOW-008 activation, pause and archive and AGENT-010 agent actions and agent-filter values inherit the Activity obligation in their own acceptance. Restore completion remains owed. This records the incumbent routing decision without changing a status.

### RL-6 — Sender renewal reminders and evidence

**Date:** 2026-10-28 (migration record; original decision undated)

**Ruled by:** Incumbent adopted default (original ruler not recorded)

**Governs:** DELIV-007

The last confirmer and every Owner receive reminders once per evidence period. Renewal never confirms on their behalf; a configured connector renews only from authenticated diagnostic results. This preserves the already adopted default; it does not supply the missing lifecycle or flow proof.

### RL-7 — Unavailable overview figures remain honest

**Date:** 2026-10-28 (migration record; original decision undated)

**Ruled by:** Incumbent adopted default (original ruler not recorded)

**Governs:** REPORT-001

Holdout-measured incremental revenue says no holdout configured until EXP-003/004; flows and top flows say no flows yet. No forecast is presented as a result. The period/accounting basis is retained in docs/contract/mechanism.md, and flow and holdout acceptance remain open.

### RL-8 — Scheduled report recipients and privacy

**Date:** 2026-10-28 (migration record; original decision undated)

**Ruled by:** Incumbent adopted default (original ruler not recorded)

**Governs:** REPORT-006

Owners/Admins only; existing active operator IDs only; email only; no contact identities or per-contact rows; no currency conversion. The weekly/monthly schedule and replay/authority mechanics are retained in docs/contract/mechanism.md. Slack and the unbuilt report families and dimensions remain owed.

### RL-9 — Projected cost accounting

**Date:** 2026-10-28 (migration record; original decision undated)

**Ruled by:** Incumbent adopted default (original ruler not recorded)

**Governs:** REPORT-007

Projected month is the priced month-to-date UTC run rate extended linearly. Each reported currency stays separate with no conversion, and unpriced facts are counted rather than zero. Flow cost grouping remains unfinished.

### RL-10 — Loyalty observation authority and data minimization

**Date:** 2026-10-28 (migration record; original decision undated)

**Ruled by:** Incumbent adopted default (original ruler not recorded)

**Governs:** INT-014

Owners/Admins use the existing integration-management authority and encrypted credential custody. Observations create no contact, consent or send; unknown addresses are counted without storage. Provider protocol and live payload confirmation remain owed. The mechanism is retained in docs/contract/mechanism.md.

### RL-11 — Payment never widens marketing consent

**Date:** 2026-10-22 20:05Z

**Ruled by:** ct

**Governs:** PUB-002

Payment never creates or widens consent. A paid topic needs the reader’s own confirmed channel consent; opt-out and suppression win. A payer without it is counted as paid, consent missing and never mailed. The fresh-read membership and event accounting mechanism is retained in docs/contract/mechanism.md.

### RL-12 — Payer capture remains its own obligation

**Date:** 2026-10-23 04:38Z

**Ruled by:** ct

**Governs:** PUB-002, PUB-005

Payer signup and consent capture is PUB-005’s separate obligation under the already approved defaults. Its implementation status belongs to PUB-005’s own row; payment connection work supplies no consent by itself. This migration records the incumbent clause association and makes no new ruling.
