# sd-mango-c-f66 — SEG-003

SEG-003 moves from PARTIAL to DONE in the candidate. All four native acceptance outcomes are covered by the existing registered results journey. Counts change from 20 DONE, 198 PARTIAL and 98 MISSING to 21 DONE, 197 PARTIAL and 98 MISSING; total 316. These are candidate counts, pending guarded landing and ct review.

Repository: https://github.com/just-every/run-mango
Branch: `cloud/sd-mango-c-f66`
Candidate: bf6793b03233958a813e75e754b7e6d34b0abb0d
PR: none; Verify has an ordinary push entry point.
Starting main: `cc6321c2372d631d9607df9af8ad1dd9f7878e84`. Its push Verify runs 42137089578 and 42135041429 and Run site 42137089740 completed successfully. No landing or deployment was performed here.

## Work and plan result

The plan is preserved in PLAN.md. The initial mapping found only one contact's hardcoded score checks and a stage-distribution assertion. There was no independent whole-population calculation and no native server daily-boundary proof. Acceptance 2's existing stage and visible-method assertions and the value, cohort and product-affinity assertions were retained.

The recorded fixture now includes tied recency (Iris and Maya), tied frequency (Maya and Noah), tied USD net value (Luis and Maya), one customer with both JPY and USD, a partial refund, a fully refunded order and an unpaid order. It retains all five initial stages. The oracle counts values below or equal to each observation to calculate tied midrank percentiles; it does not import production scoring helpers or copy production's sorted-run algorithm. It derives first and last purchase times, UTC-day recency, frequency, each currency's net amount, three scores and lifecycle stage from fixture order facts, never from the API response.

Every row returned by the authenticated retention endpoint and all five contact RFM endpoints must equal the independent expectation. The operator table reconciles each customer's stage, recency and score, frequency and score, and each currency amount and score. Selected contact panels also reconcile those values. Existing acquisition, cohort, refunded-product and directed-affinity checks remain in the same journey.

Acceptance 3 was native to this seed, so this round closed it as well. A clock seam exists only in the test Worker. Production routes and scoring functions remain unchanged and still construct their own Date. Reads at 2031-10-05T23:59:59.900Z and 2031-10-06T00:00:00.100Z use identical recorded purchases. Every customer's recency advances by one, and Luis changes from new at 29 days to active at 30. The report, all five contact score routes, the rendered table and Luis's profile are checked again after midnight. The clock resets in finally. This is server-clock proof, independent of the browser's clock, with a 200ms elapsed interval that distinguishes UTC day boundaries from rolling 24-hour age.

Assertions run at 1440. Native retention-table and contact-panel browser proof was captured at 1440 and 390. A capture review changed only the phone screenshot framing to avoid a sticky navigation bar overlay in a tall element screenshot; the final focused journey reruns on the final candidate. No production UI, homepage, logo, provider adapter or Base pin changed. The registered focused results test remains one registration; no assertions were removed, narrowed, skipped or moved behind a width or branch condition. No duplicate or pin tests were introduced or removed.

The extract supplies no further unblocked, non-DONE target in these files: REPORT-004 is already DONE on main. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold, provider, device and account prerequisites, cross-seed and Base holds, and existing rer adoption requirements remain unchanged. SEG-003's acceptance explicitly asks for seeded order history; real commerce-provider qualification remains Field proof, with no live qualification claim.

## Frozen rubric and public-door probes

The one registered test is `tests/campaign-results/results.journeys.ts:7`, named “[CAMP-001][CAMP-009][RESULT-001][RESULT-004][CAMP-016][PUB-001][SEG-003][REPORT-004] inspect outcomes, cancel queued work, publish archives and follow up from recorded engagement”. Its existing outcomes phase in `tests/campaign-results/results.flow.ts` invokes exerciseRetention. The unchanged verification plan includes campaign-results in the reports shard; no workflow or test registration change was needed.

