# sd-mango-c-f119 — DESIGN-013

Product repository: just-every/run-mango. Branch: cloud/sd-mango-c-f119.

The selected work adds runtime proof for acceptance 1's image-description highlighting and acceptance 3's edited summary states. Current production already implements these behaviors. The change extends the existing registered import journey after all original import and approval assertions; it adds no production behavior or test registration. CONTRACT.md and both generated views remain unchanged. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING; DESIGN-013 remains PARTIAL. No plan status row is edited in this cloud; the proposed plan update is that the selected acceptance 1 and 3 proof is complete by the passing focused native journey; exact-SHA Verify remains a landing gate.

The complete execution plan is in PLAN.md. Actual command receipts, browser observations and selected captures accompany this report. The pushed product commit is 8f2dea6d0ab8620f9037094acba21fd4f1f9b180, based on main a6ff098f6cdf8b356b76105c726c2561f6051a8d. It is the only candidate commit. The cloud guard pushed it successfully on its first attempt; the remote named ref was read back at the same full SHA. No PR is needed because Verify accepts branch pushes. Exact candidate CI provenance is recorded below.

The new journey imports an independently authored version-2 LayerDoc and PNG through the actual file controls. The brief contains “A bowl of green pears” and excludes “Red pears beside a cobalt vase”. Only the latter image description is marked. Both descriptions remain ordinary alt attributes in the authored email. The operator changes a paragraph through the HTML editor, sees the summary's edited unsaved state, then uses Save full draft. The native campaign readback must equal the edited HTML, with both alt values and no mark element. The summary then reports the edited saved state while continuing to describe the original import. Before import, after import, after editing and after saving, recorded approvals, recipient rows and domain jobs remain identical. The existing journey provides the positive scheduled campaign control, and still exercises valid imports, refusal controls, hosted thumbnails, text marks, Discard and ordinary approval.

Assertions run at 1440. The same imported, edited unsaved and edited saved summary states are captured at 1440 and 390. No assertion promises summary persistence after reload. No design-provider call or purchase, new approval authority, recipient creation, dispatch or visual-output change is introduced.

## Acceptance coverage

| Acceptance | Result and public-door proof |
| --- | --- |
| 1 | Selected new proof: ./tests/campaign-authoring/design-summary-journey.ts lines 36–72 and 95–112, called by ./tests/campaign-authoring/design-import.spec.ts. Matching and novel image descriptions have independently specified expected marks; authored and saved HTML retain both alt values without marks. Carried thumbnail, own-address and text evidence remains in the existing import spec at lines 111–164. |
| 2 | Held by the explicit POINTS scope. The full icon, divider, shape, destinationless-link, additional-button, footer-link and digit-bearing-footer omission matrix is not claimed. Existing assertions are retained. |
| 3 | Selected new proof: ./tests/campaign-authoring/design-summary-journey.ts lines 83–112 performs a real editor change, checks the unsaved edited state and unchanged saved body, then saves and reconciles the edited saved state with native readback. Existing unsaved, ordinary saved and Discard evidence remains at ./tests/campaign-authoring/design-import.spec.ts lines 90–145. |
| 4 | Held by the explicit POINTS scope. Abandoned uploaded-image custody and the boundary that approval does not verify model-written claims are not newly proved or claimed. CAMP-012 and carried provider boundaries remain unchanged. |

## Frozen rubric for this selected slice

| Row | Observable outcome | Proof |
| --- | --- | --- |
| R1 | Only novel image descriptions are highlighted against the operator's independent brief. | New helper lines 36–63; actual import file controls, hosted crops and rendered summary. |
| R2 | The authored and saved email retains matching and novel alt values and contains no summary marks. | New helper lines 65–72 and 105–109; editor DOM parsing plus native saved-body readback. |
| R3 | Editing distinguishes edited unsaved state and leaves the saved body unchanged. | New helper lines 84–92; textarea edit, rendered state and native GET. |
| R4 | Saving distinguishes edited saved state and preserves the exact operator edit while the summary remains about the import. | New helper lines 95–112; real Save control, PATCH result and native GET. |
| R5 | Existing valid import, unsaved, saved and Discard outcomes remain asserted. | Existing import spec lines 90–145, preserved without removal, narrowing or width conditions. |
| R6 | This flow creates no additional approval, recipient or dispatch authority. | New helper lines 23–28, 71–72, 91–92 and 110–112 compares populated authority state from the existing positive approval control. |

## DONE-RIDERS assessment

