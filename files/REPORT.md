# sd-mango-c-f93 results

CAMP-010 remains PARTIAL → PARTIAL. The selected missing native email default-deadline proof is now present. Product branch `cloud/sd-mango-c-f93`, candidate `686a91bec82afcbbeba3f54b7dad1b0afa81d7f4`, pushed successfully with the fleet guard. No PR is needed: branch push invokes Verify. No production behavior, clause acceptance text, homepage, logo, provider configuration or migration changed.

Counts before and after: 20 DONE, 198 PARTIAL, 98 MISSING, 316 total. All 316 parent Status rows and all 490 table rows remain. The only plan row changed in this report is CAMP-010: acceptance 1 gains native email omitted-deadline proof; the row remains PARTIAL. No Mac plan or inbox was accessed or written.

## What the proof establishes

`tests/campaign-authoring/step-deadline.spec.ts`, test “[CAMP-010] native email steps without send-by fields retain local day-end deadlines across daylight saving”, lines 15–90, is registered in the existing authoring verification pack in `scripts/verification/plan.mjs`. It reuses the existing `browser-runtime.mjs` without modifying its fixture authority. One registration covers one scheduling behavior, with three calendar cases inside it.

The journey creates a real draft through the authenticated native API. Its PATCH supplies localScheduledAt and America/New_York for each email step, and supplies neither sendByAt nor localSendByAt. Independent expectations are literal UTC instants, not results from the production scheduling helper:

| Local send | Expected UTC send | Expected UTC send-by |
| --- | --- | --- |
| 2032-01-15 00:30 | 2032-01-15 05:30Z | 2032-01-16 04:59Z |
| 2032-03-14 00:30 | 2032-03-14 05:30Z | 2032-03-15 03:59Z |
| 2032-11-07 00:30 | 2032-11-07 04:30Z | 2032-11-08 04:59Z |

The transition cases begin before the offset changes and end after it. A constant-duration deadline cannot match these cases. The test compares save response, authenticated campaign detail and review responses, exact persisted step count/order/channel/zone/instants, and repeated reads. Lines 33–56 and 82–84 reject a missing or wrong default. No mutation run is claimed.

The browser uses Asia/Tokyo independently of the saved zone. At 1440, the journey asserts each reopened local send, local deadline and zone, reloads, leaves and reopens the review, and repeats the assertions. It reloads the same saved screen at 390 and captures it. The two PNGs are full-page captures at those viewport widths. No product UI was changed; the deadline fieldset uses labeled native controls and text buttons, with no icon-only product control added.

Before and after all reads, the campaign and revision remain draft, and recorded approvals, recipient steps and domain jobs are empty. The fixture refuses marketing sends and records domain jobs; absence of dispatch authority is observed through its existing state door.

PROBE CAMP-010 acceptance-1: authenticated native PATCH with local scheduled times and IANA zone, both send-by fields omitted → ordinary and both DST local 23:59 deadlines persisted, retained through repeated detail and review reads and reopened controls; no approval, recipients or dispatch jobs.

## Local verification and exact-head receipts

The focused registered spec passed on the exact committed candidate: 1 passed in 33.7 seconds, with a clean checkout before and after. See `FOCUSED-RECEIPT.json` and `FOCUSED-SPEC.log`. The final precommit run also passed. An earlier local capture failed solely because a screenshot locator matched both the outer and inner fieldsets; it reached all schedule assertions first. The final test uses full-page screenshots. This was a test authoring correction, not a production repair or a CI repair round.

Typecheck and the first-party command check pass on the committed candidate. Node v24.19.0 satisfies the seed's Node 22-or-later runtime requirement; pnpm is 10.12.4. The package engine warns about its exact 22.20.0 declaration. Setup used the supplied cloud toolchain and child subreaper. Browser execution used system Chromium with no-sandbox. All started fixture servers and browser contexts closed.

MECHANICAL lock=`node scripts/edition-authoring/cli.mjs lock`, then `node scripts/edition-authoring/cli.mjs check` exit=0; views=`node src/base/contract-docs.mjs write`, then `node src/base/contract-docs.mjs check` exit=0; ledger=none exit=0.

The new test was staged before the final lock regeneration, so its bytes are included. Exact-head lock check also passed. Generated ACCEPTANCE.md and docs/CLAIMS.md were restored from origin/main, and neither was committed. The first-party check resolves contract evidence paths. No assertions were removed, narrowed, skipped or gated by width. Main Playwright registrations increased from 49 to 50; all listed push Playwright configurations total 82, previously 81, with existing assertion scripts unchanged and the 200-test ceiling respected. No permanent pin tests or duplicate tests were added or removed.

