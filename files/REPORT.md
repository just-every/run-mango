# sd-mango-c-f128 — CONT-014

Repository: https://github.com/just-every/run-mango
Branch: cloud/sd-mango-c-f128
Candidate: c171453c8ded27238971b3397999d672edc1055b
Base main: a6ff098f6cdf8b356b76105c726c2561f6051a8d
Pinned predecessor: 1f7408aa79736babc12783c0b46eb4105d0648ad

CONT-014 remains PARTIAL. The selected native text, number, boolean and list slice is exercised through native definition and value routes, built operator controls, authenticated readback and independently inspected persisted rows. No acceptance text, Status, Gap or Evidence cell was changed. Counts before and after: 20 DONE, 198 PARTIAL, 98 MISSING. No plan row or other target was promoted.

The predecessor already contained the requested helper and registered call. This round adds a separate desktop save before the phone edit, direct persisted readback and permission snapshots after that desktop save, and zero plus false round trips. The phone changes values that were actually saved on desktop. This proves two distinct state transitions instead of repeating a pending selection after resizing. Production validation, route and input components already support the requested behavior and needed no change.

Plan and scope are in PLAN.md. The product diff from main retains both predecessor commits, adds two fleet commits, and contains only the custom-property helper, its registered caller and the source lock. The save commit is identified by the complete Git provenance in custody.json; the terminal SHA above is authoritative. No homepage, branding, workflow, provider connection or migration changed. No new test registration, test removal, skip or cap increase was introduced. The focused registration count remains one. All existing role, date, money, import, source-history, replay, segment and personalization assertions remain in the registered journey.

## Acceptance evidence

The entry point is tests/go-live/sync-integrations.journeys.ts, test “[CONT-014][CONT-026][CONT-025] [INT-007][INT-014][INT-011][OPER-007][CONT-004][CONT-006] scoped custom events and client sync, replayable refusals and last-moment send suppression”. It calls proveCustomProperties and its provePropertyTypes helper and belongs to Verify's connections pack in scripts/verification/plan.mjs.

| Acceptance sentence | Evidence and lines | Disposition |
| --- | --- | --- |
| 1. Text, number, USD money, date, boolean and list properties fit the declared property-count limit. | tests/go-live/custom-property-types.ts lines 11–33 define the four remaining types through native POST and GET, persist correctly typed data, including zero and false, and inspect storage. Lines 35–82 save distinct desktop and phone values, then reopen and inspect the controls and storage. Lines 83–95 reject number strings and booleans, boolean strings and numbers, and undeclared list choices, without changing prior fields, history or permissions. Existing date and money proof remains in custom-property-journey.ts. | Selected four-type slice covered. Full property-count boundary remains unproved; acceptance 1 is not claimed complete. |
| 2. Imports, forms, integrations, the events API, flow actions and operator edits set properties; history records each source and time. | tests/go-live/custom-property-journey.ts lines 25–81 retain CSV mapping, native import, event and contact API writes, attributed sources and idempotent event replay. The new helper exercises operator writes and preserves history on refusal. | Existing examples retained. The complete per-source and original-time matrix remains held. |
| 3. Properties are usable in segments, personalization, conditional content and flow splits, and changing one leaves consent unchanged. | tests/go-live/custom-property-preview.ts lines 9–32 retain date-derived membership, positive and missing-value money previews, bare-token refusal, approved delivery and actual edge bytes. custom-property-types.ts lines 18–24, 52, 82 and 95 compare full consent rows and both recorded channel states. | Selected invariance and existing segment and preview examples covered. General segment, personalization, conditional-content and flow-split matrix remains held. |
| 4. An operator defines date and money properties, imports both, changes one through the API, and sees a date-based segment and a personalized money preview with each source in history. | tests/go-live/custom-property-journey.ts lines 17–81 and custom-property-preview.ts lines 9–32, invoked through the registered journey. | Existing complete example retained and rerun with this candidate. |

## Frozen scope rubric

| Row | Outcome | Proof |
| --- | --- | --- |
| R1 | Define native text, number, boolean and list properties and read definitions back. | custom-property-types.ts lines 11–27. |
| R2 | Persist typed text, numeric zero and a negative decimal, false and true booleans, and permitted list options. | custom-property-types.ts lines 29–55 and 63–82. Public readback and raw persisted fields are independently checked. |
| R3 | Operate actual boolean and multi-select controls on desktop and phone, saving distinct values and reading them back. | custom-property-types.ts lines 35–77. Screens at 1440 and 390; assertions at 1440. |
| R4 | Refuse incompatible numeric and boolean values and undeclared list choices atomically. | custom-property-types.ts lines 83–95; named 400 errors, unchanged complete properties, history, raw profile and permission snapshots. Other valid changes are submitted in the same refused request. |
| R5 | Preserve the previously exercised date, money, import, history, role, segment and personalization outcomes. | Registered full journey; existing custom-property-journey.ts and custom-property-preview.ts assertions are retained. |

## DONE-RIDERS

