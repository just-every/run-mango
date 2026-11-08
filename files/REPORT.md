# sd-mango-c-f144 report

Product: just-every/run-mango, branch cloud/sd-mango-c-f144.
Candidate: 80bc36a87109a3da22509aa422b30415de462dc6.
Starting continuation: 3ea2fb5227abbf479c7a190507b4199fba600993.
Integrated main: ad1a605639c006c0e002a53f8cebed6a104aeceb.
New save: 165cf8d41b2b51027e65dce524ea7473206ab4a6.
New final commit: 80bc36a87109a3da22509aa422b30415de462dc6.

CONT-042 stays PARTIAL. Counts before and after: 21 DONE, 197 PARTIAL, 98 MISSING (316 clauses). No Status, Gap or Evidence cell changed; no acceptance sentence changed. Plan row return: CONT-042 PARTIAL to PARTIAL, selected hosted and kiosk proof strengthened. No other campaign or plan row is advanced.

The supplied continuation already contained the selected journey, wired through tests/go-live/resubscribe.flow.ts into the existing registration in tests/go-live/shared-kiosk.journeys.ts. Production signup-admission.ts and signup-routes.ts already shared the durable destination key, returned the generic acknowledgment on exhaustion, and recorded refusal accounting and history. No production repair was indicated or made.

This round retains that proof and adds: unique fresh disclosures; exact admitted-request and confirmation evidence identity reconciliation; no Retry-After admission signal; the entire stored history comparison allowing exactly one expected refusal event; the entire outbox comparison on the fourth request; and a fresh-destination counter plus preservation of both exhausted budgets after the positive control. No assertion was removed, narrowed or gated by width. Zero new test registrations; the existing registered journey remains one test. Screens, marketing authority, erasure behavior, source pins and homepage content are unchanged.

The final native journey passes in 130581 ms. Native imports create two unsubscribed destinations with no initial confirmation mail. Each is submitted four times, once hosted first and once kiosk first, with fresh challenge tokens and disclosures and eight distinct networks. Per destination, observed mail counts are 0 -> 1 -> 2 -> 3 -> 3; one durable destination-day counter follows 1 -> 2 -> 3 -> 3. Each of the three reservations maps to exactly one consent confirmation and handoff claim. All original opt-outs survive; no affirmative confirmation is performed on those destinations. Their fourth requests both return HTTP 202 with the original generic acknowledgment, add no consent evidence, metadata, confirmation, handoff, signup request or subscription, and preserve all earlier history. Expected refusal totals increment once for kiosk and once for hosted. Whole-outbox counts remain 7 -> 7 and 10 -> 10 on the respective fourth requests. A fresh third destination receives one confirmation, stays pending until its public confirmation POST, becomes subscribed, and retains its own count of one without resetting either exhausted count of three.

Actual observations are in confirmation-allowance-receipt.json, bound to the candidate head. The recorded UTC day bucket is 20765. This is exhaustion evidence, not an actual midnight reset simulation. Browser clock control holds only the existing short acknowledgment long enough to capture it; it does not advance D1 time or claim next-day proof.

## Acceptance and inherited duty map

All line references below are in tests/go-live/confirmation-allowance-journey.ts at the candidate. The registered test is “[FORM-009][CONT-005][CONT-027][CONT-042] shared signup clears each visitor and resubscribes only after their affirmative confirmation”. It is invoked by the existing reports pack in scripts/verification/plan.mjs:25, under push Verify.

| Item | Result | Proof and boundary |
| --- | --- | --- |
| Acceptance 1, shared hosted and kiosk allowance across networks | PASS for selected portion | Lines 65-127 and 170-173: native unsubscribed import, both carrier orders, fresh disclosures and tokens, different networks, exact mails, one durable day counter and request-to-confirmation identities. Other promised carriers remain unproved. |
| Acceptance 2, fourth eligible request sends no confirmation and has the same acknowledgment | PASS for selected portion | Lines 105-117 and 140-161: identical HTTP 202 body, no Retry-After signal, no new outbox mail or capture authority, restrictive state retained, exact refusal accounting and history. Actual midnight reset and the complete unchanged-guards matrix remain unproved. |
| Acceptance 3, complete failed or uncertain handoff no-retry matrix | HELD | Not changed or newly claimed in this lease. Existing evidence remains unchanged. |
| Acceptance 4, exact email counts before and after exhaustion | PASS for selected portion | Lines 87-90, 118-127, 146-168 and 175-192: observed 0,1,2,3,3 counts, fourth no-mail, persisted reservation reconciliation and independent fresh success control. Next-day reset reconciliation remains unproved. |
| D-2 permission precedence, selected destination allowance flow | PASS for selected portion | Lines 71,117,134,145,159-172,184-190: imported opt-outs never become subscription authority, refusal adds no capture authority, fresh control requires recipient confirmation. Wider CONT-041 protection and CONT-043 erasure duties are not newly claimed. |

