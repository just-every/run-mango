# RESULT-010: native ordinary-image acceptance

RESULT-010 changes from PARTIAL to DONE in the pushed candidate `5abc7bc7eaf211cbb408fb501808aebdafb18ad3`, branch `cloud/sd-mango-c-f111`, repository `just-every/run-mango`. This is a builder promotion awaiting the maintained landing gates and independent judgment. Candidate counts change from 20 DONE, 198 PARTIAL, 98 MISSING to 21 DONE, 197 PARTIAL, 98 MISSING; total 316. No other clause changes status or acceptance.

The first save is `380fb1ada5d36f96d78c6003976cade1ea9facb7` and carries the required skip marker. The product ref was read back at the full final SHA. No PR was needed: Verify has an ordinary branch push entry point. Main was never pushed or changed by this task.

## Work and scope

The current clause has three acceptance sentences. The carried asset tests exercise media bytes, cookie-free responses and rate limiting, and the existing open-estimate journey exercises the separate opt-in pixel. The missing proof was their ordinary delivered-image flow together.

Added one focused public-door sanity journey in `tests/go-live/ordinary-images.journeys.ts`, registered in the existing move-in verification pack through `scripts/verification/plan.mjs`. It uses the real local Worker, D1, R2, Queue and native routes, with fakes only at mail and DNS network boundaries. It uploads a real PNG, records and confirms two contacts, enables optional estimates, saves the image in a draft, checks, approves and dispatches actual messages. It compares both email-edge HTML image URLs with the native uploaded asset URL and proves the optional pixels differ.

Four anonymous GET and HEAD requests use distinct synthetic client addresses, user agents, cookies and request markers. Every application table is compared before and after. All 241 other tables remain identical, including populated campaign assets, contacts, engagement, tokens, sessions, approvals and recipients. Other rate rows also remain unchanged. The only allowed change is the exact per-image rate row, whose only fields are its asset key, database minute and count. Each request is independently bracketed by the database clock, avoiding an assumption about minute boundaries or precise request times.

Native campaign results, performance and estimate settings remain identical after ordinary image loads. At 1440, the operator sees zero estimates and a 0.00% rate after reload. The same zero-open page is captured at 1440 and 390; phone proof shows zero estimates and 0.00%. One issued pixel is then fetched as a positive control: exactly one estimate and a visible 50.00% rate appear, while non-open campaign results remain unchanged. Both captures were inspected.

Production files were unchanged. No erasure or restore repair, visual-output change, policy default, migration, homepage change, provider adoption or Base refresh was made. Original CONT-013 holds, the prohibition on another FIX round, existing provider and account prerequisites, and release requirements remain unchanged. Other image combinations, hosted infrastructure logging and real-provider qualification were not expanded or claimed. None of the three native acceptance sentences requires such a live account; the contract's Field proof register remains unchanged.

The selected campaign row RESULT-010 is complete. Other planner entries were read-only context and were not rebuilt or re-sorted. The full executed plan is in `PLAN.md`.

## Frozen proof rubric

All locations below are in `tests/go-live/ordinary-images.journeys.ts` unless stated otherwise. The journey name is “[RESULT-010] delivered ordinary images share one URL, retain only a minute counter and never credit opens”.

| ID | Checkable outcome and public door | Passing local proof and distinct mutation |
| --- | --- | --- |
| R1 | Acceptance 1: every recipient receives the same campaign-image URL. | Lines 34–62: native upload, save, approval and dispatch to two confirmed contacts, then exact delivered-source comparison. Adding a recipient query to the ordinary URL in the renderer fails the source assertion at line 55, exit 1. |
| R2 | Acceptance 2: no requester address, user agent, cookie, recipient or precise request time is retained; only the current-minute image counter changes. | Lines 70–100: four real GET and HEAD requests with distinct inputs; exact allowed counter shape, minute and increments; populated application records and other rate rows unchanged. Persisting requester headers and precise time in an extra rate row fails the extra-row assertion, exit 1. Its original run location was line 98, now line 99 after adding the direct zero-open assertion. |
| R3 | Acceptance 3: ordinary image loads are never counted or shown as opens. | Line 97 and lines 101–135: native zero count, unchanged results and performance, visible zero after reload, then one distinct pixel produces one estimate and 50.00%. Crediting an open from the media route fails the direct zero-count assertion at line 97, exit 1. |
| R4 | Inherited BASE-DATA-005: the image flow has no marketplace or author dependency, telemetry or phone-home. | The receiving clause already cites BASE-DATA-005 in CONTRACT.md. Unchanged `src/core/features/campaign-assets/media-routes.ts` serves only database and blob reads; `repository.ts` changes only the asset counter. The journey's edge check at line 136 has no unexpected outbound request. INSPECTED for the unchanged inherited implementation; no global Base qualification is claimed. |

