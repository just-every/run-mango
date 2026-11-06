# DESIGN-003 FIX1 independent new-source judgment

**DESIGN-003: ACCEPT ON LANDING.** Original frozen R1 is now MET by this judge's one actual native public-door execution at `b2c7ffad18b02d90d15d293e023e607171bf3e9d`. Original R2–R5 MET are carried with source/test equality, and their assertions completed incidentally in the same required journey. No qualifying NEW product finding. No source acceptance, status award, count award, landing or hold release is performed.

Tag: ct-judge-mango-design003-fix1-20261105-2221-sol1. Repository: just-every/run-mango. Judged branch: cloud/sd-mango-c-f42-fix-1. Product SHA: b2c7ffad18b02d90d15d293e023e607171bf3e9d. PR: none created or changed. Lifetime: **FIX1 of 2**, unchanged; this judgment adds no FIX.

Execution agent: Codex. Authorized session routing is **GPT-6.1 Sol, xhigh**, under the 2026-11-06T01:26Z replacement authority. The runtime exposes no independent backend-model or reasoning-effort attestation; those routing values are task-declared, not a separately verified provider receipt. No other model session, helper agent, API/usage credits or paid-provider request was used.

## Scope, provenance and full-input audit

This is the sole new-SHA R1 judgment requested by original CT request16034. It builds on the complete inline original verdict ct-judge-mango-design003-20261105-2051, which ended 2026-11-05T21:21:17Z STAYS PARTIAL at 9b9f3867af955c390b39b740b89f96b4ef929ed1. That old SHA was not executed or re-judged. The original observations, command exits, NOT RUN boundaries and frozen scores are retained in ORIGINAL-JUDGMENT-CARRY.md.

The clone's HEAD and advertised source branch MATCH the pin. Raw commit headers confirm parents 9b9f3867af955c390b39b740b89f96b4ef929ed1 and 955785c08ed00910bc83e3aa3bbb0a54703f6f71. Fresh advertised main at this review is cc6321c2372d631d9607df9af8ad1dd9f7878e84. After the initial clone, no checkout change, merge, source edit, product commit, product push, PR or Actions API call was performed.

Full immutable CONTRACT.md, ACCEPTANCE.md and RULINGS.md bytes at the original, candidate, merged-main and fresh-main refs were read and compared by the full-file audit. Complete pinned input copies and hashes are in the packet. The semantic review covers the full DESIGN-003 requirement and all five acceptance points, D-1, DATA-001, RESULT-004, the four inherited Base duties, boundaries and Field proof register, the full registered journey and its relied-on native/provider/retention/portability helpers. The full-file comparison finds **all 316 requirement/acceptance clause bodies identical** across those refs; RULINGS.md equals fresh main. This is a bounded DESIGN-003 judgment, not a fresh review of every other clause's product behavior.

Original-to-head changes are exactly seven files: CONTRACT.md, ACCEPTANCE.md, sources.lock.json, scripts/verification/plan.mjs, the sanitizer, the existing generation flow and main's forecast-provenance test. The only changes among design-generation, design-import, campaign-authoring, portability and migration dependencies are model.ts and design-generation.flow.ts. Unchanged spec registration, 600-second deadline, retention helper, fake provider, orchard LayerDoc, design UI/layout source and migrations are byte-equal to the original. No image, layout or visual-quality decision is re-judged. Existing 1440 and 390 screenshots and the applied-screen capture are retained as functional proof.

## Product target (pinned CONTRACT.md only)

Category: email marketing and marketing automation. Buyer: a US ecommerce operator or creator-led business with 1,000–250,000 contacts, one brand and one to ten marketing operators, USD and an operator-selected IANA time zone, subject to US consent, privacy, carrier and sender rules. Whole incumbent scope: Mailchimp, Klaviyo, ActiveCampaign and Kit (ConvertKit); up-and-comers beehiiv, Customer.io and Omnisend. The default newsletter release profile does not waive the wider marketing target.

## Clause and frozen rubric

DESIGN-003 — Design data and records. Core; cites BASE-DATA-001, BASE-DATA-004, BASE-OPS-003 and BASE-OPS-005; rules D-1.

