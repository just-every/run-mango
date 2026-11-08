# sd-mango-c-f109-rb2 replay report

Repository: just-every/run-mango
Product branch: cloud/sd-mango-c-f109-rb2
Product head: 7b690e39e22deb1c31ad26e60670dcaa632b7739
Fresh main used: 6269d1bd1e7fbc2e28620b38021a7d52f145caa9
Original candidate: 42a41d35cf39a6ffbf1cb8f7b572383640c3ca09
PR: none; the brief requests a branch replay and fleet landing, and this repository has no additional PR landing rule.
Landing: not claimed. No default branch or other product branch was pushed.

## Assignment and plan

Replay the original DESIGN-014 bounds-proof candidate onto current main without adding behavior, tests, clause judgments or hold releases. The complete execution plan is in plan.md.

The clone used git clone --filter=blob:none with no depth limit. The fetched original candidate's git rev-parse HEAD printed exactly 42a41d35cf39a6ffbf1cb8f7b572383640c3ca09. Main was 101 commits ahead, rather than the brief's approximate 88. The only candidate commit was rebased onto fresh origin/main; the original candidate branch and rb1 were not modified or reused.

## Mechanical replay

CONTRACT.md merged cleanly. An independent line comparison verified that every line outside the DESIGN-014 Status-table evidence/gap row equals fresh main. Every Status cell, ID-MAP and unrelated legacy prose remains main's. DESIGN-014 stays partial; no clause status changes.

The two conflict locations in design-import.spec.ts were adjacent additions: the import list and the refusal-helper call site. Both main's designImportRefusals/importScreens and the candidate's designInputBounds/designInputRecoveryScreens were retained. Main's assertions and test flow remain intact. The bounds helper is byte-identical to the original candidate. No tests were deleted, skipped or weakened.

sources.lock.json was taken from main and regenerated after staging the leased sources. The documented contract generator takes no touched-clause arguments in this repository.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock exit=0; views=node src/base/contract-docs.mjs write && node src/base/contract-docs.mjs check exit=0

The generated views were then restored whole with git checkout origin/main -- ACCEPTANCE.md docs/CLAIMS.md. Neither view was committed. The source lock was regenerated last and its check passed; the sole replay commit contains its fresh lock. A check against the restored main views returns exit 1 with only “ACCEPTANCE.md: generated content differs; run contract-docs write.” This is the explicit lander-generated-view case.

Only these product files changed:
- CONTRACT.md (DESIGN-014 evidence/gap row only)
- tests/campaign-authoring/design-import.spec.ts
- tests/campaign-authoring/design-input-bounds.ts
- sources.lock.json

## Local proof

The supplied cloud toolchain was sourced in each command shell. Setup ran through cloud_run timeout 600 npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive and exited 0. It installed frozen dependencies, built the app and completed the local owner setup. No deployment or external provider account work was performed.

The affected journey ran through cloud_run timeout 300 pnpm exec playwright test tests/campaign-authoring/design-import.spec.ts --workers=1 with MANGO_NO_FIXTURE_SERVER=1 and MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium. The existing browser helper supplies --no-sandbox. Result: 1 passed in 53.1 seconds; the test itself took 51.7 seconds. Assertions ran at 1440. All four refusals and valid unsaved recovery have screenshots at 1440 and 390 (10 PNGs and screens-receipt.json).

PROBE DESIGN-014 bounds: Import design / selected LayerDoc and PNG / >3 MiB LayerDoc -> “The LayerDoc file is larger than 2 MB. The email body was not changed.”
PROBE DESIGN-014 bounds: Import design / eight groups of 400 children (3,208 total layers) -> named total-layer refusal.
PROBE DESIGN-014 bounds: Import design / 96 nested groups -> named depth refusal.
PROBE DESIGN-014 bounds: Import design / 12,000 nested groups assembled without recursive serialization -> named depth refusal without stack overflow or browser error.
PROBE DESIGN-014 bounds: Import design / existing valid file pair after refusals -> valid unsaved imported body; saved revision unchanged and no approval, recipients or jobs.

Each bounds refusal asserts both selected files remain unchanged, editor and authenticated saved revision are unchanged, campaign stays draft, no uploads or saves occur, and jobs, recipients and approvals remain empty. The existing final save, public image-serving and exact-revision approval assertions also passed. Main's reserved-personalization, compiled-grammar and empty-crop refusal checks passed in the same journey.

