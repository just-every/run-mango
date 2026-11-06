# AUD-001 original-source verdict

**AUD-001: ACCEPT ON LANDING.** Every original substantive review-snapshot outcome is MET by one fresh execution of the registered journey on exact source 8929460e6c1be689f4f206fb6c49b6a5462c67ca. There is no NEW finding within this judgment. This is a conditional product-scope judgment: it grants no source acceptance, status award, restoration, hold waiver, landing consent or release. The source's accepted set remains empty under the supplied commission. Required source and exact-chain review protection and final integration gates remain pending.

Task: ct-judge-mango-aud001-20261105-1842-sol1. Repository: just-every/run-mango. Reviewed branch: cloud/sd-mango-c-f34. Reviewed source: 8929460e6c1be689f4f206fb6c49b6a5462c67ca. Affected gate: sd-mango-c-f34-gate-1. Actual commissioned execution: Codex, gpt-6.1-sol, reasoning effort xhigh, in this single cloud session under the 2026-11-06T01:26Z Sol replacement authority. No additional model session or agent was launched, and no paid API or usage-credit call was made. Backend billing and model routing have no separate attestation in the available tool surface; the model and effort are the commissioned session configuration, not a fabricated provider receipt.

The replacement authority supersedes the historical Opus and same-session wording only. It does not change the original source, rubric, acceptance, lifecycle, hold, FIX lifetime or final DONE bar. This is NON-UI and NONVISUAL product judgment. Browser captures establish functional behavior; no UI design or visual-quality decision is made.

## Product and original requirement

All product positioning below is from pinned CONTRACT.md, not general market assumptions.

| Field | Exact pinned product positioning |
| --- | --- |
| Category | Email marketing and marketing automation |
| First buyer | A US ecommerce operator or creator-led business with 1,000–250,000 contacts, one brand and one to ten marketing operators; USD and an operator-selected IANA time zone, with US consent, privacy, carrier and sender rules |
| Incumbents a buyer switches from | Mailchimp, Klaviyo, ActiveCampaign, Kit (ConvertKit) |
| Up-and-comers it must also beat | beehiiv, Customer.io, Omnisend |

Original clause, verbatim:

> AUD-001 — Review snapshot
>
> Requirement. Campaign review makes the frozen audience and its exclusions inspectable.
>
> Acceptance.
> 1. Review shows the audience rule and its as-of time.
> 2. It shows candidate count, each exclusion reason with its count, and eligible contact count.
> 3. It shows recipient-step count separately for each channel.

Original metadata: Core; Rules D-2. No Base citation is attached directly to AUD-001 in the pinned metadata. D-2 remains the inherited duty, verbatim:

> Permission precedence. Audience selection, review, activation and every handoff honor current channel/topic permission, opt-out, suppression and surviving restrictions; an import, payment, source event or agent output never grants permission by itself.

The primary contract journey connects sources and sender, grows a consented audience, reviews an exact revision, schedules its eligible recipients, delivers through the chosen provider and inspects outcomes. This judgment covers AUD-001's review job and its D-2 boundary, without awarding the separate selection, activation, dispatch, carrier, data or Base clauses.

## Single-clause decision table

| Clause | Public doors and named journey | Original outcomes performed and checked | Exact-source recorded Verify | Decision |
| --- | --- | --- | --- | --- |
| AUD-001 | `tests/audience-controls/segments.spec.ts`: “[CONT-008][CONT-017][AUD-001][AUD-002][AUD-005][AUD-007][SEG-001][CONT-011] build and copy a saved segment, inspect its saved audience time and separate channel step counts, freeze recipients and merge identities without widening consent”. The browser opens the authenticated campaign review document; native POST campaign checks save the review, authenticated GET review reads it, and read-only native D1 observations reconcile it. Its steps are “Review snapshot — saved as-of time and email recipient-step counts” and “Review snapshot — separate email and SMS recipient-step counts”. | AP1 saved rule and clock-bracketed as-of instant, AP2 candidate and eligible counts and every saved exclusion reason and count, AP3 independent email and SMS recipient-step totals, and D-2 confirmed versus pending permission with unchanged draft and delivery authority. Reload and reopening retain the saved snapshot. | Supplied push Verify 42082530847 at the exact source completed failure on generated-view freshness and derivative aggregate; runtime was skipped. The explicit original-source CANDIDATE exception applies. Registration in push Verify is inspected. This session's exact-source focused runtime passed once; it is not a full green Verify. | ACCEPT ON LANDING; no substantive missing original outcome. Row 3's final full-runtime duty and row 11 remain guarded. |

