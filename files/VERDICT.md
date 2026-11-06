# SEG-003 original independent exact-source verdict

SEG-003 ACCEPT ON LANDING. R1 through R4 are substantively MET by this independent execution and the permitted INSPECTED details below. This is one original judgment of bf6793b03233958a813e75e754b7e6d34b0abb0d, not an award, product READY, source acceptance, gate pass or landing instruction. All proposals remain UNAWARDED. The original affected gate and every final integration guard remain pending.

Tag: ct-judge-mango-seg003-20261106-0330. Repository: just-every/run-mango. Source branch: cloud/sd-mango-c-f66. PR: none created. The reviewer used a disposable shallow filtered clone checked out detached at the exact source; no cloud product branch was created, product source edited, product commit made, product branch pushed, PR changed or CI queried. Generic builder publication instructions do not enlarge this review's write scope. Only the separate report evidence ref is authorized.

## Product and scope

The pinned CONTRACT names the category as Email marketing and marketing automation. Its first buyer is a US ecommerce operator or creator-led business with 1,000–250,000 contacts, one brand and one to ten marketing operators, USD and an operator-selected IANA zone, subject to US consent, privacy, carrier and sender rules. The named incumbents are Mailchimp, Klaviyo, ActiveCampaign and Kit (ConvertKit); beehiiv, Customer.io and Omnisend are the additional challengers. These are contract facts, not market research or invented acceptance criteria.

Only SEG-003 is judged. The earlier CAMP-016 review is a different clause and supplies no SEG-003 execution credit. The brief states that no prior original exact-source SEG-003 judgment exists; this review neither retargets the source nor repeats a known SEG-003 judgment. Its scope is population-relative arithmetic, stage method and readback, and daily recomputation. Screenshots establish functional results only. No layout or visual-quality criterion is imposed. The supplied Strategy2026-11-06T01:26Z authority for this nonvisual judgment is retained; no model API, paid API or usage-credit operation was made.

## Full immutable clause and one-clause mapping

The following pinned text is preserved exactly; all 316 clause Requirement and Acceptance bodies were also compared across main, the source and its generated ACCEPTANCE and are identical.

#### SEG-003 — RFM and lifecycle stages

*Tier:* Core

**Requirement.** Purchase history produces customer-relative RFM scores and a visible lifecycle stage.

**Acceptance.**
1. Recency, frequency and monetary scores use quintiles across this deployment’s customers and each contact’s own orders.
2. Each contact has new, active, at-risk, lapsed or champion stage, with method and thresholds visible.
3. Scores and stages are recomputed daily.
4. On seeded order history, the stage distribution and a contact’s scores match an independent calculation of the documented method.

| Clause | Frozen items and inherited scope | Journey and name | Public doors and outcomes | Exact-source recorded Verify |
| --- | --- | --- | --- | --- |
| SEG-003 | Original R1 through R4 and AP1 through AP4 below; all eleven DONE riders. The clause meta line has Core and no receiving Base citation or additional door-rule delta. All shared Base duties, door rules and other clauses remain in force in their owning rows. | `tests/campaign-results/results.journeys.ts`, “[CAMP-001][CAMP-009][RESULT-001][RESULT-004][CAMP-016][PUB-001][SEG-003][REPORT-004] inspect outcomes, cancel queued work, publish archives and follow up from recorded engagement”; outcomes phase in `tests/campaign-results/results.flow.ts` calls exerciseRetention in `tests/campaign-results/retention-journey.ts`. | Authenticated GET /api/insights/retention and GET /api/contacts/:id/rfm, then built /app/insights and /app/audience/:id. Performs and reads own-order population scoring, stages and visible method, server-clock next-day recomputation and independent seeded distribution. | Supplied push Verify 42151674128 on bf6793b03233958a813e75e754b7e6d34b0abb0d: FAILURE solely generated-view check and dependent aggregate, runtime SKIPPED. The permitted candidate exception is retained. No green runtime Verify is claimed. The original affected gate and final integration runtime proof are separate pending custody. |

## Frozen rubric result

