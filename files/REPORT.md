# sd-mango-c-f68 result

Repository: just-every/run-mango.
Product branch: cloud/sd-mango-c-f68.
Candidate: 49b620633c5e78e271f694af073bc87429db3e8f.
Starting and integrated main: cc6321c2372d631d9607df9af8ad1dd9f7878e84.
No pull request was created: Verify has a push entry point on the named branch. No default branch was changed.

## Result and plan change

CONT-006 remains PARTIAL -> PARTIAL. Both planner-selected points are closed locally: acceptance 2 now has visible soft-bounce history proof, and acceptance 3 has explicit persisted count reset and restart proof. The complete carried suppression progression, token-isolation, availability and no-marketing-handoff assertions remain in the same registered journey. Total counts remain 20 DONE, 198 PARTIAL, 98 MISSING, 316 clauses. The touched journey has one registration before and after; none was added, deleted or skipped. No existing assertion was removed, narrowed or moved behind a width or branch condition.

Only the CONT-006 plan row needs reconciliation: remove its visible-history and explicit-reset proof gaps, retain PARTIAL and all stated remaining acceptance. No other campaign row is selected or changed. PLAN.md records the full execution plan; PROBES.md records the public-door observations; CHECKS.json binds checks and source hashes to the product head.

## What changed and why

The first extended native journey failed on the original production code: the third signed soft bounce was persisted and counted but absent from authenticated contact history. The soft-bounce event and the suppression it caused both used the provider fact identity as the history primary key, so suppression occupied the ID first. src/core/features/audience/service.ts:532 now gives soft-bounce history its own stable identity. Replays retain once-only behavior. The recorded initial failure is in initial-failure.log.

The next run revealed that a later delivery lifted address suppression but left the aggregate contact profile marked suppressed. src/core/features/audience/repository.ts:421 now updates the primary address and profile in one database batch. Its aggregate calculation retains restrictive alias states, and another email suppression prevents lifting the aggregate. The existing independent opt-out remains unsubscribed. profile-status-failure.log records the original visible inconsistency.

The final tests/go-live/opt-out-reasons.journeys.ts journey uses independently chosen synthetic event identities and unequal original-time offsets. It compares known expected counts and times with persisted facts, authenticated contact history and the existing operator timeline. It reads the nonzero count immediately before correlated signed delivery, reads zero afterward, then observes one after a fresh later bounce. Reordered replay leaves the count, all five facts, history and timeline unchanged. Earlier soft-bounce facts and recipient opt-out survive. The existing final dispatch remains refused for both opted-out recipients with no additional marketing handoff.

CONTRACT.md:4079 gains the exact journey name and acceptance mapping and removes only the now-proven gaps. Acceptance text, clause status, all other Status rows and legacy prose remain unchanged. The current Base and rer pins are unchanged. No migration or workflow changed. The source lock was generated last through the documented command.

## Frozen selected-point rubric

- R1 MET locally: signed facts, history and timeline assertions at tests/go-live/opt-out-reasons.journeys.ts:88 through line 114 and line 139 through line 169; original event times and four visible bounce entries. The missing-third-entry regression demonstrably failed before the production fix.
- R2 MET locally: the issued-message-correlated signed delivery and persisted nonzero-to-zero count, retained original facts and recipient opt-out at line 115 through line 128 and line 135 through line 138.
- R3 MET locally: fresh later bounce starts at one; reordered replay preserves one, all facts, history and timeline at line 130 through line 155.
- R4 MET locally: existing suppression progression at line 192, token isolation at line 200 and final skipped dispatch without a marketing handoff at line 220. These assertions were retained.

The same registered journey is selected by the existing reports pack in scripts/verification/plan.mjs:25 and runs through tests/go-live/playwright.config.js. No workflow or registration change was needed. No mutation campaign was run. The two actual failing local probes establish the missing-history and stale-profile regressions; the direct count assertions fail on an absent reset or incorrect restart.

## Validation and runtime receipt

The focused registered journey passed on candidate 49b620633c5e78e271f694af073bc87429db3e8f: one test, 42.9 seconds total. It used Chromium at /usr/bin/chromium with --no-sandbox and the prescribed child subreaper. Assertions run at 1440. The same populated screen was captured once at 1440 and once at 390, and both captures were inspected. The named activity entries remain visible in the existing responsive layout. No product UI source, copy, controls, logo or homepage was changed; no icon-only control was added.

soft-bounce-reconciliation.json is the actual runtime receipt: nonzeroCount=3, resetCount=0, freshCount=1, replayCount=1; four soft-bounce history entries, five persisted bounce and delivery facts, and six relevant timeline entries including the independent opt-out. opt-out-reasons.json retains the original suppression progression. unsubscribe-availability.json retains the actual HTTP timing, token and final dispatch observations. These use only the existing synthetic test people; no live customer, account credential or provider qualification is included.

Typecheck passed on final source and test bytes. The first-party public command check, production build, source lock freshness and offline retained Base integrity check passed. The build preceded the final contract evidence edit and test receipt-output addition; runtime source bytes were identical. Setup and build used cloud_run. No full local suite or unrelated journey was run.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