These are reported against the candidate; this is a PARTIAL claim, not a DONE request.

| Row | Result | Evidence or boundary |
| --- | --- | --- |
| 1 | PARTIAL | The selected native slice is covered by R1–R5. The full count boundary and source and usage matrices remain unproved. |
| 2 | PASS for selected scope | Nonempty native data, explicit zero and false, distinct permitted lists, both supported saves and unsafe refusals with unchanged storage, consent and channel snapshots. custom-property-types.ts lines 29–95. |
| 3 | PARTIAL: connections PASS, whole Verify red | Exact-SHA connections job 127996956227 passed. Whole Verify run 42248291450 failed in the unchanged campaigns journey, described below. |
| 4 | PASS locally | Exact-candidate journey and mechanical receipt identify c171453c8ded27238971b3397999d672edc1055b. |
| 5 | INSPECTED | No inherited Base duty was added or claimed, and no clause text was rewritten. Existing consent invariance remains an explicit acceptance duty. |
| 6 | PASS mechanical; judgment retained | Contract generation write and check pass; generated files restored from main. Status, Gap and Evidence cells are unchanged under the single-writer rule. |
| 7 | PASS | No acceptance, coverage-map or ruling rewrite. |
| 8 | PASS for retained native authority scope | Existing role matrix in custom-property-journey.ts lines 16–17 is retained; permitted Owner, Admin and Manager operations succeed and Author, Analyst and Support definition writes refuse. No permission or production authority change. |
| 9 | PARTIAL boundary retained | Network-edge fixtures establish native behavior only. No live-provider or SMS qualification is claimed. |
| 10 | NOT APPLICABLE | No policy default adopted; no scope ruling needed. |
| 11 | PENDING guarded landing | Main equality, exact-main Run site and a COMPLETE publication scan remain the fleet's independent landing gates. This cloud never pushes main. |

## Pre-ready self-check

1. Selected native behaviors have public-door assertions in the registered journey. A dropped false value, wrong type, missing list selection or partial write after refusal fails this proof. Exact-SHA CI is recorded separately; the whole clause remains PARTIAL.
2. Existing clause assertions are retained. The changed initial numeric fixture is zero and later uses a negative decimal; the boolean traverses false, true and false. No test registration, skip, conditional bypass or authority expectation was removed.
3. Property edits and refused requests preserve complete consent evidence and email and SMS state. Existing event replay cannot restore an older date after an edit; the surrounding registered journey retains revoked-key and erasure replay cases. CONT-013's original hold, SPLIT and NEW-1 disposition remain untouched; no erasure repair or third FIX is claimed.
4. No UI source changed. The existing property panel and actual labeled native controls are captured at 1440 and 390. No custom icon-only control was added; existing text buttons are labeled. Configuration remains under Settings. The screenshots were inspected for the changed property region.
5. Source lock is fresh, generated documents generate and check, typecheck and first-party command checks pass. New changed source contains no email-shaped fixture value or new prose token resembling a GitHub repository. No cloud publication scanner is available or required by the cloud route; do not infer COMPLETE or zero findings. Exact-main Verify, Run site and scan custody belong to the maintained lander.

## Local receipts and handoff

The baseline registered journey passed on the pinned predecessor in 4.2 minutes. That run is recorded in journey.log and is not represented as terminal candidate proof. Terminal proof is journey-final.log plus journey-receipt.json. Mechanical commands and their actual exits are in mechanical-receipt.json, with full command logs in this packet. No migration changed, so the migration-ledger command is not applicable.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

GAP CONT-014: Acceptance 1's complete property-count boundary, acceptance 2's remaining import, form, integration, event API and flow-action source-history and time matrix, and acceptance 3's general segment, personalization, conditional-content and flow-split matrix remain unproved. Live-provider and SMS qualification and all carried provider, device, account, cross-seed, Base and release holds remain unchanged.

Main at a6ff098f6cdf8b356b76105c726c2561f6051a8d is healthy: push Verify 42217811205 and Run site 42217811413 completed successfully. These are baseline receipts, not terminal candidate CI. The original rer adoption and release requirements remain unchanged.

No DEFAULT line is needed. No blocker was discovered in the selected native slice; the terminal handoff is BLOCKED by the unreproduced exact-SHA Verify failure described below. No PR is required: Verify has a branch push entry point. Publication scanning, acceptance promotion and landing are fleet work.

## Runtime probe and terminal custody

PROBE CONT-014 1: native definition POST and definition GET, native contact-property PUT and built property editor -> all four definitions read back; text, zero, negative decimal, false, true and permitted sorted list values survive native reads, raw persistence and reopened controls. Desktop and phone edits each save independently. Number strings and booleans, boolean strings and numbers, and undeclared list choices return named 400 refusals with unchanged prior properties, history, consent and both channel states.

PROBE CONT-014 4: built Settings, CSV import mapping, scoped native API, saved segment and campaign preview -> existing valid date and money values import, attributed edits appear in history, date membership matches known contacts and the saved personalized preview and actual email edge retain the expected money value and fallback.