No row was invented, split, deleted or narrowed. The builder's initial AP1 and AP4 selection does not omit AP3: the changed complete four-point packet is assessed.

| Row | Original checkable item | Independent verification and result |
| --- | --- | --- |
| R1 and AP1 | Recency, frequency and monetary use quintiles across this deployment's customers and each contact's own orders. | MET. Native authenticated aggregate equality covers all five customers; all five individual contact endpoints must return the same population-derived rows. The operator table checks stage, recency and R, frequency and F, currency amount and M for every row. The independent pairwise oracle imports no production scoring helper and takes no expected score from the response. Tied recency, frequency and USD value remain tied. JPY and USD populations stay separate. |
| R2 and AP2 | Each contact has new, active, at-risk, lapsed or champion stage with visible method and thresholds. | MET. The seeded five-stage distribution and all visible stage cells are checked. Iris and Maya profiles reconcile their native RFM panels; Luis is read after midnight. The journey opens Methods and thresholds and asserts visible midrank text. INSPECTED: the real disclosure renders all string method fields, including the numerical stage thresholds and precedence; the contact panel links to it. The fixture retains every initial stage. Exact independent assertions for each sentence of the disclosure are not required under the frozen DONE rule. |
| R3 and AP3 | Scores and stages recomputed daily. | MET. The native test Worker sets server time to 2031-10-05T23:59:59.900Z and then 2031-10-06T00:00:00.100Z over unchanged recorded orders. Aggregate asOf and scoringDay, every score row, the complete stage distribution, all five individual routes, the rendered table and Luis's profile are checked after the boundary. Every recency increases one day and Luis changes new to active. Source inspection confirms all score dimensions derive afresh on each read, with no persistent score cache or timer. The finally block restores the server clock. |
| R4 and AP4 | Seeded stage distribution and contact scores match an independent documented-method calculation. | MET. The independent calculation derives first and last purchase, UTC-day recency, own-order count, net amount per currency, population midrank bands and stage from fixture facts. Every customer row and the whole distribution match before and after midnight. INDEPENDENT-ARITHMETIC.md records the judge's separately checked hand calculation. |

The independent expected rows before midnight are Iris: 5 days, R5, 5 orders, F5, USD 48000 minor M5, champion; Luis: 29 days, R3, 1 order, F1, USD 10000 M1, new; Maya: 5 days, R5, 2 orders, F2, JPY 10000 M3 and USD 10000 M1, active; Noah: 120 days, R2, 2 orders, F2, USD 20000 M3, at-risk; Opal: 210 days, R1, 4 orders, F4, USD 40000 M4, lapsed. After midnight the corresponding recencies are 6, 30, 6, 121 and 211, with unchanged ranks and monetary totals. The distribution changes from one of each stage to new 0, active 2, at-risk 1, lapsed 1 and champion 1.

The tied-midrank rule counts lower observations and half the other equal observations, divided by n minus one; a singleton uses 0.5. Bands start at 0.2, 0.4, 0.6 and 0.8, with reversed recency. Production uses a sorted-run implementation; the journey uses pairwise counts. Stage precedence is lapsed at 180 days, at-risk at 90 days, new for one order less than 30 UTC days old, champion for R and F both at least 4, otherwise active. These are the already documented source policy, not a new judgment default.

The fourteen qualifying orders include Iris's partial refund of 2000 minor units, reducing her five gross USD 10000 orders to net 48000. A fully refunded and an unpaid Luis order remain persisted and excluded. Losing an exclusion would change his recency and count; admitting the unpaid order would change net value. Maya's JPY amount uses zero-decimal display and its singleton score of 3; her USD amount independently scores 1. No currency conversion or combined monetary amount is accepted.

## What actually ran

Setup ran through cloud_run with timeout 900 and nice 15: npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive. It exited 0 and installed frozen dependencies, built the local application and claimed only the disposable local owner. The supplied cloud toolchain selected pnpm 10.12.4. It retained the already newer Node 24.19.0 while the repository pins 22.20.0; setup emitted an unsupported-engine warning but succeeded. This disclosed local runtime difference does not assert CI-runtime equivalence. The installed rer package is 0.2.85; AGENTS' older narrative version is not treated as a new requirement.

