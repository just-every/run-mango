# MSG-007 continuation

Repository: https://github.com/just-every/run-mango
Branch: cloud/sd-mango-c-f84
Candidate: 05c6069c3958a03972287ffd31324cbd6fa92271
Base: f2d5ba4ebee63dd5e7eab4be2817c04d1b1168b8

MSG-007 stays PARTIAL. The planner-selected email acknowledgment-time retention point is covered by the registered native journey. The base already contained installation-clock bounds, audit reconciliation and different-operator replay; this candidate preserves all three base commits and adds capture and replay of the actual browser payload, authenticated original-actor readback, and expired-check refusal after checks refresh. No production behavior or acceptance sentence changes.

Counts: 20 DONE, 198 PARTIAL, 98 MISSING before and after; 316 Status rows retained. The touched file has one test registration before and after, with no new tests or removed assertions. No test-budget file exists at this pin. Only the MSG-007 Evidence cell changes, alongside the focused journey and regenerated source lock. The full plan is in PLAN.md. The extract's MSG-007 row should retain PARTIAL and record the completed email retention proof; there are no other plan-row changes.

## Acceptance coverage

The registered journey is `tests/go-live/content-checks.journeys.ts`, named “[MSG-014][MSG-015][MSG-006][MSG-007][MSG-005][MOVE-014] review names blocked hosts and links, allows an approver to trust them, keeps advisory safety and shows each SMS with its opt-out”. Its actual native Worker, authenticated API, browser review and persisted database are used. Test fixtures replace provider network edges, never the acknowledgment implementation.

1. Per-channel findings: existing email blocking and advisory review assertions remain at lines 34–50; the existing SMS helper remains invoked at line 153. Every-channel proof remains a named Gap; no broader completion is claimed.
2. Exact email advisory acknowledgment: lines 70–97 independently read the authenticated actor, bracket the browser POST using installation time, capture its revision and finding payload, and reconcile returned actor/time with the exact persisted audit and authenticated review. Lines 108–141 advance time, reload, replay the captured payload under another authenticated operator, refresh checks, refuse the expired check ID with HTTP 409, and replay the identical payload against the current finding. Original actor, timestamp and finding identity survive, with exactly one matching audit row. Lines 100–106 and 134 prove no approval receipt, frozen candidates, recipient steps, step dispatches, dispatch commands or marketing handoff before line 147's explicit approval. Screens at lines 142–145 show the acknowledged review at 1440 and 390. SMS advisory qualification remains held.
3. Edited revision invalidation: lines 60–68 preserve the missing current acknowledgment, changed finding identity and HTTP 409 refusal for the old finding. No change to this acceptance or its existing evidence.
4. Safety findings cannot be acknowledged away: lines 34–40 retain all present non-advisory refusals; lines 54–58 retain the post-acknowledgment approval refusal. The complete safety matrix remains in the Gap.
5. Blocking corrections: the blocked native approval and later corrected-body approval remain at lines 54–68 and 147. Full correction and refusal matrix remains in the Gap.

## Scope and retained holds

No DONE flip or judge request. Every-channel proof, SMS acknowledgment qualification, and the complete blocking-finding correction and refusal matrix remain open. Owner-held Twilio A2P and US carrier registration, SMS transport and qualification, provider, device, account and cross-seed or Base prerequisites remain held. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold remain unchanged. No new policy default, external account authority, or live-provider qualification is asserted. No later clause was selected because this continuation is confined to MSG-007.

## Validation

The focused registered journey passed before commit; the exact-SHA rerun and actual acknowledgment receipt are recorded separately. Typecheck, first-party command check, contract generation write and check, and regenerated source-lock check all passed. No migration changed. Generated views were restored whole from origin/main before commit. Their expected staleness in the candidate is not repaired here.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

All four commits ahead of origin/main have the fleet author and committer identity, no trailers, and preserved parent Status rows. The new diff contains no email-shaped literal. No existing assertion was deleted, skipped, narrowed or moved behind a width condition. Runtime assertions remain at 1440; the existing evidence loop captures the clause's review at both required widths. No UI source changed. The displayed time is exposed through the datetime attribute; screenshots contain only synthetic data. No claim is made that unrelated existing fixtures have no email literals.

Authority and replay checks cover missing session (401), foreign Origin (403), stale edited finding (409), expired check ID (409), and replay without additional approval or dispatch authority. Erasure is unchanged and remains under the existing CONT-013 hold; no erased-person proof is newly claimed.

## DONE riders, assessed without a DONE claim

