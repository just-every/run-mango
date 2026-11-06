# sd-mango-c-f75 results

MSG-007 stays PARTIAL. This candidate completes the selected email advisory acknowledgment-time retention proof in acceptance 2. Counts stay 20 DONE, 198 PARTIAL and 98 MISSING. Acceptance text and production behavior are unchanged.

Product branch: `cloud/sd-mango-c-f75`. Candidate: `5afd4c606e7fc4d3beee51c054f35a0530a6b27b`. Base: `980b25d4b34d19493662d2662ba8f5123c194aef`. No PR is needed: Verify accepts branch pushes. The candidate contains only the registered journey, the MSG-007 Status row and the generated source lock. No fleet report, generated contract view, workflow or visual asset is in the product commit.

## Proof and behavior

The single registered journey in `tests/go-live/content-checks.journeys.ts` keeps its existing name: “[MSG-014][MSG-015][MSG-006][MSG-007][MSG-005][MOVE-014] review names blocked hosts and links, allows an approver to trust them, keeps advisory safety and shows each SMS with its opt-out”. It is registered in the authoring shard by `scripts/verification/plan.mjs:22`.

The operator acknowledges the current exact saved email advisory through the review button. Lines 70–81 bracket its actual native response with the independently controlled installation clock, verify HTTP 200, identify the authenticated actor and bound the acknowledged time. Lines 82–93 reconcile that actor and time with a single persisted audit row, its campaign, revision, finding identity, kind and detail, and the authenticated native review response. The timestamp is derived from the response and bounded by the clock; the audit and review must agree with that independently bounded time.

Lines 95–120 assert the campaign and revision remain draft, with zero approval records, frozen recipient candidates, recipient rows, step dispatches, campaign dispatch commands and marketing handoffs. The installation advances by two minutes, the review reloads and retains the original rendered datetime. The exact original request is replayed before checks refresh replaces transient row IDs. Checks are then rerun and the same saved finding identity is replayed through its current check row. Original response, actor, timestamp and identity survive; the complete original audit row remains unchanged and unique for that finding. Explicit approval still happens only at line 130.

The existing safety-finding refusals at lines 32–36, blocked approval at lines 58–60, edited-revision invalidation at lines 61–66, missing-session and foreign-origin refusals at lines 67–68 and final two-record actor assertion remain. No existing assertion was removed, narrowed or hidden behind a condition. The screenshot loop alone adds 390 capture; runtime assertions remain at 1440. There is still one test registration in the touched file, unchanged from the parent.

The two acknowledged-advisory screenshots show the same saved acknowledgment at 1440 and 390. They were visually inspected. No UI source was changed. The existing native production implementation already satisfies the selected outcome; no production repair was necessary.

## Probes

PROBE MSG-007 acceptance-2-email-retention: authenticated review button and native acknowledgment route for a saved subject advisory -> original operator and installation-clock-bounded time agree with its exact finding audit and authenticated review; after two minutes, reload, exact request replay, checks refresh and current-row replay preserve the same acknowledgment and one unchanged audit row. Draft authority remains unchanged with no approval, candidates, recipients, dispatch or marketing handoff before explicit approval.

PROBE MSG-007 acceptance-3-preserved: edit saved email content -> new finding identity has no acknowledgment and the old acknowledgment request returns 409.

PROBE MSG-007 acceptance-4-and-5-preserved: attempt acknowledgment of non-advisory safety findings, then approve while content blockers remain -> acknowledgment returns 409, approval returns 409 with blockers and creates no recipient rows. The full finding matrix remains open.

## Verification

The first focused native run passed: one test in 2.1 minutes. A second exact-SHA run with the JSON reporter also passed (140657 ms) to persist the actual runtime attachment; no source changed between runs. Its retained operator is go-live-owner and its original acknowledgment instant is 2026-11-06T06:08:21.655Z, bounded exactly by the held installation clock. Replay runs after a two-minute advance and retains one original audit row. ACKNOWLEDGEMENT-RECEIPT.json records the actual values.

Typecheck passed. The first-party public command check passed. Contract generator write and subsequent check passed; generated views were then restored in full from origin/main. Source lock was generated last and its check and offline Base integrity check passed. No migration changed, so a migration-ledger check is not applicable. The fetched main was unchanged; rebase reported up to date before the focused journey.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then node scripts/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write then node src/base/contract-docs.mjs check exit=0; ledger=none exit=0.

