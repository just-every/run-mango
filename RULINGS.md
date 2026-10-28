# Mango rulings

### RL-1 — Installation Lobby and run-site landing

The installed root is Base’s shared Lobby: Finish setup until the sender identity is saved, then Sign in. The newsletter landing belongs to the run site. The original clause records this as “owner decision, 12 October 2026”.

### RL-2 — Recipient-confirmed public resubscription

- **CONT-005 public capture policy, as amended by CONT-027 (owner decision, 19 Oct 2026):** Public signup returns the same generic acknowledgment whether or not an address is suppressed. An already subscribed address receives no mail or new consent and is never downgraded. A previously unsubscribed person, including an address with a surviving unsubscribe or erasure hash, may supply new logged post-opt-out request evidence and receive a confirmation email sent to that address, at most three confirmations per destination address per UTC calendar day across public signup surfaces. Only that person's own affirmative POST from the confirmation email resubscribes them; submission, GET and HEAD do not. An exhausted allowance returns the same generic acknowledgment and sends no further confirmation. Nothing bypasses suppression: bounces, complaints, provider or operator suppressions and legal holds remain suppressed, including their surviving hashes, and receive no confirmation mail. Other explicit logged post-opt-out evidence through the ledger remains subject to confirmation and suppression resolution. The CONT-027 Status row records implementation of this approved rule.

- **CONT-005/009 concurrency:** Public eligibility, contact/profile changes, consent evidence, capture IP, history and pending status commit in one guarded D1 transaction. A destination barred by current consent, suppression or identity guards at that transaction causes no new consent writes. Under the approved CONT-027 rule, a surviving erasure hash with an unsubscribe or erasure reason may recreate an unsubscribed profile holding only new request evidence and send its confirmation email within the shared UTC-day allowance; only the person's own affirmative POST can subscribe it, with no history restored. A surviving suppression hash permits neither consent nor confirmation mail. Confirmation message preparation completes before a database-authoritative handoff check, and the adapter is invoked immediately after that check. Suppression, an opt-out later than the request evidence or confirmation committed before the check prevents handoff. A provider handoff already authorized and concurrently in progress cannot be recalled by a later database transition.

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
