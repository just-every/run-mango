# sd-mango-c-f97 result

Product repository: just-every/run-mango.
Branch: cloud/sd-mango-c-f97.
Candidate: d0b4463beb507932b050b26d23e7585bd9139eab.
Baseline main: 5f740dc8cd6624d68df11cd55e56e317e5f6bc96.
PR: none; this repository starts Verify on branch push.

AUD-004 remains PARTIAL → PARTIAL. The selected email proof is complete. Clause counts remain 20 DONE, 198 PARTIAL, 98 MISSING, 316 total. The only plan row changed is the selected AUD-004 proof row: terminal email exclusion and no deferral are now exercised; the SMS case and exact default-window boundaries remain open. No acceptance text or policy changed. No production behavior, UI component, homepage, provider pin or workflow definition changed.

## What the journey proves

`tests/go-live/frequency-protection.journeys.ts`, test “[AUD-004] an email frequency exclusion is terminal even after its window expires”, is registered in the existing delivery pack in `scripts/verification/plan.mjs`.

| Selected point | Public doors and proof |
| --- | --- |
| Acceptance 1: terminal email exclusion and named reason | Native consent capture and confirmation create two subscribed readers. Both campaigns are created, saved and approved before any marketing handoff, with the repeat reader queued in both. Native Cron and Queue dispatch send the first letter. Four hours later, the second campaign records the repeat reader as skipped with frequency-window, a terminal timestamp, zero attempts, no handoff timestamp and no provider message ID. The fresh control has one accepted handoff whose edge message ID matches the stored receipt. Lines 15–83 reconcile persisted authority and recipients with authenticated results. |
| Acceptance 1: no silent deferral | The second campaign's deadline remains open for 48 hours after its scheduled send. The journey advances to 26 hours after the first accepted marketing email, renews sender evidence, replays an actually emitted native dispatch command and waits for its consumer completion, then runs Cron again. Every recipient row and result bucket remains identical, and no later reader request or marketing handoff occurs. Lines 86–104 prove this without relying on an expired deadline or expired sender evidence. |
| Visible outcomes | The authenticated schedule page shows Accepted 1 and Skipped — frequency protection 1, with no queued bucket. Assertions run at 1440; the same native results page is captured once at 1440 and 390, lines 107–117. Both images show the named repeat reader skipped for frequency-window and the fresh reader accepted. |

PROBE AUD-004 acceptance-1: native creation, save, approval, Cron and Queue doors with a repeat reader and fresh control -> repeat terminally skipped with frequency-window and zero attempts; fresh control accepted once.

PROBE AUD-004 no-deferral: native dispatch replay and Cron at 26 hours after the first accepted email, renewed sender evidence and still-open deadline -> identical terminal row and result buckets, no delayed reader request or handoff.

## Validation and receipts

The focused journey passed locally on the committed candidate, 1 test in 29.9 seconds, using Chromium at `/usr/bin/chromium` with `--no-sandbox`. `JOURNEY.log`, `CHECKS.json`, `RUNTIME-RECEIPT.json` and the two PNGs retain the actual result. Its earlier development run also passed. An initial launch without the required executable selector failed before the test began; setting `MANGO_CHROMIUM_EXECUTABLE` to the supplied system Chromium resolved that environment error. No product repair or assertion weakening was involved.

Typecheck and `rer check --profile first-party` passed. The enumerated Playwright registrations are 88 → 89 across the existing configurations, including the slow configuration; one coherent public-door journey was added. No existing test or assertion was deleted, narrowed, skipped or moved behind a viewport or branch condition. No cap increase was requested.

Two temporary independent mutations confirm that the new journey catches the relevant broken outcomes. These are builder proof, not CI repair attempts. M1 removes the frequency exclusion; the repeat reader is wrongly accepted and line 68 fails on disposition, reason and zero attempts, exit 1. M2 replaces the terminal exclusion with a retry at the window's end; the reader remains queued and the terminal-settlement assertion at line 52 fails, expected 0 pending and received 1, exit 1. MUTATIONS.json and the individual actual logs retain both results. The source was restored byte for byte to the committed candidate after each run; the final source-lock check passes and the worktree has no product diff.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

The generator wrote the local acceptance view and its check passed. Both generated views were then restored whole from origin/main and are absent from the product diff. The final source lock includes the new tracked journey and verification registration. The lock was regenerated and checked after the last source edit and the final no-op rebase. No migration changed.

The complete parent Status ID set is retained. The source parser reports all 316 clauses; every table row is retained, 490 → 490. The modified old AUD-004 line is replaced, with no dropped row. The candidate diff contains only CONTRACT.md, the new focused journey, the existing verification plan and sources.lock.json. `git diff --check` passes. All candidate authors and committers are the fleet identity; no co-author trailers are present. The first product push succeeded through the required guard, attempt 1 of 5. A final fetch and rebase found main unchanged before the candidate push. Published history was not rewritten.

## DONE riders assessment

This is a PARTIAL evidence improvement, not a DONE request. Each rider is assessed honestly against the selected slice and the remaining clause:

| Rider | Result | Evidence or remainder |
| --- | --- | --- |
| 1 | FAIL for full DONE; PASS for selected email slice | Native journey lines 15–104 cover the selected email outcomes. SMS and exact boundary proof remain open in the Gap. |
| 2 | PASS for selected slice | Real native seeded contacts, populated approvals and recipient rows, one actual allowed control handoff and one terminal refusal. Lines 30–83 and 95–104 inspect their results and network edge requests. |
| 3 | PENDING recorded Verify proof | The journey is in the push delivery pack. Local committed-candidate proof passes. Exact-SHA run 42192705713 is reported separately below; no unexecuted CI journey is claimed as passing. |
| 4 | PASS | Candidate-bound CHECKS.json and unchanged committed source bytes bind the journey and screenshots to the product head. |
| 5 | PASS, unchanged scope | No Base inheritance or receiving-clause duty was added or claimed. AUD-009 and FLOW-014 remain separate obligations. |
| 6 | PASS for partial bookkeeping | Evidence and Gap name the new proof and remaining work. Generator write and check pass locally; generated views are restored under the cloud landing rule. Existing judged provenance is preserved; no new judgment is claimed. |
| 7 | PASS | Acceptance text and all unrelated clauses are unchanged; no rewrite or new ruling is needed. |
| 8 | PASS, no new authority | Existing authenticated Owner approval doors are used. No permission, correction, refund or delegation code changed. |
| 9 | PASS | All sending is against the established network edge. No real-provider, carrier or legal qualification is claimed. |
| 10 | PASS, no policy change | Existing terminal exclusion semantics are exercised. No custody, consent, spending or authority default was introduced. |
| 11 | PENDING guarded landing | This cloud pushes only its named branch. Main equality, full-history publication scan and Run site on the landing SHA belong to the maintained Mac lander. |

## Remaining obligations and boundaries

Acceptance 1's SMS frequency exclusion, recorded reason and no-deferral proof remain unasserted. Acceptance 2's exact default-window boundary proof for email and SMS remains unasserted. Owner-held Twilio A2P and US carrier registration, SMS transport and provider qualification remain held. AUD-009 overrides and FLOW-014 caps remain separate obligations. No additional clause was selected or promoted. Existing CONT-013 SPLIT and NEW-1 disposition, original fix-1 hold and prohibition on a third FIX remain unchanged, as do provider, device, account, cross-seed, Base and release requirements. The selected email point has no blocker.

Authority, erasure and replay code is unchanged. This round proves inert replay for its selected terminal frequency exclusion; it makes no new erasure or revoked-credential claim. No UI source changed, and the captured existing results screen introduces no icon-only control, configuration placement, border or text-size change. The new test source assembles synthetic destinations rather than adding literal email addresses or provider-shaped secrets. The product diff has no new bare prose repository-like token beyond real repository paths and existing declared identities.

## CI and publication custody

Baseline main has successful exact-SHA Verify runs 42183651100 and 42181327459, plus successful Run site 42181327367, recorded in MAIN-CI.json. Candidate push Verify is 42192705713, event push, exact head d0b4463beb507932b050b26d23e7585bd9139eab. Discovery recorded completed failure. The failed-job diagnosis is appended after the prescribed API interval; no other SHA is substituted for candidate proof, and no rerun or dispatch was requested.

Diagnosis: build job 127808419102 failed only at `node src/base/contract-docs.mjs check`, with “ACCEPTANCE.md: generated content differs; run contract-docs write.” The final verify job 127808511498 failed because build failed; all journey shards were skipped. This matches the exact candidate's local restored-view check, exit 1, recorded in RESTORED-VIEW-CHECK.log. The generator write and check had already passed before restoring the views. Under this task's explicit generated-view exception, this is an allowed READY handoff, not a claim that skipped tests passed. The Mac lander generates the views and obtains its own exact-SHA Verify before landing. No workflow or generated view was committed to mask this expected failure, and no CI repair round was attempted.

Each failed job's log was read once with the required archive command: `gh run view 42192705713 --repo just-every/run-mango --job 127808419102 --log-failed` and the same command with job 127808511498. Both archive commands returned 0. CI-BUILD-FAILURE.log and CI-AGGREGATE-FAILURE.log retain the command and failure output with environment sections removed. Five GitHub CLI calls were used in total: baseline discovery, candidate discovery, completed-run jobs after the 300-second interval, and the two permitted failed-job archive reads. No direct job-log blob download, CI dispatch or retry was attempted.

The selected proof is ready for guarded landing with no product blocker. Full DONE is not claimed; its named remaining proofs and external prerequisites are retained. Product branch custody was independently read back at the full candidate SHA. No temporary browser or server started by this run remains active. The clone is removed only after report transfer succeeds, as required by the brief.

Cloud publication scanning is intentionally delegated to the Mac lander: commit=d0b4463beb507932b050b26d23e7585bd9139eab, complete=unestablished here, historyScanned=unestablished here, findings=unestablished here. Local full history is available. This is not a claim of NEW 0 or COMPLETE. Evidence publication is separate from product readiness and landing. Complete actual report and receipt files are selected explicitly for the report-only evidence ref; credentials, environment dumps, private gate material and symlinks are excluded.
