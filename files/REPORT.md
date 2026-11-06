# sd-mango-c-f74 results

OPER-001 remains PARTIAL. The selected acceptance 4 proof is complete locally: authenticated configuration remains readable before setup, and valid sender setup never invents provider readiness. No production change was necessary. Acceptance 1's full unassigned Admin surface and acceptance 3's independently preconfigured identity case remain unproved and explicitly named in the Gap, as the planner selected. No acceptance sentence or status rank changed.

Product repository: just-every/run-mango. Branch: cloud/sd-mango-c-f74. Full head: `9e7bf0127c20bca03fed884083c3d716d0336110`. Starting and integrated main: `980b25d4b34d19493662d2662ba8f5123c194aef`. No PR was created; the repository's branch push starts Verify directly. The product push succeeded on its first guarded attempt. Remote-product readback confirms the exact head. Main was never pushed or changed.

Counts remain 20 DONE, 198 PARTIAL and 98 MISSING. There are 316 Status rows before and after, and 490 total pipe-prefixed rows before and after. The local journey retains its two registrations; no registration or existing assertion was removed or weakened. The former single-width screen assertions still run at 1440. Captures at 390 are evidence only. No new test-budget allowance was requested.

## Acceptance mapping and runtime probes

The existing `tests/local-start/local.journey.ts` registration “[OPER-001] fresh install completes sender setup after one-click owner sign-in at 1440” now performs the following through native doors on the committed candidate:

- Lines 17–37: open the local development gate, sign in through the native owner link, and read `/api/settings/sender` plus `/api/settings/providers` before saving any identity. Each API returns HTTP 200. Sender validation is unavailable with ready false; mail configuration is false and its status unavailable. The initial business name and postal address are empty.
- Lines 38–47: preserve every server document redirect and every hydrated client navigation assertion. Operator documents remain gated at `/setup` despite the successful authenticated API reads.
- Lines 69–85: preserve invalid-input errors, descriptions, alert and focus, zero invalid writes, and exactly one valid write through the existing setup control.
- Lines 86–98: reopen setup, reach `/app`, reload, and read back the saved business identity. The same API assertions still report unavailable validation and unconfigured mail. Provider and DNS evidence are unknown, mailbox observation is missing, and canSendCheck is false.
- Lines 59–68 and 99–105: capture setup and the configured app once at 1440 and 390. Assertions remain at 1440. All four images were inspected.

`PROBES.txt` contains one actual observation line for each selected point and explicit omissions for the held acceptance 1 and 3 cases. Existing campaign access, invalid auth token and unpublished bootstrap route assertions remain intact. The existing second registration, “[OPER-001] a production build with local credentials present emits no local variable file or secret,” also passes unchanged apart from its shifted line number.

## Validation

The focused registered command was `cloud_run perl -e 'alarm 1200; exec @ARGV' -- node scripts/verification/run.mjs --stage local-start-slow`, using system Chromium with the repository's no-sandbox launch option. It passed both tests, exit 0, in 197,972 ms. The run started at 2026-11-06T06:01:26.071Z and finished at 2026-11-06T06:04:44.024Z. The verification coordinator's actual `LOCAL-JOURNEY-RECEIPT.json` and terminal `LOCAL-JOURNEY.log` are included. The fresh runtime used a clone of the committed candidate. It was closed and deleted by the journey.

`pnpm run typecheck` passed, exit 0. `cloud_run npx -y @runeditrun/rer check --profile first-party` passed, exit 0. `git diff --check` passed. Typecheck used the cloud toolchain's Node 24.19.0 and pnpm 10.12.4; the prescribed toolchain leaves a newer VM Node in place, and pnpm emitted its engine warning. No pin was changed.

`node src/base/contract-docs.mjs write` and its `check` passed before generated views were restored from origin/main. Only CONTRACT.md, the journey and the source lock are in the product commit. `node scripts/edition-authoring/cli.mjs lock` regenerated the lock last, and its `check` passed after the no-op rebase and on the final clean head. No migration changed; a ledger check is not applicable. `CHECKS.json` records these commands and outcomes. Generated-view staleness on the product candidate is deliberate under the cloud landing contract.

Immediately before publication, `git fetch origin main` and fleet-environment `git rebase origin/main` reported the branch up to date. All candidate authors, committers and trailers, including all side parents, were inspected with the required full-range log. There is one candidate commit with the fleet identity and no trailers. The cleanup hooks were installed before the commit and reinstalled after dependency setup. Added text contains no new email-shaped literal; slash strings added to the test are actual repository or API paths. No credentials, environment dumps or private provider material are included in this packet.

## CI and landing custody

