# sd-mango-c-f144-fix1 report

Status: BLOCKED by the explicit source-head prerequisite. No product commit, product push, PR, merge, status promotion, or landing claim.

Repository: just-every/run-mango
Requested product branch: cloud/sd-mango-c-f144-fix1
Required source: cloud/sd-mango-c-f144 at 2a365f79540f0f2007dbaf5abcf2a14bcf90dc29
Observed source: cloud/sd-mango-c-f144 at 80bc36a87109a3da22509aa422b30415de462dc6
Fresh origin/main: 7b95de610793d2dad6e17495da3e8f2e67e27418
Local checkout/head: cloud/sd-mango-c-f144-fix1 at 80bc36a87109a3da22509aa422b30415de462dc6 (unpublished local branch; not a completed candidate).

## Plan and execution

1. Configure the required global fleet identity, refresh the launcher, read its AGENTS.md, install the decrypted-bundle credential helper/config cleanup and push guard. Completed.
2. Clone just-every/run-mango with `git clone --filter=blob:none` and no depth, configure the repository fleet identity and co-author cleanup hook, read the repository instructions, contract and generated acceptance view. Completed. `git rev-parse --is-shallow-repository` returned `false`.
3. Fetch main and cloud/sd-mango-c-f144, require the latter's head to match the pinned SHA, create the fix branch and reproduce the candidate defect before changes. Fetch completed, but the required equality test exited 1. The shell continued through creation of a local branch and `git rev-parse HEAD`; that output was 80bc36a87109a3da22509aa422b30415de462dc6. No commit or merge followed. This local branch does not satisfy the required starting-head condition.
4. Inspect the exact pinned source and the newer fetched source to determine the relevant hunk. Completed, read-only. The newer source already contains the requested declaration and a full-outbox equality assertion; see below and SOURCE-DIFF.txt.
5. If the source prerequisite had passed: reproduce with a bounded Playwright command, merge fresh main preserving its newer clauses/tests/ID-MAP, resolve CONTRACT.md before regeneration, add the scoped pre-action snapshot, run the fixed focused journey, the reports/campaigns shards selected by scripts/verification/plan.mjs, and typecheck. Not executed because the required source-head prerequisite failed; this report claims no runtime reproduction or passing probe.
6. If a product change were made: run `node src/base/contract-docs.mjs write` then `node src/base/contract-docs.mjs check`; restore ACCEPTANCE.md and docs/CLAIMS.md whole from origin/main; run `node scripts/edition-authoring/cli.mjs lock` last and `node scripts/edition-authoring/cli.mjs check`; commit under fleet identity/hooks and audit every candidate identity and trailer; push only the named cloud branch through cloud-push.py; inspect exact-SHA Verify within the REST call budget. Not executed; no product changes or generated views were committed.
7. Publish this actual report, receipt, source diff and identity audit only to evidence/sd-mango-c-f144-fix1 using the supplied evidence entrypoint. Then delete the product clone as requested. No node_modules were installed.

## Source evidence

`git grep -n beforeOutbox -- tests/go-live` on the fetched source finds:

- tests/go-live/confirmation-allowance-journey.ts:90: `const beforeOutbox=await site.control('/_kiosk/messages');`
- tests/go-live/confirmation-allowance-journey.ts:148: `expect(await site.control('/_kiosk/messages')).toEqual(beforeOutbox);`
- tests/go-live/confirmation-allowance-journey.ts:166: receipt uses `outboxBefore:beforeOutbox.length`.

The snapshot is inside the per-request loop, after beforeMail and before navigation and the form POST. The fourth-request branch compares the complete post-request outbox to the captured snapshot. These lines are already published on the source branch; this task did not introduce them.

At the required pinned SHA, the corresponding source has beforeMail at line 86 followed directly by its length assertion, with no beforeOutbox declaration, while the receipt references beforeOutbox.length at line 155. This confirms the static defect described in the brief. It is not a runtime reproduction. `git diff 2a365f79540f0f2007dbaf5abcf2a14bcf90dc29..80bc36a87109a3da22509aa422b30415de462dc6 -- tests/go-live/confirmation-allowance-journey.ts` is preserved in SOURCE-DIFF.txt, including the existing declaration and fourth-request no-mail assertion.

The current source also contains additional changes to refusal-history reconciliation, disclosure uniqueness, confirmation/request evidence reconciliation and the fresh-destination control. Those changes are outside this brief's single-defect scope. No attempt was made to replace or duplicate them, or rewrite their published history.

## Results and custody

- Required source-head comparison: FAIL, exit 1. Required 2a365f79540f0f2007dbaf5abcf2a14bcf90dc29; observed 80bc36a87109a3da22509aa422b30415de462dc6.
- REPRO shared-kiosk: NOT RUN (source prerequisite failed).
- PROBE shared-kiosk: NOT RUN (no fix candidate created).
- Reports shard, campaigns shard and typecheck: NOT RUN. The known presend Saved placeholder issue was not exercised.
- MECHANICAL lock=`node scripts/edition-authoring/cli.mjs lock` exit=NOT_RUN; views=`node src/base/contract-docs.mjs write && node src/base/contract-docs.mjs check` exit=NOT_RUN. No source changes requiring regeneration.
- Source status counts before/after this task: done 21 -> 21; partial 197 -> 197; missing 98 -> 98; total 316 -> 316. The required pinned source, fetched source and main have these same counts.
- CONT-042: partial -> partial. No clause judgment changes; no tests deleted, skipped or weakened.
- Product commits created: 0. Product pushes attempted: 0. PR: none. CI run IDs for this task: none. GitHub API calls: 0. No READY or PUSHED product claim.
- `git status --porcelain`: empty. The fetched source candidate's complete origin/main..HEAD identity/trailer audit is in IDENTITY-AUDIT.txt; all author/committer identities are fleet and no trailers appear.
- Actual structured receipt: SOURCE-RECEIPT.json. Evidence publication is separate report custody and does not authorize product landing.

## Required follow-up

The lane must reconcile this stale brief with the newer source branch before another product attempt: either reissue the pin/scope for the current continuation or explicitly authorize a new candidate from the old pinned object. This task's mandatory head check provides no default that authorizes changing the required SHA. The requested declaration is already present in the current continuation; its runtime and exact-SHA CI status remain unverified by this task.
