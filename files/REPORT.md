# sd-mango-c-f145 report

Product repository: just-every/run-mango.
Branch: cloud/sd-mango-c-f145.
Candidate: 0b62989e1eed326d17f14a71f9e7a8a60da9a1a7.

Current CI state: Verify 42493957794 completed with failure. Reports job 128772486262, which loads the CONT-042 journey, succeeded. The unrelated campaigns job 128772486199 failed. No READY is claimed while that result is unresolved.
Base main at final integration: 7b95de610793d2dad6e17495da3e8f2e67e27418.
Product push succeeded on its first attempt. No PR is required: the existing push workflow accepts this branch. No default branch was pushed or rewritten.

CONT-042 remains PARTIAL. The selected portions of acceptances 1, 2 and 4 are proved; no acceptance sentence is claimed complete beyond this selected scope. Counts before and after: 21 DONE, 197 PARTIAL, 98 MISSING. No contract row, requirement, Gap, Evidence cell, summary count, generated view or homepage source was changed. The plan row to reconcile is CONT-042 only; no Mac plan file was edited. PLAN.md records the complete execution plan.

## Result

The required continuation already contained the cross-carrier journey. This branch retains it and strengthens its ledger readback: every accepted request must add exactly one reservation, existing reservations remain unchanged, and other destinations' counters cannot change. Complete request and counter ledgers are inspected in addition to destination-linked evidence, so an orphan request cannot be hidden by a consent join.

Native imported unsubscribed destinations are exercised in both hosted-first and kiosk-first orders. Each of their four requests uses a fresh disclosure, fresh verified challenge and different network. Three requests produce exactly three independent confirmation messages, three pending confirmation records, three handoff claims and one durable destination-day counter at three. Both contact-level and address-level status remain unsubscribed. The fourth request returns HTTP 202 with the identical generic acknowledgment and no Retry-After; it adds no message anywhere in the mail outbox, no reservation, consent, capture metadata, confirmation or subscription. The expected refusal history and per-carrier daily-allowance count each increase once. A new destination still receives one confirmation, starts pending, becomes subscribed only after affirmative confirmation and leaves both exhausted destination counters unchanged.

No production change was necessary: the existing shared admission and signup route satisfy the selected behavior. The focused addition runs through resubscribe.flow.ts in the existing shared-kiosk.journeys.ts registration and the existing reports Verify pack. No test registration was added, removed, skipped or narrowed.

## Proof map and frozen rubric

All rows below use the registered test in tests/go-live/shared-kiosk.journeys.ts, line 5: “[FORM-009][CONT-005][CONT-027][CONT-042] shared signup clears each visitor and resubscribes only after their affirmative confirmation”. The caller is tests/go-live/resubscribe.flow.ts, line 154; the detailed journey is tests/go-live/confirmation-allowance-journey.ts. Each row is bound to candidate 0b62989e1eed326d17f14a71f9e7a8a60da9a1a7. Exact-candidate runtime outcomes are retained in BROWSER-RECEIPT.json and confirmation-allowance-reconciliation.json.

| Row | Clause sentence or selected duty | Public door and evidence | Result |
| --- | --- | --- | --- |
| R1 | Acceptance 1: shared hosted and kiosk limit across networks | Native import preview, apply and resume; browser POST /subscribe in both orders; native contact and complete ledger readback. Journey lines 69–145 independently reconcile messages, request identities, confirmation identities, handoffs and the single UTC-day counter. | PASS for the selected hosted and kiosk portion; popup, flyout, full-page and landing carriers remain unproved. |
| R2 | Acceptance 2: fourth request sends no confirmation and has the same acknowledgment | Browser POST /subscribe, lines 109–168: identical HTTP 202 body and no Retry-After; unchanged complete outbox, request ledger, destination counters, contact, address, consent and confirmation records. Only the expected refusal history and operator-visible accounting change. | PASS for fourth-request portion; real midnight reset remains unproved. |
| R3 | Acceptance 3: uncertain or failed handoff has no automatic retry | No new failure-edge execution is claimed. Existing hosted-only restart and prior-day evidence remain unchanged. | NOT PROVED for the full failure and uncertainty matrix; held remainder. |
| R4 | Acceptance 4: cross-carrier exact email counts before and after exhaustion and next-day reset | Journey lines 93–95, 122–125, 157–159 and receipt lines 173–180 record each before and after count; fresh control lines 187–203 subscribes only after confirmation and preserves exhausted counters. | PASS for exhaustion counts; next-day reconciliation remains unproved. |
| R5 | Destination privacy and refusal-history preservation inherited from CONT-041, without broadening its proof | Same acknowledgment, no Retry-After, no extra mail, exact expected refusal history and report deltas; lines 109–168. | PASS for selected allowance exhaustion only. The broader protected-state matrix is unchanged. |
| R6 | Recipient confirmation authority inherited from CONT-027, without broadening its proof | Unsubscribed remains unchanged during all eight allowance requests; confirmations stay unconfirmed. Fresh control subscribes only after affirmative confirmation; lines 121, 172, 183–203. Existing caller also retains load and replay refusals. | PASS for selected behavior only. Incentive, topic, flow, expiry and erasure obligations remain unchanged. |

