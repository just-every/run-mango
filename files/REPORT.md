# sd-mango-c-f136-pc1 results

Candidate: 87b2c9dad5825c1840c0b3b03c830826c350e1ec on cloud/sd-mango-c-f136-pc1 in just-every/run-mango. Starting published head cc2d1f618b695ddc1e28306e8f9774f732a66a69 and both original confirmation-proof commits are preserved. CHECKS.json records the full integrated main SHA and command results.

CONT-042 remains PARTIAL. This continuation preserves and reruns the planner-selected hosted and kiosk allowance proof, fourth-request acknowledgment without mail or capture authority, and exact exhaustion counts. It repairs a reproduced authoring-test synchronization failure and changes no production behavior. Full plan: PLAN.md. Actual reconciliation: ALLOWANCE-RECONCILIATION.json. Exact-head test receipts: KIOSK-RUN.json and IMPORT-RUN.json.

Counts before and after: 21 DONE, 197 PARTIAL, 98 MISSING, 316 total. No builder edit to any Status, Gap, Evidence or acceptance sentence. Only CONT-042's scoped proof is affected; no next campaign clause was selected beyond this explicit continuation. No new test registration and no removal of an original assertion.

## Failure reproduction and repair

Original Verify 42484916479 failed campaigns job 128744971773, authoring job 128744971783 and dependent verify job 128747762986. Its reports shard, including the shared kiosk journey, passed.

Both exact shard commands ran on the original saved SHA with CI settings, Node 22.20.0, the configured two workers and Chromium at /usr/bin/chromium with --no-sandbox. Campaigns passed all four tests in 8.5 minutes. Authoring exited 1: its main member passed three tests and failed design import; its go-live member passed all four tests in 5.4 minutes. The unchanged design-import journey passed separately on main 7b95de610793d2dad6e17495da3e8f2e67e27418 in 1.1 minutes.

Reproduced failure at ./tests/campaign-authoring/design-import.spec.ts:78: expected the import alert to contain “Email is too large.” within 5000 ms; element not found. The actual screen still showed “Uploading images: 3 of 4” and disabled Importing. The first repair incorrectly awaited an HTTP response that oversized compilation never issues and timed out after 180000 ms. The final repair waits for the real form's aria-busy=false, within the existing bounded import-completion window, before the original refusal assertions. Compilation rejects oversized content locally after image hosting.

All original refusal, selected-file retention, no-save, successful-import, exact-byte, preview and approval assertions remain. No retry, skip or wider timeout was added to those assertions. Final import passed in 36147 ms; final registered shared kiosk passed in 93626 ms on the full candidate SHA.

VERIFY_REPRODUCED {"head":"cc2d1f618b695ddc1e28306e8f9774f732a66a69","job":128744971783,"command":"SHARD=authoring node scripts/verification/ci.mjs \"$SHARD\"","test":"tests/campaign-authoring/design-import.spec.ts# a 12ui LayerDoc imports as an unsaved draft body that passes every approval check at 1440px","exit":1,"failure":"Expected substring: Email is too large.; Timeout: 5000ms; Error: element(s) not found"}

VERIFY_REPRODUCED.json retains real nonzero exits and repair history. Actual command logs are included. TRANSPORT.md records empty successful failed-log reads and HTTP 403 artifact redirects; blocked downloads were not retried. No unavailable CI assertion content is inferred.

## Acceptance and runtime proof

Selected outcomes run through ./tests/go-live/shared-kiosk.journeys.ts, test “[FORM-009][CONT-005][CONT-027][CONT-042] shared signup clears each visitor and resubscribes only after their affirmative confirmation”. Its ./tests/go-live/resubscribe.flow.ts caller invokes ./tests/go-live/confirmation-allowance-journey.ts. The reports pack in ./scripts/verification/plan.mjs registers it in push Verify.

| Item | Public-door evidence | Result |
| --- | --- | --- |
| Acceptance 1, selected hosted and kiosk portion | Native unsubscribed imports; both alternating carrier orders; fresh disclosure reads and unique challenges; distinct networks; exact mail and durable counter reads. ./tests/go-live/confirmation-allowance-journey.ts:53–105, 123–130. | PASS locally. Other carriers omitted. |
| Acceptance 2, selected fourth-request portion | HTTP 202 with the same confirmation-required acknowledgment; no additional mail, contact or address change, capture metadata, consent, confirmation, admitted request or subscription. Expected refusal accounting and history remain. Same file:87–125. | PASS locally. Actual midnight reset omitted. |
| Acceptance 3 | Complete failed and uncertain handoff matrix and no automatic retry. | Unchanged; not newly proved. |
| Acceptance 4, selected exhaustion portion | Mail and counter sequences 1,2,3,3 in both orders; one durable counter per destination in the same UTC-day bucket. Same file:99–105, 115–126. | PASS locally. Next-day reconciliation omitted. |
| Fresh success control | A distinct destination receives one message, stays pending, then recipient POST confirms subscription without another message. Same file:132–145. | PASS locally. |
| Response states | Admitted and exhausted responses in both carrier orders at 1440 and 390; assertions at 1440. Same file:36–42, 95–96. | Eight final images retained. Earlier images were visually inspected; relevant signup and journey bytes are identical on final SHA. |

