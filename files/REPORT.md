# sd-mango-c-f125 report

CONT-014 remains PARTIAL. The planner-selected native type proof is already present in the supplied base, and this run revalidated it without changing product code or adding a redundant commit.

Repository: just-every/run-mango
Product branch: cloud/sd-mango-c-f125
Full candidate SHA: 1f7408aa79736babc12783c0b46eb4105d0648ad
Supplied base SHA: 1f7408aa79736babc12783c0b46eb4105d0648ad
Fetched main SHA: a6ff098f6cdf8b356b76105c726c2561f6051a8d
Main equals candidate: false.
New product commits in this round: zero.
Candidate includes the two published base commits 1bd8b6a7cb9bdea5689e2824a8d3a6219a62aac5 and 1f7408aa79736babc12783c0b46eb4105d0648ad.
PR: none; the existing Verify workflow starts on branch pushes.
Counts before and after: 20 DONE, 198 PARTIAL, 98 MISSING.
Status, Gap, Evidence, acceptance text and generated views: unchanged.

## Outcome and plan results

1. Read the launcher instructions, repository AGENTS.md, full CONT-014 clause and status row, source routes and controls, the complete custom property journey and its helpers, verification registration, and the supplied plan, rulings and DONE riders.
2. Confirmed that the selected base already supplies the requested helper at ./tests/go-live/custom-property-types.ts, invoked by proveCustomProperties and the registered integration journey. The initial file search ran on main before switching to the supplied base; inspection after switching resolved that apparent absence.
3. Ran setup through cloud_run with the fleet owner identity. Ran the focused registered integration journey through cloud_run with a 20 minute alarm and system Chromium, then the typecheck and first-party command check. All passed. The browser journey passed one registered test in 4.1 minutes.
4. Fetched current main and rebased before candidate publication; main was already an ancestor, so no commit changed. Repeated contract write and check, restored both generated view files from main, and regenerated the source lock last. All commands returned zero and the lock stayed byte-identical.
5. Inspected every candidate author, committer, trailer and full message, including all commits in the ancestry difference. Both candidate commits use the fleet identity and have no co-author trailers. No assertions were removed or edited. No test registrations were added, removed or replaced; this focused registration remains one test.
6. Pushed the exact inherited candidate to the requested product branch through cloud-push.py on its first attempt. Published the report packet separately on the task evidence branch. The product branch contains no fleet report files.

No follow-on clause was selected: the supplied POINTS explicitly bounds this round to acceptance 1's four native types and holds the wider matrices. No policy default, provider qualification, homepage work, Base update, erasure repair, workflow modification or contract status change was attempted.

## Frozen rubric for the selected work

All rows below run inside the one registered test at ./tests/go-live/sync-integrations.journeys.ts:13, named “[CONT-014][CONT-026][CONT-025] [INT-007][INT-014][INT-011][OPER-007][CONT-004][CONT-006] scoped custom events and client sync, replayable refusals and last-moment send suppression”.

| Row | Selected outcome | Native public door and proof | Result |
| --- | --- | --- | --- |
| R1 | Define text, number, boolean and list | ./tests/go-live/custom-property-types.ts:7 to 28 creates independently specified definitions with POST /api/settings/properties and checks GET /api/contact-properties readback. | PASS |
| R2 | Persist typed values | Same helper:29 to 34 writes through PUT /api/contacts/:id/properties, checks contact GET, then independently checks persisted profile JSON. String, decimal, true and an allowed list choice survive. | PASS |
| R3 | Actual operator controls and saved false | Same helper:36 to 68 uses the text input, numeric spinbutton, boolean select and multiple list select. The operator changes all four, operates the phone selects, saves false and two declared options, reopens the editor and verifies typed readback and persisted values. Captures exist at 1440 and 390. | PASS |
| R4 | Refuse incompatible numbers and booleans | Same helper:70 to 82 attempts numeric string and boolean number inputs, string and numeric boolean inputs. Each named 400 leaves all properties, history, persisted profile, consent and channel records unchanged. | PASS |
| R5 | Refuse an undeclared list option atomically | Same helper:73 to 82 mixes an allowed and undeclared option with attempted changes to other valid fields; named 400 preserves every prior field and permission record. | PASS |
| R6 | Retain carried evidence and authority | ./tests/go-live/custom-property-journey.ts:13 retains permitted and refused roles; :25 to 81 retains date and money imports, validation, original source history, integration writes, replay refusal and consent invariance. ./tests/go-live/custom-property-preview.ts retains date segment membership, money fallback and actual email-edge content. No existing assertion changed. | PASS |

