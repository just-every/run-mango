# sd-mango-c-f80 report

Repository: just-every/run-mango. Branch: cloud/sd-mango-c-f80. Candidate: c7cb348d2dc77e34b774456f3a4936a29a6148de.

OPER-001 remains PARTIAL. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING, 316 total. Acceptance text and clause status were not changed.

## Selected outcome and change

Acceptance 4 requires authenticated configuration access during sender setup and no provider-readiness claim from completing setup. The requested base 9e7bf0127c20bca03fed884083c3d716d0336110 already asserted both outcomes in tests/local-start/local.journey.ts. That file is intentionally excluded from push Verify because it installs fresh dependencies.

The candidate extracts that complete assertion body, byte for byte, into tests/local-start/sender-setup.flow.ts. The slow fresh-install registration still calls it. A new tests/local-start/sender-setup.journey.ts registration uses the existing native persistent-D1 runtime and calls the same flow in the existing native push Verify pack. Its dependencies come from the installed candidate, so push Verify gains this proof without a fresh dependency installation. One direct registration is added; none is removed or weakened. No production behavior, UI, homepage, logo, Base pin, provider configuration or workflow is changed.

The OPER-001 Status Evidence cell names the push journey, its shared flow and the retained slow journey. Its Gap retains the complete unassigned-operator Admin surface in acceptance 1 and the independently preconfigured valid identity in acceptance 3. These are unproved native remainders, not newly declared external blockers. Hosted and live-provider readiness remain unqualified. All prior provider, device, account, Base and other-seed prerequisites and CONT-013 holds remain unchanged.

## Public-door proof map

- Pre-setup configuration: tests/local-start/sender-setup.flow.ts lines 15–35 enter through the native local gate and owner sign-in, then GET /api/settings/sender and /api/settings/providers. Both return 200. The sender is incomplete, validation is unavailable and not ready, provider readiness items are unavailable, and mail is unconfigured and unavailable.
- Preserved setup gates: lines 36–45 request operator documents with server navigation and hydrated TanStack navigation. Both return to setup. Lines 67–81 submit invalid input, retain the setup route, expose field errors and make zero sender writes.
- Post-setup persistence without readiness: lines 82–96 save the valid sender through the existing control, reopen setup, enter the app and reload. The persisted business identity remains available. Validation stays unavailable and not ready; sending a check stays disabled; provider and DNS evidence remain unknown and observation evidence missing.
- Browser evidence: lines 59–65 and 97–102 capture setup and configured app at 1440 and 390. Behavioral assertions use 1440; phone captures are evidence only.

PROBE OPER-001 acceptance-4-before-setup: native owner sign-in; GET /api/settings/sender and /api/settings/providers -> HTTP 200 with unready configuration while server and client operator navigation stay gated at setup.
PROBE OPER-001 acceptance-4-after-setup: existing Save sender details control; reopen setup and reload app; GET sender and provider configuration -> saved identity persists, validation unavailable, ready=false, check sending disabled, provider and DNS unknown, observation missing, mail unconfigured.
PROBE OPER-001 acceptance-2: invalid submit and server plus hydrated client navigation -> zero sender writes and setup retained until valid identity saves.
PROBE OPER-001 acceptance-1 and acceptance-3: none, the planner-carried complete Admin surface and independently preconfigured-identity cases remain explicitly unproved.

## Validation and provenance

The final exact-head focused native journey (1 passed, 1.3 minutes), retained fresh-install journey (1 passed, 1.9 minutes), typecheck, first-party command-contract check, contract generator write and check, and source-lock generation and check have passed locally. Actual logs and receipts are selected explicitly in this packet. The final committed candidate rerun and CI state are recorded in the companion receipt.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then node scripts/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write then node src/base/contract-docs.mjs check exit=0; ledger=none exit=0.

