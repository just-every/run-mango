# PROP-004 original exact-source verdict

**Verdict: ACCEPT ON LANDING — product scope only.** All four original frozen outcomes are MET at `dcc08a05da68b051a956f210d57886bf7b4075fd`. No substantive failing rubric row and no NEW product correctness, data-loss, exposure or regression finding was established. This is neither source acceptance nor a DONE award, hold waiver, release, landing consent or full-final runtime-green receipt.

| Clause | Entire original scope and inherited duty | Relied-on public-door journeys and outcome mapping | Exact-source Verify and disposition |
| --- | --- | --- | --- |
| PROP-004 — Content | Requirement: “A proposal provides an editable draft and a preview for every selected channel.” AP1 editable campaign name, email subject and email body; AP2 editable proposed SMS body; AP3 editable sender identity and destination links; AP4 saved-content preview for each selected channel. Core, Rules D-1. | `tests/proposals-decision/content-editing.spec.ts` — “[PROP-004] adopted email and SMS content, sender identities and destinations remain editable without sending authority”: native proposal generation and adoption, authenticated revision PATCH, campaign GET and review GET, persisted D1 revisions and links, then native browser Review save and reload through `tests/proposals-decision/sms-content-editing.ts`. Covers AP1–AP4 across email and SMS. `tests/proposals-decision/decision-routes.spec.ts` — “[PROP-001][PROP-002][PROP-003][PROP-004][PROP-005][PROP-006][PROP-007][PROP-008][PROP-009] grounded suggestions expose evidence and costs in revenue then deadline order, become editable drafts only by owner decision, and fail without substitutes”: public native generation, adoption, editable name and subject and readback, retaining draft authority. Both ran once, 2 passed. Independent functional browser walkthrough additionally edits every content and sender field and a destination, saves, reloads and reads both native campaign doors; populated content persists with both saved previews. | Registered in the push `identity-data` pack. Inline recorded push Verify **42082704056**, exact pin, completed **failure** solely generated-view freshness and derivative aggregate, with runtime skipped where recorded. Explicit commissioned CANDIDATE exception applies; this is not full-final green. ACCEPT ON LANDING, with final rows 3 and 11 and source custody still guarded. |

## Identity, scope and source

- Repository: just-every/run-mango. Source branch: cloud/sd-mango-c-f33. Exact original source: `dcc08a05da68b051a956f210d57886bf7b4075fd`. Affected original gate: sd-mango-c-f33-gate-1.
- Task: ct-judge-mango-prop004-20261105-1842-sol1, replacing the original commission under the supplied 2026-11-06T01:26Z authority. No earlier exact-source judgment is supplied; this report does not invent one or judge a successor source.
- Model and reasoning record: this execution is the current Codex, GPT-6-based session. Commissioned routing is **gpt-6.1-sol, xhigh**. The tools expose no independent exact-model-ID or reasoning-effort telemetry, so those routing labels are commission metadata, not a separately verified backend admission receipt. No Opus execution is claimed. CT retains actual Sol-admission and original-to-replacement custody; the original waiter was not retired here. No other model or agent session was launched and no paid API or usage credits were used.
- No task product branch, product commit, product push or PR was created. The task's product-read-only authority supersedes generic builder mechanics. Only the separate evidence ref is authorized for publication.
- Full pinned CONTRACT.md and ACCEPTANCE.md bytes were fetched from raw.githubusercontent.com and verified equal to the shallow filtered clone. Structural readback enumerated all 316 clauses, 1,284 numbered acceptance points and all Status rows; the complete original PROP-004 Requirement, four APs, meta, source Evidence and Gap and generated Evidence and Gap were reviewed. Relevant full journeys, called fixture helpers, native save/readback/preview code, repository AGENTS.md, BASELINE.md, HANDOVER.md, relevant operating and mechanism policies, RULINGS RL-41, RL-42 and RL-105 and the inline judge references informed the judgment. CONTRACT-STANDARD.md is absent; no structure was rewritten. Source hashes are in source-readback.json and contract-inventory.json.

