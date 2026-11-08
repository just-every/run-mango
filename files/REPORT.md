# fv-mango-409-1 report

Repository: just-every/run-mango. Product branch: cloud/fv-mango-409-1. Evidence branch is separate.

## Finding and scope

The evidence does not establish one DNS cause for all four 409s. The matched f144/f145 failure occurs in the real link-policy inspector while the synthetic shop DNS/HEAD transport traverses a separate Node HTTP edge under the real five-second deadline. The original hosted exception and latency were not recorded, so a specific hosted timing cause is not claimed. The go-live harness already intercepts public DNS; it does not make a public lookup of shop.example.test. A delayed local edge is enough to reproduce the identical approval blocker.

The change moves only the existing fixed shop.example.test A/AAAA and HEAD responses into a test-only in-process network fixture, shared with the HTTP edge. Production link inspection, host/scheme restrictions, deadlines, provider behavior and CI partitions remain unchanged. Unknown hosts still reach the configurable edge. A registered MSG-006 regression exercises the real inspector with external fixture transport unavailable: the known shop succeeds; unlisted hosts and HTTP remain blocked; contact links remain local; another allowed host fails closed.

MSG-006 remains partial. Its Evidence cell gains the new regression; its existing gaps and every other clause judgment remain intact. No clause is promoted. Generated ACCEPTANCE.md and docs/CLAIMS.md are restored from origin/main after generation/check; the lander must generate the final views.

## Historical evidence

- f145, run 42493957794 job 128772486199: the failing archive was retrieved directly. email-size.flow.ts approval expected 200, received 409 with message.links.resolved and shop.example.test could not be resolved and checked.
- f144, run 42487666893 job 128753337741: archive commands returned zero bytes after the successful rerun. The declared repository's retained evidence ref supplies the actual earlier failure extract, with the same presend/email-size blocker and HTTP 409. It does not contain a separate thrown “synthetic link resolution failure”. Exact provenance is in retained-log-provenance.json.
- f134, run 42484470495 job 128743646905: archive commands likewise returned zero bytes. Its retained failed move-in log records consent_capture_failed with “Confirmation delivery is uncertain; the attempt will not be repeated automatically.” The generic consent route maps that transport outcome to 409. This is not a shop-link lookup.
- f137, run 42484392722: both attempted archive reads returned zero bytes. The supplied brief is the historical failure source; no newly obtained job archive is claimed.

Seven GitHub CLI invocations were used for historical archives, with exact commands and outcomes in github-calls.json. Empty successful outputs are not treated as read failure contents. No direct signed job-log blob retries were used.

## Deterministic experiments

1. baseline-slow-edge.log: the original complete presend journey with a one-off 5.5-second shop DNS edge delay fails at its earlier five-second browser save assertion. The edge logged 5501 ms and a closed response socket. This establishes a local deadline, not measured hosted DNS latency.
2. baseline-approval-probe.log: a small real installation/consent/draft/approval probe under the same delayed DNS edge fails with the exact original HTTP 409 message.links.resolved blocker. fixed-approval-probe.log runs the identical probe and fault after the fixture change and passes. Both approval probes use Node 22.20.0. The initial full delayed-browser experiment used the VM's newer Node 24.19.0.
3. failure-family-probe.log: an explicit expiry Cron between a four-hour clock advance and resume deterministically produces completed state, send-window-expired skips, zero marketing sends and campaign_not_operator_paused. This is a separate scheduling order consistent with CAMP-010 deadlines and CAMP-014 rechecks. It does not prove that exact interleaving occurred in f137's hosted job.
4. failure-family-fixed-probe.log: after honoring the real persisted provider pacing condition, a 16-second fake SendGrid response produces the exact f134 uncertainty detail and HTTP 409 without a link lookup. This is a sufficient transport cause; the historical underlying transport exception is not logged and remains unknown. CONT-004/SendGrid single-attempt rules require truthful uncertainty without automatic resubmission.

The first family probe omitted the availableTransport wait and received the separate provider-pacing refusal. That experimental error was corrected in the second script. The second experiment's following f137 installation aborted; its error is retained, and it supplies no new f137 conclusion. family-probe-receipt.json records both outcomes. Fault injection and probe files are kept only in this evidence packet, not in the product commit.

## Validation and custody