## Frozen original outcome mapping and scores

No new stable IDs or checklist was invented. The original public mapping from `docs/contract/DONE-AUDIT.md`, lines 444–449, is reproduced verbatim below. Its historical citations and “none” states describe the old audit, not the current score. The same mapping is retained separately in [ORIGINAL-RUBRIC.md](ORIGINAL-RUBRIC.md). Private held-out material was neither supplied nor accessed.

| Clause | Acceptance point | Outcome | Original evidence | Original state |
| --- | --- | --- | --- | --- |
| AUD-001 | 1 | Audience rule | none | none |
| AUD-001 | 1 | Audience as-of time | none | none |
| AUD-001 | 2 | Candidate count | `tests/audience-controls/segments.spec.ts:23` | asserted |
| AUD-001 | 2 | Eligible contact count | `tests/audience-controls/segments.spec.ts:23` | asserted |
| AUD-001 | 2 | Every exclusion reason and count | `tests/audience-controls/segments.spec.ts:23` | asserted |
| AUD-001 | 3 | Per-channel recipient-step count | none | none |

| Original acceptance mapping, unchanged | Score | Exact-source evidence |
| --- | --- | --- |
| 1 — Audience rule | MET | `tests/audience-controls/segment-journey.ts:67` saves structured rules, checks native revision readback, and reads the labeled saved rule containing Placed Order, US state and ZIP after reload and reopening. `tests/audience-controls/channel-snapshot-journey.ts:107` checks all three known selected identities in the saved rule. |
| 1 — Audience as-of time | MET | `tests/audience-controls/segment-journey.ts:89` brackets snapshot creation with installation-clock reads, checks the native as-of instant against both bounds and the persisted millisecond timestamp, then advances the browser clock by two minutes. The visible Saved label, native readback and persisted rows retain the original time after reload and reopening. This run observed 1793931026851 through 1793931026851 and saved 2026-11-06T02:10:26.851Z. The held test clock explains equal bounds; it is not a stopwatch claim. |
| 2 — Candidate count | MET | `tests/audience-controls/channel-snapshot-journey.ts:83` uses three independently known natively confirmed email contacts, checks candidateCount=3 in native checks, persisted rows and the visible Candidates value, and repeats after reload and reopening. |
| 2 — Eligible contact count | MET | The same mixed-channel journey explicitly excludes the third contact. Native and persisted eligibleCount=2 and excludedCount=1 match the rendered labeled values. The email-only journey separately establishes two eligible contacts. |
| 2 — Every exclusion reason and count | MET | `tests/audience-controls/channel-snapshot-journey.ts:84` expects exactly not-in-market=1, sms-non-subscribed=1 and sms-pending=1. It compares the complete native array and stored JSON, checks precisely three labeled saved exclusion rows and each displayed count, then repeats after reload and reopening. Reasons may overlap across channels; their sum is not the count of wholly excluded contacts. |
| 3 — Per-channel recipient-step count | MET | Two saved email steps for two email-eligible people yield Email=4. Three saved SMS steps for one independently confirmed SMS destination yield SMS=3. Native checks, both channel rows in D1 and the separately labeled review values agree after reload and reopening. These are recipient-step counts, not SMS character-segment counts. |

D-2 mapping: **MET for AUD-001's review boundary.** The registered journey performs populated subscribed, pending, non-subscribed, unsubscribed and suppressed email controls through authenticated audience and review routes. The mixed-channel fixture captures SMS consent through the native route, confirms one destination using its signed exact-message reply and leaves another pending. The pending destination contributes no eligible SMS work even though its email remains subscribed. The SMS helper first attempts an unknown original-message identifier and receives 400, then accepts the matching signed reply with 204 and idempotent replay. Review snapshots compare complete campaign, revision, approval-request, frozen-candidate and recipient rows, dispatch emissions and recorded provider handoffs against their pre-review values. The draft stays draft and gains no approval or delivery authority. The original D-2 wording is unchanged; this does not claim every separate activation and dispatch clause complete.

