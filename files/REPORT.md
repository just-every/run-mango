# sd-mango-c-f129 results

Repository: just-every/run-mango. Branch: cloud/sd-mango-c-f129.
Full candidate: 80bf3b386a946b6635c99513735b08aff4804e99.

DELIV-009 remains PARTIAL. The supplied starting commit already contains the complete planner-selected Settings-connected Resend silence slice and its registered public-door journey. This round independently ran and inspected that solution, found no missing outcome within the selected slice, and pushed the exact existing commit to the required branch. No artificial product commit, duplicate test, acceptance edit or status promotion was made. Product changes relative to main are the supplied 14-file Resend silence implementation, additive 0104 migration, release receipt and fresh source lock. There are zero additional product edits in this round.

Counts before and after: 20 DONE, 198 PARTIAL, 98 MISSING, total 316. No Status, Gap or Evidence cell changed. No acceptance point changed. The generated views were restored whole from main and have no candidate diff. No homepage, logo, workflow or Base pin changed. No tests or assertions were deleted, narrowed, skipped or hidden behind a condition; zero new registrations. No test-budget.json exists in this checkout; the selected existing registration was extended by the supplied commit, not by this round.

The plan row to update on the fleet is DELIV-009 only: the bounded Resend marketing silence slice is proved on the supplied SHA; retain PARTIAL and all carried gaps. PLAN.md records the full execution plan. No lane files were read or written in this VM.

## Exact-SHA checks and custody

- Registered local journey: tests/go-live/delivery.journeys.ts, “[MSG-011][RESULT-006] an owner connects delivery, account restrictions stop sending and signed facts update reputation”, line 10. Called through delivery.flow.ts walk3, sending-connection-journey.ts, resend-connection-journey.ts line 67, then sending-silence-journey.ts. Result: 1 passed in 4.4 minutes on the candidate, Node 22.20.0 and system Chromium. The command and exit are in runtime-receipt.json and focused-before.log. Despite that log name, it ran the final unchanged candidate.
- pnpm run typecheck: exit 0. typecheck.log and runtime-receipt.json.
- Contract generator write and check: both exit 0; write changed zero documents. Restored ACCEPTANCE.md and docs/CLAIMS.md from origin/main afterward. No generated view committed.
- Edition lock regenerated last and checked: both exit 0, no byte diff. First-party check: exit 0. Actual step commands and exits are in mechanical-receipt.json.
- Migration: no migration edited by this round. The existing additive 0104 is applied through the native fixture migration door, and the persistent-state restart applies the inventory again before reusing the data. No separate migration-ledger command is declared in AGENTS.md; no hosted migration proof is claimed.
- Named-branch exact-SHA Verify 42250379072: push event on cloud/sd-mango-c-f129, completed, success, on 80bf3b386a946b6635c99513735b08aff4804e99. Final REST discovery at 2026-11-06T16:16:50Z also confirmed earlier c126 Verify 42245094360 passed on the same SHA. Two API calls total, spaced more than 300 seconds; no workflow dispatched or rerun. ci-receipt.json and exact-sha-runs.jsonl are actual receipts.
- Product push: first attempt succeeded using cloud-push.py; product-push.log is the actual sanitized custody log. Full candidate identity and trailer audit passed: the sole candidate commit has fleet author and committer and no trailers. No force push, main push, history rewrite, PR or deployment.
- Main at final pre-push integration: a6ff098f6cdf8b356b76105c726c2561f6051a8d. Main is an ancestor; rebase reported the candidate up to date. Main does not equal candidate; the fleet owns landing. No Run site on the candidate is claimed.
- Publication scan: commit=80bf3b386a946b6635c99513735b08aff4804e99; complete=NOT_RUN_IN_CLOUD; historyScanned=NOT_ESTABLISHED; findings=NOT_ESTABLISHED. Cloud branch publication is allowed by the brief; the Mac lander must run the complete full-history scan and exact-SHA landing checks. These are not zero-finding scan receipts.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none, no migration edited this round exit=0.

## Bounded point proof

The following rubric maps the selected point to real seeded state and ordinary public doors. All rows use the registered test at delivery.journeys.ts line 10 and its sending-silence-journey.ts helper. The existing exact-SHA Verify event is push and conclusion is success, run 42250379072 on the named branch; local runtime result is PASS on the identical source.