Only pinned CONTRACT.md supplies the product framing: category **Email marketing and marketing automation**; first buyer **a US ecommerce operator or creator-led business with 1,000–250,000 contacts, one brand and one to ten marketing operators; USD and an operator-selected IANA time zone, with US consent, privacy, carrier and sender rules**. Incumbents are **Mailchimp, Klaviyo, ActiveCampaign, Kit (ConvertKit)**; named up-and-comers are beehiiv, Customer.io and Omnisend. This is a non-UI functional judgment; no design or visual-quality decision is assigned or made.

## Frozen rubric, unchanged

Original rubric text, verbatim:

> R1 campaign name, subject and email body—tests/proposals-decision/content-editing.spec.ts lines 27–66 and tests/proposals-decision/sms-content-editing.ts lines 29–61; R2 proposed SMS body—sms-content-editing.ts lines 27–61; R3 sender identities and destinations—content-editing.spec.ts lines 29–68 and sms-content-editing.ts lines 29–61; R4 saved previews—sms-content-editing.ts lines 31–49.

| ID | Original item | Score | Actual public-door proof at the pin |
| --- | --- | --- | --- |
| R1 | campaign name, subject and email body | MET | The registered journey PATCHes independently chosen HTML, reads exact saved HTML and derived text through campaign and review doors twice and checks stable D1 state. The browser portion independently changes name and subject, saves and reloads. The independent walkthrough also changes all three through the native editor and confirms saved email body in the iframe. |
| R2 | proposed SMS body | MET | A generated dual-channel proposal is adopted; the native SMS message field is changed independently, saved and reloaded. Repeated campaign and review reads and persisted sms_body match. The independent walkthrough repeats the functional task with different synthetic content. |
| R3 | sender identities and destinations | MET | Chosen email sender name, From, Reply-to and postal address plus replacement link label and destination are saved, read through both authenticated native doors and checked in D1. The native SMS sender changes from MANGO to GARDEN, persists and appears in the saved SMS preview. The independent walkthrough edits all sender fields and the link destination through the browser and confirms reload/readback. |
| R4 | saved previews | MET | Before save, the original SMS preview persists while the form has unsaved changes. After save and reload, saved SMS text and sender and saved email subject and body are asserted. Independent walkthrough additionally verifies both original saved previews remain before save, then chosen saved email and SMS content after reload. Final captures show the rendered email iframe and SMS preview at 1440 and 390. |

These are the original four rows, with no extra rubric or scope reduction. Draft content is populated even when this isolated browser fixture has zero eligible recipients; no empty-recipient list is used as evidence for content persistence or previews. Provider and carrier delivery is not an outcome proved by these draft journeys.

The original inspected counterfactuals remain inspected, not executed: discard email-body save; discard SMS-body save; discard sender save; render stale saved preview. The route, repository and preview data flow and the independent chosen-value readbacks were inspected against them. No source mutation, mutation testing, new per-point test, full suite or baseline run occurred. No private held-out material was read, copied or reconstructed.

## DONE-RIDERS 1–11