The only registered journey execution was:

    cloud_run timeout 1200 nice -n 15 env MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium MANGO_TEST_WORK_DIR="$HOME/rer-consolidation/work/ct-judge-mango-seg003-20261106-0330" pnpm exec playwright test --config tests/campaign-results/playwright.config.js results.journeys.ts

Start: 2026-11-06T03:40:15.678382Z. End: 2026-11-06T03:43:15.970095Z. Exit: 0. Result: 1 passed (3.0m); the registered test itself took 2.5m. Exactly one worker, zero retries, one attempt, outer timeout 1200 seconds and registered timeout 600000 milliseconds. The clone's HEAD before and after is the immutable source and the tracked worktree is clean.

Normal cloud admission was load 0.00 before setup, 30 GiB free filesystem and 16 GiB available memory; journey-start load was 0.41, 0.36, 0.15. One heavy job ran at a time at nice 15. No Mac slot, Mac disk floor, stress workload, broad process kill or long watcher was used.

The real Hono routes, native authentication, D1, Vite-built operator screens and original scoring code executed. The fixture supplies recorded commerce facts, provider edges and a test-only server clock; no mock application or semantic fallback replaces the RFM implementation. The existing registered cost, cancellation, archive and follow-up phases also completed in that one test. Their existing fixture writes and fault probes were not new reviewer source mutations and confer no new clause awards.

Headless Chromium was /usr/bin/chromium, version 154.0.8037.57, with real HOME, private newContext instances and --no-sandbox, --use-mock-keychain and --password-store=basic. Assertions ran at 1440. The journey captured its own retention table and contact panels at 1440 and 390 once; all four original PNGs were copied unchanged into this packet and visually inspected for functional content. The desktop retention image is an element crop from the 1440 viewport; the phone image is a 390 viewport crop centered on Maya's row. The desktop contact shows Iris's champion result; phone contact shows Maya's separate JPY and USD results. The phone captures are functional proof, not a second assertion suite or a visual-quality pass. No real-browser profile or session was exported.

Actual log: results-execution.txt. Structured actual receipt, exact command, timestamps, exits and screenshot hashes: RECEIPT.json. SOURCE-RECEIPT.json contains full immutable document hashes and custody comparisons. PLAN.md records the complete authorized plan. MAIN-STATUS.snapshot.md preserves main's entire Status section, including all Gap, Evidence and provenance text, without a product edit.

NOT RUN by this judge: baseline or full suite; another registered results execution; independent typecheck; contract generator write or check; source-lock generation or check; live provider qualification; CI lookup, rerun or dispatch; original affected gate; full-history publication scan; merge, landing or Run site. Builder typecheck, first-party check, generator and lock results remain supplied evidence only, not this judge's execution. No unavailable Mac receipt was read or assumed. No additional technical gate or successor was started or awaited.

## DONE riders

