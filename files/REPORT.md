# sd-mango-c-f114 result

DESIGN-007 remains PARTIAL to PARTIAL. The two selected acceptance-6 outcomes were already implemented, asserted and recorded on current main when this run began. Fresh validation passed. There is no new product commit, clause change, acceptance change, test registration or plan-row edit. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING, 316 total. This is a validation return with zero new clause yield.

Product repository: https://github.com/just-every/run-mango
Product branch: cloud/sd-mango-c-f114
Product head: 3adffb27a2b153edfe784251bf61acee45ea9ca4
Predecessor: 7b84054fa0973a54dcc8189b44f6a35f8e9a065e, already an ancestor of main. No unfinished predecessor commits required replay. Fresh main fetch and rebase found the branch current. No PR was created because Verify runs on branch pushes. Only the named product branch was pushed; main was unchanged.

The supplied PLAN.md records the full plan and its no-duplicate-work decision. Existing DESIGN-002, DESIGN-003, DESIGN-010, DESIGN-011, disclosure and custody evidence remains unchanged. All CONT-013 holds, provider and account prerequisites and release requirements remain unchanged. No visual, homepage, logo, polish, provider purchase, real-provider connection or Base adoption was performed.

## Selected public-door proof

The one registered test is at `tests/campaign-authoring/design-generation.spec.ts:5`, named “[DESIGN-001][DESIGN-002][DESIGN-003][DESIGN-007][DESIGN-008][DESIGN-009][DESIGN-010] generate and select a design without saving or spending twice, and expose provider refusal”. It invokes walk0, walk1, walk2 and walkConcurrency. It is loaded by the existing authoring member in `scripts/verification/plan.mjs` and therefore by push Verify. The focused invocation passed once, 1 test in 3.9 minutes. No assertion was removed, narrowed, skipped or moved behind a condition. No test was added or replaced.

The existing `tests/campaign-authoring/design-concurrency-journey.ts` proves:

- Lines 56 to 82: a real 429 with Retry-After from the network-edge fixture creates the newer run's native provider-quota wait. There are two distinct native and provider run identities, two creation requests and three settled image purchases before the refusal probe. No persisted wait or clock is manufactured.
- Lines 85 to 96: a second same-draft start through the authenticated native route returns 409 with design_job_active. Complete job rows, queue commands, provider creation requests, purchases and cost rows remain unchanged.
- Lines 111 to 157: the operator explicitly selects design B from the earlier run. A provider-edge observation barrier holds the resulting conversion unanswered; native state reports the earlier run preparing while the newer run retains precisely its own original wait. No layout purchase or cost is recorded prematurely. Both states are reloaded and captured at 1440 and 390.
- Lines 158 to 188: the earlier layout completes with the independently issued provider layout identifier, candidate B's independent digest, one matching idempotency purchase and one cost fact. The later persisted run and wait remain unchanged, and the authenticated layout bytes match the edge's expected document.
- Lines 190 to 210: ready and waiting states survive reload at both widths. The saved draft is identical; campaign state remains draft, with no approvals, recipients or dispatch work. Repeated reads do not create another provider purchase.

Behavioral assertions run at 1440. The four selected screenshots show preparing and ready states once each at 1440 and 390 and were visually inspected. They contain only the native synthetic installation. The local provider double runs at the network edge; no request reached real 12ui, and no live timing or availability qualification is claimed.

PROBE DESIGN-007 acceptance-6-start: native start during provider 429 wait -> 409 design_job_active; no new job, command, creation request or purchase
PROBE DESIGN-007 acceptance-6-choice: earlier design B control during latest wait -> earlier layout ready, one matching purchase and cost; latest wait and draft authority unchanged after reload

Actual detailed outcomes are in design-concurrency-receipt.json, test-receipt.json and generation.log. Source file hashes and predecessor ancestry are in source-receipt.json.

## Commands and results

- Fleet setup and pinned repository setup completed with the required owner identity and commit hooks. The setup process exited with no retained server. The supplied toolchain selected pnpm 10.12.4; local direct Node commands used Node 24.19.0. The rer setup internally selected project Node 22.20.0. No dependency or source pin changed.
- `cloud_run perl -e 'alarm 1200; exec @ARGV' -- pnpm exec playwright test --config playwright.config.js tests/campaign-authoring/design-generation.spec.ts --workers=1`: exit 0, 1 passed in 3.9 minutes. MANGO_NO_FIXTURE_SERVER=1 uses the test's own native installations; Chromium is `/usr/bin/chromium` with --no-sandbox from the existing browser helper.
- `pnpm run typecheck`: exit 0.
- `node src/base/contract-docs.mjs write`: exit 0, wrote 0 documents. `node src/base/contract-docs.mjs check`: exit 0, documents current. ACCEPTANCE.md and docs/CLAIMS.md were restored from origin main. Neither was committed.
- `node scripts/edition-authoring/cli.mjs lock`: exit 0, no tracked change. `node scripts/edition-authoring/cli.mjs check`: exit 0, repeated after the final fetch and rebase.
- `cloud_run npx -y @runeditrun/rer check --profile first-party`: exit 0.
- No migration changed; migration-ledger check is not applicable.
- Both working-tree and index diffs were empty before the guarded push. `git log origin/main..HEAD` identity, trailer and full-message inspections were empty: there were zero unpublished candidate commits. No product commit command was needed. No history was rewritten.
- `python3 $HOME/rer-consolidation/.tools/cloud-push.py origin cloud/sd-mango-c-f114`: succeeded on attempt 1. The actual sanitized guard output is product-push-receipt.txt. Remote main and the named branch both advertise the product head in remote-refs-receipt.txt.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