## CI and publication custody

Exact candidate Verify run 42192413695, event push, completed with conclusion failure. Job 127807464852 failed only “Check generated contract documents” with:

> ACCEPTANCE.md: generated content differs; run contract-docs write.

Job 127807548493 is the aggregate failure caused by that build failure; dependent jobs skipped. Both failed-job archives were read once with the mandated gh command. There was no product test failure, retry, workflow dispatch, workflow edit or CI repair. Under this brief's explicit generated-view exception this is eligible for READY; it is not an assertion that Verify was green. `CANDIDATE-CI.json`, `CI-JOBS.json` and `CI-FAILURE-RECEIPT.json` contain the actual results. Five GitHub calls were used in total.

At the starting main `5f740dc8cd6624d68df11cd55e56e317e5f6bc96`, recorded push Verify runs 42183651100, 42181327459 and 42179839411 were successful; Run site 42181327367 was successful. The final fetch and rebase found the branch already current before its first commit. This task never pushed main, force-pushed, rewrote published history or created a PR. Fleet identity and absence of forbidden co-author trailers were checked across the entire candidate range before the guarded push.

Cloud publication scan was not run, as the cloud landing route assigns that gate to the maintained Mac lander. No COMPLETE scan, main equality, landing, Run site on the candidate, or DONE verdict is claimed. The lander must generate the views, rerun its exact-head gates, scan full history and land through its normal guard. Product custody and evidence transfer are separate.

## Remaining scope and DONE riders

Acceptance 1's other channel and scheduling-door cases remain unproved. Acceptances 2 and 3 still require their complete recipient deadline skip, named reason and no-late-dispatch matrix. SMS transport and qualification remain held on owner Twilio A2P and US carrier registration. Existing expiry evidence and reason terminology are unchanged. CAMP-006's explicit-instant and mismatch entry is untouched. CONT-013's SPLIT and NEW-1 disposition, original fix-1 hold and prohibition on a third FIX remain untouched. All provider, device, account, cross-seed and Base prerequisites and existing rer adoption and release requirements remain unchanged. These held obligations are not represented as native proof. There is no blocker to this selected proof publication, and no whole-clause DONE claim.

DONE-RIDERS assessment for this candidate:

| Row | Assessment | Evidence or limitation |
| --- | --- | --- |
| 1 | Not met for whole clause | Selected native default proved at spec lines 33–84; broader acceptance outcomes remain in Gap. |
| 2 | Met for selected point | Three independent expected calendars, populated persisted steps, and exact observed values; wrong default fails the native assertions. |
| 3 | Not met for whole clause | Journey is registered; exact-head local pass exists, but CI stopped on the permitted generated-view check. |
| 4 | Met for selected point | Focused receipt names exact head and clean checkout; screenshots came from that run. |
| 5 | Unchanged | No new inheritance or Base duty claimed. |
| 6 | Honest PARTIAL | Evidence and substantive Gap updated, counts unchanged; generated write and check pass locally, views deliberately restored. No new Judged-from DONE attribution. |
| 7 | Met | Acceptance text unchanged; no rewrite or new obligation. |
| 8 | Met for selected point | Authenticated draft write; repeated readback and state door show no approval, recipients or dispatch jobs. No new authority semantics. |
| 9 | Honest boundary | No provider or legal qualification claimed; SMS prerequisite remains named. |
| 10 | Unchanged | No policy default adopted and no scope request needed. |
| 11 | Pending fleet landing | Candidate stays branch-only; exact-head scan, generated views, guarded landing and Run site belong to the lander. |

Pre-READY checks: the selected behavior has public-door assertions with independent expected values; no existing assertion changed; no new credential, erasure, replay, money or provider path was introduced. Authority remains draft-only. All local touched gates and source lock pass. CI is red solely under the documented generated-view exception. No new email-shaped strings were added to product text or fixtures. Full publication scanning and candidate Run site remain unestablished in cloud. No judge request is posted because CAMP-010 is not being promoted.

The full plan is in PLAN.md. All evidence packet files are explicitly selected for the separate evidence ref, never committed on the product branch. No secrets, held-out gate material, environment dumps, credentials or symlinks are included.
