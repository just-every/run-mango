# AUD-010 selected proof completed

Tag: sd-mango-c-f107. Repository: just-every/run-mango.
Branch: cloud/sd-mango-c-f107.
Candidate: 248d34085ad753dd3f1c9a9f25f2d45f45a123fe.
Starting main: 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e.

AUD-010 remains PARTIAL → PARTIAL. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING. This run completes the two planner-selected POINTS: campaign-list derivation for acceptance 1, and the complete description of one independently specified nested inclusion and custom-exclusion fixture for acceptance 2. It does not claim the entire clause is DONE.

## Result and proof

The existing production formatter, read projection and campaign-row UI already implement the selected behavior. No production source change was needed. A new focused journey in `tests/audience-controls/audience-summary-journey.ts` is registered by `tests/audience-controls/segments.spec.ts` as “[AUD-010] campaign list and editor explain the saved nested inclusion and custom exclusion”. The existing identity-data Verify selection already runs that spec; no workflow changes were made.

The journey saves native rules with an outer all group, an inner any group, an order-count comparison and 90-day lookback, a scoped contact property, a ZIP condition and a custom ZIP exclusion. It deliberately submits misleading audience prose. The summary assertions independently name the semantic field, comparison, value, scope, window and group relationships; they never call the production formatter or compare the entire result to a canned expected sentence.

The fixture contains eight independently known native contacts and recorded commerce facts. Customers 1 and 5 are the exact candidates. Initially, the custom exclusion removes customer 1 and leaves customer 5. After editing the numeric predicate and exclusion through the real controls, saving and reloading, customer 1 is the sole eligible contact. Individual contact intersections through the audience API prove membership even though both stages have equal overall totals.

The journey checks saved structured rules through authenticated review readback, the collection's `audienceSummary`, and the actual campaign row. It reconciles the field and comparison labels shown by the editor, verifies the changed saved meaning after reload, and proves zero approval receipts, frozen candidates, recipients and campaign-dispatch commands. No marketing handoff occurs. The condition assertions run at 1440. The candidate's editor and campaign row are captured once at both 1440 and 390. Screenshots contain synthetic fixture data only.

- Acceptance 1 selected point: `tests/audience-controls/audience-summary-journey.ts` lines 75–81 and 88–90 compare the authenticated collection with the real campaign row; lines 108–109 repeat after edit and reload.
- Acceptance 2 selected point: lines 14–20 define the independent fixture, 29–38 check semantic scope, 47–56 reconcile exact identities, 59–73 reconcile editor labels and values, and 92–99 save and reopen the changed predicates.
- Authority preservation: lines 40–44 retain draft state; lines 83–86 check approval, recipient and dispatch absence, repeated after editing and final reads.
- Browser proof: lines 103–112 capture the editor and list at the two required widths. The final captures were produced on the clean candidate commit.

PROBE AUD-010 acceptance-1: native saved nested rules, authenticated collection and actual campaign row -> complete selected summary, exactly two candidates, sole eligible customer 5, no approval or delivery authority.
PROBE AUD-010 acceptance-2: real numeric-predicate and exclusion edits, save and reload -> saved all and any matching, editor labels, values, comparison and 90-day window survive; sole eligible identity becomes customer 1 without dispatch.

## Checks and custody

- Full touched segments spec: 2 passed in 3.3 minutes. The original audience, frozen-recipient, merge and contact-history registration is unchanged and passed.
- Focused registered AUD-010 journey on the clean exact candidate: 1 passed in 38.8 seconds including startup and teardown; test body 34.8 seconds.
- Typecheck: passed.
- First-party public command check: passed, exit 0 with no stdout.
- Contract generator write, then check: passed. The generated views were restored whole from main and are not committed. The restored-view check then reports `ACCEPTANCE.md: generated content differs; run contract-docs write.` with exit 1, as expected under the cloud handoff contract.
- Source lock: regenerated after staging the new journey, then checked successfully, including after the fresh-main reconciliation. The new journey is covered. Source lock SHA-256: 330ac7f22c6ae05a962c4ba4b9fcd10c638847b705aed3fea1370fa37ecde9ff.
- Migration ledger: not applicable; no migration changes.
- All 316 parent Status IDs remain. Parent and candidate each contain 490 Markdown table rows. No acceptance sentence or status count changed. No generated views are committed.
- Added-text review found no email-shaped fixture literal or prose token pretending to name another repository. Imports, real API routes and actual file paths are retained normally. Full publication scanning remains the Mac lander's responsibility; no cloud COMPLETE scan is claimed.
- Test registrations: affected spec 1 → 2; main configuration 50 → 51. All configured browser listings total 89 → 90, including some overlapping slow selections. No test was deleted, skipped, narrowed or moved behind a viewport or environment condition.
- The first new-journey attempt failed because its no-authority assertion queried a nonexistent `async_jobs` table. The assertion was corrected to inspect the existing command-emission fixture door. Subsequent focused and full touched runs passed. This was local test construction, not a CI repair.
- Fleet commit identity and cleanup hooks were active. The pre-push log examined all candidate commits, including side parents: one fleet-authored and fleet-committed candidate, no trailers. The guarded product push succeeded on its first attempt. The remote branch equals the full candidate SHA. No PR is required for this repository's push Verify entry point.

