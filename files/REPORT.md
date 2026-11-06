# sd-mango-c-f131: DELIV-009 Resend silence continuation

Repository: just-every/run-mango.
Candidate branch: cloud/sd-mango-c-f131.
Exact candidate: 80bf3b386a946b6635c99513735b08aff4804e99.
Observed main: a6ff098f6cdf8b356b76105c726c2561f6051a8d.
Product changes in this task: none beyond the explicitly inherited continuation. The selected Resend watch and its full focused helper already exist at the required starting commit. No duplicate implementation, permanent registration or empty commit was added. Main was already an ancestor when the initial rebase completed. Final transport custody is recorded separately below and in TRANSPORT.json.

The selected outcome is proved locally. DELIV-009 remains PARTIAL. No contract Status, Gap or Evidence cell, acceptance sentence, homepage, logo, workflow, provider pin or generated view was changed. Counts before and after: 20 DONE, 198 PARTIAL, 98 MISSING. The extract's DELIV-009 row gains fresh verification of its selected Resend silence slice only; no plan row or count promotion is requested.

## Plan and result

The full actual execution plan is PLAN.md. The launcher and managed runtime were checked, a fresh full-history clone was made, fleet identity and preserving commit hooks were installed, and the required continuation was checked out. Inspection mapped every selected outcome to the existing registered connection journey. Setup, focused native connection journey, typecheck, contract generation and check, edition source lock generation and check, integration declaration check and first-party command check all passed before the final transport retry. Actual test observations, four screenshots and structured command receipts are included in this packet.

The local registered test was:
tests/go-live/delivery.journeys.ts, “[MSG-011][RESULT-006] an owner connects delivery, account restrictions stop sending and signed facts update reputation”.
It calls sendingConnectionJourney, then resendConnectionJourney, then sendingSilenceJourney. Exactly one registration ran and passed in 4.3 minutes. All runtime behavior used native Settings, campaign, signed webhook, Cron and Queue doors; fixtures intercepted provider network edges. No test assertion was removed, narrowed, skipped or put behind a width or branch condition. Zero tests were added or removed.

## Selected outcome rubric

Every row refers to the exact candidate above and the passing registered journey. Source line numbers refer to tests/go-live/sending-silence-journey.ts.

| ID | Selected outcome | Public door and asserted result | Evidence |
| --- | --- | --- | --- |
| R1 | Native Settings connection and signed own diagnostic | Owner review and connect, sender confirmation and signed diagnostic set verified state | Lines 33–42, 72–73; resend connection helper retains native controls |
| R2 | Idle installation does not create a missing-stream alert | Controlled day, Cron, empty notices, no error, zero marketing | Lines 74–77; observations idle |
| R3 | Current signed marketing traffic keeps the stream healthy | Actual approved handoff, signed correlated delivery at hour 23, Cron after another two hours | Lines 80–89; observations validEvent |
| R4 | A fresh credential generation excludes old connection traffic | Native reconnect changes generation; new marketing receipt records only the new generation | Lines 90–104 |
| R5 | Lookup facts never certify signed marketing health | Provider delivery lookup creates the real delivered fact, but signed provenance stays null | Lines 109–112 |
| R6 | Elapsed-day Cron stores a distinct cause | No error before a day; subsequent Cron persists delivery-events-silent | Lines 113–117 |
| R7 | Notices reach current Owners and Admins once | Former Admin is demoted; exact current Owner and Admin IDs and actual network mail destinations are checked | Lines 94–99, 118–121, 143–144 |
| R8 | Approval refuses without recipient authority | Native approval returns 409 with silence cause and creates no recipient rows | Lines 122–123 |
| R9 | Home and Settings expose the actual cause | Native built pages show silence, without the misleading missing-diagnostic message | Lines 62–70, 124; four included screenshots at 1440 and 390 |
| R10 | Diagnostics, unrelated messages, wrong recipients, old generations and old timestamps do not recover | Signed public webhook requests and a refused signature leave the silence cause and null signed timestamp | Lines 125–135 |
| R11 | Approved pending email is held without a handoff | Due Cron leaves it queued with zero attempts, original deadline and no additional marketing | Lines 136–139 |
| R12 | Repeated Cron and native restart preserve hold and once-only notices | Same durable state after restart, two notices total, no additional handoff | Lines 140–144 |
| R13 | Original deadline ends the pending email without sending | Cron after original deadline stores skipped, send-window-expired, zero attempts and unchanged deadline | Lines 145–148; observations pendingBefore and pendingAfter |
| R14 | Genuine recovery cannot replay expired work | Current correlated signed marketing event clears cause; old event preserves original timestamp; expired step stays skipped | Lines 149–155 |

