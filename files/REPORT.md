# sd-mango-c-f65 report

CONT-009 remains PARTIAL. The selected hosted-email part of acceptance 2 is now proven through the real browser and HTTP confirmation door. No production behavior, acceptance sentence, homepage, UI, provider setting or policy default changed.

Product repository: just-every/run-mango
Branch: cloud/sd-mango-c-f65
Candidate: a561179164a0e21b71452afd58bbce17c4c29951
Save: 21681da44d37b11e6b798d18cee626b1dcc417c7, published with skip-ci marker.
Base main: cc6321c2372d631d9607df9af8ad1dd9f7878e84.
PR: none; branch push is an existing Verify entry point.

Counts before and after: 20 DONE, 198 PARTIAL, 98 MISSING, 316 total. The focused registered test count remains one; no test was added or removed. Every parent Status ID and all 490 table lines were retained. No acceptance text changed. The only changed product files are CONTRACT.md, tests/go-live/resubscribe.flow.ts and the generated sources.lock.json.

## Outcome and proof

The existing shared-kiosk journey invokes resubscribe.flow.ts through its registered caller at tests/go-live/shared-kiosk.journeys.ts:5-8. Its exact title is “[FORM-009][CONT-005][CONT-027] shared signup clears each visitor and resubscribes only after their affirmative confirmation”. Both normal hosted signup and kiosk resubscription run against native routes, sessions and D1, with only the existing challenge and mail transport network edges replaced by fixtures.

The proof brackets the visible affirmative HTTP POST with real wall-clock samples (resubscribe.flow.ts:77-92), requires the bracket to begin strictly after the earlier capture, and compares authenticated consent confirmedAt with that independent bracket. It reconciles the same instant with authenticated channel-status time, persisted consent_evidence.confirmed_at, consent_confirmations.confirmed_at, both consent-confirmed and resubscribed contact_history occurrence times, and authenticated history readback (lines 93-107). The capture time itself remains unchanged.

Two repeated GET and POST pairs return 410, retain identical persisted time records and leave authenticated detail, growth counts and message counts unchanged (lines 112-119). Pending consent, scanner previews, opt-out preservation and single-use assertions were kept. No assertion was deleted, narrowed or gated on a new width or branch condition. The old loose confirmedAt string assertion was strengthened with independent bounds and readback; single-use checks were extended.

The final candidate passed the registered journey: one passed in 53.8 seconds, with a 1200-second hard timeout. It also passed strict typecheck and rer check --profile first-party. The required rer setup completed with the fleet owner and non-interactive flag; rer build completed separately. Build source bytes are unchanged between the save and final candidate. JOURNEY.json, TYPECHECK.json, FIRST-PARTY.json and BUILD.json record those actual results.

A temporary mutation backdated the native confirmation route's request time by sixty seconds. The same journey failed with exit 1 at resubscribe.flow.ts:91: expected at least 1793932119205, received 1793932059275. The production source was restored and the exact final candidate passed afterward. MUTATION.json and MUTATION.log record the result; the relevant source and test bytes are identical between the mutation base and candidate. This mutation proves the newly selected outcome can fail when request time is wrong; it is not a Verify repair.

## Frozen scope rubric

R1 MET: affirmative hosted-email confirmation changes the channel to subscribed; native POST response and authenticated status, lines 77-85.
R2 MET: confirmation time belongs to the independently bracketed confirming request after capture, lines 78-92. The backdated-time mutation fails at the lower-bound assertion.
R3 MET: authenticated evidence, channel status and history agree with both persisted confirmation records and history occurrence times, lines 87-107.
R4 MET: replayed GET and POST cannot replace the original time, consume new consent or create duplicate history, lines 112-119.
R5 MET: retained pending and scanner-safe state, opt-out precedence and once-only handoff controls, lines 28-76 and 108-119.

No live-account item is counted as proved. This rubric covers this round's selected point; it does not claim all of CONT-009 is complete.

## Remaining scope and plan return

The CONT-009 Evidence cell now names the registered shared-kiosk journey and its timestamp reconciliation. Its Gap distinguishes the remaining SMS confirming-request-time proof. Existing Gap entries for pending marketing exclusion, direct subscription without confirmation, preview and HEAD behavior, suppression, inactive identity and operator-recorded exact authenticated SMS replies remain unchanged. Preserving these legacy Gap entries makes no new judgment about carried proof outside this round.