These are nonempty sanity journeys through actual public routes, browser documents, native D1 and production adapter boundaries. Snapshot expected values come from independently chosen contacts, permissions and saved step counts. No result is substituted by a production mock. Test-only network edges replace provider responses; native selection, persistence and rendering execute.

## Requested DONE-RIDERS 1–11

| Original rider | Score for this judgment | Evidence and remaining boundary |
| --- | --- | --- |
| 1 — Every acceptance outcome reached | MET under the explicit candidate exception | All six original outcome labels, grouped into AP1–3, execute and pass on the exact source in the registered journey. See scores above. Full final runtime Verify remains required under row 3. |
| 2 — Populated and discriminating proof | MET | Three known contacts, explicit exclusion, confirmed and pending SMS, distinct two-email and three-SMS schedules, exact reason arrays and persisted readback. Permission-safe and permission-refused cases execute. The reviewed read and checks doors confer no send authority. No mutation or per-point test was added. |
| 3 — Recorded exact-SHA Verify registration | CANDIDATE EXCEPTION; final duty PENDING | `scripts/verification/plan.mjs` includes the registered segments test in the identity-data pack's main member. `.github/workflows/verify.yml` supports push, pull_request and workflow_dispatch; the shard invokes `scripts/verification/ci.mjs`. Supplied exact-source push run 42082530847 completed failure solely on generated views and derivative aggregate, with runtime skipped. No green runtime conclusion is claimed or borrowed. No CI query, poll, rerun or dispatch occurred. |
| 4 — Exact-source evidence | MET | The disposable clone's HEAD matched the full original source before setup, execution and final custody. This session ran the journey directly on that source; it does not need to borrow the builder's earlier 650e7ab7e6f6aaccc2d6f625a915dc6d71103df8 run. Raw pinned CONTRACT.md, ACCEPTANCE.md and AGENTS.md returned HTTP 200 and matched clone bytes. |
| 5 — Written inheritance | MET, INSPECTED | AUD-001's pinned metadata explicitly states Rules D-2, and its evidence retains the permission boundary. No new Base inheritance was invented or removed. Shared duties and other clauses retain their separate obligations. |
| 6 — Gap, Evidence, provenance, generated views and counts | Candidate bookkeeping exception; next integration touch required | Source AUD-001 has done, the new evidence and empty Gap. All 316 Requirement and Acceptance bodies in the full generated view match the source. The only status difference is AUD-001; generated acceptance and claims are stale. The contract check exits 1 only naming those two view files; source-lock check exits 0. Historical provenance is retained, including AUD-001's original tested predecessor; this report adds exact-source execution provenance without editing it. Reconcile current main, regenerate merged views and counts, and regenerate source lock last at landing. No standalone product FIX for bookkeeping. |
| 7 — Original acceptance preserved | MET, INSPECTED | The original three APs and D-2 are verbatim. Full-file comparison found no Requirement or Acceptance changes across all 316 source and generated clauses, or between the candidate and fresh-main clause bodies. Existing RULINGS.md remains intact. CONTRACT-STANDARD.md is absent, including the platform location; no structural rewrite is attempted. |
| 8 — Permission and authority | MET in the clause's scope | Confirmed versus pending SMS and all restricted email controls execute on populated state; review preserves the complete recorded authority and handoff snapshots. AUD-001 adds no correction, refund or financial-authority verb. Separate role, refund and dispatch obligations are not awarded by this review. |
| 9 — Provider, legal and device boundaries | MET as an honest boundary; external qualification UNMET-EXTERNAL | The AU Mobile Message network edge proves native confirmation and review counts only. No live SMS delivery, Twilio account, A2P, US carrier registration, legal compliance or device qualification is claimed. SMS-001, SMS-002, SMS-008 and every other provider, account, cross-seed and Base prerequisite remain binding. |
| 10 — No unruled policy default | MET, INSPECTED | No source or acceptance change, permission default, source acceptance, account operation, adoption or release action was made. Existing RULINGS.md and authority boundaries remain. |
| 11 — Guarded landing receipts | PENDING, not an unlanded product refusal | This source is unlanded in the supplied commission. No main equality, full final green runtime Verify, Run site success or COMPLETE full-history publication scan NEW 0 is established here. The original automatic gate and guarded lander retain sole integration custody. |