| Row | Judgment | Evidence, limit and retained duty |
| --- | --- | --- |
| 1 | MET locally; CANDIDATE exception for CI | The two registered native journeys pass once at the exact source; every original AP is reached through native routes or the browser and checked against saved content. Final exact-FINAL green remains mandatory. |
| 2 | MET | Nonempty generated email and SMS content, independently chosen edits, repeated authenticated readbacks and populated D1 revision/link rows. Expected normalized email footer is independently spelled out. No provider handoff is used as a substitute for outcome proof. |
| 3 | CANDIDATE EXCEPTION; final duty OPEN | Workflow registration is inspected: `.github/workflows/verify.yml`, `scripts/ci/mango-plan.mjs`, `scripts/verification/plan.mjs` and `scripts/verification/ci.mjs` load both files in push identity-data. Recorded exact-source push Verify 42082704056 failed only generated freshness and derivative aggregate under the supplied exception. Runtime skips do not establish green. No poll, retry, rerun or dispatch was made. |
| 4 | MET locally | Clone HEAD equals the exact pin before and after execution; no tracked or staged changes. Both native journeys pass and independent browser proof is at these same source bytes. Current shell used Node 24.19.0 and pnpm 10.12.4 under the supplied toolchain; the prescribed final runtime pin is not changed or adopted by this local supporting proof. |
| 5 | MET, INSPECTED inheritance | `CONTRACT.md:114` retains Core and Rules D-1. The entire D-1 text is retained below. No Base duty is newly cited, removed or transferred. |
| 6 | MECHANICAL OPEN, not product refusal | Source is a done candidate with empty Gap and current dual-channel Evidence; generated acceptance is partial with stale evidence and SMS gap. Local contract-docs check exits 1 solely “ACCEPTANCE.md: generated content differs; run contract-docs write.” Source-lock check exits 0. No write or lock regeneration was authorized or performed. The lander owns merged generation, counts/provenance and source-lock LAST. |
| 7 | MET, INSPECTED | Original Requirement and four APs exactly match the supplied excerpt and generated acceptance. No AP, CT rider, ruling, structure or obligation changed here. Relevant canonical-save and static analytics policies remain intact. |
| 8 | MET for this scope | The journey attempts unauthenticated PATCH against an existing populated revision, receives 401 and confirms the original email body remains; authorized PATCH then succeeds. Repeated readback preserves original proposal/evidence, draft state, null approval and digest, zero approval requests, recipients and dispatches, and no jobs. Source guards route writes through session, Origin and draft.write checks and a guarded draft transaction. This does not claim a complete security certification of other clauses. |
| 9 | MET boundary, external work UNMET-EXTERNAL | Synthetic AI, Shopify and unavailable SMS transport establish local drafting only. No real AI, commerce, SMS transport, Twilio A2P, US carrier qualification, real device, provider account or hosted delivery was established. Original provider, device, account, cross-seed and Base boundaries remain binding. |
| 10 | MET, INSPECTED | No policy default, consent, spend, authority, source pin, runtime adoption, provider operation or release change was made. Changed draft sender and links remain visible approval blockers, as expected. No sending authority is gained. |
| 11 | PENDING guarded landing | No main-equality receipt, exact-FINAL full-runtime Verify, complete full-history publication scan NEW 0 or exact-main Run site receipt was established. Only the original gate and lander families retain integration custody. |

Full inherited D-1, unchanged:

> Optional marketing modules. A disabled commerce, SMS or design module is unavailable, constructs or contacts no adapter and invents no facts, content, forecast or delivery. Commerce-dependent audience inclusion and exclusion remain blocked without their required current source; manual mail-only work uses recorded contact and permission evidence.

D-1 is an inherited boundary, not a claim that this enabled-module fixture proves every disabled-module behavior. Those broader implementation and provider duties are not promoted by this judgment.

## Commands and actual exits

All dependency and browser commands ran through the supplied cloud toolchain and cloud_run subreaper. Chromium was `/usr/bin/chromium` with `--no-sandbox`. No Mac slot helper was invoked. Setup generated disposable local state; it changed no tracked source. Private setup URLs, credentials and raw runtime logs are excluded from the packet.