Exact-head push Verify was discovered as run `42172201956`, initially queued, at https://github.com/just-every/run-mango/actions/runs/42172201956. `CI-DISCOVERY.json` is the actual REST response. This run was not dispatched or rerun. Polling uses one watcher and respects 300 seconds between calls for this run. After the required 300-second interval, the exact run completed with conclusion failure. Failed build job `127742449526` stops only at “Check generated contract documents”: `node src/base/contract-docs.mjs check` reports “ACCEPTANCE.md: generated content differs; run contract-docs write.” The final coverage job `127742530348` then fails because the build failed; test shards are skipped. Both completed failed-job archives were read once, using the prescribed `gh run view` command. The actual REST job list and status, plus sanitized failed-step archives, are included. Runner environment blocks were omitted from published log copies.

This is precisely the generated-view-only exception in the task: the candidate retains main's ACCEPTANCE.md and docs/CLAIMS.md, and the lander writes them. It counts as passing for the fleet READY handoff, without claiming the GitHub conclusion is success or that skipped shards passed. No repair, workflow edit, rerun or dispatch was attempted. Seven GitHub-budget calls were used, including an initial mistyped empty discovery query that supplied no evidence; the actual main and candidate queries used full SHAs.

Starting-main push Verify `42171092345` and Run site `42171092326` both completed successfully on `980b25d4b34d19493662d2662ba8f5123c194aef`; they do not establish candidate CI. Candidate Run site and main equality remain the guarded lander's duties. Publication scanning is unavailable in this cloud task by the task's declared mechanics: no COMPLETE result, historyScanned value or zero-finding claim is asserted. The maintained Mac fleet must scan full history, check exact-SHA Verify, regenerate the views and perform landing. No product READY, DONE or landing result follows from evidence publication.

The changed journey remains in the existing slow tier; it is not newly inserted into routine push Verify. This preserves the owner rule that fresh dependency installation runs in the slow tier. Its local pass therefore does not satisfy the full clause's recorded exact-SHA Verify rider by itself. No DONE flip is claimed.

## DONE-RIDERS assessment

1. NOT MET for the full clause: acceptance 1 and 3 outcomes still lack the required complete journeys. Acceptance 2 and the selected native acceptance 4 outcomes are reached by the named journey at lines 17–98.
2. MET for the selected behavior: a genuinely empty sender is read before setup and an independently specified business name and postal address are read after the real setup control. Assertions cover refusal of invalid input and successful admission; no money or erasure behavior changed.
3. NOT ESTABLISHED for the full clause: exact-head push Verify exists, but the changed fresh-install journey is registered in the slow tier. The actual local registered run passed both tests.
4. MET locally: the journey ran on the committed exact candidate; no source, test or contract byte changed afterward. The subsequent rebase was a no-op.
5. MET by inspection: OPER-001's existing published metadata cites BASE-ACCESS-002 and BASE-ROLE-001 at CONTRACT.md line 85; no inheritance changed.
6. MET for this partial update: Evidence names the real journey; the Gap explicitly retains acceptance 1 and 3 and hosted and provider boundaries. Generated docs write and check pass locally. The historical Judged from line is preserved because this is not a new independent judgment or DONE promotion. The lander regenerates views before landing.
7. MET: acceptance text is unchanged, no rewrite or policy carve occurred, and every parent's Status row is retained.
8. NOT APPLICABLE to the change: no permission verb, authority, money, erasure or replay implementation changed. Existing setup-gate refusals remain asserted.
9. MET: local sender identity is explicitly distinguished from live-provider readiness. No provider, hosted, device or legal qualification is claimed.
10. NOT APPLICABLE: no policy default was introduced; supplied Mango rulings and all held prerequisites remain unchanged.
11. PENDING THE LANDER: product branch is pushed; exact candidate CI after generated-view regeneration, full-history publication scan, main equality and candidate Run site must be established by the fleet. This packet is not a landing receipt.

## Plan rows, scope and remaining work

Only the OPER-001 row's Evidence and Gap changed in CONTRACT.md. Its Status stays partial. The campaign plan is not rebuilt or edited in this cloud run; `PLAN.md` records the actual working plan. The plan row update for sd is: acceptance 4's native pre-setup configuration access and post-setup non-readiness are now exercised; acceptance 1's full Admin surface, acceptance 3's independent preconfiguration case, and hosted and provider qualification remain open. Acceptance 2's carried gating remains unchanged.

No new policy, homepage, logo, visual design, Base adoption, release requirement, CONT-013 fix, provider account or cross-seed change was made. The selected proof has no implementation blocker. The entire clause is not DONE, and no DONE judge request is submitted. Publication scan and landing remain with the Mac fleet; they were not bypassed. Complete evidence is published only through the separate evidence ref. The report and receipts remain under the task packet outside the product checkout.

Product custody: eligible for READY under the explicit generated-view-only failure exception, at the exact pushed head. The clause remains PARTIAL and no DONE count changes. The independent lander owns the regenerated commit and its exact-SHA verification. Evidence transport is a separate report-only publication and does not mark the product landed.
