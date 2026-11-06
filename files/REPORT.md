# sd-mango-c-f102 results

Repository: just-every/run-mango
Branch: cloud/sd-mango-c-f102
Candidate: 1cbe7e47c9a4d89d2c8ae4de015f764c32c1ff83
Starting main: 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e
Predecessor replayed: 3111aa72589d1fe1f52244659c87351a8c363afe and its preceding native concurrency proof, reapplied onto current main without rewriting published history.

DESIGN-007 remains PARTIAL. This round closes the selected acceptance 6 outcomes: a same-draft start is refused during an actual native provider-declared wait, while an explicitly selected earlier offered candidate can prepare its own layout. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING; all 316 clause status rows and all 490 table rows are retained.

## Plan and implementation

The full plan is in PLAN.md. The product branch contains the predecessor's native journey, the existing registered generation spec's call into it, bounded transport observation in the authoring fixture and a provider-edge observation barrier. It changes no production behavior. The barrier holds the earlier conversion answer while the journey reloads and independently observes the earlier run preparing and the newer run retaining the exact same declared wait. Releasing the answer must produce the earlier run's ready layout, with one purchase and matching cost.

Only DESIGN-007's Evidence and Gap status row was updated. Its acceptance sentences and status are unchanged. Other design entries, authority, custody and disclosure evidence, CONT-013 holds, Base pins, homepage and visual output remain unchanged. No policy choice or scope reduction was introduced.

## Frozen rubric for the selected point

- R1: During a real network-edge 429 naming Retry-After, call the native campaign design-start route again. It returns 409 design_job_active. Persisted runs, actual design command enqueues, creation requests, purchases and costs stay identical. Journey: tests/campaign-authoring/design-concurrency-journey.ts lines 55-90.
- R2: Use the earlier design B control while the latest run waits. Its native choose response names the earlier run and selected slot. While its conversion answer is held at the network edge, reload and observe the earlier run preparing, the latest run's unchanged wait and disabled new generation, and unchanged saved draft. Journey lines 92-129.
- R3: After releasing the conversion answer, reconcile the one layout request with the independently supplied B image hash, issued provider identifiers, persisted job rows, one layout cost and retrieved native layout document. The newer run remains unchanged. Journey lines 130-149.
- R4: Reload the existing states at 1440 and 390 for browser proof. Native state remains identical and the saved draft, approval records, recipients and dispatch commands are unchanged. Journey lines 151-168; screenshots design-concurrency-1440.png and design-concurrency-390.png.

All run assertions execute through the existing registered design-generation.spec.ts test; no test registration was added or removed. Existing generation, failure and import phases and assertions were retained. The only provider is the local network-edge fake; no paid provider or hosted secret is used.

## Acceptance coverage and remaining work

- Acceptance 1: existing request bounds remain implemented but their complete native timing matrix is unproved: ordinary 30 seconds, download 60 seconds and purchase 150 seconds.
- Acceptance 2: existing same-key retry and notice-until-answer proof remains. Complete Retry-After timing, relative-time notice and beyond-deadline quota proof remain open. This selected journey shows the exact declared retry instant persists while another run works, without claiming the full timing matrix.
- Acceptance 3: untimed refusal and wallet quota proof remains. Complete network, server and request-timeout recovery, three-pass exhaustion, five- and ten-second spacing and final unavailable proof remain open.
- Acceptance 4: failed design proof remains. Refused-key, rejected-request, unreadable-answer, redirect and expired-layout reason matrices remain open.
- Acceptance 5: read-triggered deadline settlement proof remains. Minute scheduling, cron deadline settlement, two-minute quiet recovery and scheduler respect for declared waits remain open.
- Acceptance 6: both selected native outcomes are exercised by R1-R4.

Plan row changed in this report: DESIGN-007 acceptance 6 proof completed, PARTIAL retained. No subsequent clause was selected because the brief explicitly requires continuing this clause and omits the other design work. The remaining native proof is unfinished scope, not an external blocker. Real-provider timing, availability and qualification require separately authorized provider proof and remain unclaimed. Paid live design work and hosted-secret qualification are outside this task's authority.

## DONE-RIDERS assessment

No DONE request is made. These rows explain why the full clause is not promoted:

1. FAIL for full clause: acceptance 6 has the named public-door journey; the acceptance 1-5 gaps above remain.
2. PASS for selected point: seeded earlier and newer runs, actual unsafe start refusal with unchanged money and authority, and affirmative earlier layout purchase with independent image and cost evidence. Lines 55-149.
3. PENDING exact-SHA Verify: the journey is invoked by the existing push Verify authoring pack. Final run details are recorded in CI.json. A generated-view-only failure prevents downstream execution until the lander regenerates views.
4. PASS local provenance: the final local run is bound to the candidate in RECEIPT.json; screenshots and runtime receipt are from that run.
5. PASS unchanged: DESIGN-007 cites BASE-OPS-004 in its contract meta register at CONTRACT.md line 148.
6. PASS mechanical generation before restoring views: write then check succeed; both generated view files are restored from main and omitted from product commits. Gap still names the missing work. No new judgment or stale DONE provenance is claimed.
7. PASS: no acceptance sentence or ruling changed; every parent status row retained.
8. PASS selected scope: no authority is created by either design run; refusal and successful layout paths both exercise the native doors. Full role qualification belongs to existing design authority gaps and is not claimed here.
9. PASS boundary honesty: all service traffic is a local provider-edge fake; no real-provider, hosted, legal or retention guarantee is claimed.
10. PASS: no new custody, consent, spending or authority default is adopted.
11. PENDING guarded landing: main equality, lander publication scan and Run site on the resulting main commit are not established by this branch-only task.

## Pre-ready self-check

Selected user-visible behavior is asserted through native routes and the existing operator controls, including refusal with no purchase and affirmative preparation with one purchase. No existing assertion was removed, narrowed, skipped or moved behind a width or branch condition. No production authority, erasure or replay path changed; no new data exposure or marketing handoff is introduced. Existing screens and controls are used unchanged; this task introduces no UI control, style or configuration. Screenshot inspection is recorded in RECEIPT.json. Generated views are proven locally, then restored; the source lock is regenerated last and checked. Migration ledger: not applicable, no migration changed. Publication scanning is reserved for the maintained Mac lander; no cloud COMPLETE or zero-findings claim is made.

## Earlier CI

Main 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e has successful push Verify 42195975560 and Run site 42195975538.
Predecessor Verify 42195812650 failed only Check generated contract documents in job 127818744695, with: ACCEPTANCE.md: generated content differs; run contract-docs write. The final verifier then failed because the build failed. The failed job archive was read once. This is the brief's permitted generated-view failure, so no Verify repair or rerun was attempted.

Final candidate checks, exact-SHA CI, push custody and selected packet file hashes are recorded in RECEIPT.json and CI.json. No PR is required: Verify accepts a branch push.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

## Final local result

The exact candidate focused registered spec passed: 1 test in 4.0 minutes, including all pre-existing phases plus the selected concurrency journey. Typecheck and the first-party command contract passed. Both browser proof images were inspected: the latest run still states its provider wait and the earlier run B is ready, with the unchanged saved draft. Product push succeeded on its first guarded attempt; the advertised branch SHA equals the candidate.

PROBE DESIGN-007 acceptance-6-start: native start during provider 429 wait -> 409 design_job_active; no new job, command, creation request or purchase.
PROBE DESIGN-007 acceptance-6-choice: earlier design B control during latest wait -> earlier layout preparing across reload, then ready; one matching purchase and cost; latest wait and draft authority unchanged after reload at 1440 and 390.

## Final CI and custody

Exact-SHA push Verify 42201652665 completed with failure. Job 127838204999 failed only the generated contract check: ACCEPTANCE.md: generated content differs; run contract-docs write. Its dependent verifier job 127838304065 failed, and downstream shards were skipped. This is the task's permitted generated-view-only exception. No other failure was observed and no rerun was requested. The candidate is handed over READY under that exception; this does not claim the skipped CI tests ran. The maintained lander must regenerate views, run exact-SHA Verify, perform the complete publication scan and verify Run site on the landing commit.

Product branch is published at 1cbe7e47c9a4d89d2c8ae4de015f764c32c1ff83. No PR created or required. Seven of ten allowed GitHub calls were used. No real product blocker was found; DESIGN-007 remains PARTIAL because the named native matrices and provider proof remain unfinished.
