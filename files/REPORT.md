# sd-mango-c-f133 results

SEND-007 remains PARTIAL. This round adds the selected acceptance 1 completion fence proof for uncertain Resend handoffs to the existing registered journey. No production behaviour or contract text changes. Counts stay 21 DONE, 197 PARTIAL, 98 MISSING, 316 total. The only plan row advanced is SEND-007's selected uncertainty proof; no plan status is promoted.

The full plan is in PLAN.md. Actual commands, exits, product provenance and CI are recorded in RECEIPT.json and the explicitly selected log files. The browser images show synthetic fixture data only; no credential or runtime private control output is included.

## Checkable outcomes

| Item | Result and proof |
| --- | --- |
| Acceptance 1, two uncertain Resend handoffs | The registered journey calls completion proof with two independently expected destinations and handoff-unknown outcomes at tests/go-live/resend-delivery.flow.ts:66. The helper reads authenticated GET campaign detail and persisted campaigns, step_dispatches and recipient_steps at tests/go-live/resend-completion-proof.ts:10-35. Campaign and dispatch remain dispatching; the result is Sending; completed_at, API completedAt and uncertain recipient terminal_at stay null. |
| Acceptance 1, native restart and Cron | The runtime is closed and reopened on the same native durable state, then Cron is invoked before the same proof at tests/go-live/resend-delivery.flow.ts:74-76. No operator resubmission occurs. |
| Acceptance 1, one delivered and one uncertain | Native provider reconciliation establishes delivery before tests/go-live/resend-delivery.flow.ts:97. The same campaign, dispatch, null-completion and result checks still require Sending and exact mixed counts. |
| Acceptance 1, rendered existing scheduled page | tests/go-live/resend-completion-proof.ts:37-58 reloads the real scheduled route with the active owner session. Desktop assertions reconcile campaign state, step state, exact disposition buckets and zero sent steps. Screens at 1440 and 390 are captured after schedule-date hydration at each checkpoint. The helper repeats native reads after each reload. |
| Acceptance 1, no new submission | tests/go-live/resend-completion-proof.ts:23-35 requires exactly the two expected recipient-step destinations, attempt_count 1 each, unchanged original outbound request bytes and exactly two marketing submissions at every checkpoint, including final expiry. |
| Acceptance 1, final-completion control | Existing lookup expiry and outcome-unconfirmed assertions are retained. The next native Cron tick settles step completion, then tests/go-live/resend-delivery.flow.ts:122-126 invokes the same proof with delivered and failed outcomes. Campaign and step are completed; API result is Sent with a non-null completion time equal to durable completed_at; still exactly two submissions. |
| Acceptance 1 remainder | HELD: every other terminal-disposition combination, other adapters and SMS are not claimed proven by this slice. |
| Acceptance 2 | HELD: full separate overlapping totals and no combined success proof. Existing assertions and carried results evidence are unchanged. |
| Acceptance 3 | HELD: late suppression and completed contact-ledger proof. Existing complaint and reconciliation evidence is preserved. |
| Inherited BASE-MAIL-001 duty | The receiving clause already cites BASE-MAIL-001 in CONTRACT.md. This slice proves truthful uncertainty and preserves the existing delivered-versus-accepted control and foreign-provider authority refusal. It does not claim complete inherited-duty qualification. |

The journey name is `[SEND-001][SEND-005][SEND-006][SEND-007][SEND-008] reconcile uncertain Resend handoffs without duplicate sends or fabricated delivery` in tests/go-live/resend-delivery.journeys.ts. It remains one registration, already included by the go-live configuration and the authoring push pack in scripts/verification/plan.mjs. No workflow change, new registration, deletion, skipped assertion or narrowed assertion was introduced. The original campaign-completed equality remains, using polling for asynchronous reconciliation; an additional step-completed assertion strengthens its positive control.

## Local diagnosis and verification

The first local run passed all three uncertainty checkpoints and exposed that step completion follows recipient expiry on the next native Cron tick. Its exact error was expected step state completed, received dispatching, at resend-completion-proof.ts:19. The test was adjusted to execute that next native tick rather than impose same-tick step completion. No production logic or existing assertion was weakened. The initial failure is retained in journey-initial.log. The final run and captures replace that preliminary evidence for this candidate.

Typecheck, first-party command contract, generated contract write and check, and source freshness and offline Base integrity checks pass. Contract cells, acceptance text, generated views, homepage and branding stay unchanged. No migration was added, so the migration-ledger check is not applicable. The source lock is regenerated from staged test changes, never edited by hand.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored from origin/main; ledger=none exit=0.