PROBE CONT-042 1: native unsubscribed imports followed by alternating hosted and kiosk POST /subscribe on different networks -> three mails, three pending confirmations and one counter at three per destination in both carrier orders.
PROBE CONT-042 2: fourth fresh eligible browser POST /subscribe -> identical 202 acknowledgment, no Retry-After, zero new mail, reservations, captures or consent; unsubscribed retained; one expected refusal event and count.
PROBE CONT-042 4: before and after native outbox and ledger reads -> 0 to 1 to 2 to 3 to 3 messages in each order; separate fresh control receives one mail and confirms successfully without reopening exhausted counters.

## Local checks and browser inspection

The focused registered shared-kiosk journey passed locally with the final source and test bytes. Typecheck passed. The first-party command-contract check passed. MECHANICAL.json records actual exit codes for generator write and check, restoration of generated views from main, source-lock regeneration and check, and unchanged CONTRACT.md. The source lock is committed and fresh. No migration or migration-ledger change is present.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

The first integrated local journey exposed “ReferenceError: beforeOutbox is not defined”. Rebase had omitted fixes recorded only in the continuation's merge commit. The correction reapplied the provided continuation's complete history, outbox, fresh-disclosure and confirmation-identity assertions, then added full-ledger checks. The subsequent registered journey passed. This was a local integration defect; no candidate Verify failure or CI repair is claimed. initial-journey-failure.log retains the observed failure.

Response states for hosted and kiosk admission and exhaustion were captured at 1440 and 390. Assertions run at 1440. Existing layout and visible generic acknowledgments were inspected; no screen source or interactive control was added. The screenshot set has eight images, one per selected state and width. Synthetic addresses are constructed at runtime; no literal mail address or provider credential was added to the test source. The browser receipt and screenshots contain only local synthetic fixture data. Browser contexts and owned runtime servers close in the journey's finally blocks.

## DONE-RIDERS, scored without claiming DONE

1. PARTIAL: selected outcomes are reached through real doors, but the explicitly held carriers and clock and failure outcomes are not. Proof: R1–R4 and the candidate browser receipt.
2. PASS for selected scope: seeded native unsubscribed destinations, successful mail handoffs, fourth-request refusal with no consent side effects, and an independently successful fresh destination. Proof: journey lines 69–203.
3. FAIL for the whole Verify gate: reports job 128772486262 passed the registered CONT-042 journey, but campaigns job 128772486199 and therefore Verify 42493957794 failed. Full-clause DONE and READY are not claimed.
4. PASS for local selected proof: final browser receipt names the exact candidate; final source and test bytes match the successful execution. No relevant edit follows it.
5. INSPECTED: CONT-042 already inherits CONT-027; selected privacy behavior remains CONT-041's duty. No new inherited acceptance or Base duty was claimed or altered.
6. PASS mechanically: generator write and check succeeded, generated views restored from main, Status cells unchanged. Counts remain 21, 197, 98. Provenance and status promotion remain lander-owned.
7. PASS: no acceptance or coverage-map rewrite, no ruling needed, no obligation removed.
8. PASS for selected confirmation authority: no subscription during exhausted requests, no extra outbound message on refusal, positive fresh confirmation succeeds. Full suppression, erasure and authority matrices belong to unchanged clauses and are not claimed here.
9. PASS boundary honesty: mail and challenge fixtures replace only the HTTP network edges; no real provider qualification, clock reset or device claim is made.
10. NOT APPLICABLE: no policy default, custody or consent authority choice was introduced; no ASK or DEFAULT was needed.
11. PENDING FLEET LANDING: the cloud pushed only the named branch. Main equality, exact-tree COMPLETE publication scan and main Run site on the landed SHA belong to the guarded lander. No landing or full-clause DONE count is claimed.

