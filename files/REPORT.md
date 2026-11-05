# sd-mango-c-f58 results

CONT-010 remains PARTIAL. This round closes the selected independent phone-only CSV validation and per-rejected-row semantic reason readback points. Counts remain 18 DONE, 200 PARTIAL and 98 MISSING, with 316 total clauses. No acceptance sentence or other clause status changes.

The new focused helper in `tests/move-in/phone-csv-journey.ts` is called unconditionally by the existing archive journey in `tests/move-in/archive.journeys.ts`. Test registrations are unchanged: one archive registration before and after. No existing assertion is deleted, narrowed or hidden by an environment or viewport condition. No production source, UI, provider configuration, migration, Base pin or workflow changes.

The independent file uses a nonstandard phone header with explicit mapping and no email column. Twelve known valid phone-only rows surround one malformed phone and one missing identity. Fourteen reviewed rows cross the native ten-row batch boundary; a native resume completes the import. Every expected contact is authenticated through exact phone search and detail readback, with persisted identity reconciliation. Every rejected file and row has its expected semantic reason on two native report reads. Both channel statuses remain non-subscribed, and rejected rows create no contact. No consent, confirmation, approval, campaign recipient, campaign dispatch command, email send or SMS send is created. The additional same-file retry and signed-out read and write checks passed in the bounded native probe and retain the same safe boundary.

## Runtime probes

PROBE CONT-010 acceptance-1: authenticated native import preview with an explicitly mapped non-subscribed CSV containing 12 valid phone-only rows, a malformed phone and a missing identity -> 14 input, 12 created, 0 updated, 2 rejected; apply and resume complete at checkpoint 14; exact authenticated contact readback matches every expected canonical phone and both non-subscribed channel states.

PROBE CONT-010 acceptance-3: native import report read twice -> all 14 file and row outcomes reconcile, row 3 names the E.164 country-code requirement, row 5 names the required email or E.164 identity, all 12 valid reasons are empty and both report bodies are identical.

PROBE CONT-010 safety: non-subscribed phone import -> no confirmation evidence, confirmation handoff, approval, campaign recipient, dispatch command or provider handoff. No SMS delivery qualification is inferred.

## Evidence map

- Acceptance 1 selected point: focused helper lines 7–28 supply independent identities; lines 35–55 assert mapping, valid and rejected preview outcomes and no contacts before apply; lines 59–94 assert resume and exact saved contacts through native routes.
- Acceptance 3 selected point: lines 111–129 read the report twice and match each file and row to independent semantic reasons; lines 42–43 and 73–79 reconcile created and rejected totals with exact saved identities.
- Same-file retry and authority boundary: lines 39, 57–58 and 96–109; no-subscription and no-handoff boundary: lines 130–138. The contact and phone snapshots include stable persisted identities and original timestamps, not only response totals.
- Existing archive journey and all carried import evidence remain intact. The added helper uses native production normalization, snapshot, service and report paths; fixtures replace only external network providers through the existing harness.

## Remaining obligations

Acceptance 2 still needs broader canonical-match update and rerun proof beyond this exact same-file phone retry. Acceptance 3 still needs broader created, updated and rejected reconciliation beyond carried evidence and this file. Acceptance 4's full restriction matrix, acceptance 5's named-source attestation and unnamed-file per-row consent, and acceptance 6's undo and SCALE-001 capacity obligations remain named. They are uncompleted native work, not claimed external blockers. This bounded POINTS round does not qualify a full DONE claim.

Twilio A2P and US carrier registration remain owner-held; SMS transport and provider qualification remain unproved. No held secret or provider account was needed for this synthetic import. Provider, device, account, cross-seed and Base prerequisites remain unchanged, as do the prior CONT-013 SPLIT and NEW-1 disposition and original fix-1 hold and the carried release prerequisites. No new policy default or ct scope question is introduced.

## DONE riders and pre-handoff review

