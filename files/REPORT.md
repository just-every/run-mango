# Mango102 exact failed-case diagnosis — NOT REPRODUCED

Completed 2026-11-06T11:15:57.267880+00:00. This is a read-only diagnosis, not product acceptance or a FIX. Both exact revisions passed the one requested test once; no cause for the saved CI 409 is established. No infrastructure verdict, retry authorization, clause promotion or release approval follows from these results.

## Revision and runner identity

| Item | Recorded identity |
| --- | --- |
| Repository | just-every/run-mango |
| Failed final regenerated candidate | f6d74f43f3602f5a14ba42375e795cdb9b5522af |
| Candidate source ref | cloud/sd-mango-c-f102-rebase-f6d74f43f3602f5a14ba42375e795cdb9b5522af |
| Fresh origin/main fetched for pairing | 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e |
| Drift from brief's observed main | None |
| Diagnostic local branch | cloud/sd-mango102-ci-triage-1 at 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e, never pushed |
| Same host for both executions | e7631b8f140c, Linux x86_64, Debian GNU/Linux 13.6 |
| Node / pnpm / Playwright | 22.20.0 / 10.12.4 / 1.64.1 for both |
| Browser | /usr/bin/chromium, Chromium 154.0.8037.57 for both; existing --no-sandbox retained |
| Original supplied CI | Verify 42203290365, attempt 1, campaigns shard; saved failed assertion retained in saved-failure.txt |
| New CI runs / API calls / log reads | 0 / 0 / 0 |
| PR | None |

The disposable clone was fetched from the declared repository with full filtered history. The candidate was tested first in detached HEAD, then the same clone was switched to the diagnostic branch created from the captured fresh main. Both revisions had clean tracked files before and after testing. Relevant runtime, fixture, test, dependency and workflow source hashes are identical across all 31 explicitly compared paths. The complete revision difference is seven paths, 232 insertions and 11 deletions, concerning CONTRACT.md, ACCEPTANCE.md, sources.lock.json and DESIGN-007 test fixtures; none is a named presend/runtime path. See source-identity.json and candidate-main-diff.txt.

## Plan executed and scope

1. Applied fleet identity and launcher setup; read launcher AGENTS.md, inline briefs/RULES.md and repository AGENTS.md/contract/views. Installed the required Git helpers and preserved repository hooks. No product commit was needed or created.
2. Fetched exact candidate and fresh main, recorded the paired source/configuration hashes and captured source trace before running the case.
3. Ran the repository's declared setup and explicit build on the candidate; then ran only tests/go-live/presend-checks.journeys.ts once through the declared verification entrypoint.
4. Switched the same clone to the captured fresh main, completed the same setup/build and ran the identical case command once, using independent external artifact directories.
5. Compared actual results, preserved output/timing/screenshots and identity receipts, removed owned runtimes/scratch/dependencies and prepared a public-safe evidence-only packet.
6. Publish only refs/heads/evidence/sd-mango102-ci-triage-1 using cloud_evidence.py, then remove the owned clone. Emit one changed status each to SD and FV. No product branch publication or READY/PUSHED claim.

The earlier successful builder source 1cbe7e47c9a4d89d2c8ae4de015f764c32c1ff83 was not replayed. No other case, full campaign shard, full go-live suite, full verification, provider qualification or DESIGN007 rebuild was run. No repository product, test or tool source, assertion, fixture response, runtime application setting, DNS configuration, network policy, CONTRACT.md source, Status/Gap, generated view, source lock, hold, budget, cap, credit, tag, release or lifecycle state was changed. No CI observer, dispatch, rerun, retry, PR, deployment or external provider operation was requested. The already-passed COMPLETE history publication scan NEW0 was not repeated.

## Commands and actual outputs

Setup (both revisions, exit 0):

```sh
export PATH="$HOME/.rer/node/node-v22.20.0-linux-x64/bin:$PATH"
. /tmp/rer-cloud-toolchain.sh
cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive
cloud_run npx -y @runeditrun/rer build
```

Initial candidate setup bootstrapped using VM Node 24.19.0 while rer acquired pinned Node 22.20.0. Candidate setup and explicit build were then completed again under Node 22 before its single test. Main setup and build used Node 22. Setup/build exits are recorded in command-receipts.json and their complete actual logs are included. Setup/build invoked no test suite. No dependency install changed tracked files.

The same test command ran on both revisions through run-exact.sh, whose actual bytes are included:

```sh
export CI=true WRANGLER_SEND_METRICS=false PLAYWRIGHT_SKIP_BROWSER_GC=1
export MANGO_CHROMIUM_EXECUTABLE=/usr/bin/chromium
export MANGO_VERIFY_STAGE=go-live
export MANGO_VERIFY_FILES='["presend-checks.journeys.ts"]'
# External MANGO_TEST_WORK_DIR and report paths separate each run's artifacts.
cloud_run node scripts/verification/run.mjs
```

The entrypoint converts the selection into the repository's Playwright command using tests/go-live/playwright.config.js and the anchored filename. One registered test runs with one active worker. The checked-in retries=0 and the registered 900000ms timeout were preserved. Both composed flow sections were exercised as the single named test. Existing screenshots at 1440 and 390 were preserved; no new assertions or image checks were introduced.