Each mutation ran separately, was observed to fail, and was restored before the final commit. `mutations.json` contains the actual nonzero exits, mutation descriptions and assertion locations. The final unmodified candidate ran the focused journey successfully: 1 passed in 37.2 seconds. No existing assertion was removed, skipped, narrowed or placed behind a viewport condition. Assertions run at 1440; both widths are browser proof.

## DONE-RIDERS against the candidate

| Row | Result | Evidence or boundary |
| --- | --- | --- |
| 1 | Local PASS; Verify disposition below. | R1–R3 cover every native acceptance outcome through upload, actual handoff, fetch, results and operator UI. Status Evidence names the focused journey and maps all three sentences. |
| 2 | PASS | Two real seeded confirmed contacts actually send. Nonempty authority, assets and engagement are inspected. Distinct requester headers change no records. The independent open pixel proves the positive observation path. All three intentional outcome mutations fail. |
| 3 | Registered; exact-SHA Verify disposition below. | The existing push pack explicitly includes the new focused file. Exact-SHA local execution passes. CI is reported honestly below; no earlier SHA is substituted. |
| 4 | PASS locally | Focused journey and typecheck rerun on final SHA `5abc7bc7eaf211cbb408fb501808aebdafb18ad3`. `validation.json` binds relevant source, test and screenshot hashes to that head. |
| 5 | PASS | RESULT-010 already cites BASE-DATA-005 in its metadata; no inheritance or acceptance sentence was added. R4 describes the touched flow's retained independence. |
| 6 | PASS mechanical work; landing provenance pending | DONE Gap is empty. Evidence names the test and all outcomes. Generator write and check pass, then generated views are restored as required. Provenance records the first proof commit and the final direct-assertion rerun; final SHA is bound in receipts. The historical global Judged-from text is retained. Candidate views are deliberately stale and uncommitted. |
| 7 | PASS | Acceptance text is unchanged; no policy rewrite, split or coverage rewrite. All 316 parent Status rows and all 490 table lines survive each commit. Only the target row, provenance and generated summary counts change. |
| 8 | PASS for scope | No new correction, refund or authorization verb. Anonymous image fetches cannot change the populated authority tables. Existing revoked-session, erasure and replay implementations and assertions are unchanged. |
| 9 | PASS | Native persistence and delivery-edge proof only. Hosted logs, live mail qualification and other infrastructure or legal guarantees are not represented as proven. Field proof stays unchanged. |
| 10 | PASS, no new default | No custody, consent, spending or authority policy decision. No scope ASK is needed. |
| 11 | PENDING maintained lander | Product remains branch-only. Candidate main equality, complete full-history scan with zero findings, exact landing Verify and Run site are not cloud-established. The lander owns these checks. |

## Validation and probes

`pnpm exec playwright test --config tests/go-live/playwright.config.js ordinary-images.journeys.ts --reporter=list`: exit 0 on the final SHA, one test passed, 37.2 seconds. Native runtime and browser processes were closed by their own lifecycle handlers and the cloud subreaper.

`pnpm run typecheck`: exit 0 on the final SHA. `npx -y @runeditrun/rer build`: exit 0 with the same production bytes. `npx -y @runeditrun/rer check --profile first-party`: exit 0 after the final contract change. The provided toolchain setup used Node 24.19.0 and pnpm 10.12.4; the existing CI Node pin remains unchanged. No full local suite or unrelated journey was run.

Playwright inventory: 84 to 85 unique registrations including the slow tier; one new sanity journey, no removals. The five local-start tests are a subset of the seven slow-config tests and are counted once. Static assertion scripts remain additional and the seed is below 200. `test-counts.json` records configuration listings.

