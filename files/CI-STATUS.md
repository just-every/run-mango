# Terminal CI and custody

Product: just-every/run-mango, cloud/sd-mango-c-f49, 2beb5ed987bece4b87ec0c93048761d6a7d2e6cd.
Exact-SHA push Verify: 42116771178, completed, conclusion failure.
URL: https://github.com/just-every/run-mango/actions/runs/42116771178

The only independent failed assertion was job 127558452668, Build and public command checks, step Check generated contract documents:

    node src/base/contract-docs.mjs check
    ACCEPTANCE.md: generated content differs; run contract-docs write.
    Process completed with exit code 1.

Job 127558556085, verify, failed its aggregate coverage guard because BUILD was failure and SHARDS was skipped. The plan passed; the shards and dependent proof jobs were skipped. No browser test assertion failed in this run, and no skipped shard is represented as having run.

Each failed job's archive was read exactly once with gh run view and --log-failed. Both archive commands succeeded. Sanitized logs omit runner environment blocks. The same read-only generated-view command returned the same expected acceptance-view error on the terminal product SHA; expected-view-check.json records the actual nonzero exit.

Under the explicit cloud task exception, a failure only on generated acceptance or claims views, with dependent jobs failing or skipped because of it, counts as green for the READY line. No generated view was changed to repair CI and no rerun or dispatch was used. Local generator write and check passed, then the generated views were restored whole from main; the source lock and native tests passed locally. The maintained lander must generate the views, verify that resulting exact head, scan it and land it.

The complete source history was cloned, but the cloud did not run the fleet's publication scanner. Scan: commit=2beb5ed987bece4b87ec0c93048761d6a7d2e6cd, complete=not-run, historyScanned=not-run, findings=not-run. No main equality or terminal Run site success is claimed. The earlier observed main c69dd5c2f6f75ba010959aa653820860ecd1abbf had green Verify 42094362243 and Run site 42094362609. The main integrated before this candidate was 955785c08ed00910bc83e3aa3bbb0a54703f6f71.

The brief's lane hold until f45 is on main remains a fleet custody condition. The requested f45 base is retained, and was not contained in last-fetched main 955785c08ed00910bc83e3aa3bbb0a54703f6f71. No default branch was written here.

GitHub budget: 6 calls — one initial main exact-head discovery; two candidate exact-head discoveries separated by over 300 seconds; one completed-run jobs read; one archive read for each of the two failed jobs. No polling loop, dispatch, PR or rerun was created.

The product branch was pushed successfully through the fleet guard. Evidence is a separate report-only ref; its publication is not READY or landing proof. Native CAMP-023 has no remaining acceptance blocker. R-202 remains not-run external field proof and does not block done under the current contract.
