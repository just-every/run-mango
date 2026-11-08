# CONT-042 replay: sd-mango-c-f144-rb1

**READY** — `cloud/sd-mango-c-f144-rb1` at `baa97d9baaf355976de4a475275b607a39969f27` is pushed to just-every/run-mango and its exact-SHA push **Verify 42500609742 completed/success**. No generated-view exception was needed. No PR was created; the brief delegates landing to the existing fleet lane. No landing, publication-scan completion, clause promotion or hosted-provider acceptance is claimed.

Verify: https://github.com/just-every/run-mango/actions/runs/42500609742

## Full plan and disposition

1. Configure global and clone-local fleet identity, refresh the authorized launcher, install decrypted-bundle Git authentication, fleet commit hooks and the guarded product push entrypoint. Completed. No other credential source was used; no other repository was cloned or written.
2. Make a fresh full-history filtered clone, fetch and require cloud/sd-mango-c-f144 to equal the pinned builder, and create the named replay branch. Completed; the builder was checked twice and had not moved.
3. Inspect beforeOutbox uses and the old landing candidate diff; reproduce that exact historical failure through the real bounded shared-kiosk journey. Completed, with the actual ReferenceError captured.
4. Return to the pinned builder branch and merge fresh main, preserving newer judgments, tests and ID-MAP. Completed with a clean merge and no rebase or history rewrite. The builder already contained the snapshot fix; no new semantic or assertion edit was needed.
5. Run the focused shared-kiosk journey, full reports and campaigns packs, typecheck, build and mechanical generation/lock checks. Completed. The full reports pack passed; campaigns had two local failures, investigated separately without source changes. The main journey then passed alone; the inherited pre-send acknowledgment failure remained reproducible.
6. Audit all candidate ancestry, commit with the required identity/hook environment, and push only the named branch. Completed once, without [skip ci] on the merge commit. Exact-SHA Verify completed successfully through one REST watcher using four calls of the ten-call budget.
7. Preserve complete non-secret reports/receipts outside the product checkout; explicitly select and scan the packet; publish only evidence/sd-mango-c-f144-rb1, verify readback, then delete the clone and node_modules. The final transport receipt identifies the exact evidence commit. Cleanup occurs only after successful custody transfer.

PLAN.md retains the original execution plan. TERMINAL_RECEIPT.json, LOCAL_RECEIPTS.json and CI_GATE_RECEIPT.json contain the terminal structured results.

## Product provenance and exact replay

- Clone: `git clone --filter=blob:none https://github.com/just-every/run-mango.git`, with no depth. `git rev-parse --is-shallow-repository` returned false.
- Required and observed builder head: `80bc36a87109a3da22509aa422b30415de462dc6`. `git rev-parse HEAD` printed that exact value after creation of the task branch. The historical builder's green run is context, not this task's CI proof.
- Fresh main: `f936cb5351ca3432e53e7ed5592f2aa720f3eab2`.
- Merge: `git merge --no-ff --no-commit origin/main`, then the fleet-identity merge commit `baa97d9baaf355976de4a475275b607a39969f27`, whose parents are the pinned builder and fresh main.
- Tested and committed tree: `b74ed6ad6eb19c5b4abebd53451367e43d9041a7`. The focused probe's tree, final commit tree and clean product checkout match. Remote product ref was independently read back at the exact final head.
- Product delta from main: four files, 203 insertions and 3 deletions: the 194-line confirmation-allowance helper, its invocation in resubscribe.flow.ts, CONT-042 added to the shared-kiosk test title, and regenerated sources.lock.json. No runtime implementation or unrelated test was changed.
- CONTRACT.md, ACCEPTANCE.md, docs/CLAIMS.md and docs/contract/ID-MAP.json are byte-identical to main. All newer main tests, including signup-capacity and campaign-image coverage, remain. main-preservation.json records the matching blob identities.
- The merge had no source conflict. No generated view was hand-resolved or newly generated into the product delta. No test was deleted, skipped or weakened.

## Actual reproduction and beforeOutbox scope

