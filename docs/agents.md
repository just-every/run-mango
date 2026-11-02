# Agents in Mango

Mango has one MCP endpoint at /mcp. This adoption declares the mandatory tools, policy, pause, audit and idempotency capabilities. Events, resources, prompts and subscriptions are not publicly offered by this candidate; discovery omits them and direct requests return capability_not_declared. Internal resource and event adapters remain for native audit and visibility. Discovery describes the marketer tools, their scopes and action classes. It supports the 2026-07-28 and 2025-11-25 protocols. Protected-resource metadata is at /.well-known/oauth-protected-resource/mcp.

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

The retained internal resource adapters cover classified primary records. Public MCP resource reads are not declared by this candidate. Campaigns include saved revisions, review and results; other resources cover contacts, segments, designs, stored sender evidence, import reports, supported flow state and native activity. Missing and restricted records are withheld alike. Imported and external text remains untrusted. Resources expose no signing keys, provider credentials or receipt tokens.

Existing integration credentials retain their original scopes and their creating sponsor. Read credentials cannot authorize a campaign. Private integration reads also enter company policy and retain native pagination and contact visibility. SDK intake and signed source events retain their credential purpose. The integration send operation still requires the exact natively authorized revision and matching integration segment, then enters company policy through the shared door. Import, public signup/unsubscribe, signed provider callbacks and installation operations retain their own admission.

## Limits

Generic flow graphs are drafts. The supported WooCommerce starter only tags an eligible contact and exits; it sends no messages. Mango does not gain a general flow sender, advertising engine, payment executor or autonomous category-wide optimizer through MCP.

Design generation and conversion require the configured provider. They retain real artifacts and do not approve, schedule or send a newsletter. Provider charges alone are not money moved. Company spend caps are not enforced by this door; native quotas and provider uncertainty still apply. An uncertain marketing handoff is not blindly resent.

## Verification

The agent-surface.json declaration is generated from the runtime registry with node scripts/agent-surface.mjs; --check verifies parity. It declares the read-only native witness and conformance journey. Pending assertions remain explicit failures rather than accepted coverage. The native journey covers enqueue, follow-up, delivery and report dispatch, and reauthorization of the same frozen native revision. Native erasure uses the contact service's existing authorization, receipt, write guards and portability floor. It removes personal door payloads in that transaction and returns the value-free `subject_erased` result. This adoption remains subject to the independent door gate and its exact candidate conformance evidence; it promotes no product clause or release claim. The released verifier's native-continuation audit rejects the runtime's supported `replayed` outcome; `tests/agent-door/pending.json` identifies that Base blocker without skipping assertions.

The 0.2.96 verifier declares fresh native intake and API clients for each policy phase. The four integration read tools use those clients with their original read scopes and native sender identity; source intake does not grant recipient permission. The existing native door test also verifies fresh contact/client identities across phases.

The runtime source pin is recorded separately from the installed CLI pin. A runtime copy does not prove that an older CLI runs the matching conformance harness.


## Native custody and runtime provenance

The complete agent-door and Business-settings source is copied from Base commit `8b925fa5ffaa577df9f2e4ebab6ede8af5155baa`; `base-copies.json` records the exact bytes and the declared archive authoring path. The CLI is pinned to 0.2.96, and the source-lock toolchain in `scripts/edition-authoring` carries the same release's bytes, so the vendored and installed lock checks agree. Other recorded Base copies retain their pins and native adaptations; portability's bookkeeping inventory adopts the matching private replay-alias exclusion.

Migration 0109 follows the recovered 0104–0108 ledger, preserving the report-claim recovery in 0108 and all applied bodies. It adds agent tombstones, nullable call expiry with completed calls backfilled from their original creation time, replay aliases and their expiry/deletion index and trigger, the decision relay, and a trusted link from the native erasure receipt to its originating door operation. Existing earlier call expiry is never extended. Idle Cron cleanup uses the same fixed Base replay window and stays paused during restore maintenance.

The native contact artifact map inventories all ten installed door tables and every column. Calls, approvals, reviews, audit, events and open-text usage facts lose subject payloads and confirming digests; value-free outcome, role and time evidence remains. Non-person agents, independently serving native operators and installation policy have their separate authority. The sole legacy-key association is an installation-private HMAC under the existing session setting, expiring with the original call. Aliases and relay rows are excluded from native archives, and imported rows are refused. Business-held projections are external custody, removed through tombstone pulls and the relay's authority, stop and unreachable rules.

Native effects retain the request's original erasure generation. An initiating erasure can finish only its own guarded SQL no-ops against already tombstoned artifacts, with the receipt and exact operation checked in the same batch. The native journal owns its erasure transactions; no whole agent-table write exception is enabled. Pending native work that contains an erased subject is held rather than converted into person-originated work.

Queued agent work retains its originating sponsor, agent, consent, client, scopes, operation and public key. Native-only continuation tools resolve their item from persisted queue state and run the same services under current policy and native authority; they are absent from MCP discovery and calls. Each delivered step, such as a design run's draft or layout pass, is its own item: its custody operation, its arguments and the native progress it finds. A different step therefore never reuses an earlier step's once-only claim, and the same step delivered again at the same progress replays. Older saved work without an admission snapshot requires fresh preparation. Business people resolve through the durable native mapping, and stopped or detached Business authority cannot execute held or queued work. Native owner sessions and independent local clients retain their native controls. Missing owner-claim bindings supply `trust: null`.

The pre-auth decision-pull route uses the same door and signature checks. Its migration and map are shipped together; the relay remains dark until an authorized Business requests it. No provider, platform or production change is part of this adoption.