## DONE-RIDERS assessment

This is a PARTIAL claim, not a full-clause DONE claim.

| Row | Assessment | Evidence |
| --- | --- | --- |
| 1 | PARTIAL | Selected acceptance outcomes pass the native public-door journey; held carriers, midnight reset, failure matrix and next-day reconciliation are still open. |
| 2 | PASS selected portion | Real seeded unsubscribed destinations, actual mail edge observations, allowed first three requests, refused fourth, and positive fresh-destination confirmation. |
| 3 | PASS selected portion | Push Verify 42490866446 completed success on the exact candidate, including the existing reports registration. See ci-status.json. |
| 4 | PASS local candidate | Actual final receipt and screenshots are from 80bc36a87109a3da22509aa422b30415de462dc6, after the last source or test change. |
| 5 | INSPECTED | CONT-042 explicitly names D-2. No inherited duty was moved or newly asserted. |
| 6 | PASS mechanical, status unchanged | Exact-head contract write and check pass; generated files restored from main; no judgment cells changed. Lander owns any later evidence or count edits. |
| 7 | PASS | No acceptance or status rewrite; all carried obligations retained. |
| 8 | PASS selected portion | Exhausted destinations are refused without mail, capture authority or subscription effects; supported fresh destination succeeds through recipient confirmation. Wider protected-state combinations remain held. |
| 9 | PASS boundary | Synthetic HTTP mail and challenge edges only; no live provider, legal or device qualification claimed. |
| 10 | NOT APPLICABLE | No new custody, consent, spending or authority policy default. Existing clause semantics and rulings retained. |
| 11 | PENDING LANDER | Product is branch-only; publication scan, main equality and Run site remain fleet-owned. No landing or scan finding count is claimed. |

## Local validation and probes

- Inherited focused registered journey: 1 passed.
- Strengthened save focused registered journey: 1 passed.
- Final focused registered journey: 1 passed on the exact final candidate; see focused-journey.log and the actual reconciliation receipt. Command: MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm exec playwright test --config tests/go-live/playwright.config.js shared-kiosk.journeys.ts --reporter=list,json, under cloud_run and timeout 1200.
- pnpm run typecheck: exit 0; same final source bytes, see typecheck.log and local-checks.json.
- npx -y @runeditrun/rer check --profile first-party: exit 0, under cloud_run.
- Contract generation write: exit 0, zero changed documents; generator check: exit 0. Main generated views restored before commits.
- Source lock regenerated after the final edit and main integration; exact-head check: exit 0, ok true. See mechanical-receipt.json. No migration changed; ledger check not applicable.
- Existing response states recorded at 1440 and 390 on the exact candidate. Assertions execute at 1440. Eight selected screenshots and browser-inspection.json contain the browser proof.
- All candidate authors and committers, including side parents, were inspected before both pushes and use the fleet identity. Candidate messages contain no co-author trailers. No email-shaped literal was added in changed text. Added slash-like tokens reviewed: existing JSON MIME type and arithmetic division; real repository paths retain file extensions.

PROBE CONT-042 1: native import then public subscribe POSTs alternating hosted and kiosk from different networks -> three sent request rows, three confirmation handoff claims, three mails and one day counter per destination.
PROBE CONT-042 2: fourth public subscribe POST with fresh disclosure and challenge -> HTTP 202 generic acknowledgment, no new mail anywhere in the outbox, no new capture authority or subscription; exactly one expected refusal record.
PROBE CONT-042 4: read native mail edge observations and durable counters around exhaustion, then fresh public signup and affirmative confirmation -> 3 -> 3 mail and counter for both exhausted destinations, fresh destination one mail and subscribed, exhausted counters unchanged.
MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

## Pre-ready self-check

