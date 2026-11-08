# CONT-042 evidence assessment

The round preserves the selected bounded slice. No acceptance sentence, Status, Gap or Evidence cell is changed. The full clause remains PARTIAL.

## Acceptance sentences

| Item | Observed proof at the saved head | Result |
| --- | --- | --- |
| 1: three destination reservations and emails across public capture carriers and different networks | `tests/go-live/confirmation-allowance-journey.ts` lines 64–157, called from `resubscribe.flow.ts` by the registered `shared-kiosk.journeys.ts` test: two imported unsubscribed destinations, alternating hosted and kiosk in both orders, distinct networks, unique challenges, current disclosures, exact mail and request counts, and one destination counter | Selected hosted and kiosk portion passes locally; remaining carriers unproved |
| 2: fourth request sends no mail, same acknowledgment, midnight reset with guards | Same journey lines 98–145 checks 202 and identical JSON, three mails before and after the fourth request, unchanged contact, address, consent, metadata, confirmation, request and handoff state; expected refusal report and history additions reconciled | Fourth-request portion passes locally; actual midnight reset remains unproved |
| 3: failed or uncertain handoff has no automatic retry | Existing production and prior journeys unchanged | Complete matrix not established by this round |
| 4: exact before and after mail counts across exhaustion and next day | Same journey lines 85–86, 112–136, 150–172; fresh address still sends and confirms | Exhaustion portion passes locally; next-day reset reconciliation unproved |
| D-2 inherited permission precedence | Imported opted-out contacts remain unsubscribed throughout all eight captures; no confirmed evidence or resubscribed history. Fresh control becomes pending and subscribes only after affirmative recipient POST | Selected paths pass; other clauses retain their own proof duties |

Registered test: `[FORM-009][CONT-005][CONT-027][CONT-042] shared signup clears each visitor and resubscribes only after their affirmative confirmation`, `tests/go-live/shared-kiosk.journeys.ts:5`. Assertions execute at 1440; existing response states are captured at 1440 and 390. The test registration count is unchanged by the continued work.

## DONE-RIDERS

| Row | Result | Evidence or remaining condition |
| --- | --- | --- |
| 1 | FAIL for full DONE | Selected runtime outcomes pass, but other carriers, real midnight reset, complete failure matrix and next-day reconciliation remain unproved |
| 2 | PASS for selected slice | Native imports seed real restricted contacts. Both admission and exhaustion execute and reconcile; a fresh positive control actually receives mail and confirms |
| 3 | PASS for selected slice | Push Verify 42497332545 completed success on exact head 3ea2fb5227abbf479c7a190507b4199fba600993 and named continuation branch; registered reports pack |
| 4 | PASS | All local proof ran at the unchanged exact head 3ea2fb5227abbf479c7a190507b4199fba600993; no product byte was edited |
| 5 | INSPECTED | CONT-042 names permission precedence via D-2; no new inheritance claim |
| 6 | MECHANICAL | Generated views belong to the lander; generator result reported separately, main Status rows retained |
| 7 | PASS | No acceptance rewrite or ruling change |
| 8 | PASS for selected slice | No additional authority granted by refused request; three eligible requests only create unconfirmed evidence; fresh confirmation positive control |
| 9 | PASS boundary | Local native runtime with synthetic mail and challenge HTTP edges. No live-provider, account or hosted qualification claim |
| 10 | PASS | No new policy default |
| 11 | PENDING LANDER | Main equality, complete publication scan and Run site remain fleet-owned; never claimed locally |

## Pre-ready review

1. Full-clause DONE is not claimed. Selected behavior has a native registered journey; final CI state is reported honestly.
2. No existing assertion is removed, narrowed, skipped or hidden behind a width condition by this continuation.
3. The selected fourth request cannot change captured authority, subscription or confirmation. Existing credential revocation, erasure and replay duties are unchanged; this round makes no broader repair claim.
4. No screen source is edited. Existing public acknowledgments were inspected at 1440 and 390; all interactive controls shown have text labels. Decoration and status glyphs are not icon-only controls.
5. Lock, contract generation and first-party checks are recorded in the final receipt. A cloud publication scan, main equality and Run site proof are not available from this branch-only builder and remain guarded landing conditions.

Counts at saved head: 21 DONE, 197 PARTIAL, 98 MISSING. Clause status change: CONT-042 PARTIAL to PARTIAL. Plan row update: retain the shared hosted and kiosk proof and identify the unproved remainders; no Mac plan or inbox file is read or written.
