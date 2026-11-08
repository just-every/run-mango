# CI protocol

Only the final candidate (without [skip ci]) is eligible for READY. Use a single REST watcher for just-every/run-mango, discovering Verify with actions/runs?head_sha=<full SHA>&per_page=100 and polling actions/runs/<run ID> at 300-second intervals. Each gh process loads only GH_TOKEN from the decrypted launcher bundle without printing it. Total GitHub-call budget is ten, including failed-job archive reads; the watcher reserves two calls for diagnostics by stopping after eight calls if still running.

Require completed/success on the exact SHA. If Verify fails, report the run; obtain failed job details and run gh run view <RUN_ID> --repo just-every/run-mango --job <FAILED_JOB_ID> --log-failed once per failed job. Do not use redirected job-log blobs. A failure solely at generated ACCEPTANCE.md/docs/CLAIMS.md check is the user-authorized exception; the Mac lander regenerates those views. No main push, landing or publication scan is claimed by a builder report.