The initial fixture attempt held the clock during dispatch and stranded the second handoff on legitimate provider pacing. Letting time advance until delivery settles fixed the fixture. Product code was not changed. This was a local build attempt, not a Verify repair; no third repair or forbidden workflow edit occurred.

PROBE RESULT-010 acceptance-1: native PNG upload, saved and approved email to two confirmed contacts -> two accepted handoffs, one identical ordinary-image URL, two distinct opt-in pixels.

PROBE RESULT-010 acceptance-2: GET and HEAD on that delivered URL with four distinct synthetic requester inputs -> HTTP 200, original GET bytes, empty HEAD bytes, no response cookie, 241 application tables unchanged; only the per-image current-minute counter advances.

PROBE RESULT-010 acceptance-3: enabled estimates plus ordinary image loads -> native and visible zero opens after reload at desktop, matching phone capture; the separate pixel then yields exactly one estimate and a 50.00% visible rate.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, generated files restored; ledger=none exit=0.

The source lock includes the newly tracked journey and passes after all final source and contract edits. No generated view file is in either product commit. Changed fixtures and text contain zero email-shaped address literals, no provider-shaped keys, and no new bare prose repository tokens. Both candidate commits have fleet author and committer identity and no co-author trailers; all side parents were included in the audit.

## CI, publication and handoff

Starting main `01f63103b73722c32e0c6cc13f7b9c2eacb4c59e` had green Verify `42195975560` and Run site `42195975538`. Fetch and merge of current main before the final candidate was already up to date. No published history was rebased or rewritten.

Exact candidate Verify: push event, run `42209592866`, head `5abc7bc7eaf211cbb408fb501808aebdafb18ad3`. Initial discovery: in progress. Final CI disposition is appended below after the single permitted watcher update.

Publication scan receipt: commit=`5abc7bc7eaf211cbb408fb501808aebdafb18ad3`, complete=false, historyScanned=false, findings=not-established. The explicit cloud adaptation assigns the full-history scanner to the maintained Mac lander; no COMPLETE or zero-findings claim is made here. Run site for this candidate requires landing and is pending. Main does not equal this candidate at handoff.

Product and evidence publication are separate. Reports, mutation results, screenshots and validation receipts live only in the packet and the report-only evidence ref. They are absent from the product tree. There is no named external dependency preventing the three native acceptance outcomes. Landing and independent judgment remain required before the fleet counts the promotion.

Pre-READY self-check: (1) every named outcome has a public-door assertion and an observed failing mutation; exact-SHA local proof is green, with CI disposition below; (2) no existing assertion was removed or weakened; (3) authority, erasure and replay production paths were unchanged, and the image fetches leave their populated records unchanged; (4) no UI code or controls changed, and both required widths were captured without a design request; (5) source lock is fresh, no generated views were committed, and changed fixture literals contain no email-shaped address or provider key. Complete publication scanning, candidate main equality and Run site remain explicitly pending with the maintained lander.


Final CI disposition: run `42209592866` completed **failure** on the exact candidate SHA. The sole originating failure is build job `127864708942`, step “Check generated contract documents”, command `node src/base/contract-docs.mjs check`, exit 1: `ACCEPTANCE.md: generated content differs; run contract-docs write.` The final verify job `127864801985` fails as a consequence; downstream shards are skipped. The same command on the clean exact local head reproduces that expected generated-view error, exit 1. Both failed-job log reads succeeded once; no archive retry, workflow edit, rerun or dispatch occurred. Total GitHub budget: six calls. No product assertion failed in CI, and no candidate browser shard is falsely reported as having run there.

This is exactly the cloud adaptation's permitted generated-view case. It permits READY without committing those views. It is not an ordinary green Verify result: DONE-RIDERS rows 1 and 3 have complete local native proof and registered CI coverage, with candidate CI blocked only by generated views and full execution deferred to the lander's regenerated commit. Rows 4–10 pass for scope as described; row 6 has the documented mechanical provenance caveat; row 11 remains pending with the lander. The report claims no published, accepted or landed count.

No real product blocker remains. Hosted provider qualification and infrastructure logging stay unclaimed field proof. The final lane handoff requests guarded regeneration, exact-SHA verification, full-history publication scanning and landing, plus independent RESULT-010 judgment from this inline rubric.
