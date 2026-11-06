# Exact candidate Verify

Head: 2b23d0d2f1745f771e34d320624ab69cfebb7bcf.
Push Verify run: 42192418639, completed, conclusion failure.
URL: https://github.com/just-every/run-mango/actions/runs/42192418639

The only independent failing step is job 127807509906, Build and public command checks, step Check generated contract documents:

Command: `node src/base/contract-docs.mjs check`
Observed output: `ACCEPTANCE.md: generated content differs; run contract-docs write.`
Exit: 1.

The aggregate verify job 127807619588 fails its selected-coverage assertion because Build failed and shards were skipped. No shard or test ran in this candidate CI run. Its failure is downstream of the generated-view check, with no additional failure shown by the jobs response or archive.

Both failed job archives were read once with the specified commands, both exit 0:

- `gh run view 42192418639 --repo just-every/run-mango --job 127807509906 --log-failed`
- `gh run view 42192418639 --repo just-every/run-mango --job 127807619588 --log-failed`

The exact command was also run locally on the committed candidate after restoring main's views: exit 1 with the same generated-content diagnostic, recorded in EXPECTED-VIEW-CHECK.log. Earlier generator write and check both passed; generated views were restored as required before commit. No generated view is committed and no workflow was changed or rerun. This is the task's explicit permitted generated-view failure, counted as green for the READY handoff. This does not claim a green actual CI conclusion or CI execution of the journey. The exact-head local journey, typecheck, build and source check all pass in CHECKS.json; the Mac lander must regenerate views and enforce its own checks.

GitHub budget: six commands, comprising main discovery, two candidate discoveries separated by at least 300 seconds, one completed-run jobs request and one archive read for each failed job. No CI dispatch, rerun or PR call was made.