Inspected `git diff origin/main...2a365f79 -- tests/go-live` and `git grep -n beforeOutbox`. The old landing candidate uses beforeOutbox in receipt construction without defining it. Its exact full head is `2a365f79540f0f2007dbaf5abcf2a14bcf90dc29`.

Checked out that historical candidate detached and set up its checkout using:

`cloud_run timeout 900 npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive` — exit 0.

Then ran:

`cloud_run timeout --signal=TERM --kill-after=30 1100 pnpm exec playwright test --config tests/go-live/playwright.config.js shared-kiosk.journeys.ts --workers=1 --reporter=list`

**REPRO shared-kiosk: head 2a365f79540f0f2007dbaf5abcf2a14bcf90dc29 -> ReferenceError**

Actual result: one failure in 2.2 minutes, exit 1, `ReferenceError: beforeOutbox is not defined` at confirmation-allowance-journey.ts:155, called from resubscribe.flow.ts:154 and shared-kiosk.journeys.ts:8. See repro-shared-kiosk.log and repro-exit.txt. The already-fixed builder was not deliberately broken or falsely reported as failing.

Returned to the task branch before merging main. The pinned builder's confirmation-allowance-journey.ts:90 captures the entire outbox **before** any submission action. Its fourth-request assertion at :148 compares the entire outbox with that snapshot, while receipt assembly at :166 uses the same scoped value. Those bytes are retained exactly. No assertion was removed or weakened.

**PROBE shared-kiosk: fix -> pass**

The complete focused merged journey passed (one test, 4.2 minutes, exit 0), and shared-kiosk passed again in the full reports pack (3.5 minutes). See probe-shared-kiosk.log, probe-exit.txt, probe-playwright-receipt.json and reports.log. The passing journey asserts three admitted requests followed by a fourth refusal in both hosted-first and kiosk-first orders, unchanged destination counters and full outbox on exhaustion, refusal accounting, and successful fresh-reader control admission/confirmation. These are browser/native Worker/D1 assertions, not hosted mail-provider acceptance.

All eight admitted/exhausted hosted-first/kiosk-first response captures at 1440 and 390 are in this packet. The exhausted response pair was visually inspected: generic acknowledgment only, with no address, session or authentication credential. New helper assertions execute at desktop width and record both widths.

## Actual local checks

| Check | Result |
| --- | --- |
| `cloud_run timeout 600 npx -y @runeditrun/rer build` | exit 0 |
| `cloud_run timeout 300 pnpm run typecheck` | exit 0 |
| Focused merged shared-kiosk journey | 1 passed; exit 0 |
| `cloud_run timeout --signal=TERM --kill-after=30 1800 node scripts/verification/ci.mjs reports` | all 5 passed; exit 0 |
| Reports campaign-results member | results and performance: 2 passed |
| Reports go-live member | managed-mail, opt-out-reasons, shared-kiosk: 3 passed |
| `cloud_run timeout --signal=TERM --kill-after=30 1800 node scripts/verification/ci.mjs campaigns` | 2 passed, 2 failed; exit 1 |
| Campaigns contact-links and typed-tests | passed |
| Campaigns main go-live initial run | unchanged 900000 ms timeout under overlapping packs |
| Campaigns pre-send initial run | missing exact save acknowledgment at email-size.flow.ts:78 |
| Standalone pre-send, one worker, original assertions | same acknowledgment failure; 4.9 minutes; exit 1 |
| Standalone main go-live, one worker, original timeout | 1 passed; 8.6 minutes; exit 0 |

The isolated commands use the same 1100-second hard bound and go-live config, selecting presend-checks.journeys.ts or the exact go-live.journeys.ts path with one worker. They use independent external artifact roots. The initial main timeout did not recur in isolation. No test source or timeout was changed for the reruns.

The remaining **local** failure is `expect(page.getByText('Draft saved. Preview and checks are up to date.', {exact:true})).toBeVisible()` in tests/go-live/email-size.flow.ts:78 after Save full draft. This is not labeled as the brief's literal `Saved …` placeholder failure; the observed acknowledgment failure is reported exactly. Both its test and all runtime source are unchanged from fresh main and outside this replay's product delta. It was left untouched. The candidate's exact-SHA Verify nevertheless completed successfully. No claim that every local test passed is made.

