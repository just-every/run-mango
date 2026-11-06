# sd-mango-c-f120 result

Repository: just-every/run-mango
Branch: cloud/sd-mango-c-f120
Candidate: 62a3621e2f17facaa076ff1a88afa9e7ee34f810
Base main: a6ff098f6cdf8b356b76105c726c2561f6051a8d
PR: none; push is the existing Verify entry point.

RESULT-007 remains PARTIAL. This round closes the selected acceptance 6 campaign-level identified-human aggregate for one saved revision across links and two email steps. CONTRACT.md and its Status, Gap and Evidence cells are unchanged. Before and after: 20 DONE, 198 PARTIAL, 98 MISSING. The supplied plan's RESULT-007 row gains this bounded proof; no other plan row changes and no additional campaign is selected.

The production query counts distinct extant contacts among non-automated click facts scoped to both campaign and revision. It returns human clicks, unique people and automated requests separately. The existing Link engagement panel displays those three totals using existing metric components. Recipient-step performance retains its existing meaning. No migration, provider, erasure, authority, homepage, logo or styling change was made.

## Execution and observed results

The complete execution plan is in PLAN.md. The registered results journey runs its existing outcomes, cancellation, costs, archive and follow-up phases. The reporting fixture now contains the original three destinations, two email steps and the original SMS skipped outcome. Public tracked-link requests produce eight human click facts across two people and three automated facts from a scanner-only person. Independent known expectations are:

| Scope | Human clicks | Unique people | Automated requests |
| --- | ---: | ---: | ---: |
| Selected saved revision | 8 | 2 | 3 |
| New work | 5 | 2 | 1 |
| Studio notes | 3 | 1 | 1 |
| Visit the studio | 0 | 0 | 1 |
| Other revision, same campaign and destination | 2 | 1 | 0 |
| Other campaign, same destination | 3 | 1 | 0 |

The selected revision remains zero after control traffic and before its own clicks. Another campaign's revision requested under this campaign returns 404. The performance report independently remains eight human clicks and three clicked recipient steps, because one human clicked in two email steps. Authenticated reports, displayed totals before and after reload, per-link CSV, exact clicker identities, clicker CSV and saved segment membership all reconcile. Existing outcome CSV, anonymous recipient label, click-map inactivity and saved-outcome cohort checks remain.

The first focused registered run passed: 1 test, 2.8 minutes. The final exact-SHA run also passed: 1 test, 2.8 minutes, exit 0, after the capture-position adjustment. Exact-candidate typecheck and source-lock check passed again. Both inspected captures show the changed values 8, 2 and 3 clearly below navigation. Assertions run at 1440. Browser proof captures the changed report at 1440 and 390; screenshot inspection is recorded in RECEIPT.json. The only capture adjustment positions the heading below the sticky navigation; it changes no assertion or product behavior.

## Selected frozen rubric

All rows use tests/campaign-results/results.journeys.ts, the registered test titled “[CAMP-001][CAMP-009][RESULT-001][RESULT-004][RESULT-007][CAMP-016][PUB-001][SEG-003][REPORT-004] inspect outcomes, cancel queued work, publish archives and follow up from recorded engagement”. It invokes exerciseCampaignReports in tests/campaign-results/reporting-journey.ts through the native runtime. Push Verify already includes the campaign-results configuration in its reports pack. Candidate push Verify run 42229362900 is bound to this exact SHA; its observed conclusion is in CANDIDATE-CI.json.

| Rubric | Observable outcome | Proof in reporting-journey.ts | Local result |
| --- | --- | --- | --- |
| R1 | One contact counts once despite repeated human requests across two links and two email steps; a second human counts separately | lines 21–28 and 34–35 | PASS |
| R2 | Same destination in another revision or campaign contributes nothing to selected totals; mismatched revision is refused | lines 13–20 and 25–28 | PASS |
| R3 | Scanner on every link stays separate and scanner-only contact adds no human person | lines 23–28 and 45–47 | PASS |
| R4 | Actual saved-revision report displays 8, 2 and 3 after reload, with correct link counts | lines 38–51; screenshots at lines 85–91 | PASS |
| R5 | Existing performance metric still counts clicked recipient steps | lines 29–31 | PASS |
| R6 | CSV, click map and exact saved cohorts retain their public outcomes | lines 32–37, 52–79 | PASS |

## Acceptance sentences and held remainder

| Acceptance | Result and proof |
| --- | --- |
| 1 | PARTIAL, carried. Three distinct saved destinations are exercised. Repeated positions sharing one destination and historical identity remain outstanding. |
| 2 | PARTIAL, carried. Human totals and automation are independently checked for campaign links at lines 23–28 and 45–47. Flow-message reports and the remaining matrix are unproved. |
| 3 | PARTIAL, carried. The saved campaign body and inactive click map remain exercised at lines 38 and 77–83. Other saved-revision combinations remain unproved. |
| 4 | PARTIAL, carried. Exact known clickers remain checked at lines 34–37 and 52. The broader first-time, last-time and list combinations are unchanged and unproved. |
| 5 | PARTIAL, carried. CSV identity parity and exact saved cohort remain checked at lines 36–37 and 53–58. Analyst masking and other role combinations remain unproved. |
| 6 | Selected POINT MET locally. Lines 13–51 prove contact uniqueness per known destination and per selected campaign revision across two email steps, plus isolation and UI reload. Production query: campaign-engagement.ts lines 30–36 and 52–54. UI: campaign-engagement.tsx lines 23–28. |
| 7 | UNPROVED, held. Anonymous retained link counts after erasure are outside this round. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold remain; no third FIX or follow-up-only builder is started. |
| 8 | PARTIAL, carried. Three links, repeated clicks, scanner per link, independent human and automated counts, map, CSV and cohorts run through lines 21–83. Remaining count/cohort combinations and large-cohort CSV behavior are unchanged. |

