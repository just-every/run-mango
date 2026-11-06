# sd-mango-c-f101 report

AUD-004 remains PARTIAL to PARTIAL. Counts remain 20 DONE, 198 PARTIAL and 98 MISSING. The email terminal exclusion and no-deferral proof requested by the planner was already present at the required base, and passed before edits. This candidate preserves and reruns that proof and closes the native exact 24-hour email boundary gap in the same single registered journey. SMS proof remains held. There is no DONE claim or judge request.

Repository: just-every/run-mango.
Branch: cloud/sd-mango-c-f101.
Full head: 3dcbbd8fc958dd89b801b5f71e8b6c64516a31c0.
PR: none required or created; push starts Verify.
Requested base: d0b4463beb507932b050b26d23e7585bd9139eab.
Integrated main: 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e.
The candidate is a merge retaining both histories, main's newer CAMP-010 judgment, its step-deadline test and both verification-plan entries. No main push, force push or history rewrite occurred. Remote product custody was confirmed with Git ls-remote at the exact head.

## Work and acceptance map

The full executed plan is PLAN.md. Only the AUD-004 plan row changes: its email terminal case is re-established and its email default boundary is now proved; its status and SMS holds stay unchanged. No other clause campaign was started.

The existing journey is `tests/go-live/frequency-protection.journeys.ts`, named “[AUD-004] an email frequency exclusion is terminal even after its window expires”. Its registered delivery pack remains in `scripts/verification/plan.mjs`.

| Item | Public door and result | Evidence at candidate |
| --- | --- | --- |
| Acceptance 1, email exclusion | Native create, save and approval routes freeze both campaigns before any marketing send. Cron and native Queue send the repeat reader's first letter. Four hours later the second campaign records a terminal frequency-window skip with zero attempts and no provider identity, while the independently fresh control is accepted and reconciled to the actual network-edge handoff. | Journey lines 16 to 94; frequency-protection.json firstReceipt and terminal. |
| Acceptance 1, email no-deferral | At 26 hours, while the original deadline remains open, renew sender evidence and replay the captured native dispatch command plus Cron. Terminal rows, results, provider message identities and attempt observations remain unchanged. A separate reader owns the later boundary sequence so it cannot reset this reader's marketing history and mask a delayed send. | Journey lines 96 to 115; frequency-protection.json replayAt and afterReplay; exact-sha-journey.log. |
| Named operator results | At 1440, assert one frequency-protection skip, one acceptance, no queued outcome and both named recipients. Capture the populated same screen at 1440 and 390 before the original deadline closes. | Journey lines 117 to 129; frequency-protection-1440.png and frequency-protection-390.png. |
| Acceptance 2, email default boundary | Three preapproved native campaigns for a separate confirmed reader establish a real accepted send, then dispatch at exactly 86,399,999 elapsed milliseconds and 86,400,000 elapsed milliseconds. The former is terminally skipped with frequency-window and zero attempts; the latter produces one accepted handoff whose provider identity matches the actual edge send. The inside row and earlier terminal rows remain unchanged. | Journey lines 131 to 164; frequency-protection.json windowFirstReceipt, insideReceipt and boundaryReceipt. |
| Acceptance 1, SMS | Still unproved: terminal frequency exclusion, recorded reason and no-deferral. | Honest Gap retained in CONTRACT.md. |
| Acceptance 2, SMS | Still unproved: exact SMS default-window boundary. | Honest Gap retained in CONTRACT.md. |

SMS transport and qualification remain held on the owner's Twilio A2P and US carrier registration. No live-provider qualification is claimed. AUD-009 overrides and FLOW-014 caps are separate obligations. CONT-013's SPLIT and NEW-1 disposition and original fix-1 hold, all other provider, device, account, cross-seed and Base prerequisites and the existing adoption and release requirements remain unchanged. No new policy default or acceptance text was introduced.

## Checks and actual runtime receipt

On committed head 3dcbbd8fc958dd89b801b5f71e8b6c64516a31c0:

- Focused registered journey: 1 passed in 30.1 seconds. Native Worker, D1, Cron and Queue execute production paths; fixtures substitute only provider and receiving-mailbox edges. Chromium is /usr/bin/chromium with --no-sandbox. The browser and runtime close in finally.
- Typecheck: exit 0.
- First-party command check: exit 0.
- Edition source lock check: exit 0.
- Product worktree and index: clean.

The raw runtime receipt is frequency-protection.json. RECEIPT.json binds the checks and observed outcomes to the product SHA. The repeat's replay occurs 93,600,000 milliseconds after its accepted first message and before its still-open send deadline. The independent boundary reader is skipped at 86,399,999 milliseconds and accepted at 86,400,000 milliseconds. All original terminal records survive.