Actual terminal logs, error contexts, Playwright receipts and per-file/coordinator timing receipts are included. The runtime's full worker scratch/key/config files and environment dumps are excluded.

Tooling: system Chromium `/usr/bin/chromium` with `--no-sandbox`; supplied toolchain selected pnpm 10.12.4 and compatible VM Node 24.19.0 (the repository's exact 22.20.0 engine warning is preserved). rer managed its pinned setup/dependencies. All long-lived commands ran through cloud_run and hard timeouts. Test-owned browser/server cleanup and subreaping completed; no broad process kill was used.

## Mechanical regeneration

1. `node src/base/contract-docs.mjs write` — exit 0, wrote 0 documents.
2. `node src/base/contract-docs.mjs check` — exit 0.
3. `git checkout origin/main -- ACCEPTANCE.md docs/CLAIMS.md` — exit 0; restored views remain identical to main. A restored-view check also exited 0.
4. Regenerated source lock last: `node scripts/edition-authoring/cli.mjs lock` — exit 0.
5. `node scripts/edition-authoring/cli.mjs check` — exit 0.

**MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock exit=0; lock-check=node scripts/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write && node src/base/contract-docs.mjs check exit=0**

mechanical.log, lock-write.log, lock-check.log and views-restored-check.log retain the actual output. The committed lock matches the tested tree; no subsequent source edit occurred.

## Clause status and before/after counts

| Compared with fresh main | Before | After |
| --- | ---: | ---: |
| Done | 20 | 20 |
| Partial | 198 | 198 |
| Missing | 98 | 98 |
| Total | 316 | 316 |

CONT-042 remains **target / partial**. No row was rejudged or promoted. The older builder had PROP-005 done; the merge retains main's newer partial judgment. That is preservation of main, not a judgment by this task. CONTRACT.md has no delta from main. contract-before.json and contract-after.json record the source-derived counts.

## Identity, push and CI custody

The merge used the required fleet author/committer environment and active cleanup hook, preserving repository hooks. All six commits in `origin/main..HEAD`, including side parents, were audited: every author and committer is Run Edit Run fleet <fleet@runeditrun.com>, with no surviving trailers or OpenAI/Codex co-authors. Full messages and structured audit receipts are included. No published history was rewritten.

`python3 $HOME/rer-consolidation/.tools/cloud-push.py origin cloud/sd-mango-c-f144-rb1` succeeded on attempt 1. Only the named branch was pushed, once, with no [skip ci] on the final merge commit. product-push.log and product-remote-head.txt retain the actual custody proof. No push recovery bundle was needed.

Verify run **42500609742** completed **success** on exact head **baa97d9baaf355976de4a475275b607a39969f27**. No other SHA's result, historical builder run or generated-view exemption was substituted. The single watcher made four gh REST calls from the injected bundle, within the ten-call budget. It scheduled 300-second intervals; wrapper launch timestamps show 300.051, 299.964 and 299.995 seconds because of subprocess startup jitter. CI_GATE_RECEIPT.json and github-calls.json preserve these exact observations rather than claiming a stricter measured interval. No workflow log/archive calls were needed because the run succeeded.

## Evidence return, limitations and cleanup

Complete selected non-secret packet files are transported only through `refs/heads/evidence/sd-mango-c-f144-rb1`. Evidence publication is separate from product READY/acceptance/landing. The task-side entrypoint creates a report-only tree and leaves the product head, branch and index unchanged. PUBLIC_PACKET_SCAN.json records the explicit regular-file selection and credential-pattern/injected-value scan; the evidence manifest records every file's bytes and hashes. The terminal EVIDENCE line identifies the exact publication head; readback is verified before deleting the clone.

No missing ruling, key/account or required CI blocker remains. The unchanged local pre-send failure is a reported limitation, not hidden. The fleet Mac still owns its independent publication scan and landing gates; this cloud did not run that scan or land the candidate. The finished product clone and its node_modules are removed after successful evidence publication/readback, while actual packet/receipt files remain under the task directory.