## Pre-READY self-check

Selected behavior has positive and refusal runtime assertions; the complete clause remains PARTIAL. No existing user-visible assertion was removed, narrowed, skipped or made width-dependent. No production authority, erasure or replay code changed. The unchanged caller retains confirmation replay refusal and native restriction behavior; broader erasure and revocation proof is not extended. Selected screens use the existing components, readable text and complete field borders; no icon-only control was added. Source lock and local mechanical checks passed. The independent full-history publication scan and main-only Run site remain fleet duties.

PUBLICATION_SCAN commit=0b62989e1eed326d17f14a71f9e7a8a60da9a1a7 complete=NOT_RUN historyScanned=NOT_RUN findings=UNKNOWN reason=cloud route delegates the exact-tree scan to the guarded Mac lander.

All five candidate commits were inspected for author, committer, messages and trailers. They use fleet identity and have no trailers. IDENTITY.txt retains the required log output; IDENTITY.json records the complete audit. The initial auxiliary audit parser had a record-stride error; its corrected per-commit audit passed for every candidate. Product push guard reported PUSH_OK on attempt 1. Full history is retained through the required continuation and main integration.

## Remainders and handoff

GAP CONT-042: Popup, flyout, full-page and landing carriers; actual midnight-UTC allowance reset with unchanged confirmation and suppression guards; the complete failed and uncertain handoff no-retry matrix; and next-day exact-count reconciliation remain unproved. Existing hosted-only restart and prior-day evidence, CONT-027 incentive, topic, flow, history and expiry work, CONT-041's wider protected-state matrix and CONT-043 erasure, supersession and cleanup obligations remain unchanged. CONT-013's original hold and all provider, account and cross-seed prerequisites remain unchanged.

No real blocker prevents landing this selected PARTIAL proof. No follow-up target was selected from historical plan prose. The packet is transported on evidence/sd-mango-c-f145 only, separately from product custody. No evidence file is present on the product branch.

## CI provenance

Pinned predecessor 80bc36a87109a3da22509aa422b30415de462dc6 had successful push Verify 42490866446. Baseline main 7b95de610793d2dad6e17495da3e8f2e67e27418 had successful push Verify 42491448742 and Run site 42491448770. Those are context only, not candidate green evidence.

Candidate push Verify 42493957794 targets exactly 0b62989e1eed326d17f14a71f9e7a8a60da9a1a7. Discovery returned in_progress with no conclusion. No workflow was dispatched, rerun or changed. Candidate CI is polled only after the required interval.

The final instrumented exact-candidate run passed: Playwright command exit 0 and outer subreaper exit 0, 1 test passed in 1.6 minutes. COMMAND-RECEIPT.json and BROWSER-RECEIPT.json bind that result to the pushed SHA. An earlier evidence-only outer shell returned 1 despite a passed browser report; the instrumented repeat resolves the command-status uncertainty without changing any source or assertion. All owned browser and server processes exited.

The first permitted CI status poll returned in_progress, no conclusion, with the exact candidate SHA. No CI failure is known. Four GitHub CLI API calls have been used, including predecessor, baseline, candidate discovery and this status read.

CLAIM CONT-042 PARTIAL points=1,2,4 tests=tests/go-live/shared-kiosk.journeys.ts#[FORM-009][CONT-005][CONT-027][CONT-042] shared signup clears each visitor and resubscribes only after their affirmative confirmation

The numeric claim points identify the selected portions described in R1, R2 and R4; the GAP above explicitly retains every unproved remainder. No whole acceptance point or full-clause DONE promotion is requested.

## Completed Verify failure and reproduction

The single completed failed shard is campaigns, job 128772486199, in Verify 42493957794 on the exact candidate. Its aggregate verify job 128775359929 also failed because the campaigns shard failed. Reports job 128772486262 succeeded; build and every other active shard succeeded.

