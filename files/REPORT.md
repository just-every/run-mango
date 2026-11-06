# sd-mango-c-f81 report

CAMP-004 remains PARTIAL to PARTIAL. The planner-selected missing sender-name case and its refusal without authority are proved on the pushed candidate. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING: no status promotion, acceptance edit or new ruling.

Repository: https://github.com/just-every/run-mango
Branch: cloud/sd-mango-c-f81
Candidate: 4cbffaf96ace56c151a5bad2d3acf73d261c3fe2
Required base: 73a8306b4ac4ac93f05a4f5dc73c5ecba61d7af0
Integrated main: 3e91bce0f414b2a4f1eedb7e381ee75386e17906
PR: none required; branch pushes start Verify.

## What changed and why

The required base already contained the exact focused sender-name journey, its registered push coverage and the CAMP-004 evidence update. Its baseline run passed. Rather than duplicate that registration, this continuation retains and re-proves the existing work, integrates current main and regenerates the conflicted source lock. The newer consent-confirmation changes on main are preserved. The branch contains one replayed fleet commit with five changed files relative to current main.

The candidate adds the focused native route journey at ./tests/proposals-decision/missing-sender.spec.ts, records attempted marketing handoffs in the existing decision fixture, and registers that journey in the existing identity-data Verify pack in ./scripts/verification/plan.mjs. Production paths needed no further changes: draft composition accepts an incomplete draft, checks name the missing sender and approval refuses it before authority creation. The CAMP-004 Status row adds this evidence and retains every broader Gap. Generated view files are restored from main and excluded from the commit.

No test or existing assertion was removed, narrowed, skipped or made conditional. One focused registration exists both at the required base and candidate. Collection across all configured Playwright stages found 74 distinct registrations, including the slow stage; assert scripts are not included in that collection. This run introduces no additional registration beyond the required base. No budget raise was requested.

## Proof through native doors

The journey is “[CAMP-004] a missing sender name blocks approval without authority and clears only after a saved correction”, ./tests/proposals-decision/missing-sender.spec.ts:4. It uses the production application router, session authorization, campaign services and migrated native D1. Sender verification and marketing transport use existing boundary fixtures; this is no claim of live-provider qualification.

- Acceptance 5, initial valid control: lines 8 to 27 create and save a native email draft with two eligible contacts and no blockers.
- Acceptance 5, missing sender: lines 29 to 53 save an empty sender name through the revision PATCH route, retain draft state and assert a named message.email-identity blocker identifying the missing sender.
- Acceptance 4, refusal without authority: lines 54 to 69 attempt native approval, assert HTTP 409 and the current blocker list, then read campaign detail and Review. Campaign, revision, step and link records are unchanged. Lines 35 to 46 and 67 to 68 independently check persisted snapshots and zero approval receipts, recipient rows, dispatch rows, queued commands and marketing handoffs.
- Acceptance 5, correction: lines 73 to 84 restore the configured sender through PATCH, assert no blockers and a passed identity check, then read back the still-unapproved draft, retained steps and links and zero authority.

These selected points were already covered at the required base; this run establishes fresh candidate proof and safe integration. It does not claim newly implementing those production semantics.

PROBE CAMP-004 acceptance-5 missing sender: native PATCH with empty sender name and checks -> saved draft, named message.email-identity blocker with two eligible contacts
PROBE CAMP-004 acceptance-4 missing sender refusal: native approve -> HTTP 409 with all current blockers; campaign, revision, steps and links unchanged; no approval receipt, recipients, dispatch, jobs or marketing handoff
PROBE CAMP-004 acceptance-5 correction: native PATCH restoring configured sender and checks -> no blockers; campaign remains draft without approval or sending authority

## Local checks on the candidate

- Focused registered spec: PASS, one test, 15.6 seconds in Playwright; ./FOCUSED.json and ./FOCUSED.txt bind the result to 4cbffaf96ace56c151a5bad2d3acf73d261c3fe2.
- TypeScript: pnpm run typecheck, exit 0.
- Public command contract: npx -y @runeditrun/rer check --profile first-party, exit 0.
- Contract generator: write and check both exit 0. Restored ACCEPTANCE.md and ./docs/CLAIMS.md from main afterward. The committed stale view then reproduces the expected generated-view check failure with exit 1; it is recorded in ./EXPECTED-VIEWS.json.
- Source lock: regenerated last with node scripts/edition-authoring/cli.mjs lock; check exit 0. Both final worktree and index are clean.
- Migration ledger: not applicable; no migration changed.
- Parent Status-row check: 490 table lines before and after, all 379 table identifiers retained, including all 316 Status rows. The staged removal was only the replaced CAMP-004 row, whose ID and acceptance scope remain.
- Git identity: every candidate author and committer is the fleet identity; no trailers. One candidate commit, with no side parent omitted. The guard accepted the product push on attempt 1.
- Added source and test text has no email-shaped additions. No credential-shaped fixture was added.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, restored main views; ledger=none exit=0