1. UNMET for full DONE: only the selected acceptance 1 and 3 points and the phone retry slice have new proof; the remaining native outcomes above retain PARTIAL.
2. PASS for selected scope: independently named contacts and canonical phone values are compared with nonempty native persisted data; rejected rows, unauthorized actions and absent authority are checked.
3. UNMET for an ordinary green Verify proof: the helper is unconditionally called by the existing push-Verify archive registration, and the complete registered journey passed locally on the exact candidate. Verify 42129426543 completed with failure; the failed build step is Check generated contract documents (job 127602057858); the only other failed step is the dependent aggregate gate Require the selected coverage and its proof (job 127602193824). All runtime shards were skipped. This is the explicit generated-view handoff exception, not an ordinary green Verify result. No run from another SHA supplies candidate green.
4. PASS locally: tested relevant file hashes bind the local runtime proof to the candidate. Existing production bytes are unchanged.
5. PASS within scope: CONT-010 retains its existing BASE-INPUT-001 citation. No inherited obligation is added or moved.
6. PASS for partial metadata: the Gap preserves missing work, the generator write and check run locally, and generated views are restored from main as required. The stale generated views on the product branch are left for the lander. The global provenance for unrelated judged clauses is preserved.
7. PASS: acceptance sentences and rulings are unchanged; every parent Status row is retained.
8. PASS for selected authority path: signed-out preview, apply and report requests are refused without contact creation or private report data; the owner can complete the same native import.
9. PASS: the report and Gap retain the SMS and real-provider boundaries. No live-provider, scale, hosted or legal qualification is claimed.
10. NOT APPLICABLE: no consent, custody, spending or authority policy is invented; the existing non-subscription rule is exercised.
11. PENDING guarded landing: the cloud never writes main. Exact-main equality, publication scan and Run site remain the Mac lander's gates. No COMPLETE scan or landing receipt is claimed here.

All new user-visible behavior assertions are in the existing registered native sanity journey; there is no new UI screen or change requiring a design tool. Existing archive browser screenshots are baseline journey output. Erasure and restricted import coverage remains the existing journey's responsibility; this round does not alter those production paths.

## Plan return

The CONT-010 target row gains the phone-only validation and rejected-reason evidence; its PARTIAL status and campaign counts do not change. The remaining Gap is explicit. No plan is rebuilt and no other target is selected. The complete execution plan is the actual `PLAN.md` packet file.

The first local attempt queried a nonexistent `lifecycle_commands` table after its phone readback assertions. That test implementation error was corrected to observe the real campaign queue emissions through the existing harness. It was not a product or CI failure; no assertion was weakened. Subsequent outcomes and exact commands are recorded in the final receipt.

Product pushes and evidence publication are separate. Product custody, full SHA, local command exits, exact-head CI run IDs and transfer provenance are recorded in `receipt.json`. The publication scan cannot run in this cloud and is not replaced by a report or bundle.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock && node scripts/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write && node src/base/contract-docs.mjs check exit=0; ledger=none exit=0. Generated ACCEPTANCE.md and docs/CLAIMS.md were then restored from main; the candidate's restored-view check reports stale ACCEPTANCE.md with exit 1, as required for the lander's generated-view exception.

The final product candidate is `13d24cacb2dffefdfd6cc13a95bac221ee65bc12` on branch `cloud/sd-mango-c-f58`. Its complete registered archive journey passed in nine minutes on that exact SHA, after the independent bounded retry and signed-out probe had already passed in 50 seconds. Typecheck and the first-party command check passed. The product checkout is clean and has full history. There is no PR: push Verify provides this repository's branch entry point.

Final CI: push Verify 42129426543 completed on `13d24cacb2dffefdfd6cc13a95bac221ee65bc12` with the expected generated-view failure and its dependent aggregate gate failure only. The local restored-view check independently reports `ACCEPTANCE.md: generated content differs; run contract-docs write.` The workflow's aggregate gate at `.github/workflows/verify.yml` line 331 requires the failed build to succeed, explaining that cascade. No workflow is changed, no generated view is committed, and no failing runtime test is reported by CI. Four GitHub API calls were used, with one watcher and more than 300 seconds between reads of the candidate run. No dispatch, rerun, PR, main push or publication scan was performed.

The explicit generated-view exception permits READY handoff of this branch-only PARTIAL candidate. The Mac lander must regenerate views, run its full-history publication scan and exact-head gates, and own any main landing. Evidence publication is report transport only and supplies no product acceptance or landing signal.