Failing test: tests/go-live/presend-checks.journeys.ts — “[BUILD-008][BUILD-012][RESULT-001] preview a saved newsletter, resolve pre-send blockers and refuse unsafe handoff expansion”. The assertion in tests/go-live/email-size.flow.ts, line 79, expected HTTP 200 and received HTTP 409: “Link host shop.example.test could not be resolved and checked.” The exact failed shard command is node scripts/verification/ci.mjs campaigns, using the workflow campaigns member list, CI=true, WRANGLER_SEND_METRICS=false, PLAYWRIGHT_SKIP_BROWSER_GC=1 and two Playwright workers.

The failed job archive was read once with gh run view 42493957794 --repo just-every/run-mango --job 128772486199 --log-failed, exit 0. CI-CAMPAIGNS-FAILED.log retains its test output and omits its environment header. No direct job-log download, workflow edit, test change, dispatch or repair has been attempted. The relevant production paths, campaign shard membership and affected presend journey have no diff from main. Reproduction uses the exact candidate first, then the same command on main on this VM, with the same toolchain and network fixtures.

## Terminal disposition

BLOCKED branch=cloud/sd-mango-c-f145 head=0b62989e1eed326d17f14a71f9e7a8a60da9a1a7 reason=Verify 42493957794 is red and its campaigns failure did not reproduce.

Candidate reproduction: exact failed shard command, same member list, two workers and CI flags, at 0b62989e1eed326d17f14a71f9e7a8a60da9a1a7: 4 passed in 6.5 minutes, exit 0. Main control: same shard and command on the same cloud VM at 7b95de610793d2dad6e17495da3e8f2e67e27418: 4 passed in 6.3 minutes, exit 0. The original presend assertion passed on both. VERIFY-REPRO-CANDIDATE.json, VERIFY-MAIN-CONTROL.json and their complete logs record these outcomes. VERIFY-CI-FAILURE.json records the real CI exit 1 separately from the successful reproduction exit codes.

VERIFY_UNREPRODUCED head=0b62989e1eed326d17f14a71f9e7a8a60da9a1a7 job=128772486199 command="node scripts/verification/ci.mjs campaigns" candidate_exit=0 main_exit=0 failure="Expected 200; received 409: Link host shop.example.test could not be resolved and checked."

The brief's Verify-repair instruction says: “If it does not reproduce, stop BLOCKED with that output; do not guess a fix.” That rule applies here. No speculative repair, source change or assertion change was made after the candidate push; no repair round was attempted. A specific infrastructure class has not been established, so no failed-job rerun was requested under the proven-flake exception. Eight explicit GitHub calls were used. No green result from main or the predecessor is presented as candidate green. No READY is emitted for a known unresolved red run.

This block concerns the whole-candidate Verify result; it does not retract the passed local and reports-shard evidence for the selected CONT-042 portions. The clause remains PARTIAL and all held remainders above remain named. No status cells were changed, no main ref was pushed, and the product branch remains exactly the pushed candidate. The branch checkout was restored after the detached main control, and all native runtime and browser processes owned by those commands exited.

The first evidence publication was fetched into isolated Git storage and all 32 file hashes verified against its manifest. EVIDENCE-TRANSFER.json records that first packet, head 8eb7d32d0b30b91fe63f6e0c89c967be47c4f10f, and its binding to the product candidate. The terminal evidence publication supersedes it by a normal child commit, adding the completed CI failure and both control receipts. Evidence transport is separate from product acceptance and never signals READY. The terminal message supplies its exact final ref and head.

POST lanes/fv/INBOX.md: sd-mango-c-f145 UNREPRODUCED just-every/run-mango Verify run=42493957794 job=128772486199 head=0b62989e1eed326d17f14a71f9e7a8a60da9a1a7 campaigns presend expected 200, got 409: synthetic shop.example.test could not be resolved and checked. Exact candidate shard 4 passed exit=0; same main shard 4 passed exit=0. No repair or rerun guessed; reports job=128772486262 passed.
POST lanes/sd/INBOX.md: sd-mango-c-f145 CONT-042 PARTIAL unchanged; selected portions 1,2,4 proved in registered shared-kiosk journey; counts 21 DONE,197 PARTIAL,98 MISSING unchanged; cloud/sd-mango-c-f145 head=0b62989e1eed326d17f14a71f9e7a8a60da9a1a7 pushed; Verify run=42493957794 failed campaigns job=128772486199, target reports job=128772486262 passed; BLOCKED under unreproduced-Verify rule after candidate and main both passed all four campaigns tests.