The planner-held SMS timestamp and complete authenticated-reply qualification remain held on owner Twilio A2P and US carrier registration, SMS transport and qualification. Inactive-identity proof is outside this selected point and remains unproved. Existing provider, device, account and cross-seed or Base prerequisites remain named. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold are unchanged; no third repair was attempted. Existing rer adoption and release prerequisites are unchanged. No additional next clause touching these files was selected in the supplied extract.

Plan return: CONT-009 selected acceptance-2 hosted-email timestamp proof completed; PARTIAL to PARTIAL; retain the SMS and inactive-identity remainder. No Mac plan file was read or edited. PLAN.md contains the full executed plan. PROBES.md contains the public-door observation.

## DONE riders and pre-ready review

1. PARTIAL for the full clause; selected hosted-email outcome MET by the registered journey. All unclaimed outcomes remain in Gap.
2. PASS for this change: populated real D1 and native routes; scanner and replay refusals plus the affirmative path remain asserted. The wrong-time mutation is killed at line 91.
3. Exact-SHA local registered journey PASS. Branch Verify receipt is recorded below; no earlier-SHA CI is substituted.
4. PASS: final candidate journey and typecheck rerun after restoring the mutation. Build-relevant bytes are unchanged from the passing build.
5. PASS: CONT-009 already cites BASE-MAIL-001 in the clause metadata register. No new provider duty or inheritance claim.
6. PASS within the cloud protocol: honest PARTIAL Gap, evidence path resolves, generator write and check succeeded. Main's generated views were restored and are intentionally absent from this product diff. Judged-from lines for other judgments were retained; no DONE judgment is claimed.
7. PASS: no acceptance sentence, ID mapping or rider changed.
8. Scoped PASS: consent remains restricted before affirmative confirmation and replay changes nothing. No operator authority path changed. Inactive-identity proof remains unclaimed.
9. PASS: no live SMS, hosted-provider or legal boundary is represented as qualified.
10. Not applicable: no new policy default or ct ruling needed.
11. Pending guarded landing. Main equality, full-history COMPLETE publication scan with zero findings and exact landing Run site are the Mac lander's duties. This cloud run does not claim those receipts.

Pre-ready review: the selected user-visible outcome is performed and asserted through the public door, and a wrong result is detected. No existing assertion was weakened. Replay safety is explicitly tested; authority and erasure code and CONT-013 holds are unchanged. There are no UI changes, new controls or changed screens, so no new 390-width visual proof is claimed. The existing journey asserts at 1440. No email literal or provider-shaped key was added. Every unpublished commit author and committer is fleet identity with no trailers. The source lock is fresh. Publication scanning and landing remain with the Mac fleet.

## Mechanical receipts

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, restored origin/main views; ledger=none exit=0.

On the restored candidate, contract-docs check exits 1 only because ACCEPTANCE.md differs from generated content. This is the mandated generated-view exception. VIEW-RESTORE-CHECK.json and its log preserve the exact result. The generated views were never committed.

No repair rounds, migrations, provider dispatches, PRs or production deployments. The full plan, actual non-secret receipts and logs are in this packet. Product custody and report-only evidence publication are separate.

## CI and terminal custody

Main exact-SHA Verify 42137089578 and Run site 42137089740 succeeded on cc6321c2372d631d9607df9af8ad1dd9f7878e84. MAIN-CI.jsonl is the actual discovery response.

Candidate exact-SHA push Verify 42150859973 completed with failure only at job 127673537468, Check generated contract documents: “ACCEPTANCE.md: generated content differs; run contract-docs write.” Shards were skipped and the final verify aggregation consequently failed. This is the explicitly permitted generated-view exception, not a product test failure. The same command on the exact candidate locally produced that same exit 1 and diagnostic. The freshly generated views passed check before being restored. No repair, rerun or dispatch was performed. CI.json, VERIFY-JOBS.jsonl, CANDIDATE-CI.jsonl and VERIFY-FAILED.log preserve the receipt; the failing-job log excerpt excludes environment metadata. Four GitHub CLI calls were used: main discovery, candidate discovery, completed-run job diagnosis and the single failed-job archive read. No repeated polling. The product is ready for the guarded lander under the generated-view exception; its actual Verify conclusion is not represented as success.

Product push result is in PUSH.json and PUSH.log. Evidence publication will use only refs/heads/evidence/sd-mango-c-f65 and explicitly selected regular packet files. It does not signal DONE, acceptance or landing.
