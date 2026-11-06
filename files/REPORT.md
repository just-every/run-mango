# Mango DESIGN-002 original f36 FIX1

Tag: sd-mango-c-f36-fix1.
Repository: just-every/run-mango.
Product branch: cloud/sd-mango-c-f36-fix1.
Product head: 78e546c4cab69678976d89404228336ac8a1a001.
Main reconciled before the candidate push: cc6321c2372d631d9607df9af8ad1dd9f7878e84 (no newer main; merge reported already up to date).
Original read-only lineage: cloud/sd-mango-c-f36 at 1ddaedc4c0e068eef003690336e2eab720ade1d2.
PR: none created; the repository's instructions do not require one for this lane's candidate delivery. Main was never pushed or fast-forwarded locally.

## Result

The failed drawing run now shows the existing positive layout estimate above its retained candidates and their paid selection controls. `Failure` reuses `layoutEstimate()` and the existing `muted-copy` style. No new provider call, purchase policy, fallback, navigation, unrelated copy, design generation or homepage change was added.

The existing registered design-generation journey now requires the latest failed run's own positive estimate before layout selection and after reload. Earlier panels cannot satisfy its region-scoped locator. It verifies that displaying/reloading the estimate performs no conversion or layout purchase, explicit selection performs one, and reopening that retained design performs none. Existing explicit 402 refusal, retry idempotency/cost assertions and newer DESIGN-003/walk2 persistence/provider assertions remain intact. Original relevant walk1 positive-estimate/pre-purchase assertions were retained in the surviving journey. There is no new test registration. Frozen A1 brief/count probes and unrelated successful probes were not repeated.

## Before and after

The supplied retained original trace observation from judge ct-judge-mango-design002-20261105-1932 (ended 2026-11-06T00:05:12Z) at 1ddaedc4c0e068eef003690336e2eab720ade1d2 reports panel0 `layout-estimate-present=false`; earlier panels had estimates. This observation is quoted from the assignment; the original trace was not shipped to this VM and was not newly downloaded or reproduced. The original source has the matching omission in failed-without-choice `Failure`.

On the changed candidate bytes, the existing native journey passed and captured the latest failed-drawing panel with a positive estimate (about $0.05 in this fixture) before the Use this design controls. Captures at 1440 and 390 are `failed-drawing-1440.png` and `failed-drawing-390.png`; both were visually inspected. Assertions run at 1440; 390 is screenshot proof only.

Contract counts are unchanged:

| Scope | Before done/partial/missing/total | After done/partial/missing/total |
| --- | --- | --- |
| Published | 13 / 97 / 0 / 110 | 13 / 97 / 0 / 110 |
| Target and push further | 7 / 101 / 98 / 206 | 7 / 101 / 98 / 206 |
| All | 20 / 198 / 98 / 316 | 20 / 198 / 98 / 316 |

Clause status changes: none. DESIGN-002 remains PARTIAL. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to reconciled main. Current-main gap/provenance wording remains untouched. No original stale counts or unaccepted DONE row was imported.

## Plan and execution

The full initial plan is in PLAN.md. Executed steps: inspect current and original source; add the narrow missing estimate; strengthen the existing journey without losing newer assertions; run native journey/typecheck/build; generate/check and restore views; reconcile main; regenerate/check the source lock last; audit every candidate identity/message; make the first real commit and push through the fleet guard; observe exact-SHA Verify; publish a report-only evidence packet; preserve a verified bundle outside the disposable checkout and remove owned processes/checkout after transfer.

The two append-only product commits change exactly three leased files: run-notices.tsx, design-generation.flow.ts and sources.lock.json. The lock changes only the two edited files' hashes. Product diff: 47 additions and 6 deletions, including the generated lock hashes. No contract, workflow, registration, policy or other product file changed.

## Local checks and byte custody

All requested local affected checks passed:

- Fleet `rer setup --owner-email fleet@runeditrun.com --non-interactive`, exit 0.
- Native registered `tests/campaign-authoring/design-generation.spec.ts`, one test, 3.3 minutes on the final candidate bytes, exit 0. It executes walk0/walk1/walk2 through native Worker/D1/R2/queue/browser paths. Only the paid 12ui network edge is replaced by the existing fake support; no live provider was called or bought from.
- TypeScript `pnpm run typecheck`, exit 0.
- `npx -y @runeditrun/rer build` through cloud_run, exit 0.
- `node src/base/contract-docs.mjs write` and `check`, exit 0; write reported zero changed documents. ACCEPTANCE.md and docs/CLAIMS.md were restored whole from origin/main; check after restoration also passed. This repository has no touched-clause flag on its documented write/check command.
- Source lock regeneration LAST: `node scripts/edition-authoring/cli.mjs lock`; then `check` and `verify-base --offline`, all exit 0. Offline Base verification establishes local bytes against recorded hashes, not upstream/provider acceptance.
- `git diff --check`, exit 0; contract/view equality to main checked; every candidate author/committer/full-message trailer audit passed.

Actual commands, results and SHA-256 byte bindings are in checks-receipt.json and the selected actual logs. The final native journey, typecheck and contract/source checks executed on the final changed working tree immediately before its follow-up commit and push, and their bytes match the exact final candidate. The build passed on the first candidate; the follow-up changes only two screenshot scroll calls and the journey hash, leaving all UI/build source inputs identical. Only sources.lock.json was regenerated after the touched-source edits. This report does not mislabel a pre-commit run as an execution begun on the committed SHA. Hosted Verify supplies exact-SHA CI independently. Actual toolchain was Node 24.19.0, pnpm 10.12.4, system Chromium /usr/bin/chromium with --no-sandbox, using the prescribed toolchain source/cloud_run wrapper.

