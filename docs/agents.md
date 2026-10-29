# Agents in Mango

Mango has one MCP endpoint at /mcp. Discovery describes the marketer tools, their scopes and action classes. It supports the 2026-07-28 and 2025-11-25 protocols. Protected-resource metadata is at /.well-known/oauth-protected-resource/mcp.

An agent acts for a current native person. Business supplies signed settings with the owner's Business ID and teammate IDs; those IDs bind to native accounts. A token's email address does not select an account. Current product roles and contact visibility still apply. A Business editor cannot perform an Owner-only connection or erasure operation.

## Company policy and people

The company chooses autonomous, review, approval or blocked dispositions. Unanswered or expired policy refuses work. Open /agents to see policy status, recorded activity, reviews, approvals and Pause. Agent credentials cannot save policy, approve their own requests or impersonate a person.

An approval binds the policy revision and server summary. People review the exact saved action, recipients and content. Changed evidence refuses execution. Manual single opt-in does not turn an agent assertion into recipient permission: that case requires a native consent proof and refuses through MCP. Confirmed opt-in keeps its recipient confirmation. Native consent, suppression, dormancy, frequency, sender evidence, immutable revisions and provider admission remain required.

Agent activity names the agent and sponsoring person. A campaign's agent authorization is separate from a person's approval. Queued work retains the original sponsor ID, agent, scopes and consent, and asks the door again before executing. Pause or revoked authority stops the next admission. A provider handoff already in progress cannot be recalled.

## Native jobs and scopes

These tools call Mango's existing native services. An optional provider or job may be unavailable on an installation. Listing a tool neither supplies its provider account nor overrides its native checks.

- **Access**: mango.access.read, mango.access.update.
- **Activity**: mango.activity.read.
- **Assets**: mango.assets.attach.
- **Audience**: mango.audience.read.
- **Blocks**: mango.blocks.create, mango.blocks.detach, mango.blocks.place, mango.blocks.read, mango.blocks.update.
- **Campaigns**: mango.campaigns.authorize, mango.campaigns.cancel, mango.campaigns.check, mango.campaigns.create, mango.campaigns.duplicate, mango.campaigns.edit_schedule, mango.campaigns.enqueue, mango.campaigns.followup, mango.campaigns.list, mango.campaigns.pause, mango.campaigns.read, mango.campaigns.reauthorize, mango.campaigns.refresh_checks, mango.campaigns.resume, mango.campaigns.test_send, mango.campaigns.update.
- **Connections**: mango.connections.read, mango.connections.update.
- **Consent worker**: mango.consent.dispatch.
- **Integrations**: mango.integrations.contacts, mango.integrations.events, mango.integrations.memberships, mango.integrations.segments.
- **Contacts**: mango.contacts.consent, mango.contacts.erase, mango.contacts.merge, mango.contacts.optout, mango.contacts.read.
- **Delivery**: mango.delivery.dispatch.
- **Designs**: mango.designs.advance, mango.designs.choose, mango.designs.close, mango.designs.read, mango.designs.start.
- **Events**: mango.events.list.
- **Flows**: mango.flows.activate, mango.flows.create, mango.flows.enroll, mango.flows.pause, mango.flows.read, mango.flows.update.
- **Proposals**: mango.proposals.adopt, mango.proposals.dismiss, mango.proposals.generate, mango.proposals.read.
- **Publications**: mango.publications.publish, mango.publications.withdraw.
- **Reports**: mango.reports.dispatch, mango.reports.policy, mango.reports.read, mango.reports.schedule.
- **Segments**: mango.segments.create, mango.segments.delete, mango.segments.read, mango.segments.update.
- **Sender**: mango.sender.read, mango.sender.verify.
- **Signup**: mango.signup.read, mango.signup.update.
- **Store**: mango.store.advance, mango.store.read, mango.store.sync.
- **Templates**: mango.templates.read, mango.templates.start, mango.templates.update.
- **Witness**: mango.witness.read.

Primary records are read through classified resources. Campaigns include saved revisions, review and results; other resources cover contacts, segments, designs, stored sender evidence, import reports, supported flow state and native activity. Missing and restricted records are withheld alike. Imported and external text remains untrusted. Resources expose no signing keys, provider credentials or receipt tokens.

Existing integration credentials retain their original scopes and their creating sponsor. Read credentials cannot authorize a campaign. Private integration reads also enter company policy and retain native pagination and contact visibility. SDK intake and signed source events retain their credential purpose. The integration send operation still requires the exact natively authorized revision and matching integration segment, then enters company policy through the shared door. Import, public signup/unsubscribe, signed provider callbacks and installation operations retain their own admission.

## Limits

Generic flow graphs are drafts. The supported WooCommerce starter only tags an eligible contact and exits; it sends no messages. Mango does not gain a general flow sender, advertising engine, payment executor or autonomous category-wide optimizer through MCP.

Design generation and conversion require the configured provider. They retain real artifacts and do not approve, schedule or send a newsletter. Provider charges alone are not money moved. Company spend caps are not enforced by this door; native quotas and provider uncertainty still apply. An uncertain marketing handoff is not blindly resent.

## Verification

The agent-surface.json declaration is generated from the runtime registry with node scripts/agent-surface.mjs; --check verifies parity. It declares the read-only native witness and conformance journey. Pending assertions remain explicit failures rather than accepted coverage. The native verification hook checks a paid design artifact and its saved, unscheduled custody. Full tool/class coverage, specialist delivery/archive probes and the shared CLI conformance round are required before this adoption is accepted.

The 0.2.88 verifier declares fresh native intake and API clients for each policy phase. The four integration read tools use those clients with their original read scopes and native sender identity; source intake does not grant recipient permission. The existing native door test also verifies fresh contact/client identities across phases. Its journey asserts server classes and facts for native public-signup evidence, contact merge/opt-out, image storage, signup origin narrowing and protective-setting changes and operator report schedules. These fixtures use native production APIs and Miniflare D1, R2 and Queue bindings.

The runtime source pin is recorded separately from the installed CLI pin. A runtime copy does not prove that an older CLI runs the matching conformance harness.

Agent contact erasure is not accepted by this adoption. A native disposable probe starts erasure, then the privacy write fence rejects the shared door audit write and the request returns HTTP 500. The existing fence stays in force; retained agent request, approval and audit data need a native erasure custody decision before this path can be accepted. The complete conformance journey remains a required gate.
