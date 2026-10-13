# Verification profiles

`node scripts/rer.mjs verify` runs routine acceptance: command/source checks,
operations, typecheck, production build, API/model tests, browser journeys and
native install/setup/rotation/export/restore/reset journeys. The independent
command/source checks overlap, followed by operations and root typecheck running
together. Operations retain two Node test workers and their existing fixture
processes; typecheck runs one `tsc --noEmit`. Operations bundle in memory and
write only isolated fixture state or external scratch/evidence, so they do not
rewrite the root compiler's inputs. Production build waits for both stages to
finish. After the build, `node:os`'s `availableParallelism()` selects the main
and native schedule. With one or two available CPUs, main finishes before native
starts; main uses one worker on one CPU and two otherwise. With three or more,
main's two workers overlap native's one. Native checkouts keep their own state
and physical `.cache/vite` directories. The later newsletter, sender-disclosure,
campaign-results, go-live, move-in and opted-in release-capacity stages run sequentially; shared
mutable browser suites use one worker. `VERIFY_SCHEDULE` records the CPU budget
and selected schedule; CPU availability does not measure other processes' load.

Each run prints its external evidence directory, containing `timings.json`,
`timings.md`, per-stage logs and per-file test timings. Stage times include
startup and teardown. Node operations and Playwright both report declaring-file
times, summing test attempts (including retries); parallel files overlap. Required
missing timing output fails verification. Every stage records its exit code,
signal or unstarted status. Failures cancel concurrent stages and their scoped
descendants, including detached processes, and retain redacted diagnostics.
Terminal writes await stream completion and pause captured child output while
the receiver is busy. Slow open pipes retain complete ordered output; a closed
pipe or failed log fails verification, stops owned children and prevents later
stages. Final timing announcements are awaited before success is returned, and
an output failure repairs an already-written timing result to failure. Cancellation
also interrupts pending output when an open receiver stops draining: captured
pipes resume for owned process cleanup, and the saved outcome becomes FAIL.
Signal handling covers the first schedule/heading through the final total and
CLI flush. Cancelled output may stop before all bytes reach the receiver;
successful output remains complete and preserves decoded Unicode code points.

For full public-command wall time, including rer initialization and cleanup, use:

```sh
node scripts/verification/time-command.mjs -- node scripts/rer.mjs verify
node scripts/verification/time-command.mjs -- pnpm verify:release
```

The timer launches the real command, records its launch-to-close boundary in
`public-command.json` and includes it in the final `timings.json`/`timings.md`.
If cancellation prevents the public command from launching, the timer records
FAIL with an explicit “not launched” boundary instead of inventing a duration.
Without the timer, totals are explicitly coordinator-only. A remote runner may
also attach its actual outer receipt with `node
scripts/verification/attach-public-timing.mjs REPORT_DIRECTORY RECEIPT.json`.
The receipt requires ISO `startedAt`/`finishedAt`, numeric `durationMs`, integer
or null `exitCode`, and string or null `signal`; its boundary must enclose the
coordinator. It cannot turn a failed verification into a pass.

Install Chromium once (`pnpm exec playwright install chromium`) before browser
verification. The fresh-install journey still runs the real frozen dependency
install and setup rerun; the JavaScript-disabled sign-in journey uses a fresh
source/data copy with the already installed dependencies. Native authority
journeys retain credential rotation and failed-migration recovery.
Native startup waits for the CLI's complete `RER_READY` output line, emitted
after its health verification, without an additional polling loop. Startup
retains its bounded deadline and stops owned processes on exit, error or abort.

`pnpm test` runs the routine tests without repeating checks/typecheck/build.
`pnpm test:release` runs the capacity workloads alone. `pnpm verify:release`
runs the complete routine profile followed by those capacity workloads.

The actual `rer release` producer selects the committed `verify:release` script
when present in its clean frozen-install clone. Capacity failures therefore
block its receipt/artifact/tag path. Seeds without that script retain `verify`.
This one producer file is intentionally adapted Mango source under the existing
Base CLI edition origin/mapping. Other release files remain recorded verbatim
Base copies; the adapted file is not claimed byte-identical to Base. The CLI's
output, main, lifecycle and local files are also adaptations under that mapping:
progress and final results await terminal writes, and output failure still
releases operation locks and signal handlers after owned process cleanup. Reset
awaits successful inventory output before prompting or removing any local state;
its existing inventory safety checks, confirmation and lock remain mandatory.
SIGINT and SIGTERM cancel reset and owner-email prompts. Reset observes
cancellation after safety checks, inventory output, confirmation and lock
acquisition, and before each removal. An in-flight removal still settles before
the lock is released; cancellation prevents later removals without rolling back
any deletion already started.
Unchanged CLI files retain their individual verbatim Base records. The
onboarding command store's local adaptation pauses producers during terminal
backpressure; capture/log failures stop owned processes, notify the coordinator
and propagate a redacted error with the actual process exit outcome. Its redactor
is also adapted to hold complete Unicode code points at the streaming boundary,
without weakening secret holds or the existing bounded buffering.

Capacity acceptance retains the original 1,001-row mixed previews/export and
full apply/resume/repeat/export/undo lifecycle, plus 10,000-row
maximum review and long-consent workloads. Routine acceptance runs the same
HTTP lifecycle and assertions across multiple batches with observed progress, and long-consent retention
for new/existing contacts. Over-capacity refusal, payload budget refusal and
large-original erasure remain routine, alongside all session/origin, authority,
suppression, consent, atomicity, undo, erasure and export/restoration guards.
No production behavior or capacity limit changes with the profile.

The release profile is deliberately longer than routine verification. A local
pass proves these local journeys, not provider acceptance or deployment.