1. Selected outcomes have runtime assertions that fail if mail or reservations exceed the shared allowance, acknowledgment discloses exhaustion, captured authority changes on refusal, or the control cannot confirm. Full-clause outcomes remain explicitly partial.
2. No existing assertion was removed, narrowed or moved behind a conditional width. Stored-history checking is stronger than the supplied continuation.
3. No production authority, erasure or replay code changed. The imported opt-out and fourth-request refusal retain their states. Existing wider credential, erasure and replay suites remain registered; their full matrix is not newly claimed here.
4. No screen code changed. Existing response states are readable at both widths and introduce no icon-only interactive controls or configuration changes.
5. Local gates pass; source lock is fresh. Exact-SHA CI state is reported separately. Full-history publication scanning, main equality and Run site are reserved to the guarded lander. No COMPLETE scan or zero-finding receipt is invented.

## Carried gaps and plan return

GAP CONT-042: Popup, flyout, full-page and landing carrier proof; actual midnight UTC reset with unchanged guards; the complete failed or uncertain no-retry matrix; and next-day reset count reconciliation remain unproved under the supplied held remainder. Existing hosted-only prior-day evidence, CONT-027 integration, CONT-041 protected-state duties, CONT-043 erasure duties and all release and provider prerequisites remain unchanged. No erasure repair or additional CONT-013 fix is included.

No policy DEFAULT was adopted. No additional target or plan row is selected after this leased slice. Report and receipts are published only to the evidence ref, not product commits. No pull request is needed: this repository has a branch-push Verify entry point.

## CI and publication custody

Candidate Verify: https://github.com/just-every/run-mango/actions/runs/42490866446, event push, exact head 80bc36a87109a3da22509aa422b30415de462dc6. It completed with conclusion success at the final REST observation on 2026-11-08 at 14:54 UTC; no green result from a different head is substituted. The watcher uses one discovery and polls no more than once every 300 seconds. No PR or workflow dispatch was necessary.

Main equality: not claimed; the published product remains branch-only. Run site: not run for this branch; fleet-owned after landing. Publication scan: commit 80bc36a87109a3da22509aa422b30415de462dc6, complete=not-run-in-cloud, historyScanned=not-run-in-cloud, findings=not-established. Full Git history is present and candidate origin custody is verified in product-custody.json. The cloud adaptation reserves scanning and landing to the fleet.

## Prior CI diagnostic

Prior Verify 42487666893 at continuation head 3ea2fb5227abbf479c7a190507b4199fba600993 failed job 128753337741, shards (campaigns). The failed assertion was the native approval in tests/go-live/email-size.flow.ts:79, reached by presend-checks.journeys.ts. CI reported a message.links.resolved blocker: “Link host shop.example.test could not be resolved and checked.” Expected HTTP 200, received 409. The job log archive was read once with gh run view; the sanitized failure extract is in prior-ci-failure.txt.

Before changing that area, the exact failed shard command was run at the failed SHA in a detached worktree on this cloud VM: all four tests passed (483715 ms for the go-live stage). The same failing test also passed on current main ad1a605639c006c0e002a53f8cebed6a104aeceb on the same cloud VM. No source or test repair was attempted, no assertion was weakened, and no workflow rerun was requested. These comparisons use Node 24.19.0; the original CI runner uses Node 22.20.0, so they are honestly cloud reproductions rather than proof of identical hosted-runner conditions. Actual commands and exits are in prior-reproduction.json with both logs. A separate final-candidate focused run uses the already installed pinned Node 22.20.0 to close that local runtime difference for the changed journey.

Pinned-runtime completion: the exact candidate focused registration also passes on Node 22.20.0 with pnpm 10.12.4. The subsequent typecheck exits 0. Actual receipts: pinned-confirmation-allowance-receipt.json, pinned-focused-journey.log and pinned-typecheck.log. This run repeats all eight cross-carrier submissions and the fresh confirmation control without any source change.

CLAIM CONT-042 PARTIAL points=1,2,4 tests=tests/go-live/shared-kiosk.journeys.ts#[FORM-009][CONT-005][CONT-027][CONT-042] shared signup clears each visitor and resubscribes only after their affirmative confirmation

The points above identify only the leased portions; the full acceptance sentences retain their stated gaps. Rider 1 remains partial and rider 11 is reserved to landing; local selected-outcome proof passes.

Final CI receipt: Verify 42490866446, event push, status completed, conclusion success, head 80bc36a87109a3da22509aa422b30415de462dc6. Seven GitHub calls were used in total: three for the prior failure and four for candidate discovery and spaced observations. No workflow was dispatched or rerun. The initial 27-file evidence packet was round-trip verified against its manifest before this CI refresh; the final evidence head is reported separately in the terminal EVIDENCE line. Product READY custody is independent of evidence transport and does not claim landing.
