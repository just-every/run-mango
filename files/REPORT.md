# sd-mango-c-f130 — RESULT-007

RESULT-007 remains PARTIAL. The selected acceptance 6 outcome was already implemented in the required pinned continuation, b586ec73be7b04dd1e06d72029fc37c7011a2b35. This run independently revalidated that exact implementation and returns it on cloud/sd-mango-c-f130. No duplicate product implementation, empty commit, new test registration, contract edit, generated-view commit, or policy default was needed.

Before and after counts: 20 DONE, 198 PARTIAL, 98 MISSING. No status changes or plan-row edits. The returned plan entry records acceptance 6's selected campaign uniqueness outcome as proved; all planner-held remainder stays open. PLAN.md records the actual execution plan, and RECEIPT.json binds the results to the exact product SHA.

## Implementation and outcome

The inherited commits are 62a3621e2f17facaa076ff1a88afa9e7ee34f810 and b586ec73be7b04dd1e06d72029fc37c7011a2b35. The first adds the contact-based aggregate and displayed saved-revision totals. The second isolates the engagement controls so performance's pre-existing population and assertions remain intact.

The aggregate in `src/core/features/insights/campaign-engagement.ts:30` counts distinct existing contact IDs for non-automated facts inside the requested campaign and revision. It never adds per-link people or substitutes the performance report's recipient-step measure. `src/core/features/insights/ui/campaign-engagement.tsx:23` renders human clicks, unique people, and automated requests separately. The existing fixture at `tests/campaign-results/reporting-fixture.ts:24` gives Ada a second email step; lines 40–55 add independent revision and campaign controls without changing the ordinary performance fixture.

Through public tracked-link requests, Ada clicks repeatedly across two links and two email steps, Chris clicks the first link, and scanners hit every link. Authenticated engagement returns 8 human clicks, 2 unique people, and 3 automated requests. The three per-link rows independently reconcile to human counts 5, 3, 0; people 2, 1, 0; automated requests 1, 1, 1. Performance still returns 3 unique clicked recipient steps. Separate controls return 2 human clicks and one person for the other revision, and 3 human clicks and one person for the other campaign. A campaign paired with the unrelated revision returns 404.

The actual operator page and reload show the same counts. Matching CSV, clicker-list, exact saved-ID segment, native audience evaluation, recipient outcome, and inert saved-preview click-map assertions all remain and passed. Desktop and phone captures were inspected at 1440 and 390; the totals are visible and readable at both widths. The engagement component has text-labeled controls and no icon-only controls. No homepage, logo, configuration, provider, authorization, erasure, or delivery-authority behavior changed.

## Runtime probe

PROBE RESULT-007 6: public GET /l with native issued tokens for repeated Ada clicks across two destinations and email steps, Chris, isolated revision and campaign controls, and one scanner per link -> engagement 8 human clicks, 2 campaign people, 3 automated; per-link people 2, 1, 0; performance 3 clicked recipient steps; authenticated operator display and reload agree; CSV and exact cohort assertions pass.

## Acceptance map

The test for these rows is `tests/campaign-results/results.journeys.ts:7`, “[CAMP-001][CAMP-009][RESULT-001][RESULT-004][RESULT-007][CAMP-016][PUB-001][SEG-003][REPORT-004] inspect outcomes, cancel queued work, publish archives and follow up from recorded engagement”. It invokes `exerciseCampaignReports` through `tests/campaign-results/results.flow.ts`. Named-branch exact-SHA push Verify 42252212490 completed successfully. This run's focused invocation passed one registered journey in 2.6 minutes, including all its retained phases, on the same clean SHA.

| Acceptance | Evidence and disposition |
| --- | --- |
| 1 — position and destination identity | PARTIAL, held unchanged: repeated authored positions share destination counts; historical unknown-link identity remains open. No full-point claim. |
| 2 — campaign and flow-message per-link human counts | Campaign subset executed at `tests/campaign-results/reporting-journey.ts:21`–28 and 40–47. Flow-message and other held combinations remain open. No full-point claim. |
| 3 — saved revision table and click map | Existing campaign subset retained at `tests/campaign-results/reporting-journey.ts:38`–51 and 77–83. Other saved-revision combinations remain held. No full-point claim. |
| 4 — exact clicker list and times | Existing clicker identities and counts retained at `tests/campaign-results/reporting-journey.ts:34`–37 and 52. Other identity and time combinations remain held. No full-point claim. |
| 5 — matching CSV and exact segment with masking | Existing campaign CSV and exact segment retained at `tests/campaign-results/reporting-journey.ts:32`–37 and 53–58. Role matrix and other held combinations remain open. Large-cohort CSV behavior is unchanged. No full-point claim. |
| 6 — contact counted once per link and campaign | PASS for the selected saved-revision identified-human outcome: `tests/campaign-results/reporting-journey.ts:13`–31 proves isolated controls, repeated clicks, two email steps, second human, per-link and campaign totals, scanner exclusion, and independent performance semantics; lines 40–51 prove actual UI and reload. Verify push 42252212490: success on the exact SHA. |
| 7 — anonymous counts after erasure | Unproved and held under CONT-013. No erasure repair or erasure-count claim. |
| 8 — every fixture count and exported or segmented cohort | The selected three-link campaign fixture and existing CSV and cohorts passed at the cited lines. The remaining count and cohort matrix is held. No full-point claim. |