The original report's gate completion at 18:35:36Z, exact-head job 20261105T183117660677Z-heavy-slot-1b70824f and original Verify run are supplied context, not newly fetched receipts. This judgment does not re-judge or alter CONT-013, its SPLIT and NEW-1 disposition, or its original fix-1 hold. Lifetime FIX total is unchanged: no increment, reset or new FIX was commissioned. C work belongs in the next planned touch; F and G bookkeeping never become standalone product FIX work.

## Commands and actual results

All product work stayed read-only. Setup created only disposable local runtime state and dependencies; it did not edit tracked source. Long-lived commands ran under the supplied cloud subreaper. Exact detailed receipts are [JOURNEY-RECEIPT.json](JOURNEY-RECEIPT.json), [STATIC-RECEIPT.json](STATIC-RECEIPT.json), [TOOLCHAIN-RECEIPT.json](TOOLCHAIN-RECEIPT.json), [SOURCE-RECEIPT.json](SOURCE-RECEIPT.json), [BROWSER-RECEIPT.json](BROWSER-RECEIPT.json) and the actual [journey.log](journey.log).

| Actual command or read | Exit or response | Result |
| --- | --- | --- |
| Fleet global identity, launcher refresh and decrypted-bundle Git helper installation | 0 | Fleet identity and scoped helper installed; no credential values logged. |
| git clone --depth 1 --filter=blob:none --branch cloud/sd-mango-c-f34 https://github.com/just-every/run-mango.git, followed by local fleet identity | 0 | HEAD exactly 8929460e6c1be689f4f206fb6c49b6a5462c67ca. No other product repository cloned. |
| cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive | 0 | Local setup completed, built the local preview and printed RER_SETUP_READY; no remote deployment. |
| cloud_run pnpm exec playwright test --config playwright.config.js tests/audience-controls/segments.spec.ts --workers=1 --reporter=list,json | 0 | One test passed, zero skipped, zero unexpected, zero flaky, zero retries. Outer interval 2026-11-06T02:09:39.294754Z to 02:13:36.334111Z. Playwright wall 236.105 seconds; test duration 226.784 seconds. |
| node src/base/contract-docs.mjs check | 1 | Only ACCEPTANCE.md and docs/CLAIMS.md generated content differs. Neither file was regenerated or committed. |
| node scripts/edition-authoring/cli.mjs check | 0 | Source lock is current at the pin. Actual full output is retained. |
| pnpm run typecheck | 0 | TypeScript passes. |
| Raw pinned CONTRACT.md, ACCEPTANCE.md and AGENTS.md reads | HTTP 200 each | All three match clone bytes; full lengths and SHA-256 hashes are retained. |
| gh api repos/just-every/run-mango/commits/main --jq .sha, then raw CONTRACT.md at that returned SHA | 0, HTTP 200 | Read-only preservation snapshot cc6321c2372d631d9607df9af8ad1dd9f7878e84 at 2026-11-06T02:15:22.689606Z. One GitHub API call total; zero CI API calls. |

Actual host Node was v24.19.0; repository Node and CI pin remain 22.20.0. The supplied toolchain kept the newer host Node. pnpm was 10.12.4 and installed rer was 0.2.85, matching package.json. AGENTS.md still mentions rer 0.2.76; this stale prose is a bookkeeping note, not an adoption. No pin changed, no helper override was used, and no rer 0.2.95 adoption is claimed. The final pinned-runtime CI duty remains independent of this local focused pass.