| Item | Public-door proof and assertion lines | Result |
| --- | --- | --- |
| R1 Native connection and signed diagnostic | Settings review and connect, sender confirmation, signed diagnostic and status; helper lines 32-43, 72-73. Marketing is not enabled by an unrelated event. | PASS |
| R2 Idle installation control | Advance more than a day, Cron and native status; lines 74-77 assert no error, notice or marketing handoff. | PASS |
| R3 Valid signed marketing control | Approve and dispatch a real subscribed reader, then post its signed current receipt; lines 80-89 assert accepted receipt, exact event time and healthy status after the day boundary. | PASS |
| R4 Current credential and connection provenance | Native replacement changes generation; accepted recipient records it; lines 90-104. Production event-silence.ts lines 6-26 correlate generation, provider message, destination and original occurrence time after signature verification. | PASS |
| R5 Lookup is not signed marketing evidence | Provider-edge delivery lookup and Cron create a delivered fact while the signed marker stays empty; helper lines 109-112. | PASS |
| R6 Elapsed-day cause and once-only current notices | Native clock and Cron cross the boundary, then status, audit rows and provider mail receipts; lines 113-121. Persisted cause is delivery-events-silent. Former Admin gets no notice; current Owner and Admin each get one. | PASS |
| R7 Approval refusal and visible state | Native approve returns 409 naming the cause and creates no recipient authority; lines 122-123. Home and Settings captures are produced at 1440 and 390 by lines 63-70 and 124. Actual images inspected in this round. | PASS |
| R8 False recovery refused | Validly signed diagnostics, unrelated messages, prior-generation traffic, wrong destination and old occurrence time cannot clear the cause. Invalid signature returns 401. Lines 125-135. | PASS |
| R9 Hold survives Cron, restart and original deadline | Due pending recipient stays queued with zero attempts; native restart and repeated Cron retain the hold and only two notices; original deadline expires to send-window-expired, still zero attempts and no marketing handoff. Lines 136-148. | PASS |
| R10 Supported recovery and no resurrection | Only current correlated signed marketing recovers health; old payload replay does not change its original event time; expired pending recipient stays skipped and unsent. Lines 149-155. | PASS |

PROBE DELIV-009 2: native Settings connect, signed sender diagnostic, marketing approval and accepted dispatch, then elapsed-day Cron without correlated signed marketing -> stored delivery-events-silent; Home and Settings show the cause; current Owner and Admin each receive one notice; contender approval is refused with HTTP 409 and no recipient authority; pending email stays unsent with zero attempts through native restart and its unchanged original deadline, then skips as send-window-expired. Lookup facts, diagnostics, prior-generation traffic and old events do not recover; a current correlated signed marketing event does.

The actual sending-silence-observations.json records two marketing handoffs total, no idle handoff, the independent valid-event control and the exact pending row before and after. Its send_by_at remains 1794252748575, attempt_count remains 0, and it changes from queued to skipped. Only go-live-owner and synthetic-mango-145 receive the silence notice. Synthetic addresses are test-only data already present in the supplied journey; no real recipient or secret is in the packet.

## Full acceptance accounting

| DELIV-009 sentence | Status on candidate and proof boundary |
| --- | --- |
| 1 Revoked keys or deleted webhook raise notices and block approval | Carried unchanged. Focused connection journey includes native provider revocation and missing-webhook causes, Home alerts, native approval refusal and accepted notices in resend-connection-journey.ts lines 52-64. No new whole-clause claim from this round. |
| 2 Disabled signing or day of accepted handoffs without events applies cause, hold, deadline and activation | Selected Resend silence subset PASS, helper lines 72-155 as R1-R10. SendGrid silence, disabled signing and the complete flow activation and deadline matrix are unproved remainders. Acceptance 2 is not claimed complete. |
| 3 Replacement preserves every uncertain recipient and repeats all checks | Ordinary native replacement is part of the selected generation control, lines 90-104. Replacement after an uncertain handoff remains unproved; no uncertain handoff is replayed or newly authorized by this implementation. |
| 4 Disconnect removes key and owned webhook and blocks disconnected approval | Carried unchanged. Native disconnect in sending-connection-journey.ts and resend-connection-journey.ts; no new acceptance completion claim. |
| 5 Actor, time and provider activity for mutations | Carried unchanged; authenticated sending-connected activity assertion in sending-connection-journey.ts lines 63-67. No activity assertion removed. |
| 6 Settings route and equivalent developer checks | Existing Settings label is visible in both inspected widths. Complete developer-route authority and event-check equivalence remains unproved. |