- R1 / acceptance 1: MET locally. `tests/campaign-results/retention-journey.ts:56` compares the complete authenticated population with the independent calculation, line 60 compares each contact route, line 84 checks the operator table. The oracle starts at line 114. It covers recency, frequency and per-currency monetary quintiles, ties and own-order totals.
- R2 / acceptance 2: MET locally. Lines 68 and 84 check all five lifecycle stages and displayed rows; line 88 opens Methods and thresholds and checks the documented midrank method. Native contact panels reconcile stage, age, frequency and currency scores. No new threshold policy was introduced.
- R3 / acceptance 3: MET locally. Lines 8 through 46 control the test server clock and call native authenticated routes on both sides of UTC midnight; lines 30 through 42 check the new day, every recomputed score row and stage, and rendered readback. This committed clock journey also runs locally outside push Verify on the exact candidate.
- R4 / acceptance 4: MET locally. Lines 56, 57 and 68 reconcile every contact's independent RFM calculation and the entire initial stage distribution; lines 32 and 33 repeat the independent calculation after midnight.

PROBE SEG-003 acceptance-1: authenticated GET /api/insights/retention and five GET /api/contacts/:id/rfm reads over recorded orders -> five exact population-wide rows, tied R, F and M ranks, separate JPY and USD values.
PROBE SEG-003 acceptance-2: built /app/insights and selected native contact pages -> all five stages, exact displayed scores, visible methods and thresholds; screenshots at 1440 and 390.
PROBE SEG-003 acceptance-3: identical order population read 200ms across server UTC midnight -> each recency advances one day; Luis changes new to active in API and operator readback.
PROBE SEG-003 acceptance-4: independently calculated fixture population -> exact initial distribution new=1, active=1, at-risk=1, lapsed=1, champion=1; after midnight new=0, active=2, at-risk=1, lapsed=1, champion=1.

Before midnight, the verified values are:

| Customer | Recency days and R | Orders and F | Net value and M | Stage |
| --- | --- | --- | --- | --- |
| Iris | 5; 5 | 5; 5 | USD 48000 minor; 5 | champion |
| Luis | 29; 3 | 1; 1 | USD 10000 minor; 1 | new |
| Maya | 5; 5 | 2; 2 | JPY 10000 minor; 3; USD 10000 minor; 1 | active |
| Noah | 120; 2 | 2; 2 | USD 20000 minor; 3 | at-risk |
| Opal | 210; 1 | 4; 4 | USD 40000 minor; 4 | lapsed |

## Failure sensitivity

These are INSPECTED assertion mappings, not claimed mutation executions. The revised DONE rule requires sanity journeys, not mutations. Each row identifies a distinct ordinary failure and its own relevant assertion.

- Recency rank reversed or ties split: the full row equality at line 56 fails for Iris or Maya.
- Frequency derived from a selected contact instead of the deployment: the contact equality at line 60 fails against population-derived F=2 for Maya and Noah.
- USD and JPY combined, or currency ranks shared: Maya's separate amount and score entries fail at line 56 and in the Monetary cell assertion in assertRfmTable.
- Partial refund ignored or fully refunded or unpaid order admitted: Iris's USD 48000 assertion at line 69 or the exact Luis row at line 56 fails. These cases use actual persisted qualifying and excluded order facts; they do not authorize a financial action.
- Daily recency cached or measured in rolling 24-hour periods: the post-midnight equality at line 32 fails.
- Stage cached or new-buyer cutoff wrong: the post-midnight stage distribution at line 33 and Luis's native profile assertion at line 42 fail.
- Rendered stage, recency, frequency or monetary cell wrong while the API is correct: the corresponding assertion in assertRfmTable fails. No shared aggregate substitutes for those cell checks.

## DONE riders and pre-handoff checks

1. PASS locally; exact-SHA CI condition recorded below. R1–R4 above name public doors and assertions for all four acceptance outcomes. Status Evidence names the actual registered journey and helper.
2. PASS. Nonempty seeded order facts and independently derived expectations drive both allowed purchases and excluded unpaid and refunded cases. API and visible table values are checked. No outbound money action exists in this clause.
3. PERMITTED GENERATED-VIEW EXCEPTION, pending regenerated lander Verify. The unchanged push reports shard loads the registered journey. Local exact-candidate runtime proof is in results-candidate.txt. The guarded lander must bind its own exact-SHA CI judgment.
4. PASS locally. The final registered journey runs at the final candidate SHA, with final screenshot framing. Earlier successful runs are also retained, with their distinct commit provenance.
5. NOT APPLICABLE. No receiving Base duty or new inheritance claim was added; clause acceptance text is unchanged. Existing shared duties are untouched.
6. PASS for source and generation; lander view refresh pending. DONE Gap is empty, Evidence is current, write then check passed, and both generated views were restored from origin/main. SEG-003 provenance cites the published proof save whose scoring assertions are retained; the exact-candidate receipt supplies final proof. Other clauses' provenance remains intact.
7. PASS. Acceptance sentences are byte-identical; no ruling, rider or coverage rewrite was required. All 316 Status rows and all parent row identities are retained.
8. NOT APPLICABLE to new mutation authority. This change adds no production mutation, credential, refund, correction, erasure or replay path. Native score reads use a real authenticated operator session; existing authority guards and assertions are untouched.
9. PASS. These are recorded, synthetic store facts, not live-provider qualification or measured marketing lift. No provider, legal, hosted, retention or erasure qualification is claimed.
10. PASS. No custody, consent, authority or spending policy default was introduced, and no acceptance scope changed.
11. PENDING GUARDED LANDING. Candidate main equality, candidate Run site and a COMPLETE full-history publication scan with NEW 0 findings are not claimed by this cloud run. Main was green at the starting SHA; the Mac fleet owns exact-candidate publication scanning, landing and Run site.