The fixed delayed-edge approval probe passed. The complete presend journey passed. Six focused tests passed, including four retained asset cases, the new MSG-006 regression and the complete authoring/browser journey. Typecheck, first-party command checks, production build, source lock/Base verification, integration checks and generated-contract write/check passed locally. Generated views are then restored under the cloud landing contract.

Additional full campaigns-shard, merged-main validation, exact-SHA CI, final counts and terminal custody are recorded in the final receipt. PLAN.md contains the full plan; the individual command logs and receipts retain actual outcomes, including unsuccessful experiments. No production behavior is weakened, and no test is skipped, retried automatically or given a longer timeout.

The two non-link historical failures are not claimed fixed by this MSG-006 change. The expiry probe identifies a stale test assumption that should be addressed in the CAMP-014 journey separately; the f134 hosted transport cause needs diagnostic timing/exception evidence before a broader transport repair. This branch deliberately retains the one-clause scope.

## Updated-main integration

Main advanced during the run to f936cb5. The published product history is integrated by a merge, never rebased or force-pushed. Main's newer PROP-005 judgment changes done to partial; that judgment is retained. Main's separate complete image-format, deduplication, export/restore and erasure tests are also retained. Accordingly task-start contract totals 21 done / 197 partial / 98 missing become 20 / 198 / 98 after main integration. Relative to the updated main, this branch changes no clause status: MSG-006 remains partial and totals remain 20 / 198 / 98 (316 total). inherited-clause-changes.json and merged-clause-counts.json record the distinction.

The maintained listings collect 94 test entries across seven configs; five local-start tests occur again in the slow config. The unique test count is 89, below 200. Current main has 88; this change adds one regression. Task-start main had 87, and the newer main contributes the other added test. CI workflow and shard-plan bytes are unchanged.

## Final local checks and published candidate

Final product head: `3ada2fb0ea501a1f02de43b8da1bdedc545e1313`, merge parents `7cf9becd80c06cc8fb0634a9bde3e9e72444d852` and `f936cb5351ca3432e53e7ed5592f2aa720f3eab2`. Both real commits were pushed immediately after their relevant local checks, through the cloud push guard. Candidate identities/messages including side-parent traversal passed; the remote ref matches the final SHA; the checkout is clean. No PR was required or created, and main was never pushed.

The complete two-worker campaigns shard passed all four tests in 6.5 minutes on the first published candidate. After integrating main, all six tests in the resolved campaign-assets.spec.ts passed in 2.6 minutes, including main's binary-format/export/restore/erasure journeys and the MSG-006 regression. Merged typecheck, source verification, contract generation/check and regenerated source lock checks passed. Production runtime source, CI workflow and shard-plan bytes did not change between the two candidates. The generated ACCEPTANCE.md view was then restored as required, so candidate-views-check.log records the expected view mismatch.

Exact-SHA push Verify run: `42500042846`, https://github.com/just-every/run-mango/actions/runs/42500042846. Discovery returned completed/failure on the exact final SHA; no running-status poll was needed. The job metadata records success for plan, a failure only at build step “Check generated contract documents”, and skipped later build/shard/proof work. The verify aggregate also fails its required coverage gate because build failed and shards skipped; workflow-dependency-receipt.json records the unchanged source condition. The root failed-job archive is read once under the remaining GitHub budget before the final readiness decision. This is not described as an ordinary green workflow or hosted execution of the skipped shards.

## Terminal CI decision

The once-read failed build archive confirms exactly `ACCEPTANCE.md: generated content differs; run contract-docs write.` and exit 1, with no other root failure. The final CI receipt therefore applies the brief's explicit generated-view exception. **Product custody is READY under that exception, not an ordinary green workflow.** Hosted shards were skipped after the view check; the Mac lander must regenerate the views, run Verify again on its landing SHA and complete its own publication scan. No generated view is committed here.

Ten of ten permitted GitHub invocations were used. Exact-SHA CI diagnostic reads were separated by at least 300 seconds; the root failed-job archive was read once. No workflow rerun was requested. FINAL-RECEIPT.json and ci-receipt.json record the actual completed/failure status, root/dependent jobs and explicit readiness exception. No product landing blocker remains for this narrow fixture candidate. The original f134/f137 hosted causes are not claimed repaired or conclusively established; their controlled probes, errors and separate follow-up scope remain explicit above.

Evidence is published only to `refs/heads/evidence/fv-mango-409-1` through the report-only entrypoint. The terminal EVIDENCE ref/head identifies its complete selected manifest. Product branch custody, this report transfer and any later acceptance/landing remain separate.