| Exact revision | Registered case executions | Test duration | Stage duration | Exit | Actual outcome |
| --- | --- | --- | --- | --- | --- |
| Candidate f6d74f43f3602f5a14ba42375e795cdb9b5522af | 1, no retry | 192542ms | 195181ms | 0 | 1 passed (3.2m) |
| Main 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e | 1, no retry | 191121ms | 193141ms | 0 | 1 passed (3.2m) |

Candidate terminal output:

```text
Running 1 test using 1 worker
✓ tests/go-live/presend-checks.journeys.ts:5:1 › [BUILD-008][BUILD-012] preview a saved newsletter, resolve pre-send blockers and refuse unsafe handoff expansion (3.2m)
1 passed (3.2m)
VERIFY_STAGE {"name":"go-live","status":"PASS","durationMs":195181,"exitCode":0}
VERIFY_TOTAL {"status":"PASS","durationMs":195199,"boundary":"coordinator"}
```

Main terminal output:

```text
Running 1 test using 1 worker
✓ tests/go-live/presend-checks.journeys.ts:5:1 › [BUILD-008][BUILD-012] preview a saved newsletter, resolve pre-send blockers and refuse unsafe handoff expansion (3.2m)
1 passed (3.2m)
VERIFY_STAGE {"name":"go-live","status":"PASS","durationMs":193141,"exitCode":0}
VERIFY_TOTAL {"status":"PASS","durationMs":193169,"boundary":"coordinator"}
```

The excerpts omit timestamps/warnings; complete unabridged test output is in candidate-test.log and main-test.log. The exact paired receipts include timestamps, clean-tree observations and all actual reporter attempts/statuses. Each artifact set includes the same test's screenshots, coordinator log and timing reports.

## Source/configuration finding and causal limit

See SOURCE-FINDINGS.md and numbered source-trace.txt for the complete trace. The supplied link is authored in email-size.flow.ts, the second section of the named test. That section saves shop.example.test as an allowed host and later calls the real approval API expecting 200.

The approval link inspector requests A and AAAA DNS-over-HTTPS answers, then HEAD for the transmitted link. The fixture Worker intercepts cloudflare-dns.com and shop.example.test and forwards both to a local 127.0.0.1 provider edge with X-Edge-Original-Url. The edge defines A=203.0.113.10, returns HTTP 200 JSON for DNS (AAAA has no Answer), and returns HTTP 200 for the shop HEAD. No real public DNS resolution or live shop request is required by this test configuration.

The saved wording “could not be resolved and checked” is emitted by a broad catch spanning DNS fetch/JSON and link HEAD operations, each with a 5000ms timeout. It cannot distinguish resolver failure, fetch/JSON failure, timeout or HEAD exception. A plain empty-address result has a different message. No finer exception or transport trace was supplied, and this brief prohibited source instrumentation and reruns. Nothing in the paired successful runs establishes which stage failed in CI.

Both pass therefore means **NOT REPRODUCED**. It is neither a candidate-only failure for a frozen-row FIX nor a reproduced main failure/established infrastructure cause for NOTE G. Preserve the original failed exact-SHA Verify and all existing holds; return the paired result to SD and FV without assigning a speculative DNS/fixture/infrastructure cause. Default: retain current holds and no retry/FIX/acceptance authorization.

## Before/after counts and judgments

No status changed. On both captured revisions the contract status table contains 316 clauses: 20 done, 198 partial, 98 missing. Before this diagnosis → after: 20/198/98 → 20/198/98. BUILD-008 remains done; BUILD-012 remains partial; DESIGN-007 remains partial, with the candidate's and fresh main's existing evidence/gap prose preserved independently. No registration or assertion changed, so the repository test count is unchanged; no new whole-suite count or gate claim is made.

## Custody, cleanup and remaining limits

All report/identity/runtime/source/configuration/cleanup receipts and explicitly selected actual logs/artifacts are under this packet. No credentials, environment dump, private held-out material, local application state or symlink is selected. Evidence publication is report-only; product branch/head/index are unchanged. No product push, PR, READY claim, admission or landing was attempted. The evidence manifest records the diagnostic branch at captured main, not a newly built product candidate; candidate provenance remains explicit in paired-runtime-receipt.json.

Both test runtimes and provider edges closed through their ordinary finally blocks, browsers closed, and cloud_run's subreaper returned. No owned browser/server process remains. Runtime/scratch directories and clone node_modules were removed before publication. cleanup-receipt.json truthfully records the clone retained only for evidence publication and deletion immediately afterward. The final terminal return records that deletion. Shared pre-existing tools and unrelated processes remain untouched.

Limitations: this is one pair on Debian 13 with system Chromium, not the original GitHub Ubuntu 24.04/browser runner; one pair cannot characterize intermittency. No original CI logs were refetched or observed. Final exact-SHA runtime CI, publication/main/site gates remain unproved by this diagnosis until their original guards pass. No blocker prevented the authorized diagnosis. Evidence transfer success/failure is reported separately by its exact EVIDENCE line.

Done — NOT REPRODUCED: exact candidate PASS once; fresh main PASS once; cause unestablished.