| Actual command or operation | Exit and result |
| --- | --- |
| Fleet global identity, launcher refresh and fleet Git setup | 0; fleet identity and decrypted-bundle-only Git helper installed. |
| `git clone --depth 1 --filter=blob:none --branch cloud/sd-mango-c-f33 https://github.com/just-every/run-mango.git <disposable-checkout>` and per-clone identity | 0; HEAD is the exact pin. Raw pinned CONTRACT.md, ACCEPTANCE.md and AGENTS.md fetches succeeded and equal checkout bytes. |
| `cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive` | 0; local dependency/build/migration preparation. Fleet cleanup hook installed after setup; no commit made. |
| `cloud_run env MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium MANGO_NO_FIXTURE_SERVER=1 MANGO_TEST_WORK_DIR=<external-runtime> pnpm exec playwright test --config playwright.config.js tests/proposals-decision/decision-routes.spec.ts tests/proposals-decision/content-editing.spec.ts --workers=1 --reporter=list` | 0; **2 passed, 2.1 minutes, zero retries**; content journey 1.5 minutes, decision-routes 20.1 seconds. The explicit no-fixture-server selection omits the unused global server; both tests still own native isolated runtimes. |
| `cloud_run env MANGO_TEST_WORK_DIR=<external-runtime> node ../browser-proof.mjs` — initial functional walkthrough | 0; native UI save/reload and readback passed. Initial full-page capture left the offscreen email iframe unpainted; original receipt and captures retained. |
| Same independent walkthrough with capture diagnostic, scrolling the saved email iframe into view before each capture | 0; saved heading visible at both widths; final 1440 and 390 captures inspected and visibly show saved content. Only the external capture script changed. This resolves a capture artifact; neither registered journey was rerun. |
| `cloud_run pnpm run typecheck` | 0. An engine warning reports current Node 24.19.0 versus package engine 22.20.0; no pin changed. |
| `node src/base/contract-docs.mjs check` | 1; only ACCEPTANCE.md generated freshness. Expected mechanical exception; no generator write was made. |
| `node scripts/edition-authoring/cli.mjs check` | 0; source lock current. Complete actual stdout retained. |
| `git diff --exit-code`; `git diff --cached --exit-code`; `git status --porcelain`; HEAD readback | 0; both diffs empty, status empty, exact pin unchanged. |

Every NOT RUN reason:

- CI discovery, polling, log retrieval, rerun, dispatch and PR creation: explicitly prohibited by this read-only commission. GitHub CI API calls: **0**. Verify 42082704056 is inline supplied evidence, not independently queried here. No other SHA's green is borrowed.
- Full suite and baseline: explicitly excluded; only the two relied-on registered journeys ran, once.
- Mutation tests and the four counterfactual executions: explicitly excluded; inspected only.
- Generator write, generated-view edits, lock regeneration, source edits, status-flip commits, product pushes and landing: prohibited; only nonmutating freshness checks ran.
- Live accounts/providers, Twilio registration, US carriers, native devices, another seed's APIs and hosted operations: no authority or qualifying account/device proof supplied; UNMET-EXTERNAL and no delivery qualification claimed.
- Complete publication scan, final main equality, exact-main Run site and actually executed full-green exact-FINAL runtime Verify: final integration custody, unavailable and unestablished in this judge.

The inline original gate's reported local proof remains attributed to that request: M1 job 20261105T183236375944Z-heavy-slot-b2c9648a (two native journeys and types) and independent editor proof job 20261105T183823582647Z-heavy-slot-af2d6e6b (1440 and 390), with gate exit0 PASS at 18:40:39Z. Their actual Mac files were not accessed; they are not substituted for this session's actual receipts. Historical external harness/module and analytics-URL diagnostics were supplied as corrected without product/test edits and were not replayed here.

## Exact Status, Gap, counts and flip disposition

The pinned source table marks PROP-004 **done**, with the dual-channel Evidence and an empty Gap. This candidate is **UNAWARDED**. The generated acceptance view marks it **partial** and carries this exact Gap:

> Asserted: Editable campaign name; Editable email subject; Editable email body; Editable email sender identity and destination links; Saved email preview; Saved SMS preview. Unasserted: Editable proposed SMS body and SMS sender identity. Twilio A2P and US carrier registration remain owner-held; SMS transport and qualification and real AI, commerce and provider qualification are not established. Carried provider, device, account and cross-seed or Base prerequisites, rer 0.2.95 adoption and account and acceptance requirements remain binding. CONT-013 retains the ct SPLIT and NEW-1 disposition and original fix-1 hold.

The proposed SMS body and SMS sender unasserted outcomes are now reached and checked at this original source. All external and inherited boundary sentences above remain binding; this report removes none. There is no remaining substantive PROP-004 Gap under R1–R4. No source edit is requested from this read-only judge.

Exact contingent flip for the authorized custodian: after source/exact-chain protection and final integration gates, retain the original four APs and D-1 citation, apply or retain only PROP-004 partial → done, use the current native dual-channel journey Evidence, and empty only the discharged product Gap while retaining every existing provider/account/device/cross-seed/Base/runtime-adoption and hold obligation in its governing custody. Add exact accepted-source and final provenance without replacing unrelated or newer judgments. Regenerate views/counts from the merged source; do not hand-edit or commit the cloud's generated view copies. Before those gates, no effective status award or source acceptance follows from the candidate's done text.

| Count basis | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Pinned generated acceptance view, before proposed PROP-004 flip | 18 | 200 | 98 | 316 |
| Pinned CONTRACT source candidate, after proposed flip — UNAWARDED | 19 | 199 | 98 | 316 |
| This read-only judgment's actual awarded change | 0 | 0 | 0 | 0 |

A complete ID comparison found PROP-004 is the only source-versus-generated status difference. Its isolated proposed delta is +1 done, −1 partial, 0 missing. Do not add it to any concurrent branch delta or treat these historical candidate totals as fresh-main totals. If a final gate later prevents adoption, the effective clause stays partial and the proposed +1 is not awarded; that would not undo the local functional findings in this report.

## Every pending guard and retained blocker

1. Supported readback supplied in the commission says distinct **source AND exact-chain review protection is missing**. The SAME installed MAIN/FV original index/source-lineage custodian must establish and read it back before source acceptance or protected final admission. A predecessor stack alone is insufficient. This independent product proof changes none of that custody.
2. Actual authorized Sol admission and original-to-replacement commission custody remain CT's responsibility. No waiter retirement, additional session, successor, readmission, hold or lifecycle change was performed.
3. Preserve every newer fresh-main Status **and the entire Gap, Evidence, provenance and newer assertions**, all existing stacks/provider/CT/account/release obligations and original source lineage. No fresh-main integration is asserted here.
4. Merge and resolve CONTRACT.md source judgments first; keep unrelated legacy prose and all RULINGS. The lander must run merged generator write/check/counts/provenance, then source-lock LAST with its check. Cloud generated ACCEPTANCE.md and docs/CLAIMS.md remain untouched.
5. Require **actually executed full-green exact-FINAL runtime Verify with the relied-on journeys**. The source's permitted generated-view exception and skipped runtime do not satisfy this final duty.
6. Require **COMPLETE full-history publication scan, NEW 0**, guarded fast-forward and main equality, plus exact-main green Run site. No such scan or landing receipt is claimed.
7. Preserve all original provider, device, account, cross-seed, Base, runtime-pin/adoption, acceptance and release boundaries, including rer 0.2.95 adoption requirements and CONT-013 ct SPLIT, NEW-1 and original fix-1 hold. Synthetic drafting grants no provider or carrier qualification.
8. Lifetime FIX total is unchanged; no FIX was consumed or commissioned here. Its existing numeric total was not supplied and is not invented. C batching and F/G bookkeeping create no standalone product FIX.

No local substantive product blocker remains in the frozen rubric. Every listed guard remains required; ACCEPT ON LANDING grants no authority to bypass it. READY at the end of the terminal report denotes the completed read-only judgment and evidence handoff, never product READY, acceptance, award or landing.