Exact-head CI covering the registered journey:
- Verify 42229120427, push on cloud/sd-mango-c-f118, completed success, head 1f7408aa79736babc12783c0b46eb4105d0648ad.
- The requested product branch push also started Verify 42237885247 on the identical SHA; it was in progress at discovery. No workflow was dispatched or rerun.
- ./scripts/verification/plan.mjs:29 registers this journey in the connections pack.

## Acceptance sentences and inherited duty

| Item | Sentence and proof | Honest scope result |
| --- | --- | --- |
| Acceptance 1 | “Text, number, USD money, date, boolean and list properties fit the declared property-count limit.” Native text, number, boolean and list proof is R1 to R5. Existing date and money proof remains in proveCustomProperties. | PARTIAL: selected type outcomes pass, but the complete property-count boundary remains unproved. No full acceptance 1 completion is claimed. |
| Acceptance 2 | “Imports, forms, integrations, the events API, flow actions and operator edits set properties; history records each source and time.” The carried journey exercises CSV, integration contact writes, event writes and operator edits with source history. | PARTIAL: complete remaining source, history and time matrix remains unproved. |
| Acceptance 3 | “Properties are usable in segments, personalization, conditional content and flow splits, and changing one leaves consent unchanged.” Carried date segment, money personalization and permission invariance pass; R4 and R5 prove refused writes preserve permission evidence. | PARTIAL: general segment, personalization, conditional-content and flow-split matrix remains unproved. |
| Acceptance 4 | “An operator defines date and money properties, imports both, changes one through the API, and sees a date-based segment and a personalized money preview with each source in history.” ./tests/go-live/custom-property-journey.ts:17 to 83 and ./tests/go-live/custom-property-preview.ts:7 to 38 perform these outcomes through Settings, import, native API, contact detail, segment and saved preview doors. | PASS, carried unchanged and rerun on exact candidate. |
| D-2 | Permission precedence is named in CONT-014's Rules metadata and CONTRACT.md:27. ./tests/go-live/custom-property-types.ts:18 to 24 and :69 to 82 compare complete recorded permission state before and after accepted and refused property writes. The existing registered journey exercises revoked API credentials and current suppression before handoff. | PASS for selected property behavior; no claim over unrelated permission surfaces. |

## DONE-RIDERS rows

This is a PARTIAL claim, with no count promotion.

| Rider | Result | Candidate-bound evidence or remainder |
| --- | --- | --- |
| 1 | FAIL for full clause; PASS for selected slice | R1 to R6 pass locally and exact-head Verify 42229120427 is green. Count boundary and the remaining source and usage matrices are not reached. |
| 2 | PASS for selected slice | Seeded values, true then false, allowed and invalid list options, and multi-field refusals check observable output and preserved storage in helper lines 29 to 82. |
| 3 | PASS | The connections verification pack invokes the registered journey. Push Verify 42229120427 completed success on the exact full candidate SHA; new branch run 42237885247 was in progress. |
| 4 | PASS | Local journey ran on the exact candidate; no source or test byte changed afterward. Working tree clean after final mechanical checks. |
| 5 | PASS within scope | CONT-014 expressly names D-2; its permission invariant is proven above. No new Base inheritance is claimed. |
| 6 | MECHANICAL PASS; status metadata untouched | Contract generator write and check returned zero and wrote zero documents. Source lock check returned zero. Existing Status, Gap and Evidence cells remain the landing writer's responsibility; their older unimplemented wording is not a new scope claim. |
| 7 | PASS | No contract acceptance, coverage mapping, clause identifier or rider was changed. |
| 8 | PASS for selected scope | Owner writes and existing role refusals remain in the registered journey. R4 and R5 refuse invalid writes with no property, history or permission mutation. No authority implementation changed. |
| 9 | PASS, bounded | All external fixtures remain network-boundary synthetic proof. No live provider, device, account, SMS or legal qualification is claimed. |
| 10 | NOT APPLICABLE | No new policy decision or default was adopted. Supplied ct rulings and CONT-013 holds remain unchanged. |
| 11 | PENDING LANDER | Candidate is branch-only. Main differs. Exact candidate Run site and full-history publication scan are not established here. Main's own green runs do not prove candidate landing. |