| Rider | Independent assessment |
| --- | --- |
| 1 | MET substantively, with the expressly permitted candidate CI exception and final runtime guard pending. One named registered sanity journey performs and reads all four public-door outcomes on the exact source. Evidence names the real registered journey and helper. |
| 2 | MET. Nonempty seeded order facts and independently derived expected values reach both aggregate and visible rows. Qualifying and partial-refund facts contribute, while unpaid and fully refunded facts are excluded. SEG-003 performs read-only financial observation; no refund, payment, transfer or destructive authority is added. No outbound money operation is claimed proven. |
| 3 | Candidate exception only. The supplied push Verify 42151674128 is actual failure on the exact source at the generated document check; runtime shards did not execute. The inspected push matrix's reports pack loads campaign-results and the registered journey. This judge's exact-source runtime passed locally. Neither the exception nor runtime SKIP supplies final runtime green. The actual original affected gate and an ACTUALLY EXECUTED full-green exact-FINAL Verify loading the journey remain required. |
| 4 | MET locally. This new independent execution and all four captures are bound to bf6793b03233958a813e75e754b7e6d34b0abb0d. Earlier builder runs and screenshots are not substituted. No relevant bytes changed during this review. |
| 5 | INSPECTED and retained. The complete SEG-003 Core meta line has no receiving Base duty citation and no new inheritance claim. All Base duties and global door rules remain in their contract rows; this review neither invents a receiving delta nor drops one. No duty owned by another clause becomes a refusal here. |
| 6 | INSPECTED mechanical state. Candidate CONTRACT has done with empty Gap and current registered evidence; generated ACCEPTANCE still has the earlier partial row and gap because views were restored from main. Its supplied generator-check failure is the permitted view exception. The candidate's provenance append cites the earlier proof save; append the exact-source judge provenance below while retaining every existing assertion. Generation and current counts belong to the lander, with no view committed here. These mechanical details are not a product FIX. |
| 7 | MET by complete body and row comparisons. All 316 Requirement and Acceptance bodies are byte-identical between main, source and generated view; every parent row identity remains; only SEG-003's Status row differs. No acceptance amendment, duplicated rider, scope rewrite or new ruling was made. |
| 8 | INSPECTED as applicable. No production authority verb changed. Existing native API authentication, role authorization, no-store response and privacy projection remain on the real app path. Within SEG-003 only score reads occur; exclusion of disqualified order facts is actually observed. No unexecuted correction, refund or erasure permission is claimed. The registered archive phase additionally executes anonymous and foreign-origin refusals and an allowed publication, but no other clause is awarded. |
| 9 | MET honesty boundary. Synthetic recorded purchase history proves the native arithmetic. Live commerce-provider qualification is UNMET-EXTERNAL and unclaimed. No provider, legal, retention, hosted, carrier, device or marketing-lift qualification is inferred. |
| 10 | MET. No new custody, consent, spending, authority, threshold or policy default is introduced. Current documented stage policy is assessed as pinned. No allowance, credit, lifetime FIX count or owner hold is reset. |
| 11 | PENDING. Guarded landing, exact final main equality, actual full-green runtime Verify, exact-main Run site and COMPLETE full-history publication NEW 0 are unestablished here. The original affected gate remains separately required. This report is not a LANDED receipt. |

## Failure sensitivity and complete unmet-outcome accounting

These mappings are INSPECTED only; no mutations were applied. Reversing recency or splitting ties conflicts with whole-row equality for Iris and Maya. Using one contact as the frequency population conflicts with Maya and Noah's F2. Combining currencies conflicts with Maya's distinct USD M1 and JPY M3. Ignoring Iris's refund conflicts with net USD 48000. Admitting excluded Luis orders changes his recency and count. Caching the previous day or using rolling age conflicts with next-day equality; caching stage conflicts with Luis's active result and the new 0, active 2 distribution. Incorrect rendered cells conflict with assertRfmTable and assertContactRfm.

Unmet native frozen-rubric outcomes: none found. NEW correctness, regression, data-loss or exposure finding: none established. Source-traced but unreproduced allegations are not asserted as blockers. Missing separate assertions for each method sentence or threshold, receipt form, generated Gap wording and provenance maintenance are F, C or G notes for the next planned touch, never product FIXs, new rubric rows or reasons to demote. No additional acceptance row or permanent test is proposed.

UNMET-EXTERNAL: real commerce-provider qualification and all other provider, account, Base, device and owner-reserved prerequisites remain unestablished in their owning rows. These do not turn this seeded native arithmetic judgment into an external-account refusal. No Field proof row was newly passed, failed or awarded.

## Exact conditional Status, Gap, Evidence, provenance and counts

Fresh observed main is cc6321c2372d631d9607df9af8ad1dd9f7878e84, confirmed still advertised with the source branch at the pinned SHA. Main contains 20 DONE, 198 PARTIAL and 98 MISSING, total 316. Candidate contains 21 DONE, 197 PARTIAL and 98 MISSING. This is one individual proposed PARTIAL to DONE delta, UNAWARDED; it is never added to another proposal or copied over newer main counts. Actual edits by this judge: none; actual awarded count change: zero.