All provider, device, account, cross-seed and Base prerequisites and rer 0.2.95 adoption and release requirements remain unchanged. No erasure repair or real-provider qualification is claimed. These are honest held remainders, not a newly introduced blocker. The explicit planner selects only the missing campaign aggregate and prohibits expanding into the held matrix.

## DONE-RIDERS

No DONE claim is made. Row results against this candidate are:

| Row | Result | Evidence or limitation |
| --- | --- | --- |
| 1 | PARTIAL | Selected point covered by R1–R6. Full clause outcomes listed above remain unproved. |
| 2 | PASS for selected point | Nonempty independent controls and explicit expected counts at reporting-journey.ts lines 13–35; wrong-revision refusal at line 20. Missing aggregate, counting steps, summing per-link people or including scanners would fail these assertions. |
| 3 | PENDING CI | Registered push journey; exact-SHA Verify 42229362900. No green conclusion is inferred from local proof. |
| 4 | PASS local | Exact candidate SHA recorded in tested-head.txt and final run receipt. Relevant source and test hashes are bound by sources.lock.json. |
| 5 | INSPECTED, unchanged | No inherited duty or clause text changes. Native session and erasure middleware and assertCampaignReportReadable remain in place. |
| 6 | PASS mechanical, status retained | Generator write and check pass, then generated views restored whole from origin/main. Status cells and counts untouched. |
| 7 | PASS | No acceptance text or coverage rewrite. CONTRACT.md diff is empty. |
| 8 | INSPECTED, unchanged | Read-only aggregate; no authority verb added or weakened. Wrong campaign and revision pairing is refused. Broader existing role proof remains held. |
| 9 | PASS boundary | No live provider, hosted, legal, device or erasure guarantee claimed. |
| 10 | PASS, no new default | Existing identified-contact count semantics reused. No new custody, consent, spending or authority policy. |
| 11 | PENDING lander | Candidate is branch-only. Main equality, exact candidate Run site and COMPLETE full-history publication scan are the Mac lander's duties. |

## Inherited duties and pre-ready check

| Duty or check | Result |
| --- | --- |
| Authenticated private report and erasure read fence | INSPECTED unchanged: campaign-engagement.ts lines 9–17 calls the existing guard; campaign-report-routes.ts retains native private routing. No identity fields are added to the response. |
| Campaign and revision ownership | PASS selected scope: reporting-journey.ts lines 13–20; controls share the same destination but remain isolated. |
| Consent, revocation, erasure and replay | No write or transport path changed. Existing erasure fence remains. Anonymous erasure totals and full replay matrix remain unproved and are not claimed. |
| Assertions preserved | PASS: no assertion removed, skipped, narrowed or moved behind a width or branch condition. Expected counts change only to include the added legitimate second-step clicks. No test registration added or deleted; the existing registration gains RESULT-007 in its title. |
| UI rules | Existing components and fonts retained, metric labels are at least 13px. This touched report panel has no icon-only controls; its actions have visible text. No configuration action added. Browser captures cover 1440 and 390. |
| New literal hygiene | Added text has zero email-shaped literals and no newly introduced ambiguous bare owner-and-repository prose token. Existing fixture destination strings are retained. No credential or environment dump is included. |
| Source lock and generated views | PASS. Lock regenerated after final source and test changes and synchronization; its check passes. Generator write and check pass; ACCEPTANCE.md and docs/CLAIMS.md are restored from main and uncommitted. No migration ledger change. |
| Publication and landing | PENDING external lander. Scan not run in cloud as permitted by cloud route; complete, historyScanned and findings are unestablished, never fabricated. Candidate is not main; Run site on candidate is not claimed. |

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0
PROBE RESULT-007 6: public tracked-link GETs for one person across two links and two email steps, a second human, same-destination controls and scanners on each link -> authenticated report has 8 human clicks, 2 campaign people and 3 automated requests; per-link people 2,1,0; performance has 3 clicked recipient steps; actual UI retains the totals after reload.

CLAIM RESULT-007 PARTIAL points=6 tests=tests/campaign-results/results.journeys.ts#[CAMP-001][CAMP-009][RESULT-001][RESULT-004][RESULT-007][CAMP-016][PUB-001][SEG-003][REPORT-004] inspect outcomes, cancel queued work, publish archives and follow up from recorded engagement
GAP RESULT-007: Remaining position and identity combinations, flow-message reports, list timing and role masking, anonymous erasure counts, historical unknown-link identity, other revision combinations and the remaining count/cohort matrix are unproved; all carried provider, Base and CONT-013 holds remain unchanged.

## Custody

The first real product commit was immediately pushed with the fleet push guard. All candidate author and committer fields and trailers were inspected, including side parents; no co-author trailer is present. The branch push succeeded on attempt 1. No main push, force push, PR or CI dispatch was made. Main Verify 42217811205 and Run site 42217811413 were completed/success on base a6ff098f6cdf8b356b76105c726c2561f6051a8d; they are not candidate proof. Candidate Verify is run 42229362900, push event, exact SHA above. The evidence packet is published separately to evidence/sd-mango-c-f120. The product branch contains only the scoped code, existing journey extensions and regenerated source lock.

Exact-SHA local proof is complete; candidate Verify was last observed in progress, with no conclusion, on its push event. This report does not call it green. GitHub API calls: 2 of 10, one base discovery and one candidate discovery. The 300-second interval forbids an immediate repeat. Remote refs were checked by Git: the cloud branch equals the candidate, main remains the base, and the product checkout is clean.