After generation and successful checking, ACCEPTANCE.md and docs/CLAIMS.md were restored whole from origin/main, as required. The committed candidate's generator check consequently returns only the expected ACCEPTANCE.md freshness difference. It must be regenerated by the Mac lander. Neither generated view is in the product commit. Source lock freshness was checked again successfully on the committed candidate.

Before the candidate commit, all 316 parent Status IDs were retained, and the table-line count was 490 before and after. The full acceptance section is byte-identical. All candidate author and committer identities were inspected, including side parents, and use the fleet identity; no co-author trailer exists. Added product text contains no new email fixture, provider-shaped key or prose token that invents a GitHub repository. The product push succeeded on its first guarded attempt. No published history was rewritten.

## Remaining acceptance and inherited holds

- Acceptance 1: carried hard-bounce, complaint and provider-suppression evidence is unchanged; no new qualification claim.
- Acceptance 2: signed soft-bounce recording, visibility and existing documented suppression progression are locally proved.
- Acceptance 3: persisted reset on correlated delivery, fresh consecutive count and replay preservation are locally proved.
- Acceptance 4: the actual incomplete-webhook campaign-approval refusal remains unproved in the cited journeys; real-provider qualification remains unproved. Existing signed-ingress evidence is carried unchanged.
- Acceptance 5: local authentication and setup credential refresh preserving contact-hash restrictions, including contactless restrictions, remains unproved.
- Acceptance 6: legacy verified local-authority conversion before rotation and refusal of unknown or missing authority remains unproved.

The latter native proofs were explicitly omitted by the planner-selected slice and are recorded as remaining work, not misrepresented as an external engineering blocker. No unavailable live account was substituted with an invented provider receipt. Provider, device, owner-account, cross-seed and Base prerequisites remain where the contract already names them. Existing rer adoption and release prerequisites remain unchanged. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold are untouched. No third FIX, erasure repair or independent policy choice was made.

## DONE riders and pre-ready check

No DONE flip or ct judge request is made. The clause still owes substantive acceptance, so a complete DONE claim would fail rows 1 and 6. The applicable row-by-row disposition is:

1. PARTIAL overall; selected outcomes are performed and observed by the exact-candidate native journey, but the named remaining acceptance is not all exercised.
2. PASS for selected outcomes: real seeded contacts, signed transport, independently chosen facts and counts, plus the retained final unsafe marketing refusal. No empty-list or self-derived oracle substitutes for the selected point.
3. Verify is registered on push; exact-candidate workflow state is recorded in CI.json and final custody below. A full DONE claim requires the remaining outcomes too.
4. PASS locally: the final focused journey and both captures come from the committed candidate; CHECKS.json binds source hashes. Earlier build and typecheck bytes are explicitly qualified above.
5. UNCHANGED: acceptance and inherited Base duties were not altered or newly claimed.
6. PARTIAL accurately retained: Evidence names the actual journey, Gap names the substantive remainder, and write plus check succeeds before the mandated view restoration. No new global judgment or old provenance was overwritten.
7. PASS: acceptance text and all 316 Status IDs are retained; no acceptance rewrite or new ct rider was introduced.
8. PASS for selected path: the initial legitimate campaign handoff occurs, the recipient independently opts out, reconciliation retains that restriction, and later approved work is skipped without another handoff. No credential or operator authority rule changed.
9. PASS for honesty: signed provider-edge fixtures are identified and no live-provider or legal boundary is claimed proved.
10. NOT APPLICABLE: no consent, custody, spending or authority default was introduced.
11. PENDING LANDER: main equality, exact resulting-main Run site and the COMPLETE full-history publication scan with zero findings are not claimed from this VM.

Pre-ready: the new selected assertions fail for the two actual observed defects; count reset and replay are directly checked; no existing assertion was weakened; recipient opt-out and replay restrictions survive. Credential rotation and erasure are outside the selected slice and remain explicit. The source lock is fresh. Publication scanning and landing remain with the maintained Mac gate. There is no known local test failure on the pushed candidate.

## Custody and CI

Product custody: pushed branch cloud/sd-mango-c-f68, head 49b620633c5e78e271f694af073bc87429db3e8f. No PR.

Starting main had exact-SHA Verify success, run 42137089578, and Run site success, run 42137089740. Candidate push Verify run: 42150946191. The final exact-SHA REST observation is completed with conclusion failure, stored in CI-final.json. CI-jobs.json establishes that the sole primary failure is job 127673826259, Check generated contract documents. The failed job archive quotes: “ACCEPTANCE.md: generated content differs; run contract-docs write.” The summary job 127673916491 fails only because Build failed and shards were skipped. Both failed jobs were read once with gh run view; their sanitized logs are included. The exact generator command was also run locally on the committed candidate and returns the same error with exit 1. This is the expressly permitted generated-view freshness exception, not a product failure or a repair round. No workflow was dispatched or rerun. GitHub API budget used: six calls, including two completed failed-job archive reads. CI environment scaffolding is omitted from the copied logs; assertion and command diagnostics are retained.

The packet is report-only and will be published solely to refs/heads/evidence/sd-mango-c-f68. Evidence publication is distinct from product acceptance, READY custody and landing. The publication entrypoint returns the exact evidence ref and head separately in the terminal handoff. Product custody is READY under the explicit generated-view exception. No claim of a green branch workflow, main equality, completed publication scan or completed landing is made; the maintained lander must regenerate the views and run all landing gates.
