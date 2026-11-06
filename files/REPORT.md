# sd-mango-c-f76 results

CAMP-004 remains PARTIAL. The selected acceptance 5 sender-name blocker and acceptance 4 refusal-without-authority case are now proved through native routes. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING. No DONE claim is made.

Product branch: `cloud/sd-mango-c-f76`  
Product head: `73a8306b4ac4ac93f05a4f5dc73c5ecba61d7af0`  
Base main: `980b25d4b34d19493662d2662ba8f5123c194aef`  
PR: none; Verify runs on branch push.  
Push: successful on attempt 1, using the required fleet guard. Main was not pushed.  
Candidate Verify: 42172214424, push, initially in progress on this exact head. See the latest CI receipt for final observed status.  
Starting main Verify: 42171092345, success. Starting main Run site: 42171092326, success.

## Change and acceptance map

The production draft validator already permits unfinished sender names, and the production check reports the missing name. Approval already refuses with HTTP 409 before granting authority. The change adds a focused native integration journey, records every marketing transport attempt in the existing network-edge harness, registers the spec in the identity-data push pack, updates only CAMP-004 evidence and gap text, and refreshes the source lock. No production behavior needed repair.

- Acceptance 5 selected sender-name case: `tests/proposals-decision/missing-sender.spec.ts`, test “[CAMP-004] a missing sender name blocks approval without authority and clears only after a saved correction”. Lines 9–28 establish a passing native saved email and independently known two eligible contacts. Lines 30–55 save the empty name and require the named blocking identity check. Lines 72–85 restore the configured sender, require passing checks, and retain draft state without approval.
- Acceptance 4 selected refusal case: the same journey, lines 35–70. It snapshots saved campaign, revision, step and link rows, attempts approval, requires HTTP 409 with the same current blockers, reads native detail and review, and compares both public state and persisted rows unchanged. It requires zero approval receipts, recipient rows, step dispatches, queued commands and marketing attempts.
- Existing subject, body, preheader, optional-module and required-source assertions are retained. No existing assertion was removed, narrowed, skipped or moved behind any condition.

## Remaining acceptance gaps and boundaries

Acceptance 1 still lacks the complete atomic audience, consent, source freshness and parallel synchronization, sender registration, authentication and reputation matrix. Acceptance 2 still lacks the complete compliance, personalization, links, schedule and provider matrix. Acceptance 3 still lacks complete effective deduplication and reconciliation qualification. Acceptance 4's other failed-check cases and acceptance 5's other missing sender identity fields remain unproved. These are carried gaps rather than a scope reduction. Real-provider sender qualification remains unproved; the test's external evidence is a network-edge fixture.

The CONT-013 SPLIT and NEW-1 disposition and original fix-1 hold are unchanged; no third FIX or follow-up-only repair was attempted. Provider, device, account, cross-seed and Base prerequisites, existing rer0.2.95 adoption and release requirements remain unchanged. No policy ruling or new consent default was needed. No homepage, logo, screen or visual work was performed, so changed-screen browser proof is not applicable.

## Verification

- Focused Playwright invocation: one test passed, 28.1 seconds.
- Registered focused verification stage after the last test edit: one test passed; coordinator PASS, exit 0.
- Exact committed head replay: one test passed; test 27.1 seconds, coordinator PASS, exit 0. See `exact-head-test.log`.
- Typecheck: exit 0.
- Public first-party command contract: exit 0.
- Contract generator write then check: exit 0. Its generated views were restored whole from main and excluded from the commit. Candidate freshness may therefore fail only on that expected generated-view check; the Mac lander regenerates it.
- Source lock regenerated last and checked: exit 0; exact-head check also exit 0.
- Migration ledger: not applicable; no migration changes.
- All 490 pipe-table rows retained. The explicit Status-row inventory retained every matched parent identifier. The only contract row edited is CAMP-004; acceptance sentences and counts are unchanged.
- Routine Playwright inventory: 80 before, 81 after; one focused registration added, none removed. No permanent pin or duplicate test was added.
- Diff whitespace check: pass. Added source text has no email-shaped string or co-author trailer. All product candidate authors and committers use fleet identity; trailers absent. No bare prose token resembling a repository reference was added.

An initial verification-runner invocation omitted the file selection. Its own coordinator was stopped with SIGTERM after detecting the broad selection, and the command was corrected. No full-suite success is claimed; both subsequent focused invocations passed.

## DONE riders and pre-handoff check

1. PARTIAL: only the selected acceptance outcomes are proved; broader carried matrices remain open.
2. PASS for this slice: populated audience, passing baseline, native refusal and unchanged data, then passing correction.
3. PENDING at first discovery: focused spec is in the ordinary push pack; exact-SHA Verify 42172214424 is recorded separately.
4. PASS: exact-head local focused journey passed on `73a8306b4ac4ac93f05a4f5dc73c5ecba61d7af0`.
5. UNCHANGED: no inherited Base duties added or removed.
6. PASS for partial evidence: honest gap and current test reference; generator write and check pass locally. Generated views are deliberately left to the lander.
7. PASS: no acceptance wording or status changes and no dropped parent table rows.
8. PASS for this sender case: refusal changes no authority or saved content; correction has no automatic approval.
9. HONEST BOUNDARY: no real-provider receipt is claimed.
10. NOT APPLICABLE: no policy default adopted.
11. PENDING LANDER: main equality, exact-SHA green gates, COMPLETE full-history publication scan with zero findings, and Run site remain the guarded Mac lander's duties.

The new assertions fail if the missing sender is unnamed, if approval succeeds, if the draft or its saved content changes, if approval or recipient authority appears, if dispatch or a marketing attempt occurs, or if restoring the sender fails to clear checks. No production security, erasure or replay paths changed. No UI rules apply because screens were not touched. The publication scan cannot run in this cloud and is not claimed COMPLETE.

## Plan update and handoff

The plan's CAMP-004 row should record PARTIAL to PARTIAL: acceptance 5 sender-name blocker and acceptance 4 no-authority refusal are closed for the empty-name case, with all listed carried gaps and holds retained. No other plan row changed. The complete execution plan is `PLAN.md`; probes are `PROBES.txt`; mechanical checks, source identities, custody and rider results are in `RECEIPT.json` and `mechanical.json`.

Product custody and evidence publication are separate. The evidence packet contains only explicitly selected regular non-secret reports and actual receipts. Landing, provider qualification and COMPLETE publication scanning are not inferred from evidence transport.