## Pre-READY self-check

1. Selected user-visible behaviors have passing assertions through native routes and actual operator controls. Full clause completion is not claimed; gaps are explicit.
2. No assertion was removed, narrowed, skipped, or moved behind a condition. No code or test changed in this run.
3. Property writes preserve consent and channel state. The carried property event replay cannot resurrect an old value, and the registered journey retains revoked-key refusal. Erasure implementation and the existing CONT-013 disposition and original fix-1 hold are unchanged; no third repair was attempted.
4. No screen was edited. The existing property controls and readback were visually inspected at 1440 and 390; labels remain readable, configuration remains under Settings, and no icon-only product control was introduced.
5. Source lock fresh. Exact-head Verify 42229120427 green. New named-branch Verify 42237885247 in progress. Guarded landing, candidate Run site and publication scan remain with the fleet. No new fixture or source bytes, including email-shaped strings, were introduced.

Publication scan text: commit=1f7408aa79736babc12783c0b46eb4105d0648ad complete=UNESTABLISHED historyScanned=UNESTABLISHED findings=UNESTABLISHED. A cloud-side scan is not required by this task's cloud route. This is not a zero-findings claim.

Main CI observations, all bound to a6ff098f6cdf8b356b76105c726c2561f6051a8d: Verify 42217811205 success; Run site 42217811413 success. These prove current main's health, not candidate landing. GitHub REST calls used: three. No polling, dispatch, rerun or failed-job log read was needed.

## Probes and mechanical receipt

PROBE CONT-014 acceptance-1-types: native definitions and property writes -> typed string, decimal, true and allowed list values persisted and read back.
PROBE CONT-014 acceptance-1-controls: operator controls at 1440 and 390 -> negative decimal, false and two allowed options survived save and reopen.
PROBE CONT-014 acceptance-1-refusals: incompatible number, boolean and list values mixed with other valid edits -> named 400 and unchanged prior values, history, storage, consent and channel states.
PROBE CONT-014 acceptance-4-carried: Settings, CSV import, native API, date segment and saved money preview -> existing full sanity journey passed.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

Actual receipts are LOCAL_RECEIPT.json, journey.log, typecheck.log, first-party.log, MECHANICAL.txt, views.log, lock-write.json, lock-check.json, mechanical.log, identity.log, candidate-messages.log, product-push.log and the two CI observation files. Fourteen actual property screenshots are under ./screens. PLAN.md records the execution plan; no shared fleet plan was rebuilt or edited.

Plan row result: CONT-014 PARTIAL remains PARTIAL. The selected slice was already implemented at the supplied base and required validation only. No acceptance point newly closed, no clause promoted and no counts changed. The selected type subset of acceptance 1 is proved; acceptance 4 is carried evidence, so it alone appears as a fully proven acceptance in the claim grammar.

CLAIM CONT-014 PARTIAL points=4 tests=tests/go-live/custom-property-journey.ts#proveCustomProperties; tests/go-live/custom-property-types.ts#provePropertyTypes
GAP CONT-014: Complete property-count boundary, remaining source and history and time matrix, and general segment, personalization, conditional-content and flow-split matrices remain unproved. Live provider and SMS qualification, existing cross-seed and Base prerequisites, and the CONT-013 disposition and fix-1 hold remain unchanged.

No product blocker was found. The full clause remains PARTIAL for the named unproved outcomes. Evidence transfer and product readiness are separate; the guarded lander must enforce its exact-head checks and publication scan.
