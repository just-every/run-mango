Exact candidate: 697525917a55c6da6bb8612640b864a258586721
Verify run: 42128823026
Event: push
URL: https://github.com/just-every/run-mango/actions/runs/42128823026
Status: completed, conclusion failure.

Root failure: job 127599950610, Build and public command checks, step Check generated contract documents. Its command was node src/base/contract-docs.mjs check and its sole diagnostic was: ACCEPTANCE.md: generated content differs; run contract-docs write. Exit 1.

Dependent failure: job 127600058721, verify, step Require the selected coverage and its proof. It rejected the failed Build and skipped test shards. There was no separate test assertion failure. Candidate test shards did not run, so they are not reported green.

Both failed logs were read once with gh run view 42128823026 --repo just-every/run-mango --job <job id> --log-failed. The actual commands used job 127599950610 and job 127600058721. The environment summaries were omitted from the published log copies. All meaningful commands and diagnostics are retained in ci-build-failure.txt and ci-coverage-failure.txt. No signed URL or token is selected.

The committed generated-view check locally reproduced the same exit 1 and diagnostic. Before view restoration, the required contract write and check both passed. The committed source lock and offline Base-copy check pass. Under the task's explicit generated-view rule, this expected failure and its dependent skips qualify for READY. No generated views were committed, and no CI repair, dispatch or rerun was attempted. The fleet lander regenerates the views, scans and requires the resulting exact-SHA Verify before landing.

GitHub API budget used: six logical calls, including two failed-job log invocations. Discovery was at 23:20:17Z and the next run lookup was after the required 300-second interval.