Requirement: The design connection discloses only commissioned design material, avoids repurchasing retries and retains its authoring record.

Acceptance, unchanged:
1. The service receives only Mango’s fixed email-layout description with the operator’s brief stripped of every personalization token, then only the chosen candidate image; no contact, audience or personalization value or token is sent.
2. Every paid request has a run-derived idempotency key; a retry or replay buys nothing again.
3. The retained run records the brief, provider run and layout identifiers, each candidate’s outcome, SHA-256 and size, chosen candidate, operator, times and safe failure code, and is never deleted.
4. Candidate images and layouts are retained as authoring evidence and exported under DATA-001.
5. Each paid request records its RESULT-004 cost fact.

| Clause | Public-door journey and acceptance coverage | Exact-SHA workflow relationship | Judgment |
| --- | --- | --- | --- |
| DESIGN-003 | tests/campaign-authoring/design-generation.spec.ts:4, “[DESIGN-001][DESIGN-002][DESIGN-003][DESIGN-007][DESIGN-008][DESIGN-009][DESIGN-010] generate and select a design without saving or spending twice, and expose provider refusal”; browser generation/choice and authenticated design/portability HTTP doors, Worker queue, D1 and R2; all AP1–5 via walk0–walk2 and design-retention.ts | Registered in Verify's push authoring pack. Supplied exact-source push Verify 42117902278 completed/failure: generated ACCEPTANCE.md check only, build 127562373516, aggregate 127562479234, runtime skipped. Candidate exception applies; final executed runtime-green still owed. No Actions query by this judge. | ACCEPT ON LANDING |

Frozen meanings preserved verbatim from the commission:

| ID | Original meaning | Original score | This judgment |
| --- | --- | --- | --- |
| R1 | outbound material/token removal | NOT MET, product FIX | **MET**: actual dialog submission, retained brief and actual provider create JSON at the new pin; chosen-image assertions unchanged and completed |
| R2 | run-derived paid-request idempotency/retry buys nothing twice | MET | **MET carried**: unchanged advance/repository/adapter/fake/spec bytes; original checks preserved and completed incidentally |
| R3 | immutable brief/provider run+layout IDs/candidate outcomes+hash+size/chosen/operator/time/safe failure | MET | **MET carried**: unchanged record implementation; strengthened R1 input leaves all metadata assertions intact; completed incidentally |
| R4 | original distinct images/layouts retained/exported/opened/restored with unsafe private reads refused | MET | **MET carried**: retention/portability/original-byte implementation and fixture equality; populated allowed and unsigned/revoked reads completed incidentally |
| R5 | perrequest RESULT004cost facts/no purchases on reread/export | MET | **MET carried**: unchanged cost recording and purchase accounting; exact reconciliation/no-repurchase checks completed incidentally |

## Actual R1 proof and regression boundary

The existing sanitizer now uses `/\{\{([\s\S]*?)\}\}/g`, matching the renderer and token-protection delimiter scan, before the unchanged stray-brace, spacing and punctuation cleanup. The quoted fallback parser permits braces inside quoted strings. The route sanitizes before retaining/enqueueing; the queue concept sanitizes using the same function before the adapter sends it. Editor prefill uses that same sanitizer. No transport schema, permission, queue, storage, cost, original-image or layout code changed in FIX1.

Actual browser submission:

```text
Good Things Are Ripening
Hello {{first_name | fallback: "{friend}"}} and {{unsubscribe_url}}
```

Actual retained brief and outbound operator-brief suffix:

```text
Good Things Are Ripening
Hello and
```

The real create capture consists of Mango's fixed marketing-email layout description, that exact suffix and the existing portrait/inspiration/candidate-slot fields. No token delimiters, first_name, fallback, friend, unsubscribe_url, seeded contact email, @example.test audience value, earlier draft body or preheader crosses in the quoted-token request. All four captured answered create JSON bodies were also inspected for contact/audience/token leakage; none found. The transcript has **53 requests, 22 POSTs**. The existing 503/429 replay and 402 refusal occur only at the paid HTTP network edge.

