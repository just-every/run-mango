# sd-mango-c-f136 — CONT-042

Product repository: just-every/run-mango. Branch: cloud/sd-mango-c-f136.
Candidate: cc2d1f618b695ddc1e28306e8f9774f732a66a69. Base main: eceb55d9eca66cf4a2702f69e23109d2266b1560.

CONT-042 remains PARTIAL. This round proves the planner-selected hosted and kiosk destination-budget portion of acceptance 1, fourth-request privacy and no-mail portion of acceptance 2, and exhaustion-count portion of acceptance 4. It makes no full-clause DONE claim and does not promote any acceptance sentence from partial proof alone. Contract counts before and after: 21 DONE, 197 PARTIAL, 98 MISSING. The one existing shared-kiosk test registration remains one registration; no assertion was removed, narrowed, skipped or put behind a width condition.

The committed implementation is proof only. The existing production admission and signup routes already enforce the selected budget. A new confirmation-allowance journey runs through resubscribe.flow.ts and the existing registered shared-kiosk journey in the reports Verify pack. No workflow, production path, contract clause, status cell, generated view, homepage, release pin or migration changes.

## Plan and results

The complete working plan is PLAN.md. Its implementation and proof steps were completed: inspect current contract and public routes; import restricted destinations natively; exercise both carrier orders with independent networks and fresh challenges; reconcile mail, durable counters and preserved consent; run focused checks and regenerate the source lock; publish product custody and a separate report packet. The final evidence-transfer receipt is external to the product tree.

Two destinations are imported with the native csv-unsubscribed preset. One receives hosted, kiosk, hosted, kiosk requests; the other receives kiosk, hosted, kiosk, hosted requests. Every submission reads current disclosure, uses its own valid challenge and different network, and goes through the actual built form and native POST /subscribe. Before the first capture there are no emails or destination counters. Each admitted request adds one consent, capture metadata and confirmation, preserves the opt-out and records request and handoff history. Independently read mail counts are 1, 2, 3, 3 for each destination; all three successful request records reconcile to one durable destination-day counter with count 3.

Each fourth response is HTTP 202 with the same confirmation-required body as admission. Before and after snapshots match for contact, addresses, evidence, capture metadata, confirmations, successful reservations and all non-refusal contact history. No email is added, the status remains unsubscribed, no confirmation is consumed and no resubscription is recorded. Expected refusal effects are asserted separately: exactly one resubscribe-refused history event for that contact and one daily-allowance refusal for its final carrier. The two form totals reconcile to one hosted and one kiosk refusal. A fresh address remains admissible, receives one confirmation, starts pending, affirmatively confirms through the issued public link and becomes subscribed without additional mail.

Assertions execute at 1440. Eight selected response screenshots show admitted and exhausted states in both carrier orders at 1440 and 390. Existing controls remain labeled, and these response surfaces introduce no icon-only action, configuration control, typography or border change.

Development encountered an unsupported Playwright clock uninstall call, which was removed before the first passing run. A later exact-commit replay of ebbb4827222d4278835fd1ca95a5ef03dd62d9a6 exposed a browser-clock synchronization error: clock.pauseAt could receive a past runner timestamp. The correction derives its pause target from the browser's own current time. No product assertion was weakened. replay-clock-failure.log preserves the actual failed replay; it is not a Verify failure receipt.

## Acceptance evidence

The registered test is tests/go-live/shared-kiosk.journeys.ts, “[FORM-009][CONT-005][CONT-027][CONT-042] shared signup clears each visitor and resubscribes only after their affirmative confirmation”. It invokes the new confirmation-allowance journey through resubscribe.flow.ts:154. CI selects that registration in the existing reports pack through scripts/verification/plan.mjs.

| Acceptance sentence | Result and proof at the candidate |
| --- | --- |
| 1: three shared reservations and emails per destination per UTC day across public carriers and networks | PASS for the selected hosted and kiosk carriers in both orders: confirmation-allowance-journey.ts:53-105, with native imported opt-outs, distinct networks and exact persisted counter reconciliation. Other carriers remain unproved. |
| 2: fourth request sends no confirmation, retains acknowledgment, and resets at midnight with unchanged guards | PASS for fourth-request privacy, no mail, no capture and unchanged opt-out: confirmation-allowance-journey.ts:87-125 and snapshot helper at lines 11-22. Actual midnight reset and its guard matrix remain unproved. |
| 3: failed or uncertain handoff is not retried automatically | Existing production and carried evidence unchanged. The complete matrix is omitted from this bounded round; no new proof claimed. |
| 4: exact email counts before and after exhaustion and next-day reset | PASS for exhaustion: confirmation-allowance-journey.ts:71-73 and 99-117, recording both 3-before and 3-after outcomes. Next-day reconciliation remains unproved. |

PROBE CONT-042 1: native imported unsubscriber, POST /subscribe from hosted and kiosk carriers in both orders and distinct networks -> three sent reservations, three mail handoffs and one destination-day counter with count 3 for each destination.
PROBE CONT-042 2: fourth fresh disclosure and challenge at POST /subscribe -> HTTP 202 and identical acknowledgment; no mail, profile, capture metadata, consent, confirmation or subscription change; one expected refusal history event and carrier refusal count.
PROBE CONT-042 4: read mail and durable counter before and after the fourth request -> 3 then 3 in both orders; fresh destination control -> one mail and successful affirmative subscription.

