# sd-mango-c-f105 report

Repository: just-every/run-mango
Branch: cloud/sd-mango-c-f105
Candidate: 7b84054fa0973a54dcc8189b44f6a35f8e9a065e
Main observed: 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e

DESIGN-007 remains PARTIAL to PARTIAL. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING. The plan row changed is DESIGN-007 acceptance 6; no other clause, acceptance text, policy, homepage, logo or visual output changes.

## Work and proof

Reapplied the unfinished predecessor 1cbe7e47c9a4d89d2c8ae4de015f764c32c1ff83 on current main, retaining other writers and the newer clause judgments. The replay was squashed into new task-owned commit 9330e1b, pushed as a skip-CI save. Commit 7b84054 adds in-flight payment assertions and browser captures. No published history was rewritten. No production change was necessary: the native start fence and earlier-run choice already support the required behavior.

The existing registered tests/campaign-authoring/design-generation.spec.ts test now invokes walkConcurrency from tests/campaign-authoring/design-concurrency-journey.ts. Its existing walk0, walk1 and walk2 phases and assertions remain intact. Registration count remains one; no tests were removed, narrowed, skipped or hidden behind an environment flag. Existing push Verify selects the authoring shard; no workflow was edited.

Acceptance 6 start proof, journey lines 53 through 90: create two independent native runs, receive an actual provider-edge HTTP 429 for the newer run, attempt another same-draft native start, then compare persisted jobs, actual enqueued commands, provider creation requests, purchases and cost facts. It returns 409 design_job_active without changing any of them.

Acceptance 6 choice proof, journey lines 92 through 182: explicitly select the earlier run's design B through its own operator control while the latest run waits. Hold the real network-edge conversion unanswered, reload and compare both native run identities and the unchanged latest wait. Before the response, no layout purchase or cost exists. Release the response and reconcile the exact selected image SHA-256, earlier run and layout identifiers, one layout purchase key and one cost fact. Read the retained layout through the authenticated native door. Draft content and state, approval records, recipients and dispatch commands remain unchanged. Preparing and ready screens are captured at 1440 and 390; behavioral assertions run at 1440.

PROBE DESIGN-007 acceptance-6-start: native start during provider 429 wait -> 409 design_job_active; no new job, command, creation request or purchase.
PROBE DESIGN-007 acceptance-6-choice: earlier design B control during latest wait -> earlier layout ready, one matching purchase and cost; latest wait and draft authority unchanged after reload.

## Remaining scope

The selected POINTS are acceptance 6 only. The contract Gap retains ordinary request, download and purchase bounds; full retry-time, deadline and relative-notice matrices; network, server and request-timeout retries, pass bound, spacing and final unavailable reason; full safe-reason matrix; scheduled deadline settlement, quiet-work recovery and declared-wait scheduling proof. Paid live provider timing, availability, hosted-secret and provider qualification are not run. No live design service is contacted. The earlier DESIGN-002, DESIGN-003, DESIGN-010 and DESIGN-011 gaps, provider custody and disclosures, CONT-013 holds and existing adoption and release requirements remain unchanged.

No DONE claim or judge request is made. DONE-RIDERS.md records all eleven rows; row 1 remains unmet for the whole clause. This is completed proof for the bounded planner slice, not completion of the larger clause.

## Validation and custody

The first focused registered generation run passed: one registration, 3.5 minutes test time, 3.9 minutes total. The final run after the added in-flight assertions passed on the exact candidate: one registration, 3.8 minutes test time and 4.2 minutes total, recorded in validation.json and generation.log. Typecheck and the first-party command check passed. An initial local wrapper failed before loading tests because a temporary config resolved its fixture command beneath /tmp; setting the wrapper's server working directory to the checkout corrected it. No product assertion failed and no Verify repair was attempted.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

Generated views were restored with git checkout origin/main -- ACCEPTANCE.md docs/CLAIMS.md and never included as builder changes. The source lock was regenerated last and checked. A final fetch and merge found main unchanged. All candidate commits retained all parent Status IDs; table-line count remained 490. Every candidate author and committer uses the fleet identity, with no co-author trailers. Changed text has no new email-shaped literal; reviewed slash tokens are real repository paths, API paths or package imports.

Current main Verify 42195975560 and Run site 42195975538 are completed success on 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e. Candidate Verify custody is recorded in CI.json. No PR is needed: Verify has a branch push entry point. Publication scanning, generated-view landing, main advancement and resulting Run site remain fleet responsibilities; none is claimed by this cloud.

The complete plan is PLAN.md. The actual native probe receipt is design-concurrency-receipt.json, with its candidate-bound validation in validation.json and the four captured concurrency screens. Evidence publication uses only refs/heads/evidence/sd-mango-c-f105 and changes no product branch, head or index.

Candidate pushed successfully on the first guard attempt. Exact-SHA push Verify 42208158123 completed failure, solely because build job 127859962352 ran `node src/base/contract-docs.mjs check` against the intentionally stale generated view. Its actual assertion was: `ACCEPTANCE.md: generated content differs; run contract-docs write.` The command returned exit 1 locally on the same candidate. Aggregate job 127860051459 failed because build failed and shards were skipped; its archive confirms no independent product assertion. Both failed job archives were read exactly once. No workflow was rerun, dispatched or repaired. Seven budgeted GitHub reads were used in total, including one unsuccessful short-SHA discovery before the correct full-SHA main discovery. Candidate status reads were at least 300 seconds apart.

This is the explicit generated-view-only READY exception in the cloud adaptation. The actual Verify conclusion is failure, not green; local focused runtime proof, typecheck, first-party and mechanical checks passed. No product blocker was found for the selected POINTS. Main, publication scan and resulting Run site gates remain with the fleet. No PR was created. The product branch and main refs were independently read back and matched the reported candidate and unchanged main. Product status and evidence publication remain separate.

READY is claimed only under the generated-view-only exception for 7b84054fa0973a54dcc8189b44f6a35f8e9a065e. DESIGN-007 remains PARTIAL because the contract Gap retains the unproved remainder. The report packet was successfully published and its manifest and file hashes fetched back before the final CI update; the final packet is republished with CI-failure.json and remote-receipt.json.