Successful conversion captures contain only output=layerdoc, model=fast and the chosen PNG hash. Slot A SHA-256 is d7cca3fa95a4173145baa4ef4abe2284ff02c1e622ff2935e45f0c6a38a6b97a; distinct slot B SHA-256 is 01790123278698b5b66a9b96a695f7472e99ca02a4c54e0ffa5e9c4d0b44c75f. The injected refused conversion has no recorded multipart fields because the fake refuses before parsing; it proves no empty real payload.

The same complete journey performed the permitted native cases and the populated unsafe refusal cases: disabled provider returns 409 with no run/outbound; failed and quota purchases leave draft authority and paid evidence intact; duplicate close is refused with 409; originals are opened/exported/restored in a separate native D1/R2 runtime; restored owner reads succeed and unsigned/revoked reads return 401. Existing row/byte/reload and no-purchase assertions completed. R2–R5 receive no new separate corpus, probe, scoring expansion or acceptance narrowing. No plausible touched-code regression, introduced loss/exposure or ordinary correctness defect was found. NEW findings: **0**.

## Commands, exits and limitations

All long work used cloud_run and real account HOME. The supplied toolchain script selected actual **Node 24.19.0**, pnpm 10.12.4, repository rer 0.2.85 and system Chromium 154.0.8037.57, with --no-sandbox, --use-mock-keychain and --password-store=basic. The user-supplied shim upgrades older Node; it kept this newer VM Node. This report does not mislabel it Node 22.20.0. AGENTS' Node-22-or-later prerequisite is met; pnpm emitted its exact-engine warning. Product/test/config pins were unchanged.

The qualifying root command, wrapped by the external receipt driver with timeout 1000:

```sh
cloud_run env MANGO_VERIFY_STAGE=main \
  'MANGO_VERIFY_FILES=["campaign-authoring/design-generation.spec.ts"]' \
  MANGO_NO_FIXTURE_SERVER=1 MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  MANGO_TEST_WORK_DIR=/home/agent/rer-consolidation/work/ct-judge-mango-design003-fix1-20261105-2221-sol1 \
  WRANGLER_SEND_METRICS=false pnpm exec rer run verify:app
```

| Actual check | Exit/result | Saved receipt |
| --- | --- | --- |
| Required setup: npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive, timeout 900 | 0; 43.408 s; setup's own build completed | setup-receipt.json and setup.log |
| One registered native journey at exact pin | **0; 1 passed; 153.955 s outer, 151.240 s test, 153.209 s coordinator**; 2026-11-06T02:02:27.572864Z to 02:05:01.526657Z; one worker, one attempt, no retries | native-receipt.json, native.log, coordinator-timings.json and coordinator-main.files.json |
| node src/base/contract-docs.mjs check | 1; only ACCEPTANCE.md generated content differs | views-check-receipt.json and views-check.log |
| node scripts/edition-authoring/cli.mjs check | 0 | source-lock-check-receipt.json and source-lock-check.log |
| node scripts/edition-authoring/cli.mjs verify-base --offline | 0; no drift or unrecorded copies | base-offline-check-receipt.json and base-offline-check.log |
| Corrected read-only payload/counter inspection | 0; no journey repetition | payload-inspection-receipt.json, inspect-evidence.py and R1-payload-inspection.json |
| Full source/requirement/status comparison | completed; all 316 clause bodies equal, dependency equality recorded | contract-source-audit.json, full-contract-comparison.json and fresh-main-status-differences.json |

Incidental command corrections, not product failures: an early read raced the still-finishing clone and found no files; it was read after clone completion. FETCH_HEAD initially selected the original source rather than main; a subsequent shallow fetch refused the non-fast-forward local tracking update, so only the disposable origin/main tracking ref was corrected to the already-fetched advertised cc6321c... object. No remote ref was changed. An initial post-run payload-inspection expression wrongly applied a brace ban to JSON serialization, matching JSON's structural braces; it exited 1 and was corrected to inspect concept text while checking other values in JSON. The capture and native journey were unchanged and never rerun. A few optional file-location probes found no such file; actual maintained helpers were read at their existing paths.