| Row | Assessment |
| --- | --- |
| 1 | PARTIAL for the whole clause: acceptance 2's full matrix and acceptance 4's outcomes remain held. Acceptance 1 and 3 use the native journey described above. |
| 2 | Selected slice uses real seeded data, independent brief and expected descriptions, real controls, native readback and a populated authority baseline. No new dangerous path is implemented. |
| 3 | The helper is called unconditionally from the existing push-Verify import registration. Exact candidate event and conclusion are recorded below after publication. |
| 4 | Candidate receipt binds the actual test source hashes; no relevant production byte changes. Captures belong to that source run. |
| 5 | INSPECTED: no receiving clause or inherited duty is changed. Existing CAMP-012 image custody remains acceptance 4's unclaimed obligation. |
| 6 | Generator write and check pass; generated views are restored whole from origin/main. Status, Gap and Evidence cells are unchanged and remain the lander's responsibility. |
| 7 | PASS, INSPECTED: no acceptance text, ruling or coverage rewrite is changed. |
| 8 | Selected flow preserves the populated approval, recipient and job baseline through import, edit and save; no authority code changes. |
| 9 | No provider or legal qualification is claimed. Live design-provider and real mail-client qualification remain outside this slice. |
| 10 | Not applicable: no new policy default or authority choice is made. |
| 11 | PENDING fleet landing: this cloud publishes only its named branch. Main equality, exact landed Verify, Run site and full-history publication scan remain fleet gates. No DONE or landing claim is made. |

## Pre-ready self-check

The selected user-visible outcomes have assertions through the actual import, editor and save doors. The diff adds assertions and preserves every original assertion. No revocation, erasure, replay, retention, delivery, consent or spending path is changed; their existing CONT-013 holds and provider prerequisites remain. No new icon control, text size, configuration placement or screen styling is introduced. The current summary uses existing text controls, 13-pixel-or-larger summary text and full borders; captures show both widths. Source lock and generated-view checks are recorded in local-checks.json. The new fixture has no email-shaped string or provider-shaped key. The changed text contains only required MIME types, actual module imports and real paths among slash-shaped tokens. No publication scan is claimed here: the maintained Mac lander must run it on the exact pushed head.

Initial local runs timed out in the appended helper while selecting Brief. A bounded one-off native probe confirmed that the dialog and Brief textbox were visible and reported no browser error. The helper now selects the textbox by its accessible role and name, and scopes the dialog by its visible heading. The original test timeout is retained. The temporary diagnostic registration is removed before publication. The retained timeout and selector-diagnostic logs record the investigation; no existing assertion is weakened and no product behavior is changed. The final focused result and candidate provenance are recorded below.


## Actual local result and handoff

The focused registered import spec passed: 1 passed, 0 failed, total 53.7 seconds; its test body took 33.7 seconds. The original 180-second limit is unchanged. Typecheck and the first-party check exited 0. The final contract-generator write and check exited 0, generated views were restored from main, and final lock regeneration and check exited 0 after the required no-op rebase onto fresh main. The work tree was clean after publication. The candidate source hashes match the exact files used by the passing focused run; see CANDIDATE-RECEIPT.json.

The runtime-generated DESIGN-SUMMARY-RECEIPT.json reports a draft campaign, the edited saved summary state, exactly the novel image description highlighted, both expected alt attributes, zero authored marks, exact edited-body persistence and unchanged authority. All six state captures are actual screenshots from the passing registered run. The desktop and phone saved-state captures were visually inspected. No product screen or style is changed.

PROBE DESIGN-013 acceptance-1: native Review file inputs with independently specified brief and two image descriptions -> only the novel description is marked; authored and saved HTML retain both alt values and no mark element.
PROBE DESIGN-013 acceptance-3: native Review textarea edit followed by Save full draft -> edited unsaved and edited saved summary states; unchanged prior saved body before Save; exact edited saved body afterward; no additional approval, recipient or domain job.
MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and node scripts/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write and node src/base/contract-docs.mjs check, then restore both views from origin/main exit=0; ledger=none exit=0.

Publication scan: commit=8f2dea6d0ab8620f9037094acba21fd4f1f9b180 complete=UNESTABLISHED historyScanned=UNESTABLISHED findings=UNESTABLISHED. This cloud does not run that fleet-only gate. The clone used full history, without a depth limit. No COMPLETE or zero-finding result is asserted. The fleet must scan the exact named branch and SHA before landing. Main does not yet equal the candidate. Initial main a6ff098f6cdf8b356b76105c726c2561f6051a8d had successful push Verify 42217811205 and Run site 42217811413. Candidate Run site is main-only and remains pending fleet landing.

CLAIM DESIGN-013 PARTIAL points=1,3 tests=tests/campaign-authoring/design-import.spec.ts#[DESIGN-004 DESIGN-012 DESIGN-013 DESIGN-014] a 12ui LayerDoc imports as an unsaved draft body that passes every approval check at 1440px
GAP DESIGN-013: Acceptance 2's full omission matrix and acceptance 4's abandoned-image custody and model-claim boundary remain unproved in this bounded round. Paid live design-provider and real mail-client qualification remain unclaimed; carried CONT-013, provider, device, account, Base and release prerequisites are unchanged.

No new policy DEFAULT is adopted. No real blocker was encountered for the two selected POINTS. The full clause is not claimed DONE and its Status row is unchanged. The proposed plan row is DESIGN-013 PARTIAL to PARTIAL, selected acceptance 1 and 3 proof closed; counts 20 DONE, 198 PARTIAL and 98 MISSING remain unchanged. No other plan row changes.

## Exact candidate CI receipt

Push Verify 42231419426, head 8f2dea6d0ab8620f9037094acba21fd4f1f9b180: in progress at the second permitted read. The watcher makes at most one request per 300 seconds. Candidate CI is not yet claimed green. See candidate-ci-watch.json for actual timestamps and responses. This evidence publication is report transport only.
