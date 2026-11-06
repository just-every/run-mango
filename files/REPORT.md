# sd-mango-c-f94 results

Repository: just-every/run-mango. Branch: cloud/sd-mango-c-f94. Candidate: 5847086d48f9b743f8211ec825cca729863ebaaf. Baseline main: 5f740dc8cd6624d68df11cd55e56e317e5f6bc96. No PR is required: the branch push starts Verify.

CAMP-001 remains PARTIAL → PARTIAL. The planner-selected native pause and resume occurrence-time retention point is closed. The broader state, deadline, provider and other-transition matrices remain explicit gaps. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING, 316 total. All 379 parent Status identifiers and all 490 table rows survive. Test registrations in the changed caller remain one; no registration was added, deleted or skipped.

## Plan and implementation

The complete initial plan is in PLAN.md. Current main, the clause, Status evidence, inline ct rulings and DONE-RIDERS were read. Existing code already records the required native pause and resume facts, so this round changes the registered journey rather than production behavior.

The journey now brackets each of four distinct browser-operated transitions with the held installation clock: scheduled pause, scheduled resume, mid-dispatch pause and mid-dispatch resume. It reconciles exact operator and revision attribution, unique event identities, original occurrence and creation times, authenticated Activity entries and the persisted channel-pause times. A new pause legitimately advances the current channel hold; prior cycle events remain in the immutable audit history.

Later idempotent pauses, a resumed campaign's invalid second resume, and completed campaign pause and resume refusals are exercised after clock advances. Repeated reads and reloads must retain the full event and time snapshots, active revision, immutable approval digest and operator, recipient identities and dispositions, emitted commands and marketing handoffs. Consumer-completion diagnostics are deliberately not command custody: finishing an already-emitted queue command is allowed.

The existing transport assertions remain: no additional marketing handoff while paused; previously accepted outcomes retained; current opt-out excluded; eligible contacts send once at each of two steps; expired windows skip. Activity is opened through its existing Settings route, filtered to the campaign, and its actor and time rows are checked. The registered journey still invokes its unchanged multistep and chosen-catalog sections.

Only CONTRACT.md, ./tests/go-live/pause.flow.ts, ./tests/go-live/multistep.journeys.ts and sources.lock.json are committed. The CAMP-001 Evidence and Gap cells are the only plan-status row changes. No acceptance sentence, ct ruling, homepage, UI implementation, provider boundary, Base pin or workflow changes. CAMP-014's separately selected phone behavior proof stays unclaimed: these phone captures inspect the same fixture, not an independent phone installation and flow.

## Public-door proof map

- R1: Native scheduled and mid-dispatch operator pause and resume. ./tests/go-live/pause.flow.ts:41–67 independently bounds every persisted occurrence time, checks operator identity and revision, reconciles authenticated Activity, and verifies channel-pause times. The public browser operations are at lines 79–96 and 111–136. A wrong or rewritten time, actor, revision, duplicated event or missing event fails the assertions.
- R2: Later replay and invalid transitions. Lines 85–101, 115–120 and 161–178 compare complete retained event, time and authority snapshots; the named refusal bodies are required. An unsafe extra approval, recipient, command, handoff or rewritten event fails the snapshot assertions.
- R3: Operator history. Lines 168–178 open the native Activity route, filter the campaign, require all four rows, compare each displayed machine-readable original time and require the operator name. Existing controls and history are captured at 1440 and 390. All behavior assertions run at 1440.
- R4: Existing handoff and deadline safety. Lines 103–159 and 181–190 retain the once-only transport, current-consent, pause fence, accepted-result and expired-window outcomes. No existing assertion was weakened; the old terminal pause status assertion is strengthened to require its exact named refusal body.

No mutation was applied or claimed. This is a PARTIAL evidence update, not a DONE judgment request. The independent gate may probe the public doors itself.

## Validation and honest limitations

The focused registered multistep journey passed locally in 1.6 minutes after two test-development corrections. The same registered journey then passed on exact candidate 5847086d48f9b743f8211ec825cca729863ebaaf in 1.6 minutes, with exit 0 and identical before and after commit identifiers. The initial run was interrupted after navigating to a nonexistent Activity route; that route was corrected to /app/settings/activity. The next run exposed an overly broad new assertion that included asynchronous queue-completion diagnostics; the snapshot was corrected to compare actual emitted commands and their delay. These were unpublished test-development failures, not CI repair rounds or production defects. Their actual logs are retained.

Typecheck, first-party command check, contract generation and check, and regenerated source-lock check passed. Generated ACCEPTANCE.md and docs/CLAIMS.md were restored whole from main and are not committed. Contract generation has no touched-clause option in this seed. No migration changed, so no ledger check applies. MECHANICAL-RECEIPT.json binds these exact bytes to the candidate. JOURNEY-RECEIPT.json and multistep-exact.json record the exact-commit journey result.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; restored=ACCEPTANCE.md and docs/CLAIMS.md exit=0; ledger=none exit=0.

