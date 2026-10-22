# Verification profiles

`rer verify` runs routine acceptance: command/source checks, operations,
typecheck, production build and public API/browser journeys. It covers native
operator authority, sender and approval checks, consent and suppression,
imports, erasure, delivery uncertainty, signed provider facts and local
export/restore. `pnpm test` runs routine tests without repeating static checks
and the build. Install Chromium once with `pnpm exec playwright install chromium`
before browser checks.

Push and pull-request Verify split independent stages into parallel jobs.
Main, local-start and go-live browser journeys use six, three and eight
Playwright shards respectively; newsletter UI (with sender disclosure),
campaign results and move-in run independently, alongside static/operations
checks and the remaining native lifecycle journeys.
Shared mutable browser state stays within one isolated
job, and each job retains its own database, caches and temporary checkouts.
Slow frozen fresh-install and README clone journeys run on release tags and
nightly, outside the ordinary push wall. The push rule is fifteen minutes;
a measured green workflow establishes that wall, not the intended shard layout.

The coordinator supports selecting a stage and, for shardable browser stages,
a Playwright shard. A full local invocation still covers the routine stages
sequentially or with the bounded overlap appropriate to that machine; its total
is separate from the parallel CI wall. CPU availability does not measure host
load. Run only affected checks while editing; CI is the complete wall. Heavy
local work requires one-minute host load at or below 36 and `nice -n 15`.

Each run prints its external evidence directory with `timings.json`,
`timings.md`, per-stage logs and declaring-file test timings. Stage times include
startup and teardown; attempts are summed per file and parallel files overlap.
Required missing timings fail verification. Stages record exit code, signal or
unstarted status. Failure or cancellation stops owned children and retains
redacted diagnostics. Output failure cannot produce a passing result.

To measure the full public command, including rer initialization and cleanup:

```sh
node scripts/verification/time-command.mjs -- rer verify
```

The timer records the launch-to-close boundary in `public-command.json` and
includes it in `timings.json` and `timings.md`. Without it, totals cover the
coordinator only. Remote runners may attach their actual outer receipt using
`node scripts/verification/attach-public-timing.mjs REPORT_DIRECTORY RECEIPT.json`.
The receipt must enclose the coordinator and cannot turn failure into a pass.
Keep timings and screenshots outside the product checkout under the isolated
evidence root described in [OPERATIONS.md](OPERATIONS.md#test-artifacts).

The `rer release` producer runs the committed routine `verify` script in its
clean frozen-install clone. No separate release-capacity script or capacity
workload is part of its receipt. Existing import limits are unchanged; prior
capacity measurements retain their named revision and scope and are not fresh
release evidence. Tag/nightly installer checks remain separate from capacity
claims. The default budget is 200 cases. Mango's narrow complex-seed exception in
`test-budget.json` caps the aggregate at 214: the inherited 211 plus the health
probe and erasure-aware export regressions, plus one MOVE-009/CONT-012/AUD-008
imported-engagement review, approval and dispatch journey. Its controlled clock,
populated native results and immutable delivery policy are independently useful
coverage alongside archive custody, repeat, undo and erasure. The six-role authorization matrix,
consent/suppression, migration custody, erasure, delivery evidence and native
restore flows retain their independent fixtures and assertions. Restructuring
thirteen cases across these flows would exceed the bounded health correction;
this exception grants no speculative headroom and changes no test discovery.

`node scripts/verification/test-budget.mjs` collects every configured Playwright
category (including the slow installer tier) and all top-level Node operation
registrations, expanding their matrices without executing test bodies. It checks
the aggregate against the written cap before the static CI stage. A collection
error fails the check. Actual test execution keeps the existing runners, fixtures
and cleanup. Prove changed public flows; do not add copy, version, hash or file-list
pin tests.

Native startup waits for the CLI's complete `RER_READY` line after health checks
and stops owned processes on exit, error or cancellation. Authentication uses
native browser admission through the private `RER_OPEN` development entry,
which carries a dev key rather than an emailed one-use link. Captured-mail
pages and printed email sign-in links are not verification entry points. Provider HTTP and DNS may be substituted only at the
test network edge. A local pass establishes these local journeys, not live
provider acceptance, hosted restore, deployment or release-tag completion.