## CI and publication custody

Already completed successful exact-head push Verify runs: 42212846652 and 42211055162. Run site 42212846650 also completed successfully on 3adffb27a2b153edfe784251bf61acee45ea9ca4. These are observations from the full-SHA REST query, retained in ci-receipt.json.

The named branch push started Verify 42216013757 on precisely the same SHA. It was in progress at its one discovery; no success is claimed for that new run, and no duplicate dispatch or rerun was made. branch-ci-receipt.json contains the actual response. Three GitHub REST calls were used: one abbreviated-SHA discovery returned no runs, one full-SHA discovery returned the completed runs, and one discovery scoped to this new branch returned its new run. There was no repeated polling or log download.

Cloud publication scanning was not run, as the cloud adaptation leaves it to the fleet. No COMPLETE or zero-findings receipt is invented. Product HEAD and main were already equal and public; publishing this branch adds no product history. Evidence publication is separate, report-only transport and does not claim DONE, new acceptance, or landing. No product push or check remains blocked.

## Why DESIGN-007 is not DONE

Acceptance 6's two selected outcomes are now freshly validated, but already proven on arrival. The planner explicitly omitted the remainder; this run does not silently expand that selection or mistake native unproved behavior for an external dependency.

Current native proof gaps remain: ordinary 30-second, download 60-second and purchase 150-second bounds; complete Retry-After and relative notice proof; beyond-deadline quota settlement; network, server and request-timeout retry matrices; the three-pass limit and five- and ten-second intervals; final unavailable result; safe unauthorized, rejected-request, unreadable-answer, forbidden-redirect and expired-layout reasons; cron deadline settlement; scheduled quiet-work resumption and honoring a declared wait in that scheduler. These are current seed behavior and proof obligations, not account blockers. Existing asserted outcomes and the complete Gap are unchanged in CONTRACT.md.

Real-provider timing, availability and qualification require separately authorized live-provider work and remain unproved. No admitted provider credential was needed or used for the selected network-edge proof. No account, provider, device, Base or cross-seed prerequisite is declared newly satisfied. No next clause was started because the explicit continuation says to finish this selected clause before starting another, and the planner's bounded selection is already on main.

## DONE-RIDERS review and pre-ready self-check

There is no DONE flip or judge request. The following observations explain the retained PARTIAL status:

1. FAIL for whole-clause DONE: acceptance 1 through 5 still have the outcomes listed above without complete journey proof. PASS for the selected acceptance-6 outcomes, from walkConcurrency and the actual receipt.
2. PASS for selected money-related refusal and supported preparation: rejected start changes nothing, supported earlier choice causes exactly one matching purchase and cost. No claim about unexecuted whole-clause failure matrices.
3. PASS for existing exact-SHA recorded Verify and current registered invocation; this new branch run is still in progress, not reported green.
4. PASS: local tests ran on the unchanged exact product head, with file hashes retained.
5. INSPECTED: DESIGN-007 already cites BASE-OPS-004 in its clause metadata; no inheritance changed.
6. PASS for unchanged Gap and evidence, and contract generation is current. No new candidate judgment or status promotion is recorded; the old general Judged-from text was preserved.
7. PASS: no acceptance point, rider, clause row or coverage obligation changed. No parent row could be dropped because no product commit was created.
8. No authority implementation changed. The selected native journey verifies unchanged draft, approval, recipient and dispatch state; it is not a full role-authority audit.
9. PASS for honest boundary: synthetic network-edge proof is identified, real-provider proof remains unestablished.
10. Not applicable: no new custody, spending, consent or authority policy was adopted.
11. Main and product head equality and existing exact-SHA Verify and Run site success were observed. A new landing and publication scan were not performed or claimed. This validation-only run adds zero DONE clauses.

Every selected behavior has a real public-door assertion; no tests were weakened. There are no product, UI, erasure, credential or replay changes. Screenshots were inspected at 1440 and 390; no new control or visual style was introduced. No provider secret or environment dump is in the selected packet. Fixture email strings already present on main were not edited; no new fixture or product file was created. The source lock is fresh. Final fleet scanning and landing custody remain with the independent gate.

## Return for the plan

Plan rows changed: none. Record sd-mango-c-f114 as a validation-only duplicate of the already-landed acceptance-6 work at predecessor 7b84054fa0973a54dcc8189b44f6a35f8e9a065e, validated at 3adffb27a2b153edfe784251bf61acee45ea9ca4. Do not requeue these two outcomes as missing and do not count a new DONE. Remaining native and live-provider obligations stay as listed above. The complete actual report and receipt packet is published only through evidence/sd-mango-c-f114; the terminal EVIDENCE line provides the exact transfer head.
