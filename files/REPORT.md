# sd-mango-c-f85 result

OPER-001 remains PARTIAL to PARTIAL. Acceptance 4's selected native setup outcomes are proved. Acceptances 1 and 3 remain open exactly as the planner-selected POINTS requires; acceptance 2 retains its existing proof. No DONE claim or judge request is made. Counts stay 20 DONE, 198 PARTIAL and 98 MISSING, 316 total.

Product repository: just-every/run-mango. Branch: cloud/sd-mango-c-f85. Candidate: 2d7bd007d1118b8337a55c1f0a98505722e84c36. Supplied base: c7cb348d2dc77e34b774456f3a4936a29a6148de. First published save: 1da01a162e3de6bf938df22b010dba66802a073b.

## Work and scope

The supplied f80 base already factored the setup flow into a shared journey and registered a dependency-reusing native journey in push Verify. This round keeps those changes and extends the same journey. Before identity setup it reads both configuration APIs with the native owner session while server and hydrated client navigation remain setup-gated. It retains the invalid-input refusal and the successful save through the actual setup control.

After the saved identity opens the application and survives reload, the extension opens a separate browser context and signs in again through the native Owner control. Returning to setup goes straight to the configured app. It opens and reloads Settings, compares all four saved identity fields with the independently known inputs, checks validation is unavailable and not ready, checks the provider is unconfigured and unavailable, and checks provider and DNS evidence remain unknown and inbox evidence missing. Settings itself must show the saved values, unavailable sender validation and four unavailable provider-readiness items. Screens are captured at 1440 and 390; behavioral assertions run at 1440.

Only test proof, its OPER-001 Evidence description and the generated source lock changed in this round. No production behavior, acceptance sentence, homepage, logo, visual design, provider connection, package pin, workflow or migration changed. No assertion was deleted, narrowed, skipped or put behind a new viewport condition. No permanent test registration was added relative to f80: the focused registered native file contains one test. The inherited f80 registration places the shared proof in the ordinary push native shard as well as the existing slow fresh-install journey.

The published save was merged with main at 5f740dc8cd6624d68df11cd55e56e317e5f6bc96. CONTRACT.md merged first and retains main's newer PROP-006 evidence verbatim. The only source conflict was the verification-plan area shared with that new proposal registration: both the main proposal journey and the sender setup journey are retained. sources.lock.json was regenerated after resolving the source. Generated views were taken whole from main, temporarily generated and checked, then restored whole from main. The candidate's generated views equal main byte for byte. No published commit was rewritten and no default branch was pushed.

## Acceptance map and public-door probes

- Acceptance 1: NOT PROVED. Complete unassigned-operator Admin actions on proposals, campaigns, flows, contacts and settings remain omitted by the selected POINTS. No external dependency is invented for this native remainder.
- Acceptance 2: carried proof retained in tests/local-start/sender-setup.flow.ts, lines 36 to 46 and 67 to 83: server redirects, hydrated client redirects and invalid setup input remain gated until the real save completes.
- Acceptance 3: NOT PROVED. The independently preconfigured valid installation case remains omitted by the selected POINTS. Reopening a previously saved identity is not claimed as this independent case.
- Acceptance 4: tests/local-start/sender-setup.journey.ts, test “[OPER-001] native sender setup preserves configuration access without provider readiness”, invokes tests/local-start/sender-setup.flow.ts. Lines 19 to 35 prove both native configuration reads before setup. Lines 82 to 96 prove successful setup, reopen and reload without readiness. Lines 104 to 137 prove fresh authentication and reloaded Settings, all saved identity fields and unavailable readiness without invented passing evidence. The same shared flow remains invoked by tests/local-start/local.journey.ts.

PROBE OPER-001 acceptance-4 configuration: native authenticated GET /api/settings/sender and GET /api/settings/providers before valid sender setup -> HTTP 200, empty business identity, unavailable sender validation, ready false and unconfigured mail provider; GET /app and its selected child documents -> HTTP 303 to /setup.

PROBE OPER-001 acceptance-4 persistence and readiness: submit the business sender form, reopen and reload the app, then authenticate a fresh context and reload /app/settings -> all four saved identity fields retained, sender validation unavailable and ready false, provider and DNS evidence unknown, inbox evidence missing, canSendCheck false, four unavailable readiness items visible.

PROBE OPER-001 acceptance-2 retained: server requests and hydrated navigation to selected app documents before identity save -> setup gate; invalid save -> visible field errors, focus on first invalid field and zero sender PUT requests; valid save -> one sender PUT and app access.

## Local verification and mechanical results