The public-door chain inspected includes the registered caller, both flow wrappers, segment fixture and journey, catalog journey, channel snapshot journey, contact-history leg, native audience harness, go-live installation harness and worker, provider and SMS network edges, SMS bindings and reply confirmation, source-sync helper, clock, navigation and browser launch helpers, native D1 runtime, fixture startup and artifact helpers. Product read and persistence paths inspected include `src/core/features/campaigns/routes.ts`, `src/core/features/campaigns/service.ts`, `src/core/features/campaigns/composition-repository.ts`, `src/core/features/campaigns/review-snapshot.ts`, `src/core/features/campaigns/audience-summary.ts`, `src/core/features/campaigns/ui/audience-snapshot.tsx`, `src/core/features/lifecycle/approval.ts`, `src/core/features/lifecycle/evaluate-audience.ts` and `src/core/features/lifecycle/campaign-repository.ts`. Draft checks save a clock-stamped audience and per-channel rows under a draft-revision guard; reads expose the complete persisted snapshot; the browser labels those stored values. The checks path does not take the separate approval path that creates recipients and dispatch work.

The complete contract and acceptance files were fetched and traversed structurally: 316 clause bodies, every source Status, Evidence and Gap row, metadata, counts, provenance and field register were retained in [CONTRACT-READBACK.json](CONTRACT-READBACK.json). Product interpretation is restricted to AUD-001 and its original inherited scope; this is not a re-judgment of every unrelated clause.

## Browser proof

The candidate journey asserted outcomes at 1440 and captured the reopened changed review screens once at 1440 and 390. All four actual full-page images were opened and inspected. They show the saved audience rule, saved time and labeled counts. The mixed-channel screens show 3 candidates, 1 wholly excluded, 2 eligible, Email 4, SMS 3 and all three saved exclusion counts of 1. The phone proof keeps that saved snapshot while independent live-estimate controls may still be loading. Screens use only test fixture identities and addresses.

- [Email review at 1440](screens/segment-review-1440.png), 1440 × 6215.
- [Email review at 390](screens/segment-review-390.png), 390 × 10031.
- [Mixed-channel review at 1440](screens/channel-review-1440.png), 1440 × 6779.
- [Mixed-channel review at 390](screens/channel-review-390.png), 390 × 11815.

No email-client rendering, live SMS transport, native-device behavior or visual-quality conclusion is inferred from these captures.

## Status, exact Gap and counts

No product status changed in this task. The pinned source's proposed counts remain **19 done, 199 partial, 98 missing, total 316**, before and after judgment. They are unawarded. Its committed generated acceptance remains **18 done, 200 partial, 98 missing**, before and after judgment. The sole status mismatch is AUD-001. Actual awarded count delta is **0 done, 0 partial, 0 missing**.

The generated view and fresh-main AUD-001 still carry this exact historical Gap:

> Asserted: Candidate count; Eligible contact count; Every exclusion reason and count. Unasserted: Audience rule; Audience as-of time; Per-channel recipient-step count. Missing public-door journey: “Review snapshot — complete acceptance”, covering the unasserted outcomes above.

The fresh execution supplies those three formerly unasserted outcomes. On authorized integration, the original individual change is AUD-001 partial to done, with its full new Evidence and empty Gap; the original individual baseline would move 18 done and 200 partial to 19 done and 199 partial, missing 98 unchanged. The source already proposes that change, so this read-only judge makes no additional flip. That individual proposal must not be summed with concurrent changes. If integration guards are still pending, award nothing and preserve custody; do not demote unrelated clauses or fabricate a new product defect.

Fresh main at cc6321c2372d631d9607df9af8ad1dd9f7878e84 separately records **20 done, 198 partial, 98 missing**. Those are observed main counts, not an AUD-001 award. Comparing every full Status, Evidence, Gap and clause body found five row differences: AUD-001, DESIGN-003, PROP-008, PUB-005 and PUB-006. Requirement and Acceptance bodies are identical for all 316 clauses. [MAIN-READBACK.json](MAIN-READBACK.json) preserves both entire row versions and the complete source and main provenance lines, including all newer assertions. Preserve DESIGN-003's newer retained-provenance evidence and its remaining custody/export Gap, PROP-008's newer foreign-benchmark refusal evidence and full qualification Gap, and PUB-005 and PUB-006's newer done judgments and evidence. No older source row may overwrite them. Refresh this preservation read at actual integration; it is a time-stamped snapshot, not a future-main promise.