All 316 parent Status rows remain; all table rows remain 490. Only MSG-007's Evidence and Gap cells changed. Acceptance sentences, clause IDs, all other judgments and counts are unchanged. The source lock contains only the contract and touched journey digest updates. Fleet authors and committers and absence of trailers were inspected across every candidate commit. Added prose and source were reviewed for credential-shaped values, newly introduced email-shaped fixtures and accidental repository references; none was added.

Starting main has successful push Verify 42171092345 and Run site 42171092326 on the exact base SHA. Candidate Verify run 42172301405 completed with failure; the candidate generated-view command reproduces exit 1: “ACCEPTANCE.md: generated content differs; run contract-docs write.” CI job classification is recorded in CI-JOBS.json. Candidate CI and product custody are recorded in CI.json and CHECKS.json. The cloud did not scan for publication or land main; complete full-history scanning, generated-view writes at landing, final exact-SHA Verify and Run site remain the guarded Mac lander's work. No COMPLETE scan, main equality or production-site success is claimed for this branch-only candidate.

## Remaining scope and riders

Acceptance 1 still lacks complete every-channel proof. Acceptance 2 still needs SMS advisory acknowledgment qualification. Acceptances 4–5 still lack the complete safety-finding refusal and blocking-finding correction matrix. Existing email refusal, replay and acceptance 3 evidence is preserved. Owner Twilio A2P and US carrier registration, SMS transport and qualification remain held. Provider, device, account and cross-seed or Base prerequisites are unchanged. CONT-013's SPLIT and NEW-1 disposition, original fix-1 hold and prohibition on a third FIX remain unchanged. No provider or legal qualification, new policy default, new acceptance point or scope ruling is claimed.

DONE-RIDERS assessment: no DONE claim is made. Row 1 remains unmet for the complete clause because the listed native and channel outcomes remain open. Row 2 is satisfied for this selected email proof by nonempty seeded data and explicit unsafe refusals; full-clause coverage remains open. Row 3 awaits candidate exact-SHA Verify, with the journey already registered in push Verify. Row 4 has a committed candidate runtime receipt and unchanged source since that run. Row 5 adds no inherited duty. Row 6 has an honest PARTIAL Gap and generated-view checks passed after generation, followed by the required view restore; global judgment provenance was not rewritten. Row 7 acceptance text and obligations are unchanged. Row 8 preserves the missing-session, stale-finding and foreign-origin refusals and tests no-authority outcomes. Row 9 leaves provider boundaries open. Row 10 adopts no policy default. Row 11 remains with the guarded lander and is not claimed.

Pre-handoff review: each newly asserted outcome has a direct failing assertion if the time, actor, identity, replay uniqueness or authority behavior changes. No assertion was weakened. Credential revocation and personal-data erasure implementations were not changed; acknowledgment replay is exercised without creating marketing authority. No touched UI implementation requires a tooltip or configuration change. Publication and landing receipts remain unestablished in cloud, as allowed for this branch handoff.

Plan row change for the lane: MSG-007 selected acceptance-2 email time-retention point completed; PARTIAL to PARTIAL; retain every-channel, SMS, complete finding-matrix and all existing held prerequisites. No other campaign row was selected or changed. PLAN.md contains the full scoped plan. CHECKS.json, the actual runtime acknowledgment receipt, journey log and screenshots carry the concrete local results.

## Final custody and CI classification

The named product branch was pushed successfully on the first attempt. Remote ref readback equals the full candidate SHA. Exact-SHA push Verify 42172301405 failed only at the build job’s “Check generated contract documents” step (job 127742756076). Its dependent final verify job 127742824522 failed because build failed; shards and proof jobs were skipped. Plan passed. The local exact command reproduces only the expected ACCEPTANCE.md generated-view mismatch. Under this task’s explicit generated-view exception this is a READY handoff; no CI repair or rerun was attempted and no generated view was committed. This does not claim that the skipped journey shard ran green in GitHub. Three GitHub calls were used, with discovery and subsequent job inspection at least 300 seconds apart.

No run-blocking product defect or account dependency was introduced. MSG-007 remains PARTIAL with all stated remainders. No clone, test server or browser process is retained after successful evidence publication; the actual packet remains outside the clone.