## DONE-RIDERS assessment

| Row | Result | Evidence or remaining boundary |
| --- | --- | --- |
| 1 | PARTIAL | Selected outcomes pass the focused public-door journey; omitted carriers, actual midnight reset and failure matrix prevent DONE. |
| 2 | PASS for selected slice | Real imported opt-outs; admitted and refused requests; unchanged capture snapshots; fresh destination confirmation control at lines 132-145. |
| 3 | IN PROGRESS, observed by REST at 2026-11-08T13:31:01Z | The existing reports Verify pack loads the registration; exact candidate run 42484916479. No green from another SHA is claimed. |
| 4 | PASS | Focused journey replayed on cc2d1f618b695ddc1e28306e8f9774f732a66a69; actual journey receipt records head, result, timing and reconciliation. |
| 5 | INSPECTED | CONT-042 names its own admission obligation and originates from CONT-027; no inherited duty or contract text was changed or newly claimed. |
| 6 | PASS mechanical | Generator write and check exit 0; main's generated views restored; status table and counts remain unchanged. Wider gap is explicitly retained in this report. |
| 7 | PASS | No acceptance point, coverage map, ruling or contract text changed. |
| 8 | PASS for selected slice | Existing owner session drives settings and imports; public capture cannot lift an opt-out. No new authority path. Broader revoked-credential and erasure paths are unchanged, not requalified. |
| 9 | PASS boundary | Mail and challenge doubles are limited to existing HTTP edges. No live-provider, device, hosted or legal qualification is asserted. |
| 10 | NOT APPLICABLE | No new policy default was adopted. |
| 11 | PENDING FLEET LANDER | Product branch only. Main equality, exact-main Run site and full-history publication scanning remain with the maintained lander; no landing count claimed. |

Pre-READY assessment: selected allowed and refused behaviors are asserted through public doors; no existing assertion was weakened; consent replay is observed as still unconfirmed and unsubscribed through the fourth request. The wider revoked-credential, erased-person and replay matrices retain their original evidence and gaps. Response states are inspected at both required widths. Source lock and contract generation pass. Candidate Verify is reported below; candidate Run site, main equality and publication scan are not established by a branch push.

## Mechanical and custody

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, main views restored; ledger=none, no migration changed.

The focused registered journey, typecheck and first-party command check pass on the final committed candidate. Build passed before the candidate commits; production build inputs were unchanged by this proof-only work. mechanical-receipt.json records the actual command exits. journey-receipt.json and confirmation-allowance-reconciliation.json record the final committed journey result and observed runtime counts. Product author and committer are fleet identity on both commits, with no trailers. The source lock is regenerated after the last proof edit, including the newly staged file. Product push logs preserve actual branch custody.

Candidate Verify: 42484916479, IN PROGRESS, observed by REST at 2026-11-08T13:31:01Z, exact head cc2d1f618b695ddc1e28306e8f9774f732a66a69. Initial superseded Verify: 42484462004 at ebbb4827222d4278835fd1ca95a5ef03dd62d9a6; completed with conclusion cancelled; superseded by the corrected candidate. Base-main Verify 42480504208 and Run site 42480504239 are successful at eceb55d9eca66cf4a2702f69e23109d2266b1560; those runs are not candidate proof.

Publication scan: commit=cc2d1f618b695ddc1e28306e8f9774f732a66a69; complete=not run in cloud; historyScanned=not established in cloud; findings=not established in cloud. The guarded fleet lander owns the complete full-history scan before landing. No claim of zero findings is made here.

GAP CONT-042: Other public form carriers, actual midnight UTC reset with unchanged guards, the complete failed or uncertain no-retry matrix and next-day count reconciliation remain omitted under the planner-selected scope. CONT-027 incentive, topic, flow, history and expiry obligations, CONT-041's wider protected-state matrix and CONT-043 erasure, supersession and cleanup remain unchanged. All provider, device, account and cross-seed or Base prerequisites, the CONT-013 original fix-1 hold and SPLIT and NEW-1 disposition, and existing rer adoption and release requirements remain unchanged.

No product blocker is declared. The plan row to update is CONT-042: PARTIAL to PARTIAL, with this bounded shared hosted and kiosk allowance evidence added. No full plan file or lane inbox was read or written. Evidence publication is report transport only and conveys neither product acceptance nor landing authority.

CLAIM CONT-042 PARTIAL points=none tests=tests/go-live/shared-kiosk.journeys.ts#[FORM-009][CONT-005][CONT-027][CONT-042] shared signup clears each visitor and resubscribes only after their affirmative confirmation

The claim uses points=none because this bounded round proves portions of acceptance sentences 1, 2 and 4, while each full sentence retains an explicit remainder. It does not conceal the successful selected runtime proof.

Terminal custody: the final product head is pushed and its exact-SHA Verify remains in progress at the final REST observation. No candidate green result, READY claim, main landing or scan completion is inferred. The maintained fleet retains the branch for independent gates. GitHub REST observations used six calls total, respecting one observation per run per five minutes; no workflow was dispatched or rerun.