The terminal registered journey passed: 1 passed, 4.2 minutes, exit 0 on c171453c8ded27238971b3397999d672edc1055b. No product repair was attempted; the unrelated Verify investigation is recorded below. Fourteen current property screenshots are published with hashes in screens-receipt.json. The final product push succeeded on its first attempt, with every candidate author and committer using the fleet identity and no co-author trailers. Main was fetched and merged again immediately before that push; it remained at the recorded base, and the product tree was clean.

Exact-SHA push Verify run 42248291450 was discovered in progress for c171453c8ded27238971b3397999d672edc1055b and remained in progress at the first status read after the required five-minute interval. There was no duplicate dispatch or rerun. Candidate and baseline CI receipts distinguish the heads. Run site on the candidate is pending main landing. The publication scan is unestablished: commit=c171453c8ded27238971b3397999d672edc1055b complete=false historyScanned=false findings=unknown; the cloud route delegates it to the fleet. Main does not equal the candidate; this is a branch-only handoff, never a landing claim.

CLAIM CONT-014 PARTIAL points=4 tests=tests/go-live/sync-integrations.journeys.ts#[CONT-014][CONT-026][CONT-025] [INT-007][INT-014][INT-011][OPER-007][CONT-004][CONT-006] scoped custom events and client sync, replayable refusals and last-moment send suppression

## Exact-SHA Verify failure investigation

Verify run 42248291450 completed with failure on the terminal SHA. Build and every shard except campaigns passed, including connections job 127996956227, which runs the registered CONT-014 journey. The failed campaigns job is 127996956317; the verify aggregation failed only because that shard failed. The failed archive was read once using `gh run view 42248291450 --repo just-every/run-mango --job 127996956317 --log-failed` and is included in this packet.

The failing test was tests/go-live/presend-checks.journeys.ts, “[BUILD-008][BUILD-012] preview a saved newsletter, resolve pre-send blockers and refuse unsafe handoff expansion”. In tests/go-live/email-size.flow.ts line 79, approval expected HTTP 200 and received HTTP 409: “Link host shop.example.test could not be resolved and checked.” The named blocker was message.links.resolved. No byte of that journey, its link fixture or production link inspection differs from main in this candidate. This alone is not treated as proof of a flake.

Before editing, the exact command `node scripts/verification/ci.mjs campaigns` is being rerun on the failed SHA, with CI=true, SHARD=campaigns, the workflow's complete four-file MANGO_VERIFY_MEMBERS value, Node 22.20.0 and two native workers. The cloud browser uses the required system Chromium with no sandbox. Main comparison follows sequentially on this same VM. No product repair has been attempted or guessed.

The exact candidate campaigns shard rerun completed successfully: four tests passed in 5.8 minutes, including the formerly failing presend journey in 3.4 minutes. The command exited 0 and the receipt binds to c171453c8ded27238971b3397999d672edc1055b. The observed CI assertion did not reproduce. No source change or speculative repair is allowed under the brief's VERIFY REPAIR instruction: “If it does not reproduce, stop BLOCKED with that output; do not guess a fix.” The sequential main comparison is retained as requested by RED VERIFY.

The same failing presend journey also passed on main a6ff098f6cdf8b356b76105c726c2561f6051a8d on the same VM with Node 22.20.0 and the same system Chromium: one test passed in 3.3 minutes, exit 0. The original CI failure was not reproduced on either tree. This is not reported as VERIFY_REPRODUCED, and no nonzero local exit is fabricated. The underlying transport exception was not exposed by the production refusal, so no specific infrastructure root cause or proven flake classification is invented, and no CI rerun was dispatched.

VERIFY_NOT_REPRODUCED {"head":"c171453c8ded27238971b3397999d672edc1055b","job":127996956317,"command":"node scripts/verification/ci.mjs campaigns","test":"presend-checks.journeys.ts: preview a saved newsletter, resolve pre-send blockers and refuse unsafe handoff expansion","exit":0,"ciFailure":"Expected 200, received 409: Link host shop.example.test could not be resolved and checked."}

Terminal product custody: cloud/sd-mango-c-f128 is pushed at c171453c8ded27238971b3397999d672edc1055b. Local target journey, typecheck, first-party checks, contract generation and lock checks passed. Exact-SHA Verify 42248291450 is red solely in the unchanged campaigns journey; connections job 127996956227 passed. No new commit was made after that failure. No acceptance promotion, publication scan completion, main equality or landing is claimed. GitHub reads used seven calls, including the failed-job archive read, within the ten-call budget; polling was no faster than once per 300 seconds. No private held-out gate material or credentials were selected for evidence.

BLOCKED branch=cloud/sd-mango-c-f128 head=c171453c8ded27238971b3397999d672edc1055b reason=Verify 42248291450 job 127996956317 failed; exact-shard candidate rerun and same-test main comparison passed; the brief requires an unreproduced failure to stop without a speculative repair.