The changed production source is empty. The relevant read-only screens have text at least 13px in inspected captures and no new icon-only controls; configuration placement and existing tooltips are unaffected. No security, money, privacy or data-loss behavior was changed. The new fixture strings contain no email-shaped literal or provider-shaped credential. A one-off broad lexical assertion flagged four matches: two JavaScript division expressions and two suffixes of real repository paths. All four were inspected and classified in text-review.json; this local review is not a COMPLETE publication scan. Existing erasure, credential revocation, replay and provider-boundary holds were neither repaired nor weakened.

## Mechanical and execution receipts

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, then restore ACCEPTANCE.md and docs/CLAIMS.md from origin/main; ledger=none exit=0 (no migration changed).

Touched checks: registered results journey, typecheck and rer check --profile first-party. Complete actual logs and structured exit receipts are in this packet. No full local suite, scale dispatch, provider dispatch or workflow edit was performed. Chromium uses /usr/bin/chromium with --no-sandbox; fixture runtimes close their own browsers and processes.

Exact-SHA push Verify [42151674128](https://github.com/just-every/run-mango/actions/runs/42151674128) completed with conclusion failure on `bf6793b03233958a813e75e754b7e6d34b0abb0d`. The job listing shows only the build's “Check generated contract documents” step failed (job 127676179587); the final coverage aggregate failed consequently (job 127676252708), and runtime shards were skipped. The same command, `node src/base/contract-docs.mjs check`, returns exit 1 locally on this exact head after the required restoration: “ACCEPTANCE.md: generated content differs; run contract-docs write.” The write then check sequence returns 0 before restoration, and the source lock remains fresh afterward.

This is precisely the permitted generated-view exception in the cloud handoff contract. No green runtime-shard run is claimed for this branch event. The Mac lander must regenerate the views and require its exact-SHA Verify before landing, with Run site and publication scan afterward under its own gate. No workflow was dispatched or rerun, no test was repaired or weakened, and no generated view was committed. The failed-step archive read succeeded once and confirms that exact error and exit 1. CI-RECEIPT.json and candidate-ci-failure.txt preserve the actual command and failure; the archive’s CI environment metadata is excluded from publication. Five GitHub invocations were used in total, with one watcher and at least 300 seconds between candidate run requests.

Publication scan: commit=bf6793b03233958a813e75e754b7e6d34b0abb0d complete=false historyScanned=unestablished findings=unestablished; delegated to the maintained Mac lander, never reported as COMPLETE or zero findings here.

Product custody and evidence transport are separate. The product branch was pushed successfully in one attempt and independently verified by its remote ref at `bf6793b03233958a813e75e754b7e6d34b0abb0d`. The earlier published save is `44187a13889b36f25e6ed073ca66a455fd853aea` with CI skipped. Every candidate author, committer and trailer and every parent Status row were inspected before both pushes. Main was fetched and already integrated before the final push. No published commit was rewritten; no default branch or PR was changed.
The complete selected public-safe packet is published only to refs/heads/evidence/sd-mango-c-f66. No report or receipt enters the product branch.

Plan rows to relay: SEG-003 PARTIAL to DONE; acceptance 1 and acceptance 4 population-wide proof closed, acceptance 3 native server daily-boundary proof also closed. Acceptance 2 retained. Counts 20/198/98 to 21/197/98. No other plan or clause row changed.

Blockers: none in native SEG-003 work. Guarded landing, ct review and real-provider Field proof remain separate duties. No competing manual landing or deployment was attempted.