The pending step retained send_by_at 1794254092707 through the native restart and ended skipped with send-window-expired, attempt_count 0, null sending_accepted_at and null provider_message_id. There were two actual marketing handoffs total, the expected positive controls, with none added by the held pending step. Both notices were accepted exactly once for go-live-owner and synthetic-mango-145. Full actual non-secret observations are in sending-silence-observations.json.

## Complete DELIV-009 acceptance accounting

| Acceptance sentence | Candidate evidence and remaining boundary |
| --- | --- |
| 1: revoked keys and deleted webhook notices and approval fence | Existing carried connection evidence retained. Resend connection helper performs 401, 403 and 404 refusal cases, Home display and notices; the selected registered test passed. No claim that this round completes every provider qualification. |
| 2: disabled signing or a day of accepted handoffs without signed events, with holds, deadline and activation | R1–R14 prove the selected Settings-connected Resend marketing silence subcase. SendGrid silence, disabled-signing variants and the full activation and deadline matrix are omitted by the planner scope and remain open. Acceptance 2 as a whole is not claimed complete. |
| 3: replacement preserves uncertain recipients and repeats connection work | The generation boundary is exercised in R4. Replacement after uncertainty and its complete permission, domain, event and sender matrix remain open. Unknown handoffs are not replayed. |
| 4: disconnect removes private key and owned hook and fences approval | Carried connection and portability evidence unchanged; no new full-sentence claim. |
| 5: connect, replace and disconnect activity | Existing Activity assertions and production records retained; no new full-sentence claim. |
| 6: Settings labels active route and developer route has equivalent checks | Existing route label and connected Resend UI retained; complete developer-route authority and event equivalence remain open. |

Remaining broad scheduled-daily, hosted and real-provider qualification is not established by this controlled-clock network-edge fixture. DELIV-008 fresh install and Free sign-in, DELIV-002 domain creation, the CONT-013 SPLIT and NEW-1 disposition and original fix-1 hold, the prohibition on a third repair, provider and device and account prerequisites, cross-seed and Base dependencies and the existing release and rer adoption requirements remain unchanged.

## Inherited duties

| Duty | Exact candidate evidence | Result |
| --- | --- | --- |
| BASE-SECRET-001 | Connection helper checks encrypted custody and absence of key and signing secret from status, UI, logs and export; event silence stores generation and timestamps on existing recipient rows, not another destination store | PASS for selected behavior in the registered journey; no live-provider claim |
| BASE-MAIL-001 | R3 and R11–R14 distinguish accepted, held and expired; lookup is not signed receipt; no expired or uncertain replay | PASS for selected behavior |
| BASE-OPS-005 | Durable notice audit entries are scoped to generation, cause and current operator; R7 and R12 inspect exact target identities and once-only transport | PASS for selected behavior; original Activity obligations retained |

## DONE riders

| Rider | Result | Evidence or gap |
| --- | --- | --- |
| 1 | FAIL for whole clause; PASS selected slice | R1–R14 are reached. Full acceptance 2, 3 and 6 outcomes above remain unproved; PARTIAL only. |
| 2 | PASS selected slice | Real seeded marketing sends, actual negative approval, expired recipient readback and positive current-signed-event control; lines 80–155. |
| 3 | PASS selected slice on recorded exact SHA | Existing push Verify runs 42250379072 and 42245094360 both completed success on this exact SHA; registered journey is in the delivery pack. Local rerun passed. New branch custody is stated separately, without substituting another SHA. |
| 4 | PASS | Local rerun and browser captures use the exact candidate; no relevant source or test changed. |
| 5 | PASS INSPECTED | DELIV-009 explicitly cites BASE-SECRET-001, BASE-MAIL-001 and BASE-OPS-005 at CONTRACT.md:2828. |
| 6 | MECHANICAL PASS; Gap bookkeeping pending | Generator write reported zero changed documents and check passed. Status cells remain main's. The existing Gap's silence wording is stale relative to the inherited continuation; only the lander may update it. |
| 7 | PASS INSPECTED | CONTRACT.md unchanged, no acceptance rewrite or new point. |
| 8 | PASS selected authority slice | Former Admin gets no notice; exact current Owner and Admin get one each, invalid signatures are refused, native approval is refused with no new recipients. Broader developer authority remains open. |
| 9 | PARTIAL boundary retained | All provider behavior here uses network-edge fixtures; no held-key, hosted, legal or native-device qualification claimed. |
| 10 | PASS, no new default | No policy decision or scope ruling was introduced. Existing conservative authority remains unchanged. |
| 11 | PENDING guarded lander | No main push or landing was attempted. Main equality to candidate, resulting Run site and exact-tree publication scan are not claimed. |

