# Exact candidate Verify

Commit: 1a4f7d299e3c366e6321a8eb4b481a6d2d840576.
Run: 42134898452, workflow_dispatch, completed/failure.
URL: https://github.com/just-every/run-mango/actions/runs/42134898452

Discovery found no automatic run on this documentation-only status commit. One dispatch was requested. Run discovery was repeated after 300 seconds, once; no run was rerun. Eight GitHub calls total, including the initially mistyped main-SHA lookup, two exact-candidate discoveries, one dispatch, the terminal jobs listing and one log archive invocation for each failed job.

Job 127620523679, Build and public command checks, failed only at Check generated contract documents:

    node src/base/contract-docs.mjs check
    ACCEPTANCE.md: generated content differs; run contract-docs write.
    Process completed with exit code 1.

The exact same read-only command on the exact candidate returned exit 1 with the same ACCEPTANCE.md message. Generator write then check had already returned zero before restoring origin/main's generated files, as required. No view repair or workflow edit was made.

Job 127620606162, verify, failed its aggregate proof gate because BUILD=failure and SHARDS=skipped. This is a consequence of the generated-view failure. Plan succeeded; light, shards, full-push-proof and nightly-proof skipped. There is no separate product assertion failure in this run.

Failed logs were read once per job with these commands, both exit 0:

    gh run view 42134898452 --repo just-every/run-mango --job 127620523679 --log-failed
    gh run view 42134898452 --repo just-every/run-mango --job 127620606162 --log-failed

The full actual local log files are retained in the packet; explicit publication selects this failure receipt rather than CI environment blocks. The brief explicitly treats a generated-view-only failure, including dependent failed or skipped jobs, as eligible for READY. This report preserves GitHub's raw failure conclusion; it does not describe the shards as passing. The lander must regenerate views and run its exact-SHA checks before landing.
