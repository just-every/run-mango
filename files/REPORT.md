# sd-mango-c-f87 result

Repository: https://github.com/just-every/run-mango
Branch: cloud/sd-mango-c-f87
Candidate: d811eaa5cc62066c2d711de34f6d3b434a3dd74d
Requested base: 8c09d1f38d21e0df6fb2d81bf2b3896b9309f625

DESIGN-011 remains PARTIAL to PARTIAL. Counts remain 20 DONE, 198 PARTIAL, 98 MISSING, total 316. No acceptance sentence changed. The only plan row updated is DESIGN-011's acceptance-4 session and retained-byte proof. No other campaign target was started.

The requested base already implemented independent signed-out requests and Author byte-preservation proof. This continuation preserves those commits and closes the related cache and revoked-session path. Candidate PNGs now use no-store, matching retained layouts. The surviving registered generation journey additionally signs out natively, replays only its synthetic revoked credential, requests already-read artifacts with ordinary browser fetch, then opens a new Author session and verifies the same independent bytes and unchanged domain state. The test fixture's new session-only door is protected by its existing test token; production entry points do not expose it.

Current main was fetched and merged, preserving its newer proposal grounding assertions and Status evidence. All 316 Status IDs from each parent remain. Generated views equal current main byte for byte; the merge integrates main's existing views, and no generated output from this round was authored into the product branch. The source lock was regenerated last and checked. Published history was not rewritten.

## Proof through public doors

One existing registered test in ./tests/campaign-authoring/design-generation.spec.ts, line 4, runs walk0, walk1 and walk2 from ./tests/campaign-authoring/design-generation.flow.ts. It remains one registration; none was added, removed, narrowed, skipped or put behind a width condition. Verify already registers this file in its authoring job.

- R1 MET: a successful native run supplies two independently distinct PNGs and the original LayerDoc through the provider edge. Its returned artifact URLs are followed, with expected bytes coming from the edge inputs. Fixture supply is in ./tests/support/fake-twelve-ui.ts; retained status and supplied byte checks are in the flow, lines 245 to 346.
- R2 MET: independent cookie-empty contexts request all three real artifact URLs and receive 401 with only the named unauthenticated JSON response, without artifact bytes (flow lines 362 to 385).
- R3 MET: the same native Author receives 200, correct media types, no-store, and exact independently supplied bytes (flow lines 373 to 382). This is 72637 supplied bytes across three artifacts per phase; exact digests and lengths are in ./custody.json and ./revoked-session.json.
- R4 MET: repeated status reads, reload and artifact reads reconcile unchanged run and candidate rows, cost facts, purchases, provider requests, campaign and approval, recipient and command authority (flow lines 349 to 399).
- R5 MET: native sign-out returns 204; all three requests replaying its credential return 401, and all three ordinary browser reads return 401 without artifact data. A fresh permitted Author session returns the same bytes and unchanged domain state (flow lines 408 to 441).
- R6 UNPROVED: only selected crops become public; this distinct part of acceptance 4 remains in the Gap and was omitted by the selected POINTS.
- R7 UNPROVED: all other omitted acceptance outcomes remain named below; no DONE claim is made.

PROBE DESIGN-011 acceptance-4: native retained artifact URLs before and after reload -> independent signed-out 401; Author 200 with exact PNG and LayerDoc bytes and correct content types; records, spend, traffic and campaign authority unchanged.
PROBE DESIGN-011 acceptance-4 session-revocation: native sign-out -> revoked credential and ordinary browser requests 401; fresh Author session -> exact retained bytes and unchanged domain authority.

The passing focused command runs on d811eaa5cc62066c2d711de34f6d3b434a3dd74d. Its actual command, exit, times and output digest are in ./receipt-focused.json, and its terminal output is in ./focused.log. Assertions run at 1440; the retained-design screen is captured once at 1440 and once at 390 in ./custody-1440.png and ./custody-390.png. No screen or visual output was changed. Typecheck, first-party checks and source-lock checks also pass on this exact head, with separate actual receipts.

