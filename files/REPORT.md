# sd-mango-c-f59 results

SEND-009 remains PARTIAL → PARTIAL. The selected provider-error visibility point is proven in the pinned base and retained here. This continuation additionally closes the native five-minute transient-failure trigger and recovery audience-recheck gaps. SMS outage qualification, owner-held Twilio A2P and US carrier registration, SMS transport and provider qualification remain unproved. Provider, device, account and cross-seed Base prerequisites, rer 0.2.95 adoption and account acceptance remain binding. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold remain unchanged.

Product branch: `cloud/sd-mango-c-f59`.
Full head: `eafc4c80b2263302d6efaba4a03770c6b171fbb6`.
Pinned base: `dbd058a5567d5a60f1a1b56596f8d36d0485c622`.
Integrated main: `4d12f9dea9a4a866334e361714e5d16a3ff6fe79`.
Push: successful on the first attempt through the fleet guard. All candidate authors, committers and trailers, including side parents, passed the fleet audit. No published history was rewritten. No PR is required because Verify has a branch-push entry point.

Counts: base 18 DONE, 200 PARTIAL, 98 MISSING; candidate and integrated main 20 DONE, 198 PARTIAL, 98 MISSING. The two DONE increases come from main's paid-reader work; this task adds zero DONE clauses. Every one of the 316 parent Status rows is retained from both merge parents. Only SEND-009's Evidence and Gap change relative to main. The campaign plan's SEND-009 row should remove its native trigger and recovery recheck gaps and retain every external hold; no other plan row changes.

The full executed plan is in PLAN.md. The proof map is in RUBRIC.md. Build fixture refinements are described in BUILD-NOTES.md. Actual commands, status, exact head and gate custody are in RECEIPT.json.

The registered journey is `./tests/go-live/delivery-recovery.journeys.ts`, named “[SEND-004][SEND-005][SEND-009] recover refused handoffs and provider outages without duplicating uncertain sends”. It remains one registration and is already in the push Verify delivery partition in `./scripts/verification/plan.mjs` at line 28. No test or assertion was deleted, skipped, narrowed or moved behind a width condition. No dependency, Base, workflow, migration, production logic or UI component changes were made.

Acceptance proof:

1. `./tests/go-live/transient-recovery.flow.ts` lines 5–64 uses actual provider-edge 429 refusals and the existing elapsed-time control. The native outage remains observing at 299999 milliseconds, pauses on the failure at 300000 milliseconds, and preserves queued recipient identities and attempts with no accepted marketing handoff through ordinary Cron and captured command replay. Healthy authenticated reachability remains recorded, distinguishing this from the unavailable-report shortcut.
2. `./tests/go-live/delivery-recovery.flow.ts` lines 52–99 retains the bounded authenticated probe, durable cadence, racing pause and recovery, persistent outage and two runtime restarts. There is no extra provider probe on repeated Cron ticks before its due time.
3. `./tests/go-live/transient-recovery.flow.ts` lines 66–93 withdraws a queued contact through its public unsubscribe door and verifies the native contact readback. A successful probe plus ordinary subsequent Cron ticks automatically resumes dispatch: the withdrawn recipient is skipped with `channel-not-subscribed` and its attempt count does not increase; the eligible control actually hands off once. Later replay changes neither persisted outcomes nor handoff count. The existing deadline and late replay checks in `./tests/go-live/delivery-recovery.flow.ts` lines 171–199 remain intact.
4. `./tests/go-live/delivery-recovery.flow.ts` lines 123–169 reconciles `provider-read-http-503` with provider health, persisted outage and channel pause, authenticated campaign result and visible pause explanation. Repeated native reads and reopening preserve queued recipient identity, zero attempts and zero marketing handoffs. The phone capture now reopens the actual detail route at 390 pixels. Assertions run at 1440 pixels; browser proof captures the paused screen at 1440 and 390.
5. `./tests/go-live/delivery-recovery.flow.ts` lines 72–99 retains once-only operator notifications for both active operators, uncertain acceptance and persistence across restart without duplicate notices.