1. NOT MET for the full clause: email retention is reached by the named journey at lines 70–141; every-channel and full safety matrix proof remain open.
2. PASS for the selected point: real seeded advisory and two authenticated actors; native success and unsafe refusals; exact audit equality at lines 89–93 and 133, no-authority checks at lines 100–106.
3. EXPECTED VIEW-ONLY CI FAILURE: the focused journey is registered in the existing authoring pack in `scripts/verification/plan.mjs`; the exact candidate push Verify is recorded in candidate-ci.json. Expected generated-view failure may prevent shards from running.
4. PASS locally: the relevant source and test byte hashes and exact-SHA execution are bound by the mechanical and journey receipts.
5. UNCHANGED: no new inherited duty or acceptance point.
6. PASS for source metadata: partial Gap retains every missing outcome; contract write and check passed before generated views were restored. The existing Judged from line is preserved because no DONE judgment is asserted.
7. PASS: no acceptance sentence or policy changed; all 316 Status rows retained.
8. PASS for touched acknowledgment authority: missing session and foreign Origin refused; stale finding and expired check refused; another authenticated operator cannot replace the original acknowledgment or create approval and dispatch authority.
9. PASS boundary: SMS and real provider qualification remain explicitly held.
10. UNCHANGED: no policy default adopted.
11. PENDING LANDER: branch only; no publication scan, main equality, landing or Run site claim. The Mac fleet owns those checks.

No mutation campaign was run: the unchanged dangerous-path and replay assertions were inspected, and the real positive and negative doors were executed by the focused journey. Receipt form is not treated as acceptance completion.

## CI and custody

The base's push Verify 42176528602 failed only “Check generated contract documents” in job 127756209221, with “ACCEPTANCE.md: generated content differs; run contract-docs write.” Its archive was read once and saved in base-verify-failure.txt. This is the expressly permitted generated-view failure; no repair or workflow change was made.

The candidate was pushed successfully on the first guard attempt. Candidate push Verify: 42180353381, exact head 05c6069c3958a03972287ffd31324cbd6fa92271. Current observation is in candidate-ci.json; no result from another SHA is substituted. No workflow dispatch, rerun or pull request was created. Product custody is separate from evidence publication. Publication scan and Run site remain with the guarded Mac lander.

## Recorded public-door probe

PROBE MSG-007 acceptance-2-email: native review acknowledgment POST for the saved email-subject advisory -> HTTP 200; actor go-live-owner; acknowledgment and persisted audit timestamp 2026-11-06T07:23:15.852Z, inside the independently observed installation-clock interval [1793949795852,1793949795852]. At installation time 1793949915852, reload, checks refresh and replay as synthetic-mango-2 retained finding 33469958ea1707dfc2bf7f7b2540dac9ad56e76965fec7f4d008cb2c3c981be1 and the original actor and timestamp, with one matching audit row and no approval, recipients or dispatch authority. The expired check ID returned HTTP 409; the same captured payload against the current check returned the original acknowledgment. Explicit approval then succeeded.

The exact-SHA journey passed in 54.9 seconds (one registered test; runtime 53.6 seconds), with acknowledgment screenshots at 1440 and 390 copied into the packet. The held installation clock is intentional: equal lower and upper bounds independently pin the operation's timestamp and distinguish it from the earlier checks time and later replay time.

Main observed at 3e91bce0f414b2a4f1eedb7e381ee75386e17906: Verify 42175196568 and Run site 42175196561 both completed successfully. Those results describe main only, not candidate success. The candidate includes that main as an ancestor without rewriting any published history. Five parent comparisons retained every Status ID. Product checkout is clean after the exact-SHA runtime run.


## Final exact-SHA CI disposition

Verify 42180353381 completed with conclusion failure on the exact candidate. The sole root failure is job 127768341007, step “Check generated contract documents”: “ACCEPTANCE.md: generated content differs; run contract-docs write.” Job 127768412905 is the downstream verifier reflecting the failed build prerequisite. No runtime test failure is reported; runtime shards did not run. The failed archive was read once with `gh run view 42180353381 --repo just-every/run-mango --job 127768341007 --log-failed` and preserved in candidate-verify-failure.txt. There was no repair, rerun or dispatch. Eight GitHub calls were used; CI status observations were separated by 300 seconds.

This is the explicit permitted generated-view-only exception for cloud candidates, so the candidate is READY for guarded landing. It is not described as a generally green Verify. The lander must write the generated views, relock as needed, rerun exact-SHA Verify, perform the complete publication scan and confirm Run site before counting anything. No product blocker remains for the selected point, and no full-clause DONE is claimed.