The initial base journey also passed. One uncommitted development run of the first boundary arrangement timed out while the exact-boundary recipient remained queued: sender renewal had just consumed shared provider pacing at the held clock. The final scenario renews sender evidence one hour before the boundary and keeps clock advancement outside queue settlement. The isolated scenario and merged candidate passed, followed by the committed exact-SHA run above. No production behavior or assertion was weakened to pass. The development failure is retained in boundary-development-failure.log.

No new registration was added by this continuation; the focused file still registers one journey. No test was deleted or skipped. The previous first-acceptance timestamp assertion is strengthened to an exact held-clock expectation. Existing control handoff, terminal skip, replay, result-count and no-attempt assertions remain. No permanent pin, source-shape or one-off repair test was added.

## Mechanical and publication checks

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then node scripts/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write then node src/base/contract-docs.mjs check exit=0; ledger=none exit=0

Contract generation passed after the final edits and merge. ACCEPTANCE.md and docs/CLAIMS.md were then restored from origin/main, and neither contains an authored change against main. The source lock was regenerated last and checked, including once again on the exact committed SHA. The candidate retains all 316 Status rows and all 490 pipe-prefixed rows of each merge parent. All parent IDs survived. No migration changed.

Before product push, every candidate commit including side parents passed the fleet author, committer and trailer audit. Both candidate commits use the fleet identity; neither has a co-author trailer. Changed product prose and fixtures contain no email-shaped additions. No ambiguous new repository-reference prose was added. Product push succeeded on attempt 1 through cloud-push.py.

Publication scanning is deferred to the Mac guarded lander by the cloud adaptation. No COMPLETE scan, zero-findings result, main equality, landing or deployment is claimed for this candidate. The report packet is separate from the product branch and cannot establish READY by itself.

## CI

Exact candidate Verify run 42199102464, push event, completed failure on 3dcbbd8fc958dd89b801b5f71e8b6c64516a31c0. The sole initiating failure is job 127829741420, “Check generated contract documents”: “ACCEPTANCE.md: generated content differs; run contract-docs write.” Aggregate job 127829850921 then fails because build failed; shards are skipped. This is precisely the permitted generated-view exception. No Verify repair, rerun or weakening was attempted. The Mac lander must generate views and require its exact-SHA Verify before landing.

Initial main 01f63103b73722c32e0c6cc13f7b9c2eacb4c59e has green Verify 42195975560. Run site 42195975538 first failed in job 127819202563 with Cloudflare provider-http-503. A permitted failed-job retry request returned HTTP 403 “This workflow is already running”: the maintained retry was already underway. Its second attempt completed success. No second retry was started. These actual receipts and the sanitized failure are in the packet.

Nine of ten GitHub calls were used, with a single watcher and no polling loop. Completed failed-job logs were read once per failed job. The command and response records are in github-budget.txt and the CI JSON and log files.

## DONE riders and pre-READY self-check

No clause is promoted. This checklist records the exact boundary of the partial claim.

| Rider | Result for a DONE claim | Candidate evidence or limit |
| --- | --- | --- |
| 1 | Not complete | Email outcomes reached by the native journey; SMS outcomes remain unproved. |
| 2 | Email pass | Nonempty seeded contacts, a genuine fresh control, actual edge sends, explicit skipped case and independent boundary timestamps. Journey lines 64 to 115 and 131 to 164. |
| 3 | CI proof pending | Journey is registered in the delivery pack, but candidate Verify stops at the permitted stale-view check before shards execute. Local exact-SHA run passed. |
| 4 | Pass for local email proof | exact-sha-checks.txt and RECEIPT.json bind the runtime and screens to the pushed head. |
| 5 | No new inherited duty | AUD-004 retains existing D-2. No Base or inherited clause text changed. |
| 6 | Partial metadata current | Evidence and SMS Gap updated. Generator write and check pass before restoring main's generated views. No DONE provenance claim. |
| 7 | Pass | Acceptance sentences unchanged; no coverage rewrite or new point. |
| 8 | Not newly applicable | Production permission and authority paths unchanged. All campaign authority is created through native authenticated approval; replay does not recreate delivery. |
| 9 | Pass, honest boundary | Synthetic provider edges only. Owner-held SMS and real-provider qualification remain explicitly held. |
| 10 | Not applicable | No new consent, custody, spending or authority policy default. |
| 11 | Pending Mac lander | Candidate is branch-only. Publication scan and guarded landing plus post-landing Run site remain with the Mac fleet. |

Pre-READY: email tests use independently chosen recipients and times and reject both omitted protection and an overlong window. No existing user-flow assertion was removed, narrowed or hidden by width. The explicit dispatch replay cannot resurrect the skipped delivery. Production credential revocation and erasure code was not changed or newly qualified. No product screen, icon control, configuration placement, homepage, logo or visual design changed. Candidate Verify's sole initiating failure is the allowed generated-view check; local touched gates and source lock pass. The main Run site retry is green. Publication scanning remains a required Mac landing gate and is not represented as complete here.