No new policy default or acceptance sentence was introduced. No independent judgment or DONE promotion is requested while the named external qualification remains open.

Local gates: focused registered journey passed before the merge; typecheck, first-party command check, contract generation write and check, source lock regeneration and check, row-retention audit and whitespace check passed after integrating main. Generated views are exactly main's versions; they have no authored delta. Exact-candidate runtime proof and CI are recorded below when complete.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, main views restored; ledger=none exit=0.

PROBE SEND-009 acceptance-1: native 429 handoffs with held elapsed time -> observing at 299999 milliseconds, paused at 300000 milliseconds, queued work and replay produce no accepted marketing handoff.
PROBE SEND-009 acceptance-3: public opt-out while paused, then authenticated successful probe and scheduled ticks -> eligible control sends once, withdrawn recipient skipped without another attempt, replay unchanged.
PROBE SEND-009 acceptance-4: authenticated 503 probe -> persisted safe error, native paused campaign result and reopened visible detail agree; desktop and phone captures; queued identity, zero attempts and marketing handoffs unchanged.

DONE-RIDERS assessment, without claiming DONE:

1. Native email outcomes are covered by the named registered journey. Full-clause SMS and provider qualification remain unproved, so the clause stays partial.
2. Seeded recipients exercise both actual eligible delivery and refusal after withdrawal; the original deadline and uncertainty paths remain.
3. The existing push Verify registration is retained. Exact-candidate conclusion is recorded in the CI receipt below; no earlier SHA is substituted.
4. The full focused journey is rerun on the exact pushed candidate. Screenshots are selected only from that run.
5. The existing SEND-009 meta line cites BASE-OPS-004 and BASE-MAIL-001. No inherited duty is removed.
6. The partial Gap retains all external holds. Generation write and check pass locally, then main's views are restored under the cloud landing rule. The historical judgment line is not relabeled as a new ct judgment.
7. Acceptance, scope, IDs and inherited requirements are unchanged. No coverage rewrite is performed.
8. No new authority surface is created. Existing native operator authorization and the contact's public opt-out apply; withdrawn consent prevents delivery after recovery.
9. No real provider, SMS, carrier or legal qualification is claimed from network-edge fixtures.
10. No custody, consent, spending or authority policy default is adopted.
11. Main equality, final publication scan and Run site remain the guarded lander's work. No landing is claimed.

Pre-handoff checks: existing assertions and public-door coverage are retained; current-consent refusal and replay preserve authority; no production erasure or credential path is changed. New authored text contains no email-shaped string or provider-shaped credential. The UI is unchanged and its paused detail has desktop and phone proof. The source lock is fresh. Publication scan is NOT RUN in cloud, with no COMPLETE or zero-finding claim. Run site is pending landing. Integrated main's Verify runs 42130882310 and 42128526907 and Run site 42130882206 were successful. Product readiness and evidence transport are separate.

CI at initial discovery: push Verify run 42134111303, exact head `eafc4c80b2263302d6efaba4a03770c6b171fbb6`, in progress. No dispatch or rerun was requested. The only permitted expected exception is generated-view freshness; any actual failure is reported separately.

Exact-SHA Verify result: run 42134111303 completed with failure. Build job 127617833116 failed only “Check generated contract documents”; verification job 127617927068 failed its dependent proof requirement because build failed. The failed-job archives were read once each, successfully. This is the explicitly permitted generated-view exception: ACCEPTANCE.md must be regenerated by the maintained lander. No workflow was rerun and no view file was committed to repair it. Six GitHub API or archive calls were used.

Exact-candidate local result: exec-session-99235 passed the single registered journey in 2.6 minutes on eafc4c80b2263302d6efaba4a03770c6b171fbb6. Playwright process exit 0 and outer subreaper exit 0 were recorded separately in actual receipt files. A prior invocation reported passing assertions but returned outer exit 1; the confirming run changed no source and resolved the execution-status uncertainty. All three selected screenshots are copied from the confirming run and their hashes are in RECEIPT.json. The product worktree is clean. No native acceptance blocker remains in this bounded slice; SMS and real-provider qualification remain external holds.