## Pre-READY self-check

1. Selected user-visible behavior has a real public-door test with independently checked seeded outcomes and both supported and refused cases. Whole-clause DONE is not requested.
2. No assertion was changed or removed. The focused registration remains in existing Verify commands.
3. Current-generation signed receipts govern recovery, invalid signatures and prior-generation traffic do not recover, expired work is not replayed. This round changes no erasure surface and makes no new full erasure claim.
4. Home and Settings actual states were inspected at 1440 and 390. Configuration remains under Settings; controls in the sending panel have text labels, with no added icon-only control. Existing typography and borders were preserved.
5. Source lock and command checks passed. Main has successful Verify 42217811205 and Run site 42217811413 on a6ff098f6cdf8b356b76105c726c2561f6051a8d. Candidate has successful exact-SHA Verify 42250379072 and 42245094360. Candidate main equality, Run site and publication scan remain the Mac lander's work.

Publication scan: commit=80bf3b386a946b6635c99513735b08aff4804e99; complete=NOT RUN IN CLOUD; historyScanned=NOT RUN; findings=UNESTABLISHED. This is not a zero-finding scan receipt. No full DONE or landing claim is made. Existing synthetic fixture addresses were preserved; no production email address, credential, provider-shaped key or environment dump was added to product files.

PROBE DELIV-009 acceptance-2: native Settings connect and signed diagnostic, approve and dispatch a real marketing control, then advance the fixture clock and invoke Cron after a day without a correlated signed event -> stored delivery-events-silent, Home and Settings cause, exactly two current authority notices, native approval 409, no pending marketing handoff, restart-safe hold, original deadline skip and genuine signed-event-only recovery.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=node scripts/sync-integration.mjs --check exit=0, plus native migration and restart in focused journey. No migration bytes were added or edited by this task.

## Claim

CLAIM DELIV-009 PARTIAL points=none tests=tests/go-live/delivery.journeys.ts#[MSG-011][RESULT-006] an owner connects delivery, account restrictions stop sending and signed facts update reputation; tests/go-live/sending-silence-journey.ts#sendingSilenceJourney

The points field is none because no entire acceptance sentence newly becomes complete; the selected acceptance-2 Resend subcase is fully proved above.
GAP DELIV-009: SendGrid silence and disabled-signing variants, full activation and deadline matrix, replacement after uncertainty, complete developer-route authority, scheduled-daily and hosted and provider qualification remain open.

## Final product custody

Product publication succeeded through the required cloud push guard, on its first push attempt:
git push --porcelain origin HEAD:refs/heads/cloud/sd-mango-c-f131.
Product branch and HEAD: cloud/sd-mango-c-f131, 80bf3b386a946b6635c99513735b08aff4804e99.
No PR was created: Verify has a direct branch-push entry point. No main or default branch was pushed.

Final fetch succeeded on attempt four after three authentication rejections, bounded waits of 15, 45 and 90 seconds, and launcher refresh plus exact bundle helper reinstallation before every retry. Git did not supply an HTTP status for the rejected fetches. The final rebase was already up to date and did not change the candidate SHA. Final contract write and check, restoration of generated views from main and source lock generation and check all exited zero; MECHANICAL.json and its actual output files record these checks.

All commits in origin/main..HEAD, including any side parent, were inspected with the required full author, committer and trailer format. There is one candidate commit; both identities are the fleet identity and it has no trailers. CONTRACT.md's staged diff and main-relative diff are empty. The product worktree and index were clean at publication. No unpublished work was discarded.

The new named branch's push Verify is run 42254447109, observed in_progress on the exact candidate. The two already completed successful Verify runs 42250379072 and 42245094360 are on the same exact candidate, on the preceding continuation branches. No workflow was dispatched or rerun, and no queued run is represented as successful. The maintained Mac lander owns the new branch's final exact-SHA gate, complete publication scan and landing.

GitHub API calls used: three discovery calls total. No run was polled more often than 300 seconds, no failed-job archive was needed, and no provider keys or owner account were requested. Transport has no remaining blocker. Whole-clause acceptance and qualification gaps remain as listed above.

Evidence is a separate report-only publication. TRANSPORT.json, LOCAL-RECEIPT.json, MECHANICAL.json, candidate-ci.json, main-ci.jsonl and the selected actual logs and four screenshots accompany this report. The product checkout and its dependency tree are removed only after successful product and evidence publication. Evidence is never product READY or proof of landing.