Inherited BASE-SECRET-001: encrypted connection custody and redacted status, browser, log and archive checks remain in the invoked connection journey; no secret-bearing file selected for evidence. BASE-MAIL-001: R5 and R9 distinguish provider lookup, accepted handoff and a genuinely unsent expired row; monitor.ts lines 49-56 preserve the uncertain notice fence. BASE-OPS-005: existing native activity checks remain loaded by the registered journey; R6 checks durable notice recipients and disposition. All three citations remain in DELIV-009's meta line at CONTRACT.md line 2828. These inherited duties are not expanded or declared fully qualified by this round.

## DONE riders

No DONE claim is made. These are assessed against the exact candidate, not used to promote the clause.

| Rider | Assessment | Evidence |
| --- | --- | --- |
| 1 | FAIL for complete clause; PASS for selected slice | R1-R10 pass. The acceptance 2, 3 and 6 remainders above still lack complete journeys. |
| 2 | PASS for slice | Real subscribed readers send, unsafe approval is attempted and refused, and the nonempty pending recipient survives unchanged until its deadline, lines 80-155. |
| 3 | PASS for slice | Named-branch push Verify 42250379072 succeeds on this SHA and invokes the registered delivery journey. Local exact-SHA journey also passes. No nightly-only or flag-only replacement proof claimed. |
| 4 | PASS | Local test and screenshots run on unchanged 80bf3b386a946b6635c99513735b08aff4804e99; no code or test byte changed after capture. |
| 5 | PASS, INSPECTED | CONTRACT.md line 2828 cites BASE-SECRET-001, BASE-MAIL-001 and BASE-OPS-005. |
| 6 | PASS mechanically; status stays partial | Generator write and check both exit 0; Status cells and generated views unchanged. Report names current gaps; lander owns updated evidence cells. |
| 7 | PASS, INSPECTED | No CONTRACT.md diff, acceptance rewrite, new point or provenance edit. |
| 8 | PASS for slice, full authority remainder retained | Native Owner connection and Admin refusal remain in the connection journey; current notice authority and refused approval are checked in lines 94-123. |
| 9 | Not fully proved | Provider boundary fixtures only. Live provider and hosted qualification remain named gaps, not claimed evidence. |
| 10 | PASS, no new policy default | No new custody, consent, spending, delegation or provider policy was adopted. Supplied ruling index and Mango rulings contain no additional silence decision to apply. |
| 11 | Pending fleet landing | Main differs. Complete publication scan, resulting-main equality and Run site belong to the guarded lander; no landing receipt invented. |

## Pre-ready self-check

1. Selected behavior is exercised through real routes and nonempty records, including positive controls, rejection and original-deadline handling. Named-branch exact-SHA Verify 42250379072 is green. The whole clause remains PARTIAL because not every promised variant is proved.
2. No assertion was removed, narrowed, skipped or moved behind a new condition. No new test or product edit this round.
3. Old and unrelated signed captures cannot recover current authority. Pending email cannot be resurrected after expiry. Existing erasure, uncertainty and CONT-013 SPLIT/NEW-1 holds remain unchanged; no broad new erasure certification.
4. Home and Settings states inspected at 1440 and 390: readable text, contained forms and visible cause. Configuration stays under Settings. The selected panels add no icon-only action; the existing navigation arrows are labelled row links. No new UI was created this round.
5. Source lock fresh, named-branch exact-SHA Verify 42250379072 success established. Scan, resulting-main equality and Run site are explicitly pending fleet custody, permitted by the cloud route. No new fixture, email-shaped product string or bare repository-like prose was added by this round.

CLAIM DELIV-009 PARTIAL points=2 tests=tests/go-live/delivery.journeys.ts#[MSG-011][RESULT-006] an owner connects delivery, account restrictions stop sending and signed facts update reputation

The points field identifies the bounded acceptance-2 slice proved here; it does not mark all of acceptance 2 complete. DONE riders 1 and 9 retain whole-clause gaps and rider 11 is pending landing. No DEFAULT applies.

GAP DELIV-009: SendGrid silence and disabled signing, the full flow activation and deadline matrix, replacement after uncertain handoff, complete developer-route authority, scheduled-daily and hosted proof and live provider qualification remain open. DELIV-008 fresh-install and Free sign-in and DELIV-002 domain creation remain separate open obligations. CONT-013 disposition and original fix-1 hold, no third FIX, and all provider, device, account, cross-seed, Base and release prerequisites remain unchanged.

No real task blocker was found for the selected Resend slice. No approval was requested, no outside person was contacted and no live provider account was changed. The separate evidence transfer and final custody lines identify the exact publication; evidence does not assert landing or DONE.
