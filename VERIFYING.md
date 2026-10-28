# Verification profiles

`rer verify` runs routine acceptance: command/source checks,
typecheck, production build and public API/browser journeys. It covers native
operator authority, sender and approval checks, consent and suppression,
imports, erasure, delivery uncertainty, signed provider facts and local
export/restore. `pnpm test` runs routine tests without repeating static checks
and the build. Install Chromium once with `pnpm exec playwright install chromium`
before browser checks.

Push and pull-request Verify build once, check the built output and hydration,
and share that production build with eleven jobs of whole public-door journeys, including the newer safety
and complete phone journeys retained from main.
`scripts/verification/plan.mjs` declares the file selections for each job; files
run with bounded workers against separate installations. Shared mutable browser
state stays within its journey, and each job retains its own database, caches
and temporary checkouts. Frozen fresh-install and production secret-scan journeys
run on release tags and nightly, outside the ordinary push wall. The target is
ten minutes or less; a measured green workflow establishes the actual wall.

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
claims.

Keep a small set of whole user and business flows through HTTP routes, native
commands and the browser. The six-role authorization, consent/suppression,
migration custody, erasure, delivery evidence and native restore flows retain
their behaviour assertions. One phone smoke uses a 390-pixel viewport; other
browser journeys use 1440 pixels. There is no registration cap or cap-check
script. Prove changed public flows and fold useful behaviour into a surviving
journey before deleting duplicate coverage. Do not add copy, version, hash,
file-list or presentation-threshold pins.

Native startup waits for the CLI's complete `RER_READY` line after health checks
and stops owned processes on exit, error or cancellation. Authentication uses
native browser admission through the private `RER_OPEN` development entry,
which carries a dev key rather than an emailed one-use link. Captured-mail
pages and printed email sign-in links are not verification entry points. Provider HTTP and DNS may be substituted only at the
test network edge. A local pass establishes these local journeys, not live
provider acceptance, hosted restore, deployment or release-tag completion.