Typecheck ran through cloud_run timeout 180 pnpm run typecheck and exited 0. The supplied toolchain retains VM Node v24.19.0 because it is newer than the project's 22.20.0 pin; pnpm was 10.12.4. rer reported project Node 22.20.0 during setup. The newer Node engine warning did not fail checks.

No extra test or runtime behavior was introduced. Proof is local and synthetic; this does not award paid live provider qualification, real provider/device/account acceptance or any carried cross-seed/Base prerequisite. CONT-013 holds and all existing release prerequisites remain unchanged.

## Counts and clause changes

| Scope | Done before/after | Partial before/after | Missing before/after | Total |
| --- | --- | --- | --- | --- |
| Published | 13 / 13 | 97 / 97 | 0 / 0 | 110 |
| Target and push further | 7 / 7 | 101 / 101 | 98 / 98 | 206 |
| All | 20 / 20 | 198 / 198 | 98 / 98 | 316 |

DESIGN-014: partial -> partial. Its evidence/gap description now records the candidate's bounds refusal and recovery proof. Every other Status row is unchanged.

## Product custody and CI

The one replay commit has Run Edit Run fleet <fleet@runeditrun.com> as author and committer, no trailers and no skip-CI marker. The required full-range audit was printed before the push. A follow-on audit script initially had a field-count assertion error; its corrected independent check confirms the same fleet identities, absent trailers, exactly one candidate commit and clean product tree (identity-receipt.json).

The product branch was pushed once through cloud-push.py, successfully on attempt 1. No published history was rewritten, no force push was used, and main was not pushed. The complete non-secret push receipt is push.log.

Exact-SHA Verify run: 42474638817
URL: https://github.com/just-every/run-mango/actions/runs/42474638817
Exact head: 7b690e39e22deb1c31ad26e60670dcaa632b7739
CI result: completed/failure on the exact product SHA. The only underlying failure is generated ACCEPTANCE.md drift; READY is awarded under the user's explicit generated-view-only exemption. This is not a claim that the raw workflow concluded success.

The cloud cannot run the fleet's Mac publication scan or land the candidate. READY custody, when awarded below, relies on the stated generated-view exemption where applicable and never claims landing.

## Evidence and cleanup

Actual non-secret reports, receipts, probe output, mechanical output, product diff and candidate screenshots are retained in the task packet outside the product checkout. Only explicitly selected regular files will be published to refs/heads/evidence/sd-mango-c-f109-rb2; no evidence is committed on the product branch.

After evidence publication and final provenance capture, remove the disposable product clone and its node_modules; the terminal message reports the observed cleanup outcome. No INBOX.md or STATE.md file was read or written.

Blockers: none. No semantic decision was needed. CI has only the explicitly exempt generated-view failure.


## Exact-SHA failed-step evidence

REST run status confirmed completed/failure on 7b690e39e22deb1c31ad26e60670dcaa632b7739. The job listing reports plan succeeded. Build job 128713134232 failed solely at “Check generated contract documents”; its source-lock, install, build and later steps skipped. Final verify job 128713189705 failed at “Require the selected coverage and its proof” because build failed; shard, light and proof jobs skipped. There is no second underlying assertion failure. Complete selected REST evidence is in discover.log, status.log and jobs.log.

The one-time gh run view 42474638817 --repo just-every/run-mango --job 128713134232 --log-failed read succeeded. The actual failure is exactly “ACCEPTANCE.md: generated content differs; run contract-docs write.” with process exit 1. No other underlying failure is reported.


## Final CI disposition and custody

The required one-time archive read for dependent verify job 128713189705 also succeeded. Its selected-coverage assertion failed because BUILD=failure, as the workflow and job listing show. The build archive identifies only generated ACCEPTANCE.md drift; other jobs needing that check skipped or failed with it. This meets the prompt's explicit generated-view-only exemption. No workflow was dispatched or rerun and no empty commit was made. The Mac lander must write the views from merged CONTRACT.md and run Verify again before landing.

Exactly five gh invocations were used (discovery, exact-SHA status, job listing and one archive read for each failed job), with at least 300 seconds between every invocation. github-calls.json records the command, timestamp and exit of every invocation. No blocked log download was retried. The packet's failed-job logs retain all failed-step commands/assertions and omit unrelated runner environment listings; the original archives remain outside the published packet.

READY branch=cloud/sd-mango-c-f109-rb2 head=7b690e39e22deb1c31ad26e60670dcaa632b7739

Product custody is separate from evidence transport, acceptance and landing. Evidence publication alone grants none of those signals. No hold or release prerequisite changed.