- Focused native journey before integration: PASS, one test, approximately 2.9 minutes. NATIVE-JOURNEY.txt is the actual output.
- Candidate native journey: PASS, one test in 2.8 minutes on 2d7bd007d1118b8337a55c1f0a98505722e84c36; CANDIDATE-NATIVE-JOURNEY.txt is the actual output.
- Typecheck: PASS before integration and after merging main; actual outputs TYPECHECK.txt and TYPECHECK-MERGED.txt.
- First-party command check: PASS before integration and again on the committed candidate; actual outputs FIRST-PARTY.txt and CANDIDATE-FIRST-PARTY.txt, with commands and exits recorded in RECEIPT.json.
- Contract generator write and check: PASS; actual outputs VIEWS-WRITE.txt and VIEWS-CHECK.txt. Both generated views were restored from main before commit.
- Edition lock generation and check: PASS, generated last after resolving main; actual outputs LOCK.txt and LOCK-CHECK.txt. No hash was hand-edited.
- Migration ledger: not applicable, no migration changed.
- Status preservation: every candidate commit retains every parent Status ID, including side parents. STATUS-ROWS.txt records the checks. Both parents of the final merge have 316 Status rows and the merge has 316; the full CONTRACT.md table-line count stays 490.
- Commit identities and trailers: checked across every commit in origin/main..HEAD before both product pushes. All authors and committers use the fleet identity; no co-author trailers. COMMIT-IDENTITIES.txt and COMMIT-MESSAGES.txt record the candidate history. Both pushes succeeded on attempt 1 through the fleet cloud push guard.
- Fixtures and changed text: no new literal email address or provider-shaped key was introduced in the added test lines. No new prose token resembling an unrelated GitHub repository was introduced.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and node scripts/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write and node src/base/contract-docs.mjs check exit=0; ledger=none exit=0.

The final merge changed no byte of the relevant production files or local-start test files from the locally passing save. PROVENANCE.json binds the final candidate and SHA-256 hashes. The candidate journey is also rerun on the committed candidate. Browser captures selected into this packet correspond to that rerun.

## DONE-RIDERS assessment

No clause is flipped to DONE. These rows describe the honest proof boundary for the selected point, not a DONE claim.

1. FAIL for the whole clause: acceptances 1 and 3 remain open. Selected acceptance 4 is covered by the registered native journey and its shared flow at the lines above.
2. PASS for the selected point: the actual empty installation, refused invalid input, native successful save and subsequent independent session readback are exercised. Provider readiness assertions would fail if readiness or passing evidence were invented. No mutation run is claimed.
3. PENDING fleet CI judgment: the native journey is in the push verification plan, line 24. The exact candidate's actual workflow state is recorded in CI receipts; no green run from another SHA is substituted.
4. PASS locally: candidate-native output and the candidate source hashes bind the fresh proof. The pre-integration proof uses identical relevant source and journey bytes.
5. UNCHANGED: OPER-001 cites BASE-ACCESS-002 and BASE-ROLE-001 in its existing meta register. No additional inherited duty is claimed complete.
6. PASS mechanical generation; PARTIAL gap remains explicit for acceptances 1 and 3 and provider qualification. No Judged-from or DONE provenance is fabricated. Candidate views deliberately retain main's bytes for the fleet lander to regenerate.
7. PASS: no acceptance sentence, clause ID or recorded ruling changed; all 316 parent Status IDs retained.
8. UNCHANGED, outside the selected behavior: no authority-changing production path was modified. The selected proof uses genuine native owner authentication and retains setup refusal. It does not claim the complete Admin surface.
9. PASS boundary: no hosted or live-provider readiness is claimed. All owner account, device, carrier, provider and cross-seed or Base prerequisites stay unchanged.
10. NOT APPLICABLE: no new custody, consent, spending or authority policy was adopted.
11. PENDING fleet landing: this cloud pushes only the named branch. Publication scan, generated landing views, exact main equality and Run site remain the maintained fleet lander's responsibility. No COMPLETE scan receipt or green Run site is claimed here.

## Pre-READY self-check and remaining work

The changed setup behavior has direct route and browser assertions, with the original refusal assertions retained. No production authorization, erasure or replay code changed. No product screen or icon-only control changed. The existing Settings presentation is used as proof only. Source lock is fresh. Exact-SHA Verify is reported from REST honestly below and in the CI receipt. Full-history publication scanning and Run site cannot be claimed by this cloud run and remain fleet gates. The base Verify 42177643229 failed only “Check generated contract documents” in job 127759741127, with the final aggregate job consequently failing; the same source check was reproduced locally as a stale generated ACCEPTANCE.md view. This was not treated as a product repair.

The sd plan's OPER-001 row should record acceptance 4's native configuration access, reloaded Settings and unavailable readiness proof as closed while retaining PARTIAL and the acceptance-1 and acceptance-3 gaps. No Mac plan file was read or edited. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold, the prohibition on a third FIX or follow-up-only builder, and all existing provider, device, account, cross-seed or Base and rer adoption and release requirements remain unchanged. There is no new account or infrastructure blocker for the selected point.

See PLAN.md for the actual plan, RECEIPT.json for commands and exits, PROVENANCE.json for source identity, and the complete actual check and push outputs selected in this packet. Product custody and evidence publication are separate; publishing this packet signals neither acceptance nor landing.

## Candidate CI observation

Exact-SHA push Verify 42182324739 completed with conclusion failure, bound to 2d7bd007d1118b8337a55c1f0a98505722e84c36. Its only initiating failure is “Check generated contract documents” in Build and public command checks, job 127774612264. The plan passed; test shards were skipped, and aggregate verify job 127774718492 failed consequently. CI-DISCOVERY.json and CI-JOBS.json contain the actual REST responses, separated by more than 300 seconds. This qualifies for the explicit generated-view exception for READY. It is not described as a green test run: the fleet lander must regenerate views and rerun Verify before landing. No workflow rerun or dispatch was requested. PR: none; the ordinary branch push starts Verify. No product test failure was observed and no Verify repair round was performed.
