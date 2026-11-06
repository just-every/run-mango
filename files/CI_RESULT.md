# Exact candidate Verify

Run 42208321239, event push, head 5f52f4da71efe7256ff23865df4a64c3bc11302c: completed, conclusion failure.

The sole originating failure is job 127860487343, Build and public command checks, step Check generated contract documents. Its exact command is `node src/base/contract-docs.mjs check`; the error is `ACCEPTANCE.md: generated content differs; run contract-docs write.` The same command on the exact clean candidate exits 1 with the same error, recorded in generated-view-reproduction.json.

Job 127860590026, verify, fails its aggregate requirement because BUILD is failure and dependent shards are skipped. No runtime assertion failure is reported. Both failed jobs' log archives were read exactly once using the required gh run view commands, successfully, and their command and failure excerpts are included. CI environment echo is intentionally excluded from published evidence.

This is the brief's explicit generated-view exception. The locally generated views pass write and check, but this cloud candidate must retain main's views. No repair, Verify rerun or dispatch is performed. READY signals candidate custody for the fleet's guarded lander, which regenerates views, runs its publication scan and enforces final exact-SHA workflows. It does not mean the recorded failure conclusion was success or that skipped runtime shards passed.

GitHub budget: six command invocations used: initial main run discovery, candidate run discovery, the single candidate status poll after more than 300 seconds, jobs lookup and one log archive command for each of two failed jobs. No additional watcher.