NOT RUN: full/baseline suite (forbidden); old-source journey or failing-before replay (old source already judged); separate R2–R5 probes or fresh corpus (outside scope); mutations/permanent tests (forbidden); extra typecheck/build (not this read-only judgment's assigned focused execution; setup's native build is identified separately); generator write or source-lock regeneration (would mutate this read-only source); Actions query/log fetch/rerun/dispatch (forbidden; supplied CI classification retained); live 12ui (spend prohibited, UNMET-EXTERNAL); provider corpus deletion, hosted custody or real provider idempotency qualification (external, unclaimed); main integration, publication scan, exact-final runtime Verify and exact-main Run site (original fleet families' duties).

No full CI-green inference follows from the local pass. Supplied run 42117902278 is completed/failure and its runtime shards were SKIPPED. Build 127562373516 failed only the generated-document check; aggregate 127562479234 followed BUILD=failure/SHARDS=skipped. This is the explicit candidate-view exception, **never final executed runtimegreen**. The affected gate's supplied terminal exit0 at this exact head, 146.331 s, completed 2026-11-05T22:30:04Z, is corroboration from the same original family; it is not this independent execution or a source award.

## Riders 1–11 and inherited duties

| Rider | Disposition |
| --- | --- |
| 1 | Substantive outcomes reached through the registered browser/HTTP/native journey; AP1–5, existing R2–R5 carry, one new-source execution. Workflow loading/final green remains row 3's duty. |
| 2 | MET: populated operator brief/contact/audience and chosen-image paths; dangerous money/privacy/data-loss paths complete and unsafe cases refuse without the forbidden outcome. The original quoted-brace leak is absent. |
| 3 | Candidate generated-view-only exception; final full runtime execution at exact FINAL SHA remains mandatory. |
| 4 | MET by this actual exact-source run and explicit unchanged-dependency equality, not by builder prose or precommit timing. |
| 5 | MET: all four Base duties and D-1 remain written; DATA-001 export linkage and RESULT-004 cost obligation preserved. |
| 6 | Pending lander mechanics: candidate CONTRACT still honestly partial; generated view stale; provenance, entire Evidence and Gap and counts must be regenerated from fresh merged CONTRACT after the guarded decision. No status/GAP narrowing is authorized here. |
| 7 | MET: all 316 acceptance/requirement clause bodies and RULINGS unchanged; no structural rewrite, waiver or duplicated rider. |
| 8 | Original MET carried: private routes retain draft.write authority and actual allowed/unsigned/revoked reads completed; no permission code change in FIX1. Wrong-role expansion was not assigned. |
| 9 | MET boundary: live provider, account, device and missing cross-seed duties remain UNMET-EXTERNAL/unclaimed, including R-203. |
| 10 | MET: no new policy default, authorization or spend choice adopted. |
| 11 | Pending guarded lander only: exact-main equality, required exact-SHA workflows, full-history publication NEW0 and Run site. |

Base inheritance remains: BASE-DATA-004 permits only the declared seed external and AP1's exact data; BASE-OPS-003 double-delivery semantics remain state/key protected; BASE-OPS-005 retains operator and times with surviving runs; BASE-DATA-001 and DATA-001 carry original records and files into the opened native restore. The original notes that separate queue double-delivery, choose/close per-action actor and second-export equivalence belong to existing implementation/other-clause coverage are preserved as F, not new blockers. D-1's disabled module no-contact/no-row refusal completed. RESULT-004's unknown price remains permitted; cost units are reconciled, never invented as a paid live receipt.

## Status, Gap, counts and fresh-main preservation

No product files changed: DESIGN-003 remains **partial** in the pinned tree and in fresh main. The substantive proposal is partial → done **only on guarded landing**, Evidence naming this actual source/report and existing journey, Gap exactly empty after the required guard disposition. Current award delta: **0**. Original R1 product blocker: closed by this judgment; other original blockers: none. Qualifying NEW blockers: none. Pending guards and external proof remain explicitly listed; acceptance is not protected-final admission.

| Count scope | Pinned source before and after this read-only judgment | Fresh main cc6321c... | Conditional DESIGN-003-only flip on that fresh main |
| --- | --- | --- | --- |
| Published | 13 done / 97 partial / 0 missing / 110 | 13 / 97 / 0 / 110 | 14 / 96 / 0 / 110 |
| Target and push further | 5 / 103 / 98 / 206 | 7 / 101 / 98 / 206 | unchanged 7 / 101 / 98 / 206 |
| All | 18 / 200 / 98 / 316 | 20 / 198 / 98 / 316 | 21 / 197 / 98 / 316 |

The old source's unawarded proposal was Published 14/96 and All 19/199/98. Restoring 13/97 and 18/200/98 in FIX1 was not an award. The source-only delta remains +1 done, −1 partial if guarded integration eventually authorizes it. Recompute then; never sum concurrent proposals.

Whole-row fresh-main comparisons detect newer PROP-008 Evidence assertions (benchmarks with owned identifiers refused, protected forecast records unchanged, valid recovery generation) and PUB-005/PUB-006 done rows with their newer consent/payment journeys. These must be retained **whole**, including Status AND Gap AND Evidence/provenance and newer test assertions; the pinned branch is behind them. No other status row differs. The candidate had retained every non-DESIGN-003 merged-main status row, but this is not a license to overwrite fresh main. Full differences are preserved in fresh-main-status-differences.json and fresh-main-to-head.diff.

Pending original family guards, all unchanged:
- Original affected terminal PASS is supplied and separate. CT must retain original-to-replacement custody and retire the original waiter only after actual Sol admission; this judge launches or releases nothing.
- accepted(source)=empty; original and FIX1 source and exact-land holds ACTIVE. No pin, acceptance, protected admission, release, readmit, submit, adopt or lifecycle change here.
- Existing installed source-lineage custodian and original integration family alone dispose dependencies; no borrowed pin, hold overwrite, spent retry or successor resolver. Preserve all other stack/source/account/Base obligations, including existing rer 0.2.95 adoption/account prerequisites and CONT-013 SPLIT/NEW-1/original fix-1 hold carried by fresh-main PROP-008.
- Final merged CONTRACT status, exact Gap, complete Evidence/provenance naming this judged source/report, actual counts, generator write/check, and source lock LAST, with main's newer judgments and unrelated legacy prose intact.
- ACTUALLY EXECUTED full-green exact-FINAL runtime Verify loading relied-on journeys; generated-view-only candidate red/runtime SKIP cannot satisfy it.
- COMPLETE full-history publication scan NEW 0; guarded integration and main equality; exact-main Run site green. This shallow review performs no publication scan and no integration.
- R-203 live 12ui qualification, real account acceptance, hosted custody/corpus boundaries remain UNMET-EXTERNAL and unclaimed. Subscription-only/no-spend boundary remains.

Evidence publication is separate report custody only, on refs/heads/evidence/ct-judge-mango-design003-fix1-20261105-2221-sol1. READY in the final message means this read-only judgment is complete, not a product branch push, source award or final-runtime green.

Cleanup before report transport: the native journey ended and no Chromium/workerd/Vite runtime remains; this task's node_modules and external runtime scratch were removed. The clean pinned clone is retained only until evidence transport is verified, then removed. The packet stays outside it. See cleanup-receipt.json.

Builder corroboration remains honestly precommit: its reported before exit1/134.328s, after exit0/223.620s and typecheck exit0/22.451s were recorded in the merged working tree before the final commit. Inline reports bind runtime/test hashes to the final source; this judge did not download those receipts and does not relabel them as exact-new-SHA execution. The independent native-receipt.json is this session's actual committed-source proof. Supplied CI/affected context is separately labeled in supplied-ci-and-affected-context.json.

Report transport verification: the first report-only evidence save d38b2dafadffcf256734351dac3acb439d5d83d3 was independently fetched from the declared evidence ref and all 79 selected file lengths, SHA-256 values, Git blobs and report-only tree entries verified. The initial transport receipt/log/command and verification are included in the completed packet; a subsequent ordinary descendant evidence save publishes these receipts as well. This changes no product checkout or award.