PROBE SEND-007 acceptance-1: native approval of two confirmed contacts with lost Resend responses, native restart and Cron, then one real fixture-edge delivered fact -> authenticated detail and native persistence retain dispatching and null step completion; reloaded scheduled page shows Sending and exact uncertain counts; two original submissions only. Lookup expiry plus the next native tick -> completed campaign and step with one delivered and one outcome-unconfirmed failure, no new submission.

## DONE riders and pre-handoff review

This is a PARTIAL claim, not a DONE request.

| Rider | Result |
| --- | --- |
| 1 | PARTIAL: selected Resend uncertainty outcome is exercised through native approval, provider boundary, Cron, authenticated detail and browser doors; the clause's remaining outcomes remain held. |
| 2 | PASS locally: independent known destinations and counts, actual native data, unsafe completion refused while uncertain, and positive expiry completion control; no expected value is derived from the output under assertion. |
| 3 | PASS for the selected proof: push Verify 42484424595 completed successfully on exact candidate ad1a605639c006c0e002a53f8cebed6a104aeceb; the journey is registered in its existing authoring pack. The whole clause stays PARTIAL. |
| 4 | Candidate source and test bytes match the local proof; source lock is regenerated last. Exact revision and any subsequent rerun are recorded in RECEIPT.json. |
| 5 | INSPECTED: SEND-007 already cites BASE-MAIL-001; no inheritance text changed. |
| 6 | Mechanical generation write and check pass, then generated views are restored; historical status provenance and gap cells are untouched and no DONE count is requested. |
| 7 | PASS by diff: no acceptance point, coverage map, status or ruling change. |
| 8 | Not newly applicable: no permission or mutation authority changes; existing authenticated doors and foreign-provider refusal remain. |
| 9 | PARTIAL honest boundary: synthetic network-edge provider proof only; no live-provider, SMS, device, retention or legal qualification claim. |
| 10 | Not applicable: no new policy choice or default. |
| 11 | PENDING FLEET: main equality, publication scan and resulting Run site are not cloud-owned and are not claimed. |

Pre-handoff checks: the selected completion state, result and no-resubmission behaviours have assertions against independent fixture expectations; the final safe completion control runs as well. Existing assertions remain. No authority, erasure, replay, UI control, visual design or production path was changed. The existing replay and provider-boundary controls remain. No new email-shaped fixture value was introduced. Scheduled-page screenshots at both widths were reviewed; icon-only actionable controls were not added or changed. Publication scan is NOT RUN in cloud, not assumed COMPLETE. Scan historyScanned and finding counts are unestablished. No claim of main equality, candidate Run site success or landing is made. No real blocker was identified within the selected work.

Broader SEND-008 lookup, eviction, redeployment and real-provider qualification stay unproved. Live RESULT-007 and carried reconciliation evidence stay unchanged. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold, the prohibition on a third FIX, provider and account prerequisites, cross-seed and Base prerequisites, and release requirements remain unchanged.

Product head: ad1a605639c006c0e002a53f8cebed6a104aeceb on cloud/sd-mango-c-f133. Current origin main at integration: eceb55d9eca66cf4a2702f69e23109d2266b1560. Fetch and rebase reported up to date. CONTRACT.md has no candidate diff. Full-history publication scanning remains fleet-owned.

The guarded product push succeeded on its first attempt. Candidate push Verify run 42484424595 was discovered in progress on exact head ad1a605639c006c0e002a53f8cebed6a104aeceb; final status will be recorded in RECEIPT.json. No pull request was needed because this repository starts Verify on branch push. At the initial main, Verify 42480504208 and Run site 42480504239 were completed successfully on eceb55d9eca66cf4a2702f69e23109d2266b1560. These main runs are context, not candidate proof.

CLAIM SEND-007 PARTIAL points=1 tests=tests/go-live/resend-delivery.journeys.ts#[SEND-001][SEND-005][SEND-006][SEND-007][SEND-008] reconcile uncertain Resend handoffs without duplicate sends or fabricated delivery

GAP SEND-007: Only acceptance 1's selected Resend uncertainty fence is proven here. Other terminal outcomes, adapters and SMS; acceptance 2's full overlapping totals; and acceptance 3's late suppression and completed-ledger proof remain held. No policy default is adopted.

Final CI: push Verify 42484424595 completed with success on ad1a605639c006c0e002a53f8cebed6a104aeceb, verified by REST at the time in ci-final-time.txt. Five GitHub API calls were used in total, with at least 300 seconds between reads of this run. No workflow was dispatched or retried, and no logs were requested because no candidate failure was observed. The product ref was read back and matches the candidate. There is no PR. Local journey, typecheck, first-party command checks, generation checks and source freshness checks pass; no product blocker remains. The published candidate is eligible for the fleet's independent scan and landing gates; this does not promote SEND-007 or assert landing.