PROBE CONT-042 1: native unsubscribed imports followed by alternating public /subscribe POSTs from distinct networks in each carrier order -> three emails and one durable destination-day counter capped at three; both destinations remain unsubscribed.
PROBE CONT-042 2: fourth eligible submission with fresh disclosure and challenge -> identical HTTP 202 acknowledgment, unchanged protected capture state and email count; one expected daily-allowance refusal in the current carrier report and history.
PROBE CONT-042 4: exact mail reads before and after exhaustion in both orders -> mail and counter counts 1,2,3,3; a fresh destination receives and affirmatively confirms its sole message.

## DONE-RIDERS

This is a PARTIAL claim. The full clause's omitted outcomes prevent a DONE claim.

| Rider | Result | Evidence or limitation |
| --- | --- | --- |
| 1 | PARTIAL overall | Selected public-door outcomes pass; other carriers, actual midnight reset and complete failure matrix remain unproved. |
| 2 | PASS for selected scope | Seeded unsubscribed destinations, exhausted refusal with protected-state equality and a positive fresh-destination confirmation. Journey:53–145. |
| 3 | Exact-SHA CI recorded separately | Reports pack runs the registered journey on push Verify. Earlier-SHA green is not candidate green. |
| 4 | PASS locally | IMPORT-RUN.json and KIOSK-RUN.json bind focused passes to candidate. Final images retained; relevant bytes unchanged since visual inspection. |
| 5 | INSPECTED | CONT-042 derives from CONT-027 and states its allowance directly. No new inherited duty introduced. |
| 6 | PASS mechanically | Contract write and check succeeded; generated views restored from main. Candidate contract and generated-view diff from main is empty. |
| 7 | PASS | No acceptance change, rewrite, split or coverage-map edit. |
| 8 | PASS for selected scope | Exhaustion changes no capture authority; permitted recipient confirmation succeeds. Wider operator permission and revocation matrices unchanged. |
| 9 | INSPECTED boundary retained | Synthetic challenge and mail network edges only; no live provider, hosted, device, legal or erasure qualification claim. |
| 10 | NOT APPLICABLE | No new policy default adopted. Existing rulings unchanged. |
| 11 | Pending fleet landing | Main differs from candidate; complete publication scan and Run site remain fleet-owned. No landed or DONE count claim. |

Inherited duties under CONT-027 (incentive, topic, flow, expiry and history), CONT-041 (wider protected states) and CONT-043 (erasure, supersession and cleanup) remain unchanged and are not newly claimed. CONT-013's existing disposition and holds remain intact.

## Mechanical and pre-ready checks

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check, then restore main's generated views exit=0; ledger=none exit=0.

Typecheck, first-party command contract, offline Base integrity, source-lock freshness and whitespace checks pass. Source lock was regenerated after the last source edit and checked again immediately before push. Five candidate commits, including side parents, passed fleet identity and trailer audit. Candidate includes newest main at final fetch, retaining all newer judgments.

Pre-ready self-check: selected user-visible outcomes have public-door proof; no original assertion was removed, narrowed, skipped or put behind a width condition; production authority, erasure and replay paths are unchanged and no wider guarantee is claimed; existing response screens fit desktop and phone, use readable text and have no icon-only controls; generated views and source lock pass. Exact-SHA Verify is recorded in the CI receipt. Run site and publication scan are not claimed from cloud.

Publication scan: commit=87b2c9dad5825c1840c0b3b03c830826c350e1ec complete=NOT_RUN historyScanned=UNESTABLISHED findings=UNESTABLISHED. Guarded Mac lander must scan this full-history candidate, require COMPLETE with zero findings, require exact-SHA green Verify, land it and check Run site. Main equality=false. No default branch was pushed.

## Custody and remaining scope

Skip-CI merge save 01b4a3d333a36c348e93a0bd44ed8c374d7cfb17 was pushed first. Final product push succeeded at 87b2c9dad5825c1840c0b3b03c830826c350e1ec through the fleet guard. No PR was created: all-branch push Verify is this repository's entry point.

CLAIM CONT-042 PARTIAL points=1,2,4 tests=tests/go-live/shared-kiosk.journeys.ts#[FORM-009][CONT-005][CONT-027][CONT-042] shared signup clears each visitor and resubscribes only after their affirmative confirmation
GAP CONT-042: Other public carriers, actual midnight-UTC reset with unchanged guards, the complete failed or uncertain no-retry matrix and next-day reset reconciliation remain outside this planner-selected slice; carried duties and provider prerequisites are unchanged.

Evidence goes only to evidence/sd-mango-c-f136-pc1. Evidence transport establishes neither READY nor acceptance or landing.

## Exact-SHA CI observation

Verify run 42499768908, event push, head 87b2c9dad5825c1840c0b3b03c830826c350e1ec was observed in progress. The initial empty discovery was startup latency. Final status is retained in CI.json. Eight GitHub calls used; further observations respect the five-minute minimum cadence. No dispatch or rerun was requested.
