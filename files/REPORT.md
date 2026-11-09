# Mango CONT-022 blocking authority fix

Repository: just-every/run-mango
Branch: cloud/strategy-trial-13-sol-fix1
Builder base: 0abc479b711b24cdb695c937c06b58e16d26f82a
Scope: only blocking finding B from strategy-trial-13-sol-gate-1.

## Problem and implementation

An Owner could queue erasure, receive an Analyst product role, and retain destructive Queue authority because the bulk predicate accepted native Owner status independently of the overriding product role. The fix reuses Mango's canonical effectiveRole SQL expression and its operator projection join. Explicit product roles therefore take precedence over native-role fallbacks, as they do on authenticated API requests. Only an effective Owner or Admin may continue bulk work. Session identity, active status, operator version, revocation and expiry remain required.

The same predicate guards admission, Queue continuation, simple-page transactions and native erasure transactions. The change addresses the shared authority boundary without a new permission policy.

## Plan

The full plan is in PLAN.md. Read the public contract and existing authority model; extend the existing bulk journey through role and Queue doors; establish the regression; apply canonical effective-role authorization; run touched tests, typecheck and the first-party command check; integrate main preserving newer source judgments; regenerate views for validation and restore them; regenerate the source lock last; inspect all candidate identities and publish the product branch; obtain exact-SHA Verify provenance; publish only actual non-secret evidence to its separate ref.

## Regression coverage

The existing CONT-022 registration in tests/audience-controls/segments.spec.ts invokes bulkRouteJourney in tests/audience-controls/bulk.flow.ts. The added step creates a second operator, promotes that operator through PUT /api/operators/:id/role, queues erasure as the initiating Owner, and reassigns that Owner to Analyst through the same public role route. It verifies the initiator's effective role and API refusal, delivers the captured command through consumeLifecycleQueue, and requires a failed receipt with zero processed contacts. The remaining Owner reads the original contact unchanged. Queue replay must preserve it too. The journey retains successful erasure, its opt-outs, selection and consent assertions, frozen 5,000-contact processing, and anonymous, Analyst and revoked-session refusal.

This fix round adds no test registration. It extends the builder's existing CONT-022 registration. The merge retains both that registration and main's AUD-010 registration. No existing assertion was deleted, narrowed or put behind a condition.

## Limits and custody

This task does not land, deploy, open a PR, or perform the fleet's publication scan. The Mac fleet owns the complete publication scan and landing. No provider or legal result follows from these local fixtures. No screen implementation changes are needed for the authority fix; the existing clause journey records its screens at both required widths when it runs.

## Product provenance and checks so far

Product head: 3c38deab6226ae76bccc46f4b44726a051db6170. The guard published the named branch on its first attempt, and ls-remote confirmed that exact head. No PR was opened. Its merge parents are the pinned builder and current main 1fca3324a114f44d985b7f9d6f1596c612b687a1. Published ancestry was retained.

The one-off public-door probe fails with the original authority predicate: the downgraded initiator's command is acknowledged and its erasure job enters running state. With the fix, the same probe passes with a failed zero-progress receipt and unchanged contact after delivery and replay. Actual source, receipts and logs are included in this packet. The permanent regression lives in the original CONT-022 registration; the one-off file was removed from the checkout.

The initial full-journey baseline attempt hit its 600-second timeout before reaching the added regression. That is a timeout, not the targeted regression reproduction. The targeted reproduction is authority-before.log. The candidate's full registered journey passed: 1 passed (10.7m), including all public API steps, the browser actions and eight screenshots covering the clause's four outcome screens at 1440 and 390. No timeout or assertion was loosened.

Typecheck passed on the integrated source and test bytes. The first-party command check passed on the committed head. Contract generator write and check, source lock check and integration specification check all exit 0. Generated contract views match main; the fix changes no acceptance text or status cells. Both migrations were retained when regenerating the combined deployment specification. No new migration was written by this fix.

## Counts and clause custody

Current main and candidate both contain 316 status rows: 21 done, 197 partial, 98 missing. CONT-022 remains partial, exactly as main judges it; this fix authors zero status changes. The builder snapshot had 20 done, 198 partial, 98 missing and CONT-022 done. Those differences reflect retention of newer main judgments, not authored status changes from this fix. All 316 parent status identities are preserved.

The fix closes blocking finding B by enforcing the established effective Owner or Admin boundary on queued erasure. No acceptance point, gap wording or future policy was changed. No plan row outside CONT-022 was authored.

## Exact-SHA CI

Push Verify run 42643732011 completed successfully on exact head 3c38deab6226ae76bccc46f4b44726a051db6170. The discovery, three interval polls and final CI receipt are included. Four GitHub calls were used, with at least 300 seconds between status lookups. URL: https://github.com/just-every/run-mango/actions/runs/42643732011.

## Rider accounting for this fix

1. The existing registered journey covers the clause outcomes; this fix adds only the blocking unsafe-authority case. The registered journey passed locally; exact-SHA Verify outcome is recorded below.
2. The unsafe Queue case is exercised on real seeded D1 data and refused without data changes. The existing allowed erasure assertions are retained.
3. The regression is invoked by the push Verify through the original test registration. Exact-SHA run is named above.
4. Probe implementation bytes match the candidate's production predicate and regression sequence; no relevant source edit followed the product commit.
5. No inherited requirement text is changed or newly claimed.
6. Main's partial judgment and generated views are retained verbatim; the contract generator passes.
7. Acceptance wording is unchanged and all parent status rows remain present.
8. Role reassignment uses the public role route; queued erasure delivery and replay lose the former Owner's authority. The second Owner can inspect the failed receipt and unchanged contact.
9. No provider, legal or deployment proof is claimed.
10. This reuses existing effective-role grants; no policy default was adopted.
11. Landing and the complete publication scan are pending the fleet. No landing or DONE count is claimed by this report.


## Final local result

The full touched journey, typecheck and first-party command check pass. The original authority predicate fails the isolated public-door regression and the fixed predicate passes it. All local mechanical checks pass. Browser proof files and their hashes are listed in validation-receipt.json. No product source byte changed after commit 3c38deab6226ae76bccc46f4b44726a051db6170.

## Final claim and handoff

Blocking finding B is fixed. All four acceptance points remain exercised through the existing registered public-door journey, and its exact-SHA push Verify is green. The source Status stays partial as current main records it; the independent gate and fleet own any DONE status update and count change. No new acceptance wording, policy or scope is proposed.

CLAIM CONT-022 DONE points=1,2,3,4 tests=tests/audience-controls/segments.spec.ts#[CONT-022] find contacts and complete consent-safe durable bulk actions

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none, no migration authored by the fix; integration specification check exit=0.

PRE-READY: the original dangerous authority case fails before the fix and passes after it; supported erasure and the unsafe refusal both execute in the full touched journey; existing assertions remain; revoked sessions and replay remain covered; no screen implementation was changed; source lock and generator checks pass; exact-SHA Verify is completed and successful. Publication scan and landing remain with the fleet and are not claimed here. No product blocker remains.

READY branch=cloud/strategy-trial-13-sol-fix1 head=3c38deab6226ae76bccc46f4b44726a051db6170