Fresh main was fetched and the unpublished checkout rebased with autostash before the final generator, lock and commit; main was unchanged. Fleet commit hooks stayed active. All candidate authors, committers, complete messages and trailers were inspected before the guarded push. There are no co-author trailers. Added text has zero email-shaped strings; existing synthetic fixture addresses remain unchanged. The push succeeded on its first attempt. No default branch was pushed or rewritten.

Main's starting Verify runs 42183651100 and 42181327459 and Run site 42181327367 were completed successfully on baseline main. Candidate push Verify is 42193058840 on the full candidate SHA, with its final observed status in CI-FINAL.json or the latest poll receipt. No workflow was dispatched or rerun. Only one watcher is used, with at least 301 seconds between status reads. Publication scanning and main Run site for this candidate belong to the Mac lander and are not claimed by this cloud run.

## DONE-RIDERS review

1. NOT MET for the whole clause: the complete state, provider, deadline and all-other-transition outcomes remain unproved. R1–R4 prove only the selected native slice. No DONE flip.
2. PASS for the selected slice: actual approved recipients and nonempty audits are inspected; replay and unsafe transitions preserve custody and handoffs. See R1 and R2.
3. Registered in push Verify through ./tests/go-live/multistep.journeys.ts:5 and the delivery pack in ./scripts/verification/plan.mjs. Exact candidate CI status is reported in its actual receipt. The local exact-commit journey is separate evidence.
4. PASS for local exact-candidate evidence: JOURNEY-RECEIPT.json records the same 40-character head before and after execution. No relevant code or test bytes change afterward.
5. UNCHANGED: no inherited duty or receiving-clause acceptance is rewritten. The clause still names SEND-009, SEND-007 and CAMP-009; other duties remain their current gaps.
6. PASS for honest partial metadata and generator proof: Gap explicitly retains the complete missing matrices; Evidence names the registered journey and its helper. Generated views pass immediately after write, then are restored as instructed. Existing ct judgment provenance remains intact; this run does not manufacture a ct judgment or self-reference its own commit in CONTRACT.md.
7. PASS: no acceptance changes, split, ID mapping, coverage rewrite or ruling change.
8. PASS for the selected native paths: authenticated allowed operator operations, sessionless pause refusal, invalid second resume and terminal pause and resume refusal, with no event or authority changes. Other role and transition combinations remain unproved.
9. PASS for boundary honesty: network-edge fixtures establish native behavior only. No live-provider, SMS, carrier or legal qualification is claimed.
10. NOT APPLICABLE: no new custody, consent, spending or authority policy is adopted.
11. PENDING GUARDED LANDER: the candidate is branch-only. Main equality, complete full-history publication scan and main Run site are not cloud receipts and are not claimed.

## Pre-handoff self-check

The selected behaviors have active assertions through native browser and authenticated HTTP doors. Existing assertions are retained or strengthened. No production authority, erasure or capture replay path changes; CONT-013's existing disposition and original hold remain untouched. There is no new UI implementation or icon-only control; existing controls and Activity screens were inspected at both required widths. Source lock is fresh. Exact candidate CI is reported honestly; publication scan and landing remain fleet gates. All broader provider, device, account, Base and cross-seed release prerequisites remain unchanged.

No product blocker was discovered for this bounded point. CAMP-001 as a whole is not complete, and no external dependency is invented to justify a DONE claim. Only its selected plan row's proof and remainder wording change. The next broader matrices remain planning work, outside the explicit “complete only” POINTS slice.

The actual occurrence receipt records the four independently observed operation instants as 1793956345597, 1793956363597, 1793959983598 and 1793960038598 milliseconds since epoch. Each held-clock bracket has identical bounds. Four original audit rows, four authenticated pause and resume history rows and four marketing handoffs remain after terminal refusal and reload. PROBES.txt is the runtime-probe return.

## Exact candidate CI disposition

Push Verify 42193058840 completed with conclusion failure on 5847086d48f9b743f8211ec825cca729863ebaaf. Build job 127809655368 failed only at `node src/base/contract-docs.mjs check`: “ACCEPTANCE.md: generated content differs; run contract-docs write.” The final verify job 127809755383 failed because BUILD was failure and shards were skipped. The two completed failed-job archives were each read once, using the mandated CLI archive door, with exit 0. The exact local candidate reproduces the same generated-view refusal with exit 1; the earlier generator write and check both passed before the required restoration from main.

This is the explicitly allowed generated-view-only READY exception. No real failing test was reported. CI did not execute the skipped journey shards, so no claim of a green recorded CI journey is made; the local exact-candidate journey passed independently. DONE-RIDERS row 3 remains unestablished as a green CI journey, reinforcing the unchanged PARTIAL status. The Mac lander must regenerate the views and obtain its exact-candidate Verify before landing. No generated view is committed, no repair round, dispatch or rerun was attempted, and no production blocker is declared. The GitHub budget consumed six calls: main discovery, candidate discovery, one status poll, one jobs read and two failed-job archive reads.

CI-FAILURE-RECEIPT.json contains the complete relevant non-secret command, error, job and transport receipt. Raw CI archive snippets include runner environment listings and are retained outside this public packet rather than selected for publication. No credentials, environment dumps, held-out material or symlinks are selected. The final evidence reference is report-only and does not confer landing or DONE status.
