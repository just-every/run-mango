# Exact candidate CI

Repository: just-every/run-mango
Branch: cloud/sd-mango-c-f109
Head: 42a41d35cf39a6ffbf1cb8f7b572383640c3ca09
Verify run: 42208912590
Event: push
Observed status: completed
Observed conclusion: failure
URL: https://github.com/just-every/run-mango/actions/runs/42208912590

The plan job passed. Build and public command checks, job 127862480734, failed only at Check generated contract documents, command `node src/base/contract-docs.mjs check`, exit 1. The exact observed diagnostic is:

> ACCEPTANCE.md: generated content differs; run contract-docs write.

The authoring and other shards were skipped because their build dependency failed. The final verify job 127862571454 failed its aggregate dependency assertion. There is no recorded failing product test. This is exactly the generated-view-only exception authorized by the brief. The cloud leaves ACCEPTANCE.md and docs/CLAIMS.md at origin/main and does not commit them. Local generation and check succeeded before restoring the views. The Mac lander must regenerate the views, recheck source lock and require its own exact-SHA Verify and publication scan before landing.

Both failed-job logs were read exactly once using the prescribed gh run view command. Actual diagnostic excerpts are in build-failed-excerpt.log and verify-failed-excerpt.log; non-secret CI environment listings were omitted from the publication packet. Full local diagnostics remain outside the packet. No CI rerun, dispatch, repair or workflow edit was performed. The single watcher observed the run no sooner than 300 seconds after discovery. GitHub budget used: six invocations total, including base-head discovery, candidate discovery, one candidate status read, one jobs read and two failed-job log reads.

Handoff eligibility: READY under the explicit generated-view-only exception. This is not a claim that the run concluded success or that the new journey ran in CI. The focused browser journey and typecheck did pass locally on the exact committed head.