The generated views were restored whole from origin/main after successful generation and checking. No generated-view bytes are changed relative to merged main. The first save's ACCEPTANCE.md delta was the required whole-file restoration to main's version from the requested base; it was not hand-edited or regenerated output. The candidate diff against main includes only CONTRACT.md, the Verify plan, the source lock and the three setup test files. Main's newer resubscription test and clause judgment were retained by the merge. All 379 parent Status IDs and all 490 table rows were retained from both merge parents. The lock was regenerated last after the merge.

The initial save was 76f50dfc2b63436658d8af3bcaa01990b5e8c0a2 with skip-CI. The final merge retains that published history and main 3e91bce0f414b2a4f1eedb7e381ee75386e17906. No rebase or force push occurred. All candidate authors and committers and complete messages are inspected before each push. All product pushes use the fleet guard. No PR is needed because Verify supports branch push.

## DONE riders and self-check

No DONE claim or judge request is made. The clause stays PARTIAL.

1. Not met for the whole clause: acceptance 1 and acceptance 3 remain unproved. Acceptance 4 is exercised through the selected native doors.
2. Selected outcomes use real native persistent D1 and owner authentication, invalid-input refusal and real setup controls; no production fake or provider-passing evidence is injected.
3. The native journey is now registered in the push pack. Exact-SHA Verify status is recorded separately; generated-view freshness may defer actual shard execution until the lander regenerates the views.
4. The focused browser run is repeated on the final committed head. The shared assertion body is verified unchanged from the requested base.
5. The existing OPER-001 metadata cites BASE-ACCESS-002 and BASE-ROLE-001; no inherited duty is changed.
6. Gap names every held native remainder and honest qualification boundary. Generator write and check pass locally. No new judgment provenance or DONE claim is invented.
7. Acceptance text is unchanged. No rewrite or policy ruling is introduced.
8. No authority-changing production code is touched. Native authentication and refusal assertions are retained. Erasure and capture replay are outside this setup-proof change.
9. No live-provider, hosted, legal or device qualification is claimed.
10. No new custody, consent, spending or authority default is adopted.
11. Pending the Mac lander: exact main equality, final exact-SHA Verify, Run site and complete publication scan. Cloud does not scan or land main.

Existing assertions remain byte for byte in the shared flow. No assertion is skipped, narrowed, conditionally gated or removed. Browser captures show the existing screens; no design change requires an icon or text audit. Local mechanical checks are green. Publication scan and main-only Run site remain with the guarded Mac lander; their results are not established by this cloud packet.

## Plan return

Update only the OPER-001 plan row: acceptance 4 now has a native push-Verify journey, sharing and retaining the slow fresh-install proof. Keep status PARTIAL and counts unchanged. Keep acceptance 1 and acceptance 3 native remainders and hosted or provider qualification visible. No new target is selected and no plan is rebuilt. Full task plan is PLAN.md.

## Exact-head CI return

Push Verify 42177643229 completed with conclusion failure on c7cb348d2dc77e34b774456f3a4936a29a6148de. Its plan passed. Build job 127759741127 failed only at `node src/base/contract-docs.mjs check`, with the exact error “ACCEPTANCE.md: generated content differs; run contract-docs write.” Summary job 127759807598 then failed because build failed and shards were skipped. Both completed failed jobs were read once using the required workflow-archive commands, which succeeded. Public failure excerpts omit runner environment sections. No assertion failed in CI and no CI browser pass is claimed: the browser shards never ran. The task's explicit generated-view exception permits READY; the Mac lander must regenerate the views and run Verify on its resulting commit before landing.

Five GitHub invocations were used: initial exact-head run discovery, a second discovery 301 seconds later, completed jobs metadata, and one failed-log archive invocation for each failed job. No dispatch, rerun, PR or main push occurred. The product ref was independently checked and equals the reported candidate. No real product blocker was found for this acceptance-4 proof change.

The exact native and retained fresh-install browser runs passed. Typecheck, first-party command checks and the source lock passed. Contract generation and its immediate check passed before restoring main's views. The committed stale-view check was also run and produced the same expected freshness error. All actual receipts are in this packet. The four final candidate captures have been visually inspected at both widths.
