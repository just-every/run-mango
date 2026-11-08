# sd-mango-hydration-date-3

The product candidate is `cb141908f50e4b314aa255e51746f8611d5e7d26` on `cloud/sd-mango-hydration-date-3` in `just-every/run-mango`. It publishes hydration and browser time-zone knowledge from the document above the streamed app route, using a React transition so streamed boundaries can finish hydrating before applying that state. The final exact-SHA workflow and full local suite are pending at this report's current revision; terminal results are appended below before publication.

## Plan and scope

PLAN.md contains the complete plan. The actual product changes are confined to the expanded lease: `src/routes/__root.tsx`, `src/core/app/client/lib/time-zone.ts`, and the generated source lock. The date formatter, streamed layout and every existing test assertion remain unchanged. No test was deleted, skipped or weakened. No clause judgment or acceptance text changed. No PR is required by the repository instructions, and none was created. No main push, deployment, landing or hosted acceptance is claimed.

A fresh full-history `git clone --filter=blob:none` started from origin/main `eceb55d9eca66cf4a2702f69e23109d2266b1560`; `--is-shallow-repository` returned false. The fleet identity, decrypted-bundle Git helper and commit cleanup hooks were installed as required, including hook reinstallation after setup. Setup and baseline build passed. A later diagnostic worktree shares that same clone and origin; it was used to isolate the scheduling correction while the earlier candidate's run was preserved. Its dependency link is local and is not included in evidence. The final product checkout is `/workspace/mango-diagnostic`; the initial clone is `/workspace/run-mango`. Both are removed after successful product/evidence custody is recorded.

## Reproduction and diagnosis

The unchanged presend journey was run first with a hard timeout. It **passed**: one journey in 3.2 minutes, including the later save notice. `repro.log` is the actual output. A separate native installation proof also passed before changes, then passed 20 repeated reloads without input events. This environment did not independently reproduce the historical date failure or the previous disconnected run's save-notice timeout; no failing baseline output is invented. The historical zero-effect diagnosis comes from the assignment.

The old `useHydrated` uses `useSyncExternalStore` with a subscription that never publishes. Each consumer must run its own post-hydration snapshot check to move from the false server snapshot to true. Those date consumers sit below the streamed `/app` resource boundary in `OperatorLayout`. In the diagnosed failure, the root is hydrated while the subtree's effects have not run. The unchanged date formatter therefore keeps returning the ellipsis until interaction causes work in that boundary.

`TimeZoneProvider` now owns one hydration/zone snapshot above `Outlet` in the document shell. It subscribes to preference and cross-tab storage changes, then publishes the chosen zone with hydrated=true. Context carries that update to streamed consumers independently of their own store effects. Server and first-client values remain false/UTC, preserving initial HTML agreement. `startTransition` schedules the publication so React can finish pending streamed hydration before applying browser state. There is no product timer, polling loop, synthetic input, semantic fallback or assertion relaxation.

## Browser and local checks

The final-source no-input proof passed 20 reloads across browser `Australia/Brisbane` and saved `America/New_York` preferences. Its receipt records a complete document, hydrated=true, correct saved-date headings, zero trusted pointer/click/key/touch events during the no-input phase, and no page errors. A later phase verified picker changes to London and cross-tab storage changes to Berlin. Actual final-source date captures at 1440 and 390 were visually inspected: both show a formatted saved date. Full saved-newsletter captures and the proof source are also included. All data is synthetic local fixture data.

Final-source targeted results:

| Check | Result | Actual output |
| --- | --- | --- |
| No-input dates, 20 reloads, preferences and storage propagation | PASS, 1 journey | transition-date.log; transition-date-receipt.json |
| Original presend journey alone, including later save notice | PASS, 1 journey, 4.2m | transition-presend.log |
| Mailbox journey implicated by the first CI failure | PASS, 1 journey, 4.7m | transition-mailbox.log |
| Rendering, authenticated transport and browser-error assertions | PASS, 1 journey | transition-rendering.log |
| Typecheck | exit 0 | transition-typecheck.log |
| First-party command contract | exit 0 | transition-first-party.log |
| Production build | exit 0 | transition-build.log |
| Source freshness and offline Base comparison | exit 0 | transition-source-check.log |
| Integration specification/identity check | exit 0 | transition-integration-check.log |
| Full go-live suite, all 23 unchanged journeys | pending | transition-go-live.log |

`checks-receipt.json` and `commands-receipt.json` retain actual command outcomes and bounded invocations. The provided cloud toolchain was sourced for Node/browser commands, long-lived commands used `cloud_run`, and headless Chromium used `/usr/bin/chromium` with `--no-sandbox`. Local evidence does not claim a hosted installation or real provider acceptance.

## Mechanical and clause custody

The final source repeated `node src/base/contract-docs.mjs write` and `node src/base/contract-docs.mjs check`, both exit 0. Generated views were restored whole with `git checkout origin/main -- ACCEPTANCE.md docs/CLAIMS.md`. The source lock was regenerated last with `node scripts/edition-authoring/cli.mjs lock`, exit 0; its `check` exited 0. The actual sequence is in `transition-mechanical.log` and `transition-mechanical-receipt.json`. Only source hashes for the leased files changed in the final source lock. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged from main.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock exit=0; views=node src/base/contract-docs.mjs check exit=0

Before and after: **21 done / 197 partial / 98 missing, 316 total**. BUILD-008 remains done; BUILD-012 and RESULT-001 remain partial. There is no clause promotion or status raise.

## Product and workflow custody

All product commits are ordinary descendants on the named branch, authored and committed by `Run Edit Run fleet <fleet@runeditrun.com>`, with no co-author trailers. The complete candidate identity/message audit includes every candidate commit and is retained in identity-audit.txt. Every product push used cloud-push.py and succeeded on its first attempt. Main was fetched and merged after published saves; it remained already up to date. No published history was rewritten.

1. `39c03ea45c11d92edecc0c5abfc94ad396e47752`: first real fix save, `[skip ci]`, pushed after the no-click proof passed.
2. `2b1bda4efbbf42400627653c63f9e6689b4b4fe9`: source-lock candidate, pushed with CI enabled.
3. `cb141908f50e4b314aa255e51746f8611d5e7d26`: final scheduling correction and regenerated lock, pushed with CI enabled and independently confirmed by remote-ref read.

Verify **42485646853** failed on superseded SHA `2b1bda4efbbf42400627653c63f9e6689b4b4fe9`. Native job **128747202834** failed at `tests/go-live/compliance-journey.ts:40`: a strict complaints locator found two DOM rows, both carrying the expected warn state. The assertion was not changed. Its archive was read once with the prescribed `gh run view 42485646853 --repo just-every/run-mango --job 128747202834 --log-failed`; the command succeeded. `ci-native-failed.log` contains the actual sanitized failure, and `ci-failed-jobs.json` also records the dependent aggregate failure. This was a real failure and does not use the generated-view exemption. The final transition scheduling addresses premature streamed-boundary updates and was verified locally through the same mailbox journey; its final CI outcome is recorded separately below.

The superseded candidate's local full run was cancelled after 17 passed: 2 were interrupted and 4 had not run. Its actual log remains in go-live.log and is not represented as a complete pass. All 23 unchanged tests are rerunning against the final source. Initial unprefixed proof/check logs remain as historical evidence; `transition-*` files identify final-source validation.

Product publication and evidence publication are separate. Selected public-safe reports, receipts, logs and captures are transferred only through the report-only `evidence/sd-mango-hydration-date-3` ref. Evidence transfer grants no READY, acceptance or landing status. The fleet retains responsibility for its independent publication scan and landing.