No inherited Base duty was added or removed. RESULT-007 has no Base citation in its meta line. This run claims only its native point 6 outcome, not fulfillment of another clause's authority, erasure, replay, or provider duties.

## DONE-RIDERS assessment

No DONE claim is made.

| Row | Result on exact candidate |
| --- | --- |
| 1 | FAIL for whole-clause DONE: full acceptance matrix remains held. Selected point 6 passes the registered public-door journey at the lines above. |
| 2 | PASS for selected scope: populated independent people, distinct recipient steps, isolated controls, zero-before-click baseline, and scanner-only link exercise observable outcomes. |
| 3 | PASS: the journey is registered in push Verify's campaign-results member; named-branch exact-SHA push Verify 42252212490 succeeded. Current cloud local journey passed. The named branch run also completed successfully; its exact REST result is saved in ci-runs.json. |
| 4 | PASS: local proof and screenshots use b586ec73be7b04dd1e06d72029fc37c7011a2b35; no source or test byte changed afterward. |
| 5 | INSPECTED: no new inheritance claimed; no duty moved or removed. |
| 6 | MECHANICAL PASS: generator write and check both exit 0; generated files restored from origin/main. Existing Status, Gap and Evidence text remains owned by the lander; its campaign-rollup gap is now outdated but was not edited. |
| 7 | PASS: no acceptance text, rider, coverage mapping, or clause status was edited. |
| 8 | INSPECTED for selected read-only aggregate: native private API and erasure guard remain; no new authority action. No expanded role or erasure proof claimed. |
| 9 | PASS boundary: isolated native fixture proof only, no live provider, hosted, legal, or erasure-retention qualification claimed. |
| 10 | PASS: no policy default adopted; no new custody, consent, spending, or authority choice. |
| 11 | PENDING lander: candidate is branch-only; main equality, full-history publication scan, and post-landing Run site are not established here. |

## Checks and pre-READY assessment

- Setup completed with frozen dependencies, all native migrations, and a production build. Its private local setup output was excluded from the public packet.
- `pnpm run typecheck`: exit 0; `typecheck.log`.
- `npx -y @runeditrun/rer check --profile first-party`: exit 0; `first-party.log` (command produced no output).
- `MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium MANGO_TEST_WORK_DIR=<task work directory> cloud_run perl -e 'alarm 1200; exec @ARGV' -- pnpm exec playwright test --config tests/campaign-results/playwright.config.js results.journeys.ts`: exit 0, one passed, 2.6 minutes; `results-journey.log`. Browser arguments include --no-sandbox; contexts and test-owned servers closed normally.
- Assertions run at 1440. Candidate browser proof includes `links-1440.png` and `links-390.png`; no duplicate test registration was added.
- Every selected behavior has a direct runtime outcome assertion. No assertion was removed, narrowed, skipped, or moved behind a width or branch condition in this run; the inherited diff retains all prior CSV and cohort checks.
- No revoked-credential, erasure, retention or replay path was changed. The report query still uses existing-contact IDs behind the native private API and pending-erasure guard. Those wider matrices remain unclaimed.
- UI inspection: totals fit both widths; metric text is at least 13px; touched engagement controls have text labels; no new icon-only control or one-sided rounded border; no configuration moved out of Settings.
- All candidate authors, committers, and trailers were checked, including side parents. No co-author trailers were present. No new fixture bytes or email-shaped fixture values were introduced. CONTRACT.md and generated views have zero candidate changes.
- Current main was fetched immediately before publication; it was already an ancestor. Integration reported already up to date. Source lock was regenerated and checked last; it produced no tracked changes. No published history was rewritten.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, restored from origin/main; ledger=none exit=0.

Exact-SHA publication scan: commit=b586ec73be7b04dd1e06d72029fc37c7011a2b35 complete=false historyScanned=unestablished findings=unestablished. Not run in this cloud; the maintained Mac lander performs the required scan. No COMPLETE or zero-findings claim is made.

Main equality: false at publication; current origin/main is a6ff098f6cdf8b356b76105c726c2561f6051a8d. Exact candidate Verify: push run 42252212490, completed success. Run site for the candidate: unestablished, lander-owned. No PR is needed: Verify has a branch push entry point. No CI dispatch or rerun was requested.

GAP RESULT-007: Acceptances 1–5's remaining position, identity, list, time, role and saved-revision combinations; flow-message reports; acceptance 7's anonymous erasure counts; historical unknown-link identity; other revision and history combinations; and acceptance 8's remaining count and cohort matrix remain held. Existing per-link, map, CSV, segment and large-cohort evidence remains unchanged. CONT-013's SPLIT and NEW-1 disposition, original fix-1 hold, prohibition on a third FIX or follow-up-only builder, provider, device, account, cross-seed and Base prerequisites, and existing rer 0.2.95 adoption and release requirements remain unchanged.

No local product blocker was found. The independent fleet still owns publication scanning, exact-SHA branch admission, landing, and Run site. Evidence publication is separate from product READY and is not acceptance or landing proof.

Product publication: the fleet push guard succeeded on attempt 1. Remote ref cloud/sd-mango-c-f130 equals b586ec73be7b04dd1e06d72029fc37c7011a2b35. Named-branch push Verify 42252212490 completed success on that exact SHA; earlier continuation push Verify 42236124344 also completed success on it. Two GitHub API discovery calls were used, more than 300 seconds apart; no workflow was dispatched or rerun. All local commands, browser contexts and test-owned servers have completed.