Initial local execution exposed a test arrangement error after the sign-out assertions passed: the full open helper repeated affirmative consent with a new occurrence time, causing “Consent idempotency key cannot be reused for different affirmative evidence.” The failing response was 500 at the fresh-session assertion. The session-only fixture door fixes that setup error without changing consent behavior or weakening the assertion. The initial failed terminal output is retained in ./initial-focused-failure.log. This was a local fixture failure, not a failed CI repair.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, restored from origin/main afterward; ledger=none exit=0.

## Remaining clause scope

Acceptance 1 still owes the JSON and PNG stream bounds, pixel bound and unread over-declared lengths. Acceptance 2 owes the digest, parser and redirect matrix. Acceptance 3 owes stored-error exclusion and the full safe-reason mapping. Acceptance 4 still owes only-selected-crops-public proof. Acceptance 5 owes full-size and ten-run proof. Acceptance 6 owes queue minimization, still-needed requests, erasure and restore fences, and brief redaction. These are explicit unproved native outcomes, not newly declared external blockers.

DESIGN-003 retained originals and layout export, live paid provider qualification, hosted-secret and other provider qualification, visual output, homepage, logo and polish work remain outside this slice. CONT-013's existing disposition and original hold, existing account and device prerequisites, cross-seed and Base prerequisites, and release and adoption requirements are unchanged. No new account, provider authority or policy default is claimed.

## DONE-RIDERS review

1. FAIL for a whole-clause DONE: omitted outcomes above remain unproved. Selected acceptance-4 outcomes pass the registered journey.
2. PASS for the selected security path: nonempty independent bytes, supported Author access and denied missing or revoked sessions, with unchanged domain authority.
3. See exact-head CI observation below. This registered file is already in push Verify; no external journey replaces it.
4. PASS locally: focused, typecheck, first-party and lock receipts name this exact candidate.
5. PASS unchanged: the receiving clause already cites BASE-ACCESS-002, BASE-SECRET-001, BASE-INPUT-001 and BASE-DATA-003.
6. PASS for honest PARTIAL bookkeeping: all remaining gaps retained and Evidence updated. Generated views generate and check before restoration; their candidate freshness failure is expected under the cloud instructions. No new judged-DONE provenance is claimed.
7. PASS: acceptance wording and scope are unchanged; no ruling or coverage rewrite was introduced.
8. PASS for the touched authority path: native Author succeeds; missing and revoked sessions fail without artifacts or domain changes.
9. PASS boundary honesty: only the provider network edge is qualified here; no live provider or hosted proof is claimed.
10. NOT APPLICABLE: no new custody or authority policy default was adopted.
11. PENDING the guarded Mac lander: no main landing, candidate Run site result or publication scan is claimed by this cloud task.

Pre-ready review: existing assertions remain; native session authority and retained-byte integrity are exercised both ways. Erasure and restore remain explicit unproved gaps. No UI control, typography, homepage or configuration location changed. No new literal email address or credential-shaped fixture was introduced by this round. The source lock is fresh. Publication scanning is delegated to the maintained Mac lander, so no COMPLETE or zero-findings claim is made here.

## CI and publication custody

[
  {
    "conclusion": "failure",
    "event": "push",
    "head_sha": "d811eaa5cc62066c2d711de34f6d3b434a3dd74d",
    "html_url": "https://github.com/just-every/run-mango/actions/runs/42186099177",
    "id": 42186099177,
    "name": "Verify",
    "status": "completed"
  }
]

Product and report refs have separate custody. Main's observed green Verify was 42181327459 and Run site was 42181327367 at 5f740dc8cd6624d68df11cd55e56e317e5f6bc96; these are not candidate proof. No PR is required for this repository's branch Verify entry point. The candidate remains branch-only for fleet landing. The complete plan is ./PLAN.md. Evidence publication is recorded separately and does not establish acceptance or landing.

The exact-head Verify run 42186099177 completed with failure only at the generated ACCEPTANCE.md check (job 127786740732), then its dependent final verify job 127786826694 failed because build did not complete. Shards were skipped. Both failed jobs were read once through their archival gh commands. This is the explicitly permitted generated-view exception, not an ordinary green Verify or a product failure. No product repair, workflow change, dispatch or rerun was made. The lander must regenerate views and verify its resulting commit before landing. See ./ci-failure-receipt.json. Five GitHub calls were used, within the ten-call budget.
