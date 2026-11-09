# sd-mango-c-f144-rb2 — CONT-042 confirmation allowance replay

Repository: just-every/run-mango. Product branch: cloud/sd-mango-c-f144-rb2.

## Plan and scope

The complete ordered plan is in PLAN.md. This replay preserves the existing candidate, merges current main, proves only the touched confirmation-allowance journey and typechecks, regenerates contract views and the source lock, audits all candidate commit identities/messages, pushes the named cloud branch, and checks its exact-SHA Verify. Reports and receipts are published separately on the evidence ref. No landing or clause promotion is claimed.

## Replay judgment

A new full-history clone was made with `git clone --filter=blob:none` and no depth. The source branch cloud/sd-mango-c-f144-land-abe94bb352 resolved exactly to 597e6a869f556d4a86194220126c09b1fa666c47, as required. The task branch was created from that commit.

The first fetched main was 8d2570706eb369d56973e20a6da84e0220389775, which contains the brief's 14f4005d baseline and a newer permanent-rejection journey. The merge base was 5694d4b34c3142d7a1ad7a79bb359887ef4dcc66. Main has no changes to tests/go-live/confirmation-allowance-journey.ts since that merge base. The actual merge was clean; there were no unresolved hunks requiring a semantic ruling. The candidate's complete 64-line journey diff was retained byte-for-byte, including the browser-clock `page.evaluate(() => Date.now()+10000)` fix from main commit 1d8f22780bb0a3d3caebfc5f5b8d255fe4837536. All newer main source and assertions were retained. Main's CONTRACT.md was kept intact before generation, with no candidate clause edits. Main's sources.lock.json was selected before regeneration from source.

The only intended final delta relative to merged main is the confirmation-allowance journey and its generated lock entry. No tests were deleted, skipped or weakened. No proof directory, report, receipt, or temporary runner is included in the product commit. No generated view is changed relative to main.

## Clause judgments and counts

CONT-042 remains partial. All clause judgments remain main's. Before/after full-target counts: 23 done / 195 partial / 98 missing / 316 total. This is supporting evidence for cross-carrier admission and exhaustion. It does not claim next-day reset, popup/landing integration, provider acceptance, or full-clause completion.

## Local verification

`cloud_run timeout 180 pnpm run typecheck` passed, exit 0. The repository's typecheck covers its maintained source TypeScript graph.

The existing confirmationAllowanceJourney is invoked once by the temporary focused-runner.ts in a fresh native kiosk installation. The runner only imports the existing fixture and journey and closes the runtime in finally; it changes no assertion or product behavior. Assertions run at 1440, and the journey captures admitted/exhausted states at 1440 and 390. Existing challenge and mail HTTP boundaries are synthetic; Mango routes, D1, permission state, consent evidence, reservation counters and refusal accounting are real native fixture behavior. The actual runner, test reporter output, reconciliation attachment and selected screenshots are included in the evidence packet after completion.

The required rer setup command installed locked dependencies, emitted production and installer preview builds and completed local migrations, then exited 1 with only `setup: failed (exit 1)` as its terminal diagnostic. Its private raw log is excluded from this public packet. The focused fixture and typecheck independently verify this task's changes; setup-receipt.json records the limitation without treating setup as a passing check.

Contract generation uses the seed's documented `node src/base/contract-docs.mjs write` followed by `check`. Both passed; write reported zero changed documents. ACCEPTANCE.md and docs/CLAIMS.md were restored whole from origin/main. The source lock was generated last with `node scripts/edition-authoring/cli.mjs lock`, and `node scripts/edition-authoring/cli.mjs check` passed. Exact commands, exits, lock digest and source file count are in mechanical-receipt.json.

## Publication and CI

The focused journey passed once (one passed, zero failed/skipped/flaky) in 7.5 minutes. The final main fetch still resolved to 8d2570706eb369d56973e20a6da84e0220389775, so no additional merge was needed. The merge commit is dd6334266cd5a22b30d82c59a57a16d828dcd420, with parents 597e6a869f556d4a86194220126c09b1fa666c47 and 8d2570706eb369d56973e20a6da84e0220389775. Its author and committer are Run Edit Run fleet <fleet@runeditrun.com>, with no trailers and no skip-ci marker. The checkout was clean before publication. The final identity/trailer/message audit passed for all seven candidate commits, including every side parent. The initial audit covered all six commits in origin/main..HEAD, including side parents: five fleet-authored commits plus the existing owner-authored merge. All author and committer names/emails matched the fleet or owner identities already present on main, and all messages had no prohibited trailers or OpenAI/Codex co-authors. The final audit is repeated immediately before pushing.

## Observed probe

PROBE CONT-042: `/subscribe` with two imported opted-out destinations, hosted-first and kiosk-first, four different networks and disclosures per destination, and fresh challenge tokens -> every request returned 202 with the same confirmation-required acknowledgment and no Retry-After header. Each destination's mail/counter progressed 0→1→2→3→3, with exactly three durable requests, confirmations and handoff claims. Fourth requests added zero consent captures and no outbox message; the only added contact history was the exact daily-allowance refusal. Refusal accounting increased once for each carrier, and both addresses stayed unsubscribed with no confirmation consumed. A fresh destination still received one email, confirmed by affirmative POST and became subscribed, while the two exhausted counters stayed at three.

MECHANICAL lock=`node scripts/edition-authoring/cli.mjs lock` exit=0; lock check=`node scripts/edition-authoring/cli.mjs check` exit=0; views=`node src/base/contract-docs.mjs write` then `node src/base/contract-docs.mjs check` exit=0/0. Main's generated views were restored whole before regenerating the lock last.

The product push succeeded on the first guard attempt. Push receipt: product-push.log. The final diff is exactly two files: tests/go-live/confirmation-allowance-journey.ts (56 insertions, 8 deletions) and sources.lock.json (one generated hash replacement). The final main fetch showed no movement, no second merge was necessary, and no force push or main/default-branch push was performed. No PR was required or created by this task.

The first exact-SHA REST discovery failed in gh with `invalid character 'u' looking for beginning of value`; gh supplied neither a run ID nor HTTP status/body. The decrypted credential bundle and exact shared Git setup were refreshed before the next attempt. The watcher observes at least 300 seconds between Verify calls, including discovery, and records every API call in github-calls.json. No green result from any other SHA is used.

## Custody and cleanup

The setup and focused journey command subreapers returned, and each known browser/Vite server PID started by them is absent. No broad process kill was used. node_modules was removed after all local checks. The Git checkout is kept only until the separate report transport succeeds, then removed as requested; the final task message attests that final removal. Reports/receipts/screenshots remain outside the clone under the task packet.

The second REST discovery returned HTTP 200 and found push Verify run 42665666822 for the exact product SHA, status in_progress at 17:38:43 UTC. Run URL: https://github.com/just-every/run-mango/actions/runs/42665666822. Two GitHub calls have been used. The raw diagnostic URL sanitizer removed query strings; the next narrow run-status response is retained as the final receipt. No READY claim is made while this run is in progress.