## Publication and CI

The first real commit was pushed immediately after local checks, using the required cloud-push guard. Both author and committer are Run Edit Run fleet <fleet@runeditrun.com>; there are no co-author trailers. No history was rewritten, no force push/default-branch push/CI dispatch/rerun occurred. Product-push receipt and identity audit are selected separately from report-only evidence publication.

First-candidate Verify run 42138649162 (https://github.com/just-every/run-mango/actions/runs/42138649162), head d61b592e46e79c10eeb64a1672961c167a9fcb87, completed FAILURE. Build and contract-view checks passed. The authoring shard passed the new estimate assertions but failed on an unnecessary screenshot scroll at design-generation.flow.ts:412 when the panel DOM was replaced. The append-only follow-up removes both pre-full-page-screenshot scroll calls and retains every assertion; its native journey then passed. The campaigns shard independently failed presend-checks.journeys.ts -> email-size.flow.ts:79: approval expected 200, received 409 due to unresolved shop.example.test and sender-provider/DNS/SPF/DKIM/DMARC blockers. This is outside the leased estimate fix. Aggregate verify failed because SHARDS=failure. This is a real runtime red, not a generated-view-only exception. Final-candidate observation is recorded in CI-RECEIPT.json. The first API lookup accidentally used an incorrect SHA and returned no runs; it contributes no evidence. The second lookup used the actual full candidate SHA and discovered this run. All calls count against the ten-call budget; subsequent status polls respect 300 seconds from discovery/status observation. Completed-run failure diagnostics were fetched once per failed job, within the same budget. No other SHA or original candidate42089887292 is used as new-source runtime green.

## Remaining full-clause custody

This is ONE normal guarded original f36 family correction, lifetime FIX1of2, not a budget reset or terminal-record conversion. A1 editable brief/counts and A3 progressive retained candidates remain frozen MET. The changed-source estimate behavior is builder evidence for A2; independent qualification and the original-family full inherited-rider Opus re-gate remain the lane's work. This builder has not judged its own clause or spawned a gate.

Original f36 and f36-land CT protections remain ACTIVE; accepted sources EMPTY. All source/stack/review/provider/adoption/CONT-013/release holds remain. No source acceptance pin, hold release, full-clause DONE award or landing is claimed. Final merged generator/counts/provenance/lockLAST, actually executed full-green exact-final runtime Verify, COMPLETE full-history NEW0, guarded main equality and exact-main Run site remain mandatory before award. C/F/G next-touch notes are outside this correction.

## Evidence and recovery

The selected packet contains actual reports, receipts, logs, product patch and synthetic screenshots. It excludes credentials, environment dumps, synthetic runtime/session state and raw browser trace traffic. The raw local native trace remains outside the selected public packet. Evidence goes only to refs/heads/evidence/sd-mango-c-f36-fix1. Its publication is report transport, not product READY, acceptance or landing.

Verified recovery bundle outside the clone: /home/agent/rer-consolidation/work/sd-mango-c-f36-fix1/candidate.bundle, SHA-256 4f3de137e80fd6f12c13d34b5b0118b554b18f0af0d316d039575aabdcdd4d3e. Git bundle verify passed and reported complete history as represented by this shallow task clone. The bundle is recovery data only. Terminal publication and cleanup details are in CUSTODY-RECEIPT.json.

The authoring log archive command `gh run view 42138649162 --repo just-every/run-mango --job 127633698067 --log-failed` failed once with `failed to get run log: zip: not a valid zip file` (HTTP status not supplied). It was not retried. Successful sibling archive reads left a valid complete run archive in gh's local cache; authoring execution diagnostics were extracted locally without another request. Setup/environment blocks were excluded from selected logs. Eight of ten GitHub invocations had been spent before final-candidate observation; the remaining two are reserved for the final candidate. No blocked blob downloads were retried.

Final-candidate Verify: run 42140459473, https://github.com/just-every/run-mango/actions/runs/42140459473, exact head 78e546c4cab69678976d89404228336ac8a1a001. Call 9 discovered it still in progress; the one remaining call is reserved for a final status after at least 300 seconds.

## Terminal candidate result

Exact final-source Verify run 42140459473 completed SUCCESS on 78e546c4cab69678976d89404228336ac8a1a001, observed by the tenth and final permitted GitHub invocation after the 300-second interval. This is ordinary exact-SHA push Verify success; no generated-view exception was used. The first candidate's screenshot-scroll failure is superseded by the green append-only follow-up. The first run's independent campaigns DNS/sender-evidence failure did not prevent final Verify success; no out-of-lease code was changed to address it.

Candidate custody: READY, branch cloud/sd-mango-c-f36-fix1, head 78e546c4cab69678976d89404228336ac8a1a001. PR: none. CI runs: first 42138649162 FAILURE; final 42140459473 SUCCESS. Builder blockers: none. No further API calls, dispatches or reruns were used. The completed changed-source native journey and exact-final runtime Verify do not award the full clause, acceptance pins or landing; the original-family independent affected qualification and frozen A1-A3/full inherited-rider Opus re-gate remain mandatory for the lane.

Both product commits and both pushes are preserved. The first local journey passed in 3.0m; the follow-up native journey passed in 3.3m with every estimate and purchase assertion retained. Final product file byte bindings are in checks-receipt.json. Dependencies were removed and owned test browsers/runtimes exited before report transport. The disposable source clone is removed immediately after evidence publication, retaining the public packet and verified final bundle outside it.