Conditional lander change, after the required original gate and final guards: retain the entire then-fresh main Status, every row's full Gap and Evidence, and all newer provenance and assertions. Apply only this SEG-003 judgment if still applicable; regenerate counts from that merged source. Do not overwrite main with the historical 21, 197, 98 totals. The exact historical main and candidate SEG-003 rows are preserved in SOURCE-RECEIPT.json.

Proposed Status: done. Proposed Gap: empty. Existing candidate Evidence is retained in full:

`tests/campaign-results/results.journeys.ts` — “[CAMP-001][CAMP-009][RESULT-001][RESULT-004][CAMP-016][PUB-001][SEG-003][REPORT-004] inspect outcomes, cancel queued work, publish archives and follow up from recorded engagement”: `tests/campaign-results/retention-journey.ts` independently derives every customer’s UTC-day recency, frequency, per-currency net value, tied midrank quintiles and stage from recorded order facts; reconciles every authenticated retention and contact score row and the operator table; retains refunded and unpaid exclusions, all five stages and visible methods. Native server reads across UTC midnight advance every recency and change a new buyer to active. Retention and contact screens are captured at 1440 and 390.

Append provenance without replacing the earlier statements:

SEG-003 was independently reviewed at bf6793b03233958a813e75e754b7e6d34b0abb0d on 6 November 2026 by ct-judge-mango-seg003-20261106-0330. The registered results journey passed once locally in 3.0 minutes with all R1 through R4 native outcomes and functional 1440 and 390 captures. ACCEPT ON LANDING is UNAWARDED and remains conditional on the actual original affected gate, retained source and review holds, and all final integration guards; supplied push Verify 42151674128 failed solely the generated-view check with runtime skipped and is not final runtime green.

If an actual later gate invalidates the result, do not invent a new gap or erase newer assertions from this report: retain main's partial status and report that observed outcome through normal CT custody. No hypothetical failure is declared here and no product repair is authorized.

## Source custody and final guards

The six changed files against observed main are CONTRACT.md, sources.lock.json and the four test files retention-clock, retention-fixture, retention-journey and worker under `tests/campaign-results/`. No production scoring or UI source changed. Every other Status row, including CONT-013, is byte-identical to main. CONTRACT's complete clause text and ACCEPTANCE's complete acceptance text remain frozen. Historical builder input reports remain unchanged and were read in full from the inline brief.

Original affected sd-mango-c-f66-gate-1 started at 03:04:21Z and was LIVE at input capture. No affected PASS was supplied or inferred. This judge did not query, wait on, rerun, replace or self-submit that gate. Source custody awaits its actual original result. The supplied CI receipt for 42151674128 is separate: push event, failed build job 127676179587 at node src/base/contract-docs.mjs check, generated ACCEPTANCE difference, aggregate job 127676252708 consequently failed, runtime shards skipped. Its one successful archive read is the builder's historical receipt, not a fresh judge call. CI API calls by this judge: zero.

Preserve CONT-013's closed two-FIX lifetime history, SPLIT and NEW-1 disposition, NEVERLAND and original fix-1 hold; all existing source, stack, review, provider, Base, account, release and owner-cutover holds remain. No allowance, reset, credit override or successor operation is made. SEG-003's existing lifetime FIX count is unchanged; this original review issues no product FIX.

The fleet still must resolve CONTRACT against the actual fresh main first without losing any newer judgment; regenerate and check merged views and current counts with current provenance; restore or write generated views only under the lander's contract; regenerate source lock LAST and check it; obtain the ACTUALLY EXECUTED full-green exact-FINAL runtime Verify loading the relied-on journeys; complete the full-history publication scan with NEW 0; perform its guarded fast-forward with main equality; and obtain exact-main Run site green. The cloud judge performs no main push or fast-forward. Generated-view-only candidate failure and runtime SKIP never provide final runtime green.

No native SEG-003 blocker remains in this independent review. Original gate, source custody and final integration remain pending, not silently waived. Evidence publication transports this completed report only and signals no product acceptance or landing. Bare READY means the report and receipts are complete.