The task toolchain reported Node 24.19.0 and pnpm 10.12.4 locally. The supplied toolchain accepts an already newer Node. CI selects Node 22.20.0. No UI behavior or screen was changed; the proof exercises routes and persistence, so no new screen or browser screenshot was needed.

## Exact-SHA CI and publication custody

Verify push run 42177593518 completed on 4cbffaf96ace56c151a5bad2d3acf73d261c3fe2 with conclusion failure. Its only primary failed check is the generated-view check in job 127759596273:

ACCEPTANCE.md: generated content differs; run contract-docs write.

The aggregate job 127759675905 then fails because the build failed; shards and proof jobs were skipped. Both failed-job archives were read once with the required gh command. This is the explicitly permitted generated-view exception, not a passing runtime suite. The local focused journey passed; it did not execute in that CI run. No dispatch, rerun or repair commit was made. The guarded lander must regenerate the views, run its full Verify and publication scan before landing.

Main at 3e91bce0f414b2a4f1eedb7e381ee75386e17906 had successful Verify runs 42175196568 and 42173637117 and successful Run site 42175196561. Those results belong to main, not this candidate. This run did not change main, publish a site or open a PR.

Five GitHub operations were used: one main discovery, one candidate discovery, one failed-job metadata read and two one-time failed-job archive reads. No status polling or repeated log download occurred. The COMPLETE full-history publication scan, main equality and candidate Run site remain with the Mac lander. No scan result is claimed here.

The product branch and report-only evidence ref are separate custody channels. Reports, receipts, this plan and raw local proof stay outside the product checkout. The final terminal EVIDENCE line names the separate evidence head.

## DONE riders assessed without a DONE claim

1. NOT MET for the full clause: the selected route outcomes pass, but the broader acceptance matrices remain unproved. No DONE claim.
2. PASS for the selected refusal: nonempty eligible fixtures, HTTP 409, unchanged populated snapshots and absence of new authority are observed. The complete clause is not asserted.
3. PENDING full exact-SHA Verify: the journey is registered in push coverage, but CI stopped on generated views before running it.
4. PASS for local selected proof: all focused results bind to this candidate.
5. UNCHANGED: no new inherited duty or clause text was introduced.
6. PASS for honest partial bookkeeping: Gap retains broader work; local generated views check passed before restoring main's views. Candidate view freshness is the documented lander exception.
7. PASS: no acceptance point or ruling changed and no Status ID disappeared.
8. PASS within the selected authority boundary: the native refusal cannot create approval or delivery authority; restoring a sender alone cannot approve.
9. PASS for honesty: network boundary proof is identified; no provider or legal qualification is claimed.
10. NOT APPLICABLE: no policy default was adopted and no scope ASK is needed.
11. PENDING guarded landing: branch-only push; main equality, final full Verify, COMPLETE scan and Run site are lander responsibilities. No DONE count is asserted.

## Remaining clause work and holds

Acceptance 1 still needs the complete atomic audience, consent, source freshness including parallel incumbent sync, sender registration, authentication and reputation validation proof. Acceptance 2 still needs the full compliance, personalization, link, schedule and provider matrix. Acceptance 3 still needs effective deduplication and provider reconciliation qualification. Acceptance 4's other failed-check cases and acceptance 5's other sender identity fields remain unproved. These broader native proof gaps are work, not external blockers.

Real-provider sender qualification is not established by the synthetic boundary. Owner-held provider and account prerequisites remain where the contract places them. CONT-013's existing SPLIT and NEW-1 disposition, original fix-1 hold and no-third-FIX restriction are unchanged. No release or Base adoption requirement is waived. No newly discovered dependency blocks the two selected points.

## Plan row return and handoff

Only the CAMP-004 queue row is affected: retain PARTIAL; record the fresh native missing-sender and unchanged-authority proof at 4cbffaf96ace56c151a5bad2d3acf73d261c3fe2, push Verify run 42177593518 with the expected generated-view failure, and preserve all held remainder. No other campaign or plan row is changed and no next target is started.

The complete executed plan is ./PLAN.md; machine-readable provenance and outcomes are ./RECEIPT.json. Individual actual command receipts and output accompany them. No judge request is made because no clause is promoted.