## Every unexecuted outcome and pending guard

There are **no unmet substantive AUD-001 acceptance outcomes** and no NEW data-loss, exposure, regression or correctness finding from this review. The following remain explicitly unestablished or NOT RUN; none is silently converted to PASS:

| Item | State and reason |
| --- | --- |
| Required source and exact-chain independent review protection | PENDING. Supplied supported readback says it remains missing. The SAME installed MAIN and FV original index/source-lineage custodian must establish and read back distinct protection, retaining existing stack, provider, CT, account and release duties, before source acceptance or protected final admission. This judge cannot establish it and does not alter custody. |
| Exact-source Verify 42082530847 | NOT POLLED, retried, rerun, dispatched or queried. The commission expressly forbids it. Its supplied failure and runtime skip remain as recorded; the candidate exception is not a full runtime green. |
| Full-green exact-FINAL runtime Verify with relied-on journeys | NOT RUN. It belongs to guarded final integration and must actually execute on the merged final source with its runtime pin; skipped runtime is insufficient. |
| Final source lineage and merged generator work | NOT RUN. No merge, source edit, status flip, generator write or lock write is authorized. Integrator must resolve CONTRACT.md first, preserve all newer main judgments and full assertions, regenerate merged views and counts and provenance, then regenerate and check source lock LAST. |
| Complete full-history publication scan NEW 0 | NOT RUN. This cloud cannot run the fleet's publication scan; it remains required at final integration. The report-only evidence transport is not that scan. |
| Guarded fast-forward, main equality and exact-main Run site | NOT RUN. No product commit, product push, PR, main update, deploy or landing was made. No Run site run ID or landed receipt is invented. |
| Real Twilio, A2P, US carrier, live provider and native-device qualification | UNMET-EXTERNAL and NOT RUN. The owner-held account, registration and device boundaries remain; the AU synthetic edge supplies only local review proof. |
| Cross-seed missing APIs and Base, account, provider, runtime adoption and release prerequisites | Preserved, not awarded. No sibling repository was cloned or mutated; no adoption, release, hold, readmission, submit or successor operation occurred. |
| Other field-register receipts | NOT RUN. All 13 pinned field-register rows remain not run; no live-account or real-device credit is inferred. |
| Full suite, baseline, mutations and new per-point tests | NOT RUN by the original focused-judgment rules. The registered journey ran once with no retry and no new test or source edit. |
| Separate build command | NOT RUN because setup already built the local preview and no product bytes changed. This does not replace final runtime CI. |
| Private held-out tests and private fleet receipts | NOT ACCESSED. They were not shipped. Only the inline original receipts and public exact-source code are relied on. No lane INBOX or STATE was read or written. |

## Integration disposition and evidence custody

This judgment is complete and conditionally supports AUD-001 only. Required source protection is an integration-admission blocker, not a new missing AUD-001 outcome. No source acceptance, hold waiver or landing consent follows. Keep every original automatic gate and lander family, provider prerequisite, account acceptance requirement and release duty intact. Rows 3 and 11 remain pending until actually executed final proof and guarded landing supply them.

The full plan is [PLAN.md](PLAN.md). Actual non-secret receipts, command outputs, original mapping, all original source row bytes and hashes, fresh-main preservation readback and the four functional screens are explicitly selected for the separate evidence ref evidence/ct-judge-mango-aud001-20261105-1842-sol1. No evidence enters a product branch or PR. Evidence publication carries reports only and never product READY, acceptance or landing. Product HEAD, index and tracked bytes are checked again before publication. Browsers and owned runtime children have closed; disposable clone and dependencies are removed after publication, with the final terminal message confirming cleanup. Packet files remain outside the clone.

Final conditional disposition: **AUD-001 ACCEPT ON LANDING; original AP1–3 MET, all six original outcome labels MET, D-2 MET in review scope; zero NEW findings; actual award and count delta zero; final review protection and rows 3 and 11 pending.**