MECHANICAL lock=`node scripts/edition-authoring/cli.mjs lock` followed by `node scripts/edition-authoring/cli.mjs check` exit=0; views=`node src/base/contract-docs.mjs write` followed by `node src/base/contract-docs.mjs check` exit=0 before required restoration; ledger=none.

Baseline main Verify 42195975560 and Run site 42195975538 were completed successfully on 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e. These are baseline receipts only. Candidate push Verify 42209171502 was discovered queued on the exact candidate at 11:18:05 UTC. Its later observation is recorded below and in `CANDIDATE-CI.jsonl`. No other-SHA run is used as candidate evidence. GitHub API calls so far: baseline discovery and candidate discovery; no dispatch or rerun.

## Remaining scope and plan update

Only the AUD-010 plan row changes: retain PARTIAL, add the focused campaign-list and nested-fixture evidence, and narrow the proof gap honestly. The selected POINTS are closed. Acceptance 1's complete review, approval-check, scheduled-page and audience-snapshot derivation matrix remains open. Acceptance 2's other condition, comparison, value, lookback and editor-label cases remain open. These are native engineering and proof remainders, not an account blocker. They were explicitly omitted by the planner-selected bounded slice.

No real-provider qualification is claimed. Carried builder, review and scheduled evidence is unchanged. CONT-013's SPLIT and NEW-1 disposition, original fix-1 hold, prohibition on a third FIX or a follow-up-only builder, provider, device, account, cross-seed and Base prerequisites, rer adoption and release requirements remain unchanged. No additional planner target or visual work was taken. There is no blocker to handing off this selected product proof.

`PLAN.md` contains the complete executed plan. `RECEIPT.json` records actual commands, exit codes, provenance and artifact hashes. The accompanying full touched-run and exact-commit logs are actual non-secret outputs, not reconstructed passing output.

## DONE-RIDERS review and pre-READY checks

No DONE claim or judge request is made. Rows below explain the selected proof's limits rather than certify the whole clause.

1. Selected outcomes PASS locally through the public doors cited above. Whole-clause derivation and condition matrices remain open, so AUD-010 stays PARTIAL.
2. PASS: populated native contacts, individually intersected identities and independent semantic expectations. The two equal-count stages select different known contacts.
3. Registered in push Verify via the existing segments spec. Exact-SHA CI observation is separate below; no unrelated run is substituted.
4. PASS locally: focused journey and four captures rerun on the clean exact candidate. The full touched suite uses identical source and test bytes.
5. No inherited duty or clause citation changed. Existing Base obligations remain with their existing clauses.
6. PASS for honest PARTIAL metadata and local generation. The historical judged-from statement is not rewritten to imply a new ct judgment. Generated-view freshness after restoration is deliberately deferred to the lander.
7. PASS: acceptance text is unchanged; no ruling, rider or original obligation is removed.
8. No new permission or mutation authority. The selected journey proves draft reads and edits create no approval, recipient or dispatch authority. No correction or refund feature is touched.
9. PASS for boundary honesty: only native local behavior is claimed; no provider, legal or hosted qualification is inferred.
10. No new custody, consent, spending or authority policy default was adopted.
11. Pending fleet landing: main still names the baseline, and the Mac must enforce exact-SHA Verify, complete full-history publication scan with zero findings, and Run site after landing.

Pre-READY: selected user-visible outcomes have behavior assertions; no pre-existing assertion was removed or weakened; production authority, erasure and replay paths are unchanged; no UI controls or styles were added, and the relevant screens were inspected at 1440 and 390; source lock is fresh. Candidate Verify and the Mac publication and landing gates are reported honestly, not presumed successful. No browser, server or local command remains intentionally running at handoff.

## Final exact-SHA CI observation

At 11:23:13 UTC, push Verify 42209171502 completed with conclusion failure on 248d34085ad753dd3f1c9a9f25f2d45f45a123fe. Job 127863323025 (Build and public command checks) failed only `node src/base/contract-docs.mjs check`, reporting `ACCEPTANCE.md: generated content differs; run contract-docs write.` and exit 1. Job 127863402652 is the dependent aggregate check, failing because the build failed and shards were skipped. Plan passed. The job metadata and each failed job's archive log were read once. Both archive commands succeeded. There is no other independent failure in this run, no workflow dispatch or rerun, and no repair round.

The same generator command on the clean exact candidate reproduced the same expected difference with exit 1; write followed by check had already passed before restoring the generated files. The explicit cloud generated-view exception permits READY for this candidate. The Mac lander must generate and check the views, rerun its exact-head gates and scan before landing. CI is reported as failed under that exception, never as an ordinary green run. Final GitHub command budget: 6 of 10 calls, with one watcher and 308 seconds between discovery and the status poll. Workflow step environment blocks are omitted from the public diagnostic files; commands and observed failure text are retained.

No product blocker remains for the selected POINTS. Product branch is pushed; the separate evidence ref is transport only. The clone will be removed only after evidence publication and hash-verified return succeed. The complete plan, receipts, actual logs and screenshots remain outside the clone.

READY branch=cloud/sd-mango-c-f107 head=248d34085ad753dd3f1c9a9f25f2d45f45a123fe
